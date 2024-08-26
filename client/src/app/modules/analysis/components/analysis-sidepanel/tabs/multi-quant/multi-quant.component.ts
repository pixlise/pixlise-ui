import { Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription, combineLatest, map } from "rxjs";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { TableData, TableHeaderItem, TableRow } from "src/app/modules/pixlisecore/components/atoms/table/table.component";
import { ZStackItemForDisplay } from "./zstack/zstack-item/zstack-item.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { QuantCombineItem, QuantCombineSummary } from "src/app/generated-protos/quantification-multi";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { ScanItem } from "src/app/generated-protos/scan";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { httpErrorToString } from "src/app/utils/utils";
import { QuantCombineReq, QuantCombineResp } from "src/app/generated-protos/quantification-multi-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { MultiQuantService } from "src/app/modules/analysis/services/multi-quant.service";
import { NewROIDialogData, NewROIDialogComponent } from "src/app/modules/roi/components/new-roi-dialog/new-roi-dialog.component";
import { RemainingPointsColour } from "src/app/modules/roi/models/roi-region";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";

@Component({
  selector: "app-multi-quant",
  templateUrl: "./multi-quant.component.html",
  styleUrls: ["./multi-quant.component.scss"],
})
export class MultiQuantComponent implements OnDestroy {
  @ViewChild("createMQModal") createMQModal!: ElementRef;

  configuredScans: ScanItem[] = [];
  private _allScans: ScanItem[] = [];
  private _selectedScanId: string = "";

  private _subs = new Subscription();
  //private _rois: Map<string, RegionOfInterest> = null;

  zStack: ZStackItemForDisplay[] = [];
  message: string = "";
  summaryTableData: TableData | null = TableData.makeEmpty();

  waitingForCreate: boolean = false;

  createName = "";
  createDescription = "";

