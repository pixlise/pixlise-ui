import { Component, ElementRef, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription, combineLatest, concatMap, first, map, switchMap, tap } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import {
  WidgetDataService,
  SnackbarService,
  DataSourceParams,
  RegionDataResults,
  DataUnit,
  SelectionService,
  PickerDialogComponent,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerData, ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { TableData, TableHeaderItem, TableRow } from "src/app/modules/pixlisecore/components/atoms/table/table.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { TableState, VisibleROIAndQuant } from "src/app/generated-protos/widget-data";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { PickerDialogItem, PickerDialogData } from "src/app/modules/pixlisecore/components/atoms/picker-dialog/picker-dialog.component";
import { ScreenConfiguration } from "src/app/generated-protos/screen-configuration";

@Component({
  selector: "app-quantification-table",
  templateUrl: "./quantification-table.component.html",
  styleUrls: ["./quantification-table.component.scss"],
})
export class QuantificationTableComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  // We store our ids with a scanId lookup first, and for each scan, a lookup by quantId
  dataSourceIds = new Map<string, Map<string, string[]>>();

  private _usePureElement: boolean = false;
  private _orderByAbundance: boolean = false;

  private _subs = new Subscription();
  private _quantsAvailableSubs = new Subscription();

  regionDataTables: TableData[] = [];
  helpMessage: string = "";

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService,
    private _selectionService: SelectionService,
    private _roiService: ROIService
  ) {
    super();

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "quants",
          type: "button",
          title: "Quantifications",
          tooltip: "Choose quantifications to display",
          onClick: (val, event) => this.onQuants(event),
          settingTitle: "Quantifications",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/quantification.svg",
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
          settingTitle: "Regions",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/roi.svg",
        },
        {
          id: "divider",
          type: "divider",
          onClick: () => null,
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
          settingTitle: "Export / Download",
          settingGroupTitle: "Actions",
          settingIcon: "assets/button-icons/export.svg",
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
          settingTitle: "Solo",
          settingGroupTitle: "Actions",
        },
      ],
    };
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const tableData: TableState = data as TableState;

        if (tableData) {
          this._orderByAbundance = tableData.order == "abundance"; // TODO: is this right?
          this._usePureElement = tableData.showPureElements;

          if (tableData.visibleROIs && tableData.visibleROIs.length > 0) {
            this.dataSourceIds.clear();

            for (const roi of tableData.visibleROIs) {
              let innerMap = this.dataSourceIds.get(roi.scanId);
              if (!innerMap) {
                innerMap = new Map<string, string[]>();
                this.dataSourceIds.set(roi.scanId, innerMap);
              }

              // If we have a quant id set, use it, otehrwise use the default one
              let quantId = roi.quantId;
              if (quantId.length <= 0) {
                quantId = this._analysisLayoutService.getQuantIdForScan(roi.scanId);
              }

              if (quantId.length > 0) {
                // Add to existing rois if there were any
                let rois = innerMap.get(quantId);
                if (rois === undefined) {
                  rois = [];
                }
                rois.push(roi.id);

                innerMap.set(quantId, rois);
              } else {
                console.warn("Quant Table did not restore state because no quant ID was found");
              }
            }

            this.updateTable();
          } else {
            this.setInitialConfig();
          }
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        this.updateTable();
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._quantsAvailableSubs.unsubscribe();
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  private setInitialConfig() {
    // TODO: needed? this.dataSourceIds.clear();
    const scanId = this._analysisLayoutService.defaultScanId;
    if (scanId.length > 0) {
      const quantId = this._analysisLayoutService.getQuantIdForScan(scanId);
      if (quantId.length > 0) {
        this.dataSourceIds.set(
          scanId,
          new Map<string, string[]>([[quantId, [PredefinedROIID.getAllPointsForScan(scanId), PredefinedROIID.getSelectedPointsForScan(scanId)]]])
        );
      }

      this.updateTable();
    }
  }

  private saveState(): void {
    const visibleROIs: VisibleROIAndQuant[] = [];

    for (const [scanId, items] of this.dataSourceIds.entries()) {
      for (const [quantId, roiIds] of items.entries()) {
        for (const roiId of roiIds) {
          visibleROIs.push(VisibleROIAndQuant.create({ id: roiId, scanId: scanId, quantId: quantId }));
        }
      }
    }

    this.onSaveWidgetData.emit(
      TableState.create({
        showPureElements: this._usePureElement,
        order: this._orderByAbundance ? "abundance" : "other",
        visibleROIs: visibleROIs,
      })
    );
  }

  private updateTable(): void {
    this.isWidgetDataLoading = true;
    // Rebuild the table
    this.regionDataTables = [];
    this.helpMessage = "";

    const tables$: Observable<TableData>[] = [];
    for (const [scanId, items] of this.dataSourceIds.entries()) {
      for (const [quantId, roiIds] of items.entries()) {
        for (const roiId of roiIds) {
          tables$.push(this.makeTable(scanId, roiId, quantId));
        }
      }
    }

    combineLatest(tables$)
      .pipe(first())
      .subscribe({
        next: (results: TableData[]) => {
          this.regionDataTables = [];

          for (const table of results) {
            this.regionDataTables.push(table);
          }

          // Ensure each table has the same element list
          let emptyValues = [];
          const uniqueLabels: string[] = [];
          for (const table of this.regionDataTables) {
            for (const r of table.rows) {
              if (!uniqueLabels.includes(r.label)) {
                uniqueLabels.push(r.label);
              }
              if (r.values.length > emptyValues.length) {
                emptyValues = [];
                for (let c = 0; c < r.values.length; c++) {
                  emptyValues.push(0);
                }
              }
            }
          }

          const allLabels = uniqueLabels;

          for (const table of this.regionDataTables) {
            const rowLookup = new Map<string, TableRow>();
            for (const row of table.rows) {
              rowLookup.set(row.label, row);
            }

            const rows: TableRow[] = [];
            for (const label of allLabels) {
              const existingRow = rowLookup.get(label);
              if (existingRow) {
                rows.push(existingRow);
              } else {
                rows.push(new TableRow(label, emptyValues, []));
              }
            }

            table.rows = rows;
          }

          this.isWidgetDataLoading = false;
        },
        error: err => {
          this.isWidgetDataLoading = false;
          this._snackService.openError(err);
        },
      });
  }

  private makeTable(scanId: string, roiId: string, quantId: string): Observable<TableData> {
    // Get the quant for this table
    return this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId })).pipe(
      switchMap((resp: QuantGetResp) => {
        if (!resp.summary) {
          throw new Error("Failed to get quant summary for: " + quantId);
        }

        // We have the list of formulae (elements in quant), we know how many detectors, so build the table
        const formulae = this.getFormulaeToQuery(resp.summary);
        const detectors = this.getDetectors(resp.summary);

        const query: DataSourceParams[] = [];

        const rows: TableRow[] = [];
        const rowItemToQueryIdx: number[][] = [];
        //const totalValues: number[] = [];
        const headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];

        for (const detector of detectors) {
          headers.push(new TableHeaderItem("Weight %", detector)); // When query returns we will pad this out with the region name
        }

        for (const formula of formulae) {
          const row = new TableRow(formula, [], []);
          const idxs: number[] = [];

          // Form the request
          for (const detector of detectors) {
            const exprId = DataExpressionId.makePredefinedQuantElementExpression(formula, "%", detector);

            // NOTE: if it's the selected region, we still query for all points, and then selectively add them if they're in
            //       the selection
            const reqRoiId = PredefinedROIID.isSelectedPointsROI(roiId) ? PredefinedROIID.getAllPointsForScan(scanId) : roiId;
            query.push(new DataSourceParams(scanId, exprId, quantId, reqRoiId, DataUnit.UNIT_DEFAULT));

            row.values.push(0);
            row.tooltips.push("");
            idxs.push(query.length - 1);
          }

          rows.push(row);
          rowItemToQueryIdx.push(idxs);
        }

        return this._widgetData.getData(query).pipe(
          map((results: RegionDataResults) => {
            return this.formTableData(scanId, resp.summary?.params?.userParams?.name || "?", roiId, results, headers, rows, rowItemToQueryIdx);
          })
        );
      })
    );
  }

  private formTableData(
    scanId: string,
    quantName: string,
    roiId: string,
    data: RegionDataResults,
    headers: TableHeaderItem[],
    rows: TableRow[],
    rowItemToQueryIdx: number[][]
  ): TableData {
    // Show any errors...
    if (data.error) {
      this._snackService.openError(data.error);
      return new TableData("", "", "", "", [], [], new TableRow(`Error: ${data.error}`, [], []));
    }

    if (data.hasQueryErrors()) {
      for (const queryResult of data.queryResults) {
        if (queryResult.error) {
          this._snackService.openError(queryResult.error.message, queryResult.error.description);
          return new TableData("", "", "", "", [], [], new TableRow(`Error: ${queryResult.error.message}`, [], []));
        }
      }
    }

    // Run through all query results and put them in the cells they belong in
    let totalValues: number[] = [];
    //let headerSet: boolean[] = [];

    let region: RegionSettings | null = null;

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.values.length; x++) {
        if (totalValues.length <= 0) {
          totalValues = Array<number>(row.values.length).fill(0);
          //headerSet = Array<boolean>(row.values.length).fill(false);
        }
        const queryIdx = rowItemToQueryIdx[y][x];
        if (queryIdx >= data.queryResults.length) {
          const err = `Failed to read data for cell, queryIdx=${queryIdx}, queryResults length=${data.queryResults.length}`;
          this._snackService.openError(err);
          return new TableData("", "", "", "", [], [], new TableRow(err, [], []));
        }

        const queryResult = data.queryResults[queryIdx];
        if (queryResult && queryResult.values) {
          if (!region) {
            region = queryResult.region;
          } else if (region?.region.id !== queryResult.region?.region.id) {
            const err = `Differing regions returned for table: ${region.region.name} vs: ${queryResult.region?.region.name}`;
            this._snackService.openError(err);
            return new TableData("", "", "", "", [], [], new TableRow(err, [], []));
          }

          let weightTotal = 0;
          let weightAvg = 0;

          let valueCount = queryResult.values.values.length;

          let includedPMCs = new Set<number>();
          if (PredefinedROIID.isSelectedPointsROI(roiId)) {
            includedPMCs = this._selectionService.getCurrentSelection().beamSelection.getSelectedScanEntryPMCs(scanId);
            valueCount = includedPMCs.size;
          }

          for (const value of queryResult.values.values) {
            if (includedPMCs.size <= 0 || includedPMCs.has(value.pmc)) {
              weightTotal += value.value;
            }
          }

          if (valueCount > 0) {
            weightAvg = weightTotal / valueCount;
          }

          // Save this weight average into the cell
          row.values[x] = weightAvg;

          // Add to the column total
          totalValues[x] += weightAvg;

          // Put the region name into the header
          /*if (!headerSet[x + 1]) {
            headers[x + 1].label = `${queryResult.region?.region.name}`;
            headerSet[x + 1] = true;
          }*/
        }
      }
    }

    if (rows.length > 0) {
      if (this._orderByAbundance) {
        this.orderRowsByWeightPct(rows);
      }

      const table = new TableData(
        `Region: ${region?.region.name}`, // Title: Region name
        `Quant: ${quantName}`, // Sub-title: Quant name
        region?.displaySettings.colour.asString() || "",
        " Wt.%",
        headers,
        rows,
        new TableRow("Totals:", totalValues, [])
      );

      // If we're the selection, override some stuff
      if (PredefinedROIID.isSelectedPointsROI(roiId)) {
        const roi = this._roiService.getSelectedPointsROI(scanId);
        if (roi) {
          table.title = `Region: ${roi.name}`;
          table.circleColourStr = roi.displaySettings?.colour || "";
        }
      }

      return table;
    }

    return new TableData("", "", "", "", [], [], new TableRow("", [], []));
  }

  /*
  private updateReferences() {
    this._references.forEach(referenceName => {
      let headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];
      headers.push(new TableHeaderItem("Weight %", ""));
      headers.push(new TableHeaderItem("Error", ""));

      let reference = ExpressionReferences.getByName(referenceName);
      let combinedExpressionValues = ExpressionReferences.getCombinedExpressionValues(reference);
      let rows = combinedExpressionValues.map(expressionValue => {
        let detectorAName = `${expressionValue.name}-%(A)`;

        let expressionName = this._exprService.getExpressionShortDisplayName(detectorAName, 30);
        let elementName = expressionName.shortName.replace("-A", "");

        let refValue = ExpressionReferences.getExpressionValue(reference, detectorAName);

        return new TableRow(elementName, [refValue.weightPercentage, refValue.error], []);
      });

      let total = rows.reduce((total, row) => total + row.values[0], 0);
      let totalErr = rows.reduce((total, row) => total + row.values[1], 0);

      this.regionDataTables.push(
        new TableData(referenceName, Colours.CONTEXT_PURPLE.asString(), [" Wt.% ", ""], headers, rows, new TableRow("Totals:", [total, totalErr], []))
      );
    });
  }
*/

  private getFormulaeToQuery(summary: QuantificationSummary): string[] {
    let formulae = summary.elements;

    // Decide what versions of formulae we're using... most complex state (oxides/carbonates), or pure elements
    const complexElems = periodicTableDB.getOnlyMostComplexStates(formulae);

    if (this._usePureElement) {
      // Exclude all the complex elements
      const pures: string[] = [];
      for (const formula of formulae) {
        if (formula.length <= 2) {
          pures.push(formula);
        }
      }

      formulae = pures;
    } else {
      // Use only the complex forms (thereby excluding anything that's a pure-element of a carbonate/oxide that's quantified)
      formulae = complexElems;
    }

    return formulae;
  }

  private getDetectors(summary: QuantificationSummary): string[] {
    const quantMode = summary.params?.userParams?.quantMode || "";
    let detectors: string[] = ["Combined"];
    if (quantMode.indexOf("AB") > -1) {
      detectors = ["A", "B"];
    }

    return detectors;
  }

  private orderRowsByWeightPct(rows: TableRow[]): void {
    rows.sort((a: TableRow, b: TableRow) => {
      if (a.values[0] < b.values[0]) {
        return 1;
      }
      if (a.values[0] > b.values[0]) {
        return -1;
      }
      return 0;
    });
  }

  onReferences() {}

  private getAvailableQuants(): Observable<Map<string, QuantificationSummary[]>> {
    return this._analysisLayoutService.activeScreenConfiguration$.pipe(
      switchMap((cfg: ScreenConfiguration) => {
        const scanIds = Object.keys(cfg.scanConfigurations);

        const requests$ = [];
        for (const scanId of scanIds) {
          requests$.push(this._analysisLayoutService.fetchQuantsForScanAsync(scanId));
        }

        return combineLatest(requests$).pipe(
          tap((scanQuants: QuantificationSummary[][]) => {
            if (scanQuants.length != scanIds.length) {
              throw new Error(`Failed to load quants for configured scans, loaded ${scanQuants.length}, expected ${scanIds.length}`);
            }
          }),
          map((quants: QuantificationSummary[][]) => {
            const quantsByScanId = new Map<string, QuantificationSummary[]>();
            for (let c = 0; c < quants.length; c++) {
              quantsByScanId.set(scanIds[c], quants[c]);
            }

            return quantsByScanId;
          })
        );
      })
    );
  }

  onQuants(event: any): void {
    this.getAvailableQuants().subscribe((quantsByScanId: Map<string, QuantificationSummary[]>) => {
      const dialogConfig = new MatDialogConfig();
      //dialogConfig.backdropClass = 'empty-overlay-backdrop';

      const items = this.makeQuantPickerItems(Array.from(quantsByScanId.keys()), quantsByScanId);

      const selectedROIIds = new Set<string>();
      const roisByScanId = new Map<string, string[]>();
      const quantIds = new Set<string>();
      for (const [scanId, item] of this.dataSourceIds.entries()) {
        for (const [quantId, roiIds] of item.entries()) {
          quantIds.add(quantId);

          for (const roi of roiIds) {
            selectedROIIds.add(roi);
          }

          roisByScanId.set(scanId, roiIds);
        }
      }

      dialogConfig.data = new PickerDialogData(true, true, true, true, items, Array.from(quantIds), "", new ElementRef(event.currentTarget));

      const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);

      // NOTE: We don't update as clicks happen, we wait for an apply button press!
      dialogRef.afterClosed().subscribe((selectedQuantIds: string[]) => {
        if (selectedQuantIds && selectedQuantIds.length > 0) {
          // Regenerate our dataSourceIds to include the quant ids specified
          const quantIdsByScan = new Map<string, string[]>();
          for (const [scanId, quants] of quantsByScanId.entries()) {
            const quantsToAdd: string[] = [];
            for (const q of quants) {
              if (selectedQuantIds.indexOf(q.id) > -1) {
                quantsToAdd.push(q.id);
              }
            }

            if (quantsToAdd.length > 0) {
              quantIdsByScan.set(scanId, quantsToAdd);
            }
          }
          this.dataSourceIds = this.regenerateDataSources(quantIdsByScan, roisByScanId);

          this.updateTable();
          this.saveState();
        }
        // else user cancelled
      });
    });
  }

  private makeQuantPickerItems(scanIds: string[], allQuants: Map<string, QuantificationSummary[]>): PickerDialogItem[] {
    const items: PickerDialogItem[] = [];

    // First check if there are multiple scan ids that we're dealing with
    //const scanIds = Object.keys(allQuants);

    for (const scanId of scanIds) {
      const userQuants: PickerDialogItem[] = [];
      userQuants.push(new PickerDialogItem("", `${scanId} - My Quantifications`, "", true));

      const sharedQuants: PickerDialogItem[] = [];
      sharedQuants.push(new PickerDialogItem("", `${scanId} - Shared Quantifications`, "", true));

      const quants = allQuants.get(scanId);
      if (quants) {
        for (const quant of quants) {
          // Only interested in completed, combined quantifications, we can't view the others...
          //if (/*quant.status == "complete" &&*/ quant.params?.userParams?.quantMode == "Combined") {
          if (quant.params && quant.params.userParams) {
            const item = new PickerDialogItem(quant.id, quant.params.userParams.name, "", true);
            if (quant.owner?.sharedWithOthers) {
              sharedQuants.push(item);
            } else {
              userQuants.push(item);
            }
          }
        }
      }

      if (userQuants.length > 1) {
        items.push(...userQuants);
      }
      if (sharedQuants.length > 1) {
        items.push(...sharedQuants);
      }
    }

    return items;
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    // Read configured regions and quants
    const selectedROIIds = new Set<string>();
    const quantsByScanId = new Map<string, string[]>();

    let roiDialogDefaultScanId = "";
    for (const [scanId, item] of this.dataSourceIds.entries()) {
      if (!roiDialogDefaultScanId) {
        roiDialogDefaultScanId = scanId; // Use the first scan id
      }

      for (const [quantId, roiIds] of item.entries()) {
        const quantList = quantsByScanId.get(scanId) || [];
        quantList.push(quantId);
        quantsByScanId.set(scanId, quantList);

        for (const roi of roiIds) {
          selectedROIIds.add(roi);
        }
      }
    }

    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: true,
      selectedIds: Array.from(selectedROIIds),
      scanId: roiDialogDefaultScanId,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        // Create entries for each scan
        const roisPerScan = new Map<string, string[]>();
        for (const roi of result.selectedROISummaries) {
          let existing = roisPerScan.get(roi.scanId);
          if (existing === undefined) {
            existing = [];
          }

          existing.push(roi.id);
          roisPerScan.set(roi.scanId, existing);
        }

        this.dataSourceIds = this.regenerateDataSources(quantsByScanId, roisPerScan);

        this.updateTable();
        this.saveState();
      }
    });
  }

  private regenerateDataSources(quantIdsByScan: Map<string, string[]>, roiIdsByScan: Map<string, string[]>) {
    // Get a unique list of scans
    const result = new Map<string, Map<string, string[]>>();
    // for (const scanId of [...quantIdsByScan.keys(), ...roiIdsByScan.keys()]) {
    //   result.set(scanId, new Map<string, string[]>());
    // }

    // Add quant ids where needed
    for (const [scanId, quantIds] of quantIdsByScan.entries()) {
      const quants = new Map<string, string[]>();
      for (const quantId of quantIds) {
        quants.set(quantId, []);
      }
      result.set(scanId, quants);
    }

    for (const [scanId, roiIds] of roiIdsByScan.entries()) {
      const item = result.get(scanId);
      if (item) {
        // Set the rois for each quant
        for (const quant of item.keys()) {
          item.set(quant, Array.from(roiIds));
        }
      }
    }

    return result;
  }

  get usePureElement(): boolean {
    return this._usePureElement;
  }

  togglePureElement(): void {
    this._usePureElement = !this._usePureElement;

    this.saveState();
    this.updateTable();
  }

  get orderByAbundance(): boolean {
    return this._orderByAbundance;
  }

  setOrderByAbundance(orderByAbundance: boolean): void {
    this._orderByAbundance = orderByAbundance;
    this.updateTable();
    this.saveState();
  }
}
