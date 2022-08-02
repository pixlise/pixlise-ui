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

// Based on:
// https://github.com/chartjs/chartjs-plugin-zoom/blob/master/src/plugin.js
// With modifications

import Chart from "chart.js";
//import Hammer from 'hammerjs';
import { Point } from "src/app/models/Geometry";
import { Colours } from "src/app/utils/colours";


let helpers = Chart.helpers;


export enum ChartArea
{
    AREA_LEFT,
    AREA_BOTTOM,
    AREA_CHART
}

class PIXLChartJSMouseInteraction
{
    private _chart = null;
    private _canvas = null;
    private _mouseDownPoint: Point = null;
    private _lastMouseMovePoint: Point = null;
    private _scaleBackup = {};
    private _hammerJSManager = null;
    private _chartPanZoomLabel: string = "";
    private _rangeSelectStartX: number = null;
    private _rangeSelectCurrentX: number = null;

    constructor(chart)
    {
        this._chart = chart;
        this._canvas = chart.canvas;

        // Get options
        let options = this.getPluginOptions();

        this.installListeners(options);
        //this.initHammerJS(options);
    }

    destroy(): void
    {
        //console.warn('PIXLChartJSMouseInteraction destroy()');
        this.clearListeners();
        //this.clearHammerJS();
    }

    resetZoom(dirXY: string): void
    {
        // In case we don't have something saved, save it
        this.backupChartScaleSettings();

        // Run through any backups we have, and restore those options
        let scaleBackup = this._scaleBackup;
        helpers.each(this._chart.scales, function(scale)
        {
            if(dirXY == "XY" || dirXY == "X" && scale.isHorizontal() || dirXY == "Y" && !scale.isHorizontal())
            {
                let timeOptions = scale.options.time;
                let tickOptions = scale.options.ticks;

                if(scaleBackup[scale.id])
                {
                    if(timeOptions)
                    {
                        timeOptions.min = scaleBackup[scale.id].time.min;
                        timeOptions.max = scaleBackup[scale.id].time.max;
                    }

                    if(tickOptions)
                    {
                        tickOptions.min = scaleBackup[scale.id].ticks.min;
                        tickOptions.max = scaleBackup[scale.id].ticks.max;
                    }
                }
                else
                {
                    if(timeOptions)
                    {
                        delete timeOptions.min;
                        delete timeOptions.max;
                    }

                    if(tickOptions)
                    {
                        delete tickOptions.min;
                        delete tickOptions.max;
                    }
                }
            }
        });

        this._chart.update(0);
    }

    afterDraw(options): void
    {
        let ctx = this._chart.ctx;
        let chartArea = this._chart.chartArea;

        if(this._chartPanZoomLabel.length > 0)
        {
            // If we have to draw a chart zoom percentage, do it
            ctx.save();

            let white = Colours.WHITE.asString();
            ctx.strokeStyle = white;
            ctx.fillStyle = white;

            let x = (chartArea.left+chartArea.right)/2;
            let y = (chartArea.top+chartArea.bottom)/2;
            ctx.fillText(this._chartPanZoomLabel, x, y);

            ctx.restore();
        }

        if(this._rangeSelectStartX != null && this._rangeSelectCurrentX != null)
        {
            // Draw a range selection transparent area
            ctx.save();

            let clr = Colours.WHITE.asStringWithA(0.2);
            ctx.fillStyle = clr;

            ctx.fillRect(this._rangeSelectStartX, chartArea.top, this._rangeSelectCurrentX-this._rangeSelectStartX, chartArea.bottom-chartArea.top);
            
            ctx.restore();
        }
    }