  constructor(
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _snackService: SnackbarService,
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _multiQuantService: MultiQuantService
  ) {
    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this._allScans = scans;
        if (!this.selectedScanId && scans.length > 0) {
          this.selectedScanId = this._analysisLayoutService.defaultScanId || scans[0].id;
        }

        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }
      })
    );

    /*
    // For now this has to listen to the service...
    this._subs.add(
      this._quantSelectionService.quantificationsSelected$.subscribe((selection: QuantificationSelectionInfo) => {
        // Should ONLY process ones with an ROI
        if (selection.roiID && selection.roiID.length > 0) {
          this.onQuantificationSelected(selection);
        }
      })
    );
*/
    // Listen for changes to z-stack
    this._subs.add(
      this._multiQuantService.multiQuantZStack$.subscribe((zStackReceived: QuantCombineItem[]) => {
        this.handleZStackFromAPI(zStackReceived);

        // Save for later (so we can act on ROI changes)
        //this._lastReceivedAPIZStack = zStackReceived;
      })
    );

    this.subscribeZStackTable();
  }

  private subscribeZStackTable(): void {
    this._subs.add(
      this._multiQuantService.multiQuantZStackSummaryTable$.subscribe({
        next: (summary: QuantCombineSummary | null) => {
          this.message = "";
          this.refreshSummaryTable(summary);
        },
        error: err => {
          console.error(err);

          // Show the error too
          this.summaryTableData = TableData.makeEmpty();
          this.message = httpErrorToString(err, "Summary table generation failed");

          // Resubscribe for future
          this.subscribeZStackTable();
        },
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();

    // Closing the side-bar panel hides the special PMC colouring on context image
    this.resetContextImageColouring();

    this.closeCreateMQModal();
  }

  get selectedScanId() {
    return this._selectedScanId;
  }

  set selectedScanId(value: string) {
    this._selectedScanId = value;
    this._multiQuantService.setScanId(value);
  }

  private resetContextImageColouring(): void {
    // if (this._contextImageService.mdl) {
    //   this._contextImageService.mdl.setPointDrawROIs(new Map<number, RGBA>());
    // }
  }

  onRegions(): void {
    if (!this._selectedScanId) {
      this._snackService.openError("Select a scan first", "Multi-Quant requires a selected scan to work");
      return;
    }

    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    const rois: string[] = [];
    for (const item of this.zStack) {
      rois.push(item.zStackItem.roiId);
    }

    dialogConfig.data = {
      requestFullROIs: true,
      rois,
      scanId: this.selectedScanId,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((roisSelected: ROIPickerResponse) => {
      // Result should be a list of element symbol strings
      if (roisSelected) {
        // If there are any that have been removed, remove. Add new ones at the top. We were previously
        // clearing and rebuilding but then you lose quants and order
        const selectedROIIDs: string[] = [];
        for (const roi of roisSelected.selectedROIs) {
          selectedROIIDs.push(roi.id);
        }

        // First, scan for removed ones
        const newZStack: QuantCombineItem[] = [];
        const existingROIs: string[] = [];
        for (const item of this.zStack) {
          if (selectedROIIDs.indexOf(item.zStackItem.roiId) > -1) {
            // Not deleted, preserve it!
            newZStack.push(item.zStackItem);
            existingROIs.push(item.zStackItem.roiId);
          }
        }

        // Now add any new ones at the top
        for (const roiID of selectedROIIDs) {
          if (existingROIs.indexOf(roiID) == -1) {
            newZStack.unshift(QuantCombineItem.create({ roiId: roiID }));
          }
        }

        // Display the changes
        this.storeZStackForDisplay(newZStack).subscribe(() => {
          // Handle the fact that these changed, will save to API
          this.handleUserChangedZStack();
        });
      }
    });
  }

  onCreateConfirm() {
    this.closeCreateMQModal();

    if (!this._selectedScanId) {
      this._snackService.openError("Select a scan first", "Multi-Quant requires a selected scan to work");
      return;
    }

    const zStack = this.makeZStackForAPI();

    this.waitingForCreate = true;
    this.summaryTableData = TableData.makeEmpty();
    this.message = "Creating multi-quant, please wait...";

    this.resetContextImageColouring();

    this._dataService
      .sendQuantCombineRequest(
        QuantCombineReq.create({ name: this.createName, description: this.createDescription, scanId: this._selectedScanId, roiZStack: zStack })
      )
      .subscribe({
        next: (resp: QuantCombineResp) => {
          this.waitingForCreate = false;
          this.message = "Multi-quant created with id: " + resp.jobId;
        },
        error: err => {
          this.waitingForCreate = false;
          this.message = httpErrorToString(err, "Multi-quant creation failed");
        },
        complete: () => {
          this.createName = "";
          this.createDescription = "";
        },
      });
  }

  onCreateCancel() {
    this.closeCreateMQModal();
    this.createName = "";
    this.createDescription = "";
  }

  // Make z-stack for saving to API. Adds remaining points ROI if z-stack is not empty AND if there is one defined
  private makeZStackForAPI(): QuantCombineItem[] {
    const result: QuantCombineItem[] = [];
    for (const item of this.zStack) {
      result.push(QuantCombineItem.create({ roiId: item.zStackItem.roiId, quantificationId: item.zStackItem.quantificationId }));
    }

    return result;
  }

  // Takes the given z-stack and forms a displayable one which we use internally. This reads the
  // z-stack specified and expands it with ROI names and colours. Saves in this.zStack and also
  // manage the existance/updating of this.remainingPoints
  private storeZStackForDisplay(items: QuantCombineItem[]): Observable<number[]> {
    // Returns the remaining points
    const toDisplay: ZStackItemForDisplay[] = [];
    let existingRemainingROIQuantID: string = "";

    const requests: (Observable<number[]> | Observable<RegionOfInterestGetResp>)[] = [this._multiQuantService.getRemainingPMCs()];
    for (const item of items) {
      // Split out the remaining points ROI if there is one
      if (item.roiId == PredefinedROIID.RemainingPoints) {
        existingRemainingROIQuantID = item.quantificationId;
      } else {
        requests.push(this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: item.roiId })));
      }
    }

    return combineLatest(requests).pipe(
      map(results => {
        const remainingPoints = results[0] as number[];

        for (let c = 1; c < results.length; c++) {
          const roi = results[c] as RegionOfInterestGetResp;

          // Expand ROI info - find the name and colour to save
          let name = "?";
          let sharer = "";

          if (roi.regionOfInterest) {
            name = roi.regionOfInterest.name;

            // If it's shared, show this too!
            if (roi.regionOfInterest.owner?.sharedWithOthers) {
              sharer = roi.regionOfInterest.owner.creatorUser?.name || "";
            }
          }

          //const colour = this._viewStateService.getROIColour(item.roiID);
          const colour = Colours.PURPLE.asString();
          toDisplay.push(new ZStackItemForDisplay(this.selectedScanId, name, sharer, colour, items[c - 1]));
        }

        // If we didn't have a remaining points, add one, if there are indeed remaining points. Otherwise delete if no remaining points
        if (remainingPoints.length > 0) {
          const remainingPointsLabel = "Remaining PMCs: " + remainingPoints.length;
          toDisplay.push(
            new ZStackItemForDisplay(
              this.selectedScanId,
              remainingPointsLabel,
              "",
              RemainingPointsColour.asString(),
              QuantCombineItem.create({ roiId: PredefinedROIID.RemainingPoints, quantificationId: existingRemainingROIQuantID })
            )
          );
        }

        // Use this for display
        this.zStack = toDisplay;

        return remainingPoints;
      })
    );
  }

  onReset(): void {
    // Set default UI state
    this.waitingForCreate = false;
    this.message = "";
    this.zStack = [];
    this.summaryTableData = TableData.makeEmpty();

    this.handleUserChangedZStack();
  }
/*
  onShowUI(): void {
    this._viewStateService.enableMultiQuantCombineMode();
  }
*/
  /*
  onQuantificationSelected(sel: QuantificationSelectionInfo): void {
    // Run through and find the ROI this was for, set it
    // NOTE: When we set it, we replace it with a new copy of the item, thereby triggering
    // change detection

    for (let c = 0; c < this.zStack.length; c++) {
      const item = this.zStack[c];
      if (item.zStackItem.roiId == sel.roiID) {
        this.zStack.splice(c, 1, new ZStackItemForDisplay(item.roiName, item.sharer, item.colour, new QuantCombineItem(item.zStackItem.roiId, sel.quantificationID)));
        break;
      }
    }

    this.handleUserChangedZStack();
  }
*/
  onZStackChanged(): void {
    this.handleUserChangedZStack();
  }

  onMakeROIFromRemainingPoints(): void {
    // Make an ROI out of the remaining points
    this._multiQuantService.getRemainingPMCs().subscribe((pmcs: number[]) => {
      if (pmcs.length <= 0) {
        return;
      }

      const dialogConfig = new MatDialogConfig<NewROIDialogData>();

      dialogConfig.data = {
        defaultScanId: this.selectedScanId,
        pmcs: pmcs,
      };

      const dialogRef = this.dialog.open(NewROIDialogComponent, dialogConfig);
      dialogRef.afterClosed().subscribe((created: boolean) => {
        if (created) {
          // Should we show a snack?
        } else {
          // Should we show a snack?
        }
      });
    });
  }

  // User did something to the z-stack on UI, reorder, add/remove ROIs
  // Here we manage the remaining points ROI situation then save it to API
  private handleUserChangedZStack(): void {
    const zStack = this.makeZStackForAPI();

    // User has done something, here we update the quant service. We handle changes published by it
    // so if there is anything further to be done, that'll be handled that way.
    this._multiQuantService.saveMultiQuantZStack(zStack);
  }

  // API just sent us an updated z-stack. Here we form the display version
  // and manage the remaining points ROI. Also notifies context image what point
  // colours to show per ROI point
  private handleZStackFromAPI(zStackReceived: QuantCombineItem[]): void {
    this.storeZStackForDisplay(zStackReceived).subscribe(() => {
      /*
      // Set the point colours in context image. NOTE: this may need to be modified
      // so it listens to zstack by itself
      if (this._contextImageService.mdl) {
        const colours = this.makePMCColours(remainingPoints);
        this._contextImageService.mdl.setPointDrawROIs(colours);
      }*/
    });
  }
  /*
  private makePMCColours(remainingPMCs: number[]): Map<number, RGBA> {
    // At this point we tell the context image that it's now to draw points with these ROIs in mind...
    const colours = new Map<number, RGBA>();

    // Run through the PMCs, give them a colour
    if (this._rois) {
      const locs = this._datasetService.datasetLoaded.locationPointCache;

      // NOTE: we have to process the z-stack in reverse order, because PMCs within [0] in the array are
      // supposed to overwrite PMCs of [1], [2] etc
      for (let c = 0; c < this.zStack.length; c++) {
        const item = this.zStack[this.zStack.length - c - 1];

        const roi = this._rois.get(item.zStackItem.roiID);
        if (roi) {
          for (const locIdx of roi.locationIndexes) {
            if (locIdx >= 0 && locIdx < locs.length) {
              const loc = locs[locIdx];
              if (loc && loc.hasNormalSpectra) {
                colours.set(loc.PMC, RGBA.fromString(item.colour));
              }
            }
          }
        }
      }
    }

    for (const pmc of remainingPMCs) {
      colours.set(pmc, ViewStateService.RemainingPointsColour);
    }

    return colours;
  }
*/
  private refreshSummaryTable(summary: QuantCombineSummary | null): void {
    if (!summary) {
      this.summaryTableData = null;
      this.message = "Generating Multi-Quant Totals...";
      return;
    }

    const headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];

    for (const det of summary.detectors) {
      headers.push(new TableHeaderItem("Weight %", "Detector: " + det));
    }

    const rows: TableRow[] = [];

    let totalValues: number[] = [];

    // We want to order the elements in atomic order, so get them first
    const elems = periodicTableDB.getElementsInAtomicNumberOrder(Object.keys(summary.weightPercents));

    for (const elem of elems) {
      const item = summary.weightPercents[elem];
      const values = item.values;

      // Make the values all have the same tooltip
      const roiNameString = item.roiNames.join(",");
      const tooltips = [];
      for (let c = 0; c < values.length; c++) {
        tooltips.push(roiNameString);
      }
      rows.push(new TableRow(elem, values, tooltips));

      if (totalValues.length <= 0) {
        // Assign, first one
        totalValues = Array.from(values);
      } else {
        for (let c = 0; c < values.length; c++) {
          totalValues[c] += values[c];
        }
      }
    }

    const totalsRow = new TableRow("Total:", totalValues, []);

    this.summaryTableData = new TableData("Element Totals for Multi Quant", "", "", "%", headers, rows, totalsRow);
    this.message = "";
  }

  private closeCreateMQModal(): void {
    if (this.createMQModal && this.createMQModal instanceof PushButtonComponent) {
      (this.createMQModal as PushButtonComponent).closeDialog();
    }
  }
}
