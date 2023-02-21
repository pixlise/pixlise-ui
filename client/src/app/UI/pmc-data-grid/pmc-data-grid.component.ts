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
import { PMCDataValue } from "src/app/expression-language/data-values";
import { ContextImageService } from "src/app/services/context-image.service";
import { RegionDataResultItem } from "src/app/services/widget-region-data.service";
import { CSVExportItem, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { DataSetService } from "src/app/services/data-set.service";
import { BeamSelection } from "src/app/models/BeamSelection";

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
    @Input() evaluatedExpression: RegionDataResultItem = null;
    @Input() columnCount: number = 0;
    @Output() onToggleSolo = new EventEmitter();

    private _isSolo: boolean = false;

    selectedPMCs: Set<number> = new Set();
    currentSelection: SelectionHistoryItem = null;

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

    get rowCount(): number
    {
        let count = this.evaluatedExpression?.values?.values.length; 
        return count && this.columnCount > 0 ? Math.floor(count / this.columnCount) : 0;
    }

    get isValidData(): boolean
    {
        return this.evaluatedExpression?.values?.values.length > 0;
    }

    get minDataValue(): number
    {
        return this.evaluatedExpression?.values?.valueRange?.min || 0;
    }

    get maxDataValue(): number
    {
        return this.evaluatedExpression?.values?.valueRange?.max || 0;
    }

    get avgDataValue(): number
    {
        let avgValue = null;
        let validPointCount = 0;

        let values = this.evaluatedExpression?.values?.values || [];
        values.forEach((point) =>
        {
            if(typeof point.value === "number" && !point.isUndefined)
            {
                avgValue += point.value;
                validPointCount++;
            }
        });

        return avgValue !== null && validPointCount > 0 ? avgValue / validPointCount : 0;
    }

    get hoveredIndex(): number[]
    {
        if(this._selectionService.hoverPMC !== -1 && this.evaluatedExpression?.values)
        {
            let index = this.evaluatedExpression.values.values.findIndex((point) => point.pmc === this._selectionService.hoverPMC);
            if(index !== -1)
            {
                let row = Math.floor(index / this.columnCount);
                let col = index % this.columnCount;
                return [row, col];
            }
        }
        return null;
    }

    getDataPoint(row: number, col: number): PMCDataValue
    {
        let index = row * this.columnCount + col;
        if(index >= this.evaluatedExpression.values.values.length)
        {
            return null;
        }
        
        return this.evaluatedExpression.values.values[index];
    }

    getDataPointPMC(row: number, col: number): number
    {
        return this.getDataPoint(row, col)?.pmc || null;
    }
    
    getDataValue(row: number, col: number): number|string
    {
        let value = this.getDataPoint(row, col)?.value;
        return [null, undefined].includes(value) ? "" : value;
    }

    getDataTooltip(row: number, col: number): string
    {
        let point = this.getDataPoint(row, col);
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

    onSolo()
    {
        this._isSolo = !this._isSolo;
        this.onToggleSolo.emit(this._isSolo);
    }

    onMouseEnter(row: number, col: number)
    {
        let point = this.getDataPoint(row, col);
        if(point !== null)
        {
            this._selectionService.setHoverPMC(point.pmc);
        }
    }

    onMouseLeave(row: number, col: number)
    {
        let point = this.getDataPoint(row, col);
        if(point !== null && this._selectionService.hoverPMC === point.pmc)
        {
            this._selectionService.setHoverPMC(-1);
        }
    }

    onClickPMC(row: number, col: number)
    {
        let dataset = this._datasetService.datasetLoaded;
        let pmc = this.getDataPointPMC(row, col);
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

    onExport()
    {
        if(!this.evaluatedExpression)
        {
            return;
        }

        let exportOptions = [
            new PlotExporterDialogOption("Expression Values .csv", true),
        ];

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new PlotExporterDialogData(`${this.evaluatedExpression.expressionName}`, `Export ${this.evaluatedExpression.expressionName} Data`, exportOptions);

        const dialogRef = this._dialog.open(PlotExporterDialogComponent, dialogConfig);
        dialogRef.componentInstance.onConfirmOptions.subscribe(
            (options: PlotExporterDialogOption[])=>
            {
                let optionLabels = options.map(option => option.label);
                let csvs: CSVExportItem[] = [];

                if(optionLabels.indexOf("Expression Values .csv") > -1)
                {
                    let data = this.evaluatedExpression.values.values.map((point) =>
                    {
                        let roundedValue = typeof point.value === "number" ? Math.round(point.value * 10000) / 10000 : point.value;
                        return `"${point.pmc}",${point.isUndefined ? "Undefined" : roundedValue}`;
                    });
                    let csvData = `PMC,Value\n${data.join("\n")}`;
                    csvs.push(new CSVExportItem(`${this.evaluatedExpression.expressionName} Values`, csvData));
                }

                dialogRef.componentInstance.onDownload([], csvs);
            });

    }
}
