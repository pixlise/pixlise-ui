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
import { Subscription } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { ContextImageService } from "src/app/services/context-image.service";
import { CSVExportItem, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption, TXTExportItem } from "../atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { DataSetService } from "src/app/services/data-set.service";
import { BeamSelection } from "src/app/models/BeamSelection";
import { DataQueryResult } from "src/app/expression-language/data-values";
import { DataExpression } from "src/app/models/Expression";

export interface DataCell {
    pmc: number;
    value: string|number;
    tooltip: string;
}

@Component({
    selector: "pmc-data-grid",
    templateUrl: "./pmc-data-grid.component.html",
    styleUrls: ["./pmc-data-grid.component.scss"],
    providers: [ContextImageService],
})
export class PMCDataGridComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    @Input() header: string = "Data Grid";
    // @Input() evaluatedExpression: DataQueryResult = null;
    @Input() expression: DataExpression = null;
    @Input() columnCount: number = 0;
    @Input() stdout: string = "";
    @Input() stderr: string = "";

    @Output() onToggleSolo = new EventEmitter();
    private _isSolo: boolean = false;

    private _values: PMCDataValue[] = null;
    private _evaluatedExpression: DataQueryResult = null;
    
    public rowCount: number = 0;
    public data: DataCell[][] = [];
    public printableResultValue: string = "";
    public isValidData: boolean = false;
    public isValidTableData: boolean = false;
    
    public minDataValue: number = 0;
    public maxDataValue: number = 0;
    public avgDataValue: number = 0;

    private _isOutputView: boolean = true;
    private _pmcToValueIdx: Map<number, {row: number; col: number;}> = new Map();

    selectedPMCs: Set<number> = new Set();
    currentSelection: SelectionHistoryItem = null;
    
    public copyIcon: string = "content_copy";

    public showAllPMCs: boolean = true;
    constructor(
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _dialog: MatDialog
    )
    {
    }

    ngOnInit()
    {
        this._selectionService.selection$.subscribe((selection) =>
        {
            this.currentSelection = selection;
            this.selectedPMCs = this._datasetService.datasetLoaded.getPMCsForLocationIndexes(Array.from(selection.beamSelection.locationIndexes), false)
        });
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get evaluatedExpression(): DataQueryResult
    {
        return this._evaluatedExpression;
    }

    @Input() set evaluatedExpression(value: DataQueryResult)
    {
        this._evaluatedExpression = value;

        this.preComputeData();
    }

    preComputeData()
    {
        this._values = this._evaluatedExpression?.resultValues?.values || [];
        if(!this.showAllPMCs)
        {
            this._values = this._values.filter((value) => !isNaN(Number(value?.value)));
        }
        this.rowCount = this.calculateRowCount();
        this.printableResultValue = this.calculatePrintableResultValue();
        this.isValidData = this.calculateIsValidData();
        this.isValidTableData = this.calculateIsValidTableData();
        this.calculateStats();
        this.calculateData();
    }

    calculateRowCount(): number
    {
        let count = this._values.length; 
        return count && this.columnCount > 0 ? Math.floor(count / this.columnCount) : 0;
    }

    calculatePrintableResultValue()
    {
        let values = this._evaluatedExpression?.resultValues;
        if(this.isValidTableData)
        {
            return values.values.map((point) => point.value).join(", ");
        }
        
        if(Array.isArray(values))
        {
            return values.map(value => JSON.stringify(value)).join("\n");
        }
        else if(typeof values === "object")
        {
            let cache = [];

            // This is a bit of a hack to get around the fact that JSON.stringify doesn't handle circular references
            return JSON.stringify(values, (key, value) =>
            {
                if(typeof value === "object" && value !== null)
                {
                    if(cache.indexOf(value) !== -1)
                    {
                        return `[${key}]`;
                    }
                    cache.push(value);
                }
                return value;
            }, 2);
        }
        else
        {
            return `${values}`;
        }
    }

    calculateIsValidData(): boolean
    {
        let values = this._evaluatedExpression?.resultValues;
        return typeof values !== "undefined" && values !== null && (!Array.isArray(values?.values) || values.values.length > 0);
    }

    calculateIsValidTableData(): boolean
    {
        let values = this.evaluatedExpression?.resultValues;
        return values instanceof PMCDataValues && values?.values?.length > 0;
    }

    calculateStats()
    {
        this.minDataValue = this._evaluatedExpression?.resultValues?.valueRange?.min || 0;
        this.maxDataValue = this._evaluatedExpression?.resultValues?.valueRange?.max || 0;

        let avgValue = null;
        let validPointCount = 0;

        let values = this._values || [];
        values.forEach((point) =>
        {
            if(typeof point.value === "number" && !point.isUndefined && !isNaN(point.value))
            {
                avgValue += point.value;
                validPointCount++;
            }
        });

        this.avgDataValue = avgValue !== null && validPointCount > 0 ? avgValue / validPointCount : 0;
    }

    private _getDataPoint(row: number, col: number): PMCDataValue
    {
        let index = row * this.columnCount + col;
        if(index >= this._values.length)
        {
            return null;
        }
        
        return this._values[index];
    }

    private _getDataPointPMC(row: number, col: number): number
    {
        return this._getDataPoint(row, col)?.pmc || null;
    }
    
    private _getDataValue(row: number, col: number): number|string
    {
        let value = this._getDataPoint(row, col)?.value;
        return [null, undefined].includes(value) ? "" : value;
    }

    private _getDataTooltip(row: number, col: number): string
    {
        let point = this._getDataPoint(row, col);
        if(point === null)
        {
            return "Undefined";
        }
        else
        {
            let roundedValue = typeof point.value === "number" ? Math.round(point.value * 1000) / 1000 : point.value;
            return `PMC: ${point.pmc}\nValue: ${point.isUndefined ? "Undefined" : roundedValue}`;
        }
    }

    calculateData()
    {
        let data: DataCell[][] = [];
        for(let rowIndex = 0; rowIndex < this.rowCount; rowIndex++)
        {
            let row: DataCell[] = [];
            for(let colIndex = 0; colIndex < this.columnCount; colIndex++)
            {
                let pmc = this._getDataPointPMC(rowIndex, colIndex);
                let value = this._getDataValue(rowIndex, colIndex);

                if(!this.showAllPMCs && isNaN(Number(value)))
                {
                    continue;
                }

                row.push({
                    pmc,
                    value,
                    tooltip: this._getDataTooltip(rowIndex, colIndex)
                });

                this._pmcToValueIdx.set(pmc, {row: rowIndex, col: colIndex});
            }
            data.push(row);
        }

        this.data = data;
    }

    get isOutputView(): boolean
    {
        return !this.stderr && this._isOutputView;
    }

    set isOutputView(value: boolean)
    {
        this._isOutputView = value;
    }

    get toggleTooltip(): string
    {
        return this.stderr ? "Fix the errors below to enable output view" : "Switch between code return output and log view";
    }

    get hoveredIndex(): number[]
    {
        if(this.isValidTableData && this._selectionService.hoverPMC !== -1 && this._pmcToValueIdx.size > 0)
        {
            let point = this._pmcToValueIdx.get(this._selectionService.hoverPMC);
            if(point !== undefined)
            {
                return [point.row, point.col];
            }
        }
        return null;
    }

    onToggleValidOnly(showAllPMCs: boolean)
    {
        this.showAllPMCs = showAllPMCs;
        this.preComputeData();
    }

    onSolo()
    {
        this._isSolo = !this._isSolo;
        this.onToggleSolo.emit(this._isSolo);
    }

    onChangeOutputMode(): void
    {
        this.isOutputView = !this.isOutputView;
    }

    onMouseEnter(row: number, col: number)
    {
        let point = this.data[row][col];
        if(point !== null && point !== undefined)
        {
            this._selectionService.setHoverPMC(point.pmc);
        }
    }

    onMouseLeave(row: number, col: number)
    {
        let point = this.data[row][col];
        if(point !== null && point !== undefined && this._selectionService.hoverPMC === point.pmc)
        {
            this._selectionService.setHoverPMC(-1);
        }
    }

    onClickPMC(row: number, col: number)
    {
        let dataset = this._datasetService.datasetLoaded;
        let pmc = this.data[row][col]?.pmc;
        let selectedLocIndex = dataset.pmcToLocationIndex.get(pmc);
        let { beamSelection, pixelSelection } = this.currentSelection;
        
        let locationIndexes = new Set(beamSelection.locationIndexes);
        if(locationIndexes.has(selectedLocIndex))
        {
            locationIndexes.delete(selectedLocIndex);
        }
        else
        {
            locationIndexes.add(selectedLocIndex);
        }

        this._selectionService.setSelection(this._datasetService.datasetLoaded, new BeamSelection(dataset, locationIndexes), pixelSelection, true);
    }

    private _copyText(text: string)
    {
        if(text && navigator?.clipboard)
        {
            navigator.clipboard.writeText(text);
            this.copyIcon = "done";
            setTimeout(() => this.copyIcon = "content_copy", 1000);
        }
    }

    onCopyOutput()
    {
        this._copyText(this.printableResultValue);
    }

    onCopyStdout()
    {
        this._copyText(this._evaluatedExpression?.stdout.trim());
    }

    onCopyStderr()
    {
        this._copyText(this._evaluatedExpression?.stderr.trim());
    }

    onExport()
    {
        if(!this._evaluatedExpression || !this.expression)
        {
            return;
        }

        let validExpressionValues = this._values.length > 0;
        let exportOptions = [
            new PlotExporterDialogOption("Expression Values .csv", validExpressionValues, false, { type: "checkbox", disabled: !validExpressionValues }),
            new PlotExporterDialogOption("Expression Output .txt", true),
        ];

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new PlotExporterDialogData(`${this.expression.name}`, `Export ${this.expression.name} Data`, exportOptions);

        const dialogRef = this._dialog.open(PlotExporterDialogComponent, dialogConfig);
        dialogRef.componentInstance.onConfirmOptions.subscribe(
            (options: PlotExporterDialogOption[])=>
            {
                let optionLabels = options.map(option => option.label);
                let csvs: CSVExportItem[] = [];
                let txts: TXTExportItem[] = [];

                if(optionLabels.indexOf("Expression Values .csv") > -1 && validExpressionValues)
                {
                    let data = this.evaluatedExpression.resultValues.values.map((point) =>
                    {
                        let roundedValue = typeof point.value === "number" ? Math.round(point.value * 10000) / 10000 : point.value;
                        return `"${point.pmc}",${point.isUndefined ? "Undefined" : roundedValue}`;
                    });
                    let csvData = `PMC,Value\n${data.join("\n")}`;
                    csvs.push(new CSVExportItem(`${this.expression.name} Values`, csvData));
                }
                if(optionLabels.indexOf("Expression Output .txt") > -1)
                {
                    txts.push(new CSVExportItem(`${this.expression.name} Output`, this.evaluatedExpression.stdout));
                }

                dialogRef.componentInstance.onDownload([], csvs, txts);
            }
        );
    }
}