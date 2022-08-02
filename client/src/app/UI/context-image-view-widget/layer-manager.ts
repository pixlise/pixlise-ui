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

import { ReplaySubject } from "rxjs";
import { DiffractionPeakQuerierSource } from "src/app/expression-language/data-sources";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getQuantifiedDataWithExpression } from "src/app/expression-language/expression-language";
import { MinMax } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { LocationDataLayer, LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { RGBUImage } from "src/app/models/RGBUImage"; // for channel names, probably shouldn't be linking this though :(
import { DataExpression, DataExpressionService } from "src/app/services/data-expression.service";
import { RGBMixConfigService, RGBMix } from "src/app/services/rgbmix-config.service";
import { mapLayerVisibility } from "src/app/services/view-state.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { ColourRamp } from "src/app/utils/colours";
import { SentryHelper } from "src/app/utils/utils";
import { LayerStore, ExpressionListBuilder, ExpressionListItems } from "src/app/models/ExpressionList";


export class LayerChangeInfo
{
    constructor(
        public needSave: boolean,
        public reason: string,
        public layers: LocationDataLayer[]
    )
    {
    }
}

// Management of context image map layers
export class LayerManager
{
    private _listBuilder: ExpressionListBuilder;

    private _dataset: DataSet = null;

    // This is where we store layer models
    // NOTE: This gets REGENERATED if expressions change/data reloads. This is because we have to show all
    //       layers on the UI, but only some of those are enabled or have their settings changed by the user.
    //       The actual settings the user controls through us are view-state settings in the form of
    //       mapLayerVisibility (see _lastMapLayerVisibility). That is "the source of truth" that tells us
    //       how to regenerate layers and this is what is stored in the view-state API (and reloaded)
    private _layers: LayerStore = new LayerStore();
    private _locationDataLayers$ = new ReplaySubject<LayerChangeInfo>(1);

    // Stores the actual view state of our layers. Anything not in here (that is added to _layers while
    // they are regenerated) receives "default" visibility settings
    private _lastMapLayerVisibility: mapLayerVisibility[] = [];

    private _initInMapMode: boolean = false;

    private _weightPctValueRange: MinMax = new MinMax();
    private _datasetRelativeDisplayRange: MinMax = new MinMax();

    private _elementRelativeShading: boolean = true;

    constructor(
        private _exprService: DataExpressionService,
        private _rgbMixService: RGBMixConfigService,
        private _widgetDataService: WidgetRegionDataService,
        private _diffractionSource: DiffractionPeakQuerierSource,
    )
    {
        this._listBuilder = new ExpressionListBuilder(true, [], true, true, true, true, this._exprService);
    }

    protected publishLayerChange(needSave: boolean, reason: string): void
    {
        let t0 = performance.now();
        this._locationDataLayers$.next(new LayerChangeInfo(needSave, reason, this._layers.getLayerArray()));
        let t1 = performance.now();

        console.log("LayerManager: publishing change (reason="+reason+") took: " + (t1 - t0).toLocaleString() + "ms");
    }

    setDataset(dataset: DataSet): void
    {
        this._dataset = dataset;
    }

    viewStateLoaded(layers: mapLayerVisibility[]): void
    {
        // Save this for when widget region data is loaded (which should be after this happens, seeing as how
        // the quant name would've been read from this same view state response and the loads just triggered)
        this._lastMapLayerVisibility = layers;
    }

    setMapMode(): void
    {
        console.log("Context image: map mode, some weight % maps will be enabled by default...");
        this._initInMapMode = true;
    }

    // Expects same parameters as ExpressionListBuilder notifyDataArrived
    notifyDataArrived(data: unknown[]): void
    {
        this._listBuilder.notifyDataArrived(
            (data[0] as DataSet).getPseudoIntensityElementsList(),
            data[1] as QuantificationLayer,
            this._exprService.getExpressions(DataExpressionService.DataExpressionTypeAll),
            this._rgbMixService.getRGBMixes()
        );

        this.regenerateLayers("dataArrived");
    }

    notifyContextImageSwitched(): void
    {
        // Here we just want to regenerate the maps themselves, of anything we have already showing
        let layers = this._layers.getLayerArray();
        for(let layer of layers)
        {
            this.generatePointsIfNeeded(layer);
        }
    }

    makeExpressionList(headerSectionsOpen: Set<string>, filterText: string, lastElementSubLayerOwnerIDs: Set<string>): ExpressionListItems
    {
        // If we have no layers stored yet, regenerateLayers wasn't called yet... so bail
        if(this._layers.getLayerArray().length <= 0)
        {
            return;
        }

        // Find all currently visible elements
        let visibleElements: Set<string> = new Set<string>();
        for(let layer of this._layers.getLayerArray())
        {
            if(
                layer.visible &&
                layer.isPredefinedLayer &&
                (
                    DataExpressionService.getPredefinedQuantExpressionElement(layer.id).length > 0 ||
                    layer.id.startsWith(DataExpressionService.makePredefinedQuantDataExpression("chisq", "")) ||
                    layer.id.startsWith(DataExpressionService.predefinedUnquantifiedPercentDataExpression)
                )
            )
            {
                visibleElements.add(layer.id);
            }
        }

        let items = this._listBuilder.makeExpressionList(
            headerSectionsOpen,
            visibleElements,
            lastElementSubLayerOwnerIDs,
            filterText,
            true,
            (source: DataExpression|RGBMix): LocationDataLayerProperties=>
            {
                // Look it up in our list that we created earlier
                let layer = this._layers.getLayerById(source.id);
                if(!layer)
                {
                    throw new Error("makeExpressionList failed for unknown id: "+source.id);
                }
                return layer;
            }
        );

        return items;
    }

    recalcHeaderInfos(exprList: ExpressionListItems): void
    {
        this._listBuilder.recalcHeaderInfos(exprList);
    }

    private regenerateLayers(reason: string): void
    {
        let t0 = performance.now();

        // Remember if we're defaulting to enabled for some maps (because we're in map mode and there is nothing showing yet)
        const isMapBuilding = (this._initInMapMode && this._lastMapLayerVisibility.length <= 0);

        // Also clear any min/max values we have, as loading a new quant will give us new ones
        this._weightPctValueRange = new MinMax();

        let lastAddedElem = "";
        
        // Use list builder to make all layers. We supply visibility info for each layer via the callback
        this._layers = this._listBuilder.makeLayers(
            (source: DataExpression|RGBMix): LocationDataLayer=>
            {
                let vis = this.getInitialMapLayerVisibility(source.id);

                // Element default visibility in map building mode is VISIBLE so we can turn it off later as needed
                if(isMapBuilding)
                {
                    let elem = DataExpressionService.getPredefinedQuantExpressionElement(source.id);
                    if(DataExpressionService.getPredefinedQuantExpressionElementColumn(source.id) == "%" && !lastAddedElem.startsWith(elem))
                    {
                        // If we're in map mode, set it to visible initially, so we can then decide to show the most abundant ones
                        // ALSO, note that if this is a "pure element" of the previous one, we aren't enabling it to be visible
                        // as we don't want CaO and Ca side by side!
                        vis.visible = true;
                    }

                    lastAddedElem = elem;
                }

                if(source instanceof DataExpression)
                {
                    return this.makeLocationDataLayerForExpression(source.id, vis);
                }

                // RGB mixes are handled a bit differently
                let rgbLayer = new LocationDataLayer(
                    source.id,
                    source.name,
                    "",
                    source,
                    [
                        source.red.expressionName, // this._exprService.getExpressionShortDisplayName(source.red.expressionID, 15).shortName,
                        source.green.expressionName, // this._exprService.getExpressionShortDisplayName(source.green.expressionID, 15).shortName,
                        source.blue.expressionName, // this._exprService.getExpressionShortDisplayName(source.blue.expressionID, 15).shortName
                    ]
                );

                rgbLayer.applyMapLayerVisibility(0, vis);
                let err = this.generatePointsIfNeeded(rgbLayer);
                return rgbLayer;
            }
        );

        // If we're building maps for map-mode default view, find the 9 most abundant element maps and leave them visible,
        // but turn the rest off
        if(isMapBuilding)
        {
            this.enableMostAbundantElementMaps();
        }

        // If we're in map mode, save this as the initial view state, if nothing else was there
        if(isMapBuilding)
        {
            this._lastMapLayerVisibility = this.getMapLayerVisibilityViewState();
        }

        let t1 = performance.now();

        console.log("Context LayerManager: regenerateLayers took: " + (t1-t0).toLocaleString() + "ms");

        // Layers have changed (NOTE: NOT SAVING HERE!)
        this.publishLayerChange(false, reason);
    }

    getLayersAsMapLayerVisibilityToSave(): mapLayerVisibility[]
    {
        let result: mapLayerVisibility[] = this.getMapLayerVisibilityViewState();

        // This is being saved to view-state API, save it as the current view state here so anything looking up visibility/opacity operates
        this._lastMapLayerVisibility = Array.from(result);

        return result;
    }

    private enableMostAbundantElementMaps(): void
    {
        // Find the map layers
        let maps: LocationDataLayer[] = [];
        for(let layer of this._layers.getLayerArray())
        {
            if(DataExpressionService.getPredefinedQuantExpressionElement(layer.expressionID).length > 0)
            {
                maps.push(layer);
            }
        }

        let mapsByMaxValue: Map<number, number> = new Map<number, number>();
        for(let c = 0; c < maps.length; c++)
        {
            mapsByMaxValue.set(maps[c].getValueRange(0).max, c);
        }

        // Find the 9 highest
        let values: number[] = Array.from(mapsByMaxValue.keys());
        values.sort((a, b) => (a < b) ? 1 : -1);
        values = values.slice(0, 9);

        for(let map of maps)
        {
            if(values.indexOf(map.getValueRange(0).max) == -1)
            {
                // It's not 1 of the 9 most abundant, disable
                map.visible = false;
            }
        }
    }

    private getMapLayerVisibilityViewState(): mapLayerVisibility[]
    {
        const defVis = this.makeDefaultMapVisibility("");
        let result: mapLayerVisibility[] = [];

        for(let layer of this._layers.getLayerArray())
        {
            // No need to save visibility info if the values are defaults
            let displayValueRange = layer.getDisplayValueRange(0);
            if(
                layer.opacity != defVis.opacity ||
                layer.visible != defVis.visible ||
                layer.displayValueShading != defVis.displayValueShading ||
                displayValueRange.min != defVis.displayValueRangeMin ||
                displayValueRange.max != defVis.displayValueRangeMax
            )
            {
                result.push(layer.getAsMapLayerVisibility());
            }
        }

        return result;
    }

    get locationDataLayers$(): ReplaySubject<LayerChangeInfo>
    {
        return this._locationDataLayers$;
    }

    get elementRelativeShading(): boolean
    {
        return this._elementRelativeShading;
    }

    set elementRelativeShading(val: boolean)
    {
        this._elementRelativeShading = val;
        this.updateDisplayValueRangeOverride();

        // This is important enough to force a redraw
        this.publishLayerChange(false, "elementRelativeShading");
    }

    get weightPctValueRange(): MinMax
    {
        return this._weightPctValueRange;
    }

    get datasetRelativeDisplayRange(): MinMax
    {
        //console.log('datasetRelativeDisplayRange: '+this._datasetRelativeDisplayRange.min+','+this._datasetRelativeDisplayRange.max);
        return this._datasetRelativeDisplayRange;
    }

    setDatasetRelativeDisplayMin(val: number): void
    {
        if(!this._weightPctValueRange.isWithin(val))
        {
            val = this._weightPctValueRange.min;
        }

        if(val > this._datasetRelativeDisplayRange.max)
        {
            // Don't allow crossing the max value... no change
            val = this._datasetRelativeDisplayRange.min;
        }

        this._datasetRelativeDisplayRange.setMin(val);

        this.updateDisplayValueRangeOverride();
    }

    setDatasetRelativeDisplayMax(val: number): void
    {
        if(!this._weightPctValueRange.isWithin(val))
        {
            val = this._weightPctValueRange.max;
        }

        if(val < this._datasetRelativeDisplayRange.min)
        {
            // Don't allow crossing the min value... no change
            val = this._datasetRelativeDisplayRange.max;
        }

        this._datasetRelativeDisplayRange.setMax(val);

        this.updateDisplayValueRangeOverride();
    }

    // id can be null, in which case we're only a bulk hide operation
    // idsToHide expected to contain a list of ids that need hiding as well as whatever
    // is being done to id (via opacity and visible flags). Can be empty array
    setLayerVisibility(id: string, opacity: number, visible: boolean, idsToHide: string[]): void
    {
        // We notify out depending on what actually got changed
        let opacityOnly = true;

        if(id.length > 0)
        {
            // Set the changes in the layer & notify out...
            let layer = this._layers.getLayerById(id);
            if(!layer)
            {
                console.warn("setLayerVisibility called with unknown layer id: "+id);
                return;
            }

            // Here we back up the previous visibility settings, because if the newly enabled
            // layer fails to generate, we want to be able to go back to how it was!
            let prevOpacity = layer.opacity;
            let prevVis = layer.visible;

            if(layer.visible != visible)
            {
                opacityOnly = false;
            }

            layer.opacity = opacity;
            layer.visible = visible;

            let err = this.generatePointsIfNeeded(layer);
            if(err)
            {
                // Notify the user & set vis back how it was
                alert(err);

                layer.opacity = prevOpacity;
                layer.visible = prevVis;

                // Nothing more to do...
                return;
            }
        }

        // If there are any to hide, do that in one hit here
        for(let hideID of idsToHide)
        {
            let hideLayer = this._layers.getLayerById(hideID);
            if(!hideLayer)
            {
                console.warn("setLayerVisibility called to hide unknown layer id: "+hideID);
            }
            else
            {
                if(hideLayer.visible)
                {
                    opacityOnly = false;
                }

                hideLayer.visible = false;
            }
        }

        this.updateDisplayValueRangeOverride();

        this.publishLayerChange(true, opacityOnly ? "setLayerOpacity" : "setLayerVisibility");
    }

    setLayerDisplayValueShading(id: string, val: ColourRamp): void
    {
        let layer = this._layers.getLayerById(id);
        if(!layer)
        {
            console.warn("setLayerDisplayValueShading called with unknown layer id: "+id);
            return;
        }

        layer.displayValueShading = val;
        this.publishLayerChange(true, "setLayerDisplayValueShading");
    }

    visibleLayerCount(): number
    {
        let count = 0;
        for(let layer of this._layers.getLayerArray())
        {
            if(layer.visible)
            {
                count++;
            }
        }
        return count;
    }

    getLayerProperties(id: string): LocationDataLayerProperties
    {
        let layer = this._layers.getLayerById(id);
        if(!layer)
        {
            return null;
        }
        return layer.properties;
    }

    getLayerIds(): string[]
    {
        return this._layers.getLayerIds();
    }

    // Meant to only be called for drawing, needing quick non-ID lookup access!
    // Other code shouldn't access/modify the layers
    getLocationDataLayersForDraw(): LocationDataLayer[]
    {
        // Return only visible layers
        let visibleLayers: LocationDataLayer[] = [];
        for(let layer of this._layers.getLayerArray())
        {
            if(layer.isVisible())
            {
                visibleLayers.push(layer);
            }
        }
        return visibleLayers;
    }

    getFirstVisibleLayer(): LocationDataLayer
    {
        let layers = this._layers.getLayerArray();
        for(let layer of layers)
        {
            if(layer.isVisible())
            {
                return layer;
            }
        }
        return null;
    }

    getLayerById(id: string): LocationDataLayer
    {
        return this._layers.getLayerById(id);
    }

    private makeLocationDataLayerForExpression(expressionID: string, visSetting: mapLayerVisibility): LocationDataLayer
    {
        let createdLayer: LocationDataLayer = null;

        let expr = this._exprService.getExpression(expressionID);
        if(!expr)
        {
            console.error("Failed to find data expression: \""+expressionID+"\"");
            return null;
        }

        try
        {
            createdLayer = new LocationDataLayer(expressionID, expr.name, expressionID, expr);
            createdLayer.applyMapLayerVisibility(0, visSetting);
            let err = this.generatePointsIfNeeded(createdLayer);
            if(err != null)
            {
                //throw new Error(err);
                // We don't throw an error because if we do, any expression with an error in it will disappear from the list!
                console.error(err);
            }

            this.updateDisplayValueRangeOverride();
        }
        catch (error)
        {
            SentryHelper.logException(error);
            return null;
        }

        return createdLayer;
    }

    // Returns an error string if something goes wrong - otherwise null
    private generatePointsIfNeeded(layer: LocationDataLayer): string
    {
        //let t0 = performance.now();
        if(!layer.isVisible())
        {
            // Not visible, we're lazy, why bother?
            return null;
        }

        if(RGBMixConfigService.isRGBMixID(layer.id))
        {
            return this.generateRGBMixLayer(layer);
        }

        // At this point assume it's a DataExpression - we used to look this up but expression is now in
        // layer.source, just need to cast it
        //let expr = this._exprService.getExpression(layer.expressionID);
        let expr = layer.source as DataExpression;
        if(!expr)
        {
            let err = "Failed to find data expression: \""+layer.expressionID+"\" when setting layer: "+layer.id+" visibility";
            return err;
        }

        try
        {
            let quantLayer: QuantificationLayer = this._widgetDataService.quantificationLoaded;

            let data = getQuantifiedDataWithExpression(expr.expression, quantLayer, this._dataset, this._dataset, this._dataset, this._diffractionSource, this._dataset);
            layer.generatePoints(0, data, this._dataset);

            // Expand our min/max values as needed
            this._weightPctValueRange.expandByMinMax(data.valueRange);
        }
        catch (error)
        {
            SentryHelper.logException(error);
            //layer.errorMessage = error;
            return error;
        }
        //let t1 = performance.now();
        //console.log('generatePointsIfNeeded for '+layer.name+' took: ' + (t1-t0).toLocaleString() + 'ms');

        return null;
    }

    private generateRGBMixLayer(layer: LocationDataLayer): string
    {
        // Run through and get data for each element
        let quantLayer: QuantificationLayer = this._widgetDataService.quantificationLoaded;

        // Run the expression to get a map back

        try
        {
            let rgbMixes = this._rgbMixService.getRGBMixes();
            let rgbMix = rgbMixes.get(layer.id);

            if(!rgbMix)
            {
                return "RGB mix info not found for: "+layer.id;
            }

            let exprIds = [rgbMix.red.expressionID, rgbMix.green.expressionID, rgbMix.blue.expressionID];

            let perElemData: PMCDataValues[] = [];
            let ch = 0;
            for(let exprId of exprIds)
            {
                let expr = this._exprService.getExpression(exprId);

                if(!expr)
                {
                    throw new Error("Failed to find expression: "+exprId+" for channel: "+RGBUImage.channels[ch]);
                }

                let data = getQuantifiedDataWithExpression(expr.expression, quantLayer, this._dataset, this._dataset, this._dataset, this._diffractionSource, this._dataset);
                perElemData.push(data);
                //layer.generatePoints(ch, data, this._dataset);
                ch++;
            }

            // Now we run through ch0 (R) and recolour the points to mix in the G and B values, making ch0 our render-able channel
            return layer.generateRGBMix(perElemData, this._dataset);
        }
        catch (error)
        {
            SentryHelper.logException(error);
            return error;
        }

        return null;
    }

    private updateDisplayValueRangeOverride(): void
    {
        // If we're in element relative mode, make sure all layers know what to use to calculate their shading
        let applyOverride: MinMax = null;
        if(!this._elementRelativeShading)
        {
            if(this._datasetRelativeDisplayRange.min == null && this._datasetRelativeDisplayRange.max == null)
            {
                this._datasetRelativeDisplayRange.setMin(this._weightPctValueRange.min);
                this._datasetRelativeDisplayRange.setMax(this._weightPctValueRange.max);
            }
            applyOverride = this._datasetRelativeDisplayRange;
            //console.log('updateDisplayValueRangeOverride applying range: '+applyOverride.min+'->'+applyOverride.max);
        }

        for(let layer of this._layers.getLayerArray())
        {
            layer.setDisplayValueRangeOverride(0, applyOverride);
        }
    }

    private makeDefaultMapVisibility(id: string): mapLayerVisibility
    {
        /*
        let visible = this._initInMapMode ? true : false;

        // if we've got it turned on, and this is NOT the weight % layer, turn it off still...
        if(visible)
        {
            let elemColumn = DataExpressionService.getPredefinedQuantExpressionElementColumn(id);
            if(elemColumn.length > 0)
            {
                if(elemColumn != '%')
                {
                    visible = false;
                }
            }
            else
            {
                visible = false;
            }
        }
*/
        return new mapLayerVisibility(id, 1, false, null, null, ColourRamp.SHADE_VIRIDIS);
    }

    private getInitialMapLayerVisibility(id: string): mapLayerVisibility
    {
        if(id == RGBMixConfigService.exploratoryRGBMixName)
        {
            // This is the weird exporatory RGB layer, get the visible flag from the service
            let vis = this.makeDefaultMapVisibility(id);
            vis.visible = this._rgbMixService.isExporatoryRGBMixVisible();
            return vis;
        }

        for(let vis of this._lastMapLayerVisibility)
        {
            if(vis.expressionID == id)
            {
                return vis;
            }
        }

        return this.makeDefaultMapVisibility(id);
    }
}
