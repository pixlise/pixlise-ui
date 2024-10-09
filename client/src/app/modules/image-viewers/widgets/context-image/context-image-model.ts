import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ClosestPoint, ColourScheme, IContextImageModel, getSchemeColours } from "./context-image-model-interface";
import { forkJoin, map, Observable, of, Subject, switchMap, tap } from "rxjs";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartDrawModel, BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { ContextImageItemTransform } from "../../models/image-transform";
import { Point, Rect, distanceBetweenPoints } from "src/app/models/Geometry";
import { RGBUImage, RGBUImageGenerated } from "src/app/models/RGBUImage";
import { ScanPoint } from "../../models/scan-point";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ContextImageMapLayer, MapPointDrawParams, MapPointShape, MapPointState, getDrawParamsForRawValue } from "../../models/map-layer";
import { Footprint, HullPoint } from "../../models/footprint";
import { RGBA, Colours, ColourRamp } from "src/app/utils/colours";
import { ContextImageScanDrawModel } from "../../models/context-image-draw-model";
import { ContextImageRegionLayer, RegionDisplayPolygon } from "../../models/region";
import { MapColourScaleModel, MapColourScaleSourceData } from "./ui-elements/map-colour-scale/map-colour-scale-model";
import { randomString } from "src/app/utils/utils";
import { MinMax } from "src/app/models/BasicTypes";
import { adjustImageRGB, alphaBytesToImage } from "src/app/utils/drawing";
import { ROILayerVisibility } from "src/app/generated-protos/widget-data";
import { ROIItem } from "src/app/generated-protos/roi";

export class ContextImageModelLoadedData {
  constructor(
    public image: HTMLImageElement | null = null,
    public imageTransform: ContextImageItemTransform | null = null,
    public scanModels: Map<string, ContextImageScanModel>,
    public rgbuSourceImage: RGBUImage | null = null
  ) {}

  copy(): ContextImageModelLoadedData {
    const scanModelsCopy = new Map<string, ContextImageScanModel>();
    for (const [scanId, scanModel] of this.scanModels.entries()) {
      const scanModelCopy = new ContextImageScanModel(
        scanModel.scanId,
        scanModel.scanTitle,
        scanModel.imageName,
        scanModel.beamLocVersion,
        scanModel.scanPoints,
        scanModel.scanPointPolygons,
        scanModel.footprint,
        scanModel.contextPixelsTommConversion,
        scanModel.beamRadius_pixels,
        scanModel.scanPointDisplayRadius,
        scanModel.scanPointsBBox,
        scanModel.scanPointColourOverrides
      );
      scanModelsCopy.set(scanId, scanModelCopy);
    }

    return new ContextImageModelLoadedData(this.image, this.imageTransform, scanModelsCopy, this.rgbuSourceImage);
  }
}

