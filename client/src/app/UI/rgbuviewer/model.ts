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

import { RGBUImage } from "src/app/models/RGBUImage";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";


export class RGBUViewerModel
{
    protected _transform: PanZoom = new PanZoom();
    protected _logColour: boolean = false;
    protected _brightness: number = 1;

    public channelDisplayImages: HTMLImageElement[] = [];
    public cursorShown: CursorId = CursorId.panCursor;

    constructor(public rgbu: RGBUImage, public maskImage: HTMLImageElement, public cropMaskImage: HTMLImageElement, brightness: number, logColour: boolean)
    {
        this._brightness = brightness;
        this._logColour = logColour;

        this.regenerateDisplayImages();
    }

    getTransform(): PanZoom
    {
        return this._transform;
    }

    setTransform(transform: PanZoom): void
    {
        this._transform = transform;
    }

    setLogColour(useLog: boolean): void
    {
        this._logColour = useLog;
        this.regenerateDisplayImages();
    }

    setBrightness(brightness: number): void
    {
        this._brightness = brightness;
        this.regenerateDisplayImages();
    }

    protected regenerateDisplayImages(): void
    {
        let channelFloatImages = [this.rgbu.r, this.rgbu.g, this.rgbu.b, this.rgbu.u];
        this.channelDisplayImages = [];

        for(let c = 0; c < channelFloatImages.length; c++)
        {
            this.channelDisplayImages.push(channelFloatImages[c].generateDisplayImage(this.rgbu.allChannelMinMax.max, this._brightness, this._logColour));
        }
    }
}
