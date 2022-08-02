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

import { DataSet } from "src/app/models/DataSet";
import { distanceBetweenPoints, Point } from "src/app/models/Geometry";
import { UserHints } from "src/app/services/user-options.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours } from "src/app/utils/colours";
import { alphaBytesToImage, drawEmptyCircle, getRawImageData } from "src/app/utils/drawing";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";



export class ColourSelection extends BaseContextImageTool
{
    // We take a backup of the selection when we start operating (mouse down). This way when
    // our threshold is changed via slider, we can still change the selection and apply it on
    // top of the original selection.
    // If somehow the selection changes unexpectedly, we reset our self (and hide the slider)
    private backupSelectedIdxs: Set<number> = null;

    // The points the user is selecting by specifying a mouse location & threshold
    // NOTE: applying this to the selection is a bit slow, so it's only done on mouse UP and
    // slider "apply" notifications (change) not (input) in mat-slider!
    private selectedIdxs = new Set<number>();

    // As above but for pixel selection
    private selectedPixelIdxs = new Set<number>();
    private selectedPixelsMask: HTMLImageElement = null;

    // The mouse position to start from
    private mouseDown: Point = null;
    private mouseLastPos: Point = null;

    // Threshold value that defines how far we flood fill
    private threshold: number = 1;

    // We only show the mouse position when mouse dragging
    private mouseDownToShow: Point = null;
    
    // Subscriptions to things so we can unsub/resub at will
    //private thresholdSliderSub: Subscription = null;


    constructor(
        ctx: IContextImageModel,
        host: IToolHost
    )
    {
        super(ContextImageToolId.SELECT_COLOUR,
            ctx,
            host,
            "Colour Threshold Select\nFlood fill selection of points from click point by their shading",
            "assets/button-icons/tool-colour-select.svg"
        );
    }

    activate(): void
    {
        this._host.setCursor(this._ctx.selectionModeAdd ? CursorId.colourCursorAdd : CursorId.colourCursorDel);

        this._ctx.snackService.addHint(UserHints.hintContextColourSelectionShiftForPan, true);
        this._ctx.snackService.addHint(UserHints.hintContextColourSelectionZForZoom, false);

        this.reset();
    }

    deactivate(): void
    {
        this.reset();
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
            // Mouse went down, no matter what's going on, we're starting a new selection at a new position...
            this.startSelection(event.mouseDown);
        }

        if(event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
            this.mouseDownToShow = null;
        }

        if( event.eventId == CanvasMouseEventId.MOUSE_DOWN ||
            event.eventId == CanvasMouseEventId.MOUSE_DRAG ||
            event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
            this.mouseLastPos = event.point;

            // Work out a new threshold and apply it (through the slider, which then notifies us of a change
            // and we redisplay)
            let distance = distanceBetweenPoints(event.point, event.mouseDown);

            // USED TO WORK THIS WAY WITH SLIDER:
            // Only "apply" if it's the mouse up message
            //this._ctx.onChangeSliderValue(distance, event.eventId == CanvasMouseEventId.MOUSE_UP);

            // Now we apply the threshold directly
            this.setThreshold(distance);

            if(event.eventId == CanvasMouseEventId.MOUSE_UP)
            {
                this.applyToSelection(this.selectedIdxs, this.backupSelectedIdxs, false, this.selectedPixelIdxs);

                // Now clear the selected points because we've applied to selection, so we don't want to draw on top of it
                // and prevent people seeing what we just applied
                this.selectedIdxs.clear();

                this.selectedPixelsMask = null;

                // We're no longer selecting!
                this.mouseLastPos = null;
            }

            // We're redrawing as potential selection has changed
            return CanvasInteractionResult.redrawAndCatch;
        }

