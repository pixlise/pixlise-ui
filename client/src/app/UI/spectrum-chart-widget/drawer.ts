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

import { DiffractionPeak } from "src/app/services/diffraction-peak.service";
import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { ISpectrumChartModel, SpectrumChartLine } from "src/app/UI/spectrum-chart-widget/model-interface";
import { SpectrumChartToolHost } from "src/app/UI/spectrum-chart-widget/tools/tool-host";
import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";
import { RGBA, Colours } from "src/app/utils/colours";


export class SpectrumChartDrawer implements CanvasDrawer
{
    protected _dbg: string = "";
    protected _ctx: ISpectrumChartModel;
    protected _toolHost: SpectrumChartToolHost;

    constructor(ctx: ISpectrumChartModel, toolHost: SpectrumChartToolHost)
    {
        this._ctx = ctx;
        this._toolHost = toolHost;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Draw tool UI on top
        this.drawWorldSpaceToolUIs(screenContext, drawParams);
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        //let t0 = performance.now();
        // Bit ugly: TODO: do this in a better way
        //if(!this._ctx.xAxis)
        {
            this._ctx.recalcDisplayData(drawParams.drawViewport);
        }

        if(!this._ctx.xAxis || !this._ctx.yAxis)
        {
            return;
        }

        // Flip things so bottom-left is 0,0
        //screenContext.transform(1, 0, 0, -1, 0, viewport.height);

        //this._dbg = 'pan='+this._ctx.transform.pan.x+','+this._ctx.transform.pan.y+' scale='+this._ctx.transform.scale.x+','+this._ctx.transform.scale.y;

        //let t1 = performance.now();
        this.drawChart(screenContext, drawParams.drawViewport, drawParams.worldTransform);
        //let t2 = performance.now();
        this.drawScreenSpaceToolUIs(screenContext, drawParams);

        if(this._dbg.length)
        {
            screenContext.textAlign = "left";
            screenContext.textBaseline = "top";
            screenContext.fillStyle = Colours.ORANGE.asString();
            screenContext.font = CANVAS_FONT_SIZE_TITLE+"px Roboto";
            screenContext.fillText(this._dbg, CANVAS_FONT_SIZE_TITLE, drawParams.drawViewport.height-CANVAS_FONT_SIZE_TITLE);
        }

        //let t3 = performance.now();
        //let total=t3-t0;

        //console.log('['+this._draws+'] '+this.drawStats('recalcDisplayData', t1-t0, total)+' '+this.drawStats('drawChart', t2-t1, total)+' '+this.drawStats('drawScreenSpaceToolUIs', t3-t2, total)+' total='+(t3-t0).toPrecision(4)+'ms');
        //this._draws++;
    }
    /*private _draws: number = 0;
private drawStats(name: string, elapsed: number, total: number): string
{
    return name+'='+elapsed.toPrecision(4)+'ms ('+(100*elapsed/total).toPrecision(3)+'%)';
}
*/
    protected drawWorldSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        //screenContext.save();
        for(let drawer of this._toolHost.getDrawers())
        {
            screenContext.save();
            drawer.drawWorldSpace(screenContext, drawParams);
            screenContext.restore();
        }
        //screenContext.restore();
    }

    protected drawScreenSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        //screenContext.save();
        for(let drawer of this._toolHost.getDrawers())
        {
            screenContext.save();
            drawer.drawScreenSpace(screenContext, drawParams);
            screenContext.restore();
        }
        //screenContext.restore();
    }

    protected drawChart(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, worldTransform: CanvasWorldTransform): void
    {
        let axisDrawer = new ChartAxisDrawer();

        
        axisDrawer.drawAxes(screenContext, viewport, this._ctx.xAxis, this._ctx.xAxisLabel, this._ctx.yAxis, this._ctx.yAxisLabel);

        // Don't allow drawing over the axis now
        screenContext.save();
        screenContext.beginPath();
        screenContext.rect(this._ctx.xAxis.startPx, 0, this._ctx.xAxis.endPx, viewport.height-this._ctx.yAxis.startPx);
        screenContext.clip();

        for(let c = 0; c < this._ctx.spectrumLines.length; c++)
        {
            const spectrum  = this._ctx.spectrumLines[c];
            this.drawSpectrum(screenContext, viewport, worldTransform, spectrum, this._ctx.spectrumLineDarkenIdxs.indexOf(c) > -1);
        }

        for(let peak of this._ctx.diffractionPeaksShown)
        {
            this.drawDiffractionPeakBand(screenContext, viewport, peak);
        }
        screenContext.restore();
    }

    protected drawSpectrum(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, worldTransform: CanvasWorldTransform, spectrum: SpectrumChartLine, darken: boolean)
    {
        if(spectrum.values.length <= 0)
        {
            return;
        }

        let opacity = spectrum.opacity;
        if(darken)
        {
            opacity *= 0.2;
        }

        let clr = spectrum.color;
        if(opacity < 1)
        {
            clr = RGBA.fromString(spectrum.color).asStringWithA(opacity);
        }

        if(spectrum.drawFilled)
        {
            screenContext.fillStyle = clr;
        }
        else
        {
            screenContext.strokeStyle = clr;
        }

        screenContext.lineWidth = spectrum.lineWidth;
        screenContext.setLineDash(spectrum.dashPattern);

        screenContext.beginPath();

        // Find the first value (nearest the X axis)
        let startX = this._ctx.xAxis.canvasToValue(this._ctx.xAxis.startPx);
        let endX = this._ctx.xAxis.canvasToValue(this._ctx.xAxis.startPx+this._ctx.xAxis.endPx);

        for(let c = 1; c < spectrum.values.length; c++)
        {
            if(spectrum.xValues[c] > startX)
            {
                if(spectrum.xValues[c-1] <= startX)
                {
                    screenContext.moveTo(
                        this._ctx.xAxis.valueToCanvas(spectrum.xValues[c-1]),
                        this._ctx.yAxis.valueToCanvas(spectrum.values[c-1])
                    );
                }

                screenContext.lineTo(
                    this._ctx.xAxis.valueToCanvas(spectrum.xValues[c]),
                    this._ctx.yAxis.valueToCanvas(spectrum.values[c])
                );
            }

            // Find where to draw from & to
            if(spectrum.xValues[c] > endX)
            {
                break;
            }
        }

        if(spectrum.drawFilled)
        {
            // Draw 2 more points to bring it down to the x axis
            screenContext.lineTo(
                this._ctx.xAxis.valueToCanvas(endX),
                this._ctx.yAxis.valueToCanvas(0)
            );

            screenContext.lineTo(
                this._ctx.xAxis.valueToCanvas(startX),
                this._ctx.yAxis.valueToCanvas(0)
            );

            screenContext.fill();
        }
        else
        {
            screenContext.stroke();
        }
    }

    drawDiffractionPeakBand(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, peak: DiffractionPeak)
    {
        screenContext.fillStyle = Colours.GRAY_60.asStringWithA(0.3);

        let x1 = this._ctx.xAxis.valueToCanvas(peak.keV-0.1);
        let x2 = this._ctx.xAxis.valueToCanvas(peak.keV+0.1);

        screenContext.fillRect(x1, 0, x2-x1, viewport.height);
    }
}