    private installListeners(options): void
    {
        let node = this.getChartCanvas();
        if(!node)
        {
            console.error("Failed to initialize PIXLChartJSMouseInteraction - no canvas");
            return;
        }

        let plugin = this.getChartPlugin();

        // Set up the listeners
        plugin._mouseWheelHandler = (event) => { plugin.handler.mouseWheelHandler(event); };
        plugin._mouseDownHandler = (event) => { plugin.handler.mouseDownHandler(event); };
        plugin._mouseMoveHandler = (event) => { plugin.handler.mouseMoveHandler(event); };
        plugin._mouseUpHandler = (event) => { plugin.handler.mouseUpHandler(event); };

        if(options.zoom.enabledX || options.zoom.enabledY)
        {
            node.addEventListener("wheel", plugin._mouseWheelHandler);
        }

        if(options.pan.enabledX || options.pan.enabledY)
        {
            node.addEventListener("mousedown", plugin._mouseDownHandler);
            node.ownerDocument.addEventListener("mouseup", plugin._mouseUpHandler);
        }

        // Always listening for mouse move!
        node.addEventListener("mousemove", plugin._mouseMoveHandler);
    }
    /*
    private initHammerJS(options): void
    {
        if(!Hammer)
        {
            return;
        }

        let node = this.getChartCanvas();
        let panThreshold = helpers.isNullOrUndef(options.pan.threshold) ? 1 : options.pan.threshold;

        let mc = new Hammer.Manager(node);
        mc.add(new Hammer.Pinch());
        mc.add(new Hammer.Pan({
            threshold: panThreshold
        }));

        let plugin = this.getChartPlugin();

        let self = this;

        // Hammer reports the total scaling. We need the incremental amount
        let currentPinchScaling;
        let handlePinch = function(e)
            {
                let diff = 1 / (currentPinchScaling) * e.scale;
                let rect = e.target.getBoundingClientRect();
                let offsetX = e.center.x - rect.left;
                let offsetY = e.center.y - rect.top;
                let center = new Point(offsetX, offsetY);

                // fingers position difference
                var x = Math.abs(e.pointers[0].clientX - e.pointers[1].clientX);
                var y = Math.abs(e.pointers[0].clientY - e.pointers[1].clientY);

                // diagonal fingers will change both (xy) axes
                var p = x / y;
                var xy;
                if (p > 0.3 && p < 1.7) {
                    xy = 'xy';
                } else if (x > y) {
                    xy = 'x'; // x axis
                } else {
                    xy = 'y'; // y axis
                }

console.log('hammer pinch: center='+center.x+','+center.y+', diff='+diff);
                self.doZoom(center, diff, options);

                // Keep track of overall scale
                currentPinchScaling = e.scale;
            }
        ;

        mc.on('pinchstart', function()
            {
                currentPinchScaling = 1; // reset tracker
            }
        );
        mc.on('pinch', handlePinch);
        mc.on('pinchend', function(e)
            {
                handlePinch(e);
                currentPinchScaling = null; // reset
                plugin._zoomCumulativeDelta = 0;
            }
        );

        let currentDeltaX = null;
        let currentDeltaY = null;
        let panning = false;
        let handlePan = function(e)
            {
                if (currentDeltaX !== null && currentDeltaY !== null)
                {
                    panning = true;
                    let deltaX = e.deltaX - currentDeltaX;
                    let deltaY = e.deltaY - currentDeltaY;
                    currentDeltaX = e.deltaX;
                    currentDeltaY = e.deltaY;

console.log('hammer pan: delta='+deltaX+','+deltaY);
                    self.doPan(new Point(deltaX, deltaY), options);
                }
            }
        ;

        mc.on('panstart', function(e)
        {
            currentDeltaX = 0;
            currentDeltaY = 0;
            handlePan(e);
        });
        mc.on('panmove', handlePan);
        mc.on('panend', function()
            {
                currentDeltaX = null;
                currentDeltaY = null;
                plugin._panCumulativeDelta = 0;
                setTimeout(function() {
                    panning = false;
                }, 500);
            }
        );

        plugin._ghostClickHandler = function(e)
        {
console.log('hammer ghost click handler');
            if (panning && e.cancelable) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        };
        node.addEventListener('click', plugin._ghostClickHandler);

        this._hammerJSManager = mc;
    }
*/
    private clearListeners()
    {
        let plugin = this.getChartPlugin();
        let node = this.getChartCanvas();
        if(node !== null)
        {
            node.removeEventListener("mousedown", plugin._mouseDownHandler);
            delete plugin._mouseDownHandler;

            node.removeEventListener("mousemove", plugin._mouseMoveHandler);
            delete plugin._mouseMoveHandler;

            node.ownerDocument.removeEventListener("mouseup", plugin._mouseUpHandler);
            delete plugin._mouseUpHandler;

            node.removeEventListener("wheel", plugin._mouseWheelHandler);
            delete plugin._mouseWheelHandler;
        }
    }
    /*
    private clearHammerJS()
    {
        let mc = this._hammerJSManager;
        if(mc)
        {
            mc.remove('pinchstart');
            mc.remove('pinch');
            mc.remove('pinchend');
            mc.remove('panstart');
            mc.remove('pan');
            mc.remove('panend');
            mc.destroy();

            this._hammerJSManager = null;
        }

        let plugin = this.getChartPlugin();
        let node = this.getChartCanvas();

        // If the hammer stuff happened to install one...
        node.removeEventListener('click', plugin._ghostClickHandler);
        delete plugin._ghostClickHandler;
    }
*/
    private backupChartScaleSettings(): void
    {
        // Get the backup & store any scales in there
        let scaleBackup = this._scaleBackup;
        helpers.each(this._chart.scales, function(scale)
        {
            if(!scaleBackup[scale.id])
            {
                scaleBackup[scale.id] = helpers.clone(scale.options);
            }
        });

        // Also, remove any scales no longer there
        let self = this;
        helpers.each(scaleBackup, function(opt, key)
        {
            if(!self._chart.scales[key])
            {
                delete scaleBackup[key];
            }
        });
    }

