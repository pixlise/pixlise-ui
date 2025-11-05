import { Observable, of, ReplaySubject, Subject, tap } from "rxjs";

import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ClosestPoint, ColourScheme, IContextImageModel } from "./context-image-model-interface";

import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { ContextImageItemTransform } from "src/app/modules/image-viewers/models/image-transform";
import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ContextImageMapLayer } from "src/app/modules/image-viewers/models/map-layer";
import { RGBA, Colours, ColourRamp } from "src/app/utils/colours";
import { MapColourScaleModel, MapColourScaleSourceData } from "./ui-elements/map-colour-scale/map-colour-scale-model";
import { randomString } from "src/app/utils/utils";
import { MinMax } from "src/app/models/BasicTypes";
import { ROILayerVisibility } from "src/app/generated-protos/widget-data";
import { ROIItem } from "src/app/generated-protos/roi";
import { WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImageModelLoadedData, ContextImageDrawModel, ContextImageScanModel } from "./context-image-model-internals";


class ContextImageRawRegion {
  constructor(
    public roi: ROIItem,
    public locIdxs: number[]
  ) {}
}

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();
  exportMode: boolean = false;
  resolution$: ReplaySubject<number> = new ReplaySubject<number>(1);
  needsCanvasResize$: Subject<void> = new Subject<void>();

  keyItems: WidgetKeyItem[] = [];

  // For debugging
  private _id: string = randomString(6);

  // Settings/Layers
  imageName: string = "";
  beamLocationVersionsRequested = new Map<string, number>();

  expressionIds: string[] = [];
  layerOpacity: Map<string, number> = new Map<string, number>();
  roiIds: ROILayerVisibility[] = [];

  hidePointsForScans = new Set<string>();
  hideFootprintsForScans = new Set<string>();
  hideMapsForScans = new Set<string>();

  drawImage: boolean = true;
  imageSmoothing: boolean = true;
  imageBrightness: number = 1;
  selectionModeAdd: boolean = true; // Add or Subtract, nothing else!
  elementRelativeShading: boolean = false; // A toggle available in Element Maps tab version of context image only!

  removeTopSpecularArtifacts: boolean = true;
  removeBottomSpecularArtifacts: boolean = true;
  colourRatioMin: number | null = null;
  colourRatioMax: number | null = null;
  rgbuChannels: string = "";
  unselectedOpacity: number = 0.3;
  unselectedGrayscale: boolean = false;

  private _pointColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;
  private _pointBBoxColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;

  scanPointColourOverrides: Map<number, RGBA> = new Map<number, RGBA>();
  scanIdForColourOverrides: string = "";

  // Where UI elements are moved
  uiPhysicalScaleTranslation: Point = new Point(0, 0);
  uiLayerScaleTranslation: Point = new Point(0, 0);

  transform: PanZoom = new PanZoom();

  private _colourScales: MapColourScaleModel[];
  private _colourScaleDisplayValueRanges = new Map<string, MinMax>();

  private _rois = new Map<string, ContextImageRawRegion>();

  private _currentPixelSelection: PixelSelection | null = null;
  private _currentBeamSelection: BeamSelection | null = null;
  private _hoverEntryIdx = -1;

  // If nothing else, somewhere to put a breakpoint!
  constructor() {
    console.log(` *** ContextImageModel ${this._id} CREATE`);
    this._colourScales = [];
  }

  get colourScales(): MapColourScaleModel[] {
    return this._colourScales;
  }

  // Loaded data, based on the above, we load these. Draw models are generated from these
  // on the fly
  private _raw: ContextImageModelLoadedData | null = null;

  // The drawable data
  private _drawModel: ContextImageDrawModel = new ContextImageDrawModel();

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  hasRawData(): boolean {
    return this._raw != null;
  }

  setData(loadedData: ContextImageModelLoadedData) {
    // It's processed externally so we just take it and save it
    this._raw = loadedData;

    if (this._raw.rgbuSourceImage && this.rgbuChannels.length <= 0) {
      this.rgbuChannels = "RGB";
    }

    // Clear other stuff, out of date from any previous loads...
    this._colourScales = [];

    // Clear maps (TODO: do we want this?)
    for (const m of this._raw.scanModels.values()) {
      m.maps = [];
    }

    this._recalcNeeded = true;
    //console.warn("ContextImageModel setData()");
    this.needsDraw$.next();
  }

  setSelection(beamSel: BeamSelection, pixelSel: PixelSelection, hoverScanId: string, hoverEntryIdx: number) {
    // Save pixel selection if it's different (this causes more regeneration on next draw)
    if (!this._currentPixelSelection || !this._currentPixelSelection.isEqualTo(pixelSel)) {
      this._currentPixelSelection = pixelSel;
      this._recalcNeeded = true;
    }

    if (!this._currentBeamSelection || !this._currentBeamSelection.isEqualTo(beamSel)) {
      this._currentBeamSelection = beamSel;
      this._recalcNeeded = true;
    }

    this._hoverEntryIdx = hoverEntryIdx;

    // We don't want to regenerate everything when selection (and especially hover) changes, so here we just update the existing model
    // if we have one
    // Loop through all the models we have, and if there is nothing in the selection for it, set it to an empty set
    // NOTE: we also clear all hovers...
    for (const [scanId, scanDrawMdl] of this._drawModel.scanDrawModels) {
      scanDrawMdl.selectedPointPMCs = beamSel.getSelectedScanEntryPMCs(scanId);
      scanDrawMdl.selectedPointIndexes = beamSel.getSelectedScanEntryIndexes(scanId);
      scanDrawMdl.hoverEntryIdx = -1;
    }

    // Finally, update the hover index
    if (hoverEntryIdx >= 0) {
      const scanDrawMdl = this._drawModel.scanDrawModels.get(hoverScanId);
      if (scanDrawMdl) {
        scanDrawMdl.hoverEntryIdx = hoverEntryIdx;
      }

      // Also update the colour scale if there is one
      for (let c = 0; c < this._colourScales.length; c++) {
        const scale = this._colourScales[c];

        // TODO: do we want a scan ID here, to specify which one the scale is for??? Does the scale just get all
        // expression output for a given scan???
        if (scale.scanIds.indexOf(hoverScanId) > -1) {
          // Set a hover value for the scan
          const scanDrawMdl = this._drawModel.scanDrawModels.get(hoverScanId);

          // Find the map
          if (scanDrawMdl) {
            for (const scanMap of scanDrawMdl.maps) {
              if (scanMap.expressionId == scale.expressionId) {
                // Find the value among our map points
                for (const pt of scanMap.mapPoints) {
                  if (pt.scanEntryIndex == hoverEntryIdx) {
                    if (c < pt.values.length) {
                      scale.hoverValue = pt.values[c];
                    }
                    break;
                  }
                }
                break;
              }
            }
          }
        }
      }
    } else {
      // Make sure nothing is hovering
      // NOTE: draw models already cleared hover above
      for (const scale of this._colourScales) {
        scale.hoverValue = null;
      }
    }
  }

  setRegion(roiId: string, roi: ROIItem, pmcToIndexLookup: Map<number, number>) {
    const locIdxs: number[] = [];
    for (const pmc of roi.scanEntryIndexesEncoded) {
      const locIdx = pmcToIndexLookup.get(pmc);
      if (locIdx !== undefined) {
        locIdxs.push(locIdx);
      }
    }

    this._rois.set(roiId, new ContextImageRawRegion(roi, locIdxs));
  }

  getRegion(roiId: string): ContextImageRawRegion | undefined {
    return this._rois.get(roiId);
  }

  getRegions(): ContextImageRawRegion[] {
    return Array.from(this._rois.values());
  }

  setMapLayer(layer: ContextImageMapLayer) {
    // Add it to the loaded raw data. This is done separately from setData() because they can be loaded/made visible
    // dynamically and we don't want to regenerate everything in this case, so here we update what models we have
    // NOTE: we make sure that this is a layer we should be showing by checking the list of expressions...
    if (this.expressionIds.indexOf(layer.expressionId) < 0) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image where this expression is not a part of the context image already`);
    }

    if (!this._raw) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image before it has model data available`);
    }

    const scanMdl = this._raw.scanModels.get(layer.scanId);
    if (!scanMdl) {
      throw new Error(`Adding map layer ${layer.expressionId} to context image before where scan id ${layer.scanId} doesn't exist`);
    }

    // Set opacity on it if we have it
    const opacity = this.layerOpacity.get(layer.expressionId);
    if (opacity !== undefined) {
      layer.opacity = opacity;
    }

    // And set the colour for each PMC too
    layer.mapPoints.forEach(pt => {
      pt.drawParams.colour.a = 255 * layer.opacity;
    });

    // If already added, remove it
    let found = false;
    for (let c = 0; c < scanMdl.maps.length; c++) {
      if (scanMdl.maps[c].expressionId === layer.expressionId) {
        scanMdl.maps[c] = layer;
        found = true;
      }
    }

    if (!found) {
      scanMdl.maps.push(layer);
    }

    // If we're the "top" expression (first one in the list), we have to update the colour scale
    if (this.expressionIds[0] === layer.expressionId) {
      this._colourScales = [];
      for (let c = 0; c < layer.valueRanges.length; c++) {
        this.rebuildColourScale(this.expressionIds[0], c, layer.valueRanges.length);
      }
    }

    this._recalcNeeded = true;
    console.log(` *** ContextImageModel ${this._id} setMapLayer - scales: ${this.colourScales.length}`);
  }

  getMapLayers(scanId: string): ContextImageMapLayer[] {
    if (!this._raw) {
      return [];
    }

    const scanMdl = this._raw.scanModels.get(scanId);
    if (!scanMdl) {
      return [];
    }

    return scanMdl.maps;
  }

  private rebuildColourScale(forExpressionId: string, forValuesIdx: number, totalScales: number) {
    if (!this._raw) {
      return;
    }
    const scaleNumber = forValuesIdx;

    // Now find all layers for this expression (expression per scan id... so we want all copies of the expression into same id)
    const scaleData = new MapColourScaleSourceData();
    const scaleScanIds = [];

    let layerName = "";
    let layerShading = ColourRamp.SHADE_INFERNO;

    for (const [scanId, scanMdl] of this._raw.scanModels) {
      for (const mapLayer of scanMdl.maps) {
        if (mapLayer.expressionId === forExpressionId) {
          // This has to be included
          scaleData.addMapValues(mapLayer.mapPoints, forValuesIdx, mapLayer.valueRanges[forValuesIdx], mapLayer.isBinary[forValuesIdx]);
          scaleScanIds.push(scanId);

          // If we haven't yet, pick off the layer name and we just use the first shading setting we find
          if (!layerName) {
            layerName = mapLayer.subExpressionNames[forValuesIdx];
            layerShading = mapLayer.subExpressionShading[forValuesIdx];
          }
        }
      }
    }

    // Ensure we have a saved min/max for this (a blank one)
    // const scaleNumber = totalScales - forValuesIdx - 1;
    const colourScaleRangeId = `${forExpressionId}-${forValuesIdx}`;
    let displayValueRange = this._colourScaleDisplayValueRanges.get(colourScaleRangeId);
    if (!displayValueRange) {
      displayValueRange = new MinMax();
      this._colourScaleDisplayValueRanges.set(colourScaleRangeId, displayValueRange);
    }

    const displayValueMin = displayValueRange.min || 0;
    const displayValueMax = displayValueRange.max || 0;

    const scaleDataValueMin = scaleData.valueRange.min || 0;
    const scaleDataValueMax = scaleData.valueRange.max || 0;

    if (displayValueMin < scaleDataValueMin || displayValueMin >= displayValueMax || displayValueMin >= scaleDataValueMax) {
      displayValueRange.setMin(scaleDataValueMin);
      this._colourScaleDisplayValueRanges.set(colourScaleRangeId, displayValueRange);
    }
    if (displayValueMax > scaleDataValueMax || displayValueMax <= displayValueMin || displayValueMax <= scaleDataValueMin) {
      displayValueRange.setMax(scaleDataValueMax);
      this._colourScaleDisplayValueRanges.set(colourScaleRangeId, displayValueRange);
    }

    // Generate colour scale
    this._colourScales.push(
      new MapColourScaleModel(
        scaleScanIds,
        forExpressionId,
        layerName,
        scaleData,
        false,
        null, // hover value
        displayValueRange, // The display value range to show (top and bottom tags)
        true, // We always allow scale tags to be moved on layer colour scales
        scaleNumber, // Scale number counting from bottom up. This gets reversed later on draw so R shows at the top.
        totalScales, // Total scales we're drawing TODO: figure out a way to add RGB mixes
        layerShading,
        this.onDisplayValueRangeChanged, // Callback for display value range changes
        this.onDisplayValueRangeChangeComplete // Callback for when display value range change is complete
      )
    );
  }

  buildRGBUColourScaleIfNeeded(): void {
    // Only build the colour scale if we don't:
    // - Already have a colour scale (eg from expressions)
    // - Are showing an RGBU image in ratio mode
    if (this._colourScales.length == 0 && this.rgbuChannels.indexOf("/") === 1 && this._raw && this._raw.rgbuSourceImage && this._drawModel.rgbuImageScaleData) {
      const layerShading = ColourRamp.SHADE_MAGMA;

      //const clr = Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, pct);
      //return new MapPointDrawParams(clr, MapPointState.IN_RANGE, MapPointShape.POLYGON, null);
      //this._drawModel.rgbuImageScaleData;

      this._colourScales.push(
        new MapColourScaleModel(
          [],
          "",
          this._drawModel.rgbuImageScaleData.name,
          this._drawModel.rgbuImageScaleData,
          false, // no modules
          null, // hover value
          this._drawModel.rgbuImageScaleData.specularRemovedValueRange, // The display value range to show (top and bottom tags)
          false, // Scale tags not movable
          0, // Scale number, but flipped so first one (R) is on top
          1, // Total scales we're drawing TODO: figure out a way to add RGB mixes
          layerShading,
          this.onDisplayValueRangeChanged, // Callback for display value range changes
          this.onDisplayValueRangeChangeComplete // Callback for when display value range change is complete
        )
      );
    }
  }

  clearDrawnLinePoints(): void {
    this._drawModel.drawnLinePoints = [];
    //console.warn("ContextImageModel clearDrawnLinePoints()");
    this.needsDraw$.next();
  }

  addDrawnLinePoint(pt: Point): void {
    this._drawModel.drawnLinePoints.push(pt);
  }

  get raw(): ContextImageModelLoadedData | null {
    return this._raw;
  }

  get drawModel(): ContextImageDrawModel {
    return this._drawModel;
  }

  get drawnLinePoints(): Point[] {
    return this._drawModel.drawnLinePoints;
  }

  // Set functions, these often require some other action, such as redrawing
  get pointColourScheme(): ColourScheme {
    return this._pointColourScheme;
  }

  set pointColourScheme(scheme: ColourScheme) {
    this._pointColourScheme = scheme;
    this._recalcNeeded = true;
    //console.warn("ContextImageModel set pointColourScheme");
    this.needsDraw$.next();
  }

  get pointBBoxColourScheme(): ColourScheme {
    return this._pointBBoxColourScheme;
  }

  get imageTransform(): ContextImageItemTransform | null {
    if (this._raw) {
      return this._raw.imageTransform;
    }
    return null;
  }

  get colourScaleDisplayValueRanges(): Map<string, MinMax> {
    return this._colourScaleDisplayValueRanges;
  }

  private onDisplayValueRangeChanged = (scaleId: string, expressionId: string, scaleNumber: number, range: MinMax) => {
    // Update the stored display value range for this scale
    const colourScaleRangeId = `${expressionId}-${scaleNumber}`;
    this._colourScaleDisplayValueRanges.set(colourScaleRangeId, range);

    // Trigger a draw update since display ranges have changed
    this.needsDraw$.next();
  };

  // Callback to trigger when display value range change is complete
  private _onDisplayValueRangeChangeComplete?: () => void;

  setDisplayValueRangeChangeCompleteCallback(callback: () => void) {
    this._onDisplayValueRangeChangeComplete = callback;
  }

  private onDisplayValueRangeChangeComplete = () => {
    if (this._onDisplayValueRangeChangeComplete) {
      this._onDisplayValueRangeChangeComplete();
    }
  };

  get currentPixelSelection(): PixelSelection | null {
    return this._currentPixelSelection;
  }

  get currentBeamSelection(): BeamSelection | null {
    return this._currentBeamSelection;
  }

  get hoverEntryIdx(): number {
    return this._hoverEntryIdx;
  }

  get rgbuSourceImage(): RGBUImage | null {
    if (this._raw) {
      return this._raw.rgbuSourceImage;
    }
    return null;
  }

  get rgbuImageScaleData(): MapColourScaleSourceData | null {
    return this._drawModel.rgbuImageScaleData;
  }

  get scanIds(): string[] {
    if (!this._raw) {
      return [];
    }
    return Array.from(this._raw.scanModels.keys());
  }

  getScanModelFor(scanId: string): ContextImageScanModel | null {
    if (this._raw) {
      const mdl = this._raw.scanModels.get(scanId);
      if (mdl) {
        return mdl;
      }
    }

    return null;
  }

  // Rebuilding this models display data
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): Observable<void> {
    // Sometimes the colour scale wants a recalc, so check for that here
    let forceRecalcDrawModel = false;
    for (const scale of this._colourScales) {
      if (scale.needsRecalc) {
        forceRecalcDrawModel = true;
      }
    }

    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (forceRecalcDrawModel || this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      //console.warn("drawModel.regenerate called...");
      return this._drawModel.regenerate(canvasParams, this).pipe(
        tap(() => {
          //console.warn("regenerate completion...");
          // If we don't have colour scales, but do have RGBU data and are in ratio mode, we can generate a scale from that
          this.buildRGBUColourScaleIfNeeded();

          // Also recalculate draw models of any colour scales we're showing
          for (const scale of this._colourScales) {
            scale.recalcDisplayData(canvasParams);
          }

          this._lastCalcCanvasParams = canvasParams;
          this._recalcNeeded = false;

          this.drawModel.drawnData = null;
          //this.needsDraw$.next();
        })
      );
    } else {
      //console.warn("SKIPPED drawModel.regenerate...");
    }

    return of(void 0);
  }

  updateKey() {
    this.keyItems = [];
    this._rois.forEach((roi, roiId) => {
      const scanMdl = this._raw?.scanModels.get(roi.roi.scanId);
      if (!scanMdl) {
        return;
      }

      const keyItem = new WidgetKeyItem(
        roiId,
        roi.roi.name,
        roi.roi.displaySettings?.colour || Colours.WHITE,
        null,
        roi.roi.displaySettings?.shape,
        scanMdl.scanTitle,
        true,
        false,
        true
      );
      this.keyItems.push(keyItem);
    });
  }

  getClosestLocationIdxToPoint(worldPt: Point): ClosestPoint {
    const maxDistance: number = 3;

    let closestScanId = "";
    let closestScanIdx = -1;
    let closestDist = -1;

    if (this._raw) {
      for (const [scanId, scanMdl] of this._raw.scanModels) {
        const result = scanMdl.getClosestLocationIdxToPoint(worldPt, maxDistance);
        if (closestDist < 0 || (result[0] > 0 && result[1] < closestDist)) {
          closestDist = result[1];
          closestScanIdx = result[0];
          closestScanId = scanId;
        }
      }
    }

    return new ClosestPoint(closestScanId, closestScanIdx);
  }
}

export function convertLocationComponentToPixelPosition(x: number, y: number): Point {
  return new Point(Math.round(x), Math.round(y));
}
