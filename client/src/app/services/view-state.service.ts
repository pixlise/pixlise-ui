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

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, ReplaySubject, Subject } from "rxjs";
import { map, mergeMap, tap } from "rxjs/operators";
import { ColourScheme } from "src/app/UI/context-image-view-widget/model-interface";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { asResettable, ResettableType } from "src/app/utils/resettable-subject";
import { ElementSetItemLines } from "./element-set.service";
import { LayoutService } from "./layout.service";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";


export class spectrumXRFLineState
{
    constructor(
        public line_info: ElementSetItemLines,
        public visible: boolean
    )
    {
    }
}

export class energyCalibration
{
    constructor(
        public detector: string,
        public eVStart: number,
        public eVPerChannel: number
    )
    {
    }
}

export class spectrumLines
{
    constructor(
        public roiID: string,
        public lineExpressions: string[]
    )
    {
    }
}

export class spectrumWidgetState
{
    constructor(
        public panX: number,
        public panY: number,
        public zoomX: number,
        public zoomY: number,
        public spectrumLines: spectrumLines[],
        public logScale: boolean,
        public xrflines: spectrumXRFLineState[],
        public showXAsEnergy: boolean,
        public energyCalibration: energyCalibration[]
    )
    {
    }
}

export class histogramState
{
    constructor(
        public showStdDeviation: boolean,
        public logScale: boolean,
        public showWhiskers: boolean,
        public expressionIDs: string[],
        public visibleROIs: string[]
    )
    {
    }
}

export class quantificationState
{
    constructor(
        public appliedQuantID: string,
    )
    {
    }
}

export class selectionState
{
    constructor(
        public locIdxs: number[],
        public pixelSelectionImageName: string,
        public pixelIdxs: number[],
        public cropPixelIdxs: number[] = []
    )
    {
    }
}

export class chordState
{
    constructor(
        public showForSelection: boolean,
        public expressionIDs: string[],
        public displayROI: string,
        public threshold: number,
        public drawMode: string
    )
    {
    }
}

export class binaryState
{
    constructor(
        public showMmol: boolean,
        public expressionIDs: string[],
        public visibleROIs: string[]
    )
    {
    }
}

export class ternaryState
{
    constructor(
        public showMmol: boolean,
        public expressionIDs: string[],
        public visibleROIs: string[]
    )
    {
    }
}

export class tableState
{
    constructor(
        public showPureElements: boolean,
        public order: string,
        public visibleROIs: string[]
    )
    {
    }
}

export class roiQuantTableState
{
    constructor(
        public roi: string,
        public quantIDs: string[]
    )
    {
    }
}

export class variogramState
{
    constructor(
        public expressionIDs: string[],
        public visibleROIs: string[],
        public varioModel: string, // must be one of the constants in VariogramModel: varioModelExponential, varioModelSpherical, varioModelGaussian
        public maxDistance: number, // float32
        public binCount: number, // int
        public drawModeVector: boolean, // true=vector, false=isotropic
    )
    {
    }
}

export class mapLayerVisibility
{
    constructor(
        public expressionID: string,
        public opacity: number,
        public visible: boolean,
        public displayValueRangeMin: number,
        public displayValueRangeMax: number,
        public displayValueShading: ColourRamp,
    )
    {
    }
}

export class roiLayerVisibility
{
    constructor(
        public roiID: string,
        public opacity: number,
        public visible: boolean
    )
    {
    }
}

export class contextImageState
{
    constructor(
        public panX: number,
        public panY: number,
        public zoomX: number,
        public zoomY: number,
        public showPoints: boolean,
        public pointColourScheme: ColourScheme,
        public showPointBBox: boolean,
        public pointBBoxColourScheme: ColourScheme,
        public contextImage: string,
        public contextImageSmoothing: string,
        public mapLayers: mapLayerVisibility[],
        public roiLayers: roiLayerVisibility[],
        public elementRelativeShading: boolean,
        public brightness: number,
        public rgbuChannels: string,
        public unselectedOpacity: number,
        public unselectedGrayscale: boolean,
        public colourRatioMin: number,
        public colourRatioMax: number,
        public removeTopSpecularArtifacts: boolean,
        public removeBottomSpecularArtifacts: boolean
    )
    {
    }
}

export class roiDisplayState
{
    constructor(
        public roiColours: Map<string, string>
    )
    {
    }
}

export class singleAxisRGBUWidgetState
{
    constructor(
        public minerals: string[],
        public channelA: string,
        public channelB: string,
        public roiStackedOverlap: boolean
    )
    {
    }
}


export class rgbuPlotWidgetState
{
    constructor(
        public minerals: string[],
        public yChannelA: string,
        public yChannelB: string,
        public xChannelA: string,
        public xChannelB: string,
        public drawMonochrome: boolean
    )
    {
    }
}

export class rgbuImagesWidgetState
{
    constructor(
        public logColour: boolean,
        public brightness: number
    )
    {
    }
}

export class parallelogramWidgetState
{
    constructor(
        public colourChannels: string[]
    )
    {
    }
}

export class analysisLayoutState
{
    constructor(
        public topWidgetSelectors: string[],
        public bottomWidgetSelectors: string[]
    )
    {
    }
}

export class ViewState
{
    constructor(
        public analysisLayout: analysisLayoutState,

        public contextImages: Map<string, contextImageState>,
        public histograms: Map<string, histogramState>,
        public chordDiagrams: Map<string, chordState>,
        public ternaryPlots: Map<string, ternaryState>,
        public binaryPlots: Map<string, binaryState>,
        public tables: Map<string, tableState>,
        public roiQuantTables: Map<string, roiQuantTableState>,
        public variogramState: Map<string, variogramState>,
        public spectrums: Map<string, spectrumWidgetState>,
        public rgbuPlots: Map<string, rgbuPlotWidgetState>,
        public singleAxisRGBU: Map<string, singleAxisRGBUWidgetState>,
        public rgbuImages: Map<string, rgbuImagesWidgetState>,
        public parallelograms: Map<string, parallelogramWidgetState>,

        public rois: roiDisplayState,
        public quantification: quantificationState,
        public selection: selectionState
    )
    {
    }
}

