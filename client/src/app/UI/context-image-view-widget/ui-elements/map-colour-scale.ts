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

import { SentryErrorHandler } from "src/app/app.module";
import { MinMax } from "src/app/models/BasicTypes";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { getVectorBetweenPoints, Point, Rect } from "src/app/models/Geometry";
import { Histogram, LocationDataPointState } from "src/app/models/LocationData2D";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId, CanvasParams, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { ClientSideExportGenerator } from "src/app/UI/export-data-dialog/client-side-export";
import { Colours, RGBA } from "src/app/utils/colours";
import { CANVAS_FONT_WIDTH_PERCENT, drawTextWithBackground } from "src/app/utils/drawing";
import { getValueDecimals } from "src/app/utils/utils";
import { BaseUIElement, drawStrokedText } from "./base-ui-element";


class scaleInfo
{
    constructor(
        public rect: Rect,
        public stepsShown: number,
        public topTagRect: Rect,
        public bottomTagRect: Rect,

        // Fine grained sizing
        public baseSize: number,
        public boxWidth: number,
        public histBarMaxSize: number,
        public txtGap: number,
        public fontSize: number,
        public labelMaxWidth: number,
        public tagHeight: number,
        public tagYPadding: number
    )
    {
    }
}

enum MouseMode
{
    NONE,
    DRAG_ALL,
    DRAG_TOP_TAG,
    DRAG_BOTTOM_TAG,
    HOVER_MOVE,
    HOVER_TOP_TAG,
    HOVER_BOTTOM_TAG
}

class LayerChannelScale
{
    private _startTranslation: Point = null;
    private _mouseMode: MouseMode = MouseMode.NONE;

    private _tagDragYPos: number = 0;
    private _tagDragYInitialPos: number = 0;
    private _tagDragYTopLimit: number = 0;
    private _tagDragYBottomLimit: number = 0;

    private _tagRawValue: number = 0;

    private _dragPosCache: scaleInfo = null;

    private _boxHeight: number = 0;

    constructor(
        private _ctx: IContextImageModel,
        public layer: IColourScaleDataSource,
        private _channel: number
    )
    {
    }

    // The inputs and outputs to this UI element - brought together here because we now need not only to operate on a "layer", but also
    // in the situation of dataset-relative scaling, we need to set the models "display view range" min/max values
    protected getScaleRange(): MinMax
    {
        // If we're in dataset-relative mode, we need the max of the entire dataset
        if(!this._ctx.elementRelativeShading)
        {
            let layerMan = this._ctx.layerManager;
            return layerMan.weightPctValueRange;
        }

        let layer = this.getMapLayer();
        if(!layer)
        {
            return null;
        }

        return layer.getValueRange(this._channel);
    }

    protected getScaleTagValues(): MinMax
    {
        if(!this._ctx.elementRelativeShading)
        {
            return this._ctx.layerManager.datasetRelativeDisplayRange;
        }

        let layer = this.getMapLayer();
        if(!layer)
        {
            return null;
        }

        let displayValueRange = layer.getDisplayValueRange(this._channel);
        return new MinMax(displayValueRange.min, displayValueRange.max);
    }

    protected setDisplayValueRangeMin(value: number): void
    {
        if(!this._ctx.elementRelativeShading)
        {
            this._ctx.layerManager.setDatasetRelativeDisplayMin(value);
            return;
        }

        let layer = this.getMapLayer();
        if(layer)
        {
            layer.setDisplayValueRangeMin(this._channel, value);
        }
    }

