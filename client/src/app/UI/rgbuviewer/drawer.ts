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
import { RGBUViewerModel } from "./model";


export class RGBUViewerDrawer implements CanvasDrawer
{
    protected _mdl: RGBUViewerModel;
    protected _lastCalcCanvasParams: CanvasParams;

    constructor(mdl: RGBUViewerModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(!this._mdl || !this._mdl.rgbu)
        {
            return;
        }

        const panelWidth = drawParams.drawViewport.width/2;
        const panelHeight = drawParams.drawViewport.height/2;

        const transform = this._mdl.getTransform();

        let ourPanelCenter = new Point(panelWidth/2, panelHeight/2);

        // NOTE: we want to use the context image center to work out how to transform our image, but if we can't get it
        // for eg because context image widget is not present, we init with our own center so we just do "local" transform
        // manipulation - if context image becomes available our transform will be reset anyway
        let contextCanvasCenter = transform.canvasParams ? transform.canvasParams.getCenterPoint() : ourPanelCenter;

        // Need to transform points to the top-left coord of the context canvas, then to the middle of our canvas, so
        // the translation is:
        let centeringTranslation = new Point(-contextCanvasCenter.x+ourPanelCenter.x, -contextCanvasCenter.y+ourPanelCenter.y);

        // Work out a width and height to draw the images
        let imageWidth = this._mdl.rgbu.r.width*transform.scale.x;
        let imageHeight = this._mdl.rgbu.r.height*transform.scale.y;

        // Draw all 4 images
        let viewportRects = [
            new Rect(0, 0, panelWidth, panelHeight),
            new Rect(panelWidth, 0, panelWidth, panelHeight),
            new Rect(0, panelHeight, panelWidth, panelHeight),
            new Rect(panelWidth, panelHeight, panelWidth, panelHeight),
        ];
        let imageDrawRects = [
            new Rect(0, 0, imageWidth, imageHeight),
            new Rect(panelWidth, 0, imageWidth, imageHeight),
            new Rect(0, panelHeight, imageWidth, imageHeight),
            new Rect(panelWidth, panelHeight, imageWidth, imageHeight),
        ];

        let labels = ["Near Infra-red", "Green", "Blue", "Ultraviolet"];
        let labelColours = [Colours.RGBU_RED.asString(), Colours.RGBU_GREEN.asString(), Colours.RGBU_BLUE.asString(), Colours.GRAY_10.asString()];

        const labelOffset = 8;
        const labelFontSize = 12;

        screenContext.textAlign = "start";
        screenContext.textBaseline = "top";
        screenContext.font = "bold "+labelFontSize+"px Roboto";

        for(let ch = 0; ch < this._mdl.channelDisplayImages.length; ch++)
        {
            screenContext.save();

            // Set up for only drawing within the viewport defined...
            screenContext.beginPath();
            screenContext.rect(viewportRects[ch].x, viewportRects[ch].y, viewportRects[ch].w, viewportRects[ch].h);
            screenContext.clip();

            if(this._mdl.channelDisplayImages[ch])
            {
                let imgRect = new Rect(imageDrawRects[ch].x, imageDrawRects[ch].y, imageDrawRects[ch].w, imageDrawRects[ch].h);

                imgRect.x += centeringTranslation.x;
                imgRect.y += centeringTranslation.y;

                imgRect.x += transform.pan.x;
                imgRect.y += transform.pan.y;

                screenContext.drawImage(this._mdl.channelDisplayImages[ch], imgRect.x, imgRect.y, imgRect.w, imgRect.h);

                // Draw mask image on top to show selection
                if(this._mdl.maskImage)
                {
                    screenContext.drawImage(this._mdl.maskImage, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
                }

                if(this._mdl.cropMaskImage)
                {
                    screenContext.drawImage(this._mdl.cropMaskImage, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
                }
            }

            let txtSize = screenContext.measureText(labels[ch]);
            screenContext.fillStyle = Colours.GRAY_80.asStringWithA(0.5);
            screenContext.fillRect(viewportRects[ch].x+labelOffset/2, viewportRects[ch].y+labelOffset/2, txtSize.width+labelOffset, labelFontSize+labelOffset);

            screenContext.fillStyle = labelColours[ch];
            screenContext.fillText(labels[ch], viewportRects[ch].x+labelOffset, viewportRects[ch].y+labelOffset);

            screenContext.restore();
        }
    }
}