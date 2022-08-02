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

import { MinMax } from "src/app/models/BasicTypes";
import { Point, Rect } from "src/app/models/Geometry";
import { ChartAxis, LabelledChartAxis, LinearChartAxis, LogarithmicChartAxis } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { RGBA } from "src/app/utils/colours";

export type ConcentrationBands = {
    count: number;
    precision: number;
    bands: Record<number, number>;
}

// An individual histogram bar, coloured by the region it came from
export class HistogramBar
{
    // colourInfo is really the region name, but named a bit more generically in case we draw histograms for other things...
    constructor(
        public colourInfo: string,
        public colourRGB: RGBA,
        public meanValue: number,
        public valueRange: MinMax,
        public errorValue: number,
        public errorMsg: string,
        public stdDev: number,
        public stdErr: number,
        public concentrationBands: ConcentrationBands,
    )
    {
    }
}

// The set of bars to show together at one x-axis location. Label is something like the element, or f(element), etc
export class HistogramBars
{
    constructor(
        public bars: HistogramBar[],
        public shortLabel: string,
        public longLabel: string,
        public valueRange: MinMax,
        //public roiName: string,
        //public roiID: string,
    )
    {
    }
}

// Stores groups of bars - all bars (different colours for each region), for each expression
export class HistogramData
{
    constructor(public barGroups: HistogramBars[], public valueRange: MinMax, public yAxisLabel: string)
    {
    }
}

export type ConcentrationDrawBand = {
    y: number;
    value: number;
    frequencyPercentage: number;
}

export type ConcentrationDrawBands = {
    bands: ConcentrationDrawBand[];
    width: number;
}


export class HistogramDrawBar
{
    constructor(
        public rect: Rect,
        public upperWhisker: number,
        public lowerWhisker: number,
        public groupLabel: string,
        public bar: HistogramBar,
        public concentration: ConcentrationDrawBands
    )
    {
    }
}

export class HistogramDrawData
{
    constructor(public bars: HistogramDrawBar[])
    {
    }
}

export class HistogramModel
{
    // The raw data we start with
    private _raw: HistogramData = null;

    private _showStdDeviation: boolean = true;
    private _logScale: boolean = false;
    private _showWhiskers: boolean = false;

    // The drawable data (derived from the above)
    private _xAxis: ChartAxis = null;
    private _yAxis: ChartAxis = null;
    private _keyItems: KeyItem[] = [];
    //private _chartArea: Rect = new Rect(0, 0, 0, 0);

    private _drawData: HistogramDrawData = null;

    private _hoverBar: HistogramDrawBar = null;
    private _hoverPoint: Point = null;

    constructor(showStdDeviation: boolean, logScale: boolean, showWhiskers: boolean)
    {
        this._showStdDeviation = showStdDeviation;
        this._logScale = logScale;
        this._showWhiskers = showWhiskers;
    }

    set raw(r: HistogramData)
    {
        this._raw = r;
    }

    get raw(): HistogramData
    {
        return this._raw;
    }

    get drawData(): HistogramDrawData
    {
        return this._drawData;
    }

    get xAxis(): ChartAxis
    {
        return this._xAxis;
    }

    get yAxis(): ChartAxis
    {
        return this._yAxis;
    }

    get yAxisLabel(): string
    {
        if(!this.raw)
        {
            return "";
        }
        return this.raw.yAxisLabel;
    }

    get keyItems(): KeyItem[]
    {
        return this._keyItems;
    }

    get logScale(): boolean
    {
        return this._logScale;
    }

    set logScale(val: boolean)
    {
        this._logScale = val;
        // TODO: mark dirty so recalcDisplayData is called... (for now it's always called)
    }

    get showStdDeviation(): boolean
    {
        return this._showStdDeviation;
    }

    set showStdDeviation(val: boolean)
    {
        this._showStdDeviation = val;
        // TODO: mark dirty so recalcDisplayData is called... (for now it's always called)
    }

    get showWhiskers(): boolean
    {
        return this._showWhiskers;
    }

    set showWhiskers(val: boolean)
    {
        this._showWhiskers = val;
    }


    setHover(pt: Point, bar: HistogramDrawBar): void
    {
        this._hoverBar = bar;
        this._hoverPoint = pt;
    }

    get hoverBar(): HistogramDrawBar
    {
        return this._hoverBar;
    }