    private getPluginOptions()
    {
        return this._chart.options.plugins["mouseInteraction"];
    }

    private getChartCanvas()
    {
        return this._canvas;
    }

    private getChartPlugin()
    {
        return this._chart.$mouseHandler;
    }

    private screenToCanvas(pt: Point): Point
    {
        let canvas = this.getChartCanvas();
        let canvasScreenRect = canvas.getBoundingClientRect();
        let canvasPt = new Point(pt.x-canvasScreenRect.left, pt.y-canvasScreenRect.top);
        return canvasPt;
    }

    private classifyMouseEventArea(canvasPt: Point): ChartArea
    {
        let area = ChartArea.AREA_CHART;
        if(canvasPt.x < this._chart.chartArea.left)
        {
            // Event happened in Y scale area
            area = ChartArea.AREA_LEFT;
        }
        else if(canvasPt.y > this._chart.chartArea.bottom)
        {
            // X-axis area
            area = ChartArea.AREA_BOTTOM;
        }

        return area;
    }

    private mouseWheelHandler(event): void
    {
        //console.log('mouseWheelHandler:');

        let options = this.getPluginOptions();

        let wheelDelta = event.deltaY;
        if(options.zoom.needsSHIFT)
        {
            if(!event.shiftKey)
            {
                // Ignore, settings say shift needs to be pressed, and it's not!
                return;
            }

            // NOTE: in this case we need to read the delta value differently
            wheelDelta = event.deltaX;
        }

        let pt = this.screenToCanvas(new Point(event.clientX, event.clientY));
        this.doZoom(pt, wheelDelta < 0, options);

        if(event.cancelable)
        {
            event.preventDefault();
        }
    }

    private mouseDownHandler(event): void
    {
        let options = this.getPluginOptions();
        let isPan = this.isPan(event, options);

        let pt = this.screenToCanvas(new Point(event.clientX, event.clientY));
        this._mouseDownPoint = pt;
        this._lastMouseMovePoint = pt;

        if(!isPan)
        {
            let area = this.classifyMouseEventArea(pt);
            this.notifyMouseEvent(options, pt, "down", area, event);
        }
    }

