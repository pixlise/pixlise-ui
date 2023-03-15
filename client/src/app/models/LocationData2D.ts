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

import { PMCDataValues } from "src/app/expression-language/data-values";
import { Rect } from "src/app/models/Geometry";
import { mapLayerVisibility } from "src/app/services/view-state.service";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { RGBMix, RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { degToRad } from "src/app/utils/utils";
import { MinMax } from "./BasicTypes";
import { IColourScaleDataSource } from "./ColourScaleDataSource";
import { DataSet } from "./DataSet";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";

// A class to represent a point and colour. These can be used to draw anything
// on top of our context images
export enum LocationDataPointShape
{
    CIRCLE,
    CROSSED_CIRCLE, // Like a no-entry sign
    SQUARE,
    DIAMOND,
    EX
    // TODO: Coming soon -
    // PLUS
}

export enum LocationDataPointState
{
    BELOW,
    IN_RANGE,
    ABOVE
}

export class LocationData2DDrawParams
{
    constructor(
        public colour: RGBA,
        public state: LocationDataPointState,
        public shape: LocationDataPointShape = LocationDataPointShape.CIRCLE,
        public scale: number = null
    )
    {
    }
}

export class LocationData2D
{
    constructor(
        public x: number,
        public y: number,
        public rawValue: number,
        public rep: LocationData2DDrawParams,
        public locIdx: number
    )
    {
    }
}

export class Histogram
{
    private _values: number[] = [];
    private _max: number = 0;

    constructor()
    {
        this.clear(0);
    }

    clear(numValues: number): void
    {
        this._values = Array(numValues).fill(0);
        this._max = 0;
    }

    increment(idx: number): void
    {
        this._values[idx]++;
        if(this._values[idx] > this._max)
        {
            this._max = this._values[idx];
        }
    }

    get values(): number[] { return this._values; }
    max(): number { return this._max; }
}


export class LocationDataLayerProperties
{
    protected _id: string = "";
    protected _name: string = "";
    protected _expressionID: string = "";

    protected _opacity: number = 1.0;
    protected _visible: boolean = true;

    protected _displayValueShading: ColourRamp = ColourRamp.SHADE_VIRIDIS;

    protected _isPredefinedLayer: boolean = false;
    //protected _errorMessage: string = "";

    protected _source: DataExpression | RGBMix;

    constructor(id: string, name: string, expressionID: string, source: DataExpression | RGBMix)
    {
        this._id = id;
        this._name = name;
        this._expressionID = expressionID;
        this._source = source;

        this._isPredefinedLayer = DataExpressionId.isPredefinedExpression(this._id);
    }

    get id(): string
    {
        return this._id;
    }

    get name(): string
    {
        return this._name;
    }

    set name(val: string)
    {
        this._name = val;
    }

    get expressionID(): string
    {
        return this._expressionID;
    }

    get source(): DataExpression | RGBMix
    {
        return this._source;
    }

    get opacity(): number
    {
        return this._opacity;
    }

    get visible(): boolean
    {
        return this._visible;
    }

    get displayValueShading(): ColourRamp
    {
        return this._displayValueShading;
    }

    get isPredefinedLayer(): boolean
    {
        return this._isPredefinedLayer;
    }
/*
    get errorMessage(): string
    {
        return this._errorMessage;
    }
*/
}

// TODO: Unit test this, especially in terms of histograms
export class LocationDataLayerChannel
{
    private _points: LocationData2D[] = [];

    // Only stored here so we can getValue() for mouse hover. The _points array above can't be indexed
    // into with a location idx, because where there is no calculated value it doesn't store gaps
    // so we build this lookup for PMCs
    protected _pmcToPointsLookup: Map<number, number> = new Map<number, number>();

    private _valueRange: MinMax = new MinMax();

    private _displayValueRange: MinMax = new MinMax();

    private _isBinary: boolean = true;

    private _histogram: Histogram = new Histogram();
    private _histogramSteps = 0;

    private _displayValueRangeOverride: MinMax = null;

    private _props: LocationDataLayerProperties = null;

    protected _displayValueShading: ColourRamp = ColourRamp.SHADE_MONO_GRAY;

    constructor(props: LocationDataLayerProperties, displayValueShading: ColourRamp)
    {
        this._props = props;
        this._displayValueShading = displayValueShading;

        this.clearPoints();
    }

    get isBinary(): boolean
    {
        return this._isBinary;
    }

    get displayValueRange(): MinMax
    {
        if(this._displayValueRangeOverride)
        {
            return this._displayValueRangeOverride;
        }

        return new MinMax(
            this._displayValueRange.min === null ? this._valueRange.min : this._displayValueRange.min,
            this._displayValueRange.max === null ? this._valueRange.max : this._displayValueRange.max,
        );
    }

    applyMapLayerVisibility(vis: mapLayerVisibility): void
    {
        if(vis.displayValueRangeMin == 0 && vis.displayValueRangeMax == 0)
        {
            // Assume 0's mean empty
            // TODO: fix API to return nulls in this case?
            this._displayValueRange = new MinMax();
        }
        else
        {
            this._displayValueRange = new MinMax(vis.displayValueRangeMin, vis.displayValueRangeMax);
        }

        // TODO: appears there's a bug, this is called before there is data, so checkValidMinMax ends up making the values null!

        this.checkValidMinMax();
        this.reshadePoints();
    }

    setHistogramSteps(steps: number): void
    {
        this._histogramSteps = steps;
        if(this._histogramSteps > 0)
        {
            this.rebuildHistogram();
        }
    }

    private clearPoints(): void
    {
        this._points = [];
        this._pmcToPointsLookup.clear();
        this._valueRange = new MinMax();
        // NOTE: not clearing _displayValueRange here!
        this._isBinary = true;
        this.clearHistogram();
    }

    generatePoints(data: PMCDataValues, dataset: DataSet): void
    {
        this.clearPoints();

        for(let quantItem of data.values)
        {
            let locIdx = dataset.pmcToLocationIndex.get(quantItem.pmc);
            if(locIdx !== null && locIdx !== undefined)
            {
                let locCache = dataset.locationPointCache[locIdx];
                if(locCache.coord)
                {
                    // Ensure it's the right one!
                    if(locCache.PMC != quantItem.pmc)
                    {
                        throw new Error("LocationData2D: Mismatched PMC when finding coordinates for "+quantItem.pmc);
                    }

                    // If this is marked as undefined, stop here, we are one of the few
                    // things that don't treat this as 0
                    if(!quantItem.isUndefined)
                    {
                        // remember index it'll be at
                        this._pmcToPointsLookup.set(locCache.PMC, this._points.length);

                        // Store with x/y values and a colour
                        this._points.push(new LocationData2D(
                            locCache.coord.x,
                            locCache.coord.y,
                            quantItem.value,
                            null,
                            locIdx
                        ));

                        this.expandMinMax(this._points.length-1);
                    }
                }
                else
                {
                    // TODO: This was introduced because of non-flightmodel datasets generating beam locations for the "special" PMCs (I think)... should be removed
                    //       at some point, as this check shouldn't be required
                    console.warn("Loc Idx: "+locIdx+" has no coord! PMC="+quantItem.pmc);
                }
            }
        }

        this.reshadePoints();
    }

    // Returns error string or null if no error
    generateRGBFromChannels(red: LocationDataLayerChannel, green: LocationDataLayerChannel, blue: LocationDataLayerChannel): void
    {
        this.clearPoints();
        let pointCount = red._points.length;

        // If the sizes don't match, log the error, get the largest length, and infill the rest with 0s
        if(pointCount != green._points.length || pointCount != blue._points.length)
        {
            console.error(`generateRGBFromChannels called with differing point counts: r=${red._points.length}, g=${green._points.length}, b=${blue._points.length}`);
            pointCount = Math.max(pointCount, green._points.length, blue._points.length);
            // return "generateRGBFromChannels called with differing point counts: r="+red._points.length+", g="+green._points.length+", b="+blue._points.length;
        }

        let redValueRange = red.makeValueRangeForDraw();
        let greenValueRange = green.makeValueRangeForDraw();
        let blueValueRange = blue.makeValueRangeForDraw();

        for(let c = 0; c < pointCount; c++)
        {
            // Use first point with c within array range for x,y, and locIdx
            let currentPoint = [red._points, green._points, blue._points].filter((points) => c < points.length)[0][c];

            // Error handling for points with c outside of array length
            let [rawRed, rawGreen, rawBlue] = [red._points, green._points, blue._points].map((points) => c < points.length ? points[c].rawValue : 0);

            this._points.push(new LocationData2D(
                currentPoint.x,
                currentPoint.y,
                0,
                new LocationData2DDrawParams(
                    new RGBA(
                        redValueRange.getAsPercentageOfRange(rawRed, true)*255,
                        greenValueRange.getAsPercentageOfRange(rawGreen, true)*255,
                        blueValueRange.getAsPercentageOfRange(rawBlue, true)*255,
                        255
                    ),
                    LocationDataPointState.IN_RANGE,
                    LocationDataPointShape.SQUARE
                ),
                currentPoint.locIdx
            ));
        }
    }

    getValue(pmc: number): number
    {
        let idx = this._pmcToPointsLookup.get(pmc);
        if(idx != undefined && idx >= 0 && idx < this._points.length)
        {
            return this._points[idx].rawValue;
        }
        return null;
    }

    private reshadePoints(): void
    {
        let valueRange = this.makeValueRangeForDraw();

        for(let c = 0; c < this._points.length; c++)
        {
            this._points[c].rep = this.makeDrawParams(
                this._points[c].rawValue,
                valueRange
            );
        }
    }

    private makeValueRangeForDraw(): MinMax
    {
        let valueRange = this._displayValueRangeOverride;
        if(!valueRange)
        {
            // NOTE: If we have a tighter range defined by the displayValueRange min/max, we use that, and anything
            // outside of it is coloured flatly
            valueRange = this._displayValueRange.getTightestRange(this._valueRange);
        }

        return valueRange;
    }

    private makeDrawParams(rawValue: number, range: MinMax): LocationData2DDrawParams
    {
        // If we're outside the range, use the flat colours
        if(!isFinite(rawValue))
        {
            return new LocationData2DDrawParams(RGBA.fromWithA(Colours.BLACK, 0.4), LocationDataPointState.BELOW, LocationDataPointShape.EX);
        }
        else if(rawValue < range.min)
        {
            return new LocationData2DDrawParams(Colours.CONTEXT_BLUE, LocationDataPointState.BELOW, LocationDataPointShape.EX);
        }
        else if(rawValue > range.max)
        {
            return new LocationData2DDrawParams(Colours.CONTEXT_PURPLE, LocationDataPointState.ABOVE, LocationDataPointShape.EX);
        }

        // Pick a colour based on where it is in the range between min-max.
        let pct = range.getAsPercentageOfRange(rawValue, true);

        // Return the colour to use
        return new LocationData2DDrawParams(
            Colours.sampleColourRamp(this._displayValueShading ? this._displayValueShading : this._props.displayValueShading, pct),
            LocationDataPointState.IN_RANGE,
            LocationDataPointShape.SQUARE
        );
    }

    getDrawParamsForRawValue(rawValue: number, rawRange: MinMax): LocationData2DDrawParams
    {
        return this.makeDrawParams(rawValue, rawRange);
    }

    getRawValueAsPercentageOfMinMax(rawValue: number): number
    {
        return this._valueRange.getAsPercentageOfRange(rawValue, false);
    }

    get valueRange(): MinMax
    {
        return this._valueRange;
    }

    setDisplayValueRangeMin(val: number): void
    {
        if(this._displayValueRange.max != null && val > this._displayValueRange.max)
        {
            return;
        }

        this._displayValueRange.setMin(val);

        this.checkValidMinMax();
        this.reshadePoints();
    }

    setDisplayValueRangeMax(val: number): void
    {
        if(this._displayValueRange.min != null && val < this._displayValueRange.min)
        {
            return;
        }

        this._displayValueRange.setMax(val);

        this.checkValidMinMax();
        this.reshadePoints();
    }

    reShade(): void
    {
        this.checkValidMinMax();
        this.reshadePoints();
    }

    setDisplayValueRangeOverride(override: MinMax): void
    {
        this._displayValueRangeOverride = override;
        this.reshadePoints();
    }

    protected checkValidMinMax(): void
    {
        //console.warn('range: '+this._minValue+'->'+this._maxValue+', disp min='+this._displayValueRangeMin+', max='+this._displayValueRangeMax);
        if(this._displayValueRange.min != null)
        {
            if(this._displayValueRange.min < this._valueRange.min)
            {
                this._displayValueRange.setMin(this._valueRange.min);
                //console.log('clamp min to min: '+this._displayValueRangeMin);
            }

            if(this._displayValueRange.min > this._valueRange.max)
            {
                this._displayValueRange.setMin(this._valueRange.max);
                //console.log('clamp min to max: '+this._displayValueRangeMin);
            }
        }

        if(this._displayValueRange.max != null)
        {
            if(this._displayValueRange.max < this._valueRange.min)
            {
                this._displayValueRange.setMax(this._valueRange.min);
                //console.log('clamp max to min: '+this._displayValueRangeMax);
            }

            if(this._displayValueRange.max > this._valueRange.max)
            {
                this._displayValueRange.setMax(this._valueRange.max);
                //console.log('clamp max to max: '+this._displayValueRangeMax);
            }
        }
    }

    getHistogram(): Histogram
    {
        return this._histogram;
    }

    private expandMinMax(idx: number): void
    {
        let value = this._points[idx].rawValue;
        let minMaxChange = false;

        if(this._valueRange.expandMin(value))
        {
            minMaxChange = true;
        }

        if(this._valueRange.expandMax(value))
        {
            minMaxChange = true;
        }

        // Check if it's a non-binary value
        if(value != 0 && value != 1)// || this._valueRange.min == this._valueRange.max)
        {
            if(this._isBinary)
            {
                this._isBinary = false;
                // We just changed our binary flag to false, so we should force histogram steps to regen
                this._histogramSteps = 0; 
                this._histogram.clear(this._histogramSteps);
            }
        }

        // Also add it to our histogram counts
        if(this._histogramSteps > 0)
        {
            if(minMaxChange)
            {
                // Our min/max changed, rebuild the whole thing
                this.rebuildHistogram();
            }
            else
            {
                // Min/max hasn't changed, so just add this to the right bin
                let stepSize = this._valueRange.getRange()/this._histogramSteps;
                if(stepSize != 0)
                {
                    let idx = Math.floor(value / stepSize);
                    this._histogram.increment(idx);
                }
            }
        }
    }

    private clearHistogram(): void
    {
        this._histogram.clear(this._histogramSteps);
    }

    private rebuildHistogram(): void
    {
        this.clearHistogram();

        if(this._histogramSteps <= 1)
        {
            return;
        }

        // We now have a bunch of 0's, now run through all values and make sure their counts are in the right bin
        let stepSize = (this._valueRange.getRange())/(this._histogramSteps-1);
        if(stepSize == 0)
        {
            // Map is all 0's most likely
            return;
        }

        for(let p of this._points)
        {
            let val = p.rawValue-this._valueRange.min;

            // Find where to slot it in
            let idx = Math.floor(val / stepSize);

            this._histogram.increment(idx);
        }
    }

    drawLocationData(screenContext: CanvasRenderingContext2D, pointWidth: number, experimentAngle: number, dataset: DataSet): void
    {
        let ptW = pointWidth;
        let ptH = pointWidth;

        let ptWhalf = ptW*0.5;
        let ptHhalf = ptH*0.5;

        let rad45 = degToRad(45);

        for(let loc of this._points)
        {
            screenContext.fillStyle = loc.rep.colour.asStringWithA(this._props.opacity);

            if(loc.rep.shape == LocationDataPointShape.CIRCLE)
            {
                // NOTE: Circles leave more gaps and are slower!
                screenContext.beginPath();
                if(loc.rep.scale !== null) // save a multiply TODO: maybe it's not worth it doing the if??
                {
                    screenContext.arc(loc.x, loc.y, ptHhalf*loc.rep.scale, 0, 2 * Math.PI);
                }
                else
                {
                    screenContext.arc(loc.x, loc.y, ptHhalf, 0, 2 * Math.PI);
                }
                screenContext.fill();
            }
            else if(loc.rep.shape == LocationDataPointShape.CROSSED_CIRCLE)
            {
                let rad = ptHhalf*0.5;
                screenContext.beginPath();
                if(loc.rep.scale !== null) // save a multiply TODO: maybe it's not worth it doing the if??
                {
                    screenContext.arc(loc.x, loc.y, rad*loc.rep.scale, 0, 2 * Math.PI);
                }
                else
                {
                    screenContext.arc(loc.x, loc.y, rad, 0, 2 * Math.PI);
                }
                screenContext.stroke();

                rad *= 0.8;
                screenContext.beginPath();
                screenContext.moveTo(loc.x-rad, loc.y+rad);
                screenContext.lineTo(loc.x+rad, loc.y-rad);
                screenContext.stroke();
            }
            else if(loc.rep.shape == LocationDataPointShape.DIAMOND)
            {
                screenContext.save();
                screenContext.translate(loc.x, loc.y);
                screenContext.rotate(rad45);
                if(loc.rep.scale !== null) // save a multiply TODO: maybe it's not worth it doing the if??
                {
                    screenContext.fillRect(-ptWhalf*loc.rep.scale, -ptHhalf*loc.rep.scale, ptW*loc.rep.scale, ptH*loc.rep.scale);
                }
                else
                {
                    screenContext.fillRect(-ptWhalf, -ptHhalf, ptW, ptH);
                }
                screenContext.restore();
            }
            else if(loc.rep.shape == LocationDataPointShape.EX)
            {
                // Draw an X
                let rect: Rect;
                const scale = 0.6;
                if(loc.rep.scale !== null) // save a multiply TODO: maybe it's not worth it doing the if??
                {
                    rect = new Rect(loc.x-scale*ptWhalf*loc.rep.scale, loc.y-scale*ptHhalf*loc.rep.scale, scale*ptW*loc.rep.scale, scale*ptH*loc.rep.scale);
                }
                else
                {
                    rect = new Rect(loc.x-scale*ptWhalf, loc.y-scale*ptHhalf, scale*ptW, scale*ptH);
                }

                screenContext.lineWidth = 0.5;
                screenContext.strokeStyle = loc.rep.colour.asStringWithA(this._props.opacity);
                screenContext.beginPath();
                screenContext.moveTo(rect.x, rect.y);
                screenContext.lineTo(rect.maxX(), rect.maxY());
                screenContext.moveTo(rect.maxX(), rect.y);
                screenContext.lineTo(rect.x, rect.maxY());
                screenContext.stroke();
            }
            else
            {
                if(loc.locIdx < dataset.locationPointCache.length) // This is here because user may select invalid item for RGB mix, locationIndexes list is empty, don't cause invalid read
                {
                    let locCacheItem = dataset.locationPointCache[loc.locIdx];
                    if(locCacheItem.polygon.length > 0)
                    {
                        let pts = locCacheItem.polygon;

                        screenContext.beginPath();
                        screenContext.moveTo(pts[0].x, pts[0].y);

                        for(let c = 1; c < pts.length; c++)
                        {
                            screenContext.lineTo(pts[c].x, pts[c].y);
                        }
                        screenContext.closePath();
                        screenContext.fill();
                    }
                }
            }
        }
    }
}

export class LocationDataLayerValue
{
    constructor(public layerName: string, public value: number)
    {
    }
}

export class LocationDataLayer extends LocationDataLayerProperties implements IColourScaleDataSource
{
    private _channels: LocationDataLayerChannel[] = [];
    private _channelNames: string[] = [];
    private _rgbMixChannelForDraw: LocationDataLayerChannel = null;

    constructor(id: string, name: string, expressionID: string, source: DataExpression | RGBMix, channelNames: string[] = [name])
    {
        super(id, name, expressionID, source);

        if(channelNames.length != 1 && channelNames.length != 3)
        {
            throw "LocationDataLayer.channelNames must contain 1 or 3 names";
        }

        let channelShading: ColourRamp[] = [null]; // don't specify for a single channel, we want
        // it to use whatever we have set
        if(channelNames.length != 1)
        {
            channelShading = [
                ColourRamp.SHADE_MONO_FULL_RED,
                ColourRamp.SHADE_MONO_FULL_GREEN,
                ColourRamp.SHADE_MONO_FULL_BLUE
            ];
        }

        for(let c = 0; c < channelNames.length; c++)
        {
            this._channels.push(new LocationDataLayerChannel(this, channelShading[c]));
        }

        this._channelNames = Array.from(channelNames);
    }
    /*
    // WTF: you'd think this would inherit from the base class... not in JS. Without this, was returning undefined
    get errorMessage(): string
    {
        return this._errorMessage;
    }

    set errorMessage(val: string)
    {
        this._errorMessage = val;
    }
*/
    get properties(): LocationDataLayerProperties
    {
        return this;
    }

    get channelCount(): number
    {
        return this._channels.length;
    }

    // WTF: you'd think this would inherit from the base class... not in JS. Without this, was returning undefined
    get opacity(): number
    {
        return this._opacity;
    }

    // WTF: you'd think this would inherit from the base class... not in JS. Without this, was returning undefined
    get visible(): boolean
    {
        return this._visible;
    }

    get isBinary(): boolean
    {
        return this._channels.length == 1 ? this._channels[0].isBinary : false;
    }

    get displayScalingAllowed(): boolean
    {
        return true; // we want the little tags that allow setting display colour scale values
    }

    getChannelName(channel: number): string
    {
        if(!this.isValidChannel(channel))
        {
            return "";
        }

        return this._channelNames[channel];
    }

    getDisplayValueRange(channel: number): MinMax
    {
        if(!this.isValidChannel(channel))
        {
            return null;
        }

        return this._channels[channel].displayValueRange;
    }

    getValueRange(channel: number): MinMax
    {
        if(!this.isValidChannel(channel))
        {
            return null;
        }

        return this._channels[channel].valueRange;
    }

    applyMapLayerVisibility(channel: number, vis: mapLayerVisibility): void
    {
        this.opacity = vis.opacity;
        this.visible = vis.visible;
        this.displayValueShading = vis.displayValueShading;

        if(!this.isValidChannel(channel))
        {
            return;
        }

        this._channels[channel].applyMapLayerVisibility(vis);
    }

    getAsMapLayerVisibility(): mapLayerVisibility
    {
        // We only save for channel 0, for RGB maps it'll be ignored anyway
        let displayValueRange = this.getDisplayValueRange(0);
        let id = this.expressionID;

        if(this._channels.length > 1)
        {
            displayValueRange = new MinMax(0,0);
            id = this.id;
        }

        return new mapLayerVisibility(
            id,
            this.opacity,
            this.visible,
            displayValueRange.min,
            displayValueRange.max,
            this.displayValueShading
        );
    }

    setHistogramSteps(steps: number): void
    {
        for(let ch of this._channels)
        {
            ch.setHistogramSteps(steps);
        }
    }

    generatePoints(channel: number, data: PMCDataValues, dataset: DataSet): void
    {
        if(!this.isValidChannel(channel))
        {
            return;
        }

        this._channels[channel].generatePoints(data, dataset);
    }

    // Throws error string if error
    generateRGBMix(data: PMCDataValues[], dataset: DataSet): void
    {
        if(data.length != this._channels.length)
        {
            throw new Error("generateRGBMix: Mismatched channel count vs data provided");
        }

        // Set the right values in each channel, then combine into a special channel we use for drawing
        for(let c = 0; c < data.length; c++)
        {
            this._channels[c].generatePoints(data[c], dataset);
        }

        this.regenerateRGBChannelForDrawIfNeeded();
    }

    // Throws error string if error
    private regenerateRGBChannelForDrawIfNeeded(): void
    {
        if(!RGBMixConfigService.isRGBMixID(this._id))
        {
            // Not an RGB mix
            return;
        }

        if(this._channels.length != 3)
        {
            throw new Error("ERROR: RGB mix does not have 3 channels defined");
        }

        this._rgbMixChannelForDraw = new LocationDataLayerChannel(this.properties, this.properties.displayValueShading);
        this._rgbMixChannelForDraw.generateRGBFromChannels(this._channels[0], this._channels[1], this._channels[2]);
    }

    getDrawParamsForRawValue(channel: number, rawValue: number, rawRange: MinMax): LocationData2DDrawParams
    {
        if(!this.isValidChannel(channel))
        {
            return null;
        }
        return this._channels[channel].getDrawParamsForRawValue(rawValue, rawRange);
    }

    getRawValueAsPercentageOfMinMax(channel: number, rawValue: number): number
    {
        if(!this.isValidChannel(channel))
        {
            return 0;
        }

        return this._channels[channel].getRawValueAsPercentageOfMinMax(rawValue);
    }

    setDisplayValueRangeMin(channel: number, val: number): void
    {
        if(this.isValidChannel(channel))
        {
            this._channels[channel].setDisplayValueRangeMin(val);
            this.regenerateRGBChannelForDrawIfNeeded();
        }
    }

    setDisplayValueRangeMax(channel: number, val: number): void
    {
        if(this.isValidChannel(channel))
        {
            this._channels[channel].setDisplayValueRangeMax(val);
            this.regenerateRGBChannelForDrawIfNeeded();
        }
    }

    set displayValueShading(val: ColourRamp)
    {
        this._displayValueShading = val;

        for(let ch of this._channels)
        {
            ch.reShade();
        }

        this.regenerateRGBChannelForDrawIfNeeded();
    }

    setDisplayValueRangeOverride(channel: number, override: MinMax): void
    {
        if(this.isValidChannel(channel))
        {
            this._channels[channel].setDisplayValueRangeOverride(override);
        }

        this.regenerateRGBChannelForDrawIfNeeded();
    }

    // NOTE: TypeScript/JS are so shit that this can't be inherited from base class, but had to be redefined
    // otherwise all get's are resulting in vars being 'undefined' with no error/compile warning
    get displayValueShading(): ColourRamp
    {
        return this._displayValueShading;
    }

    getValue(pmc: number): LocationDataLayerValue[]
    {
        // Return a value for each channel
        let result: LocationDataLayerValue[] = [];

        for(let c = 0; c < this._channels.length; c++)
        {
            result.push(new LocationDataLayerValue(this._channelNames[c], this._channels[c].getValue(pmc)));
        }

        return result;
    }

    getHistogram(channel: number): Histogram
    {
        if(!this.isValidChannel(channel))
        {
            return null;
        }

        return this._channels[channel].getHistogram();
    }

    set opacity(opacity: number)
    {
        this._opacity = opacity;
    }

    set visible(vis: boolean)
    {
        this._visible = vis;
    }

    isVisible(): boolean
    {
        return (this._visible && this._opacity > 0.05);
    }

    drawLocationData(screenContext: CanvasRenderingContext2D, pointWidth: number, experimentAngle: number, dataset: DataSet): void
    {
        if(this._channels.length == 1)
        {
            // Draw just that channel
            this._channels[0].drawLocationData(screenContext, pointWidth, experimentAngle, dataset);
            return;
        }

        // Otherwise, we're in RGB channel mode, so draw what we have for that
        if(this._rgbMixChannelForDraw)
        {
            this._rgbMixChannelForDraw.drawLocationData(screenContext, pointWidth, experimentAngle, dataset);
        }
    }

    private isValidChannel(channel: number): boolean
    {
        return channel >= 0 && channel < this._channels.length;
    }
}
