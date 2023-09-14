import { Subject } from "rxjs";
import {
  CanvasInteractionHandler,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasMouseEventId,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { TernaryChartModel } from "./model";
import { Point, Rect, distanceBetweenPoints, ptWithinPolygon, ptWithinBox } from "src/app/models/Geometry";
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { HOVER_POINT_RADIUS } from "src/app/utils/drawing";
import { SentryHelper } from "src/app/utils/utils";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";

const DRAG_THRESHOLD = 2; // how many pixels mouse can drift before we assume we're drawing a lasso

class MouseHoverPoint {
  constructor(
    public scanId: string,
    public pmc: number,
    public regionIdx: number,
    public ptIdx: number,
    public coord: Point
  ) {}
}

export class TernaryChartToolHost implements CanvasInteractionHandler {
  cornerClick: Subject<string> = new Subject<string>();

  constructor(
    private _mdl: TernaryChartModel,
    private _selectionService: SelectionService
  ) {}
  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    this._mdl.recalcDisplayDataIfNeeded(event.canvasParams);

    /*if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
    } else*/ if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // User is mouse-dragging, if we haven't started a drag operation yet, do it
      if (this._mdl.mouseLassoPoints.length <= 0 && distanceBetweenPoints(event.canvasPoint, event.canvasMouseDown) > DRAG_THRESHOLD) {
        // Save the start point
        this._mdl.mouseLassoPoints = [event.canvasMouseDown, event.canvasPoint];
      }
      // If they have moved some distance from the start, save subsequent points in lasso shape
      else if (
        this._mdl.mouseLassoPoints.length > 0 &&
        distanceBetweenPoints(event.canvasPoint, this._mdl.mouseLassoPoints[this._mdl.mouseLassoPoints.length - 1]) > DRAG_THRESHOLD
      ) {
        this._mdl.mouseLassoPoints.push(event.canvasPoint);
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // General mouse move, check if hovering over anything
      return this.handleMouseHover(event.canvasPoint);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      if (this._mdl.mouseLassoPoints.length > 0) {
        // Just finished drawing a lasso... find & select the points
        this.handleLassoFinish(this._mdl.mouseLassoPoints);
      } else {
        // See if something was clicked on
        this.handleMouseClick(event.canvasPoint);
      }

      // Reset
      this._mdl.hoverPoint = null;
      this._mdl.hoverPointData = null;
      this._mdl.mouseLassoPoints = [];
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  private handleMouseHover(canvasPt: Point): CanvasInteractionResult {
    // If the mouse is over the triangle area, show a lasso cursor
    const triPts = [this._mdl.drawModel.triangleA, this._mdl.drawModel.triangleB, this._mdl.drawModel.triangleC];
    const triBox: Rect = Rect.makeRect(this._mdl.drawModel.triangleA, 0, 0);
    triBox.expandToFitPoints(triPts);

    let cursor = CursorId.defaultPointer;
    if (ptWithinPolygon(canvasPt, triPts, triBox)) {
      cursor = CursorId.lassoCursor;
    } else {
      // If mouse is over a label... we may need to show hover icon or error tooltip
      if (this._mdl.drawModel.labelA.containsPoint(canvasPt)) {
        cursor = CursorId.pointerCursor;
        this._mdl.drawModel.hoverLabel = "A";
      } else if (this._mdl.drawModel.labelB.containsPoint(canvasPt)) {
        cursor = CursorId.pointerCursor;
        this._mdl.drawModel.hoverLabel = "B";
      } else if (this._mdl.drawModel.labelC.containsPoint(canvasPt)) {
        cursor = CursorId.pointerCursor;
        this._mdl.drawModel.hoverLabel = "C";
      } else {
        this._mdl.drawModel.hoverLabel = "";
      }
    }
    this._mdl.cursorShown = cursor;

    const mouseOverPt = this.getIndexforPoint(canvasPt);

    if (mouseOverPt == null) {
      this._selectionService.setHoverEntry("", -1);
    } else {
      this._selectionService.setHoverEntry(mouseOverPt.scanId, mouseOverPt.ptIdx);
    }

    // Redraw will be initiated due to selectionService hover idx change

    return CanvasInteractionResult.neither;
  }

  private handleMouseClick(canvasPt: Point): void {
    const mouseOverPt = this.getIndexforPoint(canvasPt);

    if (mouseOverPt != null) {
      this.setSelection(new Map<string, Set<number>>([[mouseOverPt.scanId, new Set<number>([mouseOverPt.pmc])]]));
    }
    // TODO: Replace the following with HTML things on top of the widget
    else if (this._mdl.drawModel.labelA.containsPoint(canvasPt)) {
      this.cornerClick.next("A");
    } else if (this._mdl.drawModel.labelB.containsPoint(canvasPt)) {
      this.cornerClick.next("B");
    } else if (this._mdl.drawModel.labelC.containsPoint(canvasPt)) {
      this.cornerClick.next("C");
    } else {
      // They clicked in region around triangle (but not on a point), clear selection
      const triPoly = [this._mdl.drawModel.triangleA, this._mdl.drawModel.triangleB, this._mdl.drawModel.triangleC];
      const triBBox = new Rect(this._mdl.drawModel.triangleA.x, this._mdl.drawModel.triangleA.y, 0, 0);
      triBBox.expandToFitPoints(triPoly);

      if (ptWithinPolygon(canvasPt, triPoly, triBBox)) {
        this.setSelection(new Map<string, Set<number>>());
      }
    }
  }

  private handleLassoFinish(lassoPoints: Point[]): void {
    // Loop through all data points, if they're within our lasso, select their PMC
    const bbox = Rect.makeRect(lassoPoints[0], 0, 0);
    bbox.expandToFitPoints(lassoPoints);

    const selection = new Map<string, Set<number>>();

    if (this._mdl.raw) {
      for (let c = 0; c < this._mdl.drawModel.pointGroupCoords.length; c++) {
        if (!this._mdl.raw.pointGroups[c]) {
          SentryHelper.logMsg(
            false,
            `ternary handleLassoFinish raw.pointGroups[${c}] is null, pointGroupCoords length=${this._mdl.drawModel.pointGroupCoords.length}`
          );
          continue;
        }

        const selected: Set<number> = selection.get(this._mdl.raw.pointGroups[c].scanId) || new Set<number>();

        let i = 0;
        for (const coord of this._mdl.drawModel.pointGroupCoords[c]) {
          if (ptWithinPolygon(coord, lassoPoints, bbox)) {
            selected.add(this._mdl.raw.pointGroups[c].values[i].scanEntryId);
          }

          i++;
        }

        selection.set(this._mdl.raw.pointGroups[c].scanId, selected);
      }
    }

    // Notify out
    this.setSelection(selection);
  }

  private setSelection(scanEntryIndexes: Map<string, Set<number>>) {
    // 1 or more PMCs were selected, get location indexes & update the selection
    if (!this._mdl.raw) {
      return;
    }
/*
    const blockedIndexes = new Set<number>();

    if (this._mdl.selectModeExcludeROI) {
      for (let region of this._widgetDataService.regions.values()) {
        if (
          region.id != PredefinedROIID.AllPoints &&
          region.id != PredefinedROIID.SelectedPoints &&
          this._mdl.raw.visibleROIs.indexOf(region.id) > -1
        ) {
          for (let usedPMC of region.pmcs) {
            blockedPMCs.add(usedPMC);
          }
        }
      }
    }

    const scanEntryIndexesToSave = new Map<string, Set<number>>();
    for (const idx of scanEntryIndexes) {
      // If we're only selecting points that are not in any ROIs, do the filtering here:
      if (!this._mdl.selectModeExcludeROI || !blockedIndexes.has(idx)) {
        set.add(idx);
      }
    }
*/
    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryIndexSets(scanEntryIndexes), PixelSelection.makeEmptySelection());
  }

  private getIndexforPoint(pt: Point): MouseHoverPoint | null {
    if (this._mdl.raw) {
      const boxSize = HOVER_POINT_RADIUS * 2;

      for (let c = 0; c < this._mdl.drawModel.pointGroupCoords.length; c++) {
        if (!this._mdl.raw.pointGroups[c]) {
          SentryHelper.logMsg(
            false,
            "ternary getIndexforPoint raw.pointGroups[" + c + "] is null, pointGroupCoords length=" + this._mdl.drawModel.pointGroupCoords.length
          );
          continue;
        }

        let i = 0;
        for (const coord of this._mdl.drawModel.pointGroupCoords[c]) {
          if (ptWithinBox(pt, coord, boxSize, boxSize)) {
            return new MouseHoverPoint(this._mdl.raw.pointGroups[c].scanId, this._mdl.raw.pointGroups[c].values[i].scanEntryId, c, i, coord);
          }

          i++;
        }
      }
    }

    return null;
  }
}
