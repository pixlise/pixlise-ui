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

import { Component, ElementRef, Inject, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { saveAs } from "file-saver";
import { Subscription } from "rxjs";
import { QuantificationLayer, QuantificationSummary } from "src/app/models/Quantifications";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeak, DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ExportDataChoice, ExportDataConfig } from "src/app/UI/export-data-dialog/export-models";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { httpErrorToString } from "src/app/utils/utils";


class ExportQuantChoice
{
    constructor(
        public label: string,
        public id: string,
    )
    {
    }
}

@Component({
    selector: "app-export-data-dialog",
    templateUrl: "./export-data-dialog.component.html",
    styleUrls: ["./export-data-dialog.component.scss"]
})
export class ExportDataDialogComponent implements OnInit
{
    private _subs = new Subscription();

    @ViewChild("outerDialog") outerDialog: ElementRef;

    fileName: string = "";
    state: string = "download";
    prompt: string = "";

    minHeight: number = 0;

    //rois: ROISavedItem[] = [];
    private _selectedROIs: string[] = [];

    quants: ExportQuantChoice[] = [];
    private _selectedQuantId: string = "";

    private _selectedExpressionIds: string[] = [];

    private _closed = false;

    private _allPeaks: DiffractionPeak[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExportDataConfig,
        public dialogRef: MatDialogRef<ExportDataDialogComponent>,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _widgetDataService: WidgetRegionDataService,
        private _roiService: ROIService,
        private _exprService: DataExpressionService,
        private _diffractionService: DiffractionPeakService,
        private dialog: MatDialog
    )
    {
        this.fileName = data.fileName;
    }

