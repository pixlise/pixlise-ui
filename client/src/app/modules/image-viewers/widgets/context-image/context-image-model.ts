import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ClosestPoint, ColourScheme, IContextImageModel, getSchemeColours } from "./context-image-model-interface";
import { Subject } from "rxjs";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartDrawModel, BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { ContextImageItemTransform } from "../../models/image-transform";
import { Point, Rect, distanceBetweenPoints } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ScanPoint } from "../../models/scan-point";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ContextImageMapLayer } from "../../models/map-layer";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { Footprint, HullPoint } from "../../models/footprint";
import { RGBA, Colours, ColourRamp } from "src/app/utils/colours";
import { ContextImageScanDrawModel } from "../../models/context-image-draw-model";
import { ContextImageRegionLayer } from "../../models/region";
import { MapColourScaleModel, MapColourScaleSourceData } from "./ui-elements/map-colour-scale/map-colour-scale-model";
import { randomString } from "src/app/utils/utils";
import { MinMax } from "src/app/models/BasicTypes";

export class ContextImageModelLoadedData {
  constructor(
    public image: HTMLImageElement | null = null,
    public imageTransform: ContextImageItemTransform | null = null,
    public scanModels: Map<string, ContextImageScanModel>,
    public rgbuSourceImage: RGBUImage | null = null,
    public rgbuImageLayerForScale: IColourScaleDataSource | null
  ) {}
}

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

  // For debugging
  private _id: string = randomString(6);

  // Settings/Layers
  imageName: string = "";
  displayedChannels: string = "";

  expressionIds: string[] = [];
  roiIds: string[] = [];

  hidePointsForScans: string[] = [];
  hideFootprintsForScans: string[] = [];
  hideMapsForScans: string[] = [];

  smoothing: boolean = false;
  selectionModeAdd: boolean = true; // Add or Subtract, nothing else!
  elementRelativeShading: boolean = false; // A toggle available in Element Maps tab version of context image only!

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

    // Clear other stuff, out of date from any previous loads...
    this._colourScales = [];

    this._recalcNeeded = true;
    console.log(` *** ContextImageModel ${this._id} setData recalcNeeded=${this._recalcNeeded}`);
    this.needsDraw$.next();
  }

  setSelection(beamSel: BeamSelection, pixelSel: PixelSelection, hoverScanId: string, hoverEntryIdx: number) {
    // We don't want to regenerate everything when selection (and especially hover) changes, so here we just update the existing model
    // if we have one
    for (const scanId of beamSel.getScanIds()) {
      const scanDrawMdl = this._drawModel.scanDrawModels.get(scanId);

      // Are we showing data for the scan that the selection happened for? We don't necessarily have it showing... not an error!
      if (scanDrawMdl) {
        scanDrawMdl.hoverEntryIdx = -1;
        scanDrawMdl.selectedPointIdxs = beamSel.getSelectedScanEntryIndexes(scanId);
      }
    }

    // Finally, update the hover index
    if (hoverEntryIdx >= 0) {
      const scanDrawMdl = this._drawModel.scanDrawModels.get(hoverScanId);
      if (scanDrawMdl) {
        scanDrawMdl.hoverEntryIdx = hoverEntryIdx;
      }

      // Also update the colour scale if there is one
      for (const scale of this._colourScales) {
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
                    scale.hoverValue = pt.value;
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
      for (const mdl of this._drawModel.scanDrawModels.values()) {
        mdl.hoverEntryIdx = -1;
      }
      for (const scale of this._colourScales) {
        scale.hoverValue = null;
      }
    }
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

    // If already added, remove it
    let found = false;
    for (let c = 0; c < scanMdl.maps.length; c++) {
      if (scanMdl.maps[c].expressionId == layer.expressionId) {
        scanMdl.maps[c] = layer;
        found = true;
      }
    }

    if (!found) {
      scanMdl.maps.push(layer);
    }

    if (this.expressionIds[0] == layer.expressionId) {
      this.rebuildColourScale();
    }

    this._recalcNeeded = true;
    console.log(` *** ContextImageModel ${this._id} setMapLayer recalcNeeded=${this._recalcNeeded} scales: ${this.colourScales.length}`);
  }

  rebuildColourScale() {
    if (this.expressionIds.length <= 0 || !this._raw) {
      return;
    }

    // If we're the "top" expression (first one in the list), we have to update the colour scale
    const topExpressionId = this.expressionIds[0];

    // Now find all layers for this expression (expression per scan id... so we want all copies of the expression into same id)
    const scaleData = new MapColourScaleSourceData();
    const scaleScanIds = [];

    let layerName = "";
    let layerShading = ColourRamp.SHADE_INFERNO;

    for (const [scanId, scanMdl] of this._raw.scanModels) {
      for (const mapLayer of scanMdl.maps) {
        if (mapLayer.expressionId == topExpressionId) {
          // This has to be included
          scaleData.addValues(mapLayer.mapPoints, mapLayer.valueRange, mapLayer.isBinary);
          scaleScanIds.push(scanId);

          // If we haven't yet, pick off the layer name and we just use the first shading setting we find
          if (!layerName) {
            layerName = mapLayer.expressionName;
            layerShading = mapLayer.shading;
          }
        }
      }
    }

    // Ensure we have a saved min/max for this (a blank one)
    let displayValueRange = this._colourScaleDisplayValueRanges.get(topExpressionId);
    if (!displayValueRange) {
      displayValueRange = new MinMax();
      this._colourScaleDisplayValueRanges.set(topExpressionId, displayValueRange);
    }

    // Generate colour scale
    this._colourScales.push(
      new MapColourScaleModel(
        scaleScanIds,
        topExpressionId,
        layerName,
        scaleData,
        false,
        null, // hover value
        displayValueRange, // The display value range to show (top and bottom tags)
        true, // We always allow scale tags to be moved on layer colour scales
        0, // Scale number
        1, // Total scales we're drawing TODO: figure out a way to add RGB mixes
        layerShading
      )
    );
  }

  clearDrawnLinePoints(): void {
    this._drawModel.drawnLinePoints = [];
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

  get pointBBoxColourScheme(): ColourScheme {
    return this._pointBBoxColourScheme;
  }

  get imageTransform(): ContextImageItemTransform | null {
    if (this._raw) {
      return this._raw.imageTransform;
    }
    return null;
  }

  get rgbuSourceImage(): RGBUImage | null {
    if (this._raw) {
      return this._raw.rgbuSourceImage;
    }
    return null;
  }

  get rgbuImageLayerForScale(): IColourScaleDataSource | null {
    return this._drawModel.colourScaleData;
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
    //console.log(` *** ContextImageModel ${this._id} recalcDisplayDataIfNeeded recalcNeeded=${this._recalcNeeded}`);

    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this._drawModel.regenerate(canvasParams, this);

      // Also recalculate draw models of any colour scales we're showing
      for (const scale of this._colourScales) {
        scale.recalcDisplayData(canvasParams);
      }

      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
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
    public imageName: string, // The image we were generated for (our points are relative to this image!)
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
  regions: ContextImageRegionLayer[] = [];

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
  smoothing: boolean = true;
  image: HTMLImageElement | null = null;
  imageTransform: ContextImageItemTransform | null = null;

  lineWidthPixels: number = 1; // Gets set at start of draw call because its based on zoom factor

  primaryColour: RGBA = Colours.WHITE;
  secondaryColour: RGBA = Colours.BLACK;

  // Drawn data per scan
  scanDrawModels: Map<string, ContextImageScanDrawModel> = new Map<string, ContextImageScanDrawModel>();

  // Bounding box of everything (besides image), in image coordinates. This is primarily used for zooming
  allLocationPointsBBox: Rect = new Rect(0, 0, 0, 0);

  // This is the data shown by the Map Colour Scale UI Element. This can be pointed at either:
  // 1. A map layer from an expression (stored in one of our scanDrawModels)
  // 2. A map layer from an expression group (also stored there). This is the equivalent of "RGB Mixes" from the old system
  // 3. If the above 2 don't exist but we have an RGBU image displayed with ratio mode, it'll read from the ratio image
  colourScaleData: IColourScaleDataSource | null = null;

  // Drawn line over the top of it all
  drawnLinePoints: Point[] = [];

  regenerate(canvasParams: CanvasParams, from: ContextImageModel) {
    // Throw away any cached drawn image we have
    this.drawnData = null;

    // Copy settings across. IDEALLY all this stuff should be copied or we should provide it read-only so no buggy drawing
    // code could modify our model state, but that's a bit luxurious. We're providing objects, which can be modified easily.
    this.drawnLinePoints = from.drawnLinePoints;
    this.smoothing = from.smoothing;
    this.image = from.raw?.image || null;
    this.imageTransform = from.raw?.imageTransform || null;

    const pointColours = getSchemeColours(from.pointColourScheme);
    this.primaryColour = pointColours[0];
    this.secondaryColour = pointColours[1];

    // Generate draw models for each scan while also calculating the overall bounding box
    this.allLocationPointsBBox = new Rect();
    if (from.raw) {
      this.scanDrawModels.clear();

      for (const [scanId, scanMdl] of from.raw.scanModels) {
        this.allLocationPointsBBox.expandToFitPoint(new Point(scanMdl.scanPointsBBox.x, scanMdl.scanPointsBBox.y));
        this.allLocationPointsBBox.expandToFitPoint(new Point(scanMdl.scanPointsBBox.maxX(), scanMdl.scanPointsBBox.maxY()));

        const footprintColours = getSchemeColours(from.pointBBoxColourScheme);
        const footprint = new Footprint(scanMdl.footprint, footprintColours[0], footprintColours[1]);

        const scanDrawMdl = new ContextImageScanDrawModel(
          scanMdl.scanPoints,
          scanMdl.scanPointPolygons,
          footprint,
          new Set<number>(), // We don't have selection info at this point
          -1, // We don't have selection info at this point
          scanId == from.scanIdForColourOverrides ? from.scanPointColourOverrides : new Map<number, RGBA>(),
          scanMdl.scanPointDisplayRadius,
          scanMdl.beamRadius_pixels,
          scanMdl.contextPixelsTommConversion
        );

        if (scanMdl.maps) {
          scanDrawMdl.maps = Array.from(scanMdl.maps);
        }

        if (scanMdl.regions) {
          scanDrawMdl.regions = Array.from(scanMdl.regions);
        }

        this.scanDrawModels.set(scanId, scanDrawMdl);
      }
    }
  }
}
