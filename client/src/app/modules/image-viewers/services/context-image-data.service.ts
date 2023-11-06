import { Injectable } from "@angular/core";
import { Observable, combineLatest, concatMap, map, shareReplay, switchMap } from "rxjs";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanBeamLocationsResp, ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import { MinMax } from "src/app/models/BasicTypes";
import { ImageBeamLocationsReq, ImageBeamLocationsResp } from "src/app/generated-protos/image-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { Coordinate2D } from "src/app/generated-protos/image-beam-location";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { ContextImageScanModelGenerator } from "../widgets/context-image/context-image-scan-model-generator";
import { DataSourceParams, RegionDataResults, WidgetDataService } from "../../pixlisecore/pixlisecore.module";
import { ContextImageMapLayer, MapPoint, MapPointDrawParams, MapPointShape, MapPointState, getDrawParamsForRawValue } from "../models/map-layer";
import { ContextImageModelLoadedData, ContextImageScanModel } from "../widgets/context-image/context-image-model";

@Injectable({
  providedIn: "root",
})
export class ContextImageDataService {
  private _contextModelDataMap = new Map<string, Observable<ContextImageModelLoadedData>>();

  constructor(
    private _cachedDataService: APICachedDataService,
    private _widgetDataService: WidgetDataService,
    private _endpointsService: APIEndpointsService
  ) {}

  getModelData(imageName: string): Observable<ContextImageModelLoadedData> {
    const cacheId = imageName;

    let result = this._contextModelDataMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this.fetchModelData(imageName).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._contextModelDataMap.set(cacheId, result);
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
            const drawParams = getDrawParamsForRawValue(colourRamp, item.value, results.queryResults[0].values.valueRange);
            pts.push(new MapPoint(item.pmc, idx, item.value, drawParams));
          }
        }

        const layer = new ContextImageMapLayer(
          scanId,
          expressionId,
          quantId,
          roiId,
          false,
          results.queryResults[0].expression?.name || expressionId,
          pts,
          results.queryResults[0].values.valueRange,
          results.queryResults[0].values.isBinary,
          1, // TODO: Map opacity
          colourRamp
        );
        return layer;
      }),
      shareReplay(1)
    );
  }

  private fetchModelData(imageName: string): Observable<ContextImageModelLoadedData> {
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

          requests.push(this.buildScanModel(scanId, imageName, beamIJs));
        }

        // Load the image
        return combineLatest(requests).pipe(
          map(results => {
            const image = results[0] as HTMLImageElement;

            // Now read each scan-specific model and store it
            const scanModels = new Map<string, ContextImageScanModel>();
            for (let c = 1; c < results.length; c++) {
              const scanMdl = results[c] as ContextImageScanModel;
              scanModels.set(scanMdl.scanId, scanMdl);
            }

            return new ContextImageModelLoadedData(image, null, scanModels, null, null);
          })
        );
      })
    );
  }

  private buildScanModel(scanId: string, imageName: string, beamIJs: Coordinate2D[]): Observable<ContextImageScanModel> {
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

              if (!scanListResp.scans || scanListResp.scans.length != 1 || !scanListResp.scans[0]) {
                throw new Error(`Failed to get scan summary for ${scanId}`);
              }

              if (!detConfResp.config) {
                throw new Error(`Failed to get detector config: ${scanListResp.scans[0].instrumentConfig}`);
              }

              // Set beam data (this reads beams & turns it into scan points, polygons for each point and calculates a footprint)
              const gen = new ContextImageScanModelGenerator();
              return gen.processBeamData(imageName, scanListResp.scans[0], scanEntryResp.entries, beamResp.beamLocations, beamIJs, detConfResp);
            }),
            shareReplay(1)
          );
        })
      );
  }
}
