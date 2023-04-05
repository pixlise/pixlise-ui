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

import { Point } from "src/app/models/Geometry";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE, drawErrorIcon } from "src/app/utils/drawing";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "../atoms/interactive-canvas/interactive-canvas.component";
import { ChordDrawMode, ChordViewModel, ChordViewNode } from "./model";


export class ChordDiagramDrawer implements CanvasDrawer
{
    private NODE_ERROR_WIDTH = 3*ChordViewModel.BASE_SIZE;
    private NODE_VALUE_WIDTH = 8*ChordViewModel.BASE_SIZE;

    private COLOUR_BACKGROUND = Colours.BLACK.asString();

    private COLOUR_NODE = "rgba(245, 247, 250, 0.4)";
    private COLOUR_NODE_LABEL_BACKGROUND = Colours.GRAY_90.asString();
    private COLOUR_NODE_LABEL_BAR_BACKGROUND = Colours.GRAY_70.asString();

    private COLOUR_NODE_LABEL = Colours.GRAY_10.asString();

    private COLOUR_NODE_ERROR = Colours.PURPLE.asString();
    private COLOUR_NODE_VALUE = Colours.GRAY_10.asString();

    private COLOUR_CHORD_POSITIVE = Colours.BLUE.asString();
    private COLOUR_CHORD_NEGATIVE = Colours.YELLOW.asString();

    protected _mdl: ChordViewModel;
    protected _lastCalcCanvasParams: CanvasParams;


    constructor(mdl: ChordViewModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // TODO: clean this up, bit ugly
        if(!this._mdl.nodes || this._mdl.nodes.length <= 0 || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(drawParams.drawViewport))
        {
            if(!this._mdl.calcDisplayData(drawParams.drawViewport))
            {
                return;
            }

            this._lastCalcCanvasParams = drawParams.drawViewport;
        }

        this.drawChordDiagram(screenContext, drawParams.drawViewport);
    }

