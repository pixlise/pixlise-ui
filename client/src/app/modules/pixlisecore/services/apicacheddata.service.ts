import { Injectable } from "@angular/core";
import { Observable, shareReplay, map } from "rxjs";
import { APIDataService } from "./apidata.service";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryMetadataReq, ScanEntryMetadataResp } from "src/app/generated-protos/scan-entry-metadata-msgs";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { DetectedDiffractionPeaksReq, DetectedDiffractionPeaksResp } from "src/app/generated-protos/diffraction-detected-peak-msgs";
import { ScanListReq, ScanListResp, ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "src/app/generated-protos/scan-msgs";
import { DiffractionPeakManualListReq, DiffractionPeakManualListResp } from "src/app/generated-protos/diffraction-manual-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { ExpressionGetReq, ExpressionGetResp } from "src/app/generated-protos/expression-msgs";
import { DataModuleGetReq, DataModuleGetResp } from "src/app/generated-protos/module-msgs";

import { decodeIndexList, decompressZeroRunLengthEncoding } from "src/app/utils/utils";
import { DetectorConfigListReq, DetectorConfigListResp, DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { ImageGetDefaultReq, ImageGetDefaultResp, ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { ImageBeamLocationsReq, ImageBeamLocationsResp } from "src/app/generated-protos/image-beam-location-msgs";

// Provides a way to get the same responses we'd get from the API but will only send out one request
// and all subsequent subscribers will be given a shared replay of the response that comes back.
// Originally intended to use local storage for this, but here we use the observable mechanism. To
// cache these locally longer-term we could still reach out from here to the local storage service!

@Injectable({
  providedIn: "root",
})
export class APICachedDataService {
  // With these, we request the whole thing, so they're easy to cache for future...
  private _quantReqMap = new Map<string, Observable<QuantGetResp>>();
  private _spectrumReqMap = new Map<string, Observable<SpectrumResp>>();
  private _scanMetaLabelsReqMap = new Map<string, Observable<ScanMetaLabelsAndTypesResp>>();
  private _manualDiffractionReqMap = new Map<string, Observable<DiffractionPeakManualListResp>>();
  private _scanEntryMap = new Map<string, Observable<ScanEntryResp>>();

  // With these we request parts of the full data (based on scan entry ids)
  private _scanBeamLocationReqMap = new Map<string, Observable<ScanBeamLocationsResp>>();
  private _scanEntryMetaReqMap = new Map<string, Observable<ScanEntryMetadataResp>>();
  private _pseudoIntensityReqMap = new Map<string, Observable<PseudoIntensityResp>>();
  private _detectedDiffractionReqMap = new Map<string, Observable<DetectedDiffractionPeaksResp>>();
  private _scanListReqMap = new Map<string, Observable<ScanListResp>>();
  private _detectorConfigReqMap = new Map<string, Observable<DetectorConfigResp>>();
  private _detectorConfigListReq: Observable<DetectorConfigListResp> | null = null;
  private _defaultImageReqMap = new Map<string, Observable<ImageGetDefaultResp>>();
  private _imageBeamLocationsReqMap = new Map<string, Observable<ImageBeamLocationsResp>>();
  private _imageReqMap = new Map<string, Observable<ImageGetResp>>();

  // Non-scan related
  private _regionOfInterestGetReqMap = new Map<string, Observable<RegionOfInterestGetResp>>();
  private _expressionReqMap = new Map<string, Observable<ExpressionGetResp>>();
  private _dataModuleReqMap = new Map<string, Observable<DataModuleGetResp>>();

  constructor(private _dataService: APIDataService) {}

  getQuant(req: QuantGetReq): Observable<QuantGetResp> {
    const cacheId = JSON.stringify(QuantGetReq.toJSON(req));
    let result = this._quantReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendQuantGetRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._quantReqMap.set(cacheId, result);
    }

    return result;
  }

  getSpectrum(req: SpectrumReq): Observable<SpectrumResp> {
    const cacheId = JSON.stringify(SpectrumReq.toJSON(req));
    let result = this._spectrumReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendSpectrumRequest(req).pipe(
        map((resp: SpectrumResp) => {
          this.decompressSpectra(resp);
          return resp;
        }),
        shareReplay(1)
      );

      // Add it to the map too so a subsequent request will get this
      this._spectrumReqMap.set(cacheId, result);
    }

    return result;
  }

  private decompressSpectra(spectrumData: SpectrumResp) {
    // We get spectra with runs of 0's run-length encoded. Here we decode them to have the full spectrum channel list in memory
    // and this way we also don't double up on storage in memory
    for (const loc of spectrumData.spectraPerLocation) {
      for (const spectrum of loc.spectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }

    if (spectrumData.bulkSpectra) {
      for (const spectrum of spectrumData.bulkSpectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }

    if (spectrumData.maxSpectra) {
      for (const spectrum of spectrumData.maxSpectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }
  }

  getScanMetaLabelsAndTypes(req: ScanMetaLabelsAndTypesReq): Observable<ScanMetaLabelsAndTypesResp> {
    const cacheId = JSON.stringify(ScanMetaLabelsAndTypesReq.toJSON(req));
    let result = this._scanMetaLabelsReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendScanMetaLabelsAndTypesRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._scanMetaLabelsReqMap.set(cacheId, result);
    }

    return result;
  }

  getDiffractionPeakManualList(req: DiffractionPeakManualListReq): Observable<DiffractionPeakManualListResp> {
    const cacheId = JSON.stringify(DiffractionPeakManualListReq.toJSON(req));
    let result = this._manualDiffractionReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendDiffractionPeakManualListRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._manualDiffractionReqMap.set(cacheId, result);
    }

    return result;
  }

  getScanEntry(req: ScanEntryReq): Observable<ScanEntryResp> {
    const cacheId = JSON.stringify(ScanEntryReq.toJSON(req));
    let result = this._scanEntryMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendScanEntryRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._scanEntryMap.set(cacheId, result);
    }

    return result;
  }

  getScanBeamLocations(req: ScanBeamLocationsReq): Observable<ScanBeamLocationsResp> {
    const cacheId = JSON.stringify(ScanBeamLocationsReq.toJSON(req));
    let result = this._scanBeamLocationReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendScanBeamLocationsRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._scanBeamLocationReqMap.set(cacheId, result);
    }

    return result;
  }

  getScanEntryMetadata(req: ScanEntryMetadataReq): Observable<ScanEntryMetadataResp> {
    const cacheId = JSON.stringify(ScanEntryMetadataReq.toJSON(req));
    let result = this._scanEntryMetaReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendScanEntryMetadataRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._scanEntryMetaReqMap.set(cacheId, result);
    }

    return result;
  }

  getPseudoIntensity(req: PseudoIntensityReq): Observable<PseudoIntensityResp> {
    const cacheId = JSON.stringify(PseudoIntensityReq.toJSON(req));
    let result = this._pseudoIntensityReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendPseudoIntensityRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._pseudoIntensityReqMap.set(cacheId, result);
    }

    return result;
  }

  getDetectedDiffractionPeaks(req: DetectedDiffractionPeaksReq): Observable<DetectedDiffractionPeaksResp> {
    const cacheId = JSON.stringify(DetectedDiffractionPeaksReq.toJSON(req));
    let result = this._detectedDiffractionReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendDetectedDiffractionPeaksRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._detectedDiffractionReqMap.set(cacheId, result);
    }

    return result;
  }

  getRegionOfInterest(req: RegionOfInterestGetReq): Observable<RegionOfInterestGetResp> {
    const cacheId = JSON.stringify(RegionOfInterestGetReq.toJSON(req));
    let result = this._regionOfInterestGetReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendRegionOfInterestGetRequest(req).pipe(
        map((resp: RegionOfInterestGetResp) => {
          if (resp.regionOfInterest) {
            resp.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(resp.regionOfInterest.scanEntryIndexesEncoded);
          }
          return resp;
        }),
        shareReplay(1)
      );

      // Add it to the map too so a subsequent request will get this
      this._regionOfInterestGetReqMap.set(cacheId, result);
    }

    return result;
  }

  getExpression(req: ExpressionGetReq): Observable<ExpressionGetResp> {
    const cacheId = JSON.stringify(ExpressionGetReq.toJSON(req));
    let result = this._expressionReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendExpressionGetRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._expressionReqMap.set(cacheId, result);
    }

    return result;
  }

  cacheExpression(req: ExpressionGetReq, resp: ExpressionGetResp) {
    const cacheId = JSON.stringify(ExpressionGetReq.toJSON(req));
    this._expressionReqMap.set(cacheId, new Observable<ExpressionGetResp>(subscriber => subscriber.next(resp)));
  }

  getDataModule(req: DataModuleGetReq): Observable<DataModuleGetResp> {
    const cacheId = JSON.stringify(DataModuleGetReq.toJSON(req));
    let result = this._dataModuleReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendDataModuleGetRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._dataModuleReqMap.set(cacheId, result);
    }

    return result;
  }

  getScanList(req: ScanListReq): Observable<ScanListResp> {
    const cacheId = JSON.stringify(ScanListReq.toJSON(req));
    let result = this._scanListReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendScanListRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._scanListReqMap.set(cacheId, result);
    }

    return result;
  }

  getDetectorConfig(req: DetectorConfigReq): Observable<DetectorConfigResp> {
    const cacheId = JSON.stringify(DetectorConfigReq.toJSON(req));
    let result = this._detectorConfigReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendDetectorConfigRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._detectorConfigReqMap.set(cacheId, result);
    }

    return result;
  }

  getDetectorConfigList(req: DetectorConfigListReq): Observable<DetectorConfigListResp> {
    if (!this._detectorConfigListReq) {
      this._detectorConfigListReq = this._dataService.sendDetectorConfigListRequest(req).pipe(shareReplay(1));
    }

    return this._detectorConfigListReq;
  }

  getDefaultImage(req: ImageGetDefaultReq): Observable<ImageGetDefaultResp> {
    const cacheId = JSON.stringify(ImageGetDefaultReq.toJSON(req));
    let result = this._defaultImageReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendImageGetDefaultRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._defaultImageReqMap.set(cacheId, result);
    }

    return result;
  }

  getImageBeamLocations(req: ImageBeamLocationsReq): Observable<ImageBeamLocationsResp> {
    const cacheId = JSON.stringify(ImageBeamLocationsReq.toJSON(req));
    let result = this._imageBeamLocationsReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendImageBeamLocationsRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._imageBeamLocationsReqMap.set(cacheId, result);
    }

    return result;
  }

  getImageMeta(req: ImageGetReq): Observable<ImageGetResp> {
    const cacheId = JSON.stringify(ImageGetReq.toJSON(req));
    let result = this._imageReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendImageGetRequest(req).pipe(shareReplay(1));

      // Add it to the map too so a subsequent request will get this
      this._imageReqMap.set(cacheId, result);
    }

    return result;
  }
}
