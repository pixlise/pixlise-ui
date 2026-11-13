import { Observable, throwError, combineLatest, map, of } from "rxjs";
import { ScanMetaLabelsAndTypesReq } from "src/app/generated-protos/scan-msgs";
import { SpectrumType, Spectrum } from "src/app/generated-protos/spectrum";
import { SpectrumAggregateReq } from "src/app/generated-protos/spectrum-msgs";
import { SpectrumExpressionDataSource, SpectrumValues } from "./Spectrum";
import { APIDataService, APICachedDataService } from "../../pixlisecore/pixlisecore.module";
import { decompressZeroRunLengthEncoding, encodeIndexList } from "src/app/utils/utils";


export abstract class SpectrumTermFetcher {
  abstract fetch(
    scanId: string,
    terms: SpectrumExpressionTerms,
    readType: SpectrumType,
    locationIndexes: number[]
  ): Observable<Map<string, SpectrumValues>>;
}

export class SpectrumExpressionTerms {
  constructor(public detectors: string[], public needBulk: boolean, public needMax: boolean) {}
}

export function readTerms(spectrumLineExprs: string[], possibleDetectors: string[]): SpectrumExpressionTerms {
  const detectorsToRequest = new Set<string>();
  let bulkSum = false;
  let maxValue = false;

  for (const det of possibleDetectors) {
      // Check for bulk
      let check = "bulk("+det+")";

      for (const expr of spectrumLineExprs) {
        let idx = expr.indexOf(check);
        if (idx >= 0) {
          bulkSum = true;
          detectorsToRequest.add(det);
          // break;
        }
      }

      // And max
      check = "max("+det+")";

      for (const expr of spectrumLineExprs) {
        let idx = expr.indexOf(check);
        if (idx >= 0) {
          maxValue = true;
          detectorsToRequest.add(det);
          // break;
        }
      }

      // if (bulkSum && maxValue) {
      //   break;
      // }
    }

    return new SpectrumExpressionTerms(Array.from(detectorsToRequest.keys()), bulkSum, maxValue);
}


//////////////////////////////////////////////////////////////////////////
// Fetching terms locally from downloaded spectra
//////////////////////////////////////////////////////////////////////////

export class SpectrumTermFetcherLocal {
  constructor(private _spectrumSource: SpectrumExpressionDataSource) {
  }
    
  fetch(scanId: string,
    terms: SpectrumExpressionTerms,
    readType: SpectrumType,
    locationIndexes: number[]): Observable<Map<string, SpectrumValues>> {
    const exprTerms: Map<string, SpectrumValues> = new Map<string, SpectrumValues>();

    for (const det of terms.detectors) {
      if (terms.needMax) {
        const spectrum = this.getTermSpectraLocally(det, locationIndexes, false, true, readType, true);
        if (spectrum) {
          exprTerms.set(`max(${det})`, spectrum);
        }
      } else if (terms.needBulk) {
        const spectrum = this.getTermSpectraLocally(det, locationIndexes, true, false, readType, false);
        if (spectrum) {
          exprTerms.set(`bulk(${det})`, spectrum);
        }
      }
      // No need for an error case, getTerms is a hack :) If this becomes a real general purpose parser this will have to change...
    }

    return of(exprTerms);
  }

