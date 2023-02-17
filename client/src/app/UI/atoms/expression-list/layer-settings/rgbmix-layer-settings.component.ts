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

import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription, combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { RGBUImage } from "src/app/models/RGBUImage"; // for channel names, probably shouldn't be linking this though :(
import { AuthenticationService } from "src/app/services/authentication.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { RGBMixConfigService, RGBMix } from "src/app/services/rgbmix-config.service";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ExportDrawer } from "src/app/UI/context-image-view-widget/drawers/export-drawer";
import { ClientSideExportGenerator } from "src/app/UI/atoms/export-data-dialog/client-side-export";
import { httpErrorToString } from "src/app/utils/utils";
import { CanvasExportItem, CSVExportItem, generatePlotImage, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../../plot-exporter-dialog/plot-exporter-dialog.component";
import { LayerVisibilityChange } from "./layer-settings.component";
import { TaggingService } from "src/app/services/tagging.service";


export class RGBLayerInfo
{
    constructor(
        public layer: LocationDataLayerProperties,
        public redExpressionName: string, public greenExpressionName: string, public blueExpressionName: string
    )
    {
    }
}

@Component({
    selector: "rgbmix-layer-settings",
    templateUrl: "./rgbmix-layer-settings.component.html",
    styleUrls: ["./layer-settings.component.scss"]
})
export class RGBMixLayerSettingsComponent implements OnInit
{
    private _subs = new Subscription();

    @Input() layerInfo: RGBLayerInfo;
    @Input() showShare: boolean = true;
    @Input() showDelete: boolean = true;
    @Input() showDownload: boolean = false;
    @Input() showEdit: boolean = true;
    @Input() showTagPicker: boolean = true;
    @Input() activeIcon: string;
    @Input() inactiveIcon: string;

    @Output() visibilityChange = new EventEmitter();

    editMode: boolean = false;

    // For edit mode, we have a name string
    nameForSave: string = "";

    // rgbmixTooltip, generated on init
    rgbmixTooltip: string = "";

    constructor(
        private _rgbMixService: RGBMixConfigService,
        private _authService: AuthenticationService,
        private _exprService: DataExpressionService,
        private _widgetDataService: WidgetRegionDataService,
        private _datasetService: DataSetService,
        private _diffractionSource: DiffractionPeakService,
        private _contextImageService: ContextImageService,
        private _taggingService: TaggingService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        this.makeTooltip();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get label(): string
    {
        if(this.layerInfo.layer.source)
        {
            return this.layerInfo.layer.source.name;
        }
        return "";
    }

    private makeTooltip(): void
    {
        let expressionNames = [
            this.layerInfo.redExpressionName,
            this.layerInfo.greenExpressionName,
            this.layerInfo.blueExpressionName
        ];
        
        let tooltip = `${this.layerInfo.layer.name}\n\n`;
        tooltip += expressionNames.map((expressionName, i) => `${RGBUImage.channels[i]}: ${expressionName || "?"}`).join("\n");

        this.rgbmixTooltip = tooltip;
    }

    get sharedBy(): string
    {
        if(!this.layerInfo.layer.source.shared)
        {
            return null;
        }
        return this.layerInfo.layer.source.creator.name;
    }

    get isSharedByOtherUser(): boolean
    {
        if(!this.layerInfo.layer.source.shared)
        {
            return false;
        }
        return this.sharedBy != null && this.layerInfo.layer.source.creator.user_id != this._authService.getUserID();
    }

    get createdTime(): number
    {
        let t = 0;
        if(this.layerInfo.layer.source.createUnixTimeSec)
        {
            t = this.layerInfo.layer.source.createUnixTimeSec*1000;
        }
        return t;
    }

    get incompatibleWithQuant(): boolean
    {
        if(!this.layerInfo.layer.source)
        {
            return false;
        }
         
        return !this.layerInfo.layer.source.isCompatibleWithQuantification;
    }

    get rgbMix(): RGBMix
    {
        if(this.layerInfo.layer.source)
        {
            // Cast it
            let rgbMix = this.layerInfo.layer.source as RGBMix;
            return rgbMix;
        }

        return null;
    }

    get collapsedNotificationCount(): number
    {
        let notificationCount = 0;
        this.hiddenLayerButtons.forEach(button =>
        {
            if(button === "showTagPicker")
            {
                notificationCount += this.selectedTagIDs.length;
            }
        });

        return notificationCount;
    }

    get collapsedNotificationTooltipText(): string
    {
        let tooltipText = "";
        this.hiddenLayerButtons.forEach(button =>
        {
            if(button === "showTagPicker" && this.selectedTagIDs.length > 0)
            {
                tooltipText += "Tags:\n";
                tooltipText += this.selectedTagIDs.map(tagID => this._taggingService.getTagName(tagID)).join("\n");
            }
        });

        return tooltipText.length > 0 ? tooltipText : "View more options";
    }

    get layerButtons(): string[]
    {
        let buttons: Record<string, boolean> = {
            showShare: this.showShare && !this.sharedBy,
            showDelete: this.showDelete && !this.isSharedByOtherUser,
            showTagPicker: this.showTagPicker,
            showDownload: this.showDownload,
            showEdit: this.showEdit,
        };
        return Object.entries(buttons).filter(([, visible]) => visible).map(([layerButtonName]) => layerButtonName);
    }

    get visibleLayerButtons(): string[]
    {
        return this.showMoreButtonVisible ? this.layerButtons.slice(this.layerButtons.length - 3, this.layerButtons.length) : this.layerButtons;
    }

    get showMoreButtonVisible(): boolean
    {
        return this.layerButtons.length > 4;
    }

    get hiddenLayerButtons(): string[]
    {
        return this.layerButtons.slice(0, this.layerButtons.length - 3);
    }

    get selectedTagIDs(): string[]
    {
        return this.layerInfo.layer.source.tags || [];
    }

    onTagSelectionChanged(tagIDs: string[]): void
    {
        this._rgbMixService.updateTags(this.layerInfo.layer.id, tagIDs).subscribe(() => null,
            () => alert("Failed to update tags")
        );
    }


    onShare(): void
    {
        if(confirm("Are you sure you want to share this RGB mix?"))
        {
            this._rgbMixService.shareRGBMix(this.layerInfo.layer.id).subscribe(
                ()=>null,
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to share RGB mix"));
                }
            );
        }
    }

    onDelete(): void
    {
        if(confirm("Are you sure you want to delete this RGB mix?"))
        {
            this._rgbMixService.deleteRGBMix(this.layerInfo.layer.id).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to delete RGB mix"));
                }
            );
        }
    }

    onEdit(): void
    {
        this.nameForSave = this.layerInfo.layer.source.name;
        this.editMode = true;
    }

    onSaveRGBMixEvent(event): void
    {
        if(event)
        {
            if(this.nameForSave.length <= 0)
            {
                alert("Name cannot be empty");
                return;
            }

            // Save it
            event.name = this.nameForSave;
            this._rgbMixService.editRGBMix(this.layerInfo.layer.id, event).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to edit RGB mix: "+this.nameForSave));
                }
            );
        }

        // no longer in edit mode
        this.editMode = false;
    }

    onVisibility(val: boolean): void
    {
        this.visibilityChange.emit(new LayerVisibilityChange(this.layerInfo.layer.id, val, this.layerInfo.layer.opacity, []));
    }

    get visible(): boolean
    {
        if(!this.layerInfo.layer)
        {
            return false;
        }
        return this.layerInfo.layer.visible;
    }

    exportExpressionValues(datasetId: string): Observable<string>
    {
        // TODO: Merge this with ExportDataDialogComponent.generateExportCSVForRGBMix
        let rgbMix = this._rgbMixService.getRGBMixes().get(this.layerInfo.layer.id);
        if(!rgbMix)
        {
            throw new Error("RGB mix info not found for: "+this.layerInfo.layer.id);
        }
        
        let query = [
            new DataSourceParams(rgbMix.red.expressionID, null, datasetId),
            new DataSourceParams(rgbMix.green.expressionID, null, datasetId),
            new DataSourceParams(rgbMix.blue.expressionID, null, datasetId)
        ];

        return this._widgetDataService.getData(query, false).pipe(
            map((queryResults: RegionDataResults)=>
            {
                let csv = "PMC";
                let perChanData: PMCDataValues[] = [];
                let ch = 0;

                for(let channelResult of queryResults.queryResults)
                {
                    if(channelResult.error)
                    {
                        throw new Error("Failed to find expression: "+query[ch].exprId+" for channel: "+RGBUImage.channels[ch]);
                    }

                    perChanData.push(channelResult.values);
                    csv += ","+channelResult.expressionName;

                    ch++;
                }
                csv += "\n";

                // If we didn't get 3 channels, stop here
                if(perChanData.length !== 3)
                {
                    throw new Error("Failed to generate RGB columns for RGB expression: "+this.layerInfo.layer.id);
                }

                let perChanDataNoGaps = PMCDataValues.filterToCommonPMCsOnly(perChanData);
                perChanDataNoGaps[0].values.forEach((pmcData, i)=>
                {
                    if(pmcData.pmc !== perChanDataNoGaps[1].values[i].pmc || pmcData.pmc !== perChanDataNoGaps[2].values[i].pmc)
                    {
                        throw new Error(`Failed to generate RGB CSV for rgb mix ID: ${this.layerInfo.layer.id}, mismatched PMC returned for item: ${i}`);
                    }

                    csv += `${pmcData.pmc},${pmcData.value},${perChanDataNoGaps[1].values[i].value},${perChanDataNoGaps[2].values[i].value}\n`;
                });

                return csv;
            })
        );
    }

    getCanvasOptions(options: PlotExporterDialogOption[]): string[]
    {
        let isColourScaleVisible = options.findIndex((option) => option.label == "Visible Colour Scale") > -1;
        let backgroundMode = options[options.findIndex((option) => option.label == "Background")].value;
        let exportIDs = [
            ClientSideExportGenerator.exportContextImageScanPoints,
            ClientSideExportGenerator.exportContextImageElementMap,
            `${ClientSideExportGenerator.exportExpressionPrefix}${this.layerInfo.layer.id}`,
        ];

        if(isColourScaleVisible)
        {
            exportIDs.push(ClientSideExportGenerator.exportContextImageColourScale);
        }

        if(backgroundMode === "Context Image")
        {
            exportIDs.push(ClientSideExportGenerator.exportContextImage);
        }
        else if(backgroundMode === "Black")
        {
            exportIDs.push(ClientSideExportGenerator.exportDrawBackgroundBlack);
        }

        return exportIDs;
    }

    onDownload()
    {
        let exportOptions = [
            new PlotExporterDialogOption("Background", "Context Image", true, { type: "switch", options: ["Transparent", "Context Image", "Black"] }),
            new PlotExporterDialogOption("Visible Colour Scale", true, true),
            new PlotExporterDialogOption("Web Resolution (1200x800)", true),
            new PlotExporterDialogOption("Print Resolution (4096x2160)", true),
            new PlotExporterDialogOption("Expression Values .csv", true),
        ];

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new PlotExporterDialogData(`${this._datasetService.datasetLoaded.getId()} - ${this.label}`, `Export ${this.label}`, exportOptions, true);

        const dialogRef = this.dialog.open(PlotExporterDialogComponent, dialogConfig);

        dialogRef.componentInstance.onPreviewChange.subscribe((options: PlotExporterDialogOption[]) =>
        {
            let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);
            let exportIDs = this.getCanvasOptions(options);

            let preview: HTMLCanvasElement = null;
            if(options.findIndex((option) => option.label === "Web Resolution (1200x800)" || option.label === "Print Resolution (4096x2160)") > -1)
            {
                preview = generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, exportIDs);
            }
            else
            {
                preview = generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, []);
            }

            dialogRef.componentInstance.updatePreview(preview);
        });

        dialogRef.componentInstance.onConfirmOptions.subscribe(
            (options: PlotExporterDialogOption[])=>
            {
                let canvases: CanvasExportItem[] = [];
                let csvs$: Observable<CSVExportItem>[] = [];

                let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);
                let exportIDs = this.getCanvasOptions(options);

                if(options.findIndex((option) => option.label === "Web Resolution (1200x800)") > -1)
                {
                    canvases.push(new CanvasExportItem(
                        "Web Resolution",
                        generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 1200, 800, false, false, exportIDs)
                    ));   
                }

                if(options.findIndex((option) => option.label === "Print Resolution (4096x2160)") > -1)
                {
                    canvases.push(new CanvasExportItem(
                        "Print Resolution",
                        generatePlotImage(drawer, this._contextImageService.mdl.transform, [], 4096, 2160, false, false, exportIDs)
                    ));   
                }

                if(options.findIndex((option) => option.label == "Expression Values .csv") > -1)
                {
                    // Export CSV
                    // Loop through all sub-datasets of this one if there are any
                    let subDatasetIDs = this._datasetService.datasetLoaded.getSubDatasetIds();
                    if(subDatasetIDs.length <= 0)
                    {
                        // Specify a blank one
                        subDatasetIDs = [""];
                    }

                    for(let datasetId of subDatasetIDs)
                    {
                        csvs$.push(
                            this.exportExpressionValues(datasetId).pipe(
                                map((csv: string)=>
                                {
                                    return new CSVExportItem("Expression Values - "+datasetId, csv);
                                })
                            )
                        );
                    }
                }

                let csvsFinished$ = combineLatest(csvs$);
                return csvsFinished$.subscribe(
                    (csvItems: CSVExportItem[])=>
                    {
                        dialogRef.componentInstance.onDownload(canvases, csvItems);
                    }
                );
            });

        return dialogRef.afterClosed();
    }
}