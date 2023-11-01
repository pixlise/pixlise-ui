import { Injectable } from "@angular/core";
import { ContextImageDrawModel, ContextImageScanDrawModel } from "../models/context-image-draw-model";
import { Observable, combineLatest, concatMap, map, mergeMap, shareReplay, switchMap, throwError } from "rxjs";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanBeamLocationsResp, ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import {
  Point,
  Rect,
  addVectors,
  getRotationMatrix,
  getVectorBetweenPoints,
  getVectorDotProduct,
  getVectorLength,
  normalizeVector,
  pointByMatrix,
  subtractVectors,
  vectorsEqual,
} from "src/app/models/Geometry";
import { radToDeg } from "src/app/utils/utils";
import { Footprint, HullPoint } from "../models/footprint";
import { MinMax } from "src/app/models/BasicTypes";
import { ScanPoint } from "../models/scan-point";
import { ImageBeamLocationsReq, ImageBeamLocationsResp } from "src/app/generated-protos/image-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { Coordinate3D } from "src/app/generated-protos/scan-beam-location";
import { Coordinate2D } from "src/app/generated-protos/image-beam-location";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ScanInstrument } from "src/app/generated-protos/scan";
import QuickHull from "quickhull";
import Voronoi from "voronoi";
import polygonClipping, { MultiPolygon, Polygon } from "polygon-clipping";
import { DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { convertLocationComponentToPixelPosition } from "../widgets/context-image/context-image-model";
import { DataSourceParams, RegionDataResults, WidgetDataService } from "../../pixlisecore/pixlisecore.module";
import { ContextImageMapLayer, MapPoint, MapPointDrawParams, MapPointShape, MapPointState } from "../models/map-layer";

class PointCluster {
  constructor(
    public locIdxs: number[],
    public pointDistance: number,
    public footprintPoints: HullPoint[],
    public angleRadiansToContextImage: number
  ) {}
}

@Injectable({
  providedIn: "root",
})
export class ContextImageDrawModelService {
  private _contextModelMap = new Map<string, Observable<ContextImageDrawModel>>();

  constructor(
    private _cachedDataService: APICachedDataService,
    private _widgetDataService: WidgetDataService,
    private _endpointsService: APIEndpointsService
  ) {}

  getDrawModel(imageName: string): Observable<ContextImageDrawModel> {
    const cacheId = imageName;

    let result = this._contextModelMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this.makeDrawModel(imageName).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._contextModelMap.set(cacheId, result);
    }

    return result;
  }

  getRegionModel(roiId: string) {}

  getLayerModel(
    scanId: string,
    expressionId: string,
    quantId: string,
    roiId: string,
    colourRamp: ColourRamp,
    pmcToIndexLookup: Map<number, number>
  ): Observable<ContextImageMapLayer> {
    const query = [new DataSourceParams(scanId, expressionId, quantId, roiId)];
    return this._widgetDataService.getData(query).pipe(
      map((results: RegionDataResults) => {
        if (results.error) {
          throw new Error(results.error);
        }

        if (results.queryResults.length != query.length) {
          throw new Error(`getLayerModel: expected ${query.length} results, received ${results.queryResults.length}`);
        }

        if (results.queryResults[0].error) {
          throw new Error(`getLayerModel: expression ${results.queryResults[0].expression?.name} (${expressionId}) had error: ${results.queryResults[0].error}`);
        }

        const pts: MapPoint[] = [];
        for (const item of results.queryResults[0].values.values) {
          const idx = pmcToIndexLookup.get(item.pmc);
          if (idx !== undefined) {
            const drawParams = this.makeDrawParams(colourRamp, item.value, results.queryResults[0].values.valueRange);
            pts.push(new MapPoint(item.pmc, idx, item.value, drawParams));
          }
        }

        const layer = new ContextImageMapLayer(scanId, expressionId, quantId, roiId, pts, 1, colourRamp);
        return layer;
      }),
      shareReplay(1)
    );
  }

  private makeDrawParams(colourRamp: ColourRamp, rawValue: number, range: MinMax): MapPointDrawParams {
    // If we're outside the range, use the flat colours
    if (!isFinite(rawValue) || !range.isValid()) {
      return new MapPointDrawParams(RGBA.fromWithA(Colours.BLACK, 0.4), MapPointState.BELOW, MapPointShape.EX);
    } else if (rawValue < range.min!) {
      return new MapPointDrawParams(Colours.CONTEXT_BLUE, MapPointState.BELOW, MapPointShape.EX);
    } else if (rawValue > range.max!) {
      return new MapPointDrawParams(Colours.CONTEXT_PURPLE, MapPointState.ABOVE, MapPointShape.EX);
    }

    // Pick a colour based on where it is in the range between min-max.
    const pct = range.getAsPercentageOfRange(rawValue, true);

    // Return the colour to use
    return new MapPointDrawParams(Colours.sampleColourRamp(colourRamp, pct), MapPointState.IN_RANGE, MapPointShape.POLYGON);
  }

  private makeDrawModel(imageName: string): Observable<ContextImageDrawModel> {
    // First, get the image metadata so we know what scans it's associated with and its path, then download image and scan-related data
    return combineLatest([
      this._cachedDataService.getImageMeta(ImageGetReq.create({ imageName: imageName })),
      this._cachedDataService.getImageBeamLocations(ImageBeamLocationsReq.create({ imageName: imageName })),
    ]).pipe(
      concatMap((imgResps: (ImageGetResp | ImageBeamLocationsResp)[]) => {
        const imgResp = imgResps[0] as ImageGetResp;
        const imgBeamResp = imgResps[1] as ImageBeamLocationsResp;

        if (!imgResp.image) {
          throw new Error("No image returned for: " + imageName);
        }

        if (!imgBeamResp.locations) {
          throw new Error("No image beam locations returned for: " + imageName);
        }

        if (imgBeamResp.locations.imageName != imageName) {
          throw new Error(`Expected beams for image: ${imageName} but received for image: ${imgBeamResp.locations.imageName}`);
        }

        // We want the image and scan-specific draw models here
        const requests: any[] = [this._endpointsService.loadImageForPath(imgResp.image.path)];

        const beamsForScan = new Map<string, Coordinate2D[]>();
        for (const locs of imgBeamResp.locations.locationPerScan) {
          beamsForScan.set(locs.scanId, locs.locations);
        }

        for (const scanId of imgResp.image.associatedScanIds) {
          // There should be beam locations for each of these associated images, if not, error!
          const beamIJs = beamsForScan.get(scanId);
          if (!beamIJs) {
            throw new Error(`Image associated scan: ${scanId} has no beam locations`);
          }

          requests.push(this.buildScanDrawModel(scanId, imageName, beamIJs));
        }

        // Load the image
        return combineLatest(requests).pipe(
          map(results => {
            const mdl = new ContextImageDrawModel();
            mdl.image = results[0] as HTMLImageElement;

            // Now read each scan-specific draw model and store it
            for (let c = 1; c < results.length; c++) {
              const scanMdl = results[c] as ContextImageScanDrawModel;
              mdl.perScanDrawModel.set(scanMdl.scanId, scanMdl);
            }

            return mdl;
          })
        );
      })
    );
  }

  private buildScanDrawModel(scanId: string, imageName: string, beamIJs: Coordinate2D[]): Observable<ContextImageScanDrawModel> {
    // First request the scan summary so we have the detector to use
    return this._cachedDataService
      .getScanList(
        ScanListReq.create({
          searchFilters: { RTT: scanId },
        })
      )
      .pipe(
        switchMap((scanListResp: ScanListResp) => {
          // Now that we know the scan's detector, we can request the rest of the stuff we want
          const requests = [
            this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })),
            this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })),
            this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: scanListResp.scans[0].instrumentConfig })),
          ];

          return combineLatest(requests).pipe(
            map((results: (ScanBeamLocationsResp | ScanEntryResp | DetectorConfigResp | HTMLImageElement | ImageBeamLocationsResp)[]) => {
              const beamResp: ScanBeamLocationsResp = results[0] as ScanBeamLocationsResp;
              const scanEntryResp: ScanEntryResp = results[1] as ScanEntryResp;
              const detConfResp: DetectorConfigResp = results[2] as DetectorConfigResp;

              const mdl = new ContextImageScanDrawModel(scanId);

              if (scanListResp && scanEntryResp && beamResp) {
                if (!scanListResp.scans || scanListResp.scans.length != 1 || !scanListResp.scans[0]) {
                  throw new Error(`Failed to get scan summary for ${scanId}`);
                }

                if (!detConfResp.config) {
                  throw new Error(`Failed to get detector config: ${scanListResp.scans[0].instrumentConfig}`);
                }

                // Set beam data (this reads beams & turns it into scan points, polygons for each point and calculates a footprint)
                this.processBeamData(imageName, beamIJs, scanListResp, scanEntryResp, beamResp, detConfResp, mdl);
              }

              return mdl;
            }),
            shareReplay(1)
          );
        })
      );
  }

  private processBeamData(
    imageName: string,
    beamIJs: Coordinate2D[],
    scanListResp: ScanListResp,
    scanEntryResp: ScanEntryResp,
    beamResp: ScanBeamLocationsResp,
    detectorConfig: DetectorConfigResp | null,
    destMdl: ContextImageScanDrawModel
  ) {
    destMdl.mmBeamRadius = detectorConfig?.config?.mmBeamRadius || destMdl.mmBeamRadius;

    if (scanListResp.scans.length == 1 && scanEntryResp.entries.length > 0 && beamResp.beamLocations.length) {
      ContextImageDrawModelService.initLocationCachingForBeams(
        scanListResp.scans[0].instrument,
        scanEntryResp.entries,
        beamResp.beamLocations,
        beamIJs,
        imageName,
        destMdl
      );
    } /*else {
      ContextImageDrawModelService.initLocationCachingWithoutBeams();
      return;
    }*/

    if (destMdl.locationCount <= 0) {
      console.log("  Location data not found for loaded dataset, coord caching skipped");
      return;
    }

    ContextImageDrawModelService.findMinPointDistances(scanEntryResp.entries, beamResp.beamLocations, destMdl);

    const clusters = ContextImageDrawModelService.makePointClusters(destMdl.scanPoints);

    // Clear footprints, get from clusters as we process them
    const wholeFootprintHullPoints = [];

    // Allocate blank polygons for each...
    destMdl.scanPointPolygons = [];
    for (let c = 0; c < destMdl.scanPoints.length; c++) {
      destMdl.scanPointPolygons.push([]);
    }

    for (const cluster of clusters) {
      this.makeScanPointPolygons(cluster, destMdl.scanPoints, destMdl.scanPointPolygons);
      wholeFootprintHullPoints.push(cluster.footprintPoints);
    }

    if (wholeFootprintHullPoints.length > 0) {
      destMdl.experimentAngleRadiansOnContextImage = ContextImageDrawModelService.findExperimentAngle(wholeFootprintHullPoints[0]);
    }

    destMdl.footprint = new Footprint(wholeFootprintHullPoints, Colours.WHITE, Colours.BLACK);
  }

  private static initLocationCachingForBeams(
    detector: ScanInstrument,
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    beamIJs: Coordinate2D[],
    imageName: string,
    destMdl: ContextImageScanDrawModel
  ) {
    destMdl.scanPoints = [];
    destMdl.locationCount = 0;
    destMdl.locationsWithNormalSpectra = 0;

    const locPointXMinMax = new MinMax();
    const locPointYMinMax = new MinMax();
    const locPointZMinMax = new MinMax();

    // At this point, check that the arrays we have for all scan data have the same sizes
    // because the theory is that we can index across them
    if (scanEntries.length != beamLocations.length) {
      throw new Error(`ScanEntry length ${scanEntries.length} doesn't match beam location length ${beamLocations.length}`);
    }
    if (scanEntries.length != beamIJs.length) {
      throw new Error(`ScanEntry length ${scanEntries.length} doesn't match image beam location length ${beamIJs.length} for image: ${imageName}`);
    }

    // Loop through all the scan entries and build what we need
    let firstBeam = true;

    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];

      const beamXYZ = beamLocations[c];
      const imageIJ = beamIJs[c];
      let imageIJPoint: Point | null = null;
      if (scanEntry.location && beamXYZ && imageIJ) {
        imageIJPoint = new Point(imageIJ.i, imageIJ.j);

        // Expand the x,y,z bbox:
        locPointXMinMax.expand(beamXYZ.x);
        locPointYMinMax.expand(beamXYZ.y);
        locPointZMinMax.expand(beamXYZ.z);

        // And the i,j bbox
        // Not sure why this was rounded in past, but keeping this convention going forward until
        // a need arises to change it
        const roundedIJ = convertLocationComponentToPixelPosition(imageIJ.i, imageIJ.j);
        if (firstBeam) {
          destMdl.locationPointBBox = new Rect(roundedIJ.x, roundedIJ.y, 0, 0);
          firstBeam = false;
        } else {
          destMdl.locationPointBBox.expandToFitPoint(roundedIJ);
        }

        destMdl.locationCount++;
      }

      const scanPt = new ScanPoint(
        scanEntry.id,
        imageIJPoint,
        c,
        scanEntry.normalSpectra > 0,
        scanEntry.dwellSpectra > 0,
        scanEntry.pseudoIntensities,
        scanEntry.pseudoIntensities && scanEntry.normalSpectra == 0
      );
      destMdl.scanPoints.push(scanPt);

      if (scanEntry.dwellSpectra > 0 || scanEntry.normalSpectra > 0) {
        destMdl.locationsWithNormalSpectra++;
      }
    }

    if (destMdl.locationCount <= 0) {
      throw new Error("No location information found");
    }

    console.log(
      `  Location position relative to context image: (x,y)=${destMdl.locationPointBBox.x},${destMdl.locationPointBBox.y}, (w,h)=${destMdl.locationPointBBox.w},${destMdl.locationPointBBox.h}`
    );

    // store sizing
    destMdl.locationPointXSize = locPointXMinMax.getRange();
    destMdl.locationPointYSize = locPointYMinMax.getRange();
    destMdl.locationPointZSize = locPointZMinMax.getRange();

    console.log(`  Location data physical size X=${destMdl.locationPointXSize}, Y=${destMdl.locationPointYSize}, Z=${destMdl.locationPointZSize}`);

    // Work out what units we're in
    destMdl.beamUnitsInMeters = ContextImageDrawModelService.decideBeamUnitsIsMeters(detector, locPointZMinMax.max || 0);

    destMdl.contextPixelsTommConversion = ContextImageDrawModelService.calcImagePixelsToPhysicalmm(destMdl);
    console.log("  Conversion factor for image pixels to mm: " + destMdl.contextPixelsTommConversion);

    destMdl.pixelBeamRadius = destMdl.mmBeamRadius / destMdl.contextPixelsTommConversion;
  }
  /*
  private static initLocationCachingWithoutBeams() {
    console.log("  Location data not present in dataset - initialising as visual spectroscopy dataset");

    // We used to init the bounding box to be 0,0->1,1 but any code that uses this was not working (specifically
    // the colour selection tool which checks against the bbox as an early out).
    // Now we init to the size of the default image, which is most likely an MCC image. This way
    // all image pixels are considered to be in the "location" that's selectable

    let w = 1;
    let h = 1;

    const locPointXMinMax = new MinMax();
    const locPointYMinMax = new MinMax();
    const locPointZMinMax = new MinMax();

    if (this.defaultContextImageIdx >= 0 && this.defaultContextImageIdx < this.contextImages.length && this.contextImages[this.defaultContextImageIdx]) {
      if (this.contextImages[this.defaultContextImageIdx].rgbSourceImage) {
        w = this.contextImages[this.defaultContextImageIdx].rgbSourceImage.width;
        h = this.contextImages[this.defaultContextImageIdx].rgbSourceImage.height;
      } else if (this.contextImages[this.defaultContextImageIdx].rgbuSourceImage && this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r) {
        w = this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r.width;
        h = this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r.height;
      }
    }

    destMdl.locationPointBBox = new Rect(0, 0, w, h);

    locPointXMinMax.expand(0);
    locPointXMinMax.expand(w);

    locPointYMinMax.expand(0);
    locPointYMinMax.expand(h);

    locPointZMinMax.expand(0);
    locPointZMinMax.expand(1);
  }
*/
  // Sets some local stats about point coordinates:
  // locationDisplayPointRadius, minXYDistance_mm
  private static findMinPointDistances(scanEntries: ScanEntry[], beamLocations: Coordinate3D[], mdl: ContextImageScanDrawModel): void {
    if (mdl.locationCount <= 0) {
      throw new Error("findMinPointDistances with no location data");
    }

    const NumSamples = 100;

    // Randomly pick a few points, find the min distance to between any other point to that point
    // and then average this out
    const samples: number[] = [];
    const nearestDistanceToSamples: number[] = [];

    for (let c = 0; c < NumSamples; c++) {
      let sampleIdx = null;

      // Make sure it's got a location
      while (sampleIdx == null) {
        sampleIdx = Math.floor(Math.random() * (mdl.scanPoints.length - 1));
        if (mdl.scanPoints[sampleIdx].coord == null) {
          sampleIdx = null;
        }
      }

      samples.push(sampleIdx);
    }

    // Now loop through all and find the nearest point to each sample in distance-squared units
    const ExclusionBoxSize = (mdl.locationPointBBox.w + mdl.locationPointBBox.h) / 2 / 10;

    for (let c = 0; c < NumSamples; c++) {
      const sampleIdx = samples[c];
      const samplePt = mdl.scanPoints[sampleIdx].coord!;

      let nearestIdx = -1;
      let nearestDistSq = ExclusionBoxSize * ExclusionBoxSize;

      // Find the distance of the nearest point - we can exclude most of the points fast by bounding box
      let locIdx = 0;
      for (const locPt of mdl.scanPoints) {
        // Don't compare to itself, don't compare to PMCs without locations!
        if (locPt.coord && locIdx != sampleIdx) {
          const xDiff = Math.abs(samplePt.x - locPt.coord.x);
          const yDiff = Math.abs(samplePt.y - locPt.coord.y);

          // Could use ptWithinBox but then gotta calculate xDiff and yDiff anyway...

          if (xDiff < ExclusionBoxSize && yDiff < ExclusionBoxSize) {
            // Get the square distance
            const distSq = xDiff * xDiff + yDiff * yDiff;
            if (distSq < nearestDistSq) {
              nearestIdx = locIdx;
              nearestDistSq = distSq;
            }
          }
        }
        locIdx++;
      }

      if (nearestIdx >= 0) {
        nearestDistanceToSamples.push(Math.sqrt(nearestDistSq));
      }
    }

    // Now we have an array of nearest distances, average them and get to a single radius to use
    mdl.locationDisplayPointRadius = nearestDistanceToSamples.reduce((a, b) => a + b, 0) / nearestDistanceToSamples.length;

    // Increase it a bit, to make sure things are covered nicely
    mdl.locationDisplayPointRadius = mdl.locationDisplayPointRadius * 1.1;

    if (isNaN(mdl.locationDisplayPointRadius)) {
      mdl.locationDisplayPointRadius = 1;
    }

    console.log("  Generated locationDisplayPointRadius: " + mdl.locationDisplayPointRadius);

    // The above was done in image space (context image pixels, i/j coordinates). We now do the same in physical XYZ coordinates
    mdl.minXYDistance_mm = mdl.locationPointXSize + mdl.locationPointYSize + mdl.locationPointZSize;

    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];

      // We're only interested if there are spectra (or pseudo-intensities, as we may not have received the spectra yet)
      if (scanEntry.location && (scanEntry.normalSpectra > 0 || scanEntry.pseudoIntensities)) {
        const cPt = new Point(beamLocations[c].x, beamLocations[c].y);

        for (let i = c + 1; i < scanEntries.length; i++) {
          // We're only interested if there are spectra!
          if (scanEntries[i].location && (scanEntries[i].normalSpectra > 0 || scanEntries[i].pseudoIntensities)) {
            const iPt = new Point(beamLocations[i].x, beamLocations[i].y);

            const vec = getVectorBetweenPoints(cPt, iPt);

            const distSq = getVectorDotProduct(vec, vec);
            if (distSq > 0 && distSq < mdl.minXYDistance_mm) {
              mdl.minXYDistance_mm = distSq;
            }
          }
        }
      }

      mdl.minXYDistance_mm = Math.sqrt(mdl.minXYDistance_mm);

      // If we're in meters, convert
      if (mdl.beamUnitsInMeters) {
        mdl.minXYDistance_mm *= 1000.0;
      }
    }
  }

  private static decideBeamUnitsIsMeters(scanInstrument: ScanInstrument, locPointZMaxValue: number): boolean {
    // Units in the beam location file were converted from mm to meters around June 2020, the way to tell what
    // we're dealing with is by Z, as our standoff distance is always around 25mm, so in mm units this is > 1
    // and in m it's way < 1
    const beamInMeters = (scanInstrument == ScanInstrument.PIXL_FM || scanInstrument == ScanInstrument.PIXL_EM) && locPointZMaxValue < 1.0;
    if (beamInMeters) {
      console.log("  Beam location is in meters");
    } else {
      console.log("  Beam location is in mm");
    }
    return beamInMeters;
  }

  // Returns the conversion multiplier to go from context image pixels to physical units in mm (based on beam location)
  private static calcImagePixelsToPhysicalmm(mdl: ContextImageScanDrawModel): number {
    // We see the diagonal size of the location points bbox vs the widest X distance between points
    let mmConversion = Math.sqrt(
      (mdl.locationPointXSize * mdl.locationPointXSize + mdl.locationPointYSize * mdl.locationPointYSize) /
        (mdl.locationPointBBox.w * mdl.locationPointBBox.w + mdl.locationPointBBox.h * mdl.locationPointBBox.h)
    );

    if (mdl.beamUnitsInMeters) {
      mmConversion *= 1000.0;
    }

    return mmConversion;
  }

  // Returns the experiment angle in radians.
  // Can be called any time
  private static findExperimentAngle(footprintHullPoints: HullPoint[]): number {
    let experimentAngleRad = 0;

    if (footprintHullPoints.length <= 0) {
      console.log("  Experiment angle not checked, as no location data exists");
      return experimentAngleRad;
    }

    // Now that we have a hull, we can find the experiment angle. To do this we take the longest edge of the
    // hull and use the angle formed by that vs the X axis
    let longestVec: Point | null = null;
    let longestVecLength = 0;

    for (let c = 0; c < footprintHullPoints.length; c++) {
      let lastIdx = c - 1;
      if (lastIdx < 0) {
        lastIdx = footprintHullPoints.length - 1;
      }

      const vec = getVectorBetweenPoints(footprintHullPoints[lastIdx], footprintHullPoints[c]);
      const vecLen = getVectorLength(vec);
      if (longestVec == null || vecLen > longestVecLength) {
        longestVec = vec;
        longestVecLength = vecLen;
      }
    }

    if (!longestVec) {
      // Just return 0
      console.error("  findExperimentAngle failed, so using 0 degrees");
      return 0;
    }

    // Now find how many degrees its rotated relative to X axis
    const normalVec = normalizeVector(longestVec);

    // Calculate angle
    experimentAngleRad = Math.acos(getVectorDotProduct(new Point(0, -1), normalVec));

    if (normalVec.x < 0) {
      experimentAngleRad = Math.PI / 2 - experimentAngleRad;
    }

    // If the angle is near 90, 180, 270 or 360, set it to 0 so we don't
    // pointlessly do the rotation when drawing rectangles!
    let angleDeg = radToDeg(experimentAngleRad);

    // If it's near 90 increments, set to 0
    if (Math.abs(angleDeg) < 5 || Math.abs(angleDeg - 90) < 5 || Math.abs(angleDeg - 270) < 5 || Math.abs(angleDeg - 360) < 5) {
      angleDeg = 0;
      experimentAngleRad = 0;
    }

    return experimentAngleRad;
  }

  // Finds points that are clustered nearby and returns their location indexes
  // Currently the only place this really happens is the cal target scans where we
  // take several lines and grids with large jumps between them.
  // Because PIXL goes sequentially through PMCs, we just need to find when there
  // is a large gap between scan points
  private static makePointClusters(scanPoints: ScanPoint[]): PointCluster[] {
    // Loop through locations, if distance jump is significantly larger than last size, we
    // assume a new cluster of points has started
    let clusters: PointCluster[] = [new PointCluster([], 0, [], 0)];

    let lastIdx: number = -1;
    let lastDistance: number = -1;
    let distanceSum: number = 0;
    let nonZeroDistanceCount: number = 0;

    // We keep track of the angle at which the gap that broke the cluster went. This is so we
    // can detect the case where for eg breadboards are scanning in a Z shape, so every line
    // moves to the start of the previous line, hence there is a large (same angled) leap.
    // If this is the case, the special work-around is to just return the whole thing as one cluster.
    const clusterBreakAngleCosines: number[] = [];

    for (let locIdx = 0; locIdx < scanPoints.length; locIdx++) {
      if (!scanPoints[locIdx].coord || (!scanPoints[locIdx].hasNormalSpectra && !scanPoints[locIdx].hasPseudoIntensities)) {
        // No coord, won't have spectra either... ignore
        continue;
      }

      // If we've seen one already, do a distance compare
      if (lastIdx >= 0) {
        const vec = subtractVectors(scanPoints[lastIdx].coord!, scanPoints[locIdx].coord!);
        const dst = getVectorLength(vec);
        if (lastDistance > -1 && dst > (distanceSum / nonZeroDistanceCount) * 10) {
          // Save the point distance for the last cluster
          const lastCluster = clusters[clusters.length - 1];

          lastCluster.pointDistance = distanceSum;
          if (nonZeroDistanceCount > 0) {
            lastCluster.pointDistance /= nonZeroDistanceCount;
          }

          // Save the angle at which this break happened
          clusterBreakAngleCosines.push(getVectorDotProduct(normalizeVector(vec), new Point(1, 0)));

          // Start a new cluster!
          clusters.push(new PointCluster([], 0, [], 0));

          // Forget last distance, we need to discover a new one now
          lastDistance = -1;
          distanceSum = 0;
          nonZeroDistanceCount = 0;
        } else {
          if (dst > 0) {
            lastDistance = dst;

            distanceSum += dst;
            nonZeroDistanceCount++;
          }
        }
      }

      clusters[clusters.length - 1].locIdxs.push(locIdx);
      lastIdx = locIdx;
    }

    // Calculate distance for the last one
    if (clusters.length > 0) {
      const lastCluster = clusters[clusters.length - 1];

      lastCluster.pointDistance = distanceSum;
      if (nonZeroDistanceCount > 0) {
        lastCluster.pointDistance /= nonZeroDistanceCount;
      }
    }

    // If we find that the clusters are all broken in the same direction, we have to assume it's a scan done in a Z pattern, and we
    // don't want every single scan line to be a separate cluster, so here we check for that and if that's the case, we build one single
    // cluster for the whole thing
    if (clusterBreakAngleCosines.length > 0) {
      let similarAngleCount: number = 0;
      for (const angleCos of clusterBreakAngleCosines) {
        // We allow for some floating-point accuracy mess, but really they should be exactly equal
        if (Math.abs(angleCos - clusterBreakAngleCosines[0]) < 0.001) {
          similarAngleCount++;
        }
      }

      if (similarAngleCount >= clusterBreakAngleCosines.length) {
        // We are assuming this is a Z scan pattern, so we turn the whole thing into a single cluster
        const singleCluster: PointCluster = new PointCluster([], clusters[0].pointDistance, [], clusters[0].angleRadiansToContextImage);
        for (const cluster of clusters) {
          singleCluster.locIdxs.push(...cluster.locIdxs);
        }

        clusters = [singleCluster];
      }
    }

    // If we only have the 1 default cluster we added...
    if (clusters.length == 1 && clusters[0].locIdxs.length <= 0) {
      clusters = [];
    }

    // Calculate footprints for all clusters
    let c = 0;
    for (const cluster of clusters) {
      cluster.footprintPoints = ContextImageDrawModelService.makeConvexHull(cluster.locIdxs, scanPoints);
      cluster.angleRadiansToContextImage = ContextImageDrawModelService.findExperimentAngle(cluster.footprintPoints);

      cluster.footprintPoints = ContextImageDrawModelService.fattenFootprint(cluster.footprintPoints, cluster.pointDistance / 2, cluster.angleRadiansToContextImage);

      console.log(
        `  Point cluster ${c + 1} contains ${cluster.locIdxs.length} PMCs, ${cluster.footprintPoints.length} footprint points, ${radToDeg(
          cluster.angleRadiansToContextImage
        ).toFixed(3)} degrees rotated`
      );
      c++;
    }

    return clusters;
  }

  private static makeConvexHull(useLocIdxs: number[], scanPoints: ScanPoint[]): HullPoint[] {
    const hullPoints: HullPoint[] = [];
    for (const locIdx of useLocIdxs) {
      const loc = scanPoints[locIdx];

      if (loc && loc.coord && (loc.hasNormalSpectra || loc.hasPseudoIntensities)) {
        // normal spectra may not be down yet!
        hullPoints.push(new HullPoint(loc.coord.x, loc.coord.y, locIdx));
      }
    }

    // Find the hull
    const result = QuickHull(hullPoints);

    // Remove the last point (it's a duplicate of the first)
    result.splice(result.length - 1, 1);
    return result;
  }

  private static calcFootprintNormals(footprintHullPoints: HullPoint[]): void {
    if (footprintHullPoints.length <= 0) {
      console.log("  Footprint hull normals not calculated, no points exist");
      return;
    }

    // Calc normals so we can draw expanded
    const normals = [];
    for (let c = 0; c < footprintHullPoints.length; c++) {
      let nextPtIdx = c + 1;
      if (c == footprintHullPoints.length - 1) {
        nextPtIdx = 0;
      }

      const nextPt = footprintHullPoints[nextPtIdx];

      const lineVec = normalizeVector(getVectorBetweenPoints(footprintHullPoints[c], nextPt));
      normals.push(new Point(lineVec.y, -lineVec.x));
    }

    // Smooth them and save
    for (let c = 0; c < footprintHullPoints.length; c++) {
      let lastIdx = c - 1;
      if (lastIdx < 0) {
        lastIdx = footprintHullPoints.length - 1;
      }

      footprintHullPoints[c].normal = normalizeVector(addVectors(normals[c], normals[lastIdx]));
    }
  }

  private static fattenFootprint(footprintHullPoints: HullPoint[], enlargeBy: number, angleRad: number): HullPoint[] {
    if (footprintHullPoints.length <= 0) {
      console.warn("  Footprint hull not widened, no points exist");
      return [];
    }

    // If it's a line scan, we may have ended up with a hull that's basically 2 parallel lines (or close to it).
    // We want this to be expanded out, so at this point we take all hull points and find the hull of all of those points if
    // they were formed of a rect

    // Make rotated boxes for each point, then form the hull around it
    const centers: Point[] = [];
    for (const pt of footprintHullPoints) {
      centers.push(new Point(pt.x, pt.y));
    }

    const boxes = ContextImageDrawModelService.makeRotatedBoxes(centers, enlargeBy, angleRad);

    const fatHullPoints = [];

    let c = 0;
    for (const box of boxes) {
      for (const pt of box) {
        fatHullPoints.push(new HullPoint(pt.x, pt.y, footprintHullPoints[c].idx, footprintHullPoints[c].normal));
      }

      c++;
    }

    const result = QuickHull(fatHullPoints);

    // Remove the last point (it's a duplicate of the first)
    result.splice(result.length - 1, 1);

    ContextImageDrawModelService.calcFootprintNormals(result);

    /* METHOD WITHOUT RECTS:
      // Run through all normals and push the point out by that much
      let fatten = enlargeBy;
      for(let pt of footprintHullPoints)
      {
          pt.x += pt.normal.x*fatten;
          pt.y += pt.normal.y*fatten;
      }
*/
    return result;
  }

  private static makeRotatedBoxes(centers: Point[], halfSideLength: number, angleRad: number): Point[][] {
    // Calculate vectors to add to each center to form the box
    const xAddVec = new Point(halfSideLength, 0);
    const yAddVec = new Point(0, halfSideLength);

    // Rotate them by the experiment angle
    const rotM = getRotationMatrix(angleRad);

    const xAddRotatedVec = pointByMatrix(rotM, xAddVec);
    const yAddRotatedVec = pointByMatrix(rotM, yAddVec);

    // Calc the negative direction too
    const xSubRotatedVec = subtractVectors(new Point(0, 0), xAddRotatedVec);
    const ySubRotatedVec = subtractVectors(new Point(0, 0), yAddRotatedVec);

    const boxes: Point[][] = [];

    for (const center of centers) {
      const box: Point[] = [];

      // Calculate the 4 corners of the box around this center
      box.push(addVectors(addVectors(center, xAddRotatedVec), yAddRotatedVec));
      box.push(addVectors(addVectors(center, xSubRotatedVec), yAddRotatedVec));
      box.push(addVectors(addVectors(center, xSubRotatedVec), ySubRotatedVec));
      box.push(addVectors(addVectors(center, xAddRotatedVec), ySubRotatedVec));

      boxes.push(box);
    }

    return boxes;
  }

  private makeScanPointPolygons(cluster: PointCluster, scanPoints: ScanPoint[], scanPointPolygons: Point[][]) {
    const voronoi = new Voronoi();

    // Create a larger bbox to ensure all polygons generated extend past the hull
    let clusterBBox: Rect | null = null;

    const sites: { x: number; y: number; voronoiId?: number }[] = [];
    const locIdxs = [];

    let c = 0;
    for (const locIdx of cluster.locIdxs) {
      const loc = scanPoints[locIdx];

      if (loc && loc.coord && (loc.hasNormalSpectra || loc.hasPseudoIntensities)) {
        // normal spectra may not be down yet!
        const pt = new Point(loc.coord.x, loc.coord.y);
        if (!clusterBBox) {
          clusterBBox = new Rect(pt.x, pt.y, 0, 0);
        } else {
          clusterBBox.expandToFitPoint(pt);
        }

        sites.push(pt);
        locIdxs.push(locIdx);
      }
      c++;
    }

    if (!clusterBBox) {
      // haven't found valid points
      console.warn("No valid points for generating PMC polygons for: " + cluster.locIdxs.join(","));
      return;
    }

    const bboxExpand = 50;
    const bbox = { xl: clusterBBox.x - bboxExpand, xr: clusterBBox.maxX() + bboxExpand, yt: clusterBBox.y - bboxExpand, yb: clusterBBox.maxY() + bboxExpand }; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom

    const hullPoly: Polygon = [[]];
    for (const pt of cluster.footprintPoints) {
      hullPoly[0].push([pt.x, pt.y]);
    }

    const diagram = voronoi.compute(sites, bbox);

    // Sites now have voronoiID added, we add the polygons associated with this site to our returned polygon list
    for (c = 0; c < sites.length; c++) {
      const site = sites[c];
      const cell = diagram.cells[site.voronoiId];

      // Get the location index for this "site" and see if it's a member of our ROI
      const siteLocIdx = locIdxs[c];

      if (cell && siteLocIdx != undefined) {
        const halfedges = cell.halfedges;
        if (halfedges.length > 2) {
          let v = halfedges[0].getStartpoint();

          const polyPts = [];
          polyPts.push([v.x, v.y]);

          for (const halfedge of halfedges) {
            v = halfedge.getEndpoint();
            polyPts.push([v.x, v.y]);
          }

          // TESTING: no clipping
          //let clippedPolyPts = [[polyPts]];

          // TESTING: only clip against max poly, not footprint
          //let clippedPolyPts = ContextImageDrawModelService.clipAgainstLargestPolyAllowed([polyPts], this.locationPointCache[siteLocIdx], (cluster.pointDistance/2)*1.25, cluster.angleRadiansToContextImage);

          // Clip polygon against the hull
          const hullClippedPolyPts = polygonClipping.intersection([polyPts], hullPoly);

          // Also against the biggest polygon we want to allow
          const clippedPolyPts = ContextImageDrawModelService.clipAgainstLargestPolyAllowed(
            hullClippedPolyPts,
            scanPoints[siteLocIdx],
            (cluster.pointDistance / 2) * 1.25,
            ContextImageDrawModelService.getAngleForLocation(siteLocIdx, cluster.angleRadiansToContextImage, scanPoints)
          );

          // Now we convert it back to Points
          scanPointPolygons[siteLocIdx] = [];
          if (clippedPolyPts.length == 1 && clippedPolyPts[0].length == 1) {
            // NOTE: we don't add the last one, because it's a repeat of the first one
            for (let ptIdx = 0; ptIdx < clippedPolyPts[0][0].length - 1; ptIdx++) {
              const pt = clippedPolyPts[0][0][ptIdx];
              scanPointPolygons[siteLocIdx].push(new Point(pt[0], pt[1]));
            }
          }
        }
      }
    }
  }

  private static getAngleForLocation(locIdx: number, clusterAngleRad: number, scanPoints: ScanPoint[]): number {
    // Get the 2 points around it. If this isn't possible just use the cluster angle
    if (locIdx <= 0 || locIdx >= scanPoints.length - 1) {
      return clusterAngleRad;
    }

    const pt = scanPoints[locIdx].coord;

    const preIdx = locIdx - 1;
    const postIdx = locIdx + 1;

    // If they have a coordinate...
    const prePt = scanPoints[preIdx].coord;
    const postPt = scanPoints[postIdx].coord;

    if (!pt || !prePt || !postPt) {
      return clusterAngleRad;
    }

    // If somehow we ended up with the same points, we can't generate an angle here...
    // Found this issue with Baker Springs test dataset (from breadboard)
    if (vectorsEqual(prePt, pt) || vectorsEqual(pt, postPt)) {
      console.warn("Found equivalent PMC coordinates, failed to generate angle. PMCs around: " + scanPoints[locIdx].PMC);
      return clusterAngleRad;
    }

    // Find the vectors, add them
    const preVecN = normalizeVector(getVectorBetweenPoints(prePt, pt));
    const postVecN = normalizeVector(getVectorBetweenPoints(pt, postPt));

    // If the angle between them is > 60 degrees...
    const angleAroundPt = Math.acos(getVectorDotProduct(preVecN, postVecN));
    if (angleAroundPt > Math.PI / 3) {
      // We assume we're at a turning point and we'll just use the overall angle
      return clusterAngleRad;
    }

    const vecN = normalizeVector(addVectors(preVecN, postVecN));

    // Get its angle to axis
    const compareAxis = new Point(0, vecN.x < 0 ? 1 : -1);
    const result = Math.acos(getVectorDotProduct(compareAxis, vecN));

    if (!isFinite(result)) {
      console.error("NaN in getAngleForLocation");
      return clusterAngleRad;
    }

    return result;
  }

  private static clipAgainstLargestPolyAllowed(polyPts: MultiPolygon, loc: ScanPoint, maxBoxSize: number, clusterAngleRad: number): MultiPolygon {
    // Generate the largest allowable polygon for the point in question
    if (!loc.coord) {
      return [];
    }

    const boxes = ContextImageDrawModelService.makeRotatedBoxes([loc.coord], maxBoxSize, clusterAngleRad);
    if (boxes.length != 1 && boxes[0].length != 4) {
      return [];
    }

    const boxPoly: Polygon = [[]];
    for (const pt of boxes[0]) {
      boxPoly[0].push([pt.x, pt.y]);
    }

    try {
      // Do the clip
      const result = polygonClipping.intersection(polyPts, boxPoly);
      return result;
    } catch (err) {
      console.error(err);
    }
    return [];
  }
}
