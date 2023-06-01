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

import { Component, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DetectorConfig, MinMax } from "src/app/models/BasicTypes";
import { BeamSelection } from "src/app/models/BeamSelection";
import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { LayoutService } from "src/app/services/layout.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { SnackService } from "src/app/services/snack.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasDrawer, InteractiveCanvasComponent } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { makeDrawer } from "src/app/UI/context-image-view-widget/drawers/drawer-factory";
import { LayerChangeInfo } from "src/app/UI/context-image-view-widget/layer-manager";
import { ContextImageModel } from "src/app/UI/context-image-view-widget/model";
import { RegionChangeInfo } from "src/app/UI/context-image-view-widget/region-manager";
import { ContextImageToolId } from "src/app/UI/context-image-view-widget/tools/base-context-image-tool";
import { ToolButtonState, ToolHostCreateSettings } from "src/app/UI/context-image-view-widget/tools/tool-host";
import { makeDataForExpressionList } from "src/app/models/ExpressionList";
import { ROIService } from "src/app/services/roi.service";
import { DataModuleService } from "src/app/services/data-module.service";
import { AuthenticationService } from "src/app/services/authentication.service";


@Component({
    selector: ViewStateService.widgetSelectorContextImage,
    templateUrl: "./context-image-view-widget.component.html",
    styleUrls: ["./context-image-view-widget.component.scss"],
    providers: [
        SnackService,
        //ContextImageService,
    ],
})
export class ContextImageViewWidgetComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();
    private _modelSubs = new Subscription();

    @ViewChild(InteractiveCanvasComponent) child: InteractiveCanvasComponent;

    @Input() widgetPosition: string = "";
    @Input() mode: string = "analysis";
    @Input() previewExpressionIDs: string[] = [];

    soloView: boolean = false;
    showBottomToolbar: boolean = true;
    showFoldDownPanelButtons: boolean = true;

    // Public so html can access it
    mdl: ContextImageModel = null;
    drawer: CanvasDrawer = null;
    toolButtons: ToolButtonState[];
    cursorShown: string;
    allowSwitchingTools: boolean = true;

    private _keyItems: KeyItem[] = [];

    private _viewInited: boolean = false;

    constructor(
        private datasetService: DataSetService,
        private contextImageService: ContextImageService,
        private snackService: SnackService,
        private layoutService: LayoutService,
        private exprService: DataExpressionService,
        private moduleService: DataModuleService,
        private rgbMixService: RGBMixConfigService,
        private viewStateService: ViewStateService,
        private selectionService: SelectionService,
        private widgetDataService: WidgetRegionDataService,
        private envService: EnvConfigurationService,
        public dialog: MatDialog,
        private _loadingSvc: LoadingIndicatorService,
        private _roiService: ROIService,
        private _authService: AuthenticationService
    )
    {
        //console.warn('ContextImageViewWidgetComponent ['+this.id+'] constructor, got service: '+contextImageService.getId());
    }

    ngOnInit()
    {
        // Decide how we init the context image. We have distinct modes for each tab.
        // This may work better with a redesign (using inheritance/composition), but for now this makes sense and is quite readable
        let showLineDrawTool = true;
        let showNavTools = true;
        let showPMCTool = false;
        let showSelectionTools = true;
        let showPhysicalScale = true;
        let showMapColourScale = true;

        if(this.mode == "analysis")
        {
        }
        else if(this.mode == "map")
        {
            this.showFoldDownPanelButtons = false;
            showMapColourScale = false;
        }
        else if(this.mode == "engineering")
        {
            showPMCTool = true;
            this.showFoldDownPanelButtons = false;
            showMapColourScale = false;
        }
        else
        {
            let err = "Unknown context image mode specified: "+this.mode;
            //alert(err);
            console.error(err);
            return;
        }

        // NOTE: no matter what, if we're showing as a solo view or in preview mode, we hide any buttons that open 
        // fold-down panels under the context image
        if(this.soloView || this.isPreviewMode)
        {
            this.showFoldDownPanelButtons = false;
        }

        console.log("Creating context image model for mode: "+this.mode);
        let mdl = new ContextImageModel(
            this.mode,
            new ToolHostCreateSettings(
                showLineDrawTool,
                showNavTools,
                showPMCTool,
                showSelectionTools,
                showPhysicalScale,
                showMapColourScale
            ),
            this.exprService,
            this.moduleService,
            this.rgbMixService,
            this.selectionService,
            this.datasetService,
            this.snackService,
            this.viewStateService,
            this.widgetDataService,
            this.widgetPosition,
            this._loadingSvc,
            this._authService
        );
        this.contextImageService.setModel(mdl);

        // Listen for models from the context image service
        this._subs.add(this.contextImageService.mdl$.subscribe(
            ()=>
            {
                this.setModel(this.contextImageService.mdl);
            }
        ));
        
        if(this.contextImageService.mdl.widgetPosition === "top0")
        {
            this.allowSwitchingTools = false;
        }

        // This is needed to sync ROI visibility in solo view (or a second context image widget) because the region manager is instantiated after
        // the visibilty was toggled, so doesn't capture the original change request
        this._subs.add(this._roiService.roi$.subscribe((rois) =>
        {
            rois.forEach(roi =>
            {
                let roiShowing = this._keyItems.findIndex((keyItem) => keyItem.id === roi.id) >= 0;
                if(roi.visible && !roiShowing)
                {
                    this.mdl.regionManager.setRegionVisibility(roi.id, 1, true);
                }
            });
        }));
    }

    setModel(mdl: ContextImageModel): void
    {
        this._modelSubs.unsubscribe();
        this._modelSubs = new Subscription();

        this.mdl = mdl;
        this.toolButtons = this.mdl.toolHost.getToolButtons();

        let drawerName = "MainContextImageLayeredDrawer";
        if(this.mode == "map")
        {
            drawerName = "MapBrowserContextImageLayeredDrawer";
        }

        this.drawer = makeDrawer(drawerName, /*'',*/ this.mdl.toolHost, this.mdl);

        // Subscriptions
        // Get notified of selection changes, so we can show the selected points
        this._modelSubs.add(this.selectionService.selection$.subscribe(
            (selection: SelectionHistoryItem)=>
            {
                this.mdl.notifyPixelSelectionChanged();
                this.reDraw();
            }
        ));

        this._modelSubs.add(this.selectionService.hoverChangedReplaySubject$.subscribe(
            ()=>
            {
                // Here we only want to highlight something that has coordinates defined, so we check
                // and if it doesn't have coordinates, we ignore
                this.mdl.highlighedLocationIdx = this.selectionService.hoverLocationWithCoordsIdx;
                this.reDraw();
            }
        ));

        this._modelSubs.add(this.mdl.toolHost.toolStateChanged$.subscribe(
            ()=>
            {
                // Something changed, refresh our tools
                this.toolButtons = this.mdl.toolHost.getToolButtons();
                this.reDraw();
            }
        ));

        this._modelSubs.add(this.mdl.toolHost.activeCursor$.subscribe(
            (cursor: string)=>
            {
                // Something changed, refresh our tools
                this.cursorShown = cursor;
            }
        ));

        // Now subscribe for data we need, process when all have arrived
        let all$ = makeDataForExpressionList(
            this.datasetService,
            this.widgetDataService,
            this.exprService,
            this.rgbMixService
        );
        this._modelSubs.add(all$.subscribe(
            (data: unknown[])=>
            {
                // Only subscribe to expressions if we have preview expressions passed
                if(this.isPreviewMode)
                {
                    let validPreviewExpressions = this.previewExpressionIDs.filter(id => this.exprService.getExpression(id));
                    let exprUpdated = data[3] === "expr-updated";
                    if(validPreviewExpressions.length > 0 && exprUpdated)
                    {
                        // We can only show one visible layer on the context image, so we just show the first one
                        this.mdl.layerManager.setSingleLayerVisible(validPreviewExpressions[0]);
                        this.reDraw();

                        // Wait 100ms to ensure this is the last subscription run
                        setTimeout(() =>
                        {
                            this.mdl.layerManager.setSingleLayerVisible(validPreviewExpressions[0]);
                            this.reDraw();
                        }, 100);
                    }
                }
                this.mdl.regionManager.setDataset(data[0] as DataSet);

                // Process widget data update reason with the rest. Previously this was received either before or after notifyDataArrived causing
                // issues like visible element maps to turn off when layers list closed
                let updReason = data[3] as WidgetDataUpdateReason;

                this.mdl.regionManager.widgetDataUpdated(updReason);

                if(!this._viewInited)
                {
                    console.log("Restoring context image view ("+this.mode+")...");

                    // Shouldn't happen but print anyway if it does
                    if(!this.datasetService.datasetLoaded)
                    {
                        console.error("Context image: dataset not assigned before view state loaded. View state ignored.");
                        return;
                    }

                    let state = this.widgetDataService.viewState.contextImages.get(this.mode);
                    if(!state)
                    {
                        state = null;
                    }

                    this.mdl.setViewState(state, this.mode, this.datasetService.datasetLoaded);
                    this._viewInited = true;
                }
                else
                {
                    // Not the first one!
                    if(updReason == WidgetDataUpdateReason.WUPD_SELECTION)
                    {
                        // We don't update here...
                        return;
                    }
                }

                // Based on the data we received, generate a new list of expressions
                this.mdl.layerManager.notifyDataArrived(data);
            }
        ));

        this._modelSubs.add(this.mdl.transform.transformChangeComplete$.subscribe(
            (complete: boolean)=>
            {
                this.reDraw();

                if(complete)
                {
                    this.saveState("transformChangeComplete$");
                }
            },
            (err)=>
            {
            }
        ));

        this._modelSubs.add(this.mdl.layerManager.locationDataLayers$.subscribe(
            (change: LayerChangeInfo)=>
            {
                if(change.needSave)
                {
                    this.saveState("saveLayersNotification:"+change.reason);
                }
                this.reDraw();
            }
        ));

        this._modelSubs.add(this.mdl.regionManager.regions$.subscribe(
            (change: RegionChangeInfo)=>
            {
                this._keyItems = [];

                for(let region of change.regions)
                {
                    if(region.isVisible())
                    {
                        this._keyItems.push(new KeyItem(region.roi.id, region.roi.name, region.roi.colour));
                    }
                }

                if(change.needSave)
                {
                    this.saveState("saveRegionsNotification:"+change.reason);
                }
                this.reDraw();
            }
        ));

        this._modelSubs.add(this.mdl.contextImageItemShowing$.subscribe(
            (contextImgShowing: ContextImageItem) =>
            {
                // Layer manager cares because we might have switched to different beam coordinates
                this.mdl.layerManager.notifyContextImageSwitched();

                // Same with regions
                this.mdl.regionManager.notifyContextImageSwitched(contextImgShowing);

                // User changed images, might have different dimensions...
                this.recalcMinZoom();

                this.reDraw();
            }
        ));

        this._modelSubs.add(this.envService.detectorConfig$.subscribe(
            (cfg: DetectorConfig)=>
            {
                if(cfg.mmBeamRadius && cfg.mmBeamRadius > 0)
                {
                    this.mdl.setBeamRadius(cfg.mmBeamRadius);
                }
            }
        ));

        this._modelSubs.add(this.layoutService.resizeCanvas$.subscribe(
            ()=>
            {
                // If window resizes, we may be able to allow different zoom levels
                this.recalcMinZoom();
                this.reDraw();
            }
        ));
    }

    ngOnDestroy()
    {
        //console.warn('ContextImageViewWidgetComponent ['+this.id+'] ngOnDestroy');
        this._subs.unsubscribe();
        this._modelSubs.unsubscribe();
        
        this.mdl.shutdown();
    }

    ngAfterViewInit()
    {
        this.reDraw();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorContextImage;
    }

    get isPreviewMode(): boolean 
    {
        return this.previewExpressionIDs && this.previewExpressionIDs.length > 0;
    }

    onRefreshLayer(): void
    {
        let validPreviewExpressions = this.previewExpressionIDs.filter(id => this.exprService.getExpression(id));
        if(validPreviewExpressions.length > 0)
        {
            this.mdl.layerManager.setSingleLayerVisible(validPreviewExpressions[0]);
            this.reDraw();
        }
    }

    private saveState(reason: string): void
    {
        this.mdl.saveState(reason);
    }

    onBringRegionToFront(roiID: string): void
    {
        if(this.mdl && this.mdl.regionManager)
        {
            this.mdl.regionManager.bringToFront(roiID);
        }
    }

    private recalcMinZoom(): void
    {
        if(!this.mdl)
        {
            return;
        }

        let contextImgShowing = this.mdl.contextImageItemShowingDisplay;

        // if there's an image, we can limit the zoom so users can't zoom way out and make the context image tiny
        let minZoom = 1;

        if(contextImgShowing && this.mdl.transform.canvasParams)
        {
            // Whichever is larger, coordinates vs context image sizes
            let szCompareWidth = Math.max(contextImgShowing.width, this.mdl.dataset.locationPointBBox.w);
            let szCompareHeight = Math.max(contextImgShowing.height, this.mdl.dataset.locationPointBBox.h);

            let minZoomX = this.mdl.transform.canvasParams.width/szCompareWidth;
            let minZoomY = this.mdl.transform.canvasParams.height/szCompareHeight;

            // Because we're uniform scale in X/Y...
            minZoom = Math.min(minZoomX, minZoomY);
        }

        this.mdl.transform.setZoomLimits(new MinMax(minZoom, null), new MinMax(minZoom, null));
    }

    reDraw(): void
    {
        if(this.child)
        {
            this.child.triggerRedraw();
        }
    }

    onSelectTool(id: ContextImageToolId): void
    {
        this.mdl.toolHost.setTool(id);
    }

    onSelectDwellSpectra(): void
    {
        this.selectionService.setSelection(this.mdl.dataset, new BeamSelection(this.mdl.dataset, this.mdl.dataset.getDwellLocationIdxs()), null);
    }

    isSelectionModeAdd(): boolean
    {
        return this.mdl.selectionModeAdd;
    }

    onToggleSelectionMode(): void
    {
        this.mdl.selectionModeAdd = !this.mdl.selectionModeAdd;
    }

    onToggleLayersView(): void
    {
        this.viewStateService.showContextImageLayers = !this.viewStateService.showContextImageLayers;
    }

    get showContextImageLayout(): boolean
    {
        return this.viewStateService.showContextImageLayers;
    }

    get keyItems(): KeyItem[]
    {
        return this._keyItems;
    }

    onToggleImageOptionsView(): void
    {
        this.viewStateService.showContextImageOptions = !this.viewStateService.showContextImageOptions;
    }

    get showContextImageOptions(): boolean
    {
        return this.viewStateService.showContextImageOptions;
    }
}
