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
import { Observable, Subscription, combineLatest, of } from "rxjs";
import { map } from "rxjs/operators";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { QuantificationLayer, QuantificationSummary } from "src/app/models/Quantifications";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ROISavedItem } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeak, DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { ROIService } from "src/app/services/roi.service";
import { DataSourceParams, RegionData, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ExportDataChoice, ExportDataConfig } from "src/app/UI/atoms/export-data-dialog/export-models";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { httpErrorToString, makeValidFileName } from "src/app/utils/utils";
import { generateExportCSVForExpression } from "src/app/services/export-data.service";


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

    private _selectedROIs: string[] = ["AllPoints", "SelectedPoints"];

    quants: ExportQuantChoice[] = [];
    private _selectedQuantId: string = "";

    private _selectedExpressionIds: string[] = [];

    private _closed = false;

    private _allPeaks: DiffractionPeak[] = [];

    private _rois = new Map<string, ROISavedItem>();

    singleCSVPerRegion: boolean = true;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExportDataConfig,
        public dialogRef: MatDialogRef<ExportDataDialogComponent>,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _widgetDataService: WidgetRegionDataService,
        private _roiService: ROIService,
        private _exprService: DataExpressionService,
        private _diffractionService: DiffractionPeakService,
        private _rgbMixService: RGBMixConfigService,
        private _diffractionSource: DiffractionPeakService,
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
        return (id === "rois" && !this.hasSelectedExportableROIs) || (id === "ui-roi-expressions" && !this.hasExpressions);
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

    onToggleCSVPerRegion(): void
    {
        this.singleCSVPerRegion = !this.singleCSVPerRegion;
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
        this._closed = true;
    }

    private generateDiffractionFeaturesCSV(): string
    {
        let headers = ["id", "pmc", "effectSize", "channel", "keV", "kevStart", "kevEnd"];
        return this._allPeaks.reduce((prev, curr) => 
        {
            // Doesn't put " around first item...
            //let currentLine = headers.map(field => curr[field]).join(",");

            let currentLine = "\"";
            for(let c = 0; c < headers.length; c++)
            {
                if(c > 0)
                {
                    currentLine += ",";
                }

                currentLine += curr[headers[c]];

                // First one is a string
                if(c == 0)
                {
                    currentLine += "\"";
                }
            }
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
            return this._selectedROIs.map((roiID) => this._rois.get(roiID)?.name || roiID).join("\n");
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

        let totalUIROIExpressionCount = 0;
        if(this.singleCSVPerRegion)
        {
            // This is a weird case because all RGBMixes are still exported separately, but non-rgbmixes are exported as a single CSV per ROI
            let rgbMixExpressionIDs = this._selectedExpressionIds.filter((expressionID) => RGBMixConfigService.isRGBMixID(expressionID));
            totalUIROIExpressionCount += this._selectedROIs.length * (1 + rgbMixExpressionIDs.length);
        }
        else
        {
            totalUIROIExpressionCount += this._selectedROIs.length * this._selectedExpressionIds.length;
        }

        let weightedChoices = {
            "raw-spectra": 3,
            "ui-roi-expressions": totalUIROIExpressionCount,
            "rois": this._selectedROIs.filter((roi) => !["AllPoints", "SelectedPoints"].includes(roi)).length,
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

    private generateExportCSVForRGBMix(rgbMixExpressionID: string): Observable<string>
    {
        let rgbMix = this._rgbMixService.getRGBMixes().get(rgbMixExpressionID);
        if(!rgbMix)
        {
            throw new Error("RGB mix info not found for: "+rgbMixExpressionID);
        }

        let datasetId = this._datasetService.datasetIDLoaded;
        
        let expressionIDs = [rgbMix.red.expressionID, rgbMix.green.expressionID, rgbMix.blue.expressionID];
        let query = [
            new DataSourceParams(rgbMix.red.expressionID, null, datasetId),
            new DataSourceParams(rgbMix.green.expressionID, null, datasetId),
            new DataSourceParams(rgbMix.blue.expressionID, null, datasetId)
        ];

        // Form CSV header
        let csv = "\"PMC\"";

        for(let expressionID of expressionIDs)
        {
            csv += `,"${this._exprService.getExpressionShortDisplayName(expressionID, 15).name}"`;
        }

        return this._widgetDataService.getData(query, false).pipe(
            map((queryResults: RegionDataResults)=>
            {
                if(queryResults.error)
                {
                    throw new Error(`Failed to query RGB Mix: ${rgbMixExpressionID}. Error was: ${queryResults.error}`);
                }

                let allResults: PMCDataValues[] = [];
                let c = 0;
                for(let queryResult of queryResults.queryResults)
                {
                    if(queryResult.error)
                    {
                        let expressionID = expressionIDs[c];
                        throw new Error(`Failed to query for: expression: ${expressionID} for channel: ${RGBUImage.channels[c]}. Error wass: ${queryResult.error}`);
                    }

                    allResults.push(queryResult.values);
                    c++;
                }

                let perElemAndPMCData: PMCDataValues[] = PMCDataValues.filterToCommonPMCsOnly(allResults);

                // If we didn't get 3 channels, stop here
                if(perElemAndPMCData.length !== 3)
                {
                    throw new Error("Failed to generate RGB columns for RGB expression: "+rgbMixExpressionID);
                }

                perElemAndPMCData[0].values.forEach((pmcData, i)=>
                {
                    if(pmcData.pmc !== perElemAndPMCData[1].values[i].pmc || pmcData.pmc !== perElemAndPMCData[2].values[i].pmc)
                    {
                        throw new Error(`Failed to generate RGB CSV for rgb mix ID: ${rgbMixExpressionID}, mismatched PMC returned for item: ${i}`);
                    }

                    csv += `\n${pmcData.pmc},${pmcData.value},${perElemAndPMCData[1].values[i].value},${perElemAndPMCData[2].values[i].value}`;
                });

                return csv;
            })
        );
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
            let datasetIds = this._datasetService.datasetLoaded.getSubDatasetIds();
            if(datasetIds.length <= 0)
            {
                datasetIds.push("");
            }

            let csvNames: string[] = [];
            let isRGBMix: boolean[] = [];
            let csvData$: Observable<string>[] = [];

            let zip = new JSZip();
            if(id === "ui-diffraction-peak") 
            {
                let contents = this.generateDiffractionFeaturesCSV();

                csvNames.push("anomaly-features.csv");
                isRGBMix.push(false);
                csvData$.push(of(contents));
            }
            else if(id === "ui-roi-expressions") 
            {
                let exprIds = [];
                let perExprNames = [];

                if(!this.singleCSVPerRegion)
                {
                    // Loop through and generate once for each ID
                    let c = 0;
                    for(let exprId of this._selectedExpressionIds)
                    {
                        exprIds.push([exprId]);
                        perExprNames.push(expressionNames[c]);
                        c++;
                    }
                }
                else
                {
                    // We will loop once and export for all IDs
                    exprIds = [this._selectedExpressionIds];
                }

                let c = 0;
                for(let idList of exprIds)
                {
                    this._selectedROIs.forEach((roiID) => 
                    {
                        for(let datasetId of datasetIds)
                        {
                            let roi = this._rois.get(roiID);
                            let roiName = roi ? roi.name : roiID;
                            let datasetSuffix = datasetId.length > 0 ? ` - ${datasetId}` : "";
                            let expressionName = perExprNames[c];

                            // Separate out the 2 kinds of expression IDs
                            // First, deal with RGB mixes
                            let rgbMixExpressionIDs = idList.filter((expressionID) => RGBMixConfigService.isRGBMixID(expressionID));

                            let csvName = "";
                            for(let rgbMixId of rgbMixExpressionIDs)
                            {
                                let rgbMixName = this._rgbMixService.getRGBMixes().get(rgbMixId)?.name;

                                if(!this.singleCSVPerRegion)
                                {
                                    csvName = `${roiName} - ${expressionName} - ${rgbMixName}${datasetSuffix}.csv`;
                                }
                                else
                                {
                                    csvName = `${roiName} - ${rgbMixName}${datasetSuffix}.csv`;
                                }

                                csvNames.push(makeValidFileName(csvName));
                                isRGBMix.push(true);
                                csvData$.push(this.generateExportCSVForRGBMix(rgbMixId));
                            }

                            // Now expressions
                            let nonRGBMixExpressionIDs = idList.filter((expressionID) => !RGBMixConfigService.isRGBMixID(expressionID));

                            if(nonRGBMixExpressionIDs.length > 0)
                            {
                                if(!this.singleCSVPerRegion)
                                {
                                    csvName = `${roiName} - ${expressionName}${datasetSuffix}.csv`;
                                }
                                else
                                {
                                    csvName = `${roiName}${datasetSuffix}.csv`;
                                }

                                csvNames.push(makeValidFileName(csvName));
                                isRGBMix.push(false);
                                csvData$.push(generateExportCSVForExpression(nonRGBMixExpressionIDs, roiID, datasetId, this._widgetDataService));
                            }
                        }
                    });

                    c++;
                }
            }

            combineLatest(csvData$).subscribe(
                (csvDataStrings: string[])=>
                {
                    for(let c = 0; c < csvDataStrings.length; c++)
                    {
                        let csvName = csvNames[c];
                        let isRGB = isRGBMix[c];
                        let csvDataString = csvDataStrings[c];

                        if(!this.singleCSVPerRegion)
                        {
                            if(isRGB)
                            {
                                zip.folder("csvs").folder("rgbmixes").file(csvName, csvDataString);
                            }
                            else
                            {
                                zip.folder("csvs").file(csvName, csvDataString);
                            }
                        }
                        else
                        {
                            if(isRGB)
                            {
                                zip.folder("csvs").folder("rgbmixes").file(csvName, csvDataString);
                            }
                            else
                            {
                                zip.folder("csvs").file(csvName, csvDataString);
                            }
                        }
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
                },
                (err)=>
                {
                    console.error(err);
                    alert(err);
                }
            );
        });

        if(selectedIds.length > 0) 
        {
            if(selectedIds.length === 1 && selectedIds[0] === "rois" && !this.hasSelectedExportableROIs)
            {
                // Edge case: user wants to export ROIs, but only the "AllPoints" and "SelectedPoints" ROIs are selected, which are not actually ROIs
                return;
            }

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

    onRegions(): void
    {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.data = new ROIPickerData(true, false, true, false, this._selectedROIs, true, true, null);

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
        dialogRef.componentInstance.isDisplayed = false;

        dialogRef.afterClosed().subscribe(
            (selectedROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(selectedROIs)
                {
                    this._selectedROIs = selectedROIs;
                }
            }
        );
    }

    get hasSelectedROIs(): boolean
    {
        return this._selectedROIs.length > 0;
    }

    // Returns true if any of the selected ROIs are not the "AllPoints" or "SelectedPoints" ROIs
    get hasSelectedExportableROIs(): boolean
    {
        return this._selectedROIs.filter((roi) => !["AllPoints", "SelectedPoints"].includes(roi)).length > 0;
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

        dialogConfig.data = new ExpressionPickerData("Expression", this._selectedExpressionIds, false, true, true);

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
