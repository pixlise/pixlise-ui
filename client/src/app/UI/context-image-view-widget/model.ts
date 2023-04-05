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

import { ReplaySubject, Subject } from "rxjs";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { SelectionService } from "src/app/services/selection.service";
import { SnackService } from "src/app/services/snack.service";
import { contextImageState, ViewStateService } from "src/app/services/view-state.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasDrawNotifier } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom /*, PanRestrictorToCenter*/ } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { LayerManager } from "src/app/UI/context-image-view-widget/layer-manager";
import { ColourScheme, IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { RGBA } from "src/app/utils/colours";
import { adjustImageRGB } from "src/app/utils/drawing";
import { ContextImageToolHost, ToolHostCreateSettings } from "./tools/tool-host";
import { DataModuleService } from "src/app/services/data-module.service";




// The guts of the context image widget - this contains all the working pieces, and exposes interfaces required by various bits

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier
{   
    private _drawTransform: PanZoom = new PanZoom();//null, null, new PanRestrictorToCenter());
    private _toolHost: ContextImageToolHost = null;

    // Context images we can show
    private _contextImageItemShowing: ContextImageItem = null;
    private _contextImageItemShowingDisplay: HTMLImageElement = null;
    private _contextImageItemShowing$ = new ReplaySubject<ContextImageItem>(1);

    private _rgbuImageLayerForScale: IColourScaleDataSource = null;

    // Settings/Layers
    private _selectionModeAdd: boolean = true; // Add or Subtract, nothing else!
    private _smoothing: boolean = true;
    private _removeTopSpecularArtifacts: boolean = true;
    private _removeBottomSpecularArtifacts: boolean = true;
    private _brightness: number = 1;
    private _colourRatioMin: number = null;
    private _colourRatioMax: number = null;
    private _rgbuChannels: string = "RGB";
    private _unselectedOpacity: number = 0.3;
    private _unselectedGrayscale: boolean = false;

    private _showPoints: boolean = true;
    private _pointColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;
    private _showPointBBox: boolean = true;
    private _pointBBoxColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;

    private _mmBeamRadius: number = 0.06; // This is currently hard coded here to a radius of 60um

    private _uiPhysicalScaleTranslation: Point = new Point(0,0);
    private _uiLayerScaleTranslation: Point = new Point(0,0);

    private _drawnLinePoints: Point[] = [];
    private _drawnLinePoints$: Subject<void> = new Subject<void>();

    private _layerManager: LayerManager = null;
    private _regionManager: RegionManager = null;

    private _highlighedLocationIdx: number = -1;

    // Drawing points with different colours per ROI
    private _drawPointColours: Map<number, RGBA> = new Map<number, RGBA>();

    constructor(
        private _contextImageVariant: string,
        toolSettings: ToolHostCreateSettings,
        private _exprService: DataExpressionService,
        private _moduleService: DataModuleService,
        private _rgbMixService: RGBMixConfigService,
        private _selService: SelectionService,
        private _datasetService: DataSetService,
        public snackService: SnackService,
        public viewStateService: ViewStateService,
        public widgetDataService: WidgetRegionDataService,
        private _diffractionService: DiffractionPeakService,
        public widgetPosition: string,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
        this._toolHost = new ContextImageToolHost(toolSettings, this);
        this._layerManager = new LayerManager(_exprService, _moduleService, _rgbMixService, widgetDataService);
        this._regionManager = new RegionManager(widgetDataService);
    }

    shutdown(): void
    {
        this._layerManager.clearDataset();
        this._regionManager.setDataset(null);
    }

    saveState(reason: string): void
    {
        console.log("context-image model saveState("+this._contextImageVariant+") called due to: "+reason);
        this.viewStateService.setContextImage(this.getViewState(), this._contextImageVariant);
    }

    private getViewState(): contextImageState
    {
        let toSave = new contextImageState(
            this._drawTransform.pan.x,
            this._drawTransform.pan.y,
            this._drawTransform.scale.x,
            this._drawTransform.scale.y,
            this._showPoints,
            this._pointColourScheme,
            this._showPointBBox,
            this._pointBBoxColourScheme,
            this._contextImageItemShowing ? this._contextImageItemShowing.path : "",
            this._smoothing ? "linear": "nearest",
            this.layerManager.getLayersAsMapLayerVisibilityToSave(),
            this.regionManager.getRegionsAsROILayerVisibilityToSave(),
            this.layerManager.elementRelativeShading,
            this._brightness,
            this._rgbuChannels,
            this._unselectedOpacity,
            this._unselectedGrayscale,
            this._colourRatioMin,
            this._colourRatioMax,
            this._removeTopSpecularArtifacts,
            this._removeBottomSpecularArtifacts
        );
        return toSave;
    }

    setViewState(state: contextImageState, contextImageMode: string, dataset: DataSet): void
    {
        if(!state)
        {
            if(contextImageMode == "map")
            {
                // We're a map view, and we don't have a previous state saved. In this special case, we have to
                // enable all maps in the layer manager
                this.layerManager.setMapMode();
            }

            // Didn't receive a saved view-state, show default image & stop here
            if(dataset.defaultContextImageIdx >= 0)
            {
                this.setContextImageShowing(dataset.contextImages[dataset.defaultContextImageIdx], false);
            }

            return;
        }

        // Set the simple vars first which won't involve fetching images and generating stuff
        this._showPoints = state.showPoints;
        if(state.pointColourScheme)
        {
            this._pointColourScheme = state.pointColourScheme;
        }
        this._showPointBBox = state.showPointBBox;
        if(state.pointBBoxColourScheme)
        {
            this._pointBBoxColourScheme = state.pointBBoxColourScheme;
        }
        this._smoothing = state.contextImageSmoothing != "nearest";
        this._removeTopSpecularArtifacts = state.removeTopSpecularArtifacts || false;
        this._removeBottomSpecularArtifacts = state.removeBottomSpecularArtifacts || false;

        this._drawTransform.scale.x = state.zoomX;
        this._drawTransform.scale.y = state.zoomY;
        this._drawTransform.pan.x = state.panX;
        this._drawTransform.pan.y = state.panY;

        this._brightness = state.brightness;
        this._rgbuChannels = state.rgbuChannels;
        this._unselectedOpacity = state.unselectedOpacity;
        this._unselectedGrayscale = state.unselectedGrayscale;
        this._colourRatioMin = state.colourRatioMin;
        this._colourRatioMax = state.colourRatioMax;
        if(!this._colourRatioMin && !this._colourRatioMax)
        {
            this._colourRatioMin = null;
            this._colourRatioMax = null;
        }

        // If we weren't given a context image file name to display, do some auto selection magic
        if(!state.contextImage && dataset.defaultContextImageIdx >= 0)
        {
            this.setContextImageShowing(dataset.contextImages[dataset.defaultContextImageIdx], false);
        }
        else
        {
            // Find the image to show
            for(let i of dataset.contextImages)
            {
                if(i.path == state.contextImage)
                {
                    this.setContextImageShowing(i, false);
                    break;
                }
            }
        }

        this.layerManager.viewStateLoaded(state.mapLayers);
        this.regionManager.viewStateLoaded(state.roiLayers);

        this.layerManager.elementRelativeShading = state.elementRelativeShading;
    }

    get contextImageItemShowing$(): Subject<ContextImageItem>
    {
        return this._contextImageItemShowing$;
    }

    get toolHost(): ContextImageToolHost
    {
        return this._toolHost;
    }

    // CanvasDrawNotifier
    needsDraw$: Subject<void> = new Subject<void>();

    // IContextImageModel
    get layerManager(): LayerManager
    {
        return this._layerManager;
    }

    get regionManager(): RegionManager
    {
        return this._regionManager;
    }

    get dataset(): DataSet
    {
        return this._datasetService.datasetLoaded;
    }

    get selectionService(): SelectionService
    {
        return this._selService;
    }

    // snackService is public

    get transform(): PanZoom
    {
        return this._drawTransform;
    }

    get contextImageItemShowing(): ContextImageItem
    {
        return this._contextImageItemShowing;
    }

    get contextImageItemShowingDisplay(): HTMLImageElement
    {
        return this._contextImageItemShowingDisplay;
    }

    get rgbuImageLayerForScale(): IColourScaleDataSource
    {
        return this._rgbuImageLayerForScale;
    }

    get selectionModeAdd(): boolean
    {
        return this._selectionModeAdd;
    }

    get showPoints(): boolean
    {
        return this._showPoints;
    }

    get pointColourScheme(): ColourScheme
    {
        return this._pointColourScheme;
    }

    get showPointBBox(): boolean
    {
        return this._showPointBBox;
    }

    get pointBBoxColourScheme(): ColourScheme
    {
        return this._pointBBoxColourScheme;
    }

    get smoothing(): boolean
    {
        return this._smoothing;
    }

    get removeTopSpecularArtifacts(): boolean
    {
        return this._removeTopSpecularArtifacts;
    }

    get removeBottomSpecularArtifacts(): boolean
    {
        return this._removeBottomSpecularArtifacts;
    }

    get brightness(): number
    {
        return this._brightness;
    }

    get colourRatioMin(): number
    {
        return this._colourRatioMin;
    }

    get colourRatioMax(): number
    {
        return this._colourRatioMax;
    }

    get displayedChannels(): string
    {
        return this._rgbuChannels;
    }

    get uiPhysicalScaleTranslation(): Point
    {
        return this._uiPhysicalScaleTranslation;
    }

    get uiLayerScaleTranslation(): Point
    {
        return this._uiLayerScaleTranslation;
    }

    get drawnLinePoints(): Point[]
    {
        return this._drawnLinePoints;
    }

    get drawnLinePoints$(): Subject<void>
    {
        return this._drawnLinePoints$;
    }

    get elementRelativeShading(): boolean
    {
        return this.layerManager.elementRelativeShading;
    }

    get highlighedLocationIdx(): number
    {
        return this._highlighedLocationIdx;
    }

    get mmBeamRadius(): number
    {
        return this._mmBeamRadius;
    }

    // Set functions, these often require some other action, such as redrawing
    set selectionModeAdd(val: boolean)
    {
        this._selectionModeAdd = val;

        // Reactivate whatever tool we have showing, so it is now in the right mode
        this._toolHost.reactivateTool();
    }

    set showPoints(val: boolean)
    {
        this._showPoints = val;
        this.needsDraw$.next();
        this.saveState("showPoints");
    }

    set pointColourScheme(val: ColourScheme)
    {
        this._pointColourScheme = val;
        this.needsDraw$.next();
        this.saveState("pointColourScheme");
    }

    set showPointBBox(val: boolean)
    {
        this._showPointBBox = val;
        this.needsDraw$.next();
        this.saveState("showPointBBox");
    }

    set pointBBoxColourScheme(val: ColourScheme)
    {
        this._pointBBoxColourScheme = val;
        this.needsDraw$.next();
        this.saveState("pointBBoxColourScheme");
    }

    set smoothing(val: boolean)
    {
        this._smoothing = val;
        this.needsDraw$.next();
        this.saveState("smoothing");
    }

    set removeTopSpecularArtifacts(val: boolean)
    {
        this._removeTopSpecularArtifacts = val;

        // Regenerate context image with new brightness value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        
        this.needsDraw$.next();
        this.saveState("removeTopSpecularArtifacts");
    }

    set removeBottomSpecularArtifacts(val: boolean)
    {
        this._removeBottomSpecularArtifacts = val;

        // Regenerate context image with new brightness value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        
        this.needsDraw$.next();
        this.saveState("removeBottomSpecularArtifacts");
    }


    set brightness(val: number)
    {
        this._brightness = val;

        // Regenerate context image with new brightness value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        //this.contextImageItemShowing$.next(this._contextImageItemShowing);

        this.needsDraw$.next();
        this.saveState("brightness");
    }


    set colourRatioMin(val: number)
    {
        this._colourRatioMin = val;

        // Regenerate context image with new brightness value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();

        this.needsDraw$.next();
        this.saveState("colourRatioMin");
    }

    set colourRatioMax(val: number)
    {
        this._colourRatioMax = val;

        // Regenerate context image with new brightness value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();

        this.needsDraw$.next();
        this.saveState("colourRatioMax");
    }

    set displayedChannels(val: string)
    {
        // We support combinations of R,G,B,U as 3 characters: RGB, RBU, BBB
        // We also support a ratio of the channels, eg: R/B, U/V
        if(val.length != 3)
        {
            console.error("displayedChannels called with invalid channel list: \""+val+"\"");
            return;
        }

        this._rgbuChannels = val;

        // Regenerate context image with new channels value
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();

        this.needsDraw$.next();

        this.saveState("displayedChannels");
    }

    set elementRelativeShading(val: boolean)
    {
        this.layerManager.elementRelativeShading = val;
        this.needsDraw$.next();
        this.saveState("elementRelativeShading");
    }

    set uiPhysicalScaleTranslation(pt: Point)
    {
        this._uiPhysicalScaleTranslation = pt;
    }

    set uiLayerScaleTranslation(pt: Point)
    {
        this._uiLayerScaleTranslation = pt;
    }

    set highlighedLocationIdx(val: number)
    {
        this._highlighedLocationIdx = val;
    }

    setBeamRadius(mm: number)
    {
        this._mmBeamRadius = mm;
    }

    clearDrawnLinePoints(): void
    {
        this._drawnLinePoints = [];

        // Need to ensure the other map views listening are notified
        this._drawnLinePoints$.next();
    }

    addDrawnLinePoint(pt: Point): void
    {
        this._drawnLinePoints.push(pt);

        // Need to ensure the other map views listening are notified
        this._drawnLinePoints$.next();
    }

    get unselectedOpacity(): number
    {
        return this._unselectedOpacity;
    }

    get unselectedGrayscale(): boolean
    {
        return this._unselectedGrayscale;
    }

    set unselectedOpacity(val: number)
    {
        this._unselectedOpacity = val;

        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        this.needsDraw$.next();
    }

    set unselectedGrayscale(val: boolean)
    {
        this._unselectedGrayscale = val;

        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        this.needsDraw$.next();
    }

    notifyPixelSelectionChanged(): void
    {
        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
        this.needsDraw$.next();
    }

    setContextImageShowing(showingImage: ContextImageItem, saveState: boolean = true)
    {
        if(showingImage)
        {
            console.log("setContextImageShowing: \""+showingImage.path+"\", Image: "+((showingImage.rgbuSourceImage || showingImage.rgbSourceImage) ? "LOADED": "EMPTY"));
        }
        else
        {
            console.log("setContextImageShowing: None (hidden)");
        }

        // if image is the same as shown, ignore
        let currImg = this._contextImageItemShowing ? this._contextImageItemShowing.path : "";
        let newImg = showingImage ? showingImage.path : "";

        // Save the context image
        this._contextImageItemShowing = showingImage;

        // Set the dataset to use the right set of beam locations - we may have some specifically for this image if it's beam aligned
        if(showingImage && showingImage.hasBeamData)
        {
            this._datasetService.datasetLoaded.selectBeamIJBank(showingImage.beamIJIndex);
        }

        if(this._contextImageItemShowing && !this._contextImageItemShowing.rgbuSourceImage && !this._contextImageItemShowing.rgbSourceImage)
        {
            // Load the image!
            console.log("Lazy loading context image: "+showingImage.path+"...");

            let loadID = this._loadingSvc.add(showingImage.path);
            if(showingImage.path.endsWith("tif"))
            {
                this._datasetService.loadRGBUImage(showingImage.path).subscribe(
                    (rgbu: RGBUImage)=>
                    {
                        this._contextImageItemShowing.rgbuSourceImage = rgbu;
                        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
                        this.contextImageItemShowing$.next(this._contextImageItemShowing);
                        this._loadingSvc.remove(loadID);

                        if(currImg != newImg && saveState)
                        {
                            this.saveState("set-image-rgb");
                        }
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);

                        console.error("Error when loading context image: "+showingImage.path);
                        console.error(err);
                    }
                );
            }
            else
            {
                this._datasetService.loadImage(showingImage.path).subscribe(
                    (img: HTMLImageElement)=>
                    {
                        // Set the value on the original item in the dataset
                        this._contextImageItemShowing.rgbSourceImage = img;
                        this._contextImageItemShowingDisplay = this.makeDisplayContextImage();

                        // Notify our subscribers
                        this.contextImageItemShowing$.next(this._contextImageItemShowing);
                        this._loadingSvc.remove(loadID);

                        if(currImg != newImg && saveState)
                        {
                            this.saveState("set-image-rgbu");
                        }
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);

                        console.error("Error when loading context image: "+showingImage.path);
                        console.error(err);
                    }
                );
            }
        }
        else
        {
            // Was already loaded, nothing to do!
            this._contextImageItemShowingDisplay = this.makeDisplayContextImage();
            this.contextImageItemShowing$.next(this._contextImageItemShowing);

            if(currImg != newImg && saveState)
            {
                this.saveState("set-image");
            }
        }
    }

    private makeDisplayContextImage(): HTMLImageElement
    {
        this._rgbuImageLayerForScale = null;

        if(this._contextImageItemShowing)
        {
            // If current image has a source RGBU image, we do conversion to RGB, otherwise we're just multiplying the source
            // image pixels for brightness adjustment
            if(this._contextImageItemShowing.rgbuSourceImage)
            {
                let selection = this._selService.getCurrentSelection();
                let rgbuImageResult = this._contextImageItemShowing.rgbuSourceImage.generateRGBDisplayImage(
                    this._brightness,
                    this._rgbuChannels,
                    false,
                    this._unselectedOpacity,
                    this._unselectedGrayscale,
                    selection.pixelSelection,
                    this._colourRatioMin,
                    this._colourRatioMax,
                    selection.cropSelection,
                    this._removeTopSpecularArtifacts,
                    this._removeBottomSpecularArtifacts,
                );

                this._rgbuImageLayerForScale = rgbuImageResult.layerForScale;
                return rgbuImageResult.image;
            }
            else if(this._contextImageItemShowing.rgbSourceImage)
            {
                return adjustImageRGB(this._contextImageItemShowing.rgbSourceImage, this._brightness);
            }
        }

        // Couldn't generate anything...
        return null;
    }

    setPointDrawROIs(pmcColours: Map<number, RGBA>): void
    {
        // Empty map draws as normal, but a map with PMC->colours forces our
        // point drawing to use those colours
        this._drawPointColours = pmcColours;
        this.needsDraw$.next();
    }

    get drawPointColours(): Map<number, RGBA>
    {
        return this._drawPointColours;
    }
}