    ngOnInit(): void
    {
        // Refresh, someone may have shared one for example!
        this._roiService.refreshROIList();
        this._quantService.refreshQuantList();
        /*
        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this.rois = Array.from(rois.values());
            },
            (err)=>
            {
            }
        ));
*/
        this._subs.add(this._quantService.quantificationList$.subscribe(
            (quants: QuantificationSummary[])=>
            {
                this.quants = [];

                // Add all quants to the picker
                let roiQuants = this._quantService.filterQuantificationsForROI("", quants, "complete", false, true);

                for(let quant of roiQuants)
                {
                    let name = quant.params.name;
                    if(quant.shared && quant.params.creator)
                    {
                        name += " (shared by: "+quant.params.creator.name+")";
                    }

                    this.quants.push(new ExportQuantChoice(quant.params.name, quant.jobId));
                }
            },
            (err)=>
            {
                this.quants = [];
                console.error(err);
            }
        ));

        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                if(quant)
                {
                    this._selectedQuantId = quant.quantId; // NOT: quant.summary.jobId; because this doesn't have "shared-" prepended if it's shared
                }
                else
                {
                    this._selectedQuantId = "";
                }

                this._quantService.refreshQuantList();
            }
        ));

        this._subs.add(this._diffractionService.allPeaks$.subscribe(
            (allPeaks: DiffractionPeak[])=>
            {
                this._allPeaks = allPeaks;
            }
        ));

        this._diffractionService.refreshPeakStatuses(this._datasetService.datasetIDLoaded);
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get title(): string
    {
        return this.data.title;
    }

    get showPublish(): boolean
    {
        return this.data.showPublish;
    }

    get showQuantPicker(): boolean
    {
        return this.data.showQuantPicker;
    }

    get showROIPicker(): boolean
    {
        return this.data.showROIPicker;
    }

    get showExpressionPicker(): boolean
    {
        return this.data.showExpressionPicker;
    }

    onToggleChoice(choice: ExportDataChoice): void
    {
        choice.enabled = !choice.enabled;
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
        this._closed = true;
    }

    _generateDiffractionFeaturesCSV(): string
    {
        let headers = ["id", "pmc", "effectSize", "channel", "keV", "kevStart", "kevEnd"];
        return this._allPeaks.reduce((prev, curr) => 
        {
            let currentLine = headers.map(field => curr[field]).join(",");
            return `${prev}\n${currentLine}`;
        }, headers.join(","));
    }

    onExport(): void
    {
        if(this._closed)
        {
            return;
        }

        if(this.fileName.length <= 0)
        {
            alert("Please enter a file name");
            return;
        }

        let fileName = this.fileName;
        if(!fileName.endsWith(".zip"))
        {
            fileName += ".zip";
        }

        let selectedIds: string[] = [];
        let locallyComputedIds: string[] = [];

        for(let choice of this.data.choices)
        {
            if(choice.enabled)
            {
                if(choice.id.startsWith("ui-")) 
                {
                    locallyComputedIds.push(choice.id);
                }
                else 
                {
                    selectedIds.push(choice.id);
                }
            }
        }

        if(selectedIds.length <= 0 && locallyComputedIds.length <= 0)
        {
            alert("Nothing selected to export!");
            return;
        }

        // Check if this export makes sense without a quant ID
        if(!this._selectedQuantId && (selectedIds.indexOf("quant-map-csv") > -1 || selectedIds.indexOf("unquantified-weight") > -1))
        {
            alert("No quantification loaded, but one or more requested export items require a quantification to work!");
            return;
        }

        // At this point we're going to loading state, remember the height because we want to keep dialog same size
        this.minHeight = this.outerDialog.nativeElement.clientHeight;

        this.state = "loading";
        this.prompt = "Generating and exporting files, please wait...";

        // Get the expression names, if any

        let expressionNames: string[] = [];
        for(let id of this._selectedExpressionIds)
        {
            let expr = this._exprService.getExpression(id);
            if(!expr)
            {
                expressionNames.push(id); // Didn't find the actual expression/name, still keeps it unique
            }
            else
            {
                expressionNames.push(expr.name);
            }
        }

        locallyComputedIds.forEach((id) => 
        {
            if(id === "ui-diffraction-peak") 
            {
                let contents = this._generateDiffractionFeaturesCSV();
                saveAs(new Blob([contents], { type: "text/plain;charset=utf-8" }), fileName.replace(".zip", "-anomaly-features.csv"));
            }
        });

        if(selectedIds.length > 0) 
        {
            this.data.exportGenerator.generateExport(this._datasetService.datasetIDLoaded, this._selectedQuantId, selectedIds, this._selectedROIs, this._selectedExpressionIds, expressionNames, fileName).subscribe(
                (data: Blob)=>
                {
                    if(this._closed)
                    {
                        return;
                    }

                    saveAs(data, fileName);

                    this.dialogRef.close(null);
                },
                (err)=>
                {
                    if(this._closed)
                    {
                        return;
                    }

                    this.state = "error";
                    this.prompt = httpErrorToString(err, "");
                }
            );
        } 
        else 
        {
            this.dialogRef.close(null);
        }
    }
    /*
    isActiveROI(roiID: string): boolean
    {
        return this._selectedROIs.indexOf(roiID) > -1;
    }

    onToggleROI(roiID: string)
    {
        let idx = this._selectedROIs.indexOf(roiID);
        if(idx == -1)
        {
            this._selectedROIs.push(roiID);
        }
        else
        {
            this._selectedROIs.splice(idx, 1);
        }
    }
*/
    onRegions(): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ROIPickerData(false, false, true, false, this._selectedROIs, true, true, null);

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (selectedROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(selectedROIs)
                {
                    this._selectedROIs = selectedROIs;
                }
                else
                {
                    this._selectedROIs = [];
                }
            }
        );
    }

    get hasSelectedROIs(): boolean
    {
        return this._selectedROIs.length > 0;
    }

    get selectedQuantId(): string
    {
        return this._selectedQuantId;
    }

    set selectedQuantId(val: string)
    {
        this._selectedQuantId = val;
    }

    onDownloadTab()
    {
        this.state = "download";
    }

    onPublishTab()
    {
        this.state = "publish";
    }
    
    onPublishCloserlook()
    {
        alert("Not implemented yet!");
    }

    onPublishQuant()
    {
        alert("Not implemented yet!");
    }

    get hasExpressions(): boolean
    {
        return this._selectedExpressionIds.length > 0;
    }

    onExpressions()
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        dialogConfig.data = new ExpressionPickerData("Expression", DataExpressionService.DataExpressionTypeAll, this._selectedExpressionIds, false, true, true);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (expressionIds: string[])=>
            {
                // Result should be a list of element symbol strings
                if(expressionIds && expressionIds.length > 0)
                {
                    this._selectedExpressionIds = expressionIds;
                }
                else
                {
                    this._selectedExpressionIds = [];
                }
            }
        );
    }
}
