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

import { ContextImageItemTransform } from "src/app/models/DataSet";
import { CanvasDrawer, CanvasDrawParameters } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { MainContextImageLayeredDrawer } from "src/app/UI/context-image-view-widget/drawers/main-drawer";
import { AlignmentModel } from "./model";



export class AlignmentDrawer implements CanvasDrawer
{
    protected _mdl: AlignmentModel;

    constructor(mdl: AlignmentModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Draw so we're not butted against top-left of the canvas...
        screenContext.translate(20, 20);

        // Draw the base image if exists
        let img = this._mdl.alignedImage;
        if(img)
        {
            // This wouldn't be drawn with any transform
            MainContextImageLayeredDrawer.drawImageOrMaskWithOptionalTransform(screenContext, img, null);
        }

        img = this._mdl.displayImage;
        if(img)
        {
            // Reconstruct a transform that the context image would use to draw this image
            let transform: ContextImageItemTransform = null;

            if(this._mdl.meta)
            {
                transform = new ContextImageItemTransform(
                    this._mdl.meta.xOffset,
                    this._mdl.meta.yOffset,
                    this._mdl.meta.xScale,
                    this._mdl.meta.yScale
                );
            }

            screenContext.globalAlpha = this._mdl.matchedOpacity;
            MainContextImageLayeredDrawer.drawImageOrMaskWithOptionalTransform(screenContext, img, transform);
            screenContext.globalAlpha = 1;
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }
}