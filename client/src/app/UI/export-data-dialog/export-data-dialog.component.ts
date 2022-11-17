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
import * as JSZip from "jszip";
import { Subscription } from "rxjs";
import { QuantificationLayer, QuantificationSummary } from "src/app/models/Quantifications";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeak, DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
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
    fileNamePlaceholder: string = "";
    state: string = "download";
    prompt: string = "";

    public isGlobal: boolean = true;

    minHeight: number = 0;

    //rois: ROISavedItem[] = [];
    private _selectedROIs: string[] = [];

    quants: ExportQuantChoice[] = [];
    private _selectedQuantId: string = "";

    private _selectedExpressionIds: string[] = [];

    private _closed = false;

    private _allPeaks: DiffractionPeak[] = [];

    private _rois = new Map<string, ROISavedItem>();

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
        this.fileNamePlaceholder = `${this._datasetService.datasetLoaded.getId()} - Data Export`;
    }

    ngOnInit(): void
    {
        // Refresh, someone may have shared one for example!
        this._roiService.refreshROIList();
        this._quantService.refreshQuantList();

        this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._rois = rois;
            }
        );
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

    checkDisabled(id: string): boolean
    {
        return (id === "rois" && !this.hasSelectedROIs) || (id === "ui-roi-expressions" && !this.hasExpressions);
    }

    get visibleChoices(): ExportDataChoice[]
    {
        return this.data.choices.filter(choice => choice.isGlobalOption === this.isGlobal);
    }

    onToggleChoice(choice: ExportDataChoice): void
    {
        if(!this.checkDisabled(choice.id))
        {
            choice.enabled = !choice.enabled;
        }
    }

    onToggleGlobal(): void
    {
        this.isGlobal = !this.isGlobal;
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

    get roiNameTooltip(): string
    {
        if(this._selectedROIs.length === 0)
        {
            return "No regions selected";
        }
        else
        {
            return this._selectedROIs.map((roiID) => this._rois.get(roiID).name).join("\n");
        }
    }

    get expressionNameTooltip(): string
    {
        if(this._selectedExpressionIds.length === 0)
        {
            return "No expressions selected";
        }
        else
        {
            return this._selectedExpressionIds.map((id) =>
            {
                let expression = this._exprService.getExpression(id);
                return expression ? expression.name : id;
            }).join("\n");
        }
    }

    get dataProductCount(): number
    {
        let count = 0;

        let weightedChoices = {
            "raw-spectra": 3,
            "ui-roi-expressions": this._selectedExpressionIds.length
        };

        this.visibleChoices.forEach((choice) =>
        {
            if(choice.enabled)
            {
                count += weightedChoices[choice.id] || 1;
            }
        });

        return count;
    }

    exportExpressionValues(id: string): string
    {
        let queryData: RegionDataResults = this._widgetDataService.getData([new DataSourceParams(id, PredefinedROIID.AllPoints)], false);

        if(queryData.error)
        {
            throw new Error(`Failed to query CSV data for expression: ${id}. ${queryData.error}`);
        }

        let csv: string = "PMC,Value\n";
        queryData.queryResults[0].values.values.forEach(({pmc, value, isUndefined})=>
        {
            csv += `${pmc},${isUndefined ? "" : value}\n`;
        });

        return csv;
    }

    onExport(): void
    {
        if(this._closed)
        {
            return;
        }

        let fileName = this.fileName.length <= 0 ? this.fileNamePlaceholder : this.fileName;
        if(!fileName.endsWith(".zip"))
        {
            fileName += ".zip";
        }

        let selectedIds: string[] = [];
        let locallyComputedIds: string[] = [];

        for(let choice of this.visibleChoices)
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
            let zip = new JSZip();
            if(id === "ui-diffraction-peak") 
            {
                let contents = this._generateDiffractionFeaturesCSV();
                zip.folder("csvs").file("anomaly-features.csv", contents);
                // saveAs(new Blob([contents], { type: "text/plain;charset=utf-8" }), fileName.replace(".zip", "-anomaly-features.csv"));
            }
            else if(id === "ui-roi-expressions") 
            {
                this._selectedExpressionIds.forEach((id) =>
                {
                    let expression = this._exprService.getExpression(id);
                    let expressionName = expression ? expression.name : id;
                    expressionName = expressionName.replace(/\//g, "-");
                    let contents = this.exportExpressionValues(id);
                    zip.folder("csvs").file(`${expressionName}.csv`, contents);
                    // saveAs(new Blob([contents], { type: "text/plain;charset=utf-8" }), fileName.replace(".zip", `-${expressionName}.csv`));
                });
            }

            zip.generateAsync({ type:"blob" }).then((content) =>
            {
                let fileName = this.fileName ? this.fileName : this.fileNamePlaceholder;
                saveAs(content, `${fileName}-ui-data.zip`);
                this.state = "download";
                this.prompt = "";
            }).catch((err) =>
            {
                console.error(err);
                this.prompt = `Failed to generate zip file: "${err}"`;
                this.state = "error";
            });
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
