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
import { Observable, Subscription, combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { ElementColumnPickerComponent, ElementColumnPickerDialogData } from "src/app/UI/atoms/expression-list/layer-settings/element-column-picker/element-column-picker.component";
import { ExpressionEditorComponent, ExpressionEditorConfig } from "src/app/UI/expression-editor/expression-editor.component";
import { ColourRamp } from "src/app/utils/colours";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { CanvasExportItem, CSVExportItem, generatePlotImage, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../../plot-exporter-dialog/plot-exporter-dialog.component";
import { DataSetService } from "src/app/services/data-set.service";
import { ClientSideExportGenerator } from "src/app/UI/atoms/export-data-dialog/client-side-export";
import { ContextImageService } from "src/app/services/context-image.service";
import { ExportDrawer } from "src/app/UI/context-image-view-widget/drawers/export-drawer";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";
import { TaggingService } from "src/app/services/tagging.service";
import { generateExportCSVForExpression } from "src/app/services/export-data.service";
import { Router } from "@angular/router";
import { DataModuleService } from "src/app/services/data-module.service";
import { EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { LiveLayerConfig } from "../expression-list.component";


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
            if(DataExpressionId.getPredefinedQuantExpressionDetector(id) == detectorFilter)
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

    @Input() isModule: boolean = false;

    @Input() isCurrentlyOpen: boolean = false;
    @Input() isInstalledModule: boolean = false;
    @Input() showSlider: boolean;
    @Input() showSettings: boolean;
    @Input() showShare: boolean;
    @Input() showDelete: boolean;
    @Input() showDownload: boolean;
    @Input() showColours: boolean;
    @Input() showVisible: boolean;
    @Input() showPureSwitch: boolean;
    @Input() showTagPicker: boolean;
    @Input() showSplitScreenButton: boolean;
    @Input() showPreviewButton: boolean;
    
    @Input() detectors: string[] = [];
    
    @Input() activeIcon: string;
    @Input() inactiveIcon: string;

    @Input() isPreviewMode: boolean = false;
    @Input() isSidePanel: boolean = false;
    @Input() isSplitScreen: boolean = false;

    @Input() customOptions: LiveLayerConfig = null;

    @Output() visibilityChange = new EventEmitter();
    @Output() onLayerImmediateSelection = new EventEmitter();
    @Output() colourChange = new EventEmitter();
    @Output() openSplitScreen = new EventEmitter();
    @Output() onDeleteEvent = new EventEmitter();

    private _isPureElement: boolean = false;
    private _expressionElement: string = "";

    constructor(
        private _router: Router,
        private _exprService: DataExpressionService,
        private _moduleService: DataModuleService,
        private _authService: AuthenticationService,
        private _datasetService: DataSetService,
        private _contextImageService: ContextImageService,
        private _widgetDataService: WidgetRegionDataService,
        private _taggingService: TaggingService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        this._isPureElement = false;
        this._expressionElement = DataExpressionId.getPredefinedQuantExpressionElement(this.layerInfo.layer.id);
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

    get isBuiltIn(): boolean
    {
        return this.layerInfo?.layer?.id?.startsWith("builtin-") || false;
    }

    get customIcon(): string
    {
        return this.customOptions?.icon || "";
    }

    get customIconTooltip(): string
    {
        return this.customOptions?.iconTooltip || "";
    }

    get customSideColour(): string
    {
        return this.customOptions?.sideColour || "";
    }

    get tagType(): string
    {
        return this.customOptions?.tagType || "expression";
    }

    get labelColour(): string
    {
        let colour = this.customOptions?.labelColour || "$clr-gray-10";
        return this.layerInfo?.layer?.isOutOfDate ? "#FC8D59" : colour;
    }

    get showSettingsButton(): boolean
    {
        if(!this.showSettings)
        {
            return false;
        }

        // If we are a predefined expression and NOT an element, we don't show this
        // this is for things like chisq and unquantified weight%
        if(DataExpressionId.isPredefinedExpression(this.layerInfo.layer.id) && this._expressionElement.length <= 0)
        {
            return false;
        }

        return true;
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
        return this.sharedBy !== null && this.layerInfo.layer.source.creator.user_id !== this._authService.getUserID();
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

    get expressionCommentsHover(): string
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

                return expr.comments;
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

    get minLabelTextWidth(): string
    {
        return Math.min(this.labelToShow.length, 10) + "ch";
    }

    get labelsWidth(): string
    {
        let layerWidth = 273;
        let buttonIconsWidth = this.visibleLayerButtons.length * 33;
        if(this.hiddenLayerButtons.length > 0)
        {
            buttonIconsWidth += 33;
        }

        let availableSpace = layerWidth - buttonIconsWidth;

        return this.isSidePanel ? `${availableSpace > 0 ? availableSpace : 50}px` : "calc(35vw - 48px - 230px)";
    }

    get commentWidth(): string
    {
        return this.isSidePanel ? "180px" : "calc(35vw - 48px - 230px)";
    }

    get isPixlangExpression(): boolean
    {
        let isDataExpression = this.layerInfo?.layer?.source && this.layerInfo.layer.source instanceof DataExpression;
        return isDataExpression && (this.layerInfo.layer.source as DataExpression).sourceLanguage === EXPR_LANGUAGE_PIXLANG;
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
        let detector = DataExpressionId.getPredefinedQuantExpressionDetector(this.layerInfo.layer.id);

        let allIDs = [this.layerInfo.layer.id, ...this.layerInfo.subLayerIDs];
        for(let id of allIDs)
        {
            // Select if it has the right ID and the inverse pure state that we (still) have stored
            let elem = DataExpressionId.getPredefinedQuantExpressionElement(id);
            let state = periodicTableDB.getElementOxidationState(elem);
            if(
                state &&
                DataExpressionId.getPredefinedQuantExpressionDetector(id) === detector &&
                this._isPureElement !== state.isElement
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
            if(this.isSidePanel)
            {
                this.onDeleteEvent.emit(this.layerInfo.layer.id);
            }
            else
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

    onSplitScreen(event): void
    {
        if(this.isModule)
        {
            this._moduleService.getLatestModuleVersion(this.layerInfo.layer.id).subscribe((latestVersion) =>
            {
                this.openSplitScreen.emit({ id: this.layerInfo.layer.id, version: latestVersion.version.version, isModule: true });
            });
        }
        else
        {
            this.openSplitScreen.emit({ id: this.layerInfo.layer.id, version: null, isModule: false });
        }
    }

    private _navigateToCodeEditor(id: string, version: string = null): void
    {
        if(version)
        {
            this._router.navigateByUrl("/", {skipLocationChange: true}).then(()=>
                this._router.navigate(["dataset", this._datasetService.datasetIDLoaded, "code-editor", id], {queryParams: { version }})
            );
        }
        else
        {
            this._router.navigateByUrl("/", {skipLocationChange: true}).then(()=>
                this._router.navigate(["dataset", this._datasetService.datasetIDLoaded, "code-editor", id])
            );
        }
    }

    private openCodeModal(allowEdit: boolean): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.panelClass = "panel";

        if(this.isModule)
        {
            this._moduleService.getLatestModuleVersion(this.layerInfo.layer.id).subscribe((latestVersion) =>
            {
                let convertedModule = latestVersion.convertToExpression();   
                dialogConfig.data = new ExpressionEditorConfig(convertedModule, allowEdit, false, false, !this.isPreviewMode);
                this.dialog.open(ExpressionEditorComponent, dialogConfig);
            });
        }
        else
        {
            this._exprService.getExpressionAsync(this.layerInfo.layer.id).subscribe(expression =>
            {
                dialogConfig.data = new ExpressionEditorConfig(expression, allowEdit, false, false, !this.isPreviewMode);
                this.dialog.open(ExpressionEditorComponent, dialogConfig);
            });
        }
    }

    onPreview(event): void
    {
        this.openCodeModal(!this.isSharedByOtherUser);
    }

    protected onExpressionSettings(event): void
    {
        let allowEdit = this.showSettings && !this.layerInfo.layer.source.shared && !this.isSharedByOtherUser && !this.isPreviewMode;
        if(this.isModule)
        {
            this._moduleService.getLatestModuleVersion(this.layerInfo.layer.id).subscribe((latestVersion) =>
            {
                this._navigateToCodeEditor(this.layerInfo.layer.id, latestVersion.version.version);
            });
        }
        else if(allowEdit || this.isPreviewMode)
        {
            this._navigateToCodeEditor(this.layerInfo.layer.id);
        }
        else
        {
            this.openCodeModal(allowEdit);
        }
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

    get tooltipText(): string
    {
        let outOfDateWarning = this.layerInfo.layer.isOutOfDate ? "\n\n***Expression has module updates available***" : "";
        return `${this.labelToShow}:\n\t${this.expressionCommentsHover}${outOfDateWarning}`;
    }

    get selectedTagIDs(): string[]
    {
        return this.layerInfo.layer.source.tags || [];
    }

    onTagSelectionChanged(tagIDs: string[]): void
    {
        if(this.isModule)
        {
            this._moduleService.updateTags(this.layerInfo.layer.id, tagIDs).subscribe(() => null,
                () => alert("Failed to update module tags")
            );
        }
        else
        {
            this._exprService.updateTags(this.layerInfo.layer.id, tagIDs).subscribe(() => null,
                () => alert("Failed to update expression tags")
            );
        }
    }

    get showDetectorPicker(): boolean
    {
        // We only show the option to pick a detector if the current quantification has multiple detectors.
        // This can be determined from the expression service
        return this.detectors.length > 1;
    }
 
    get selectedDetector(): string
    {
        return DataExpressionId.getPredefinedQuantExpressionDetector(this.layerInfo.layer.id);
    }

    get layerButtons(): string[]
    {
        let buttons: Record<string, boolean> = {
            showDetectorPicker: this.showDetectorPicker,
            showDelete: this.showDelete && !this.isSharedByOtherUser,
            showDownload: this.showDownload,
            showShare: this.showShare && !this.sharedBy,
            showTagPicker: this.showTagPicker,
            showPixlangConvert: this.isPixlangExpression,
            showPreviewButton: this.showPreviewButton && !this.isCurrentlyOpen,
            showSplitScreenButton: this.showSplitScreenButton && !this.isCurrentlyOpen && (this.isModule || this.isSplitScreen),
            showSettingsButton: this.showSettingsButton && !this.isCurrentlyOpen,
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

    onConvertToLua(): void
    {
        this._exprService.convertToLua(this.layerInfo.layer.id, true).subscribe(
            (luaExpression: object)=>
            {
                console.log(`Successfully Converted to Lua: ${(luaExpression as DataExpression)?.id}}`);
                return;
            },
            (err)=>
            {
                alert("Failed to convert to Lua");
            }
        );
    }
    
    onChangeDetector(detector: string)
    {
        // Work out the ID to show. Note if we're already showing this detector, we switch to the other one
        let showLayerID = DataExpressionId.getExpressionWithoutDetector(this.layerInfo.layer.id)+"("+detector+")";
        if(this.layerInfo.layer.id == showLayerID && this.layerInfo.subLayerIDs.length > 0)
        {
            // Find one that matches without detector... that's the one to show
            let idWithoutDetector = DataExpressionId.getExpressionWithoutDetector(showLayerID);
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
                            generateExportCSVForExpression([this.layerInfo.layer.id], PredefinedROIID.AllPoints, datasetId, this._widgetDataService).pipe(
                                map(
                                    (csvData)=>
                                    {
                                        return new CSVExportItem("Expression Values for dataset "+datasetId, csvData);
                                    }
                                )
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
