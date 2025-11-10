import { Point } from "src/app/models/Geometry";
import { Observable, switchMap, tap, forkJoin, of, map } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { Rect, distanceBetweenPoints } from "src/app/models/Geometry";
import { RGBUImage, RGBUImageGenerated } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BaseChartDrawModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { RGBA, Colours } from "src/app/utils/colours";
import { adjustImageRGB, alphaBytesToImage } from "src/app/utils/drawing";
import { ContextImageItemTransform } from "src/app/modules/image-viewers/models/image-transform";
import { ContextImageScanDrawModel, ScanPointPolygon } from "src/app/modules/image-viewers/models/context-image-draw-model";
import { HullPoint, Footprint } from "src/app/modules/image-viewers/models/footprint";
import { ContextImageMapLayer, getDrawParamsForRawValue, MapPointDrawParams, MapPointState, MapPointShape } from "src/app/modules/image-viewers/models/map-layer";
import { ContextImageRegionLayer, RegionDisplayPolygon } from "src/app/modules/image-viewers/models/region";
import { ScanPoint } from "src/app/modules/image-viewers/models/scan-point";
import { ContextImageModel } from "src/app/modules/image-viewers/widgets/context-image/context-image-model";
import { getSchemeColours } from "src/app/modules/image-viewers/widgets/context-image/context-image-model-interface";
import { MapColourScaleSourceData } from "src/app/modules/image-viewers/widgets/context-image/ui-elements/map-colour-scale/map-colour-scale-model";

export class PointCluster {
  constructor(
    public locIdxs: number[],
    public pointDistance: number,
    public footprintPoints: HullPoint[],
    public angleRadiansToContextImage: number
  ) {}
}

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
        scanModel.clusters,
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

export class ContextImageScanModel {
  constructor(
    public scanId: string, // The scan ID we were generated for
    public scanTitle: string, // Title as displayed on dataset tile
    public imageName: string, // The image we were generated for (our points are relative to this image!)
    public beamLocVersion: number, // Versioning of the source beam ijs
    public clusters: PointCluster[],
    public scanPoints: ScanPoint[], // The actual scan points
    public scanPointPolygons: ScanPointPolygon[], // Scan points can be rendered as polygons which touch neighbours
    public footprint: HullPoint[][], // Footprint of scan points relative to the image
    public contextPixelsTommConversion: number, // Conversion ratio of image pixels -> mm, -1 if unknown
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

  // Show the confidence of the MIST ROI as opacity in the map layer
  showROIConfidence: boolean = true;

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
      // if (!from.raw?.image && from.raw?.rgbuSourceImage && from.drawModel.image) {
      //   this.image = from.drawModel.image;
      // } else {
      this.image = from.raw?.image || null;
      //}
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
          scanMdl.scanTitle,
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
              const colourScaleRangeId = `${layerMap.expressionId}-${c}`;
              let range = from.colourScaleDisplayValueRanges.get(colourScaleRangeId);
              if (!range?.isValid()) {
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
                // BUG: points are getting flipped somehow... then once adjusted, getting marked as BELOW and thus "stuck" to the bottom of the scale?
                // Works correct on first load, getting inverted on save
                // pt.drawParams = new MapPointDrawParams(
                //   new RGBA(
                //     displayRanges[2].getAsPercentageOfRange(pt.values[0], true) * 255, 
                //     displayRanges[1].getAsPercentageOfRange(pt.values[1], true) * 255,
                //     displayRanges[0].getAsPercentageOfRange(pt.values[2], true) * 255,
                //     255 * layerMap.opacity
                //   ),
                //   MapPointState.IN_RANGE,
                //   MapPointShape.POLYGON
                // );
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

      // Only do this if we have regions, they may not have loaded yet so we just write a bunch of errors out
      if (from.getRegions().length > 0) {
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
      }

      if (toWait$.length <= 0) {
        //console.warn("Return EMPTY2");
        observer.next();
        observer.complete();
        return;
      }

      forkJoin(toWait$).subscribe((value: ContextImageRegionLayer[]) => {
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
      if (this.showROIConfidence && roi.roi.isMIST && pmc !== undefined) {
        let mistOpacity = roi.roi?.mistROIItem?.pmcConfidenceMap[pmc];
        if (mistOpacity !== undefined) {
          locOpacity = mistOpacity;
        }

        if (roi.roi.mistROIItem?.formula) {
          roiLayer.customTooltip = roi.roi.mistROIItem.formula;
        }
      }

      roiLayer.polygons.push(new RegionDisplayPolygon(scanMdl.scanPointPolygons[locIdx].points, [], locOpacity));
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