    protected setDisplayValueRangeMax(value: number): void
    {
        if(!this._ctx.elementRelativeShading)
        {
            this._ctx.layerManager.setDatasetRelativeDisplayMax(value);
            return;
        }

        let layer = this.getMapLayer();
        if(layer)
        {
            layer.setDisplayValueRangeMax(this._channel, value);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Draw the scale for the top visible layer
        let layer = this.getMapLayer();
        if(layer)
        {
            let pos = this.getPosition(drawParams.drawViewport, drawParams.worldTransform, layer);
            this.drawColourScale(screenContext, pos, drawParams.drawViewport.height, drawParams.drawViewport.width, layer);
        }
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        let layer = this.getMapLayer();
        if(layer)
        {
            let histogram = layer.getHistogram(this._channel);
            if(!MapColourScale.isMapDataValid(histogram))
            {
                return CanvasInteractionResult.neither;
            }
        }

        this._tagDragYPos = 0;

        // If we're already hijacking mouse events... continue processing as needed
        if(
            event.eventId == CanvasMouseEventId.MOUSE_DRAG &&
            ( this._mouseMode == MouseMode.DRAG_ALL ||
              this._mouseMode == MouseMode.DRAG_TOP_TAG ||
              this._mouseMode == MouseMode.DRAG_BOTTOM_TAG
            )
        )
        {
            // Continue drag operation
            return this.handleMouseDrag(event);
        }
        else if(
            event.eventId == CanvasMouseEventId.MOUSE_UP || event.eventId == CanvasMouseEventId.MOUSE_LEAVE &&
            ( this._mouseMode == MouseMode.DRAG_ALL ||
              this._mouseMode == MouseMode.DRAG_TOP_TAG ||
              this._mouseMode == MouseMode.DRAG_BOTTOM_TAG
            )
        )
        {
            // Finish drag operation
            return this.handleMouseDragEnd(event);
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
            // Potentially starting drag
            return this.handleMouseDown(event);
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            // Check hover
            return this.handleMouseMove(event);
        }

        return CanvasInteractionResult.neither;
    }

    protected handleMouseDrag(event: CanvasMouseEvent): CanvasInteractionResult
    {
        let moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);

        // If still just dragging, update dragged items position
        switch (this._mouseMode)
        {
        case MouseMode.DRAG_TOP_TAG:
        case MouseMode.DRAG_BOTTOM_TAG:
            this._tagDragYPos = this._tagDragYInitialPos+moved.y;

            // NOTE: This is in canvas space, increasing values are DOWN the screen...
            // For eg, top might be 30, bottom might be 280
            // So we want to check we're within that range...
            if(this._tagDragYPos < this._tagDragYTopLimit)
            {
                this._tagDragYPos = this._tagDragYTopLimit;
            }
            if(this._tagDragYPos > this._tagDragYBottomLimit)
            {
                this._tagDragYPos = this._tagDragYBottomLimit;
            }

            let layer = this.getMapLayer();
            if(layer)
            {
                this._tagRawValue = this.getRawValueForYPos(this._tagDragYPos, this._dragPosCache.stepsShown, this._dragPosCache.rect.maxY(), this._dragPosCache.tagHeight);
            }

            //console.log('DRAG: '+this._tagDragYPos+', down='+event.canvasMouseDown.x+','+event.canvasMouseDown.y+', pt='+event.canvasPoint.x+','+event.canvasPoint.y+' moved='+moved.x+','+moved.y+', initial='+this._tagDragYInitialPos+', bottom='+this._tagDragYBottomLimit+', top='+this._tagDragYTopLimit);
            break;
        case MouseMode.DRAG_ALL:
            this._ctx.uiLayerScaleTranslation.x = this._startTranslation.x+moved.x;
            this._ctx.uiLayerScaleTranslation.y = this._startTranslation.y+moved.y;
            break;
        }
        return CanvasInteractionResult.redrawAndCatch;
    }

    protected handleMouseDragEnd(event: CanvasMouseEvent): CanvasInteractionResult
    {
        let layer = this.getMapLayer();
        if(!layer)
        {
            return CanvasInteractionResult.neither;
        }

        let result = false;

        if(this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG)
        {
            // Apply changes
            let moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
            let dragEndY = this._tagDragYInitialPos+moved.y;

            let pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);

            // Work out the raw value & set it
            let rawValue = this.getRawValueForYPos(dragEndY, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
            //console.log('mouse UP mode: '+this._mouseMode+', tagDrag['+this._tagDragYMin+', '+this._tagDragYMax+'], y='+this._tagDragYPos+', rawValue='+rawValue);
            if(this._mouseMode == MouseMode.DRAG_TOP_TAG)
            {
                this.setDisplayValueRangeMax(rawValue);

                // Now remain in "hover" mode for this tag...
                this._mouseMode = MouseMode.HOVER_TOP_TAG;
            }
            else
            {
                this.setDisplayValueRangeMin(rawValue);

                // Now remain in "hover" mode for this tag...
                this._mouseMode = MouseMode.HOVER_BOTTOM_TAG;
            }

            this._ctx.saveState("layer scale tab");
            result = true;
        }
        else
        {
            this._mouseMode = MouseMode.NONE;
        }

        this._tagDragYPos = 0;
        this._startTranslation = null;
        this._dragPosCache = null;
        this._tagRawValue = 0;

        if(result)
        {
            return CanvasInteractionResult.redrawAndCatch;
        }
        return CanvasInteractionResult.neither;
    }

