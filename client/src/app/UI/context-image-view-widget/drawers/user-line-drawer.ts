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

import { CanvasDrawer, CanvasDrawParameters } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours } from "src/app/utils/colours";


export class UserLineDrawer implements CanvasDrawer
{
    protected _ctx: IContextImageModel;

    constructor(ctx: IContextImageModel)
    {
        this._ctx = ctx;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this._ctx.drawnLinePoints.length > 1)
        {
            screenContext.save();

            let transform = this._ctx.transform;

            screenContext.setLineDash([11/transform.scale.x, 4/transform.scale.x]);
            screenContext.strokeStyle = Colours.BLACK.asString();
            screenContext.lineWidth = 5/this._ctx.transform.scale.x;
            this.drawLinePath(screenContext);

            screenContext.setLineDash([9/transform.scale.x, 6/transform.scale.x]);
            screenContext.lineDashOffset = -1/transform.scale.x;
            screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
            screenContext.lineWidth = 3/transform.scale.x;
            this.drawLinePath(screenContext);

            screenContext.restore();
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    protected drawLinePath(screenContext: CanvasRenderingContext2D): void
    {
        screenContext.beginPath();
        screenContext.moveTo(this._ctx.drawnLinePoints[0].x, this._ctx.drawnLinePoints[0].y);

        for(let pt of this._ctx.drawnLinePoints)
        {
            screenContext.lineTo(pt.x, pt.y);
        }
        screenContext.stroke();
    }
}    