    private mouseMoveHandler(event): void
    {
        // A mouse move clears any kind of zoom help message
        this._chartPanZoomLabel = "";

        let options = this.getPluginOptions();

        // Determine who is using the event up - if we're set to zoom/pan out of it, do that, otherwise pass it to the mouse drag handler if there is one
        let panChart = this.isPan(event, options);

        let pt = this.screenToCanvas(new Point(event.clientX, event.clientY));

        // If the mouse is currently down, check the distance
        if(panChart && this._mouseDownPoint)
        {
            // work out a delta
            let delta = new Point(pt.x-this._lastMouseMovePoint.x, pt.y-this._lastMouseMovePoint.y);
            this.doPan(delta, options);
        }
        else
        {
            let area = this.classifyMouseEventArea(pt);
            this.notifyMouseEvent(options, pt, this._mouseDownPoint ? "drag" : "move", area, event);
        }

        this._lastMouseMovePoint = pt;
    }

    private mouseUpHandler(event): void
    {
        let options = this.getPluginOptions();
        let isPan = this.isPan(event, options);

        let pt = this.screenToCanvas(new Point(event.clientX, event.clientY));
        this._lastMouseMovePoint = pt;

        if(!isPan)
        {
            let area = this.classifyMouseEventArea(pt);
            this.notifyMouseEvent(options, pt, "up", area, event);
        }

        this._mouseDownPoint = null;
        this._lastMouseMovePoint = null;
    }

    private notifyMouseEvent(options, pt: Point, eventType: string, area: ChartArea, event): void
    {
        if(options.enableRangeSelect)
        {
            if(eventType == "down")
            {
                this._rangeSelectStartX = pt.x;
            }

            if(eventType == "drag")
            {
                this._rangeSelectCurrentX = pt.x;
            }

            if(eventType == "up" && this._rangeSelectStartX != null && this._rangeSelectCurrentX != null)
            {
                // Notify out
                if(options.mouseEventCallback)
                {
                    // Find the values on X scale
                    let xFrom = -1;
                    let xTo = -1;
                    let self = this;
                    helpers.each(this._chart.scales, function(scale)
                    {
                        if(scale.isHorizontal())
                        {
                            xFrom = parseInt(scale.getValueForPixel(self._rangeSelectStartX));
                            xTo = parseInt(scale.getValueForPixel(self._rangeSelectCurrentX));
                        }
                    }
                    );

                    if(xFrom > xTo)
                    {
                        let tmp = xTo;
                        xTo = xFrom;
                        xFrom = tmp;
                    }

                    if(xFrom < 0)
                    {
                        xFrom = 0;
                    }

                    options.mouseEventCallback(
                        {
                            canvasPt: pt,
                            chart: this._chart,
                            xFrom: xFrom,
                            xTo: xTo,
                            type: "select",
                            chartArea: area,
                            event: event
                        }
                    );
                }
                else
                {
                    console.warn("ChartJS Mouse Interaction plugin: enableRangeSelect enabled but no mouseEventCallback to send selection to!");
                }

                this._rangeSelectStartX = null;
                this._rangeSelectCurrentX = null;
            }
        }

        if((eventType == "move" || !options.enableRangeSelect) && options.mouseEventCallback)
        {
            options.mouseEventCallback(
                {
                    canvasPt: pt,
                    lastCanvasPt: this._lastMouseMovePoint,
                    mouseDownCanvasPt: this._mouseDownPoint,
                    chart: this._chart,
                    type: eventType,
                    chartArea: area,
                    event: event
                }
            );
        }
    }

    private isPan(event, options): boolean
    {
        let panChart = true;

        if(options.pan.needsSHIFT)
        {
            if(!event.shiftKey)
            {
                // Ignore, settings say shift needs to be pressed, and it's not!
                panChart = false;
            }
        }
        else if(event.shiftKey || this._rangeSelectStartX != null)
        {
            // SHIFT not required for panning, but it's pressed/was pressed, so output this instead
            panChart = false;
        }
        return panChart;
    }

