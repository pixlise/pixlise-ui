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

import { closestDistanceBetweenPointAndLine, getVectorBetweenPoints, getVectorLength, normalizeVector, Point } from "src/app/models/Geometry";
import { SelectionService } from "src/app/services/selection.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent, CanvasMouseEventId } from "../atoms/interactive-canvas/interactive-canvas.component";
import { ChordViewModel, ChordViewNode } from "./model";


export class ChordDiagramInteraction implements CanvasInteractionHandler
{
    constructor(
        private _mdl: ChordViewModel,
        private _selectionService: SelectionService,
    )
    {
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(!this._mdl.nodes || this._mdl.nodes.length <= 0)
        {
            this._mdl.calcDisplayData(event.canvasParams);
        }

        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_DRAG)
        {
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            let hoverNode = this.checkHoverNode(event.canvasPoint);

            let setResult = this.setHoverElement(hoverNode);
            if(setResult.catchEvent || setResult.redraw)
            {
                // Something happened, stop here, make sure no chords are highlighted
                return setResult;
            }

            // Check if hovering over a chord only if node is not...
            if(this._mdl.hoverElementIdx == -1)
            {
                let chordHover = this.isPointOverChord(event.canvasPoint);

                this._mdl.cursorShown = (chordHover.length > 0) ? CursorId.pointerCursor : CursorId.defaultPointer;

                return this.setHighlightedChord(chordHover);
            }
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
            this.handleMouseUp(event.canvasPoint);
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_LEAVE)
        {
            return this.setHoverElement(-1);
        }

        return CanvasInteractionResult.neither;
    }

    keyEvent(event: CanvasKeyEvent): CanvasInteractionResult
    {
        return CanvasInteractionResult.neither;
    }

    private setHoverElement(idx: number): CanvasInteractionResult
    {
        if(idx != this._mdl.hoverElementIdx)
        {
            this._mdl.hoverElementIdx = idx;
            return CanvasInteractionResult.redrawAndCatch;
        }
        return CanvasInteractionResult.neither;
    }

    private setHighlightedChord(nodeExprIds: string[]): CanvasInteractionResult
    {
        if(
            nodeExprIds.length != this._mdl.hoverChordExprIds.length ||
            !nodeExprIds.every((val: string, idx: number, arr: string[])=>{return val == this._mdl.hoverChordExprIds[idx];})
        )
        {
            //console.log('setHighlightedChord setting for: '+JSON.stringify(nodeLabels)+' - REDRAW!');
            this._mdl.hoverChordExprIds = nodeExprIds;
            return CanvasInteractionResult.redrawAndCatch;
        }
        return CanvasInteractionResult.neither;
    }

    private checkHoverNode(canvasPt: Point): number
    {
        // Check if it's in a node
        let c = 0;
        for(let node of this._mdl.nodes)
        {
            if(this.isPointOverNode(canvasPt, node))
            {
                // Yep, it's this element
                //console.log('Pointing to: '+node.item.element);
                return c;
            }
            c++;
        }

        return -1;
    }

    private isPointOverNode(canvasPt: Point, node: ChordViewNode): boolean
    {
        return node.labelRect.containsPoint(canvasPt);
    }

    private isPointOverChord(canvasPt: Point): string[]
    {
        let chordThresholdValue = Math.abs(this._mdl.chordLowerThreshold*this._mdl.maxChordValueMagnitude);

        // Run through all chords, if mouse is over one, return it as a string of comma separated elements
        let node1Idx = 0;
        for(let node1 of this._mdl.nodes)
        {
            let node2Idx = 0;
            for(let node2 of this._mdl.nodes)
            {
                if(node1.item.exprId != node2.item.exprId)
                {
                    let lineVec = getVectorBetweenPoints(node1.coord, node2.coord);
                    let lineLength = getVectorLength(lineVec);
                    let lineNormalVec = normalizeVector(lineVec);

                    let dist = closestDistanceBetweenPointAndLine(canvasPt, node1.coord, lineNormalVec, lineLength);
                    /*if(node1.item.element == 'Ni' && node2.item.element == 'Al' && dist !== null)
{
console.log('isPointOverChord: '+node1.item.element+'->'+node2.item.element+' dist='+dist+', pt1='+JSON.stringify(node1.coord)+', pt2='+JSON.stringify(node2.coord)+', mouse='+JSON.stringify(canvasPt)+', vec='+JSON.stringify(lineVec)+', norm='+JSON.stringify(lineNormalVec)+', lineLen='+lineLength);
}
*/
                    if(dist !== null && Math.abs(dist) < ChordViewModel.MAX_CHORD_WIDTH)
                    {
                        // We're close to this one, check that it's actually within the chord width
                        // This is tricky, because they both have chords towards each other, and we want
                        // the thicker of the 2
                        let chordValue = Math.max(node1.item.chords[node2Idx], node2.item.chords[node1Idx]);

                        if(Math.abs(chordValue) > chordThresholdValue)
                        {
                            // We also can't make the distance too small...
                            let chordWidthPx = Math.min(this._mdl.getChordWidthPx(chordValue), 2);

                            if(Math.abs(dist) < chordWidthPx)
                            {
                                return [node1.item.exprId, node2.item.exprId];
                            }
                        }
                    }
                }
                node2Idx++;
            }
            node1Idx++;
        }

        // Not close to anything
        return [];
    }

    private handleMouseUp(canvasPt: Point): boolean
    {
        let hoverNode = this.checkHoverNode(canvasPt);
        if(hoverNode == -1)
        {
            // Only look at chords if user isn't over a node
            let nodeElems = this.isPointOverChord(canvasPt);
            if(nodeElems.length > 0)
            {
                this._selectionService.chordClicks$.next(nodeElems);
            }
        }

        // Never show it highlighted after click
        this.setHighlightedChord([]);
        return true;
    }
}
