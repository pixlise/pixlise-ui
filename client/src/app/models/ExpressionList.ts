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

import { combineLatest, Observable } from "rxjs";

import { QuantificationLayer } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpressionService, DataExpression } from "src/app/services/data-expression.service";
import { RGBMix, RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { LocationDataLayerProperties, LocationDataLayer } from "src/app/models/LocationData2D";
import { DataSetService } from "../services/data-set.service";
import { WidgetRegionDataService } from "../services/widget-region-data.service";
import { RGBLayerInfo } from "src/app/UI/atoms/expression-list/layer-settings/rgbmix-layer-settings.component";
import { LayerInfo } from "src/app/UI/atoms/expression-list/layer-settings/layer-settings.component";
import { ExpressionListHeaderInfo } from "src/app/UI/atoms/expression-list/layer-settings/header.component";


// Not all static vars so we can use this from HTML if the component "extends" this class
export class ExpressionListGroupNames
{
    // Names of header sections
    readonly elementsHeaderName = "elements-header";
    readonly rgbMixHeaderName = "rgbmix-header";
    readonly expressionsHeaderName = "expressions-header";
    readonly anomalyHeaderName = "anomaly-header";
    readonly pseudoIntensityHeaderName = "pseudointensity-header";
    readonly settingHeaderName = "setting-header";
}

function sortByNameAndCompatibility(a: DataExpression | RGBMix, b: DataExpression | RGBMix)
{
    if(a.isCompatibleWithQuantification && !b.isCompatibleWithQuantification)
    {
        return -1;
    }
    else if(!a.isCompatibleWithQuantification && b.isCompatibleWithQuantification)
    {
        return 0;
    }
    // Else we go alphabetical

    let aU = a.name.toUpperCase();
    let bU = b.name.toUpperCase();
    if(aU < bU) { return -1; }
    if(aU > bU) { return 1; }
    return 0;
}

// Base class of expression builders, derived classes can insert custom things...
export class ExpressionListBuilder extends ExpressionListGroupNames
{
    // The stuff we query, when all of these are NOT null, we regenerate the list of items to display
    protected _userExpressions: DataExpression[] = [];
    protected _sharedExpressions: DataExpression[] = [];
    protected _elementsFromQuant: DataExpression[] = [];
    protected _elementRelatedBuiltIn: DataExpression[] = [];
    protected _pseudointensities: DataExpression[] = [];
    protected _exploratoryRGBMix: RGBMix = null;
    protected _userRGBMixes: RGBMix[] = [];
    protected _sharedRGBMixes: RGBMix[] = [];
    protected _anomalies: DataExpression[] = [];

    constructor(
        protected _includeDetectorOnElements: boolean,
        protected _elementColumnFilter: string[],
        private _includeChiSq: boolean,
        private _includeUnquantifiedWeight: boolean,
        private _includeRGBMix: boolean,
        includeAnomalies: boolean,
        protected _exprService: DataExpressionService
    )
    {
        super();

        if(includeAnomalies)
        {
            this.buildAnomalyList();
        }
    }

    // Caller needs to call this when all data have arrived
    notifyDataArrived(
        pseudoIntensities: string[],
        quant: QuantificationLayer,
        expressions: Map<string, DataExpression>,
        mixes: Map<string, RGBMix>
    )
    {
        this.processQuantification(quant);

        if(this._includeRGBMix)
        {
            this.processRGBMixes(mixes);
        }

        this.processExpressions(expressions);

        // Anomalies are already built if needed...

        this.processPseudoIntensities(pseudoIntensities);
    }

    // NOTE: Derived classes will need to implement something to process visibility/opacity changes

    // Setting data from each source
    protected processPseudoIntensities(pseudoIntensities: string[]): void
    {
        this._pseudointensities = [];

        for(let elem of pseudoIntensities)
        {
            let id = DataExpressionService.makePredefinedPseudoIntensityExpression(elem);
            let expression = this._exprService.getExpression(id);
            this._pseudointensities.push(expression);
        }
    }

    protected processQuantification(quant: QuantificationLayer): void
    {
        this._elementsFromQuant = [];

        if(!quant)
        {
            return;
        }
        let detectors = quant.getDetectors();

        if(!this._includeDetectorOnElements)
        {
            // Specified not to include detectors
            detectors = [null];
        }
        
        let allFormulae = quant.getElementFormulae();
        let sortedFormulae = periodicTableDB.getElementsInAtomicNumberOrder(allFormulae);

        // Loop through all elements
        for(let formula of sortedFormulae)
        {
            // Get all columns for the element
            let colTypes = quant.getElementColumns(formula);
            for(let col of colTypes)
            {
                // Check if it passes our filter
                if(this._elementColumnFilter.length <= 0 || this._elementColumnFilter.length > 0 && this._elementColumnFilter.indexOf(col) > -1)
                {
                    // Loop through each detector if needed
                    
                    for(let det of detectors)
                    {
                        let id = DataExpressionService.makePredefinedQuantElementExpression(formula, col, det);
                        let expression = this._exprService.getExpression(id);
                        this._elementsFromQuant.push(expression);
                    }
                }
            }
        }

        // Finally, add the extra expressions that aren't based on elements but are displayed in the same grouping
        this._elementRelatedBuiltIn = [];

        if(this._includeChiSq)
        {
            const chisqColName = "chisq";

            let dataCols = quant.getDataColumns();
            if(dataCols.indexOf(chisqColName) > -1)
            {
                for(let det of detectors)
                {
                    let id = DataExpressionService.makePredefinedQuantDataExpression(chisqColName, det);
                    let expression = this._exprService.getExpression(id);
                    this._elementRelatedBuiltIn.push(expression);
                }
            }
        }

        if(sortedFormulae.length > 0 && this._includeUnquantifiedWeight)
        {
            for(let det of detectors)
            {
                let id = DataExpressionService.predefinedUnquantifiedPercentDataExpression+"("+det+")";
                let expression = this._exprService.getExpression(id);
                this._elementRelatedBuiltIn.push(expression);
            }
        }
    }

    protected processExpressions(expressions: Map<string, DataExpression>): void
    {
        this._userExpressions = [];
        this._sharedExpressions = [];

        for(let expr of expressions.values())
        {
            if(expr.shared)
            {
                this._sharedExpressions.push(expr);
            }
            else
            {
                this._userExpressions.push(expr);
            }
        }

        // Sort by name
        this._userExpressions.sort(sortByNameAndCompatibility);
        this._sharedExpressions.sort(sortByNameAndCompatibility);
    }

    protected processRGBMixes(mixes: Map<string, RGBMix>): void
    {
        this._exploratoryRGBMix = null;
        this._userRGBMixes = [];
        this._sharedRGBMixes = [];
        for(let mix of mixes.values())
        {
            if(mix.id == RGBMixConfigService.exploratoryRGBMixName)
            {
                this._exploratoryRGBMix = mix;
            }
            else
            {
                if(mix.shared)
                {
                    this._sharedRGBMixes.push(mix);
                }
                else
                {
                    this._userRGBMixes.push(mix);
                }
            }
        }

        // Sort by name
        this._userRGBMixes.sort(sortByNameAndCompatibility);
        this._sharedRGBMixes.sort(sortByNameAndCompatibility);
    }

    // Built-in anomaly list building
    protected buildAnomalyList(): void
    {
        // Anomalies are pre-defined...
        let anomalyIDs = [
            DataExpressionService.predefinedRoughnessDataExpression,
            DataExpressionService.predefinedDiffractionCountDataExpression,
            DataExpressionService.predefinedHeightZDataExpression
        ];

        this._anomalies = [];
        for(let c = 0; c < anomalyIDs.length; c++)
        {
            let expression = this._exprService.getExpression(anomalyIDs[c]);
            this._anomalies.push(expression);
        }
    }

    makeLayers(
        makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayer
    ): LayerStore
    {
        let store = new LayerStore();

        let items = [
            ...this._elementsFromQuant, // Here we just use ALL elements
            ...this._elementRelatedBuiltIn, // And any element related ones (chisq, unquantified %)
            ...this._userRGBMixes,
            ...this._sharedRGBMixes,
            ...this._userExpressions,
            ...this._sharedExpressions,
            ...this._anomalies,
            ...this._pseudointensities
        ];

        // If we have an exploratory RGB item, add it before user mixes
        if(this._exploratoryRGBMix)
        {
            items.splice(this._elementsFromQuant.length+this._elementRelatedBuiltIn.length, 0, this._exploratoryRGBMix);
        }

        for(let item of items)
        {
            store.addLayer(makeLayer(item));
        }

        // Run through the layers in the same order as makeExpressionList and form them
        return store;
    }

    // Requesting an expression list:
    // This takes a "makeLayer" function so what it creates can be customised
    // Also passing in a list of header sections that are open
    // Finally, passing in a list of element IDs that are currently "chosen", because the others
    // have to be added as sub-layers to that one, and this is view-state dependent so this class
    // has no other way to know that
    makeExpressionList(
        headerSectionsOpen: Set<string>,
        chosenElementIDs: Set<string>,
        recentChosenElementIDs: Set<string>,
        expressionNameFilter: string,
        expressionAuthorsFilter: string[],
        filterTagIDs: string[],
        includeExploratoryRGBMix: boolean,
        makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayerProperties
    ): ExpressionListItems
    {
        let groups: ExpressionListGroupItems[] = [];

        let subLayerOwnerIDs: string[] = [];
        let elements = this.extractMainExpressionsWithSubLayers(this._elementsFromQuant, chosenElementIDs, recentChosenElementIDs, makeLayer, subLayerOwnerIDs);

        // Pad the list with element related (eg chisq, unquantified %)
        this.includeElementRelatedBuiltInExpressions(elements, chosenElementIDs, recentChosenElementIDs, makeLayer, subLayerOwnerIDs);

        groups.push(
            new ExpressionListGroupItems(
                this.elementsHeaderName,
                "Quantified Elements",
                headerSectionsOpen.has(this.elementsHeaderName),
                "element-map",
                expressionNameFilter,
                expressionAuthorsFilter,
                filterTagIDs,
                elements,
                "No quantified elements - have you loaded a quantification?",
                null,
                "",
                0 
            )
        );

        if(this._includeRGBMix)
        {
            groups.push(
                new ExpressionListGroupItems(
                    this.rgbMixHeaderName,
                    "RGB Colour Mixes",
                    headerSectionsOpen.has(this.rgbMixHeaderName),
                    "rgbmix",
                    expressionNameFilter,
                    expressionAuthorsFilter,
                    filterTagIDs,
                    this.getRGBItems(this._userRGBMixes, makeLayer),
                    "No user RGB mixes to view",
                    this.getRGBItems(this._sharedRGBMixes, makeLayer),
                    "No shared RGB mixes to view",
                    groups[groups.length-1].items.length
                )
            );
        }

        groups.push(
            new ExpressionListGroupItems(
                this.expressionsHeaderName,
                "Expressions",
                headerSectionsOpen.has(this.expressionsHeaderName),
                "expression",
                expressionNameFilter,
                expressionAuthorsFilter,
                filterTagIDs,
                this.getItems(this._userExpressions, makeLayer),
                "No user expressions to view",
                this.getItems(this._sharedExpressions, makeLayer),
                "No shared expressions to view",
                groups[groups.length-1].items.length
            )
        );

        if(this._anomalies.length > 0)
        {
            groups.push(
                new ExpressionListGroupItems(
                    this.anomalyHeaderName,
                    "Anomaly Maps",
                    headerSectionsOpen.has(this.anomalyHeaderName),
                    "anomaly",
                    expressionNameFilter,
                    expressionAuthorsFilter,
                    filterTagIDs,
                    this.getItems(this._anomalies, makeLayer),
                    "No anomalies to view",
                    null,
                    "",
                    groups[groups.length-1].items.length
                )
            );
        }

        groups.push(
            new ExpressionListGroupItems(
                this.pseudoIntensityHeaderName,
                "Pseudo-Intensities",
                headerSectionsOpen.has(this.pseudoIntensityHeaderName),
                "pseudointensity",
                expressionNameFilter,
                expressionAuthorsFilter,
                filterTagIDs,
                this.getItems(this._pseudointensities, makeLayer),
                "No pseudo-intensity data available",
                null,
                "",
                groups[groups.length-1].items.length
            )
        );

        // Form the final data structure
        let groupLookup = new Map<string, ExpressionListGroupItems>();
        let items = [];
        for(let group of groups)
        {
            groupLookup.set(group.headerItemType, group);
            items.push(...group.items);
        }

        // Add exploratory RGB mix if needed
        if(this._includeRGBMix && includeExploratoryRGBMix && this._exploratoryRGBMix && headerSectionsOpen.has(this.rgbMixHeaderName))
        {
            // Insert it past the first group (elements), and past the header of the RGB mix group
            items.splice(groups[0].items.length+1, 0, new LayerViewItem("rgbmix-exploratory", false, this._exploratoryRGBMix));
        }

        return new ExpressionListItems(items, groupLookup, subLayerOwnerIDs);
    }

    // Run through expressions and group them into layer vs sub-layers, with the currently "chosen" one being the layer
    // More specifically, this takes the built-in element expressions eg element("CaO", "%", "Combined") referenced by
    // "predefined" ids, and organises them so it picks a "main" one to show, which is active, along with sub-layer IDs
    // which can be enabled by the user
    protected extractMainExpressionsWithSubLayers(
        expressions: DataExpression[],
        chosenElementIDs: Set<string>,
        recentChosenElementIDs: Set<string>,
        makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayerProperties,
        out_subLayerOwnerIDs: string[],
    ): LayerInfo[]
    {
        let result: LayerInfo[] = [];

        // If we find an oxide/carbonate, we have a lookup here for the "pure" element to be able to find the oxide/carbonate
        // layer. This is needed because we don't know what oxide/carbonate is quantified for an element, so we have to do this
        // as a discovery process. It happens as a preprocessing step for the next loop
        // This all assumes that the oxide/carbonate will be defined BEFORE the element. If this is not the case, we log
        // a warning here
        let pureElementToQuantifiedState: Map<string, string> = new Map<string, string>();
        let elemForExpr: string[] = [];
        let elemStateForExpr = [];
        let elemOnlyExpressions: DataExpression[] = [];

        // This seems oddly redundant, but allows us to take expressions as parameters, operate on ids, and find the expressions
        // needed quickly at the end
        let exprLookup: Map<string, DataExpression> = new Map<string, DataExpression>();

        for(let expr of expressions)
        {
            exprLookup.set(expr.id, expr);

            let element = DataExpressionService.getPredefinedQuantExpressionElement(expr.id);
            if(!element)
            {
                throw new Error("extractMainExpressionsWithSubLayers called for non-element expression: "+expr.id);
            }

            elemOnlyExpressions.push(expr);
            elemForExpr.push(element);

            let elemState = periodicTableDB.getElementOxidationState(element);
            elemStateForExpr.push(elemState);

            if(elemState)
            {
                if(!elemState.isElement)
                {
                    pureElementToQuantifiedState.set(elemState.element, elemState.formula);
                }
                else if(!pureElementToQuantifiedState.has(element))
                {
                    //console.warn('Oxide/carbonate state was not defined before the element: '+elem);
                    //console.log(ids);
                    // The next loop will probably generate a separate layer for this element instead of forming
                    // it as a sub-layer of the oxide/carbonate. That's ok, still functional...
                }
            }
        }

        let completeGroup = (group: string[])=>
        {
            let orderedGroup = this.orderElementIdGroup(group, chosenElementIDs, recentChosenElementIDs);
            if(orderedGroup.length > 0)
            {
                let expr = exprLookup.get(orderedGroup[0]);
                let layer = makeLayer(expr);
                result.push(new LayerInfo(layer, orderedGroup.slice(1)));

                // This is going to become the sub-layer list owner!
                out_subLayerOwnerIDs.push(expr.id);
            }
        };

        let lastElement: string = "";
        let groupBeingFormed: string[] = [];
        for(let c = 0; c < elemOnlyExpressions.length; c++)
        {
            const expr = expressions[c];
            let element = elemForExpr[c];
            const elemState = elemStateForExpr[c];

            if(elemState.isElement && pureElementToQuantifiedState.has(element))
            {
                element = pureElementToQuantifiedState.get(element);
            }

            if(element == lastElement)
            {
                // Add to the group we're still building
                groupBeingFormed.push(expr.id);
            }
            else
            {
                // New element, if there were any being formed into a group, process them
                completeGroup(groupBeingFormed);

                // Now start building the group being formed with these this layer being first
                groupBeingFormed = [expr.id];
                lastElement = element;
            }
        }

        // If we had any groups still being formed, add them here
        completeGroup(groupBeingFormed);

        return result;
    }

    private includeElementRelatedBuiltInExpressions(
        list: LayerInfo[],
        chosenElementIDs: Set<string>, 
        recentChosenElementIDs: Set<string>,
        makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayerProperties,
        out_subLayerOwnerIDs: string[],
    ): void
    {
        // Would be easier to just check _includeChiSq and _includeUnquantifiedWeight flags
        // but that way we're not depending on what we have already saved in _elementRelatedBuiltIn
        let uniqueIDs = new Set<string>();
        let uniqueDetectors = new Set<string>();

        for(let expr of this._elementRelatedBuiltIn)
        {
            let detector = DataExpressionService.getPredefinedQuantExpressionDetector(expr.id);
            let id = expr.id.substring(0, expr.id.length-detector.length-2); // (-2 for the bracket characters)

            uniqueIDs.add(id);
            uniqueDetectors.add(detector);
        }

        // Form groups
        for(let id of uniqueIDs)
        {
            let group = [];
            for(let det of uniqueDetectors)
            {
                group.push(id+"("+det+")");
            }

            let ordered = this.orderElementIdGroup(group, chosenElementIDs, recentChosenElementIDs);
            let subLayers = [];
            if(ordered.length > 1)
            {
                subLayers = ordered.slice(1);
            }

            // And now read the main ID
            let expr = this._exprService.getExpression(ordered[0]);

            if(expr)
            {
                let layer = makeLayer(expr);
                list.push(new LayerInfo(layer, subLayers));

                out_subLayerOwnerIDs.push(ordered[0]);
            }
        }
    }

    // Run through the group items, and pick one that will be the "outer" layer, placing its id first. The remainder
    // become the first ones sub-layers.
    //
    // For example: if you have a group with Fe_%, Fe_int, Fe_err, if Fe_int is in the "chosen" list, we form the
    // We place Fe_int first in the list, therefore Fe_% and Fe_err as its sub-layers.
    //
    // If we have carbonates, it's a little more complicated, because we'd have FeCO3_%, FeCO3_int, FeCO3_err and Fe_%
    // and if Fe_% becomes visible, it's the "outer" layer. But if the user sets it to not-visible, the group snaps back
    // so FeCO3_% has all the others as its sub-layer. To not incur this snapping behaviour, we remember what layers were
    // recently visible, thereby being able to show that same one owning the rest of the sub-layers
    //
    // NOTE: This function also has to work for more exotic cases like chisq or unquantified % where we may have 2 detectors
    private orderElementIdGroup(group: string[], chosenElementIDs: Set<string>, recentChosenElementIDs: Set<string>): string[]
    {
        if(group.length < 1)
        {
            return group;
        }

        // Find which of the group is in the chosen list
        let chosenIdIdx = -1;
        let recentChosenIdIdx = -1;

        for(let c = 0; c < group.length; c++)
        {
            if(chosenIdIdx < 0 && chosenElementIDs.has(group[c]))
            {
                chosenIdIdx = c;
            }

            if(recentChosenElementIDs.has(group[c]))
            {
                recentChosenIdIdx = c;
            }
        }

        // If there isn't one, just pick the first or the pure element if it was recently enabled...
        if(chosenIdIdx < 0)
        {
            // Check what was recently enabled, or if no record, pick the first one
            if(recentChosenIdIdx >= 0)
            {
                chosenIdIdx = recentChosenIdIdx;
            }
            else
            {
                chosenIdIdx = 0;
            }
        }

        // Now return the group so the chosen ID is first
        let result = [group[chosenIdIdx]];

        for(let c = 0; c < group.length; c++)
        {
            if(c != chosenIdIdx)
            {
                result.push(group[c]);
            }
        }

        return result;
    }

    protected getItems(items: DataExpression[], makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayerProperties): LayerInfo[]
    {
        let result: LayerInfo[] = [];
        for(let item of items)
        {
            let layer = makeLayer(item);
            result.push(new LayerInfo(layer, []));
        }
        return result;
    }

    protected getRGBItems(items: RGBMix[], makeLayer: (source: DataExpression | RGBMix)=>LocationDataLayerProperties): RGBLayerInfo[]
    {
        let result: RGBLayerInfo[] = [];
        for(let item of items)
        {
            let layer = makeLayer(item);
            result.push(
                new RGBLayerInfo(
                    layer,
                    item.red.expressionName,
                    item.green.expressionName,
                    item.blue.expressionName,
                )
            );
        }
        return result;
    }

    recalcHeaderInfos(exprList: ExpressionListItems): void
    {
        // Run through the groups and recalc them, passing in a count until there (so first visible idx can be calculated correctly)
        let cumulativeIdx = 0;
        for(let group of exprList.groups.values())
        {
            group.reCountHeaderInfo(cumulativeIdx);
            cumulativeIdx += group.items.length;
        }
    }
}


// We need to store them as an array, order matters, but we also want to often refer to them by id so
// want a map (where order doesn't matter)
// So this little class handles both
export class LayerStore
{
    private _locationDataLayers: LocationDataLayer[] = [];
    private _locationDataLayerById: Map<string, LocationDataLayer> = new Map<string, LocationDataLayer>();

    addLayer(layer: LocationDataLayer): void
    {
        if(!layer)
        {
            return;
        }

        this._locationDataLayers.push(layer);
        this._locationDataLayerById.set(layer.id, layer);
    }

    getLayerArray(): LocationDataLayer[]
    {
        return Array.from(this._locationDataLayers);
    }

    getLayerIds(): string[]
    {
        // Logically you'd get this from the map, but we want them in the order of the array (draw order)
        // so loop through there
        let result = [];
        for(let layer of this._locationDataLayers)
        {
            result.push(layer.id);
        }
        return result;
    }

    // Returns null if not found
    getLayerById(id: string): LocationDataLayer
    {
        let layer = this._locationDataLayerById.get(id);
        if(!layer)
        {
            return null;
        }
        return layer;
    }

    clear(): void
    {
        this._locationDataLayers = [];
        this._locationDataLayerById.clear();
    }
}

// Special LocationDataLayerProperties which allows setting visibility flag. Only needed (at time of writing)
// in special implementation of expression list for expression picker dialog

export class LocationDataLayerPropertiesWithVisibility extends LocationDataLayerProperties
{
    constructor(id: string, name: string, expressionID: string, source: DataExpression | RGBMix)
    {
        super(id, name, expressionID, source);
    }

    set visible(val: boolean)
    {
        this._visible = val;
    }

    // Inheritance doesn't bring this into class in JS... so have to rewrite it
    get visible(): boolean
    {
        return this._visible;
    }
}

export function makeDataForExpressionList(
    datasetService: DataSetService,
    widgetDataService: WidgetRegionDataService,
    exprService: DataExpressionService,
    rgbMixService: RGBMixConfigService,
): Observable<unknown[]>
{
    // Now subscribe for data we need, process when all have arrived
    let subsToCombine = [];

    subsToCombine.push(datasetService.dataset$);
    subsToCombine.push(widgetDataService.quantificationLoaded$);
    subsToCombine.push(exprService.expressionsUpdated$);
    subsToCombine.push(widgetDataService.widgetData$);
    
    if(rgbMixService)
    {
        subsToCombine.push(rgbMixService.rgbMixesUpdated$);
    }
    
    let all$ = combineLatest(subsToCombine);
    return all$;
}


export class LayerViewItem
{
    constructor(public itemType: string, public shared: boolean, public content)
    {
    }
}

export class ExpressionListItems
{
    constructor(public items: LayerViewItem[], public groups: Map<string, ExpressionListGroupItems>, public elementSubLayerOwnerIDs: string[])
    {
    }
}

// Helper for building groups with the right side-effects of having an empty entry or a shared section, and counting the
// total items/visible items for display correctly in the header
export class ExpressionListGroupItems
{
    headerInfo: ExpressionListHeaderInfo = null;
    items: LayerViewItem[] = [];

    constructor(
        public headerItemType: string, // header type string
        headerLabel: string,
        headerOpen: boolean, // is the header open? If not, the user/shared items are ignored
        childItemType: string, // the type of item we create
        childFilter: string, // "" if no filtering, otherwise only adds child items if their name contains the filter string
        childAuthors: string[], // [] if no filtering, otherwise only adds child items if their author is in this list
        filterTagIDs: string[], // [] if no filtering, otherwise only adds child items if their tags contain one of these
        userItems,
        userItemsEmptyMsg: string,
        sharedItems,
        sharedItemsEmptyMsg: string,
        precedingItemsCount: number // how many items we've generated so far before calling this
    )
    {
        let upperCaseFilter = childFilter.toUpperCase();
        this.items = [];

        // Form a group using the 2 lists given. Here we count how many items/visible items there are so this can be
        // displayed on the header

        // Start with header info
        this.headerInfo = new ExpressionListHeaderInfo(headerLabel, 0, 0, -1, 0);

        // If this section is open, process the lists, otherwise we're done!
        let childItems: LayerViewItem[] = [];

        // Loop through child items, counting what's there, process user vs shared lists...
        let lists = [userItems, sharedItems]; // FOR TESTING: [userItems ? userItems.slice(0, 5) : userItems, sharedItems ? sharedItems.slice(0, 5) : sharedItems];
        let shared = false;
        let itemCount = 1; // header
        let totalCount = 0;
        for(let list of lists)
        {
            if(list)
            {
                // If we're now working on the shared list, add a header to it
                if(shared)
                {
                    itemCount++;
                    if(headerOpen)
                    {
                        // This section is NOT empty, and it's also shared, so we show a sub-heading
                        childItems.push(new LayerViewItem("shared-section", false, new ExpressionListHeaderInfo("Shared "+headerLabel, 0, 0, -1, 0)));
                    }
                }

                // Process items in this list
                let filteredListItemCount = 0;
                for(let c = 0; c < list.length; c++)
                {
                    let item = list[c];

                    if(item.layer.visible)
                    {
                        // For first visible item, save its index, for auto-scrolling
                        if(this.headerInfo.firstVisibleIdx < 0)
                        {
                            this.headerInfo.firstVisibleIdx = precedingItemsCount+itemCount;
                        }

                        // Count it too
                        this.headerInfo.visibleCount++;
                    }

                    // Check if it conforms to filter
                    if(upperCaseFilter.length > 0)
                    {
                        let upperName = item.layer.name.toUpperCase();
                        if(upperName.indexOf(upperCaseFilter) == -1)
                        {
                            // Does not contain the filter text, so don't show it
                            continue;
                        }
                    }

                    if(childAuthors && childAuthors.length > 0)
                    {
                        let upperAuthor = item.layer?.source?.creator?.user_id.toUpperCase();
                        if(!childAuthors.map(author => author.toUpperCase()).includes(upperAuthor))
                        {
                            // Was not authored by one of the authors in the filter list
                            continue;
                        }
                    }

                    if(filterTagIDs && filterTagIDs.length > 0)
                    {
                        let tagIDs = item.layer?.source?.tags;
                        if(!filterTagIDs.every(tag => tagIDs.includes(tag)))
                        {
                            // Was not tagged with one of the tags in the filter list
                            continue;
                        }
                    }

                    itemCount++;
                    filteredListItemCount++; // This item wasn't filtered, but may not be visible due to header being closed...
                    if(headerOpen)
                    {
                        childItems.push(new LayerViewItem(childItemType, shared, item));
                    }
                }

                // If we didn't add anything to the list, show the empty item
                if(filteredListItemCount <= 0)
                {
                    itemCount++;
                    if(headerOpen)
                    {
                        // This section is empty and we have a message to display...
                        childItems.push(new LayerViewItem("empty", false, shared ? sharedItemsEmptyMsg : userItemsEmptyMsg));
                    }
                }

                totalCount += filteredListItemCount;
            }

            shared = true;
        }

        // Create the header info itself
        this.headerInfo.totalCount = totalCount;
        this.headerInfo.childCount = childItems.length; // NOTE: this excludes the header itself
        this.items.push(new LayerViewItem(headerItemType, false, this.headerInfo));

        // Now add all child items
        this.items.push(...childItems);
    }

    // Can be called to re-calculate all the totals fields in header
    // This is useful if we don't want to regenerate the whole thing in case of trivial changes visibility flags on items
    reCountHeaderInfo(precedingItemsCount: number): void
    {
        // Run through each group & count how many are visible, find first index of visible too
        // NOTE: if there are no visible items, we don't want to change it because it may
        // just be a closed section (which doesn't store sub-items) but the header counts
        // are correct! These would only have 1 item (the header itself), hence the > 1
        if(this.items.length > 1)
        {
            let firstVisibleIdx = -1;
            let visibleCount = 0;
            let totalCount = 0;
            let c = 0;
            for(let item of this.items)
            {
                if(item.content && item.content.layer)
                {
                    totalCount++;
                    if(item.content.layer.visible)
                    {
                        visibleCount++;
                        if(firstVisibleIdx < 0)
                        {
                            firstVisibleIdx = precedingItemsCount+c;
                        }
                    }
                }

                c++;
            }

            this.headerInfo.totalCount = totalCount;
            this.headerInfo.visibleCount = visibleCount;
            this.headerInfo.firstVisibleIdx = firstVisibleIdx;
        }
    }
}