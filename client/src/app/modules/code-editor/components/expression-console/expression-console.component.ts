// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { catchError, Observable, of, Subscription, switchMap, tap, throwError } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { DataQueryResult } from "src/app/expression-language/data-values";
import { DataExpression } from "src/app/generated-protos/expressions";
import { SelectionHistoryItem, SelectionService } from "src/app/modules/pixlisecore/services/selection.service";
import { invalidPMC } from "src/app/utils/utils";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { DataExporterService } from "../../../analysis/analysis.module";
import { WidgetExportData, WidgetExportDialogData, WidgetExportFile, WidgetExportRequest } from "../../../widget/components/widget-export-dialog/widget-export-model";
import { WidgetExportDialogComponent } from "../../../widget/components/widget-export-dialog/widget-export-dialog.component";
import { WidgetError } from "../../../pixlisecore/services/widget-data.service";

export interface DataCell {
  pmc: number;
  value: string | number;
  tooltip: string;
}

@Component({
  selector: "expression-console",
  templateUrl: "./expression-console.component.html",
  styleUrls: ["./expression-console.component.scss"],
  providers: [],
})
export class ExpressionConsoleComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  @Input() header: string = "Console";
  // @Input() evaluatedExpression: DataQueryResult = null;
  @Input() expression: DataExpression | null = null;
  @Input() scanId: string = "";
  @Input() columnCount: number = 0;
  @Input() stdout: string = "";
  @Input() stderr: string = "";
  @Input() loading: boolean = false;

  @Output() onToggleSolo = new EventEmitter();
  private _isSolo: boolean = false;

  private _values: PMCDataValue[] = [];
  private _evaluatedExpression: DataQueryResult | null = null;

  public rowCount: number = 0;
  public data: DataCell[][] = [];
  public printableResultValue: string = "";
  public isValidData: boolean = false;
  public isValidTableData: boolean = false;

  public minDataValue: number = 0;
  public maxDataValue: number = 0;
  public avgDataValue: number = 0;

  private _isOutputView: boolean = true;
  private _pmcToValueIdx: Map<number, { row: number; col: number }> = new Map();

  selectedPMCs: Set<number> = new Set();
  currentSelection: SelectionHistoryItem = new SelectionHistoryItem(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
  hoverIndex: number = -1;

  public copyIcon: string = "content_copy";

  public showAllPMCs: boolean = true;
  constructor(
    private _selectionService: SelectionService,
    private _exporterService: DataExporterService,
    private _dialog: MatDialog
  ) {}

  ngOnInit() {
    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        this.currentSelection = selection;
        if (this.scanId) {
          this.selectedPMCs = new Set(selection.beamSelection.getSelectedScanEntryPMCs(this.scanId));
        }
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        if (this._selectionService.hoverScanId === this.scanId) {
          this.hoverIndex = this._selectionService.hoverEntryIdx;
        } else {
          this.hoverIndex = -1;
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get evaluatedExpression(): DataQueryResult | null {
    return this._evaluatedExpression;
  }

  @Input() set evaluatedExpression(value: DataQueryResult | null) {
    if (value) {
      this._evaluatedExpression = value;
      this.preComputeData();
    } else {
      this._evaluatedExpression = null;
      this._values = [];
      this.rowCount = 0;
      this.printableResultValue = "";
      this.isValidData = false;
      this.isValidTableData = false;
      this.minDataValue = 0;
      this.maxDataValue = 0;
      this.avgDataValue = 0;
      this.data = [];
      this._pmcToValueIdx.clear();
    }
  }

  preComputeData() {
    this._values = this._evaluatedExpression?.resultValues?.values || [];
    if (!this.showAllPMCs) {
      this._values = this._values.filter(value => !isNaN(Number(value?.value)));
    }
    this.rowCount = this.calculateRowCount();
    this.printableResultValue = this.calculatePrintableResultValue();
    this.isValidData = this.calculateIsValidData();
    this.isValidTableData = this.calculateIsValidTableData();
    this.calculateStats();
    this.calculateData();
  }

  calculateRowCount(): number {
    const count = this._values.length;
    return count && this.columnCount > 0 ? Math.floor(count / this.columnCount) : 0;
  }

  calculatePrintableResultValue() {
    const values = this._evaluatedExpression?.resultValues;
    if (this.isValidTableData) {
      return values?.values?.map((point: any) => point.value).join(", ") || "";
    }

    if (Array.isArray(values)) {
      return values.map(value => JSON.stringify(value)).join("\n");
    } else if (typeof values === "object") {
      const cache: any[] = [];

      // This is a bit of a hack to get around the fact that JSON.stringify doesn't handle circular references
      return JSON.stringify(
        values,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (cache.indexOf(value) !== -1) {
              return `[${key}]`;
            }
            cache.push(value);
          }
          return value;
        },
        2
      );
    } else {
      return `${values}`;
    }
  }

  calculateIsValidData(): boolean {
    const values = this._evaluatedExpression?.resultValues;
    return typeof values !== "undefined" && values !== null && (!Array.isArray(values?.values) || values.values.length > 0);
  }

  calculateIsValidTableData(): boolean {
    const values = this.evaluatedExpression?.resultValues;
    return values instanceof PMCDataValues && values?.values?.length > 0;
  }

  calculateStats() {
    this.minDataValue = this._evaluatedExpression?.resultValues?.valueRange?.min || 0;
    this.maxDataValue = this._evaluatedExpression?.resultValues?.valueRange?.max || 0;

    let avgValue = 0;
    let validPointCount = 0;

    const values = this._values || [];
    values.forEach(point => {
      if (typeof point.value === "number" && !point.isUndefined && !isNaN(point.value)) {
        avgValue += point.value;
        validPointCount++;
      }
    });

    this.avgDataValue = avgValue !== null && validPointCount > 0 ? avgValue / validPointCount : 0;
  }

  private _getDataPoint(row: number, col: number): PMCDataValue | null {
    const index = row * this.columnCount + col;
    if (index >= this._values.length) {
      return null;
    }

    return this._values[index];
  }

  private _getDataPointPMC(row: number, col: number): number | null {
    return this._getDataPoint(row, col)?.pmc || null;
  }

  private _getDataValue(row: number, col: number): number | string {
    const value: any = this._getDataPoint(row, col)?.value;
    return [null, undefined].includes(value) ? "" : value;
  }

  private _getDataTooltip(row: number, col: number): string {
    const point = this._getDataPoint(row, col);
    if (point === null) {
      return "Undefined";
    } else {
      const roundedValue = typeof point.value === "number" ? Math.round(point.value * 1000) / 1000 : point.value;
      return `PMC: ${point.pmc}\nValue: ${point.isUndefined ? "Undefined" : roundedValue}`;
    }
  }

  calculateData() {
    const data: DataCell[][] = [];
    for (let rowIndex = 0; rowIndex < this.rowCount; rowIndex++) {
      const row: DataCell[] = [];
      for (let colIndex = 0; colIndex < this.columnCount; colIndex++) {
        const pmc = this._getDataPointPMC(rowIndex, colIndex);
        if (pmc === null) {
          continue;
        }
        const value = this._getDataValue(rowIndex, colIndex);

        if (!this.showAllPMCs && isNaN(Number(value))) {
          continue;
        }

        row.push({
          pmc,
          value,
          tooltip: this._getDataTooltip(rowIndex, colIndex),
        });

        this._pmcToValueIdx.set(pmc, { row: rowIndex, col: colIndex });
      }
      data.push(row);
    }

    this.data = data;
  }

  get isOutputView(): boolean {
    return !this.stderr && this._isOutputView;
  }

  set isOutputView(value: boolean) {
    this._isOutputView = value;
  }

  get toggleTooltip(): string {
    return this.stderr ? "Fix the errors below to enable output view" : "Switch between code return output and log view";
  }

  get hoveredIndex(): number[] {
    if (this.isValidTableData && this._selectionService.hoverEntryPMC !== invalidPMC && this._pmcToValueIdx.size > 0) {
      const point = this._pmcToValueIdx.get(this._selectionService.hoverEntryPMC);
      if (point !== undefined) {
        return [point.row, point.col];
      }
    }
    return [];
  }

  onToggleValidOnly(showAllPMCs: boolean) {
    this.showAllPMCs = showAllPMCs;
    this.preComputeData();
  }

  onSolo() {
    this._isSolo = !this._isSolo;
    this.onToggleSolo.emit(this._isSolo);
  }

  onChangeOutputMode(): void {
    this.isOutputView = !this.isOutputView;
  }

  onMouseEnter(row: number, col: number) {
    const point = this.data[row][col];
    if (point !== null && point !== undefined && this.scanId) {
      this._selectionService.setHoverEntryPMC(this.scanId, point.pmc);
    }
  }

  onMouseLeave(row: number, col: number) {
    const point = this.data[row][col];
    this._selectionService.hoverEntryPMC;
    if (point !== null && point !== undefined && this._selectionService.hoverEntryPMC === point.pmc) {
      this._selectionService.clearHoverEntry();
    }
  }

  onClickPMC(row: number, col: number) {
    const pmc = this.data[row]?.[col]?.pmc;
    if (pmc === undefined || pmc === null || !this.scanId) {
      return;
    }

    const pixelSelection = this.currentSelection.pixelSelection;
    const currentlySelected = this.currentSelection.beamSelection.getSelectedScanEntryPMCs(this.scanId);
    const newSelection = new Set(currentlySelected);
    if (newSelection.has(pmc)) {
      newSelection.delete(pmc);
    } else {
      newSelection.add(pmc);
    }

    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryPMCSets(new Map([[this.scanId, newSelection]])), pixelSelection);
  }

  private _copyText(text: string) {
    if (text && navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      this.copyIcon = "done";
      setTimeout(() => (this.copyIcon = "content_copy"), 1000);
    }
  }

  get printableStdout(): string {
    const text = this.stdout || "";
    return text.replace(/[\t]/g, "    ");
  }

  get printableStderr(): string {
    const text = this.stderr?.trim() || "";
    return text.replace(/[\t]/g, "    ");
  }

  onCopyOutput() {
    this._copyText(this.printableResultValue);
  }

  onCopyStdout() {
    this._copyText(this.stdout?.trim());
  }

  onCopyStderr() {
    this._copyText(this.stderr?.trim());
  }

  onCopy() {
    if (this.isOutputView) {
      this.onCopyOutput();
    } else if (this.printableStdout) {
      this.onCopyStdout();
    } else if (this.printableStderr) {
      this.onCopyStderr();
    }
  }

  onExport() {
    const dialogConfig = new MatDialogConfig<WidgetExportDialogData>();
    dialogConfig.data = this.getExportOptions();
    const dialogRef = this._dialog.open(WidgetExportDialogComponent, dialogConfig);
    this._subs.add(
      dialogRef.componentInstance.requestExportData
        .pipe(
          switchMap(response => this.onExportRequest(response)),
          tap(exportData => dialogRef.componentInstance.onDownload(exportData as WidgetExportData)),
          catchError(err => {
            if (dialogRef?.componentInstance?.onExportError) {
              dialogRef.componentInstance.onExportError(err);
            }
            return throwError(() => new WidgetError("Failed to export", err));
          })
        )
        .subscribe()
    );

    dialogRef.afterClosed().subscribe(() => {
      // this._exportDialogOpen = false;
    });
  }

  exportPlotData(): string {
    const data = this._values.map(point => {
      const roundedValue = typeof point.value === "number" ? Math.round(point.value * 10000) / 10000 : point.value;
      return `${point.pmc},${roundedValue}`;
    });

    return `PMC,Value\n${data.join("\n")}`;
  }

  getExpressionName(): string {
    let name = this.expression?.name || "Unsaved";
    name = name.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return name;
  }

  getExportOptions(): WidgetExportDialogData {
    let name = this.getExpressionName();

    return {
      title: `Export ${name} Expression Data`,
      defaultZipName: `${name} Expression Data Export`,
      options: [],
      dataProducts: [
        {
          id: "expressionOutput",
          name: `${name} Output .csv`,
          type: "checkbox",
          description: "Export the data produced by the evaluated expression",
          selected: true,
        },
      ],
      showPreview: false,
    };
  }

  onExportRequest(request: WidgetExportRequest): Observable<WidgetExportData> {
    if (!this._evaluatedExpression || !this.expression) {
      return of({ csvs: [] });
    }

    return new Observable<WidgetExportData>(observer => {
      let csvs: WidgetExportFile[] = [];
      if (request.dataProducts) {
        if (request.dataProducts["expressionOutput"]?.selected) {
          csvs.push({
            fileName: `${this.getExpressionName()} Output.csv`,
            data: this.exportPlotData(),
          });
        }
      }

      observer.next({ csvs });
      observer.complete();
    });
  }
}
