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

import { addVectors, Point, scaleVector } from "src/app/models/Geometry";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";


export class FootprintDrawer
{
    protected _ctx: IContextImageModel;

    constructor(ctx: IContextImageModel)
    {
        this._ctx = ctx;
    }

    // Inflate: how many pixels to inflate the hull points by
    // If fillStyle is not null, the area will be filled with that style.
    // If strokeStyle is not null, the area will be outlined with that style.
    drawFootprint(screenContext: CanvasRenderingContext2D, inflate: number, fillStyle: string, strokeStyle: string): void
    {
        if(fillStyle)
        {
            screenContext.fillStyle = fillStyle;
        }

        if(strokeStyle)
        {
            screenContext.strokeStyle = strokeStyle;
        }

        let center = this._ctx.dataset.locationPointBBox.center();

        screenContext.beginPath();

        for(let footprint of this._ctx.dataset.wholeFootprintHullPoints)
        {
            let firstPt: Point = null;
            for(let c = 0; c < footprint.length; c++)
            {
                let pt: Point = footprint[c];
                if(inflate > 0)
                {
                    pt = addVectors(footprint[c], scaleVector(footprint[c].normal, inflate));
                }

                if(c == 0)
                {
                    screenContext.moveTo(pt.x, pt.y);
                    firstPt = new Point(pt.x, pt.y);
                }
                else
                {
                    screenContext.lineTo(pt.x, pt.y);
                }
            }

            screenContext.lineTo(firstPt.x, firstPt.y);
        }
        screenContext.closePath();

        if(fillStyle)
        {
            screenContext.fill();
        }

        if(strokeStyle)
        {
            screenContext.stroke();
        }
    }
}