  // Scans lineExpression for terms which are then combined by outer functions. The only possible terms
  // are the ones in getTerms, basically bulk() and max() of A or B
  // These are returned in a map containing items: term->spectrum
  private getTermSpectraLocally(
    detector: string,
    locationIndexes: number[],
    needBulk: boolean,
    needMax: boolean,
    readType: SpectrumType,
    countsPerMinWhenReading: boolean
  ): SpectrumValues | null {
    if (detector.length <= 0) {
      throw new Error(`Empty detector passed to getTermSpectraLocally: "${detector}"`);
    }
    if (!needBulk && !needMax) {
      throw new Error(`No max or bulk requested from getTermSpectraLocally`);
    }
      
    // Retrieve the spectrum this refers to. Note that if locationIndexes is empty, it's a special case where
    // we're asking for the whole dataset. In this case, we look for the spectrums with expression type BulkSum or MaxValue
    // instead of processing up all spectra ourselves. This is not only faster, but more accurate, as the sum/max was computed
    // by PIQUANT in the GDS pipeline
    // There may be datasets where this is not available, so as a fallback measure we can still calculate bulk sum
    // for all location indexes
    const spectra: SpectrumValues[] = [];

    if (locationIndexes.length <= 0) {
      let datasetSpectrumReadType = SpectrumType.SPECTRUM_UNKNOWN;
      if (needBulk) {
        datasetSpectrumReadType = SpectrumType.SPECTRUM_BULK;
      } else if (needMax) {
        datasetSpectrumReadType = SpectrumType.SPECTRUM_MAX;
      }

      let spectrum = this._spectrumSource.getSpectrum(-1, detector, datasetSpectrumReadType);
      if (spectrum) {
        if (countsPerMinWhenReading) {
          spectrum = spectrum.getAsCountsPerMin();
        }
        spectra.push(spectrum);
      }
    } else {
      for (const idx of locationIndexes) {
        let spectrum: SpectrumValues | null = null;
        try {
          spectrum = this._spectrumSource.getSpectrum(idx, detector, readType);
        } catch (e) {
          // If we fail to read a spectrum, just skip it and continue
          console.error(e);
          continue;
        }
        if (spectrum) {
          if (countsPerMinWhenReading) {
            spectrum = spectrum.getAsCountsPerMin();
          }
          spectra.push(spectrum);
        } else {
          // It's possible the PMC didn't have a normal spectrum, or A/B, don't fail the whole thing just because of this
          console.warn("Location index: " + idx + " no spectrum found for detector: " + detector + ", readtype: " + readType);
        }
      }
    }

    // depending on if we're max or bulk, combine the spectra we just read
    let spectrumToStore: SpectrumValues | null = null;
    if (needMax) {
      // With max we normalise BEFORE (see countsPerMinWhenReading)
      spectrumToStore = SpectrumValues.maxValue(spectra);
    } else if (needBulk) {
      spectrumToStore = SpectrumValues.bulkSum(spectra);

      // With bulk sum we normalise AFTER
    }

    return spectrumToStore;
  }
}


//////////////////////////////////////////////////////////////////////////
// Fetching terms from the server
//////////////////////////////////////////////////////////////////////////

export class SpectrumTermFetcherRemote {
  constructor(private _dataService: APIDataService, private _cachedDataService: APICachedDataService) {}

  fetch(
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
      this._dataService.sendSpectrumAggregateRequest(spectrumReq$),
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({scanId}))
    ]).pipe(
      map((resps) => {
        const spectra = resps[0];
        const metaLabels = resps[1].metaLabels;

        let liveTimeIdx = -1;
        let channelCountMetaIdx = -1;
        for (let i = 0; i < metaLabels.length; i++) {
          if (metaLabels[i] == "LIVETIME") {
            liveTimeIdx = i;
          }
          if (metaLabels[i] == "NPOINTS") {
            channelCountMetaIdx = i;
          }

          if (liveTimeIdx >= 0 && channelCountMetaIdx >= 0) {
            break;
          }
        }

        const exprTerms: Map<string, SpectrumValues> = new Map<string, SpectrumValues>();

        // Form the terms that the parser will need, run the parser and return its results
        if (spectrumReq$.bulkSum) {
          for (const s of spectra.bulkSpectra) {
            exprTerms.set("bulk(" + s.detector + ")", this.spectrumToSpectrumValues(s, liveTimeIdx, channelCountMetaIdx));
          }
        }

        if (spectrumReq$.maxValue) {
          for (const s of spectra.maxSpectra) {
            exprTerms.set("max(" + s.detector + ")", this.spectrumToSpectrumValues(s, liveTimeIdx, channelCountMetaIdx));
          }
        }

        return exprTerms;
      })
    );
  }

  private spectrumToSpectrumValues(s: Spectrum, liveTimeMetaIdx: number, channelCountMetaIdx: number): SpectrumValues {
    // Read the live time from our spectrum
    const liveTime = s.meta[liveTimeMetaIdx]?.fvalue || 0;

    let channelCount = s.meta[channelCountMetaIdx]?.ivalue || 4096;

    return new SpectrumValues(
      new Float32Array(decompressZeroRunLengthEncoding(s.counts, channelCount)),
      s.maxCount,
      s.detector,
      liveTime,
    );
  }
}