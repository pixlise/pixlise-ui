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
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CANVAS_FONT_SIZE, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { CanvasParams } from "../atoms/interactive-canvas/interactive-canvas.component";


export class ChordNodeData
{
    constructor(
        public label: string,
        public longLabel: string,
        public exprId: string,
        public value: number,
        public displayValue: number,
        public errorValue: number,
        public chords: number[], // Assumes the array is ordered in the same way the actual ChordNodeData list is
        // so if Fe is first in ChordNodeData[], links[0] is Fe
        public errorMsg: string,
        public modulesOutOfDate: boolean = false,
    )
    {
    }
}

export enum ChordDrawMode
{
    BOTH="BOTH",
    POSITIVE="POSITIVE",
    NEGATIVE="NEGATIVE"
}

export class ChordViewNode
{
    constructor(public coord: Point, public labelRect: Rect, public radius: number, public valuePct: number, public errorPct: number, public item: ChordNodeData)
    {
    }
}

export class ChordViewModel
{
    public static readonly BASE_SIZE = 1;
    //public static readonly NODE_RADIUS = 10*ChordViewModel.BASE_SIZE;
    public static readonly MAX_CHORD_WIDTH = 10*ChordViewModel.BASE_SIZE;//ChordViewModel.NODE_RADIUS;
    private OUTER_PADDING = 8*ChordViewModel.BASE_SIZE;
    public static readonly NODE_VALUE_DRAW_LENGTH = 20*ChordViewModel.BASE_SIZE;
    public static readonly NODE_CHAR_WIDTH = CANVAS_FONT_SIZE*CANVAS_FONT_WIDTH_PERCENT;
    public static readonly NODE_LABEL_PADDING_X = 2;
    public static readonly NODE_LABEL_PADDING_Y = 4;

    private _raw: ChordNodeData[] = null;

    nodes: ChordViewNode[] = [];
    maxChordValueMagnitude: number = 0;

    drawMode: ChordDrawMode = ChordDrawMode.BOTH;
    chordLowerThreshold: number = 0;

    hoverElementIdx = -1;
    hoverChordExprIds: string[] = [];

    cursorShown: string = CursorId.defaultPointer;

    set raw(r: ChordNodeData[])
    {
        this._raw = r;
        this.nodes = [];
    }

    calcDisplayData(viewport: CanvasParams): boolean
    {
        if(!this._raw || this._raw.length <= 0)
        {
            return false;
        }

        this.nodes = [];
        let c = 0;
        let segmentAngle = -2*Math.PI/this._raw.length;
        let segmentAngleStart = Math.PI+segmentAngle;

        let diagramRadius = Math.min(viewport.height, viewport.width)/2;
        let centreOffset = viewport.getCenterPoint();

        let maxValue = this._raw[0].value;
        for(let item of this._raw)
        {
            if(item.value > maxValue)
            {
                maxValue = item.value;
            }
        }

        let nodePosRadius = diagramRadius-/*ChordViewModel.NODE_RADIUS-*/ChordViewModel.NODE_VALUE_DRAW_LENGTH-this.OUTER_PADDING;

        if(nodePosRadius < 0)
        {
            // Way too small, just give up!
            return;
        }

        let maxChordValue = 0;
        let minChordValue = 0;

        let nodeXExtents = new MinMax();
        let nodeYExtents = new MinMax();

        // They're allowed to overlap for eg if 2 neighbours are close to max value. So the size limit is how
        // many nodes, and the Y height of the chord node circle
        let maxNodeRadius = nodePosRadius/2;

        for(let item of this._raw)
        {
            // Calculate its coordinates
            let x = Math.sin(c*segmentAngle+segmentAngleStart);
            let y = Math.cos(c*segmentAngle+segmentAngleStart);

            let valuePct = item.value;
            if(maxValue != 0)
            {
                valuePct /= maxValue;
            }

            let errorPct = item.errorValue/100;
            if(errorPct > 1)
            {
                errorPct = 1;
            }

            let nodePos = new Point(Math.floor(x*nodePosRadius+centreOffset.x), Math.floor(y*nodePosRadius+centreOffset.y));
            let labelRect = new Rect(
                nodePos.x,
                nodePos.y,
                item.label.length*ChordViewModel.NODE_CHAR_WIDTH+(ChordViewModel.NODE_LABEL_PADDING_X)*2,
                CANVAS_FONT_SIZE+ChordViewModel.NODE_LABEL_PADDING_Y*2,
            );

            nodeXExtents.expand(nodePos.x);
            nodeYExtents.expand(nodePos.y);

            // Store this node
            // NOTE: 100% value is maxNodeRadius, below that it varies by area of circle not radius, so visually
            // it looks more comparable by area
            // Factored out pi here to save calculations...
            let maxArea = /*Math.PI**/maxNodeRadius*maxNodeRadius;

            // This area is a percentage of the above
            let thisArea = valuePct*maxArea;

            // Calculate radius
            // A=pi*r*r
            // r=sqrt(A/pi)
            let thisRadius = Math.sqrt(thisArea/*/Math.PI*/);

            this.nodes.push(new ChordViewNode(nodePos, labelRect, thisRadius, valuePct, errorPct, item));

            // Remember min/max values
            maxChordValue = Math.max(maxChordValue, ...item.chords);
            minChordValue = Math.min(minChordValue, ...item.chords);

            c++;
        }

        // Recalculate label positions so they're outside and near the nodes
        for(let node of this.nodes)
        {
            //let pctX = nodeXExtents.getAsPercentageOfRange(node.coord.x, false);

            // Offset so it's in the middle near 0.5, left starts at right edge, right starts at left edge
            //node.labelRect.x += node.labelRect.w*(pctX-0.5)-node.labelRect.w/2;
            node.labelRect.x -= node.labelRect.w/2;
            // Label y-pos should center over the node circle
            node.labelRect.y -= node.labelRect.h/2;
        }

        this.maxChordValueMagnitude = Math.max(Math.abs(minChordValue), Math.abs(maxChordValue));

        return true;
    }

    getChordWidthPx(chordValue: number): number
    {
        return (Math.abs(chordValue)/this.maxChordValueMagnitude)*ChordViewModel.MAX_CHORD_WIDTH;
    }
}
