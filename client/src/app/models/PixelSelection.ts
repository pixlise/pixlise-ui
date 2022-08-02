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

import { Colours, RGBA } from "src/app/utils/colours";
import { alphaBytesToImage } from "src/app/utils/drawing";
import { setsEqual } from "../utils/utils";
import { DataSet } from "./DataSet";


export class PixelSelection
{
    private _selectedPixels: Set<number> = new Set<number>();
    private _isPixelSelected: boolean[] = [];
    private _maskImage: HTMLImageElement = null;

    static makeEmptySelection(): PixelSelection
    {
        return new PixelSelection(null, new Set<number>(), 0, 0, "");
    }

    constructor(dataset: DataSet, pixels: Set<number>, private _width: number, private _height: number, private _imageName: string)
    {
        // Make a set of PMCs out of them
        if(dataset)
        {
            this._selectedPixels = new Set<number>(pixels);

            // Build an array so we can look this up quickly
            this._isPixelSelected = Array(this._width*this._height).fill(false);

            for(let idx of this._selectedPixels)
            {
                this._isPixelSelected[idx] = true;
            }

            if(pixels.size > 0 && this._width > 0 && this._height > 0)
            {
                this._maskImage = this.makeMaskImage();
            }
        }
    }

    isEqualTo(other: PixelSelection): boolean
    {
        return setsEqual(this._selectedPixels, other._selectedPixels) && this._width == other._width && this._height == other._height;
    }

    get selectedPixels(): Set<number>
    {
        return this._selectedPixels;
    }

    get imageName(): string
    {
        return this._imageName;
    }

    isPixelSelected(idx: number): boolean
    {
        if(idx < 0 || idx >= this._isPixelSelected.length)
        {
            return false;
        }

        return this._isPixelSelected[idx];
    }

    getMaskImage(): HTMLImageElement
    {
        return this._maskImage;
    }

    getInvertedMaskImage(): HTMLImageElement
    {
        return this.makeMaskImage(Colours.BLACK, 0, 255);
    }

    private makeMaskImage(colourTint: RGBA = Colours.CONTEXT_BLUE, selectedAlpha: number = 120, unselectedAlpha: number = 0): HTMLImageElement
    {
        // Generate an image with alpha=some %, then run through all selected pixels, set those to 0%
        // this way we end up with a mask that will not draw where we have a selected pixel
        /*
        // Darken unselected pixels
        const unselectedAlpha = 160;
        const selectedAlpha = 0;
        const colourTint = Colours.BLACK;
*/
        // Tint selected blue
        // const unselectedAlpha = 0;
        // const selectedAlpha = 120; // RGBA alpha value, NOT %
        // const colourTint = Colours.CONTEXT_BLUE;

        const pixelCount = this._width*this._height;

        let alphaBytes = new Uint8Array(pixelCount);
        for(let c = 0; c < pixelCount; c++)
        {
            alphaBytes[c] = unselectedAlpha;
        }

        for(let idx of this._selectedPixels)
        {
            alphaBytes[idx] = selectedAlpha;
        }

        let img = alphaBytesToImage(alphaBytes, this._width, this._height, colourTint);
        return img;
    }
}
