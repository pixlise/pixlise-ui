import { Injectable } from "@angular/core";
import { Observable, throwError, combineLatest, map } from "rxjs";
import { ScanListReq, ScanMetaLabelsAndTypesReq } from "src/app/generated-protos/scan-msgs";
import { SpectrumType, Spectrum } from "src/app/generated-protos/spectrum";
import { SpectrumAggregateReq } from "src/app/generated-protos/spectrum-msgs";
import { encodeIndexList, decompressZeroRunLengthEncoding } from "src/app/utils/utils";
import { SpectrumValues } from "../../spectrum/models/Spectrum";
import { APICachedDataService } from "./apicacheddata.service";
import { ScanEntryMetadataReq } from "src/app/generated-protos/scan-entry-metadata-msgs";


export class SpectrumExpressionTerms {
  constructor(public detectors: string[], public needBulk: boolean, public needMax: boolean) {}
}

@Injectable({
  providedIn: "root",
})
export class SpectrumDataRemoteService {
  private _scanNormalSpectraCounts = new Map<string, number>();
  constructor(private _cachedDataService: APICachedDataService) {}

  getScanNormalSpectraCount(scanId: string): number {
    const count = this._scanNormalSpectraCounts.get(scanId) || 0;
    if (count == 0) {
      console.error(`Scan ${scanId} normal spectrum count is 0 meaning some normalisation might fail.`);
    }
    return count;
  }

  getAggregateSpectra(
    scanId: string,
    terms: SpectrumExpressionTerms,
    readType: SpectrumType,
    locationIndexes: number[]): Observable<Map<string, SpectrumValues>> {

    if (!terms.needBulk && !terms.needMax) {
      // Neither was requested, strange
      return throwError(() => new Error("Neither bulk nor max requested"));
    }

    const spectrumReq$ = SpectrumAggregateReq.create({
      scanId: scanId,
      entries: {
        indexes: encodeIndexList(locationIndexes.sort()),
      },
      detectors: terms.detectors,
      readType: readType,
      bulkSum: terms.needBulk,
      maxValue: terms.needMax,
    });

    // Do the request and continue
    return combineLatest([
      this._cachedDataService.getSpectrumAggregate(spectrumReq$),
      this._cachedDataService.getScanList(ScanListReq.create({ searchFilters: { scanId } })),
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({scanId}))
    ]).pipe(
      map((resps) => {
        const spectra = resps[0];
        const scans = resps[1];
        const metaLabels = resps[2].metaLabels;

        if (scans && scans.scans && scans.scans.length == 1) {
          this._scanNormalSpectraCounts.set(scanId, scans.scans[0].contentCounts["NormalSpectra"]);
        }
        
        if ((this._scanNormalSpectraCounts.get(scanId) || 0) == 0) {
          console.error(`Scan ${scanId} normal spectrum count is 0 meaning some normalisation might fail.`);
        }

        let liveTimeIdx = -1;
        let realTimeIdx = -1;
        let channelCountMetaIdx = -1;
        let offsetIdx = -1;
        let xPerChanIdx = -1;
        for (let i = 0; i < metaLabels.length; i++) {
          if (metaLabels[i] == "LIVETIME") {
            liveTimeIdx = i;
          }
          if (metaLabels[i] == "REALTIME") {
            realTimeIdx = i;
          }
          if (metaLabels[i] == "NPOINTS") {
            channelCountMetaIdx = i;
          }
          if (metaLabels[i] == "OFFSET") {
            offsetIdx = i;
          }
          if (metaLabels[i] == "XPERCHAN") {
            xPerChanIdx = i;
          }

          if (liveTimeIdx >= 0 && realTimeIdx >= 0 && channelCountMetaIdx >= 0 && offsetIdx >= 0 && xPerChanIdx >= 0) {
            break;
          }
        }

        const exprTerms: Map<string, SpectrumValues> = new Map<string, SpectrumValues>();

        // Form the terms that the parser will need, run the parser and return its results
        if (spectrumReq$.bulkSum) {
          for (const s of spectra.bulkSpectra) {
            exprTerms.set("bulk(" + s.detector + ")", this.spectrumToSpectrumValues(s, liveTimeIdx, realTimeIdx, channelCountMetaIdx, offsetIdx, xPerChanIdx));
          }
        }

        if (spectrumReq$.maxValue) {
          for (const s of spectra.maxSpectra) {
            exprTerms.set("max(" + s.detector + ")", this.spectrumToSpectrumValues(s, liveTimeIdx, realTimeIdx, channelCountMetaIdx, offsetIdx, xPerChanIdx));
          }
        }

        return exprTerms;
      })
    );
  }

  private spectrumToSpectrumValues(s: Spectrum, liveTimeMetaIdx: number, realTimeMetaIdx: number, channelCountMetaIdx: number, offsetIdx: number, xPerChanIdx: number): SpectrumValues {
    // Read the live time from our spectrum
    const liveTime = s.meta[liveTimeMetaIdx]?.fvalue || 0;
    const realTime = s.meta[realTimeMetaIdx]?.fvalue || 0;

    let channelCount = s.meta[channelCountMetaIdx]?.ivalue || 4096;

    const offset = s.meta[offsetIdx]?.fvalue || 0;
    const xPerChan = s.meta[xPerChanIdx]?.fvalue || 1;

    return new SpectrumValues(
      new Float32Array(decompressZeroRunLengthEncoding(s.counts, channelCount)),
      s.maxCount,
      s.detector,
      liveTime,
      realTime,
      offset,
      xPerChan
    );
  }
}