        return CanvasInteractionResult.neither;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters)
    {
        // NOTE: we only want to draw the points if the user is not in the process of mouse-drag already
        let drawPts = this.mouseLastPos==null;

        // If we have selected pixels, we need to generate an image to overlay on top of the context image at this point
        if(this.selectedPixelsMask)
        {
            screenContext.drawImage(this.selectedPixelsMask, 0, 0, this.selectedPixelsMask.width, this.selectedPixelsMask.height);
        }

        this.drawSelectableLocations(screenContext, this._ctx.highlighedLocationIdx, this._ctx.showPointBBox, drawPts && this._ctx.showPoints, drawPts && this._ctx.showPoints);

        // Draw what we're operating on
        let clr = this.getModeColour();
        screenContext.fillStyle = clr;
        screenContext.strokeStyle = clr;
        screenContext.lineWidth = this.getDrawLineWidth();

        let halfSize = this.drawPointRadius();

        for(let selIdx of this.selectedIdxs)
        {
            let loc = this._ctx.dataset.locationPointCache[selIdx];
            if(loc.coord)
            {
                drawEmptyCircle(screenContext, loc.coord, halfSize);
            }
            else
            {
                console.warn("Selected location with NO beam data: "+selIdx);
            }
        }

        if(this.mouseDownToShow)
        {
            if(this.mouseLastPos)
            {
                screenContext.lineWidth = 3/this._ctx.transform.scale.x;
                let lineDashLen = 9/this._ctx.transform.scale.x;
                screenContext.strokeStyle = Colours.BLACK.asString();//this.getToolColour();
                screenContext.setLineDash([lineDashLen, lineDashLen]);

                screenContext.beginPath();
                screenContext.moveTo(this.mouseDownToShow.x, this.mouseDownToShow.y);
                screenContext.lineTo(this.mouseLastPos.x, this.mouseLastPos.y);
                screenContext.stroke();

                screenContext.setLineDash([]);
            }

            let ptRadius = 4/this._ctx.transform.scale.x;
            let ptDiameter = ptRadius+ptRadius;

            screenContext.lineWidth = 2/this._ctx.transform.scale.x;

            screenContext.strokeStyle = Colours.BLACK.asString();//this.getToolColour();
            screenContext.strokeRect(this.mouseDownToShow.x-ptRadius, this.mouseDownToShow.y-ptRadius, ptDiameter, ptDiameter);

            screenContext.lineWidth = 1/this._ctx.transform.scale.x;

            screenContext.strokeStyle = Colours.WHITE.asString();//this.getToolColour();
            screenContext.strokeRect(this.mouseDownToShow.x-ptRadius, this.mouseDownToShow.y-ptRadius, ptDiameter, ptDiameter);
        }
    }

    private reset(): void
    {
        this.backupSelectedIdxs = null;
        this.selectedIdxs.clear();

        this.selectedPixelIdxs.clear();

        this.selectedPixelsMask = null;

        //        this._ctx.onChangeSliderValue(null, true);

        this.mouseDown = null;
        this.threshold = 1;
    }

    private startSelection(canvasPt: Point): void
    {
        // Mouse down & we don't have a snapshot of the selection, so take one now
        this.backupSelectedIdxs = new Set<number>(this._ctx.selectionService.getCurrentSelection().beamSelection.locationIndexes);
        /*
        // Listen to slider and selection changes
        if(this.thresholdSliderSub)
        {
            this.thresholdSliderSub.unsubscribe();
        }
        this.thresholdSliderSub = this._ctx.getThresholdSliderValue().subscribe((sliderValue)=>
        {
            this.onChangeSliderValue(sliderValue);
            this._ctx.redraw();
        });
*/
        this.selectedIdxs.clear();
        this.selectedPixelIdxs.clear();

        this.selectedPixelsMask = null;

        this.mouseDown = canvasPt;
        this.mouseDownToShow = canvasPt;
    }

    private findSelectionPoints(startPt: Point, threshold: number, contextImage: HTMLImageElement, dataset: DataSet): Set<number>
    {
        //console.log('findSelectionPoints: '+startPt.x+','+startPt.y+', threshold='+threshold);
        let startPtI = new Point(DataSet.convertLocationComponentToPixelPosition(startPt.x), DataSet.convertLocationComponentToPixelPosition(startPt.y));

        // Find a continuous set of points starting from startPt which are within the threshold shading difference of neighbours

        // Start from the starting point on the image
        let srcImg = getRawImageData(contextImage);
        let forRadius = 2;

        // Sample source image shade at this coordinate/radius
        //let sampleRect = new Rect(startPtI.x-forRadius, startPtI.y-forRadius, forRadius*2, forRadius*2);
        //let sampleRGB = this.getSampleColours(srcImg, sampleRect);
        //let sampleShade = this.getShade(sampleRGB.r, sampleRGB.g, sampleRGB.b);
        let startIdx = startPtI.y*srcImg.width+startPtI.x;
        let refShade = this.getShade(srcImg.data[startIdx*4], srcImg.data[startIdx*4+1], srcImg.data[startIdx*4+2]);

        // Now walk from the start location on the context image and add any neighbours which are within the threshold limit
        let toVisit = new Set<number>([startIdx]);
        let visitedIdxs = new Set<number>();
        let selectedImgIdxs = new Set<number>();

        let maxToVisitSize = 1;
        while(toVisit.size > 0)
        {
            let idx = toVisit.values().next().value;

            let x = idx%srcImg.width;
            let y = (idx-x)/srcImg.width;
            if(((idx-x) % srcImg.width) != 0)
            {
                console.warn("Something wrong with x/y: "+idx+" became: "+x+","+y);
            }

            // Ensure it's within the bounds of our data (NOTE: if we've got RGBU selection going, we don't limit ourselves to PMC bounds!)
            if(this._ctx.contextImageItemShowing.rgbuSourceImage || dataset.locationPointBBox.containsPoint(new Point(x, y)))
            {
                // Get the shade of the pixel we're looking at
                let shade = this.getShade(srcImg.data[idx*4], srcImg.data[idx*4+1], srcImg.data[idx*4+2]);

                if(Math.abs(shade-refShade) < threshold)
                {
                    // Add it
                    selectedImgIdxs.add(idx);

                    // Mark it as visited
                    visitedIdxs.add(idx);

                    // Remember to its neighbours if they haven't already been visited
                    let neighbourIdxs = this.getNeighbours(idx, srcImg.width, srcImg.height);

                    for(let neighbourIdx of neighbourIdxs)
                    {
                        if(!visitedIdxs.has(neighbourIdx))
                        {
                            toVisit.add(neighbourIdx);
                        }
                    }
                }
                else
                {
                    // Not in threshold, mark it as don't visit
                    visitedIdxs.add(idx);
                }
            }

            // Remove the one we just visited
            if(!toVisit.delete(idx))
            {
                console.warn("Failed to delete: "+idx);
            }

            if(toVisit.size > maxToVisitSize)
            {
                maxToVisitSize = toVisit.size;
            }

            if(toVisit.size > 1000)
            {
                console.warn("toVisit too big: "+toVisit.size);
                break;
            }
        }

        return selectedImgIdxs;
    }

    private getLocationsForSelectedContextImageLocations(selectedImgIdxs: Set<number>, contextWidth: number, dataset: DataSet): Set<number>
    {
        // Set the pixel at each location to be shown on the mask
        let selectedIdxs = new Set<number>();
        let locs = dataset.experiment.getLocationsList();
        for(let idx = 0; idx < locs.length; idx++)
        {
            let loc = locs[idx];
            let beam = loc.getBeam();
            if(beam)
            {
                let x = DataSet.convertLocationComponentToPixelPosition(beam.getImageI());
                let y = DataSet.convertLocationComponentToPixelPosition(beam.getImageJ());

                let imgIdxPos = (y*contextWidth + x);

                if(selectedImgIdxs.has(imgIdxPos))
                {
                    selectedIdxs.add(idx);
                }
            }
        }

        return selectedIdxs;
    }

    private getShade(r: number, g: number, b: number): number
    {
        return (r+g+b)/3;
    }

    private getNeighbours(idx: number, imgWidth: number, imgHeight: number): number[]
    {
        // Return the up to 8 neighbours indexes that this pixel index may have
        // Start off by getting x and y values
        let x = idx%imgWidth;
        let y = (idx-x)/imgWidth;

        if(((idx-x) % imgWidth) != 0)
        {
            console.warn("Something wrong with x/y: "+idx+" became: "+x+","+y);
        }

        let neighbourIdxs = [];

        if(y > 0)
        {
            neighbourIdxs.push((y-1)*imgWidth+x);
            if(x > 0)
            {
                neighbourIdxs.push((y-1)*imgWidth+x-1);
            }
            if((x+1) < imgWidth)
            {
                neighbourIdxs.push((y-1)*imgWidth+x+1);
            }
        }

        if((y+1) < imgHeight)
        {
            neighbourIdxs.push((y+1)*imgWidth+x);
            if(x > 0)
            {
                neighbourIdxs.push((y+1)*imgWidth+x-1);
            }
            if((x+1) < imgWidth)
            {
                neighbourIdxs.push((y+1)*imgWidth+x+1);
            }
        }

        if(x > 0)
        {
            neighbourIdxs.push(y*imgWidth+x-1);
        }
        if((x+1) < imgWidth)
        {
            neighbourIdxs.push(y*imgWidth+x+1);
        }

        return neighbourIdxs;
    }

    private setThreshold(threshold: number): void
    {
        if(!this.mouseDown)
        {
            console.warn("setThreshold when no mouse down position set");
            return;
        }

        this.threshold = threshold;
        if(this.threshold > 255)
        {
            this.threshold = 255;
        }
        if(this.threshold < 0)
        {
            this.threshold = 0;
        }

        if(this._ctx.contextImageItemShowing && this._ctx.contextImageItemShowingDisplay)
        {
            // If we're dealing with just an RGB context image, behave as normal... If dealing with RGBU, we also select pixels
            let selectedImgIdxs = this.findSelectionPoints(this.mouseDown, this.threshold, this._ctx.contextImageItemShowingDisplay, this._ctx.dataset);

            // Now find what location indexes are within the flood-filled area defined above
            this.selectedIdxs = this.getLocationsForSelectedContextImageLocations(selectedImgIdxs, this._ctx.contextImageItemShowingDisplay.width, this._ctx.dataset);

            // If we're working with RGBU data, select pixels on the image
            if(this._ctx.contextImageItemShowing.rgbuSourceImage)
            {
                this.selectedPixelIdxs = new Set<number>(selectedImgIdxs);

                // Generate a mask image to show what pixels are being selected
                let selectionMaskBytes = new Uint8Array(this._ctx.contextImageItemShowingDisplay.width*this._ctx.contextImageItemShowingDisplay.height);

                // Set the bytes that are selected within the current threshold as non-transparent pixels
                for(let idx of selectedImgIdxs)
                {
                    selectionMaskBytes[idx] = 255;
                }

                this.selectedPixelsMask = alphaBytesToImage(selectionMaskBytes, this._ctx.contextImageItemShowingDisplay.width, this._ctx.contextImageItemShowingDisplay.height, Colours.CONTEXT_BLUE);
            }
        }
    }
}
