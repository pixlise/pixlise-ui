import { Observable } from "rxjs";
import { SpectrumType } from "src/app/generated-protos/spectrum";
import { SpectrumValues } from "./Spectrum";
import { SpectrumDataRemoteService, SpectrumExpressionTerms } from "../../pixlisecore/services/spectrum-data-remote.service";


export abstract class SpectrumTermFetcher {
  abstract fetch(
    scanId: string,
    terms: SpectrumExpressionTerms,
    readType: SpectrumType,
    locationIndexes: number[]
  ): Observable<Map<string, SpectrumValues>>;
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
          //break;
        }
      }

      // And max
      check = "max("+det+")";

      for (const expr of spectrumLineExprs) {
        let idx = expr.indexOf(check);
        if (idx >= 0) {
          maxValue = true;
          detectorsToRequest.add(det);
          //break;
        }
      }

      // if (bulkSum && maxValue) {
      //   break;
      // }
    }

    return new SpectrumExpressionTerms(Array.from(detectorsToRequest.keys()), bulkSum, maxValue);
}


//////////////////////////////////////////////////////////////////////////
// Fetching terms from the server
//////////////////////////////////////////////////////////////////////////

// TODO: This is basically redundant now, but keep it around to maintain
//       a common interface with the local spectrum querier for now

export class SpectrumTermFetcherRemote {
  constructor(private _spectrumRemoteSvc: SpectrumDataRemoteService) {}

  fetch(
    scanId: string,
    terms: SpectrumExpressionTerms,
    readType: SpectrumType,
    locationIndexes: number[]): Observable<Map<string, SpectrumValues>> {
    return this._spectrumRemoteSvc.getAggregateSpectra(scanId, terms, readType, locationIndexes);
  }
}