    protected handleMouseDown(event: CanvasMouseEvent): CanvasInteractionResult
    {
        let layer = this.getMapLayer();
        if(!layer)
        {
            return CanvasInteractionResult.neither;
        }

        // Check if we're starting any sort of drag...
        let pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);
        if(pos.rect.containsPoint(event.canvasPoint))
        {
            let scaleTagValues = this.getScaleTagValues();

            // At this point, check if we're at least hovering over the buttons
            if(layer.displayScalingAllowed && pos.topTagRect.containsPoint(event.canvasPoint))
            {
                this._mouseMode = MouseMode.DRAG_TOP_TAG;
                this._tagDragYPos = this.getScaleYPos(scaleTagValues.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
            }
            else if(layer.displayScalingAllowed && pos.bottomTagRect.containsPoint(event.canvasPoint))
            {
                this._mouseMode = MouseMode.DRAG_BOTTOM_TAG;
                this._tagDragYPos = this.getScaleYPos(scaleTagValues.min, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
            }
            else
            {
                this._mouseMode = MouseMode.DRAG_ALL;
            }

            this._startTranslation = this._ctx.uiLayerScaleTranslation.copy();

            // If we're dragging tags, remember how far they can go
            if(this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG)
            {
                // Work out the min/max values we're allowed to drag between. When we're done
                // we apply the value as a % between these values, so it's important!
                let valueRange = this.getScaleRange();

                this._tagDragYBottomLimit = this.getScaleYPos(valueRange.min, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
                this._tagDragYTopLimit = this.getScaleYPos(valueRange.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);

                this._tagDragYInitialPos = this._tagDragYPos;

                this._dragPosCache = pos;

                // Set the initial value...
                this._tagRawValue = this.getRawValueForYPos(this._tagDragYPos, this._dragPosCache.stepsShown, this._dragPosCache.rect.maxY(), pos.tagHeight);
                //console.log('mouse DOWN mode: '+this._mouseMode+', tagDrag['+this._tagDragYMin+', '+this._tagDragYMax+'], y='+this._tagDragYPos);
                //console.log(pos);
            }
            return CanvasInteractionResult.redrawAndCatch;
        }

        this._mouseMode = MouseMode.NONE;
        return CanvasInteractionResult.neither;
    }

    protected handleMouseMove(event: CanvasMouseEvent): CanvasInteractionResult
    {
        let layer = this.getMapLayer();
        if(!layer)
        {
            return CanvasInteractionResult.neither;
        }

        // Check if mouse is hovering over us...
        let pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);
        if(pos.rect.containsPoint(event.canvasPoint))
        {
            // At this point, check if we're at least hovering over the buttons
            if(layer.displayScalingAllowed && pos.topTagRect.containsPoint(event.canvasPoint))
            {
                this._mouseMode = MouseMode.HOVER_TOP_TAG;
            }
            else if(layer.displayScalingAllowed && pos.bottomTagRect.containsPoint(event.canvasPoint))
            {
                this._mouseMode = MouseMode.HOVER_BOTTOM_TAG;
            }
            else
            {
                this._mouseMode = MouseMode.HOVER_MOVE;
            }
            return CanvasInteractionResult.redrawAndCatch;
        }

        if(this._mouseMode != MouseMode.NONE)
        {
            this._mouseMode = MouseMode.NONE;
            return CanvasInteractionResult.redrawAndCatch;
        }
        return CanvasInteractionResult.neither;
    }

    protected getPosition(viewport: CanvasParams, transform: CanvasWorldTransform, layer: IColourScaleDataSource): scaleInfo
    {
        const baseSize = 16;

        // Make everything a calc from the above, can easily scale it!
        const txtGap = baseSize/3;
        const fontSize = baseSize-3;
        const boxWidth = baseSize*(layer.channelCount == 1 ? 2 : 1);
        const histBarMaxSize = boxWidth;
        const labelMaxWidth = fontSize*5;
        const tagHeight = baseSize*1.2;
        const tagYPadding = tagHeight/2;

        const edgeMargin = 8;

        this._boxHeight = layer.isBinary ? baseSize : 3;
        const stepMul = layer.channelCount == 1 ? 2 : 4; // smaller if showing more scales
        let stepsShown = layer.isBinary ? 2 : Math.floor(256/(this._boxHeight*stepMul));

        let scaleH = stepsShown*this._boxHeight;
        let h = Math.floor(fontSize*2+scaleH+tagYPadding);

        // Reverse idx here, 0 ends up at the bottom, we want R at the top (in case of multi-channel)
        let idxForHeight = layer.channelCount-this._channel-1;

        let rect = new Rect(
            Math.floor(edgeMargin+this._ctx.uiLayerScaleTranslation.x),
            Math.floor(viewport.height-edgeMargin-h+this._ctx.uiLayerScaleTranslation.y)-idxForHeight*h,
            histBarMaxSize+boxWidth+labelMaxWidth,
            h
        );

        let tagX = Math.floor(rect.x+histBarMaxSize);
        let scaleTagValues = this.getScaleTagValues();

        let topTagY = this.getScaleYPos(scaleTagValues.max, stepsShown, rect.maxY(), tagHeight);
        if(this._mouseMode == MouseMode.DRAG_TOP_TAG)
        {
            topTagY = this._tagDragYPos;
        }

        let bottomTagY = this.getScaleYPos(scaleTagValues.min, stepsShown, rect.maxY(), tagHeight);
        if(this._mouseMode == MouseMode.DRAG_BOTTOM_TAG)
        {
            bottomTagY = this._tagDragYPos;
        }

        return new scaleInfo(
            rect,
            stepsShown,
            new Rect(
                tagX,
                Math.floor(topTagY),
                labelMaxWidth+boxWidth,
                tagHeight
            ),
            new Rect(
                tagX,
                Math.floor(bottomTagY),
                labelMaxWidth+boxWidth,
                tagHeight
            ),
            baseSize,
            boxWidth,
            histBarMaxSize,
            txtGap,
            fontSize,
            labelMaxWidth,
            tagHeight,
            tagYPadding
        );
    }

    protected getScaleYPos(rawValue: number, stepsShown: number, bottomY: number, tagHeight: number): number
    {
        // rawValue -> Y pixel position
        let scaleH = stepsShown*this._boxHeight;
        let scaleY = bottomY-tagHeight-scaleH;

        // NOTE: have to flip Y!
        let valueRange = this.getScaleRange();
        let y = scaleY+(1-valueRange.getAsPercentageOfRange(rawValue, false)) * scaleH;

        return y;
    }

    protected getRawValueForYPos(y: number, stepsShown: number, bottomY: number, tagHeight: number): number
    {
        // Y pixel position -> rawValue
        let scaleH = stepsShown*this._boxHeight;
        let scaleY = bottomY-tagHeight-scaleH;

        // NOTE: have to flip Y!
        let pct = 1-((y-scaleY) / scaleH);

        let valueRange = this.getScaleRange();
        return valueRange.min+pct*valueRange.getRange();
    }

    protected getMapLayer(): IColourScaleDataSource
    {
        return this.layer;
    }

    protected drawColourScale(screenContext: CanvasRenderingContext2D, pos: scaleInfo, viewportHeight: number, viewportWidth: number, layer: IColourScaleDataSource): void
    {
        let scaleRange = this.getScaleRange();
        if(!scaleRange)
        {
            return;
        }

        const clrBlack = Colours.BLACK.asString();
        const clrBottomTag = Colours.CONTEXT_BLUE.asString();
        const clrTopTag = Colours.CONTEXT_PURPLE.asString();

        screenContext.font = pos.fontSize+"px Roboto";
        screenContext.textAlign = "left";

        // Get the histogram too
        let histogram = layer.getHistogram(this._channel);
        if(histogram.values.length <= 0)
        {
            layer.setHistogramSteps(pos.stepsShown);
            histogram = layer.getHistogram(this._channel);
        }

        if(!MapColourScale.isMapDataValid(histogram))
        {
            // Quantification returned all 0's, so don't draw the usual scale, just
            // draw an error msg to the middle of the viewport
            screenContext.textBaseline = "middle";
            screenContext.textAlign = "center";

            let msg = layer.name+" Not Detected";
            drawStrokedText(screenContext, msg, viewportWidth/2, viewportHeight/2);
            return;
        }

        screenContext.textBaseline = "top";

        // Draw the actual scale
        this.drawScale(screenContext, histogram, pos, layer, scaleRange, clrBlack);

        // Draw the title at the top
        //screenContext.fillText(layer.name, pos.rect.x+histBarMaxSize, pos.rect.y);
        drawTextWithBackground(screenContext, layer.getChannelName(this._channel), pos.rect.x+pos.histBarMaxSize, pos.rect.y, pos.fontSize, 4);
        //drawStrokedText(screenContext, layer.getChannelName(this._channel), pos.rect.x+pos.histBarMaxSize, pos.rect.y);

        // Draw the tags for above/below the range. If it's hovered, the tags are bigger so it's clear theyre draggable
        if(histogram.values.length > 2 && layer.displayScalingAllowed)
        {
        // Draw the tag if we're hovering over the ctrl in general, but if we're hovering over a given tag
        // only draw that one
            let tags = this.getScaleTagValues();
            if(!tags)
            {
                return;
            }

            let topTagValue = tags.max;
            let bottomTagValue = tags.min;

            // If user is dragging it, get the current value at the mouse
            if(this._mouseMode == MouseMode.DRAG_TOP_TAG)
            {
                topTagValue = this._tagRawValue;
            }
            else if(this._mouseMode == MouseMode.DRAG_BOTTOM_TAG)
            {
                bottomTagValue = this._tagRawValue;
            }

            // Bottom tag
            if(!isNaN(bottomTagValue) && bottomTagValue !== null) // We had instances where expression failed, min/max/value were null, don't want to draw then!
            {
                this.drawTag(
                    screenContext,
                    pos.bottomTagRect,
                    pos,
                    clrBottomTag,
                    this._mouseMode==MouseMode.HOVER_MOVE || this._mouseMode==MouseMode.DRAG_BOTTOM_TAG || this._mouseMode==MouseMode.HOVER_BOTTOM_TAG,
                    bottomTagValue,
                    layer,
                    scaleRange
                );
            }

            // Top tag
            if(!isNaN(topTagValue) && topTagValue !== null) // We had instances where expression failed, min/max/value were null, don't want to draw then!
            {
                this.drawTag(
                    screenContext,
                    pos.topTagRect,
                    pos,
                    clrTopTag,
                    this._mouseMode==MouseMode.HOVER_MOVE || this._mouseMode==MouseMode.DRAG_TOP_TAG || this._mouseMode==MouseMode.HOVER_TOP_TAG,
                    topTagValue,
                    layer,
                    scaleRange
                );
            }
        }
    }

    /*
Draws the scale area:
 __
|  |  "topFrame", drawn if our gradient range doesn't extend to the top of the scale
XXXX  The gradient area is a bunch of filled rects
||||
OOOO
|__|  "bottomFrame", drawn if our gradient range doesn't extend to the top of the scale

*/
    private drawScale(screenContext: CanvasRenderingContext2D, histogram: Histogram, pos: scaleInfo, layer: IColourScaleDataSource, scaleRange: MinMax, labelStyle: string)
    {
        scaleRange = layer.getDisplayValueRange(this._channel) || scaleRange;
        let rawValue = scaleRange.min;
        let rawIncr = (scaleRange.getRange())/(pos.stepsShown-1);

        // Start drawing them from the bottom up
        let startingY = Math.floor(pos.rect.maxY()-pos.tagYPadding-this._boxHeight);
        let y = startingY;
        let x = Math.floor(pos.rect.x+pos.histBarMaxSize);

        // If we're not filling the whole area with scale gradient, we will draw a frame around the top/bottom area
        // Here we store vars to make that happen
        let topFrameYPos: number = null;
        let topFrameColour: string = null;
        let bottomFrameYPos: number = null;
        let bottomFrameColour: string = null;

        let showHoverText = false;
        let hoverValue = rawValue - 1;
        
        let layerMan = this._ctx.layerManager;
        let activeLayer = layerMan.getFirstVisibleLayer();

        // Check whether the user is hovering over a PMC value
        const locInfo = this._ctx.dataset.locationPointCache[this._ctx.highlighedLocationIdx];
        if(activeLayer && locInfo && locInfo.PMC) 
        {
            let values = activeLayer.getValue(locInfo.PMC);
            if(values[this._channel] && typeof values[this._channel].value === "number") 
            {
                hoverValue = values[this._channel].value;
                showHoverText = true;
            }
        }

        // Calculate which step in the loop to show the hover text if it should be visible
        let showAtStep = 0;
        if(showHoverText && hoverValue > rawValue)
        {
            // Only show hover text at these 5 intervals
            let showRanges = [0, pos.stepsShown-1, Math.floor(pos.stepsShown/2), Math.floor(pos.stepsShown/4), Math.floor(pos.stepsShown*3/4)];

            // Get the closest step corresponding to the hover value
            showAtStep = Math.min(Math.floor((hoverValue - rawValue) / rawIncr), pos.stepsShown - 1);

            // Convert the closest step to the closest interval
            showAtStep = showRanges.reduce((prev, curr) => (Math.abs(curr - showAtStep) < Math.abs(prev - showAtStep) ? curr : prev));
        }


        // Min box (bottom) to Max box (top) in steps
        let lastState: LocationDataPointState = null;
        for(let c = 0; c < pos.stepsShown; c++)
        {
            
            // Draw the rect
            let rep = layer.getDrawParamsForRawValue(this._channel, rawValue, layer.getDisplayValueRange(this._channel));
            if(rep.state == LocationDataPointState.IN_RANGE)
            {
                // Get the color of the top-most gradient rectangle
                topFrameColour = rep.colour.asString();

                screenContext.fillStyle = rep.colour.asString();
                screenContext.fillRect(x, y, pos.boxWidth, this._boxHeight);
            }

            // Save info for drawing the rects at the end
            if(lastState != rep.state)
            {
                if(lastState == LocationDataPointState.BELOW)
                {
                    bottomFrameYPos = y;
                    // Get the color of the bottom-most gradient rectangle
                    bottomFrameColour = rep.colour.asString();
                }
                else if(lastState == LocationDataPointState.IN_RANGE)
                {
                    topFrameYPos = y;
                }

                lastState = rep.state;
            }

            // Draw the label if required

            // NOTE: for binary we calculate position differently...                
            let printValue = "";
            let lblYOffset = 0;
            if(histogram.values.length == 2)
            {
                if(histogram.max() != 0)
                {
                    // If it's binary, show text labels, otherwise the values (it may be a map of say all 3 and 8's)
                    if(scaleRange.min == 0 && scaleRange.max == 1)
                    {
                        // Assume 0==false, 1==true
                        printValue = c == 0 ? "False" : "True";
                    }
                    else
                    {
                        // Draw the min vs max of the value range
                        // NOTE: This seems pointless as an element map of 1 and 2's was not detected as a binary map!
                        printValue = this.getScaleValueStr(Math.round(c == 0 ? scaleRange.min : scaleRange.max), scaleRange);
                    }

                    // Draw these labels next to the 2 boxes we show in case of a binary map
                    lblYOffset = 8;
                }
            }
            else if(c == 0 || // bottom
                    c == (pos.stepsShown-1) || // top
                    c == Math.floor(pos.stepsShown/2) || // middle
                    c == Math.floor(pos.stepsShown/4) || // bottom-qtr
                    c == Math.floor(pos.stepsShown*3/4) // top-qtr
            )
            {
                printValue = this.getScaleValueStr(scaleRange.min+(scaleRange.getRange())*(c/pos.stepsShown), scaleRange);
            }

            screenContext.fillStyle = labelStyle;

            let padding = 2;
            if(printValue.length > 0)
            {
                drawTextWithBackground(screenContext, printValue, x+pos.boxWidth+pos.txtGap, y+lblYOffset-pos.fontSize/2, pos.fontSize, padding);
            }

            if(showHoverText && showAtStep === c)
            {
                let xOffset = x + pos.boxWidth + pos.txtGap;
                xOffset = xOffset + screenContext.measureText(printValue.length > 0 ? printValue : "0.0").width;

                // Draw arrow pointing at closest label
                screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
                screenContext.beginPath();
                screenContext.moveTo(xOffset + padding, y + lblYOffset - pos.fontSize / 2 + padding * 3);
                screenContext.lineTo(xOffset + 12-padding, y + lblYOffset - pos.fontSize + padding * 3);
                screenContext.lineTo(xOffset + 12-padding, y + lblYOffset + padding * 3);
                screenContext.fill();
                screenContext.fillStyle = labelStyle;

                drawTextWithBackground(screenContext, `${hoverValue.toFixed(2)}%`, xOffset + 12, y+lblYOffset-pos.fontSize/2, pos.fontSize, padding);
            }

            // Draw histogram bar if there is one
            if(histogram.values.length && histogram.values.length > 2)
            {
                let histBarLength = histogram.values[c]/histogram.max()*pos.histBarMaxSize;
                screenContext.fillRect(x-histBarLength-1, y, histBarLength, this._boxHeight);

                // Draw a white tip (for dark background situations)
                screenContext.lineWidth = 1;
                screenContext.strokeStyle = Colours.WHITE.asString();
                screenContext.beginPath();
                screenContext.moveTo(x-histBarLength-1, y);
                screenContext.lineTo(x-histBarLength-1, y+this._boxHeight);
                screenContext.stroke();
            }

            // Move up to the next one
            y -= this._boxHeight;

            rawValue += rawIncr;
        }

        // If we have anything to draw outside the range, do it
        if(bottomFrameYPos != null)
        {
            if(layer.channelCount > 1) 
            {
                screenContext.fillStyle = bottomFrameColour;
                screenContext.fillRect(x, startingY, pos.boxWidth, bottomFrameYPos - startingY);
            }
            else
            {
                // Color for blue bottom slider bar
                let minRep = layer.getDrawParamsForRawValue(0, scaleRange.min, layer.getDisplayValueRange(this._channel));
                screenContext.strokeStyle = minRep.colour.asString();
                screenContext.lineWidth = 2;
                screenContext.beginPath();
                screenContext.moveTo(x, pos.bottomTagRect.midY());
                screenContext.lineTo(x, startingY);
                screenContext.lineTo(x+pos.boxWidth, startingY);
                screenContext.lineTo(x+pos.boxWidth, pos.bottomTagRect.midY());
                screenContext.stroke();
            }
        }

        if(topFrameYPos != null)
        {
            if(layer.channelCount > 1) 
            {
                screenContext.fillStyle = topFrameColour;
                screenContext.fillRect(x, topFrameYPos + 4, pos.boxWidth, y - topFrameYPos - 2);
            }
            else
            {
                // Color for pink top slider bar
                let maxRep = layer.getDrawParamsForRawValue(0, scaleRange.max, layer.getDisplayValueRange(this._channel));
                screenContext.strokeStyle = maxRep.colour.asString();
                screenContext.lineWidth = 2;

                // y is the top of the box, we don't want it to quite extend that far
                y += 2;
                screenContext.beginPath();
                screenContext.moveTo(x, pos.topTagRect.midY());
                screenContext.lineTo(x, y);
                screenContext.lineTo(x+pos.boxWidth, y);
                screenContext.lineTo(x+pos.boxWidth, pos.topTagRect.midY());
                screenContext.stroke();
            }
        }
    }

    /*
    Draws an entire tag:
       ____    ________
     -<____>-< | 1.234 |   (Tag only drawn if showValue==true)
               --------
     "sample box"   Tag

*/
    private drawTag(screenContext: CanvasRenderingContext2D, rect: Rect, pos: scaleInfo, colour: string, showValue: boolean, value: number, layer: IColourScaleDataSource, scaleRange: MinMax)
    {
        screenContext.lineWidth = 2;

        const midY = rect.midY();
        const tagTextX = rect.x+pos.boxWidth;

        const shrink = 3;
        let yHeight = 4;

        // Fill in the area behind the sample box
        let rep = layer.getDrawParamsForRawValue(0, value, layer.getDisplayValueRange(this._channel));
        if(rep.state == LocationDataPointState.IN_RANGE)
        {
            screenContext.fillStyle = rep.colour.asString();
            screenContext.fillRect(rect.x+shrink+1, midY-yHeight/2+1, pos.boxWidth-shrink-shrink-2, yHeight-2);
        }

        screenContext.strokeStyle = colour;
        screenContext.fillStyle = colour;

        // The line (2 parts, we don't want to draw where the rect is going!)
        screenContext.beginPath();
        screenContext.moveTo(rect.x, midY);
        screenContext.lineTo(rect.x+shrink, midY);

        screenContext.moveTo(tagTextX-shrink, midY);
        screenContext.lineTo(tagTextX, midY);
        screenContext.stroke();

        // And colour sample box
        if(showValue)
        {
            screenContext.lineWidth = 3;
        }

        screenContext.strokeRect(rect.x+shrink, midY-yHeight/2, pos.boxWidth-shrink-shrink, yHeight);

        // And the label if needed
        if(showValue)
        {
            // Draw a box for the value with a triangle pointing towards the line
            const tagBoxLeft = tagTextX+6;

            let valueStr = this.getScaleValueStr(value, scaleRange);
            screenContext.beginPath();
            screenContext.moveTo(tagTextX, midY);
            screenContext.lineTo(tagBoxLeft, rect.y);
            screenContext.lineTo(tagBoxLeft, rect.maxY());
            screenContext.closePath();
            screenContext.fill();

            screenContext.fillRect(tagBoxLeft, rect.y, valueStr.length*pos.fontSize*CANVAS_FONT_WIDTH_PERCENT+pos.txtGap, rect.h);

            screenContext.fillStyle = Colours.WHITE.asString();
            screenContext.textBaseline = "bottom";
            screenContext.fillText(valueStr, tagBoxLeft+pos.txtGap, rect.maxY()-2);
        }
    }

    private getScaleValueStr(value: number, valueRange: MinMax): string
    {
        let decimals = getValueDecimals(valueRange.max-valueRange.min);

        if(value === null)
        {
            // Shouldn't be null but we've got the odd sentry report for this
            return "null";
        }

        let s = value.toFixed(decimals);
        return s;
    }
}

export class MapColourScale extends BaseUIElement
{
    private _channelScales: LayerChannelScale[] = [];