    private doZoom(canvasMousePos: Point, zoomIn: boolean, options): void
    {
        // In case we don't have something saved, save it
        this.backupChartScaleSettings();

        let area = this.classifyMouseEventArea(canvasMousePos);

        let axisRestriction = null;
        if(options.zoom.enabledY && area == ChartArea.AREA_LEFT)
        {
            axisRestriction = "y";
            this._chartPanZoomLabel = "Zoom-Y ";
        }
        else if(options.zoom.enabledX && (area == ChartArea.AREA_CHART || area == ChartArea.AREA_BOTTOM))
        {
            axisRestriction = "x";
            this._chartPanZoomLabel = "Zoom-X ";
        }

        let self = this;

        helpers.each(this._chart.scales, function(scale)
        {
            let axisToScale = null;
            if(axisRestriction == "y" && !scale.isHorizontal())
            {
                // Found Y scale, zoom it because the command was for a Y axis zoom!
                axisToScale = "y";
            }
            else if(axisRestriction == "x" && scale.isHorizontal())
            {
                // Found X axis and that's what we're targetting
                axisToScale = "x";
            }

            if(axisToScale)
            {
                let range = scale.max - scale.min;

                let zoomRate = 0.1;

                if(scale.options.type == "logarithmic")
                {
                    zoomRate = 0.3;
                }

                let zoomChange = zoomIn ? zoomRate : -zoomRate;
                let newDiff = range * zoomChange;

                let pixel = canvasMousePos[axisToScale];
                let minPercent = 0;
                let maxPercent = 1;

                if(scale.options.type == "logarithmic")
                {
                    //                    console.log('BEFORE minPercent='+minPercent);

                    // Do it in linear space
                    let linearMin = 0;
                    if(scale.min != 0)
                    {
                        linearMin = Math.log10(scale.min);
                    }
                    let linearMax = Math.log10(scale.max);
                    let linearRange = linearMax-linearMin;
                    let linearPixel = Math.log10(scale.getValueForPixel(pixel));
                    let linearMinPercent = (linearPixel - linearMin) / linearRange;
                    //minPercent = Math.pow(10, linearMinPercent);
                    minPercent = linearMinPercent;

                    //                    console.log('AFTER  linearMinPercent='+linearMinPercent+', minPercent='+minPercent+', linearRange: '+linearRange+', linearMin: '+linearMin+', linearMax: '+linearMax);

                    // Weight this by the logarithmic position
                    minPercent = (linearMinPercent*Math.pow(10, linearMin))/range;
                    maxPercent = ((1-linearMinPercent)*Math.pow(10, linearMax))/range;

                    //                    console.log('WEIGHTED  minPercent='+minPercent+', maxPercent='+maxPercent);
                }
                else
                {
                    minPercent = (scale.getValueForPixel(pixel) - scale.min) / range;
                    maxPercent = 1 - minPercent;
                }

                // We know how far up we've pointed when zooming
                // we also know how much of the zoom range to apply to top & bottom
                // so here we have to determine how much the zoom range is:
                // If we're higher up the chart, we have to use higher values...
                let minDelta = newDiff * minPercent;
                let maxDelta = newDiff * maxPercent;

                let newMin = scale.min + minDelta;
                let newMax = scale.max - maxDelta;

                //console.log('min: '+scale.min+', max: '+scale.max+', range: '+range+', newDiff: '+newDiff+', pixel: '+pixel+', minPercent: '+minPercent+', maxPercent: '+maxPercent+', minDelta: '+minDelta+', maxDelta: '+maxDelta+', newMin: '+newMin+', newMax: '+newMax);

                scale.options.ticks.min = self.rangeMinLimiter(options, axisToScale, newMin);
                scale.options.ticks.max = self.rangeMaxLimiter(options, axisToScale, newMax);

                // Find the "pre" zoom sizing so we can calculate an overall zoom %
                let backupScale = self._scaleBackup[scale.id];
                if(backupScale)
                {
                    let currRange = scale.getPixelForValue(scale.options.ticks.max)-scale.getPixelForValue(scale.options.ticks.min);
                    let origRange = scale.getPixelForValue(backupScale.ticks.max)-scale.getPixelForValue(backupScale.ticks.min);

                    self._chartPanZoomLabel += (origRange/currRange*100).toFixed(0) + "%";
                }
            }
        });

        this._chart.update(0);
    }

