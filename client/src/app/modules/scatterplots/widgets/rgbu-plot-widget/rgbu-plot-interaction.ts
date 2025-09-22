// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Subject } from "rxjs";
import {
  distanceBetweenPoints,
  Point,
  ptWithinPolygon,
  Rect,
} from "src/app/models/Geometry";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasInteractionHandler,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { RGBUPlotModel } from "./rgbu-plot-model";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";

const DRAG_THRESHOLD = 2; // how many pixels mouse can drift before we assume we're drawing a lasso
const MINERAL_HOVER_RADIUS = 4; // how far a mineral hover is detected from the mineral pos

export class RGBUPlotInteraction implements CanvasInteractionHandler {
  axisClick$: Subject<string> = new Subject<string>();

  private _temporaryTool: string | null = null;
  private _lastPanPoint: Point | null = null;
  private _lastMousePosition: Point | null = null;

  constructor(
    private _mdl: RGBUPlotModel,
    private _selectionService: SelectionService
  ) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // Handle scroll zoom
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      return this.handleScrollZoom(event);
    }

    // Handle pan tool when Shift is held
    const currentTool = this._temporaryTool || "lasso";
    if (currentTool === "pan" && this.isOverDataArea(event.canvasPoint)) {
      const panResult = this.handlePanning(event);
      if (panResult !== CanvasInteractionResult.neither) {
        return panResult;
      }
    }

    /*if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
    } else*/ if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // User is mouse-dragging, if we haven't started a drag operation yet, do it
      if (
        this._mdl.mouseLassoPoints.length <= 0 &&
        distanceBetweenPoints(event.canvasPoint, event.canvasMouseDown) >
          DRAG_THRESHOLD
      ) {
        // Save the start point
        this._mdl.mouseLassoPoints = [event.canvasMouseDown, event.canvasPoint];
      }
      // If they have moved some distance from the start, save subsequent points in lasso shape
      else if (
        this._mdl.mouseLassoPoints.length > 0 &&
        distanceBetweenPoints(
          event.canvasPoint,
          this._mdl.mouseLassoPoints[this._mdl.mouseLassoPoints.length - 1]
        ) > DRAG_THRESHOLD
      ) {
        this._mdl.mouseLassoPoints.push(event.canvasPoint);
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // Track the last mouse position for cursor updates
      this._lastMousePosition = event.canvasPoint;
      // General mouse move, check if hovering over anything
      return this.handleMouseHover(event.canvasPoint);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      if (this._mdl.mouseLassoPoints.length >= 0) {
        // Just finished drawing a lasso... find & select the points
        this.handleLassoFinish(this._mdl.mouseLassoPoints);
      } else {
        // See if something was clicked on
        this.handleMouseClick(event.canvasPoint);
      }

      // Reset
      //this._mdl.hoverPoint = null;
      this._mdl.mouseLassoPoints = [];
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    if (event.key === "Shift") {
      if (event.down) {
        this._temporaryTool = "pan";
      } else {
        this._temporaryTool = null;
      }

      // Update cursor if we have a last mouse position
      if (this._lastMousePosition) {
        this.handleMouseHover(this._lastMousePosition);
      }

      return CanvasInteractionResult.redrawAndCatch;
    }
    return CanvasInteractionResult.neither;
  }

  private handleMouseHover(canvasPt: Point): CanvasInteractionResult {
    if (!this._mdl.drawModel) {
      return CanvasInteractionResult.neither;
    }

    this._mdl.drawModel.mineralHoverIdx = -1;

    const currentTool = this._temporaryTool || "lasso";

    // Check for axis zones first for resize cursors
    const xAxisZone = this.isOverXAxisArea(canvasPt);
    const yAxisZone = this.isOverYAxisArea(canvasPt);

    // If mouse is over a label... we may need to show hover icon or error tooltip
    if (this._mdl.drawModel.xAxisLabelArea.containsPoint(canvasPt)) {
      this._mdl.drawModel.hoverLabel = "X";
      this._mdl.cursorShown = CursorId.pointerCursor;
    } else if (this._mdl.drawModel.yAxisLabelArea.containsPoint(canvasPt)) {
      this._mdl.drawModel.hoverLabel = "Y";
      this._mdl.cursorShown = CursorId.pointerCursor;
    } else {
      this._mdl.drawModel.hoverLabel = "";

      // Set cursor based on current tool and position
      if (currentTool === "pan" && this.isOverDataArea(canvasPt)) {
        this._mdl.cursorShown = CursorId.panCursor;
      } else if (yAxisZone) {
        this._mdl.cursorShown = CursorId.resizeVerticalCursor;
      } else if (xAxisZone) {
        this._mdl.cursorShown = CursorId.resizeHorizontalCursor;
      } else {
        this._mdl.cursorShown = CursorId.pointerCursor;

        // See if it hovered over a mineral point (or line in the case of single axis)
        let hoverMineralIndex = this._mdl.drawModel.minerals.findIndex(
          (mineral) => {
            if (this._mdl.isSingleAxis) {
              return (
                Math.abs(mineral.ratioPt.x - canvasPt.x) <= MINERAL_HOVER_RADIUS
              );
            } else {
              return (
                distanceBetweenPoints(canvasPt, mineral.ratioPt) <=
                MINERAL_HOVER_RADIUS
              );
            }
          }
        );
        if (hoverMineralIndex >= 0) {
          this._mdl.drawModel.mineralHoverIdx = hoverMineralIndex;
        }

        // If we're not hovering over a mineral point, check if we are within the draw area, if so, lasso is possible
        if (
          this._mdl.drawModel.mineralHoverIdx === -1 &&
          this._mdl.drawModel.dataArea.containsPoint(canvasPt)
        ) {
          this._mdl.cursorShown = CursorId.lassoCursor;
        }
      }
    }

    if (
      this._mdl.drawModel.hoverLabel ||
      this._mdl.drawModel.mineralHoverIdx >= 0
    ) {
      return CanvasInteractionResult.redrawOnly;
    } else {
      return CanvasInteractionResult.neither;
    }
  }

  private handleMouseClick(canvasPt: Point): void {
    if (!this._mdl.drawModel) {
      return;
    }
    /*
        let mouseOverIdx = this.getIndexforPoint(canvasPt);

        if(mouseOverIdx != null)
        {
            this.setSelection(new Set<number>([mouseOverIdx.pmc]));
        }
        else*/ if (this._mdl.drawModel.xAxisLabelArea.containsPoint(canvasPt)) {
      this.axisClick$.next("X");
    } else if (this._mdl.drawModel.yAxisLabelArea.containsPoint(canvasPt)) {
      this.axisClick$.next("Y");
    }
    /*        else
        {
            // They clicked on chart, but not on any pmcs, clear selection
            if(this._mdl.drawData.dataArea.containsPoint(canvasPt))
            {
                this.setSelection(new Set<number>());
            }
        }*/
  }

  private handleLassoFinish(lassoPoints: Point[]): void {
    if (
      !this._mdl.raw ||
      !this._mdl.plotData ||
      !lassoPoints ||
      lassoPoints.length === 0
    ) {
      return;
    }

    // We've drawn a lasso area, now find all points within it
    // NOTE: these are points on our plot, but they refer to pixels in the context image!

    const bbox = Rect.makeRect(lassoPoints[0], 0, 0);
    bbox.expandToFitPoints(lassoPoints);

    let selectedPixels = new Set<number>();

    // If we're preserving, read the current selection points in too
    if (this._mdl.selectionMode !== RGBUPlotModel.SELECT_RESET) {
      selectedPixels = new Set<number>(
        this._selectionService.getCurrentSelection().pixelSelection.selectedPixels
      );
    }

    for (let c = 0; c < this._mdl.drawModel.points.length; c++) {
      const coord = this._mdl.drawModel.points[c];
      if (ptWithinPolygon(coord, lassoPoints, bbox)) {
        // Look up the bin that this sits in, and add all pixels that are part of that bin
        for (const srcPixel of this._mdl.plotData.points[c].srcPixelIdxs) {
          // Add or delete as required
          if (this._mdl.selectionMode != RGBUPlotModel.SELECT_SUBTRACT) {
            selectedPixels.add(srcPixel);
          } else {
            selectedPixels.delete(srcPixel);
          }
        }
      }
    }

    // Notify out
    this.setSelection(selectedPixels);
  }

  private setSelection(pixels: Set<number>) {
    if (this._mdl.plotData) {
      this._selectionService.setSelection(
        BeamSelection.makeEmptySelection(),
        new PixelSelection(
          pixels,
          this._mdl.plotData.imgWidth,
          this._mdl.plotData.imgHeight,
          this._mdl.plotData.imgName
        )
      );
    }
  }

  private handleScrollZoom(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._mdl.drawModel?.dataArea) {
      return CanvasInteractionResult.neither;
    }

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const mousePoint = event.canvasPoint;

    // Determine which axes to zoom based on mouse position
    const xAxisZone = this.isOverXAxisArea(mousePoint);
    const yAxisZone = this.isOverYAxisArea(mousePoint);

    // If mouse is over X-axis area, zoom only X-axis
    if (xAxisZone && !yAxisZone) {
      this.zoomXAxis(zoomFactor, mousePoint);
    }
    // If mouse is over Y-axis area, zoom only Y-axis
    else if (yAxisZone && !xAxisZone) {
      this.zoomYAxis(zoomFactor, mousePoint);
    }
    // If mouse is over the data area, zoom both axes
    else if (this.isOverDataArea(mousePoint)) {
      this.zoomXAxis(zoomFactor, mousePoint);
      this.zoomYAxis(zoomFactor, mousePoint);
    }

    return CanvasInteractionResult.redrawAndCatch;
  }

  private zoomXAxis(zoomFactor: number, mousePoint: Point): void {
    if (!this._mdl.xAxis) return;

    const currentMinX =
      this._mdl.selectedMinXValue ?? this._mdl.xAxisMinMax.min ?? 0;
    const currentMaxX =
      this._mdl.selectedMaxXValue ?? this._mdl.xAxisMinMax.max ?? 1;
    const currentSpan = currentMaxX - currentMinX;

    // Calculate the mouse position as a percentage of the current range
    const mouseValue = this._mdl.xAxis.canvasToValue(mousePoint.x);
    const mousePct = (mouseValue - currentMinX) / currentSpan;

    // Calculate new range
    const newSpan = currentSpan / zoomFactor;
    const newMin = mouseValue - newSpan * mousePct;
    const newMax = mouseValue + newSpan * (1 - mousePct);

    // Clamp to original data bounds
    const dataMin = this._mdl.xAxisMinMax.min ?? 0;
    const dataMax = this._mdl.xAxisMinMax.max ?? 1;

    this._mdl.selectedMinXValue = Math.max(newMin, dataMin);
    this._mdl.selectedMaxXValue = Math.min(newMax, dataMax);

    this._mdl.rebuild();
  }

  private zoomYAxis(zoomFactor: number, mousePoint: Point): void {
    if (!this._mdl.yAxis) return;

    const currentMinY =
      this._mdl.selectedMinYValue ?? this._mdl.yAxisMinMax.min ?? 0;
    const currentMaxY =
      this._mdl.selectedMaxYValue ?? this._mdl.yAxisMinMax.max ?? 1;
    const currentSpan = currentMaxY - currentMinY;

    // Calculate the mouse position as a percentage of the current range
    const mouseValue = this._mdl.yAxis.canvasToValue(mousePoint.y);
    const mousePct = (mouseValue - currentMinY) / currentSpan;

    // Calculate new range
    const newSpan = currentSpan / zoomFactor;
    const newMin = mouseValue - newSpan * mousePct;
    const newMax = mouseValue + newSpan * (1 - mousePct);

    // Clamp to original data bounds
    const dataMin = this._mdl.yAxisMinMax.min ?? 0;
    const dataMax = this._mdl.yAxisMinMax.max ?? 1;

    this._mdl.selectedMinYValue = Math.max(newMin, dataMin);
    this._mdl.selectedMaxYValue = Math.min(newMax, dataMax);

    this._mdl.rebuild();
  }

  private handlePanning(event: CanvasMouseEvent): CanvasInteractionResult {
    // Start tracking on mouse down
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      this._lastPanPoint = new Point(event.canvasPoint.x, event.canvasPoint.y);
      return CanvasInteractionResult.redrawAndCatch;
    }

    // Handle dragging - adjust zoom ranges directly
    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG && this._lastPanPoint) {
      const currentPoint = new Point(event.canvasPoint.x, event.canvasPoint.y);
      const dragX = currentPoint.x - this._lastPanPoint.x;
      const dragY = currentPoint.y - this._lastPanPoint.y;

      this.panByPixels(dragX, dragY);

      // Update our tracking point
      this._lastPanPoint = currentPoint;
      return CanvasInteractionResult.redrawAndCatch;
    }

    // Finish panning on mouse up
    if (event.eventId == CanvasMouseEventId.MOUSE_UP && this._lastPanPoint) {
      this._lastPanPoint = null;
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  private panByPixels(dragX: number, dragY: number): void {
    if (!this._mdl.xAxis || !this._mdl.yAxis) return;

    // Convert pixel drag to value changes
    const xValueDrag =
      this._mdl.xAxis.canvasToValue(dragX) - this._mdl.xAxis.canvasToValue(0);
    const yValueDrag =
      this._mdl.yAxis.canvasToValue(dragY) - this._mdl.yAxis.canvasToValue(0);

    // Get current zoom ranges
    const currentMinX =
      this._mdl.selectedMinXValue ?? this._mdl.xAxisMinMax.min ?? 0;
    const currentMaxX =
      this._mdl.selectedMaxXValue ?? this._mdl.xAxisMinMax.max ?? 1;
    const currentMinY =
      this._mdl.selectedMinYValue ?? this._mdl.yAxisMinMax.min ?? 0;
    const currentMaxY =
      this._mdl.selectedMaxYValue ?? this._mdl.yAxisMinMax.max ?? 1;

    // Calculate new ranges by shifting by the drag amount
    const newMinX = currentMinX - xValueDrag;
    const newMaxX = currentMaxX - xValueDrag;
    const newMinY = currentMinY - yValueDrag;
    const newMaxY = currentMaxY - yValueDrag;

    // Clamp to original data bounds
    const dataMinX = this._mdl.xAxisMinMax.min ?? 0;
    const dataMaxX = this._mdl.xAxisMinMax.max ?? 1;
    const dataMinY = this._mdl.yAxisMinMax.min ?? 0;
    const dataMaxY = this._mdl.yAxisMinMax.max ?? 1;

    // Apply clamping while maintaining range size
    const xRangeSize = newMaxX - newMinX;
    const yRangeSize = newMaxY - newMinY;

    let clampedMinX = Math.max(newMinX, dataMinX);
    let clampedMaxX = Math.min(newMaxX, dataMaxX);
    if (clampedMaxX - clampedMinX < xRangeSize) {
      if (clampedMinX === dataMinX) {
        clampedMaxX = Math.min(clampedMinX + xRangeSize, dataMaxX);
      } else {
        clampedMinX = Math.max(clampedMaxX - xRangeSize, dataMinX);
      }
    }

    let clampedMinY = Math.max(newMinY, dataMinY);
    let clampedMaxY = Math.min(newMaxY, dataMaxY);
    if (clampedMaxY - clampedMinY < yRangeSize) {
      if (clampedMinY === dataMinY) {
        clampedMaxY = Math.min(clampedMinY + yRangeSize, dataMaxY);
      } else {
        clampedMinY = Math.max(clampedMaxY - yRangeSize, dataMinY);
      }
    }

    // Update the zoom ranges
    this._mdl.selectedMinXValue = clampedMinX;
    this._mdl.selectedMaxXValue = clampedMaxX;
    this._mdl.selectedMinYValue = clampedMinY;
    this._mdl.selectedMaxYValue = clampedMaxY;

    this._mdl.rebuild();
  }

  private isOverDataArea(point: Point): boolean {
    return this._mdl.drawModel?.dataArea?.containsPoint(point) ?? false;
  }

  private isOverXAxisArea(point: Point): boolean {
    if (!this._mdl.drawModel?.dataArea) return false;

    // Expand the X-axis area to include ticks and labels
    const dataArea = this._mdl.drawModel.dataArea;
    const xAxisZone = new Rect(
      dataArea.x,
      dataArea.y + dataArea.h,
      dataArea.w,
      50 // Height for axis labels and ticks
    );

    return xAxisZone.containsPoint(point);
  }

  private isOverYAxisArea(point: Point): boolean {
    if (!this._mdl.drawModel?.dataArea) return false;

    // Expand the Y-axis area to include ticks and labels
    const dataArea = this._mdl.drawModel.dataArea;
    const yAxisZone = new Rect(
      dataArea.x - 80, // Width for axis labels and ticks
      dataArea.y,
      80,
      dataArea.h
    );

    return yAxisZone.containsPoint(point);
  }
}
