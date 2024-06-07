import { Injectable } from "@angular/core";
import { ReplaySubject, Subscription, Observable, shareReplay, map, tap, combineLatest, throwError, Subject } from "rxjs";
import { QuantCombineItem, QuantCombineItemList, QuantCombineSummary } from "src/app/generated-protos/quantification-multi";
import {
  MultiQuantCompareReq,
  MultiQuantCompareResp,
  QuantCombineListGetReq,
  QuantCombineListGetResp,
  QuantCombineListWriteReq,
  QuantCombineListWriteResp,
  QuantCombineReq,
  QuantCombineResp,
} from "src/app/generated-protos/quantification-multi-msgs";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { arraysEqual } from "src/app/utils/utils";
import { APIDataService } from "../../pixlisecore/pixlisecore.module";
import { ROIService } from "../../roi/services/roi.service";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

@Injectable({
  providedIn: "root",
})
export class MultiQuantService {
  private _scanId: string = "";

  private _multiQuantZStack: QuantCombineItem[] = [];
  private _multiQuantZStack$ = new ReplaySubject<QuantCombineItem[]>();

  private _multiQuantZStackSummaryTable$ = new ReplaySubject<QuantCombineSummary | null>();
  private _multiQuantZStackSummaryTableSubs = new Subscription();

  private _cachedQuantCompare$: Observable<MultiQuantCompareResp> | null = null;
  private _lastQuantCompareRoiID: string = "";
  private _lastQuantIDs: string[] = [];
  private _remainingPointsPMCs: number[] = [];

  constructor(
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService
  ) {}

  get multiQuantZStack$(): Subject<QuantCombineItem[]> {
    return this._multiQuantZStack$;
  }

  get multiQuantZStackSummaryTable$(): Subject<QuantCombineSummary | null> {
    return this._multiQuantZStackSummaryTable$;
  }

  setScanId(scanId: string) {
    // Clear all loaded quantifications
    // TODO: this._quantifications$Loaded.clear();

    // And lists
    // TODO: this._quantificationList$.next([]);

    // And z-stack
    this._multiQuantZStack$.next([]);

    // And its summary table
    this.clearMultiQuantSummaryTable();

    // New dataset ID is loaded, remember it
    this._scanId = scanId;

    // TODO: this.refreshQuantList();
    this.refreshMultiQuantZStack();
  }

  compareQuantificationsForROI(roiId: string, quantIDs: string[], remainingPointsPMCs: number[]): Observable<MultiQuantCompareResp> {
    if (
      !this._cachedQuantCompare$ ||
      this._lastQuantCompareRoiID != roiId ||
      !arraysEqual(this._lastQuantIDs, quantIDs) ||
      !arraysEqual(this._remainingPointsPMCs, remainingPointsPMCs)
    ) {
      this._cachedQuantCompare$ = this.requestCompareQuantificationsForROI(roiId, quantIDs, remainingPointsPMCs).pipe(shareReplay(1));
      this._lastQuantCompareRoiID = roiId;
      this._lastQuantIDs = Array.from(quantIDs);
      this._remainingPointsPMCs = Array.from(remainingPointsPMCs);
    }

    return this._cachedQuantCompare$;
  }

  private requestCompareQuantificationsForROI(roiId: string, quantIDs: string[], remainingPointsPMCs: number[]): Observable<MultiQuantCompareResp> {
    const req = MultiQuantCompareReq.create({ scanId: this._scanId, reqRoiId: roiId, quantIds: quantIDs, remainingPointsPMCs: remainingPointsPMCs });

    return this._dataService.sendMultiQuantCompareRequest(req);
    /*
    const apiUrl = APIPaths.getWithHost(APIPaths.api_quantification + "/comparison-for-roi/" + this._datasetIDLoaded + "/" + roiID);
    return this.http.post<object>(apiUrl, req, makeHeaders()).pipe(
      map((result: object) => {
        const tables: QuantTable[] = [];
        for (const table of result["quantTables"]) {
          // Get the elements and sort them
          const elemKeys = Object.keys(table["elementWeights"]).sort();

          const elemWeights: Map<string, number> = new Map<string, number>();
          let total = 0;
          for (const key of elemKeys) {
            // Snip off the _% (if exists)
            let elem = key;
            if (elem.endsWith("_%")) {
              elem = key.substring(0, key.length - 2);
            }

            const value = table["elementWeights"][key];
            total += value;
            elemWeights.set(elem, value);
          }

          tables.push(new QuantTable(table["quantID"], table["quantName"], elemWeights, total));
        }

        // Sort the tables so we have increasing totals
        tables.sort((a: QuantTable, b: QuantTable) => {
          if (a.totalValue < b.totalValue) return -1;
          else if (a.totalValue > b.totalValue) return 1;
          return 0;
        });

        return new MultiQuantCompareResp(result["roiID"], tables);
      })
    );*/
  }

  combineMultipleQuantifications(name: string, description: string, zStack: QuantCombineItem[]): Observable<string> {
    const req = QuantCombineReq.create({ scanId: this._scanId, name: name, description: description, roiZStack: zStack, summaryOnly: false });
    return this._dataService.sendQuantCombineRequest(req).pipe(
      map((resp: QuantCombineResp) => {
        if (!resp.jobId) {
          throw new Error("Expected jobId from QuantCombineResp");
        }

        // Side-effect: refresh the list of quants (TODO ?)
        //this.refreshQuantList();
        return resp.jobId;
      })
    );
  }

