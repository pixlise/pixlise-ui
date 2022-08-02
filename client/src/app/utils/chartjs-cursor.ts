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

import Chart from "chart.js";
import { Colours } from "./colours";


let helpers = Chart.helpers;


export const chartjsPluginMouseCursor =
{
    // Requires options:
    // mouseCursor { xUnit='channel' | 'keV' | 'PMC' }

    beforeEvent: (chart, event)=>
    {
        if(chart.options.plugins["mouseCursor"])
        {
            let x = chart.options.plugins["mouseCursor"]["x"];
            let y = chart.options.plugins["mouseCursor"]["y"];

            if(x == event.x && y == event.y)
            {
                // No change, ignore
                return;
            }
        }

        chart.options.plugins["mouseCursor"]["x"] = event.x;
        chart.options.plugins["mouseCursor"]["y"] = event.y;

        // Trigger a redraw
        //chart.clear();
        chart.draw();
    },

    afterDraw: (chart, options)=>
    {
        if(!chart.options.plugins["mouseCursor"])
        {
            // Don't have the mouse cursor yet, so ignore
            return;
        }
        let x = chart.options.plugins["mouseCursor"]["x"];
        let y = chart.options.plugins["mouseCursor"]["y"];

        if(x > chart.chartArea.left && x < chart.chartArea.right)
        {
            let ctx = chart.ctx;

            ctx.save();

            let white = Colours.WHITE.asString();
            ctx.strokeStyle = white;
            ctx.fillStyle = white;
            ctx.lineWidth = 1;

            let yScale = chart.scales["y"];
            ctx.beginPath();
            ctx.moveTo(x, yScale.getPixelForValue(yScale.max));
            ctx.lineTo(x, yScale.getPixelForValue(yScale.min));
            ctx.stroke();

            let xScale = chart.scales["x"];

            let label = "";

            let xunit = chart.options.plugins["mouseCursor"]["xUnit"];

            if(xunit == "channel")
            {
                label = "Ch: "+parseFloat(xScale.getValueForPixel(x)).toFixed(0);
            }
            else if(xunit == "keV")
            {
                label = parseFloat(xScale.getValueForPixel(x)).toFixed(3)+" keV";
            }
            else if(xunit == "PMC")
            {
                // Get the PMC of this value
                let idx = parseInt(xScale.getValueForPixel(x));
                let pmc = chart.options.plugins["mouseCursor"]["indexToPMCFunc"](idx);

                if(!helpers.isNullOrUndef(pmc))
                {
                    label = "PMC: "+pmc;
                }
            }
            else
            {
                // No units...
                label = parseFloat(xScale.getValueForPixel(x)).toFixed(3);
            }

            ctx.textBaseline = "hanging";

            // Make it avoid tooltips - they seem to draw on right of mouse until 1/2 way along chart area, then left
            // here we make our label move in the opposite direction
            if(x > (chart.chartArea.left+chart.chartArea.right)/2)
            {
                ctx.textAlign = "end";
            }
            else
            {
                ctx.textAlign = "start";
            }
            ctx.font = "12px \"Helvetica Neue\", Helvetica, Arial, sans-serif";

            ctx.fillText(label, x, yScale.getPixelForValue(yScale.min)+3);

            ctx.restore();
        }
    }
};
