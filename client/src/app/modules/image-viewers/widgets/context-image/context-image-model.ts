import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ColourScheme, IContextImageModel, getSchemeColours } from "./context-image-model-interface";
import { Subject } from "rxjs";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { ContextImageDrawModel } from "../../models/context-image-draw-model";
import { ContextImageItemTransform } from "../../models/image-transform";
import { Point, Rect } from "src/app/models/Geometry";
import { ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ScanPoint } from "../../models/scan-point";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();
  // The drawable data
  private _drawModel: ContextImageDrawModel = new ContextImageDrawModel();

  private _drawTransform: PanZoom = new PanZoom();

  // Settings/Layers
  imageName: string = "";
  smoothing: boolean = false;
  showPoints: boolean = true;

  image: HTMLImageElement | null = null;
  imageTransform: ContextImageItemTransform | null = null;
  beamResp: ScanBeamLocationsResp | null = null;

  rgbuSourceImage: RGBUImage | null = null;
/*
  get scanPoints(): ScanPoint[] {
    return this._drawModel.scanPoints;
  }
*/

  private _selectionModeAdd: boolean = true; // Add or Subtract, nothing else!

  private _pointColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;
  private _pointBBoxColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  get drawModel(): ContextImageDrawModel {
    return this._drawModel;
  }

  hasRawData(): boolean {
    return true;
  }

  setData(drawModel: ContextImageDrawModel, beamSel: BeamSelection, pixelSel: PixelSelection) {
    this._drawModel = drawModel;

    // Set the drawn points, we create those here...
    this._drawModel.drawnLinePoints = this.drawnLinePoints;

    // Distribute selection to the scan that needs it
    this._drawModel.allLocationPointsBBox = new Rect();
    for (const [scanId, scanDrawMdl] of this._drawModel.perScanDrawModel) {
      scanDrawMdl.selectedPointIdxs = beamSel.getSelectedScanEntryIndexes(scanId);

      const footprintColours = getSchemeColours(this._pointBBoxColourScheme);

      if (scanDrawMdl.footprint) {
        scanDrawMdl.footprint.innerColour = footprintColours[0];
        scanDrawMdl.footprint.outerColour = footprintColours[1];
      }

      this._drawModel.allLocationPointsBBox.expandToFitPoint(new Point(scanDrawMdl.locationPointBBox.x, scanDrawMdl.locationPointBBox.y));
      this._drawModel.allLocationPointsBBox.expandToFitPoint(new Point(scanDrawMdl.locationPointBBox.maxX(), scanDrawMdl.locationPointBBox.maxY()));
    }

    const pointColours = getSchemeColours(this._pointColourScheme);
    this._drawModel.primaryColour = pointColours[0];
    this._drawModel.secondaryColour = pointColours[1];

    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  clearDrawnLinePoints(): void {
    this._drawModel.drawnLinePoints = [];
    this.needsDraw$.next();
  }

  addDrawnLinePoint(pt: Point): void {
    this._drawModel.drawnLinePoints.push(pt);
  }

  get drawnLinePoints(): Point[] {
    return this._drawModel.drawnLinePoints;
  }

  get transform(): PanZoom {
    return this._drawTransform;
  }

  // Set functions, these often require some other action, such as redrawing
  get selectionModeAdd(): boolean {
    return this._selectionModeAdd;
  }

  set selectionModeAdd(val: boolean) {
    this._selectionModeAdd = val;
  }

  get pointColourScheme(): ColourScheme {
    return this._pointColourScheme;
  }

  get pointBBoxColourScheme(): ColourScheme {
    return this._pointBBoxColourScheme;
  }

  get scanIds(): string[] {
    return Array.from(this._drawModel.perScanDrawModel.keys());
  }

  getScanPointsFor(scanId: string): ScanPoint[] {
    const mdl = this._drawModel.perScanDrawModel.get(scanId);
    if (!mdl) {
      return [];
    }

    return mdl.scanPoints;
  }

  // Rebuilding this models display data
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerateDrawModel(canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  private regenerateDrawModel(viewport: CanvasParams) {
    this._drawModel.drawnData = null; // Force regen
  }
}
