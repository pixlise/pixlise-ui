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

import { Component, ElementRef, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataExpression, DataExpressionService } from "src/app/services/data-expression.service";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { ElementColumnPickerComponent, ElementColumnPickerDialogData } from "src/app/UI/atoms/expression-list/layer-settings/element-column-picker/element-column-picker.component";
import { ExpressionEditorComponent, ExpressionEditorConfig } from "src/app/UI/expression-editor/expression-editor.component";
import { ColourRamp } from "src/app/utils/colours";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { CanvasExportItem, CSVExportItem, generatePlotImage, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../../plot-exporter-dialog/plot-exporter-dialog.component";
import { DataSetService } from "src/app/services/data-set.service";
import { ClientSideExportGenerator } from "src/app/UI/export-data-dialog/client-side-export";
import { ContextImageService } from "src/app/services/context-image.service";
import { ExportDrawer } from "src/app/UI/context-image-view-widget/drawers/export-drawer";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";
import { ItemTag } from "src/app/UI/tag-picker/tag-picker.component";


export class LayerInfo
{
    constructor(public layer: LocationDataLayerProperties, public subLayerIDs: string[])
    {
    }

    getAllIDs(detectorFilter: string): string[]
    {
        let allIDs = [this.layer.id, ...this.subLayerIDs];
        if(detectorFilter.length <= 0)
        {
            return allIDs;
        }

        let filteredIDs = [];
        for(let id of allIDs)
        {
            if(DataExpressionService.getPredefinedQuantExpressionDetector(id) == detectorFilter)
            {
                filteredIDs.push(id);
            }
        }

        return filteredIDs;
    }
}

export class LayerVisibilityChange
{
    constructor(
        // This was originally intended as a single id show/hide and change opacity
        public layerID: string,
        public visible: boolean,
        public opacity: number,
        // But now we've added an array of layers to hide, which can be passed in addition to the above
        // to hide these in bulk, in cases where we can do this in one operation
        public layersToHide: string[]
    )
    {
    }
}

export class LayerColourChange
{
    constructor(public layerID: string, public colourRamp: ColourRamp)
    {
    }
}

@Component({
    selector: "context-layer-settings",
    templateUrl: "./layer-settings.component.html",
    styleUrls: ["./layer-settings.component.scss"]
})
export class LayerSettingsComponent implements OnInit
{
    private _subs = new Subscription();

    @Input() layerInfo: LayerInfo;

    @Input() showSlider: boolean;
    @Input() showSettings: boolean;
    @Input() showShare: boolean;
    @Input() showDelete: boolean;
    @Input() showDownload: boolean;
    @Input() showColours: boolean;
    @Input() showVisible: boolean;
    @Input() showPureSwitch: boolean;
    @Input() showTagPicker: boolean;
    
    @Input() detectors: string[] = [];
    
    @Input() activeIcon: string;
    @Input() inactiveIcon: string;

    @Input() tags: ItemTag[] = [];

    @Output() visibilityChange = new EventEmitter();
    @Output() colourChange = new EventEmitter();

    private _isPureElement: boolean = false;
    private _expressionElement: string = "";

    selectedTagIDs: string[] = [];

    constructor(
        private _exprService: DataExpressionService,
        private _authService: AuthenticationService,
        private _datasetService: DataSetService,
        private _contextImageService: ContextImageService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        this._isPureElement = false;
        this._expressionElement = DataExpressionService.getPredefinedQuantExpressionElement(this.layerInfo.layer.id);
        let state = periodicTableDB.getElementOxidationState(this._expressionElement);
        if(state && state.isElement)
        {
            this._isPureElement = true;
        }
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get showSettingsButton(): boolean
    {
        if(!this.showSettings)
        {
            return false;
        }

        // If we are a predefined expression and NOT an element, we don't show this
        // this is for things like chisq and unquantified weight%
        if(DataExpressionService.isPredefinedExpression(this.layerInfo.layer.id) && this._expressionElement.length <= 0)
        {
            return false;
        }

        return true;
    }

    get labelToShow(): string
    {
        if(!this.layerInfo.layer)
        {
            return "";
        }
        return this.layerInfo.layer.name;
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

    get expressionHover(): string
    {
        if(this.layerInfo.layer.source)
        {
            // Cast it!
            let expr = this.layerInfo.layer.source as DataExpression;
            if(expr)
            {
                // If it's incompatible, show why
                if(!expr.isCompatibleWithQuantification)
                {
                    return "Expression is incompatible with currently loaded quantification. Elements or detectors are mismatched";
                }

                return expr.expression;
            }
        }
        return "";
    }

    get expressionComments(): string
    {
        let comments = "";
        if(this.layerInfo.layer.source)
        {
            // Cast it!
            let expr = this.layerInfo.layer.source as DataExpression;
            if(expr)
            {
                comments = expr.comments;
            }
        }

        return comments;
    }
    /*
    get expressionErrorMessage(): string
    {
        let errorMsg = "";
        if(this.layer && this.layerInfo.layer.errorMessage)
        {
            errorMsg = this.layerInfo.layer.errorMessage;
        }
        return errorMsg;
    }
*/
    get pureEnabled(): boolean
    {
        return this._isPureElement;
    }

    get incompatibleWithQuant(): boolean
    {
        if(!this.layerInfo.layer.source)
        {
            return false;
        }
         
        return !this.layerInfo.layer.source.isCompatibleWithQuantification;
    }

    onTogglePureElement(): void
    {
        // Find the expression in the sub-list that we need to mark as visible...
        let detector = DataExpressionService.getPredefinedQuantExpressionDetector(this.layerInfo.layer.id);

        let allIDs = [this.layerInfo.layer.id, ...this.layerInfo.subLayerIDs];
        for(let id of allIDs)
        {
            // Select if it has the right ID and the inverse pure state that we (still) have stored
            let elem = DataExpressionService.getPredefinedQuantExpressionElement(id);
            let state = periodicTableDB.getElementOxidationState(elem);
            if(
                state &&
                DataExpressionService.getPredefinedQuantExpressionDetector(id) == detector &&
                this._isPureElement != state.isElement
            )
            {
                this.setVisibleSubLayer(id);
                return;
            }
        }
    }

    onChangeOpacity(val: SliderValue): void
    {
        this.visibilityChange.emit(new LayerVisibilityChange(this.layerInfo.layer.id, true, val.value, []));
        //this.layerInfo.layer.opacity = val.value;
    }

    get opacity(): number
    {
        if(!this.layerInfo.layer)
        {
            return 1;
        }
        return this.layerInfo.layer.opacity;
    }

    onDelete(): void
    {
        if(confirm("Are you sure you want to delete this expression?"))
        {
            this._exprService.del(this.layerInfo.layer.id).subscribe(
                ()=>
                {
                    console.log("Deleted data expression: "+this.layerInfo.layer.expressionID);
                },
                (err)=>
                {
                    alert("Failed to delete data expression: "+this.layerInfo.layer.expressionID+" named: "+this.layerInfo.layer.name);
                }
            );
        }
    }

    onVisibility(val: boolean): void
    {
        if(!this.layerInfo)
        {
            return;
        }

        this.visibilityChange.emit(new LayerVisibilityChange(this.layerInfo.layer.id, val, this.layerInfo.layer.opacity, []));
        //this.layerInfo.layer.visible = true;
    }

    get visible(): boolean
    {
        if(!this.layerInfo)
        {
            return false;
        }
        return this.layerInfo.layer.visible;
    }

    get isPredefined(): boolean
    {
        return this._expressionElement.length > 0;
    }

    onSettings(event): void
    {
        if(this.isPredefined)
        {
            this.onElementSettings(event);
        }
        else
        {
            this.onExpressionSettings(event);
        }
    }

    protected onElementSettings(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        let allIds = this.layerInfo.getAllIDs(this.selectedDetector);

        dialogConfig.data = new ElementColumnPickerDialogData(
            allIds,
            this.layerInfo.layer.id,
            new ElementRef(event.currentTarget)
        );

        const dialogRef = this.dialog.open(ElementColumnPickerComponent, dialogConfig);
        dialogRef.afterClosed().subscribe(
            (result: string)=>
            {
                if(!result)
                {
                    // User probably cancelled
                }
                else
                {
                    this.setVisibleSubLayer(result);
                }
            }
        );
    }

    protected setVisibleSubLayer(visibleLayerID: string): void
    {
        let allIds = this.layerInfo.getAllIDs("");

        // User picked one, swap them around
        // Hide all the other layers, show chosen layer
        let idsToHide: string[] = [];
        for(let id of allIds)
        {
            if(id != visibleLayerID)
            {
                idsToHide.push(id);
            }
        }

        this.visibilityChange.emit(new LayerVisibilityChange(visibleLayerID, true, this.layerInfo.layer.opacity, idsToHide));
    }

    protected onExpressionSettings(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.panelClass = "panel";
        dialogConfig.disableClose = true;
        //dialogConfig.backdropClass = "panel";

        let toEdit = this._exprService.getExpression(this.layerInfo.layer.id);

        // We only allow editing if we were allowed to, AND if expression is NOT shared AND if it was created by our user
        dialogConfig.data = new ExpressionEditorConfig(toEdit, this.showSettings && !this.layerInfo.layer.source.shared && !this.isSharedByOtherUser);

        const dialogRef = this.dialog.open(ExpressionEditorComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (dlgResult: ExpressionEditorConfig)=>
            {
                if(!dlgResult)
                {
                    // User probably cancelled
                }
                else
                {
                    let expr = new DataExpression(toEdit.id, dlgResult.expr.name, dlgResult.expr.expression, toEdit.type, dlgResult.expr.comments, toEdit.shared, toEdit.creator);
                    this._exprService.edit(this.layerInfo.layer.id, dlgResult.expr.name, dlgResult.expr.expression, toEdit.type, dlgResult.expr.comments).subscribe(
                        ()=>
                        {
                            // Don't need to do anything, service refreshes
                        },
                        (err)=>
                        {
                            alert("Failed to save edit data expression: "+expr.name);
                        }
                    );
                }
            },
            (err)=>
            {
                alert("Error while editing data expression: "+toEdit.name);
            }
        );
    }

    onColours(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "Monochrome", null, true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_MONO_GRAY, null, "assets/colour-ramps/monochrome-gray.svg", true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_MONO_RED, null, "assets/colour-ramps/monochrome-red.svg", true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_MONO_GREEN, null, "assets/colour-ramps/monochrome-green.svg", true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_MONO_PURPLE, null, "assets/colour-ramps/monochrome-purple.svg", true));
        items.push(new PickerDialogItem(null, "Viridis", null, true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_VIRIDIS, null, "assets/colour-ramps/viridis.svg", true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_INFERNO, null, "assets/colour-ramps/inferno.svg", true));
        items.push(new PickerDialogItem(ColourRamp.SHADE_MAGMA, null, "assets/colour-ramps/magma.svg", true));

        dialogConfig.data = new PickerDialogData(false, false, false, false, items, [this.layerInfo.layer.displayValueShading], "", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (ids: string[])=>
            {
                this.colourChange.emit(new LayerColourChange(this.layerInfo.layer.id, ColourRamp[ids[0]]));
            }
        );
    }

    onShareExpression(): void
    {
        if(!this.layerInfo)
        {
            return;
        }

        if(confirm("Are you sure you want to share a copy of data expression \""+this.layerInfo.layer.name+"\" with other users?"))
        {
            this._exprService.share(this.layerInfo.layer.id).subscribe(
                (sharedId: string)=>
                {
                    // Don't need to do anything, this would force a listing...
                },
                (err)=>
                {
                    alert("Failed to share data expression: "+this.layerInfo.layer.name);
                }
            );
        }
    }

    onTagSelectionChanged(tagIDs: string[]): void
    {
        this.selectedTagIDs = tagIDs;
    }

    get showDetectorPicker(): boolean
    {
        // We only show the option to pick a detector if the current quantification has multiple detectors.
        // This can be determined from the expression service
        return this.detectors.length > 1;
    }
 
    get selectedDetector(): string
    {
        return DataExpressionService.getPredefinedQuantExpressionDetector(this.layerInfo.layer.id);
    }

    get layerButtons(): string[]
    {
        let buttons: Record<string, boolean> = {
            showDetectorPicker: this.showDetectorPicker,
            showShare: this.showShare && !this.sharedBy,
            showDelete: this.showDelete && !this.isSharedByOtherUser,
            showDownload: this.showDownload,
            showTagPicker: this.showTagPicker,
            showSettingsButton: this.showSettingsButton,
            showColours: this.showColours,
            showVisible: this.showVisible,
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
    
    onChangeDetector(detector: string)
    {
        // Work out the ID to show. Note if we're already showing this detector, we switch to the other one
        let showLayerID = DataExpressionService.getExpressionWithoutDetector(this.layerInfo.layer.id)+"("+detector+")";
        if(this.layerInfo.layer.id == showLayerID && this.layerInfo.subLayerIDs.length > 0)
        {
            // Find one that matches without detector... that's the one to show
            let idWithoutDetector = DataExpressionService.getExpressionWithoutDetector(showLayerID);
            for(let subLayerID of this.layerInfo.subLayerIDs)
            {
                if(subLayerID.startsWith(idWithoutDetector))
                {
                    // Yep, it's that case, show the other one
                    showLayerID = subLayerID;
                    break;
                }
            }
        }
        this.setVisibleSubLayer(showLayerID);
    }

    exportExpressionValues(): string
    {
        let queryData: RegionDataResults = this._widgetDataService.getData([new DataSourceParams(this.layerInfo.layer.id, PredefinedROIID.AllPoints)], false);

        if(queryData.error)
        {
            throw new Error(`Failed to query CSV data for expression: ${this.layerInfo.layer.id}. ${queryData.error}`);
        }

        let csv: string = "PMC,Value\n";
        queryData.queryResults[0].values.values.forEach(({pmc, value, isUndefined})=>
        {
            csv += `${pmc},${isUndefined ? "" : value}\n`;
        });

        return csv;
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
        dialogConfig.data = new PlotExporterDialogData(`${this._datasetService.datasetLoaded.getId()} - ${this.labelToShow}`, `Export ${this.labelToShow}`, exportOptions, true);

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
                let csvs: CSVExportItem[] = [];

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
                    csvs.push(new CSVExportItem(
                        "Expression Values",
                        this.exportExpressionValues()
                    ));  
                }

                dialogRef.componentInstance.onDownload(canvases, csvs);
            });

        return dialogRef.afterClosed();
    }
}
