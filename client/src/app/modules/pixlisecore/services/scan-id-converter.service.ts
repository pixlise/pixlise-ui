import { Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { APICachedDataService } from "./apicacheddata.service";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";

@Injectable({
  providedIn: "root",
})
export class ScanIdConverterService {
  private _pmcToIndexLookup = new Map<string, Map<number, number>>();

  constructor(private _cachedDataService: APICachedDataService) {}

  getScanEntryPMCToIndexLookup(scanId: string): Observable<Map<number, number>> {
    if (!scanId) {
      throw new Error("getScanEntryPMCToIndexLookup called with empty scanId");
    }

    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).pipe(
      map((resp: ScanEntryResp) => {
        if (!resp.entries) {
          throw new Error("Failed to get scan entries for: " + scanId);
        }

        // If we already have these same ones cached, use the lookup, otherwise rebuild
        let lookup = this._pmcToIndexLookup.get(scanId);
        if (!lookup || lookup.size != resp.entries.length) {
          // Build the lookup
          lookup = new Map<number, number>();
          for (let c = 0; c < resp.entries.length; c++) {
            const entry = resp.entries[c];
            lookup.set(entry.id, c);
          }
          this._pmcToIndexLookup.set(scanId, lookup);
        }

        return lookup;
      })
    );
  }

  convertScanEntryPMCToIndex(scanId: string, pmcs: number[]): Observable<number[]> {
    if (!scanId) {
      throw new Error("convertScanEntryPMCToIndex called with empty scanId");
    }

    return this.getScanEntryPMCToIndexLookup(scanId).pipe(
      map((lookup: Map<number, number>) => {
        const result: number[] = [];
        for (const pmc of pmcs) {
          const idx = lookup.get(pmc);
          if (idx === undefined) {
            throw new Error(`Failed to convert PMC ${pmc} to location index for scan: ${scanId}`);
          }

          result.push(idx);
        }

        return result;
      })
    );
  }

  convertScanEntryIndexToPMC(scanId: string, indexes: Iterable<number>): Observable<number[]> {
    if (!scanId) {
      throw new Error("convertScanEntryIndexToPMC called with empty scanId");
    }

    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).pipe(
      map((resp: ScanEntryResp) => {
        if (!resp.entries) {
          throw new Error("Failed to get scan entries for: " + scanId);
        }

        // Hop to the right ones by index and return the PMC
        const pmcs: number[] = [];
        for (const idx of indexes) {
          if (idx >= 0 && idx < resp.entries.length) {
            pmcs.push(resp.entries[idx].id);
          } else {
            throw new Error(`Failed to convert scan entry index ${idx} to PMC for scan: ${scanId}`);
          }
        }

        return pmcs;
      })
    );
  }
}
