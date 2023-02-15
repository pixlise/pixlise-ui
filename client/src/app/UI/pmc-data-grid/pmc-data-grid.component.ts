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

    constructor(
        private _dialog: MatDialog
    )
    {
    }

    get rowCount(): number
    {
        let count = this.evaluatedExpression.values.values.length; 
        return this.columnCount > 0 ? Math.floor(count / this.columnCount) : 0;
    }

    get minDataValue(): number
    {
        return this.evaluatedExpression.values.valueRange.min;
    }

    get maxDataValue(): number
    {
        return this.evaluatedExpression.values.valueRange.max;
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

    getDataPoint(row: number, col: number): PMCDataValue
    {
        let index = row * this.columnCount + col;
        if(index >= this.evaluatedExpression.values.values.length)
        {
            return null;
        }
        
        return this.evaluatedExpression.values.values[index];
    }
    

    getDataValue(row: number, col: number): number|string
    {
        return this.getDataPoint(row, col)?.value || "";
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
            return `PMC: ${point.pmc}\nValue: ${point.isUndefined ? "Undefined" : point.value}`;
        }
    }

    ngOnInit()
    {
        
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onSolo()
    {
        this._isSolo = !this._isSolo;
        this.onToggleSolo.emit(this._isSolo);
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
                        return `"${point.pmc}",${point.isUndefined ? "Undefined" : point.value}`;
                    });
                    let csvData = `PMC,Value\n${data.join("\n")}`;
                    csvs.push(new CSVExportItem(`${this.evaluatedExpression.expressionName} Values`, csvData));
                }

                dialogRef.componentInstance.onDownload([], csvs);
            });

    }
}
