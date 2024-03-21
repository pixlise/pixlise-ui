import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject, combineLatest, concatMap, map, shareReplay, switchMap } from "rxjs";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanBeamLocationsResp, ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import { MinMax } from "src/app/models/BasicTypes";
import { ImageBeamLocationsReq, ImageBeamLocationsResp } from "src/app/generated-protos/image-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { Coordinate2D } from "src/app/generated-protos/image-beam-location";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { ColourRamp } from "src/app/utils/colours";
import { ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { ContextImageScanModelGenerator } from "../widgets/context-image/context-image-scan-model-generator";
import { DataSourceParams, RegionDataResults, WidgetDataService } from "../../pixlisecore/pixlisecore.module";
import { ContextImageMapLayer, MapPoint, getDrawParamsForRawValue } from "../models/map-layer";
import { ContextImageModelLoadedData, ContextImageScanModel } from "../widgets/context-image/context-image-model";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { ExpressionGroupGetReq, ExpressionGroupGetResp } from "src/app/generated-protos/expression-group-msgs";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ContextImageItemTransform } from "../image-viewers.module";
import { Point } from "src/app/models/Geometry";
import { WidgetError } from "../../pixlisecore/services/widget-data.service";

export type SyncedTransform = {
  scale: Point;
  pan: Point;
};

@Injectable({
  providedIn: "root",
})
export class ContextImageDataService {
  private _contextModelDataMap = new Map<string, Observable<ContextImageModelLoadedData>>();

  private _syncedTransform$: BehaviorSubject<Record<string, SyncedTransform>> = new BehaviorSubject({});

  constructor(
    protected _cachedDataService: APICachedDataService,
    protected _widgetDataService: WidgetDataService,
    protected _endpointsService: APIEndpointsService
  ) {}

  get syncedTransform$(): BehaviorSubject<Record<string, SyncedTransform>> {
    return this._syncedTransform$;
  }

  syncTransformForId(id: string, transform: SyncedTransform) {
    const current = this._syncedTransform$.value;
    current[id] = transform;
    this._syncedTransform$.next(current);
  }

  unsyncTransformForId(id: string) {
    const current = this._syncedTransform$.value;
    delete current[id];
    this._syncedTransform$.next(current);
  }

  clearSyncedTransforms() {
    this._syncedTransform$.next({});
  }

  getModelData(imageName: string, widgetId: string): Observable<ContextImageModelLoadedData> {
    // Have to include the widget ID to prevent shallow references
    const cacheId = `${imageName}-${widgetId}`;
    let result = this._contextModelDataMap.get(cacheId);
    if (result === undefined) {
      result = this._contextModelDataMap.get(imageName);
      if (result) {
        // We have a result, but it's not for this widget, so we need to clone it
        result = result.pipe(
          map((mdl: ContextImageModelLoadedData) => {
            return mdl.copy();
          })
        );
      } else {
        // Have to request it!
        result = this.fetchModelData(imageName).pipe(shareReplay(1));

        // Copy with imageName as key so we can shortcut the request next time, but keep response unique
        this._contextModelDataMap.set(imageName, result);
      }

      // Add it to the map too so a subsequent request will get this
      this._contextModelDataMap.set(cacheId, result);
    }

    return result;
  }

  getLayerModel(
    scanId: string,
    expressionId: string,
    quantId: string,
    roiId: string,
    colourRamp: ColourRamp,
    pmcToIndexLookup: Map<number, number>
  ): Observable<ContextImageMapLayer> {
    // If we're dealing with an expression group, we need to load the group first and run each expression in the group
    if (!DataExpressionId.isExpressionGroupId(expressionId)) {
      // It's just a simple layer, load it
      return this.getExpressionLayerModel(scanId, expressionId, quantId, roiId, colourRamp, pmcToIndexLookup);
    } else {
      // Load the expression group first, run the first 3 expressions
      return this.getExpressionGroupModel(scanId, expressionId, quantId, roiId, colourRamp, pmcToIndexLookup);
    }
  }

