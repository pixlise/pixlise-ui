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

import { Point, Rect } from "src/app/models/Geometry";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE, drawErrorIcon, drawSwapButton, HOVER_POINT_RADIUS, OutlineDrawer, OUTLINE_LINE_WIDTH, PLOT_POINTS_SIZE, PointDrawer, wrapText } from "src/app/utils/drawing";
import { TernaryDrawModel, TernaryModel } from "./model";




export class TernaryDiagramDrawer implements CanvasDrawer
{
    protected _mdl: TernaryModel;
    protected _lastCalcCanvasParams: CanvasParams;

    public showSwapButton: boolean = true;
    public lightMode: boolean = false;

    constructor(mdl: TernaryModel)
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
            if(!this._mdl.recalcDisplayData(drawParams.drawViewport))
            {
                return;
            }

            this._lastCalcCanvasParams = drawParams.drawViewport;
        }

        this.drawTernary(screenContext, drawParams.drawViewport, this._mdl.drawData);
    }

    private drawTernary(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, drawData: TernaryDrawModel): void
    {
        let clrLabel = this.lightMode ? Colours.GRAY_80.asString() : Colours.GRAY_30.asString();

        let clrHover = Colours.CONTEXT_PURPLE;
        let clrLasso = Colours.PURPLE;

        this.drawBackground(screenContext, viewport, drawData);

        // Draw text labels
        const rawData = this._mdl.raw;
        if(rawData)
        {
            let drawA = ()=>
            {
                TernaryDiagramDrawer.drawAxisLabel(
                    screenContext,
                    drawData.labelA,
                    rawData.cornerA.label,
                    rawData.cornerA.errorMsgShort,
                    this._mdl.drawData.hoverLabel=="A",
                    clrLabel,
                    viewport.width,
                    this.showSwapButton
                );
            };

            let drawB = ()=>
            {
                TernaryDiagramDrawer.drawAxisLabel(
                    screenContext,
                    drawData.labelB,
                    rawData.cornerB.label,
                    rawData.cornerB.errorMsgShort,
                    this._mdl.drawData.hoverLabel=="B",
                    clrLabel,
                    viewport.width,
                    this.showSwapButton
                );
            };

            // Draw whichever is hovered last
            if(this._mdl.drawData.hoverLabel=="A")
            {
                drawB();
                drawA();
            }
            else
            {
                drawA();
                drawB();
            }

            TernaryDiagramDrawer.drawAxisLabel(
                screenContext,
                drawData.labelC,
                rawData.cornerC.label,
                rawData.cornerC.errorMsgShort,
                this._mdl.drawData.hoverLabel=="C",
                clrLabel,
                viewport.width,
                this.showSwapButton
            );
        }

        // Draw hover values if we have any
        if(this._mdl.hoverPointData)
        {
            screenContext.fillStyle = clrHover.asString();

            // Right aligned - we want this near the triangle
            screenContext.textAlign = "right";
            screenContext.fillText(this._mdl.hoverPointData.a.toLocaleString(), drawData.hoverLabelA.x, drawData.hoverLabelA.y);

            // Left aligned, these are on the other side of the triangle...
            screenContext.textAlign = "left";
            screenContext.fillText(this._mdl.hoverPointData.b.toLocaleString(), drawData.hoverLabelB.x, drawData.hoverLabelB.y);
            screenContext.fillText(this._mdl.hoverPointData.c.toLocaleString(), drawData.hoverLabelC.x, drawData.hoverLabelC.y);
        }

        // Draw data points
        let alpha = PointDrawer.getOpacity(drawData.totalPointCount);
        for(let c = 0; c < drawData.pointGroupCoords.length; c++)
        {
            let colourGroup = this._mdl.raw.visibleROIs[c] === "AllPoints" && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroups[c].colour;
            let visibility = this._mdl.raw.visibleROIs[c] === "AllPoints" && this.lightMode ? 0.4 : alpha;
            let drawer = new PointDrawer(
                screenContext,
                PLOT_POINTS_SIZE,
                colourGroup,
                null,
                this._mdl.raw.pointGroups[c].shape
            );
            drawer.drawPoints(drawData.pointGroupCoords[c], visibility);
        }

        // And hover point if any
        if(this._mdl.hoverPoint != null)
        {
            let drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
            drawer.drawPoints([this._mdl.hoverPoint], 1);
        }

        // And lasso if any
        if(this._mdl.mouseLassoPoints)
        {
            let drawer = new OutlineDrawer(screenContext, OUTLINE_LINE_WIDTH, clrLasso);
            drawer.drawOutline(this._mdl.mouseLassoPoints);
        }

        // If the user is hovering over any corners that have a long error, draw a special error display
        if(this._mdl.raw.cornerA.errorMsgLong.length > 0 && this._mdl.drawData.hoverLabel=="A")
        {
            TernaryDiagramDrawer.drawErrorBox(
                screenContext,
                viewport,
                this._mdl.raw.cornerA.errorMsgLong
            );
        }
        else if(this._mdl.raw.cornerB.errorMsgLong.length > 0 && this._mdl.drawData.hoverLabel=="B")
        {
            TernaryDiagramDrawer.drawErrorBox(
                screenContext,
                viewport,
                this._mdl.raw.cornerB.errorMsgLong
            );
        }
        else if(this._mdl.raw.cornerC.errorMsgLong.length > 0 && this._mdl.drawData.hoverLabel=="C")
        {
            TernaryDiagramDrawer.drawErrorBox(
                screenContext,
                viewport,
                this._mdl.raw.cornerC.errorMsgLong
            );
        }
    }

    public static drawAxisLabel(
        ctx: CanvasRenderingContext2D,
        calculatedRect: Rect,
        cornerLabel: string,
        errorStringShort: string,
        isHovered: boolean,
        labelColour: string,
        maxX: number,
        showSwapButton: boolean = true
    ): void
    {
        const buttonSize = TernaryModel.SWAP_BUTTON_SIZE;

        // debugging
        //ctx.fillStyle = Colours.GRAY_80.asString();
        //ctx.fillRect(calculatedRect.x, calculatedRect.y, calculatedRect.w, calculatedRect.h);

        let fontSize = TernaryModel.FONT_SIZE;

        // if there is an error, show the short one
        let label = cornerLabel;
        let errIconSize = 0;

        // If there's an error, we display the error instead of the usual bits
        if(errorStringShort.length > 0)
        {
            // We're drawing an error icon!
            errIconSize = buttonSize*0.75;
            label += " Error: "+errorStringShort;
        }

        ctx.font = fontSize+"px Roboto";

        // Measure text
        let labelWidth = ctx.measureText(label).width;

        // Work out if we need to allow it to expand
        let rect = new Rect(calculatedRect.x, calculatedRect.y, calculatedRect.w, calculatedRect.h);

        let requiredWidth = errIconSize+labelWidth+TernaryModel.LABEL_PADDING+buttonSize;
        let expand = false;

        // Calculate x positions, this depends on what we're drawing
        // Try to draw centered in the box, if it's too long, draw from left
        let textX = rect.center().x-requiredWidth/2;
        if(requiredWidth > rect.w)
        {
            rect.w = requiredWidth;
            expand = true;
            // Can't change font size here, we already calculated stuff above!
            //fontSize = TernaryModel.FONT_SIZE-2;
            textX = rect.x+errIconSize;
        }

        // If we're hovered and drawing past right edge of canvas, move so we are up against right edge
        if(isHovered && rect.maxX() > maxX)
        {
            let offset = rect.maxX()-maxX;
            rect.x -= offset;
            textX -= offset;
        }

        let buttonX = textX+labelWidth+TernaryModel.LABEL_PADDING;

        // Calculate y positions
        let textY = rect.y+(buttonSize-fontSize)/2;
        let buttonY = rect.y+buttonSize/2;

        // If button is past the rect area, we draw it at the end of the rect
        // BUT if we're drawing a long error string, we allow it
        if((buttonX+buttonSize) > rect.maxX())
        {
            buttonX = rect.maxX()-buttonSize;
        }

        ctx.fillStyle = labelColour;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        // Draw a background if user is hovering over it
        if(isHovered)
        {
            ctx.fillStyle = Colours.GRAY_90.asString();
            const border = 4;
            ctx.fillRect(rect.x-border, rect.y-border, rect.w+border*2, rect.h+border*2);
            ctx.fillStyle = labelColour;
        }

        ctx.fillText(label, textX, textY);

        if(errIconSize > 0)
        {
            // NOTE: need to pass in the center!
            drawErrorIcon(ctx, new Point(textX-errIconSize/2, buttonY-(buttonSize-errIconSize)/2), errIconSize);
        }

        // NOTE: need to pass in the center!
        if(showSwapButton)
        {
            drawSwapButton(
                ctx,
                new Point(buttonX+buttonSize/2, buttonY),
                buttonSize
            );
        }
    }

    private drawBackground(ctx: CanvasRenderingContext2D, viewport: CanvasParams, mdl: TernaryDrawModel): void
    {
        // Draw color background
        ctx.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        // Draw the triangle
        ctx.strokeStyle = this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mdl.triangleA.x, mdl.triangleA.y);
        ctx.lineTo(mdl.triangleB.x, mdl.triangleB.y);
        ctx.lineTo(mdl.triangleC.x, mdl.triangleC.y);
        ctx.lineTo(mdl.triangleA.x, mdl.triangleA.y);
        ctx.stroke();

        // Draw scale/lines
        let height = mdl.triangleC.y-mdl.triangleA.y;
        let width = mdl.triangleB.x-mdl.triangleA.x;

        // Thicker lines, then thinner lines
        for(let i = 0; i < 2; i++)
        {
            ctx.lineWidth = i == 0 ? 2 : 1;

            let end = 1;
            let start = i == 0 ? 0.25 : 0.125;

            for(let t = start; t < end; t += 0.25)
            {
                // Horizontal
                ctx.beginPath();
                ctx.moveTo(mdl.triangleA.x+t*width/2, mdl.triangleA.y+t*height);
                ctx.lineTo(mdl.triangleB.x-t*width/2, mdl.triangleB.y+t*height);
                ctx.stroke();

                // Left edge direction
                ctx.beginPath();
                ctx.moveTo(mdl.triangleA.x+t*width, mdl.triangleA.y);
                ctx.lineTo(mdl.triangleC.x+t*width*0.5, mdl.triangleC.y-t*height);
                ctx.stroke();

                // Right edge direction
                ctx.beginPath();
                ctx.moveTo(mdl.triangleB.x-t*width, mdl.triangleB.y);
                ctx.lineTo(mdl.triangleC.x-t*width*0.5, mdl.triangleC.y-t*height);
                ctx.stroke();
            }
        }
    }

    public static drawErrorBox(
        ctx: CanvasRenderingContext2D,
        viewport: CanvasParams,
        err: string): void
    {
        ctx.save();

        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const fontSize = CANVAS_FONT_SIZE;
        const borderX = 25;
        const borderY = 50;
        const pad = 10;
        const errIconSize = 16;

        const maxTextWidth = viewport.width-borderX-borderX-pad-pad;

        ctx.fillStyle = Colours.GRAY_90.asString();
        ctx.fillRect(borderX, borderY, viewport.width-borderX-borderX, viewport.height-borderY-borderY);

        let center = viewport.getCenterPoint();
        drawErrorIcon(ctx, new Point(center.x, borderY+pad+errIconSize/2), errIconSize);

        ctx.font = fontSize+"px Roboto";
        ctx.fillStyle = Colours.GRAY_30.asString();

        wrapText(ctx, err, borderX+pad, borderY+pad+errIconSize+pad, maxTextWidth, fontSize);

        ctx.restore();
    }
}
