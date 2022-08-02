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

import { Point, ptWithinPolygon } from "src/app/models/Geometry";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId, CanvasParams, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { RegionLayerInfo } from "src/app/UI/context-image-view-widget/region-manager";
import { CANVAS_FONT_SIZE, drawToolTip } from "src/app/utils/drawing";
import { BaseUIElement } from "./base-ui-element";


// Base class for the 2 ROI context variants here...
class ROIToolTipBase extends BaseUIElement
{
    protected _lastROIIdxPointedTo: number = -1;
    protected _lastMouseCanvasPoint: Point = null;

    constructor(
        ctx: IContextImageModel)
    {
        super(ctx);
    }

    protected drawROITooltip(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, transform: CanvasWorldTransform, roiIdx: number, showElements: boolean): void
    {
        // Draw the ROI name near the mouse
        let regions = this._ctx.regionManager.getRegionsForDraw();
        let roi = regions[roiIdx].roi;

        let msg = roi.locationIndexes.length +" points";
        if(showElements)
        {
            /*this._ctx.
            msg = roi.*/
            msg = "INSERT ELEMENTS HERE!";
        }
        drawToolTip(screenContext, this._lastMouseCanvasPoint, false, roi.name, msg, CANVAS_FONT_SIZE);
    }

    protected getROIIdxAtPoint(pt: Point, checkVisibleROIsOnly: boolean): number
    {
        let roisSorted = Array.from(this._ctx.regionManager.getRegionsForDraw());

        // Sort ROIs by how many points are in them, so we search smaller ones first, in the hope that
        // we find a more "specific" ROI for the user
        roisSorted.sort((a, b)=>(a.roi.locationIndexes.length > b.roi.locationIndexes.length) ? 1 : -1);

        let idx = this.getROIIdxAtPointFor(pt, checkVisibleROIsOnly, roisSorted);

        if(idx < 0)
        {
            return -1;
        }

        // This is the idx in our sorted array, return the "real" index
        let roisOrig = this._ctx.regionManager.getRegionsForDraw();
        for(let c = 0; c < roisOrig.length; c++)
        {
            if(roisSorted[idx].roi.id == roisOrig[c].roi.id)
            {
                return c;
            }
        }

        return -1;
    }

    protected getROIIdxAtPointFor(pt: Point, checkVisibleROIsOnly: boolean, rois: RegionLayerInfo[]): number
    {
        for(let c = 0; c < rois.length; c++)
        {
            let roi = rois[c];

            // We only were showing tool tips for ROIs marked visible, but now in quant view
            // mode, we show for anything. Here we have to try find ROI that has the least
            // points, because you'd think that if we hover over that the user wants to see
            // those points, not some other all-encompassing ROI. See sorting by points above
            if(!checkVisibleROIsOnly || roi.isVisible())
            {
                for(let poly of roi.polygons)
                {
                    // Check if we're within a polygon
                    if(poly.polygonBBox.containsPoint(pt) && ptWithinPolygon(pt, poly.boundaryPoints, null))
                    {
                        // Check that we're not over a hole
                        let ptInHole = false;
                        for(let holeIdx = 0; holeIdx < poly.holePolygons.length; holeIdx++)
                        {
                            if(poly.holeBBoxes[holeIdx].containsPoint(pt) && ptWithinPolygon(pt, poly.holePolygons[holeIdx], null))
                            {
                                ptInHole = true;
                                break;
                            }
                        }

                        if(!ptInHole)
                        {
                            // Point is within poly, and not within one of its holes, so we're done
                            return c;
                        }
                    }
                }
            }
        }

        return -1;
    }
}

// Draws a tooltip when the mouse is over an ROI showing the ROI name
export class ROIToolTip extends ROIToolTipBase
{
    constructor(
        ctx: IContextImageModel)
    {
        super(ctx);
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // If the mouse is over us, we hijack any drag events
        if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            let roiPointedTo = this.getROIIdxAtPoint(event.point, true);
            if(roiPointedTo != this._lastROIIdxPointedTo)
            {
                this._lastROIIdxPointedTo = roiPointedTo;
                this._lastMouseCanvasPoint = event.canvasPoint;
                return CanvasInteractionResult.redrawOnly;
            }
        }

        return CanvasInteractionResult.neither;
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Draw the physical image scale (mm)
        if(this._lastROIIdxPointedTo >= 0)
        {
            this.drawROITooltip(screenContext, drawParams.drawViewport, drawParams.worldTransform, this._lastROIIdxPointedTo, false);
        }
    }
}