export class ViewStateCollectionItem
{
    constructor(public name: string, public modifiedUnixSec: number)
    {
    }
}

export class ViewStateCollectionWire
{
    constructor(public name: string, public description: string, public viewStateIDs: string[], public viewStates: Map<string, ViewState>)
    {
    }
}

export class ReferencedIDItem
{
    constructor(public id: string, public name: string, public creator: ObjectCreator)
    {
    }
}

export class ViewStateReferencedIDs
{
    constructor(public quant: ReferencedIDItem, public ROIs: ReferencedIDItem[], public expressions: ReferencedIDItem[], public rgbMixes: ReferencedIDItem[], public nonSharedCount: number)
    {
    }
}

export class SavedViewStateSummary
{
    constructor(public id: string, public name: string, public shared: boolean, public creator: ObjectCreator)
    {
    }
}


@Injectable({
    providedIn: "root"
})
export class ViewStateService
{
    public static readonly widgetSelectorChordDiagram = "chord-view-widget";
    public static readonly widgetSelectorBinaryPlot = "binary-plot-widget";
    public static readonly widgetSelectorTernaryPlot = "ternary-plot-widget";
    public static readonly widgetSelectorQuantificationTable = "table-widget";
    public static readonly widgetSelectorHistogram = "histogram-widget";
    public static readonly widgetSelectorVariogram = "variogram-widget";
    public static readonly widgetSelectorRGBUViewer = "rgbu-viewer-widget";
    public static readonly widgetSelectorRGBUPlot = "rgbu-plot-widget";
    public static readonly widgetSelectorSingleAxisRGBU = "single-axis-rgbu-widget";
    public static readonly widgetSelectorParallelCoordinates = "parallel-coords-widget";
    public static readonly widgetSelectorSpectrum = "spectrum-widget";
    public static readonly widgetSelectorContextImage = "context-image";
    public static readonly widgetSelectorROIQuantCompareTable = "roi-quant-table-widget";

    public static readonly widgetSelectorContextImageLayers = "context-image-layer-control";
    public static readonly widgetSelectorContextImageOptions = "context-image-options";

    public static readonly widgetSelectorSpectrumRegions = "spectrum-region-picker";
    public static readonly widgetSelectorSpectrumAnnotations = "spectrum-annotations";
    public static readonly widgetSelectorSpectrumPeakID = "spectrum-peak-identification";
    public static readonly widgetSelectorSpectrumFit = "spectrum-fit";

    public static readonly AllPointsColour: RGBA = Colours.GRAY_10;
    public static readonly SelectedPointsColour: RGBA = Colours.CONTEXT_BLUE;
    public static readonly RemainingPointsColour: RGBA = Colours.CONTEXT_GREEN;

    public static readonly AllPointsLabel: string = "All Points";
    public static readonly SelectedPointsLabel: string = "Selected Points";
    public static readonly RemainingPointsLabel: string = "Remaining Points";

    private _viewState$: ResettableType<ViewState> = asResettable(()=>(new ReplaySubject<ViewState>(1)));
    private _viewState: ViewState = null;

    private _roiColours$ = new ReplaySubject<Map<string, string>>(1);
    private _appliedQuantification$ = new ReplaySubject<string>(1);

    private _datasetID: string = null;

    private _viewSelectorsAreDefaults: boolean = false;

    private _analysisViewSelectors$ = new ReplaySubject<analysisLayoutState>(1);

    private _viewSolo$ = new ReplaySubject<void>(1);

    private _savedViewStates$ = new ReplaySubject<SavedViewStateSummary[]>(1);
    private _viewStateCollections$ = new ReplaySubject<ViewStateCollectionItem[]>(1);
    private _viewStateLoaded: string = ""; // if blank, it's not a saved one that was specifically loaded

    // Analysis tab fold-out panel states:
    private _showContextImageLayers = false;
    private _showContextImageOptions = false;
    private _showPeakIdentification = false;
    private _showAnnotations = false;
    private _showSpectrumRegionPicker = false;
    private _showSpectrumFit = false;

    private _showSidePanel = false;

    // Context image layer section open states
    private _closableListsOpen: string[] = [];

    // Map view extra state info
    private _showColourScaleOnMaps = true;

    // Analysis tab "solo" view info, if nothing solo'd, these are just blank
    private _soloViewSelector = "";
    private _soloViewSourcePosition = "";

    private _resetViewForNextLoad: boolean = false;

    private _viewStateIDsToPresent: string[] = [];
    private _currentPresentedViewStateIdx: number = -1;

    private _viewStatesToPresent: ViewState[] = [];

    constructor(
        private http: HttpClient,
        private _layoutService: LayoutService,
        private _loadingSvc: LoadingIndicatorService
    )
    {
    }

    setDatasetID(datasetID: string): void
    {
        // Store this for later!
        this._datasetID = datasetID;

        // Reset view states we've sent out. This should clear
        // and behave as a normal ReplaySubject so anything created
        // after this point should receive like if we're loading a
        // new dataset
        this._viewState$.reset();
    }

    get viewState$(): Observable<ViewState>
    {
        return this._viewState$.observable;
    }

    get roiColours$(): Subject<Map<string, string>>
    {
        return this._roiColours$;
    }

    get appliedQuantification$(): Subject<string>
    {
        return this._appliedQuantification$;
    }

    get analysisViewSelectors$(): ReplaySubject<analysisLayoutState>
    {
        return this._analysisViewSelectors$;
    }

    get viewSolo$(): ReplaySubject<void>
    {
        return this._viewSolo$;
    }

    get viewStateLoaded(): string
    {
        return this._viewStateLoaded;
    }