    constructor(
        ctx: IContextImageModel,
        public layerId: string = null,
    )
    {
        super(ctx);
    }

    // This is included here as a static so we can easily find code that depends on it. Ideally should be some helper
    // function, or maybe a function on the histogram itself
    public static isMapDataValid(histogram: Histogram): boolean
    {
        return histogram.values.length != 2 || histogram.max() != 0;
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        this.updateChannelScales(drawParams);

        // If we have channel scales, draw them
        for(let scale of this._channelScales)
        {
            scale.drawScreenSpace(screenContext, drawParams);
        }
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        this.updateChannelScales(null);

        // If we have channel scales, draw them
        let redraw = false;
        for(let scale of this._channelScales)
        {
            let result = scale.mouseEvent(event);
            if(result.catchEvent)
            {
                return result;
            }
            if(result.redraw)
            {
                redraw = true;
            }
        }

        if(redraw)
        {
            return CanvasInteractionResult.redrawOnly;
        }

        return CanvasInteractionResult.neither;
    }

    // Call to ensure that our channel scales stored are valid. This is because we aren't notified externally when things changed,
    // we just receive draw or input events and check what we're doing at the time. This ensures that if we had a valid set of
    // model data last time, we keep it, otherwise recreate
    private updateChannelScales(drawParams: CanvasDrawParameters): void
    {
        let layerMan = this._ctx.layerManager;
        let activeLayer: IColourScaleDataSource = null;

        if(this.layerId)
        {
            // We're forced to use this ID so nothing to change really, except make sure it's initially loaded
            activeLayer = layerMan.getLayerById(this.layerId);
        }
        else
        {
            // Check if draw params specify a layer id we're exporting to
            if(drawParams)
            {
                let exprId = ClientSideExportGenerator.getExportExpressionID(drawParams.exportItemIDs);
                if(exprId)
                {
                    activeLayer = layerMan.getLayerById(exprId);
                }
            }

            if(!activeLayer)
            {
                activeLayer = layerMan.getFirstVisibleLayer();
            }
        }

        // If nothing else to draw, we may need to draw a colour scale for the RGBU ratio image displayed (if there is one)
        if(!activeLayer && this._ctx.rgbuImageLayerForScale)
        {
            activeLayer = this._ctx.rgbuImageLayerForScale;
        }

        // See if we need to reset
        if(!activeLayer)
        {
            this._channelScales = [];
            return;
        }

        if(this._channelScales.length != activeLayer.channelCount || this._channelScales.length > 0 && this._channelScales[0].layer != activeLayer)
        {
            // Create the right channel scale drawers
            this._channelScales = [];
            for(let c = 0; c < activeLayer.channelCount; c++)
            {
                this._channelScales.push(new LayerChannelScale(this._ctx, activeLayer, c));
            }
        }
    }

    get channelScales(): LayerChannelScale[]
    {
        return this._channelScales;
    }
}