    private drawChordDiagram(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void
    {
        // If there's a chord being highlighted, draw something under there first
        let i = 0;
        let chordHighlightIdx1 = -1;
        let chordHighlightIdx2 = -1;

        for(let node of this._mdl.nodes)
        {
            if(this._mdl.hoverChordExprIds.length == 2)
            {
                if(node.item.exprId == this._mdl.hoverChordExprIds[0])
                {
                    chordHighlightIdx1 = i;
                }
                else if(node.item.exprId == this._mdl.hoverChordExprIds[1])
                {
                    chordHighlightIdx2 = i;
                }
            }

            i++;
        }

        if(chordHighlightIdx1 != -1 && chordHighlightIdx1 != chordHighlightIdx2)
        {
            this.drawChordHighlight(screenContext, chordHighlightIdx1, chordHighlightIdx2);
        }

        // Draw chords (only draw for the selected hovered item if there is one)
        i = 0;
        for(let node of this._mdl.nodes)
        {
            if(this._mdl.hoverElementIdx < 0 || this._mdl.hoverElementIdx == i)
            {
                this.drawChords(screenContext, this._mdl.drawMode, node, i, this.COLOUR_CHORD_POSITIVE, this.COLOUR_CHORD_NEGATIVE);
            }

            if(this._mdl.hoverChordExprIds.length == 2)
            {
                if(node.item.exprId == this._mdl.hoverChordExprIds[0])
                {
                    chordHighlightIdx1 = i;
                }
                else if(node.item.exprId == this._mdl.hoverChordExprIds[1])
                {
                    chordHighlightIdx2 = i;
                }
            }

            i++;
        }

        // Then draw nodes/elements on top
        screenContext.font = CANVAS_FONT_SIZE+"px Roboto";

        screenContext.textAlign = "center";
        screenContext.textBaseline = "middle";

        // Draw first pass, only the background circles
        for(let node of this._mdl.nodes)
        {
            this.drawElementNodePass1(screenContext, viewport, node);
        }

        // Draw second pass, so labels don't get overdrawn by neighbouring background circles
        for(let node of this._mdl.nodes)
        {
            this.drawElementNodePass2(screenContext, viewport, node);
        }

        // Draw label for hovered node (if any)
        if(this._mdl.hoverElementIdx > -1 && this._mdl.hoverElementIdx < this._mdl.nodes.length)
        {
            this.drawNodeInfo(screenContext, viewport, this._mdl.nodes[this._mdl.hoverElementIdx]);
        }
    }

    private drawNodeInfo(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void
    {
        // Figure out text labels to show
        const displayDecPlaces = 3;
        const padding = 4;
        const gap = 4;

        let valueText = "";
        let errorText = "";

        if(node.item.errorMsg.length > 0)
        {
            valueText = node.item.label;
            errorText = node.item.errorMsg;
        }
        else
        {
            valueText = node.item.longLabel+": "+node.item.displayValue.toFixed(displayDecPlaces);
            errorText = "Avg Error: "+node.item.errorValue.toPrecision(displayDecPlaces);
        }

        let valueSize = screenContext.measureText(valueText);
        let errorSize = screenContext.measureText(errorText);

        // We just draw the values in the top-left corner, should generally be out of the way of other things
        screenContext.textBaseline = "top";

        let w = Math.max(valueSize.width, errorSize.width)+padding*2;
        let h = CANVAS_FONT_SIZE*2+gap+padding*2;

        let pos = viewport.getCenterPoint();

        let textX = pos.x;

        pos.x -= w/2;
        pos.y -= h/2;

        screenContext.textAlign = "center";

        // Draw background
        screenContext.fillStyle = Colours.GRAY_90.asString();
        screenContext.fillRect(pos.x, pos.y, w, h);

        // Draw the text
        screenContext.fillStyle = node.item.modulesOutOfDate ? Colours.ORANGE.asString() : Colours.GRAY_10.asString();
        screenContext.fillText(valueText, textX, pos.y+padding);

        // Draw error in error arc colour
        screenContext.fillStyle = this.COLOUR_NODE_ERROR;
        screenContext.fillText(errorText, textX, pos.y+padding+CANVAS_FONT_SIZE+gap);
    }

    private drawElementNodePass1(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void
    {
        // If there's an error...
        let labelOffsetX = 0;
        if(node.item.errorMsg.length <= 0)
        {
            // Value is drawn as a transparent circle that may overlap with neighbours, we don't mind...
            screenContext.fillStyle = this.COLOUR_NODE;
            screenContext.beginPath();
            screenContext.arc(node.coord.x, node.coord.y, node.radius, 0, 2 * Math.PI);
            screenContext.fill();
        }
    }

    private drawElementNodePass2(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void
    {
        // If there's an error...
        let labelOffsetX = 0;
        if(node.item.errorMsg.length > 0)
        {
            // Draw node label background
            screenContext.fillStyle = this.COLOUR_NODE_LABEL_BACKGROUND;
            screenContext.fillRect(node.labelRect.x, node.labelRect.y, node.labelRect.w, node.labelRect.h);

            let iconSize = node.labelRect.h*0.7;
            labelOffsetX = node.labelRect.h*0.5;
            const offset = 3;
            drawErrorIcon(screenContext, new Point(node.labelRect.x+iconSize/2+offset, node.labelRect.y+iconSize/2+offset), iconSize);
        }
        else
        {
            // NOTE: Value was already drawn in pass 1

            // Draw node label background
            screenContext.fillStyle = this.COLOUR_NODE_LABEL_BACKGROUND;
            screenContext.fillRect(node.labelRect.x, node.labelRect.y, node.labelRect.w, node.labelRect.h);

            // Error is drawn as a purple % bar across the label
            screenContext.fillStyle = this.COLOUR_NODE_ERROR;

            let barW = node.errorPct*node.labelRect.w;
            screenContext.fillRect(node.labelRect.x, node.labelRect.y, barW, node.labelRect.h);
        }

        // Label text
        screenContext.fillStyle = node.item.modulesOutOfDate ? Colours.ORANGE.asString() : this.COLOUR_NODE_LABEL;
        let pt = node.labelRect.center();
        screenContext.fillText(node.item.label, pt.x+labelOffsetX, pt.y);
    }

    private drawChords(screenContext: CanvasRenderingContext2D, drawMode: ChordDrawMode, node: ChordViewNode, nodeIdx: number, positiveColour: string, negativeColour: string): void
    {
        let chordThresholdValue = Math.abs(this._mdl.chordLowerThreshold*this._mdl.maxChordValueMagnitude);

        // Draw chords to other elements
        let c = 0;
        for(let chordValue of node.item.chords)
        {
            //console.log('chord: '+Math.abs(chordValue)+', threshold: '+chordThresholdValue);

            // Work out if we're drawing this one
            if( c != nodeIdx && // Don't draw lines to ourself!
                Math.abs(chordValue) > chordThresholdValue && // Apply thresholding
            // Apply draw mode
                    (
                        (drawMode == ChordDrawMode.BOTH && chordValue != 0) ||
                        (drawMode == ChordDrawMode.POSITIVE && chordValue > 0) ||
                        (drawMode == ChordDrawMode.NEGATIVE && chordValue < 0)
                    )
            )
            {
                // Draw a line from here to there
                if(chordValue > 0)
                {
                    screenContext.strokeStyle = positiveColour;
                }
                else
                {
                    screenContext.strokeStyle = negativeColour;
                }

                screenContext.lineWidth = this._mdl.getChordWidthPx(chordValue);

                screenContext.beginPath();
                screenContext.moveTo(node.coord.x, node.coord.y);
                screenContext.lineTo(this._mdl.nodes[c].coord.x, this._mdl.nodes[c].coord.y);
                screenContext.stroke();
            }

            c++;
        }
    }

    private drawChordHighlight(screenContext: CanvasRenderingContext2D, chordIdx1: number, chordIdx2: number)
    {
        screenContext.save();
        screenContext.strokeStyle = Colours.GRAY_60.asString();
        screenContext.lineWidth = ChordViewModel.MAX_CHORD_WIDTH*1.25*2;
        screenContext.lineCap = "round";

        let pt1 = this._mdl.nodes[chordIdx1].coord;
        let pt2 = this._mdl.nodes[chordIdx2].coord;

        screenContext.beginPath();
        screenContext.moveTo(pt1.x, pt1.y);
        screenContext.lineTo(pt2.x, pt2.y);
        screenContext.stroke();
        screenContext.restore();
    }
}