    get hoverPoint(): Point
    {
        return this._hoverPoint;
    }

    // Rebuilding this models display data
    recalcDisplayData(viewport: CanvasParams): void
    {
        if(!this._raw || this._raw.barGroups.length <= 0)
        {
            return;
        }

        // Recalc the scales
        const xMargin = 60;
        const yMargin = 30;

        // Get all the labels out
        let xLabels = [];
        for(let g of this._raw.barGroups)
        {
            xLabels.push(g.shortLabel);
        }

        this._xAxis = new LabelledChartAxis(true, xMargin, viewport.width - xMargin, 0, this._raw.barGroups.length, xLabels);

        // Min/max y values, these are clamped to 0, and slightly over max, so we have nice line Y values
        const minY = 0/*this._raw.valueRange.min*/;
        let maxY = Math.ceil(this._raw.valueRange.max * 1.1); // leave some top gap

        if(this._logScale)
        {
            // KNONW ISSUE: Negative values screw up when drawing on log scale. See LogarithmicChartAxis constructor for more comments

            // Need heaps more top gap!
            //maxY = Math.ceil(this._raw.valueRange.max*2);

            let yAxis = new LogarithmicChartAxis(false, yMargin, viewport.height - yMargin, minY, maxY, 100);
            this._yAxis = yAxis;
        }
        else
        {
            let yAxis = new LinearChartAxis(false, yMargin, viewport.height - yMargin, minY, maxY);
            yAxis.setMinPixelsBetweenTicks(30);
            this._yAxis = yAxis;
        }

        // We don't pan/zoom
        let panZoom = new PanZoom();
        this._xAxis.updateAxis(viewport, panZoom);
        this._yAxis.updateAxis(viewport, panZoom);

        // Calculate chart area (don't think anything actually uses this on histogram...)
        //this._chartArea = new Rect(this._xAxis.startPx, 0, this._xAxis.pxLength, this._yAxis.pxLength);

        // Calculate the bars themselves, this is needed for drawing as well as mouse interaction
        let uiBars: HistogramDrawBar[] = [];

        const yStart = this._yAxis.valueToCanvas(0);
        let barWidth = 0;
        let groupGap = 4; // 4 pixels between groups
        let x = this._xAxis.startPx + groupGap / 2;

        for(let barGroup of this.raw.barGroups)
        {
            if(barWidth == 0)
            {
                // Width of a group of bars (multi-coloured bars drawn side-by-side)
                let groupWidth = this._xAxis.pxLength / this.raw.barGroups.length;

                // Calculate width of individual bars, leaving a gap between the groups of bars
                // Assumes bar count is the same in each group of bars
                barWidth = (groupWidth - groupGap) / barGroup.bars.length;
            }

            for(let bar of barGroup.bars)
            {
                let yTop = this._yAxis.valueToCanvas(bar.meanValue);

                let barHeight = yStart - yTop;

                // If barHeight is negative, still make it a "valid" bar, even though it's probably not visible anyway
                // This was added for the case of log scale drawing of bars with negative bottom values.
                if(barHeight < 0)
                {
                    yTop += barHeight;
                    barHeight = - barHeight;
                }

                const upperWhisker = this._yAxis.valueToCanvas(bar.valueRange.max);
                const lowerWhisker = this._yAxis.valueToCanvas(bar.valueRange.min);
                let concentration = { bands: [], width: 0 };
                Object.entries(bar.concentrationBands.bands).forEach(([band, count]) =>
                {
                    const bandValue = parseFloat(band);
                    concentration.bands.push({
                        y: this._yAxis.valueToCanvas(bandValue),
                        value: bandValue,
                        frequencyPercentage: count / bar.concentrationBands.count
                    });
                });

                const precisionAsWidth = this._yAxis.valueToCanvas(bar.concentrationBands.precision) - this._yAxis.valueToCanvas(0);
                concentration.width = precisionAsWidth > 0 ? precisionAsWidth : 1;

                uiBars.push(
                    new HistogramDrawBar(
                        new Rect(x, yTop, barWidth, barHeight),
                        upperWhisker,
                        lowerWhisker,
                        barGroup.longLabel,
                        bar,
                        concentration
                    )
                );

                x += barWidth;
            }

            x += groupGap;
        }

        this._drawData = new HistogramDrawData(uiBars);
    }
}