  private getExpressionLayerModel(
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
        return this.processQueryResults(results, scanId, expressionId, quantId, roiId, query, colourRamp, pmcToIndexLookup);
      }),
      shareReplay(1)
    );
  }

  private getExpressionGroupModel(
    scanId: string,
    expressionId: string,
    quantId: string,
    roiId: string,
    colourRamp: ColourRamp,
    pmcToIndexLookup: Map<number, number>
  ): Observable<ContextImageMapLayer> {
    return this._cachedDataService.getExpressionGroup(ExpressionGroupGetReq.create({ id: expressionId })).pipe(
      concatMap((resp: ExpressionGroupGetResp) => {
        if (!resp.group) {
          throw new Error("Failed to query expression group: " + expressionId);
        }

        if (resp.group.groupItems.length != 3) {
          throw new Error("Can only add expression group containing 3 items to context image");
        }

        const query: DataSourceParams[] = [];
        for (const groupMember of resp.group.groupItems) {
          query.push(new DataSourceParams(scanId, groupMember.expressionId, quantId, roiId));
        }

        return this._widgetDataService.getData(query).pipe(
          map((results: RegionDataResults) => {
            return this.processQueryResults(results, scanId, expressionId, quantId, roiId, query, colourRamp, pmcToIndexLookup);
          }),
          shareReplay(1)
        );
      })
    );
  }

  private processQueryResults(
    results: RegionDataResults,
    scanId: string,
    expressionId: string, // NOTE: this may be the Expression Group ID! Query contains the individual actual expression IDs
    quantId: string,
    roiId: string,
    query: DataSourceParams[],
    colourRamp: ColourRamp,
    pmcToIndexLookup: Map<number, number>
  ): ContextImageMapLayer {
    if (results.error) {
      throw new Error(results.error);
    }

    if (results.queryResults.length != query.length) {
      throw new Error(`processQueryResults: expected ${query.length} results, received ${results.queryResults.length}`);
    }

    const valueRanges: MinMax[] = [];
    const pts: MapPoint[] = [];
    const subExpressionNames: string[] = [];
    let subExpressionShading: ColourRamp[] = [colourRamp];
    const isBinary: boolean[] = [];

    // If we have 3 query results, assume RGB colouring
    if (results.queryResults.length == 3) {
      subExpressionShading = [ColourRamp.SHADE_MONO_FULL_RED, ColourRamp.SHADE_MONO_FULL_GREEN, ColourRamp.SHADE_MONO_FULL_BLUE];
    }

    for (let c = 0; c < results.queryResults.length; c++) {
      const result = results.queryResults[c];
      const expr = result.expression?.name ? `${result.expression?.name} (${expressionId})` : `id=${expressionId}`;
      if (result.error) {
        throw new WidgetError(`processQueryResults: expression ${expr} had error: ${result.error}`, result.error.description);
      }

      if (c > 0 && results.queryResults[0].values.values.length != result.values.values.length) {
        throw new Error(
          `processQueryResults: expression ${expr} results differed in length, ${results.queryResults[0].values.values.length} vs ${result.values.values.length}`
        );
      }

      valueRanges.push(result.values.valueRange);
      isBinary.push(result.values.isBinary);
      subExpressionNames.push(result.expression?.name || result.query.exprId);

      // First run, we create the points!
      for (let i = 0; i < result.values.values.length; i++) {
        const item = result.values.values[i];
        const idx = pmcToIndexLookup.get(item.pmc);

        if (idx !== undefined) {
          if (c == 0) {
            const drawParams = getDrawParamsForRawValue(colourRamp, item.value, results.queryResults[0].values.valueRange);
            pts.push(new MapPoint(item.pmc, idx, [item.value], drawParams));
          } else {
            if (pts[i].scanEntryId == item.pmc && pts[i].scanEntryIndex == idx) {
              pts[i].values.push(item.value);
            } else {
              throw new Error(`processQueryResults: expression ${expr} value ${i} of ${result.expression?.id || "?"} had non-matching PMC/index`);
            }
          }
        } else {
          throw new Error(`processQueryResults: expression ${expr} PMC ${item.pmc} doesn't exist`);
        }
      }
    }

    const layer = new ContextImageMapLayer(
      scanId,
      expressionId,
      quantId,
      roiId,
      false,
      results.queryResults[0].expression?.name || expressionId,
      1, // TODO: Map opacity
      colourRamp,
      subExpressionNames,
      subExpressionShading,
      pts,
      valueRanges,
      isBinary
    );
    return layer;
  }

  private fetchModelData(imagePath: string): Observable<ContextImageModelLoadedData> {
    // First, get the image metadata so we know what image to query beam locations for (uploaded images can reference other images!)
    return this._cachedDataService.getImageMeta(ImageGetReq.create({ imageName: imagePath })).pipe(
      concatMap((imgResp: ImageGetResp) => {
        // If this is a "matched" image, we should have a file name to request beam locations for, otherwise use the same file name
        if (!imgResp.image) {
          throw new Error("No image returned for: " + imagePath);
        }

        const beamFileName = imgResp.image.matchInfo?.beamImageFileName || imagePath;
        return this._cachedDataService.getImageBeamLocations(ImageBeamLocationsReq.create({ imageName: beamFileName })).pipe(
          concatMap((imgBeamResp: ImageBeamLocationsResp) => {
            if (!imgBeamResp.locations) {
              throw new Error("No image beam locations returned for: " + imagePath);
            }

            if (imgBeamResp.locations.imageName != beamFileName) {
              throw new Error(`Expected beams for image: ${beamFileName} but received for image: ${imgBeamResp.locations.imageName}`);
            }

            // We want the image and scan-specific draw models here
            const requests: Observable<HTMLImageElement | RGBUImage | ContextImageScanModel>[] = [];

            if (imgResp.image!.purpose == ScanImagePurpose.SIP_MULTICHANNEL) {
              // We use a different function to request multi-channel TIF images, because we will have to process it further
              // to get a visible image
              requests.push(this._endpointsService.loadRGBUImageTIF(imgResp.image!.imagePath));
            } else {
              // Simply load the image for displaying
              requests.push(this._endpointsService.loadImageForPath(imgResp.image!.imagePath));
            }

            const beamsForScan = new Map<string, Coordinate2D[]>();
            for (const locs of imgBeamResp.locations.locationPerScan) {
              beamsForScan.set(locs.scanId, locs.locations);
            }

            for (const scanId of imgResp.image!.associatedScanIds) {
              // There should be beam locations for each of these associated images, if not, error!
              const beamIJs = beamsForScan.get(scanId);
              if (!beamIJs) {
                throw new Error(`Image associated scan: ${scanId} has no beam locations`);
              }

              requests.push(this.buildScanModel(scanId, imagePath, beamIJs));
            }

            // Load the image
            return combineLatest(requests).pipe(
              map(results => {
                let displayImage: HTMLImageElement | null = null;
                let rgbuImage: RGBUImage | null = null;

                if (imgResp.image!.purpose == ScanImagePurpose.SIP_MULTICHANNEL) {
                  rgbuImage = results[0] as RGBUImage;
                } else {
                  displayImage = results[0] as HTMLImageElement;
                }

                // Now read each scan-specific model and store it
                const scanModels = new Map<string, ContextImageScanModel>();
                for (let c = 1; c < results.length; c++) {
                  const scanMdl = results[c] as ContextImageScanModel;
                  scanModels.set(scanMdl.scanId, scanMdl);
                }

                let imageTransform: ContextImageItemTransform | null = null;
                if (imgResp.image?.matchInfo) {
                  imageTransform = new ContextImageItemTransform(
                    imgResp.image.matchInfo.xOffset,
                    imgResp.image.matchInfo.yOffset,
                    imgResp.image.matchInfo.xScale,
                    imgResp.image.matchInfo.yScale
                  );
                }

                return new ContextImageModelLoadedData(displayImage, imageTransform, scanModels, rgbuImage);
              })
            );
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
          searchFilters: { scanId: scanId },
        })
      )
      .pipe(
        switchMap((scanListResp: ScanListResp) => {
          if (!scanListResp.scans || scanListResp.scans.length <= 0) {
            throw new Error(`Failed to retrieve scan: ${scanId}`);
          }
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