class ContextImageRawRegion {
  constructor(
    public roi: ROIItem,
    public locIdxs: number[]
  ) {}
}

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

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
    const colourScaleRangeId = forExpressionId + "-" + forValuesIdx;
    let displayValueRange = this._colourScaleDisplayValueRanges.get(colourScaleRangeId);
    if (!displayValueRange) {
      displayValueRange = new MinMax();
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
        totalScales - forValuesIdx - 1, // Scale number, but flipped so first one (R) is on top
        totalScales, // Total scales we're drawing TODO: figure out a way to add RGB mixes
        layerShading
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
          layerShading
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
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
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
      this._drawModel.regenerate(canvasParams, this).subscribe(() => {
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
        this.needsDraw$.next();
      });
    } /*else {
      console.warn("SKIPPED drawModel.regenerate...");
    }*/
  }

  getClosestLocationIdxToPoint(worldPt: Point): ClosestPoint {
    const maxDistance: number = 3;

    let closestScanId = "";
    let closestScanIdx = -1;
    let closestDist = -1;

    if (this._raw) {
      for (const [scanId, scanMdl] of this._raw.scanModels) {
        const result = scanMdl.getClosestLocationIdxToPoint(worldPt, maxDistance);
        if (closestDist < 0 || result[1] < closestDist) {
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

export class ContextImageScanModel {
  constructor(
    public scanId: string, // The scan ID we were generated for
    public scanTitle: string, // Title as displayed on dataset tile
    public imageName: string, // The image we were generated for (our points are relative to this image!)
    public beamLocVersion: number, // Versioning of the source beam ijs
    public scanPoints: ScanPoint[], // The actual scan points
    public scanPointPolygons: Point[][], // Scan points can be rendered as polygons which touch neighbours
    public footprint: HullPoint[][], // Footprint of scan points relative to the image
    public contextPixelsTommConversion: number, // Conversion ratio of image pixels -> mm
    public beamRadius_pixels: number, // Size of the beam in image pixels
    public scanPointDisplayRadius: number, // Size of the beam in image pixels
    public scanPointsBBox: Rect,
    public scanPointColourOverrides: Map<number, RGBA>
  ) {}

  // Maps
  maps: ContextImageMapLayer[] = [];

  // Regions
  //regions: ContextImageRegionLayer[] = [];

  // Returns index and distance in array of 2 numbers
  getClosestLocationIdxToPoint(worldPt: Point, maxDistance: number): number[] {
    const idxs = [];
    for (const loc of this.scanPoints) {
      if (loc.coord && Math.abs(worldPt.x - loc.coord.x) < maxDistance && Math.abs(worldPt.y - loc.coord.y) < maxDistance) {
        idxs.push(loc.locationIdx);
      }
    }

    // If we've got multiple, find the closest one geometrically
    let closestDist = -1;
    let closestIdx = -1;
    for (const idx of idxs) {
      const comparePt = this.scanPoints[idx].coord;
      if (comparePt) {
        if (closestIdx == -1) {
          closestIdx = idx;

          if (idxs.length > 0) {
            closestDist = distanceBetweenPoints(worldPt, comparePt);
            //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
          }
        } else {
          const dist = distanceBetweenPoints(worldPt, comparePt);
          //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
          if (closestDist < 0 || dist < closestDist) {
            closestIdx = idx;
            closestDist = dist;
          }
        }
      }
    }

    //console.log('Closest: '+closestIdx);
    return [closestIdx, closestDist];
  }
}

export class ContextImageDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  // Drawing the image
  imageSmoothing: boolean = true;
  image: HTMLImageElement | null = null;
  imageTransform: ContextImageItemTransform | null = null;

  lineWidthPixels: number = 1; // Gets set at start of draw call because its based on zoom factor

  primaryColour: RGBA = Colours.WHITE;
  secondaryColour: RGBA = Colours.BLACK;

  // Drawn data per scan
  scanDrawModels: Map<string, ContextImageScanDrawModel> = new Map<string, ContextImageScanDrawModel>();

  // Bounding box of everything (besides image), in image coordinates. This is primarily used for zooming
  allLocationPointsBBox: Rect = new Rect(0, 0, 0, 0);

  // If we have an RGBU image showing, this is the data source to build a colour scale for it
  rgbuImageScaleData: MapColourScaleSourceData | null = null;

  // Drawn line over the top of it all
  drawnLinePoints: Point[] = [];

  regenerate(canvasParams: CanvasParams, from: ContextImageModel): Observable<void> {
    // Throw away any cached drawn image we have
    this.drawnData = null;

    // Copy settings across. IDEALLY all this stuff should be copied or we should provide it read-only so no buggy drawing
    // code could modify our model state, but that's a bit luxurious. We're providing objects, which can be modified easily.
    this.drawnLinePoints = from.drawnLinePoints;
    this.imageSmoothing = from.imageSmoothing;
    if (!from.drawImage) {
      this.image = null;
    } else {
      // NOTE: we have a case here where the image isn't restored. If the raw data has no image, but DOES have an RGBU image
      // we can would have to regenerate the display image. Because that's extra work, check in an existing drawer
      // to see if it has an image, and reuse that
      if (!from.raw?.image && from.raw?.rgbuSourceImage && from.drawModel.image) {
        this.image = from.drawModel.image;
      } else {
        this.image = from.raw?.image || null;
      }
    }

    // Apply brightness
    if (this.image) {
      return adjustImageRGB(this.image, from.imageBrightness).pipe(
        switchMap((img: HTMLImageElement) => {
          this.image = img;
          return this.continueRegenerate(from);
        })
      );
    }

    // If we still don't have an image, maybe it's an RGBU and needs to be generated here
    if (!this.image && from.raw?.rgbuSourceImage) {
      return from.raw.rgbuSourceImage
        .generateRGBDisplayImage(
          from.imageBrightness,
          from.rgbuChannels,
          //false, log colour
          from.unselectedOpacity,
          from.unselectedGrayscale,
          from.currentPixelSelection ? from.currentPixelSelection : PixelSelection.makeEmptySelection(),
          from.colourRatioMin,
          from.colourRatioMax,
          PixelSelection.makeEmptySelection(),
          from.removeTopSpecularArtifacts,
          from.removeBottomSpecularArtifacts
        )
        .pipe(
          switchMap((rgbuGen: RGBUImageGenerated | null) => {
            if (rgbuGen) {
              // Save the display image and scale data
              this.image = rgbuGen.image;
              this.rgbuImageScaleData = rgbuGen.layerForScale;
            }

            return this.continueRegenerate(from);
          })
        );
    }

    // Otherwise... still continue
    return this.continueRegenerate(from);
  }

  private continueRegenerate(from: ContextImageModel): Observable<void> {
    return new Observable<void>(observer => {
      this.imageTransform = from.raw?.imageTransform || null;

      const pointColours = getSchemeColours(from.pointColourScheme);
      this.primaryColour = pointColours[0];
      this.secondaryColour = pointColours[1];

      // Generate draw models for each scan while also calculating the overall bounding box
      this.allLocationPointsBBox = new Rect();
      let firstBBox = true;

      if (!from.raw) {
        //console.warn("Return EMPTY");
        observer.next();
        observer.complete();
        return;
      }

      const newScanDrawModels = new Map<string, ContextImageScanDrawModel>();

      for (const [scanId, scanMdl] of from.raw.scanModels) {
        if (firstBBox) {
          this.allLocationPointsBBox = scanMdl.scanPointsBBox.copy();
          firstBBox = false;
        } else {
          this.allLocationPointsBBox.expandToFitRect(scanMdl.scanPointsBBox);
        }

        const footprintColours = getSchemeColours(from.pointBBoxColourScheme);
        const footprint = new Footprint(scanMdl.footprint, footprintColours[0], footprintColours[1]);

        let selPMCs = new Set<number>(); // Assume we don't have selection info at this point
        let selLocIdxs = new Set<number>(); // Assume we don't have selection info at this point

        // Check if we have a selection stored
        if (from.currentBeamSelection) {
          selPMCs = from.currentBeamSelection.getSelectedScanEntryPMCs(scanId);
          selLocIdxs = from.currentBeamSelection.getSelectedScanEntryIndexes(scanId);
        }

        const scanDrawMdl = new ContextImageScanDrawModel(
          scanMdl.scanPoints,
          scanMdl.scanPointPolygons,
          footprint,
          selPMCs,
          selLocIdxs,
          from.hoverEntryIdx,
          scanId == from.scanIdForColourOverrides ? from.scanPointColourOverrides : new Map<number, RGBA>(),
          scanMdl.scanPointDisplayRadius,
          scanMdl.beamRadius_pixels,
          scanMdl.contextPixelsTommConversion
        );

        if (scanMdl.maps) {
          // Recolour each one
          for (const layerMap of scanMdl.maps) {
            const displayRanges: MinMax[] = [];

            for (let c = 0; c < layerMap.valueRanges.length; c++) {
              const colourScaleRangeId = layerMap.expressionId + "-" + c;
              let range = from.colourScaleDisplayValueRanges.get(colourScaleRangeId);
              if (!range || !range.isValid()) {
                range = layerMap.valueRanges[c];
              }
              if (!range) {
                range = new MinMax(0, 0); // just don't leave dangling nulls around...
              }

              displayRanges.push(range);
            }

            for (const pt of layerMap.mapPoints) {
              if (pt.values.length == 1) {
                pt.drawParams = getDrawParamsForRawValue(layerMap.shading, pt.values[0], displayRanges[0]);
                pt.drawParams.colour.a = layerMap.opacity * 255;
              } else if (pt.values.length == 3) {
                pt.drawParams = new MapPointDrawParams(
                  new RGBA(
                    displayRanges[0].getAsPercentageOfRange(pt.values[0], true) * 255,
                    displayRanges[1].getAsPercentageOfRange(pt.values[1], true) * 255,
                    displayRanges[2].getAsPercentageOfRange(pt.values[2], true) * 255,
                    255 * layerMap.opacity
                  ),
                  MapPointState.IN_RANGE,
                  MapPointShape.POLYGON
                );
              }
            }
            scanDrawMdl.maps.push(layerMap);
          }
        }

        newScanDrawModels.set(scanId, scanDrawMdl);
      }

      // Use these new ones
      this.scanDrawModels = newScanDrawModels;

      // If we have any regions turned on, we need to generate their region polygons so they get drawn
      const toWait$ = [];

      for (const roi of from.roiIds) {
        const mdl = this.scanDrawModels.get(roi.scanId);
        if (mdl) {
          toWait$.push(
            this.makeRegion(roi.scanId, roi.id, from, roi.opacity).pipe(
              tap((roiLayer: ContextImageRegionLayer) => {
                mdl.regions.push(roiLayer);
              })
            )
          );
        }
      }

      if (toWait$.length <= 0) {
        //console.warn("Return EMPTY2");
        observer.next();
        observer.complete();
        return;
      }

      forkJoin(toWait$).subscribe((value: ContextImageRegionLayer[]) => {
        //console.warn("Return forkJoin");
        observer.next();
        observer.complete();
      });
    });
  }

  private makePixelMask(pixelIndexes: Set<number>, width: number, height: number, roiColour: RGBA): Observable<HTMLImageElement | null> {
    // If we have been informed of a context images dimensions, we can generate a mask image
    if (width <= 0 || height <= 0) {
      return of(null);
    }

    const pixelCount = width * height;
    const maskBytes = new Uint8Array(pixelCount);

    for (const idx of pixelIndexes) {
      maskBytes[idx] = 192;
    }

    return alphaBytesToImage(maskBytes, width, height, roiColour);
  }

  private makeRegion(scanId: string, roiId: string, from: ContextImageModel, opacity: number = 1): Observable<ContextImageRegionLayer> {
    const roiLayer = new ContextImageRegionLayer(roiId, "");
    roiLayer.opacity = opacity;

    // Get the region info
    const roi = from.getRegion(roiId);

    if (!roi) {
      console.error("makeRegion failed for: " + roiId + " - region not found in model");
      return of(roiLayer);
    }

    roiLayer.name = roi.roi.name;

    // Find the polygons the region covers
    const scanMdl = from.getScanModelFor(scanId);

    if (!scanMdl) {
      console.error("makeRegion failed for: " + roiId + " - scan model not found for scan: " + scanId);
      return of(roiLayer);
    }

    const locToPMCLookup = new Map<number, number>();
    scanMdl.scanPoints.forEach(pt => {
      locToPMCLookup.set(pt.locationIdx, pt.PMC);
    });

    for (const locIdx of roi.locIdxs) {
      if (locIdx < 0 || locIdx >= scanMdl.scanPointPolygons.length) {
        console.error("makeRegion failed for: " + roiId + " - locIdx: " + locIdx + " did not have corresponding polygon");
        return of(roiLayer);
      }

      let pmc = locToPMCLookup.get(locIdx);
      let locOpacity = 1;
      if (roi.roi.isMIST && pmc !== undefined) {
        let mistOpacity = roi.roi?.mistROIItem?.pmcConfidenceMap[pmc];
        if (mistOpacity !== undefined) {
          locOpacity = mistOpacity;
        }

        if (roi.roi.mistROIItem?.formula) {
          roiLayer.customTooltip = roi.roi.mistROIItem.formula;
        }
      }

      roiLayer.polygons.push(new RegionDisplayPolygon(scanMdl.scanPointPolygons[locIdx], [], locOpacity));
    }

    if (roi.roi.displaySettings) {
      roiLayer.colour = RGBA.fromString(roi.roi.displaySettings.colour);
      roiLayer.colour.a = 255 * opacity;
    }

    // If we have pixel indexes, we can generate a mask image
    if (roi.roi.pixelIndexesEncoded.length > 0 && roi.roi.imageName == from.imageName) {
      const width = from.raw?.rgbuSourceImage?.r?.width || 0;
      const height = from.raw?.rgbuSourceImage?.r?.height || 0;

      return this.makePixelMask(new Set(roi.roi.pixelIndexesEncoded), width, height, roiLayer.colour).pipe(
        map((mask: HTMLImageElement | null) => {
          roiLayer.pixelMask = mask;
          return roiLayer;
        })
      );
    }

    return of(roiLayer);
  }
}