    setResetFlag(reset: boolean): void
    {
        this._resetViewForNextLoad = reset;
    }

    // Saved view states by name
    private makeSavedViewStateURL(datasetID: string, viewStateID: string): string
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_view_state);
        apiURL += "/saved/"+datasetID;

        if(viewStateID)
        {
            apiURL += "/"+viewStateID;
        }

        return apiURL;
    }

    get savedViewStates$(): Subject<SavedViewStateSummary[]>
    {
        return this._savedViewStates$;
    }

    refreshSavedStates()
    {
        // Reload & fill the subject
        let apiURL = this.makeSavedViewStateURL(this._datasetID, null);
        this.http.get<SavedViewStateSummary[]>(apiURL, makeHeaders()).subscribe(
            (items: SavedViewStateSummary[])=>
            {
                this._savedViewStates$.next(items);
            },
            (err)=>
            {
            }
        );
    }

    saveViewState(datasetID: string, viewStateTitle: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving view state...");
        let apiURL = this.makeSavedViewStateURL(datasetID, viewStateTitle);
        let viewStateWireObj = this.makeWireViewState(this._viewState);

        // We now send up as an object with a name in it
        let data = {
            "viewState": viewStateWireObj,
            "name": viewStateTitle,
        };

        // Save it and it successful or error, refresh the list
        return this.http.put<void>(apiURL, data, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);

                    // At this point, the saved view state is what we show as "loaded", because we're showing
                    // this named view state right now
                    this._viewStateLoaded = viewStateTitle;

                    this.refreshSavedStates();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                },
            )
        );
    }

    deleteViewState(datasetID: string, viewStateTitle: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Deleting view state...");

        let apiURL = this.makeSavedViewStateURL(datasetID, viewStateTitle);
        return this.http.delete<void>(apiURL, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    renameViewState(datasetID: string, existingViewStateID: string, newViewStateID: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Renaming view state...");

        let apiURL = APIPaths.getWithHost(APIPaths.api_view_state);
        apiURL += "/saved/"+datasetID+"/"+existingViewStateID+"/rename";

        return this.http.post<void>(apiURL, newViewStateID, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                }
            )
        );
    }

    // View state collections
    private makeViewStateCollectionURL(datasetID: string, collectionID: string): string
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_view_state);
        apiURL += "/collections/"+datasetID;

        if(collectionID)
        {
            apiURL += "/"+collectionID;
        }

        return apiURL;
    }

    get viewStateCollections$(): Subject<ViewStateCollectionItem[]>
    {
        return this._viewStateCollections$;
    }

    refreshCollections()
    {
        // Reload & fill the subject
        let apiURL = this.makeViewStateCollectionURL(this._datasetID, null);
        this.http.get<ViewStateCollectionItem[]>(apiURL, makeHeaders()).subscribe(
            (collections: ViewStateCollectionItem[])=>
            {
                this._viewStateCollections$.next(collections);
            },
            (err)=>
            {
            }
        );
    }

    getCollection(id: string): Observable<ViewStateCollectionWire>
    {
        // Reload & fill the subject
        let apiURL = this.makeViewStateCollectionURL(this._datasetID, id);
        return this.http.get<object>(apiURL, makeHeaders()).pipe(
            map((result: object)=>
            {
                let viewStates = this.readMapFromObject<ViewState>(result["viewStates"]);
                    
                return new ViewStateCollectionWire(
                    result["name"],
                    result["description"],
                    result["viewStateIDs"],
                    viewStates
                );
            }
            )
        );
    }

    saveViewStateCollection(datasetID: string, collectionID: string, description: string, viewStateIDs: string[], refreshCollectionList: boolean): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving collection...");
        let apiURL = this.makeViewStateCollectionURL(datasetID, collectionID);

        // Save it and it successful or error, refresh the list
        let data = {"viewStateIDs": viewStateIDs, "name": collectionID, "description": description};

        return this.http.put<void>(apiURL, data, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    if(refreshCollectionList)
                    {
                        this.refreshCollections();
                    }
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    if(refreshCollectionList)
                    {
                        this.refreshCollections();
                    }
                },
            )
        );
    }

    // TODO: This is ugly, we should do this in the API! But this will likely hardly be used, for now
    // no time to modify the API and write tests, lets just query the collections here, add & upload
    addViewStateToCollection(datasetID: string, viewStateIDsToAdd: string[], collectionID: string): Observable<void>
    {
        // Retrieve the collection
        return this.getCollection(collectionID).pipe(
            mergeMap(
                (collection: ViewStateCollectionWire)=>
                {
                    // OK add & write it back
                    let saveList = Array.from(collection.viewStateIDs);

                    for(let viewStateIDToAdd of viewStateIDsToAdd)
                    {
                        if(saveList.indexOf(viewStateIDToAdd) < 0)
                        {
                            saveList.push(viewStateIDToAdd);
                        }
                    }

                    // No need to refresh collection list, as we didn't create a new item
                    return this.saveViewStateCollection(datasetID, collectionID, collection.description, saveList, false);
                }
            )
        );
    }

    deleteViewStateCollection(datasetID: string, collectionID: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Deleting collection...");
        let apiURL = this.makeViewStateCollectionURL(datasetID, collectionID);
        return this.http.delete<void>(apiURL, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    shareViewState(datasetID: string, viewStateID: string, autoShareFlag: boolean): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing workspace...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_view_state+"/"+datasetID+"/"+viewStateID);
        if(autoShareFlag)
        {
            apiURL += "?auto-share=true";
        }

        return this.http.post<string>(apiURL, "", makeHeaders()).pipe(
            tap(
                (ev)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                }
            )
        );
    }

    shareViewStateCollection(datasetID: string, collectionID: string): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing collection...");

        let apiURL = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_view_state+"-collection/"+datasetID+"/"+collectionID);
        return this.http.post<string>(apiURL, "", makeHeaders()).pipe(
            tap(
                (ev)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshSavedStates();
                }
            )
        );
    }

    private closeUnderContextPanels(): void
    {
        this._showContextImageLayers = false;
        this._showContextImageOptions = false;
    }

    set showContextImageLayers(val: boolean)
    {
        this.closeUnderContextPanels();
        this._showContextImageLayers = val;

        this.updateAnalysisViewSelectors();
    }

    get showContextImageLayers(): boolean
    {
        return this._showContextImageLayers;
    }

    set showContextImageOptions(val: boolean)
    {
        this.closeUnderContextPanels();
        this._showContextImageOptions = val;

        this.updateAnalysisViewSelectors();
    }

    get showContextImageOptions(): boolean
    {
        return this._showContextImageOptions;
    }

    private closeUnderSpectrumPanels(): void
    {
        this._showSpectrumRegionPicker = false;
        this._showSpectrumFit = false;
        this._showAnnotations = false;
        this._showPeakIdentification = false;
    }

    set showPeakIdentification(val: boolean)
    {
        this.closeUnderSpectrumPanels();
        this._showPeakIdentification = val;

        this.updateAnalysisViewSelectors();
    }

    get showPeakIdentification(): boolean
    {
        return this._showPeakIdentification;
    }

    set showAnnotations(val: boolean)
    {
        this.closeUnderSpectrumPanels();
        this._showAnnotations = val;

        this.updateAnalysisViewSelectors();
    }

    get showAnnotations(): boolean
    {
        return this._showAnnotations;
    }

    set showSpectrumRegionPicker(val: boolean)
    {
        this.closeUnderSpectrumPanels();
        this._showSpectrumRegionPicker = val;

        this.updateAnalysisViewSelectors();
    }

    get showSpectrumRegionPicker(): boolean
    {
        return this._showSpectrumRegionPicker;
    }

    set showSpectrumFit(val: boolean)
    {
        this.closeUnderSpectrumPanels();
        this._showSpectrumFit = val;

        this.updateAnalysisViewSelectors();
    }

    get showSpectrumFit(): boolean
    {
        return this._showSpectrumFit;
    }

    get showColourScaleOnMaps(): boolean
    {
        return this._showColourScaleOnMaps;
    }

    set showColourScaleOnMaps(val: boolean)
    {
        this._showColourScaleOnMaps = val;
    }

    get soloViewSelector(): string
    {
        return this._soloViewSelector;
    }

    get soloViewSourcePosition(): string
    {
        return this._soloViewSourcePosition;
    }

    get showSidePanel(): boolean
    {
        return this._showSidePanel;
    }

    set showSidePanel(val: boolean)
    {
        this._showSidePanel = val;

        // Resize canvases because width ratios would've changed from this
        this._layoutService.resizeCanvas$.next();
    }

    toggleSoloView(selector: string, position: string): void
    {
        // If this view is solo'd, we clear
        if(this._soloViewSelector == selector && this._soloViewSourcePosition == position)
        {
            this._soloViewSelector = "";
            this._soloViewSourcePosition = "";
        }
        else
        {
            this._soloViewSelector = selector;
            this._soloViewSourcePosition = position;
        }

        // Tell listeners solo status changed
        this._viewSolo$.next();
    }

    isSoloView(selector: string, position: string): boolean
    {
        return this._soloViewSelector == selector && this._soloViewSourcePosition == position;
    }

    private makeURL(): string
    {
        if(this._datasetID == null)
        {
            console.error("makeURL for ViewStateService failed - no dataset ID defined");
            return null;
        }

        let apiURL = APIPaths.getWithHost(APIPaths.api_view_state);

        return apiURL+"/"+this._datasetID;
    }

    loadViewState(viewStateID: string = ""): Observable<ViewState>
    {
        // Also, if we've just been given a dataset ID, update our list of saved view states in case we need this
        this.refreshSavedStates();
        this.refreshCollections();

        let apiURL = this.makeURL();
        let loadingSavedViewState = false;
        if(viewStateID.length > 0)
        {
            // We're loading a saved, named one!
            loadingSavedViewState = true;
            apiURL = this.makeSavedViewStateURL(this._datasetID, viewStateID);
        }

        // Here we request, and get back an object (parsed from JSON). We used to just use that (casted to ViewState), but now
        // that we have maps in the ViewState this was all falling apart because the maps were blank, but data was there as an object.
        // For now, lacking time to find a better solution, we download the object and manually build the maps so our runtime state
        // is more usable...
        
        // If the user is requesting we reset the view state we need to include this flag...
        if(viewStateID.length <= 0 && this._resetViewForNextLoad && !loadingSavedViewState)
        {
            apiURL += "?reset=true";

            // Clear it for next load
            this._resetViewForNextLoad = false;
        }

        return this.http.get<object>(apiURL, makeHeaders()).pipe(
            map(
                (stateWireObj: object)=>
                {
                    // If we're loading a saved view state, we'll receive the full structure, we're only interested in the viewState field
                    let state = this.readWireViewState(loadingSavedViewState ? stateWireObj["viewState"] : stateWireObj);

                    if(state.analysisLayout.bottomWidgetSelectors.length < 4)
                    {
                        // We expect 4 widgets along the bottom. If this is not so, apply defaults
                        // NOTE: That if we have an RGBU "disco" dataset, we want to show RGBU plots along the bottom
                        //       At this point we don't have this information, once dataset has loaded we will though!
                        //       For now we just remember the fact that our view state had defaults applied for the
                        //       bottom widgets
                        state.analysisLayout.bottomWidgetSelectors = [
                            ViewStateService.widgetSelectorHistogram,
                            ViewStateService.widgetSelectorChordDiagram,
                            ViewStateService.widgetSelectorBinaryPlot,
                            ViewStateService.widgetSelectorTernaryPlot
                        ];

                        this._viewSelectorsAreDefaults = true;
                    }
                    else
                    {
                        this._viewSelectorsAreDefaults = false;
                    }

                    // If we were loaded as a named view state, remember this
                    this._viewStateLoaded = viewStateID;

                    //console.log(state);
                    return state;
                }
            )
        );
    }

    // NOTE: MUST BE IN SYNC WITH makeWireViewState
    private readWireViewState(stateWireObj: object): ViewState
    {
        // If we get no widgets for the bottom, use the defaults
        let analysisLayout = stateWireObj["analysisLayout"] as analysisLayoutState;

        // If no top-right widget set, set one. This is independent of bottom area ones because of historical
        // reasons - that came first, this came later and generally want it set to spectrum anyway!
        if(!analysisLayout.topWidgetSelectors || analysisLayout.topWidgetSelectors.length <= 0)
        {
            analysisLayout.topWidgetSelectors = [ViewStateService.widgetSelectorContextImage, ViewStateService.widgetSelectorSpectrum];
        }

        // Enforce the top left widget is the context image, regardless of what's stored in the user cache
        analysisLayout.topWidgetSelectors[0] = ViewStateService.widgetSelectorContextImage;

        let spectrums = this.readMapFromObject<spectrumWidgetState>(stateWireObj["spectrums"]);

        // Backwards compatibility: Previously we only had one spectrum, and a single var for its state. Some
        // view state files will hang around in this form, so if we have an empty spectrums list, we throw the
        // one from the fixed var in there. The rest of PIXLISE can use the new list var to get spectrum states
        if(spectrums.size <= 0 && stateWireObj["spectrum"])
        {
            spectrums.set("spectrum-top1", stateWireObj["spectrum"]);
        }

        let state = new ViewState(
            analysisLayout,

            this.readMapFromObject<contextImageState>(stateWireObj["contextImages"]),
            this.readMapFromObject<histogramState>(stateWireObj["histograms"]),
            this.readMapFromObject<chordState>(stateWireObj["chordDiagrams"]),
            this.readMapFromObject<ternaryState>(stateWireObj["ternaryPlots"]),
            this.readMapFromObject<binaryState>(stateWireObj["binaryPlots"]),
            this.readMapFromObject<tableState>(stateWireObj["tables"]),
            this.readMapFromObject<roiQuantTableState>(stateWireObj["roiQuantTables"]),
            this.readMapFromObject<variogramState>(stateWireObj["variograms"]),
            spectrums,
            this.readMapFromObject<rgbuPlotWidgetState>(stateWireObj["rgbuPlots"]),
            this.readMapFromObject<singleAxisRGBUWidgetState>(stateWireObj["singleAxisRGBU"]),
            this.readMapFromObject<rgbuImagesWidgetState>(stateWireObj["rgbuImages"]),
            this.readMapFromObject<parallelogramWidgetState>(stateWireObj["parallelograms"]),

            new roiDisplayState(this.readMapFromObject<string>(stateWireObj["rois"]["roiColours"])),
            new quantificationState(stateWireObj["quantification"]["appliedQuantID"]),
            stateWireObj["selection"]
        );

        return state;
    }

    // NOTE: MUST BE IN SYNC WITH readWireViewState
    private makeWireViewState(state: ViewState): object
    {
        let result = {
            "analysisLayout": state.analysisLayout,

            "contextImages": this.writeMapToObject<contextImageState>(state.contextImages),
            "histograms": this.writeMapToObject<histogramState>(state.histograms),
            "chordDiagrams": this.writeMapToObject<chordState>(state.chordDiagrams),
            "ternaryPlots": this.writeMapToObject<ternaryState>(state.ternaryPlots),
            "binaryPlots": this.writeMapToObject<binaryState>(state.binaryPlots),
            "tables": this.writeMapToObject<tableState>(state.tables),
            "roiQuantTables": this.writeMapToObject<roiQuantTableState>(state.roiQuantTables),
            "variograms": this.writeMapToObject<variogramState>(state.variogramState),
            "spectrums": this.writeMapToObject<spectrumWidgetState>(state.spectrums),
            "rgbuPlots": this.writeMapToObject<rgbuPlotWidgetState>(state.rgbuPlots),
            "singleAxisRGBU": this.writeMapToObject<singleAxisRGBUWidgetState>(state.singleAxisRGBU),
            "rgbuImages": this.writeMapToObject<rgbuImagesWidgetState>(state.rgbuImages),
            "parallelograms": this.writeMapToObject<parallelogramWidgetState>(state.parallelograms),

            "rois": {
                "roiColours": this.writeMapToObject<string>(state.rois.roiColours)
            },
            "quantification": {
                "appliedQuantID": state.quantification.appliedQuantID
            },
            "selection": state.selection
        };

        return result;
    }

    private readMapFromObject<T>(obj: object): Map<string, T>
    {
        let result = new Map<string, T>();

        if(obj) // This outer if() may not be needed anymore... though can't hurt!
        {
            for(let [k, v] of Object.entries(obj))
            {
                result.set(k, v as T);
            }
        }

        return result;
    }

    private writeMapToObject<T>(map: Map<string, T>): object
    {
        let result = {};

        if(map) // This outer if() may not be needed anymore... though can't hurt!
        {
            for(let [k, v] of map)
            {
                result[k] = v;
            }
        }

        return result;
    }

    applyViewState(state: ViewState, isRGBUDataset: boolean = false, isHybrid: boolean = false): void
    {
        let t0 = performance.now();

        console.log("Applying view state...");
        //console.warn('applyViewState... '+JSON.stringify(state));
        this._viewState = state;

        // Since this should only really be called when a new dataset is loading, at this point we can reset our panels so we don't
        // end up stuck with opened windows to confuse people!
        this._showContextImageLayers = false;
        this._showContextImageOptions = false;

        this._showPeakIdentification = false;
        this._showAnnotations = false;
        this._showSpectrumRegionPicker = false;
        this._showSpectrumFit = false;

        this._showColourScaleOnMaps = true;

        this._soloViewSelector = "";
        this._soloViewSourcePosition = "";

        this._closableListsOpen = [];

        // If all the info we have for bottom selectors is just defaults, and we know the dataset is RGBU only
        // we show RGBU plots at the bottom
        if(this._viewSelectorsAreDefaults)
        {
            if(isRGBUDataset) 
            {
                this._viewState.analysisLayout.bottomWidgetSelectors = [
                    ViewStateService.widgetSelectorHistogram,
                    ViewStateService.widgetSelectorRGBUPlot,
                    ViewStateService.widgetSelectorRGBUPlot,
                    ViewStateService.widgetSelectorRGBUViewer
                ];

                // Set the default RGBU plot states if this is an RGBU dataset
                this.setRGBUPlotState(new rgbuPlotWidgetState(
                    [],
                    "U","B","U","R",
                    false
                ), "underspectrum0");

                this.setRGBUPlotState(new rgbuPlotWidgetState(
                    [],
                    "U","G","U","R",
                    false
                ), "underspectrum1");

                // Also set the spectrum to be a parallel coordinates plot
                this._viewState.analysisLayout.topWidgetSelectors = [ViewStateService.widgetSelectorContextImage, ViewStateService.widgetSelectorParallelCoordinates];

                // Default show the context image
                this.showContextImageOptions = true;
            }
            else if(isHybrid) 
            {
                this._viewState.analysisLayout.bottomWidgetSelectors = [
                    ViewStateService.widgetSelectorHistogram,
                    ViewStateService.widgetSelectorRGBUPlot,
                    ViewStateService.widgetSelectorRGBUPlot,
                    ViewStateService.widgetSelectorChordDiagram
                ];

                // Set the default RGBU plot states
                this.setRGBUPlotState(new rgbuPlotWidgetState(
                    [],
                    "U","B","U","R",
                    false
                ), "underspectrum0");

                this.setRGBUPlotState(new rgbuPlotWidgetState(
                    [],
                    "U","G","U","R",
                    false
                ), "underspectrum1");

                // Set top widgets to defaults
                this._viewState.analysisLayout.topWidgetSelectors = [ViewStateService.widgetSelectorContextImage, ViewStateService.widgetSelectorSpectrum];
            }
        }

        this.updateAnalysisViewSelectors();
        this.updateAppliedQuantification();
        this._roiColours$.next(this._viewState.rois.roiColours);

        // NOTE: we publish this last. This is because services can depend on view state
        // and once they get this, they will subscribe for the others, so they can expect
        // valid data straight away
        this._viewState$.subject.next(state);

        let t1 = performance.now();

        console.log("--- View state applied in "+(t1-t0).toLocaleString()+"ms ---");
        //console.log(JSON.stringify(state));
    }

    private updateAppliedQuantification(): void
    {
        this._appliedQuantification$.next(this._viewState.quantification.appliedQuantID);
    }

    private save(data: object, name: string)
    {
        // NOTE: at this point we're saving the view state for a widget, and this is likely because
        // anything we're saving has changed from whatever the last loaded view state was.
        // Therefore, forget the last loaded view state name, as that is no longer what's on screen
        this._viewStateLoaded = "";

        let apiURL = this.makeURL();
        if(!apiURL)
        {
            // Don't have a dataset yet, nothing to save
            return;
        }
        apiURL += "/"+name;

        this.http.put<void>(apiURL, data, makeHeaders()).subscribe(()=>
        {
        },
        (err)=>
        {
            console.error("Failed to save view state for: "+name);
        }
        );
    }

    startPresentationOfViewStates(collectionID: string): Observable<void>
    {
        if(!collectionID || !this._datasetID)
        {
            return null;
        }

        // Starting a new presentation, save the view states
        this._viewStateIDsToPresent = [];
        this._viewStatesToPresent = [];

        return this.getCollection(collectionID).pipe(
            map(
                (collection: ViewStateCollectionWire)=>
                {
                    // Save what we'll be presenting...
                    this._viewStateIDsToPresent = collection.viewStateIDs;
                    this._viewStatesToPresent = [];

                    // Parse each view state JSON (we form maps and other things)
                    for(let viewState of collection.viewStates.values())
                    {
                        let loadedState = this.readWireViewState(viewState);
                        this._viewStatesToPresent.push(loadedState);
                    }

                    // Set up to start from first one
                    this._currentPresentedViewStateIdx = 0;

                    // Play mode has started, we can hide the side panel at this point
                    this.showSidePanel = false;

                    // Show this one
                    this.presentViewState(this._currentPresentedViewStateIdx);

                    return;
                }
            )
        );
    }

    presentNextViewStates(): boolean
    {
        // Get the next one if possible
        if(this.isPresentingViewStates() && (this._currentPresentedViewStateIdx+1) >= this._viewStateIDsToPresent.length)
        {
            return false;
        }

        this._currentPresentedViewStateIdx++;

        // Set the view state
        this.presentViewState(this._currentPresentedViewStateIdx);

        return true;
    }

    presentPreviousViewStates(): boolean
    {
        // Get the previous one if possible
        if(this.isPresentingViewStates() && this._currentPresentedViewStateIdx <= 0)
        {
            return false;
        }

        if(this._currentPresentedViewStateIdx > 0 && this._viewStateLoaded.length > 0)
        {
            // Go back a state
            this._currentPresentedViewStateIdx--;
        }
        // else: We have already started a presentation, and the view state loaded field is empty
        //     meaning the user has "gone off script" and started interacting with something while
        //     showing a view state. In this situation, when they press "back", we want to go "back"
        //     to the state they were in, instead of back to the previous state!

        // Set the view state
        this.presentViewState(this._currentPresentedViewStateIdx);

        return true;
    }

    private presentViewState(idx: number): void
    {
        // Remember it
        this._currentPresentedViewStateIdx = idx;

        // Show it
        this.applyViewState(this._viewStatesToPresent[this._currentPresentedViewStateIdx], false);

        // Remember this as the currently loaded view state, for back functionality to detect if user
        // has gone "off script"
        this._viewStateLoaded = this._viewStateIDsToPresent[this._currentPresentedViewStateIdx];
    }

    stopPresenting(): void
    {
        this._currentPresentedViewStateIdx = -1;
        this._viewStateIDsToPresent = [];
        this._viewStatesToPresent = [];
    }

    get presentationSlideIdx(): number
    {
        return this._currentPresentedViewStateIdx;
    }

    get presentationSlideCount(): number
    {
        return this._viewStateIDsToPresent.length;
    }

    isPresentingViewStates(): boolean
    {
        return this._viewStateIDsToPresent.length > 0 &&
            this._viewStateIDsToPresent.length == this._viewStatesToPresent.length &&
            this._currentPresentedViewStateIdx >= 0 && this._currentPresentedViewStateIdx < this._viewStateIDsToPresent.length;
    }

    setSelection(sel: selectionState)
    {
        if(this._viewState)
        {
            this._viewState.selection = sel;
            this.save(this._viewState.selection, "selection");
        }
    }

    setContextImage(state: contextImageState, variant: string)
    {
        if(this._viewState)
        {
            if(variant == "analysis" || variant == "map" || variant == "engineering")
            {
                this._viewState.contextImages.set(variant, state);
                this.save(state, "contextImage-"+variant);
            }
            else
            {
                console.error("Failed to save context image state, unknown variant: "+variant);
            }
        }
    }

    setQuantification(quantID: string): boolean
    {
        if(!this._viewState)
        {
            // Can't save! We haven't downloaded the view state yet, so can't send one up
            console.warn("Can't save quantification for view state, as initial view state snapshot not yet loaded. Ignored.");
            return false;
        }

        if(!quantID)
        {
            quantID = "";
        }

        this._viewState.quantification.appliedQuantID = quantID;

        // Publish this straight away
        this.updateAppliedQuantification();

        // And save to API
        let quantObj = { "appliedQuantID": quantID };
        this.save(quantObj, "quantification");

        return true;
    }

    // Called to help us clean out our list of ROI things that depend on ROI ids, as users may delete an ROI and the
    // item would remain here forever. We could notify the view state service when the ROI is removed too, but this
    // ensures we clean up even if things don't go according to plan otherwise.
    notifyValidROIIDs(validIDs: string[]): void
    {
        if(!this._viewState)
        {
            // Can't do any cleanup because we aren't set up yet, but future runs will do the job anyway
            return;
        }

        let deleteCount = 0;
        for(let roiID of this._viewState.rois.roiColours.keys())
        {
            if(validIDs.indexOf(roiID) < 0)
            {
                this._viewState.rois.roiColours.delete(roiID);
                deleteCount++;
            }
        }

        // If we made changes...
        if(deleteCount > 0)
        {
            // Publish this straight away
            this._roiColours$.next(this._viewState.rois.roiColours);
            this.saveROI();
        }
    }

    setROIColour(roiID: string, colourRGB: string): boolean
    {
        if(!this._viewState)
        {
            // Can't save! We haven't downloaded the view state yet, so can't send one up
            console.warn("Can't save ROI colour in view state, as initial view state snapshot not yet loaded. Ignored.");
            return false;
        }
        let t0 = performance.now();

        if(colourRGB.length <= 0)
        {
            this._viewState.rois.roiColours.delete(roiID);
        }
        else
        {
            this._viewState.rois.roiColours.set(roiID, colourRGB);
        }
        let t1 = performance.now();
        // Publish this straight away
        this._roiColours$.next(this._viewState.rois.roiColours);
        let t2 = performance.now();
        this.saveROI();
        let t3 = performance.now();

        console.log("setROIColour timing: map="+(t1-t0).toLocaleString()+"ms, subject="+(t2-t1).toLocaleString()+"ms, saveROI="+(t3-t2).toLocaleString()+"ms");
        return true;
    }

    private saveROI(): void
    {
        let roiObj = { "roiColours": {}};
        for(let [k, v] of this._viewState.rois.roiColours)
        {
            roiObj["roiColours"][k] = v;
        }
        this.save(roiObj, "roi");
    }

    getROIColour(roiID: string): string
    {
        let clr = this._viewState.rois.roiColours.get(roiID);
        if(clr == undefined)
        {
            return "";
        }

        return clr;
    }

    getInUseROIColours(): string[]
    {
        // We have to support the fact that a colour may already be assigned to multiple ROIs, so here we build
        // a unique list of colours

        // TODO: could've used array.filter with a func calling indexOf but this seems neater/matches other code
        let usedColours: Set<string> = new Set<string>();
        for(let clr of this._viewState.rois.roiColours.values())
        {
            if(clr.length > 0)
            {
                usedColours.add(clr);
            }
        }

        return Array.from(usedColours.values());
    }

    setChord(state: chordState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.chordDiagrams.set(whichInstance, state);
        this.save(state, "chord-"+whichInstance);
        return true;
    }

    setBinary(state: binaryState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.binaryPlots.set(whichInstance, state);
        this.save(state, "binary-"+whichInstance);
        return true;
    }

    setTernary(state: ternaryState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.ternaryPlots.set(whichInstance, state);
        this.save(state, "ternary-"+whichInstance);
        return true;
    }

    setTable(state: tableState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.tables.set(whichInstance, state);
        this.save(state, "table-"+whichInstance);
        return true;
    }

    setROIQuantTable(state: roiQuantTableState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.roiQuantTables.set(whichInstance, state);
        this.save(state, "roiQuantTable-"+whichInstance);
        return true;
    }

    setVariogram(state: variogramState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.variogramState.set(whichInstance, state);
        this.save(state, "variogram-"+whichInstance);
        return true;
    }

    setSpectrumState(state: spectrumWidgetState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.spectrums.set(whichInstance, state);
        this.save(state, "spectrum-"+whichInstance);
        return true;
    }

    setRGBUImagesState(state: rgbuImagesWidgetState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.rgbuImages.set(whichInstance, state);
        this.save(state, "rgbuImages-"+whichInstance);
        return true;
    }

    setRGBUPlotState(state: rgbuPlotWidgetState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.rgbuPlots.set(whichInstance, state);
        this.save(state, "rgbuPlot-"+whichInstance);
        return true;
    }

    setSingleAxisRGBUState(state: singleAxisRGBUWidgetState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.singleAxisRGBU.set(whichInstance, state);
        this.save(state, "singleAxisRGBU-"+whichInstance);
        return true;
    }

    setParallelogramState(state: parallelogramWidgetState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.parallelograms.set(whichInstance, state);
        this.save(state, "parallelogram-"+whichInstance);
        return true;
    }

    setHistogram(state: histogramState, whichInstance: string): boolean
    {
        if(!this._viewState)
        {
            return false;
        }

        this._viewState.histograms.set(whichInstance, state);
        this.save(state, "histogram-"+whichInstance);
        return true;
    }

    // Here position is something that the analysis view understands. See hard codes below to determine what's supported
    setAnalysisViewSelector(position: string, selector: string): void
    {
        if(position == "top0" || position == "top1")
        {
            let idx = (position == "top0") ? 0 : 1;
            this._viewState.analysisLayout.topWidgetSelectors[idx] = selector;
        }
        else
        {
            const validPositions = ["undercontext", "underspectrum0", "underspectrum1", "underspectrum2"];
            let idx = validPositions.indexOf(position);
            if(idx < 0)
            {
                console.warn("setAnalysisViewSelector failed: bad position "+position+" for: "+selector);
                return;
            }

            // undercontext refers to first array position, with the rest counting up from there
            const arrayPositions = [0, 1, 2, 3];
            
            this._viewState.analysisLayout.bottomWidgetSelectors[arrayPositions[idx]] = selector;
        }

        this.save(this._viewState.analysisLayout, "analysisLayout");

        // Make the change happen on the UI - this looks at other factors like the fold-out panel states
        this.updateAnalysisViewSelectors();
    }

    private updateAnalysisViewSelectors(): void
    {
        // We don't just send out the list of selectors because while tabs are showing we do replacements

        let selectors = Array.from(this._viewState.analysisLayout.bottomWidgetSelectors);
        //console.log('updateAnalysisViewSelectors selectors: '+JSON.stringify(selectors));
        if(this._showContextImageLayers)
        {
            selectors[0] = ViewStateService.widgetSelectorContextImageLayers;
        }
        else if(this._showContextImageOptions)
        {
            selectors[0] = ViewStateService.widgetSelectorContextImageOptions;
        }

        if(this._showSpectrumRegionPicker)
        {
            selectors[1] = ViewStateService.widgetSelectorSpectrumRegions;
        }
        else if(this._showSpectrumFit)
        {
            selectors = [selectors[0], ViewStateService.widgetSelectorSpectrumFit];
        }
        else if(this._showPeakIdentification)
        {
            // Only showing these 2!
            selectors = [selectors[0], ViewStateService.widgetSelectorSpectrumPeakID];
        }
        else if(this._showAnnotations)
        {
            selectors[1] = ViewStateService.widgetSelectorSpectrumAnnotations;
        }

        let toPublish = new analysisLayoutState(this._viewState.analysisLayout.topWidgetSelectors, selectors);

        //console.log('publishing selectors: '+JSON.stringify(selectors));
        this._analysisViewSelectors$.next(toPublish);
    }

    isClosableListOpen(name: string): boolean
    {
        return this._closableListsOpen.indexOf(name) >= 0;
    }

    setClosableListOpen(name: string, open: boolean): void
    {
        if(!name)
        {
            return;
        }

        // If should be open, add to our list, otherwise ensure not there
        if(open)
        {
            // Add if doesn't exist
            if(!this.isClosableListOpen(name))
            {
                this._closableListsOpen.push(name);
            }
        }
        else
        {
            // Remove
            let pos = this._closableListsOpen.indexOf(name);
            if(pos > -1)
            {
                this._closableListsOpen.splice(pos, 1);
            }
        }
    }

    enableMultiQuantCombineMode(): void
    {
        // Make sure we have a context image in top-left
        this._viewState.analysisLayout.topWidgetSelectors[0] = ViewStateService.widgetSelectorContextImage;

        // Make sure ROI table is in bottom-left, but if there's another one there already, just move it
        let existingROIIdx = this._viewState.analysisLayout.bottomWidgetSelectors.indexOf(ViewStateService.widgetSelectorROIQuantCompareTable);
        if(existingROIIdx > -1)
        {
            this._viewState.analysisLayout.bottomWidgetSelectors.splice(existingROIIdx, 1);
            this._viewState.analysisLayout.bottomWidgetSelectors.unshift(ViewStateService.widgetSelectorROIQuantCompareTable);
        }
        else
        {
            this._viewState.analysisLayout.bottomWidgetSelectors[0] = ViewStateService.widgetSelectorROIQuantCompareTable;
        }

        this.save(this._viewState.analysisLayout, "analysisLayout");

        // Make the change happen on the UI - this looks at other factors like the fold-out panel states
        this.updateAnalysisViewSelectors();

        // Finally, show the side-bar
        this.showSidePanel = true;
    }

    getReferencedIDs(viewStateID: string): Observable<ViewStateReferencedIDs>
    {
        let loadID = this._loadingSvc.add("Checking what needs to be shared...");

        // Reload & fill the subject
        let apiURL = this.makeSavedViewStateURL(this._datasetID, viewStateID)+"/references";
        return this.http.get<ViewStateReferencedIDs>(apiURL, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }
}
