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

import { Rect } from "src/app/models/Geometry";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { HOVER_POINT_RADIUS, OutlineDrawer, OUTLINE_LINE_WIDTH, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";
import { TernaryDiagramDrawer } from "../ternary-plot-widget/drawer";
import { BinaryDrawModel, BinaryPlotModel } from "./model";


export class BinaryDiagramDrawer implements CanvasDrawer
{
    protected _mdl: BinaryPlotModel;
    protected _lastCalcCanvasParams: CanvasParams;

    public showSwapButton: boolean = true;
    public lightMode: boolean = false;

    constructor(mdl: BinaryPlotModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // TODO: clean this up, bit ugly
        if(!this._mdl.drawData || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(drawParams.drawViewport))
        {
            // Sigh... eventually caved and recalcDisplayData now needs screenContext for calculating text widths of Y axis labels
            if(!this._mdl.recalcDisplayData(drawParams.drawViewport, screenContext))
            {
                return;
            }

            this._lastCalcCanvasParams = drawParams.drawViewport;
        }

        this.drawBinary(screenContext, drawParams, this._mdl.drawData);
    }

    private drawBinary(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, drawData: BinaryDrawModel): void
    {
        let clrHover = Colours.CONTEXT_PURPLE;
        let clrLasso = Colours.PURPLE;
        let viewport = drawParams.drawViewport;

        // Draw background
        screenContext.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
        screenContext.fillRect(0, 0, viewport.width, viewport.height);

        // Draw axes
        let axisDrawer = drawData.makeChartAxisDrawer();
        axisDrawer.drawAxes(
            screenContext,
            drawParams.drawViewport,
            this._mdl.drawData.xAxis,
            "", // we handle our own drawing
            this._mdl.drawData.yAxis,
            "" // we handle our own drawing
        );

        // Draw text labels on axes
        this.drawAxisLabels(screenContext, drawData, viewport);

        // Draw x/y of point being hovered (if there is one)
        this.drawHoverPoint(screenContext, drawData);

        // Draw data points
        let alpha = PointDrawer.getOpacity(drawData.totalPointCount);
        for(let c = 0; c < drawData.pointGroupCoords.length; c++)
        {
            let colourGroup = this._mdl.raw.visibleROIs[c] === "AllPoints" && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroupColours[c];
            let visibility = this._mdl.raw.visibleROIs[c] === "AllPoints" && this.lightMode ? 0.4 : alpha;
            let drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, colourGroup, null, this._mdl.raw.shapeGroups[c]);
            drawer.drawPoints(drawData.pointGroupCoords[c], visibility);
        }

        // And hover point if any
        if(this._mdl.hoverPoint !== null)
        {
            let drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
            drawer.drawPoints([this._mdl.hoverPoint], 1, true);
        }

        // And lasso if any
        if(this._mdl.mouseLassoPoints)
        {
            let drawer = new OutlineDrawer(screenContext, OUTLINE_LINE_WIDTH, clrLasso);
            drawer.drawOutline(this._mdl.mouseLassoPoints);
        }

        // If the user is hovering over any corners that have a long error, draw a special error display
        if(this._mdl.raw.xAxisData.errorMsgLong.length > 0 && this._mdl.drawData.hoverLabel=="X")
        {
            TernaryDiagramDrawer.drawErrorBox(
                screenContext,
                viewport,
                this._mdl.raw.xAxisData.errorMsgLong
            );
        }
        else if(this._mdl.raw.yAxisData.errorMsgLong.length > 0 && this._mdl.drawData.hoverLabel=="Y")
        {
            TernaryDiagramDrawer.drawErrorBox(
                screenContext,
                viewport,
                this._mdl.raw.yAxisData.errorMsgLong
            );
        }

        screenContext.restore();
    }

    private drawAxisLabels(screenContext: CanvasRenderingContext2D, drawData: BinaryDrawModel, viewport: CanvasParams): void
    {
        const rawData = this._mdl.raw;
        if(!rawData)
        {
            return;
        }

        screenContext.font = BinaryPlotModel.FONT_SIZE+"px Roboto";
        screenContext.fillStyle = this.lightMode ? Colours.GRAY_80.asString() : Colours.GRAY_30.asString();

        
        // Y axis
        this.drawYAxisLabel(
            screenContext,
            drawData.yAxisLabelArea,
            rawData.yAxisData.axisLabel,
            rawData.yAxisData.errorMsgShort,
            rawData.yAxisData.errorMsgLong,
            this._mdl.drawData.hoverLabel=="Y",
            rawData.yAxisData.modulesOutOfDate ? Colours.ORANGE.asString() : this.lightMode ? Colours.GRAY_80.asString() : Colours.GRAY_30.asString(),
        );

        // X axis
        screenContext.textAlign = "center";
        screenContext.textBaseline = "middle";
        screenContext.font = BinaryPlotModel.FONT_SIZE+"px Roboto";

        TernaryDiagramDrawer.drawAxisLabel(
            screenContext,
            drawData.xAxisLabelArea,
            rawData.xAxisData.axisLabel,
            rawData.xAxisData.errorMsgShort,
            //rawData.xAxis.errorMsgLong,
            this._mdl.drawData.hoverLabel=="X",
            rawData.xAxisData.modulesOutOfDate ? Colours.ORANGE.asString() : this.lightMode ? Colours.GRAY_80.asString() : Colours.GRAY_30.asString(),
            viewport.width,
            this.showSwapButton
        );
    }

    private drawHoverPoint(screenContext: CanvasRenderingContext2D, drawData: BinaryDrawModel)
    {
        // Draw hover values in the middle of the ticks, on top of them
        if(this._mdl.hoverPointData)
        {
            screenContext.font = BinaryPlotModel.FONT_SIZE_SMALL+"px Roboto";
            screenContext.textAlign = "center";
            screenContext.textBaseline = "middle";
            screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
            // x is easy
            screenContext.fillText(this._mdl.hoverPointData.x.toLocaleString(), drawData.xAxis.pctToCanvas(0.5), drawData.yAxis.pctToCanvas(1)+BinaryPlotModel.FONT_SIZE_SMALL*2);

            // y needs rotation
            screenContext.save();
            screenContext.translate(drawData.yAxisLabelArea.maxX()+BinaryPlotModel.LABEL_PADDING, drawData.yAxis.pctToCanvas(0.5));
            screenContext.rotate(-Math.PI/2);
            screenContext.fillText(this._mdl.hoverPointData.y.toLocaleString(), 0, 0);
            screenContext.restore();            
        }
    }

    private drawYAxisLabel(
        screenContext: CanvasRenderingContext2D,
        calculatedRect: Rect,
        axisLabel: string,
        errorStringShort: string,
        errorStringLong: string,
        isHovered: boolean,
        labelColour: string,
    )
    {
        // Rotate!
        screenContext.save();
        screenContext.translate(BinaryPlotModel.LABEL_PADDING, calculatedRect.maxY());
        screenContext.rotate(-Math.PI/2);

        let rect = new Rect(0, 0, calculatedRect.h, calculatedRect.w);

        TernaryDiagramDrawer.drawAxisLabel(
            screenContext,
            rect,
            axisLabel,
            errorStringShort,
            //errorStringLong,
            isHovered,
            labelColour,
            calculatedRect.h,
            this.showSwapButton
        );

        screenContext.restore();
    }
}