  private generateSummaryForCombiningMultipleQuantifications(zStack: QuantCombineItem[]): Observable<QuantCombineSummary> {
    const req = QuantCombineReq.create({ scanId: this._scanId, roiZStack: zStack, summaryOnly: true });

    return this._dataService.sendQuantCombineRequest(req).pipe(
      map((resp: QuantCombineResp) => {
        if (!resp.summary) {
          throw new Error("Expected summary from QuantCombineResp");
        }

        return resp.summary;
        /*
        const result = new QuantCombineSummary(item["detectors"], new Map<string, QuantCombineSummaryItem>());
        const weightPercents = item["weightPercents"];

        for (const key of Object.keys(weightPercents)) {
          const itemRead = weightPercents[key];
          const item: QuantCombineSummaryItem = new QuantCombineSummaryItem(itemRead["values"], itemRead["roiIDs"], itemRead["roiNames"]);
          result.weightPercents.set(key, item);
        }
        return result;*/
      })
    );
  }

  private regenerateMultiQuantSummaryTable(): void {
    // Cancel any we've been waiting for
    this._multiQuantZStackSummaryTableSubs.unsubscribe();
    this._multiQuantZStackSummaryTableSubs = new Subscription();

    // If our z-stack is not valid enough to make a table from, stop here
    if (!this.isValidZStack(this._multiQuantZStack)) {
      this.clearMultiQuantSummaryTable();
      return;
    }

    this._multiQuantZStackSummaryTable$.next(null);

    // Refresh from API. Note we store the subscription here because if we get another request
    // we don't want the old one to still be pending
    this._multiQuantZStackSummaryTableSubs.add(
      this.generateSummaryForCombiningMultipleQuantifications(this._multiQuantZStack).subscribe({
        next: (summary: QuantCombineSummary) => {
          // Publish to UI
          this._multiQuantZStackSummaryTable$.next(summary);
        },
        error: err => {
          // Create a new subject because this one is about to get nuked and if anything resubscribes, we want them subscribing to the new one
          const currSubs = this._multiQuantZStackSummaryTable$;
          this._multiQuantZStackSummaryTable$ = new ReplaySubject<QuantCombineSummary | null>();

          currSubs.error(err);
        },
      })
    );
  }

  private clearMultiQuantSummaryTable(): void {
    this._multiQuantZStackSummaryTable$.next(QuantCombineSummary.create({ detectors: [], weightPercents: {} }));
  }

  private isValidZStack(zStack: QuantCombineItem[]): boolean {
    if (zStack.length <= 1) {
      // Has to have more than 1 ROI
      return false;
    }

    // All ROIs need a quant ID
    for (const z of zStack) {
      if (!z.quantificationId) {
        return false;
      }
    }

    return true;
  }

  private refreshMultiQuantZStack(): void {
    if (!this._scanId) {
      console.error("refreshMultiQuantZStack before scan Id was set");
      return;
    }

    console.log("Refreshing multi-quant z-stack for datasetID: " + this._scanId);

    this._dataService.sendQuantCombineListGetRequest(QuantCombineListGetReq.create({ scanId: this._scanId })).subscribe({
      next: (resp: QuantCombineListGetResp) => {
        if (!resp.list) {
          throw new Error("Expected list in QuantCombineListGetResp");
        }

        this._multiQuantZStack = resp.list.roiZStack;
        this._multiQuantZStack$.next(this._multiQuantZStack);

        // NOTE: we refresh the summary table at this point. The other time is when we upload a z-stack to API
        // as the assumption is that it has changed...
        this.regenerateMultiQuantSummaryTable();
      },
      error: err => {
        console.error(err);
      },
    });
  }

  saveMultiQuantZStack(zStack: QuantCombineItem[]): void {
    if (!this._scanId) {
      console.error("refreshMultiQuantZStack before scan Id was set");
      return;
    }

    console.log("Refreshing multi-quant z-stack for datasetID: " + this._scanId);

    const req = QuantCombineListWriteReq.create({ scanId: this._scanId, list: QuantCombineItemList.create({ roiZStack: zStack }) });
    this._dataService.sendQuantCombineListWriteRequest(req).subscribe({
      next: (resp: QuantCombineListWriteResp) => {
        this._multiQuantZStack = zStack;
        this._multiQuantZStack$.next(this._multiQuantZStack);

        // Request a new table too
        this.regenerateMultiQuantSummaryTable();
      },
      error: err => {
        console.error(err);
      },
    });
  }

  get multiQuantZStack(): QuantCombineItem[] {
    return this._multiQuantZStack;
  }

  // Run through all regions added, and returns the PMCs that are not part of any of the added ROIs
  getRemainingPMCs(): Observable<number[]> {
    if (!this._scanId) {
      throw new Error("getRemainingPMCs called before scan id set");
    }

    const requests: (Observable<ScanEntryResp> | Observable<RegionOfInterestGetResp>)[] = [
      this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: this._scanId })),
    ];
    for (const item of this._multiQuantZStack) {
      if (item.roiId != PredefinedROIID.RemainingPoints) {
        requests.push(this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: item.roiId })));
      }
    }

    return combineLatest(requests).pipe(
      map(results => {
        const scanEntries = results[0] as ScanEntryResp;

        let usedPMCs = new Set<number>();
        for (let c = 1; c < results.length; c++) {
          const roi = results[c] as RegionOfInterestGetResp;

          if (roi.regionOfInterest?.scanEntryIndexesEncoded) {
            const pmcs = new Set<number>(roi.regionOfInterest?.scanEntryIndexesEncoded);
            usedPMCs = new Set<number>([...usedPMCs, ...pmcs]);
          }
        }

        const result: number[] = [];
        for (const entry of scanEntries.entries) {
          if (entry.normalSpectra > 0 && !usedPMCs.has(entry.id)) {
            result.push(entry.id);
          }
        }

        return result;
      })
    );
  }
}