    private doPan(delta: Point, options): void
    {
        // In case we don't have something saved, save it
        this.backupChartScaleSettings();

        // We pan ALL scales
        helpers.each(this._chart.scales, function(scale)
        {
            let deltaMove = 0;

            let axis = null;
            if(scale.isHorizontal() && options.pan.enabledX)
            {
                deltaMove = delta.x;
                axis = "x";
            }
            else if(!scale.isHorizontal() && options.pan.enabledY)
            {
                deltaMove = delta.y;
                axis = "y";
            }

            if(deltaMove != 0)
            {
                let tickOpts = scale.options.ticks;
                let prevStart = scale.min;
                let prevEnd = scale.max;
                let newMin = scale.getValueForPixel(scale.getPixelForValue(prevStart) - deltaMove);
                let newMax = scale.getValueForPixel(scale.getPixelForValue(prevEnd) - deltaMove);

                let rangeMin = !helpers.isNullOrUndef(options.rangeMin[axis]) ? options.rangeMin[axis] : newMin;
                let rangeMax = !helpers.isNullOrUndef(options.rangeMax[axis]) ? options.rangeMax[axis] : newMax;

                // If we're operating on a log scale, don't allow it to keep dragging up otherwise we just smudge up the screen
                // making it look really wrong. We want to limit what our Max value can drop to.
                const LogMaxLimit = 10;
                if(scale.options.type != "logarithmic" || newMax > LogMaxLimit)
                {
                    let diff;
                    if(newMin >= rangeMin && newMax <= rangeMax)
                    {
                        tickOpts.min = newMin;
                        tickOpts.max = newMax;
                    }
                    else if(newMin < rangeMin)
                    {
                        diff = prevStart - rangeMin;
                        tickOpts.min = rangeMin;
                        tickOpts.max = prevEnd - diff;
                    }
                    else if(newMax > rangeMax)
                    {
                        diff = rangeMax - prevEnd;
                        tickOpts.max = rangeMax;
                        tickOpts.min = prevStart + diff;
                    }
                    //console.log('doPan result scale='+scale.id+' min='+tickOpts.min+', max='+tickOpts.max);
                }
            }
        });

        this._chart.update(0);
    }

    private rangeMaxLimiter(options, axis, newMax)
    {
        if(axis && options.rangeMax && !helpers.isNullOrUndef(options.rangeMax[axis]))
        {
            let rangeMax = options.rangeMax[axis];

            if(newMax > rangeMax)
            {
                newMax = rangeMax;
            }
        }
        return newMax;
    }

    private rangeMinLimiter(options, axis, newMin)
    {
        if(axis && options.rangeMin && !helpers.isNullOrUndef(options.rangeMin[axis]))
        {
            let rangeMin = options.rangeMin[axis];
            if(newMin < rangeMin)
            {
                newMin = rangeMin;
            }
        }
        return newMin;
    }
}


export const chartjsPIXLMouseInteraction =
{
    id: "mouse-interaction",

    beforeInit: function(chartInstance)
    {
        // Create our "area"
        chartInstance.$mouseHandler = {};
        chartInstance.$mouseHandler["handler"] = new PIXLChartJSMouseInteraction(chartInstance);
    },

    afterInit: function(chartInstance)
    {
        // Make resetZoom function on chart
        chartInstance.resetZoom = (dirXY: string)=>
        {
            if(!chartInstance.$mouseHandler)
            {
                return;
            }

            chartInstance.$mouseHandler.handler.resetZoom(dirXY);
        };

    },

    afterDraw: (chartInstance, options)=>
    {
        if(!chartInstance.$mouseHandler)
        {
            return;
        }

        chartInstance.$mouseHandler.handler.afterDraw(options);
    },

    destroy: function(chartInstance)
    {
        if(!chartInstance.$mouseHandler)
        {
            return;
        }

        chartInstance.$mouseHandler.handler.destroy();
        delete chartInstance.$mouseHandler;
    }
};
