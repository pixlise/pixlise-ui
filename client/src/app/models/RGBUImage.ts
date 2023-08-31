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

import * as GeoTiff from "geotiff";
import { Observable, of, defer, throwError } from "rxjs";

import { MinMax } from "src/app/models/BasicTypes";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { Histogram, LocationData2DDrawParams, LocationDataPointShape, LocationDataPointState } from "src/app/models/LocationData2D";
import { PixelSelection } from "src/app/models/PixelSelection";
import { ColourRamp, Colours } from "src/app/utils/colours";
import { rgbBytesToImage } from "src/app/utils/drawing";



export class FloatImage
{
    constructor(
        public width: number,
        public height: number,
        public values: Float32Array,
        public valueRange: MinMax,
        //public displayImage: HTMLImageElement,
    )
    {
    }

    generateDisplayImage(maxValueInAllChannels: number, brightness: number, logColour: boolean): HTMLImageElement
    {
        const pixels = this.width*this.height;

        let bytes = new Uint8Array(pixels*3);
        let writeIdx = 0;

        // Generate a greyscale image using the range of values in this float image
        for(let px = 0; px < pixels; px++)
        {
            let greyValue = Math.floor(this.values[px] * 255.0 / maxValueInAllChannels * brightness);
            if(greyValue > 255)
            {
                greyValue = 255;
            }

            bytes[writeIdx] = greyValue;
            bytes[writeIdx+1] = greyValue;
            bytes[writeIdx+2] = greyValue;

            writeIdx += 3;
        }

        return rgbBytesToImage(bytes, this.width, this.height);
    }
}

class ColourScalePixelDataSource implements IColourScaleDataSource
{
    private _histogram: Histogram = new Histogram();

    constructor(
        public name: string,
        private _pixelCount: number,
        private _pixelValues: Float32Array,
        private _valueRange: MinMax,
        private _displayRange: MinMax,
        private _specularRemovedRange: MinMax = null
    )
    {
    }

    // IColourScaleDataSource - returns dummy values if they're not required/associated with our functionality
    getValueRange(channel: number): MinMax
    {
        return this._valueRange;
    }

    getDisplayValueRange(channel: number): MinMax
    {
        return this._displayRange;
    }

    getSpecularRemovedValueRange(channel: number): MinMax
    {
        return this._specularRemovedRange;
    }

    setDisplayValueRangeMin(channel: number, val: number): void
    {
        this._displayRange.setMin(val);
    }

    setDisplayValueRangeMax(channel: number, val: number): void
    {
        this._displayRange.setMax(val);
    }

    get channelCount(): number
    {
        return 1;
    }

    get isBinary(): boolean
    {
        return false;
    }

    get displayScalingAllowed(): boolean
    {
        return false; // we DON'T allow the little tags that set display colour scale values
    }

    getHistogram(channel: number): Histogram
    {
        return this._histogram;
    }

    setHistogramSteps(steps: number): void
    {
        this._histogram.clear(steps);

        if(steps <= 1)
        {
            return;
        }

        // We now have a bunch of 0's, now run through all values and make sure their counts are in the right bin
        let stepSize = (this._displayRange.getRange())/(steps-1);
        if(stepSize == 0)
        {
            // Map is all 0's most likely
            return;
        }

        for(let p of this._pixelValues)
        {
            let val = p-this._displayRange.min;

            // Find where to slot it in
            let idx = Math.floor(val / stepSize);

            this._histogram.increment(idx);
        }
    }
    
    getChannelName(channel: number): string
    {
        return this.name;
    }

    getDrawParamsForRawValue(channel: number, rawValue: number, rawRange: MinMax): LocationData2DDrawParams
    {
        // Clamping: This can happen because we're sampled by stepping through histogram, float rounding may get us a little past max
        let pct = rawRange.getAsPercentageOfRange(rawValue, true);
        let clr = Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, pct);
        return new LocationData2DDrawParams(clr, LocationDataPointState.IN_RANGE, LocationDataPointShape.SQUARE, null);
    }
}

class RatioData
{
    constructor(
        public bytes: Uint8Array,
        public values: Float32Array,
        public minmax: MinMax, // Range of values actually stored, would be clamped to a specified min/max
        public seenMinMax: MinMax, // Range of values we have seen but didn't store
        public specularRemovedMinMax: MinMax = null // Optional range of values after specular removal for caching
    )
    {
    }
}

class RGBUImageGenerated
{
    constructor(
        public layerForScale: IColourScaleDataSource,
        public image: HTMLImageElement
    )
    {
    }
}

export class RGBUImage
{
    public static readonly channels: string[] = ["R", "G", "B", "U"];
    public static readonly channelToDisplayMap: Map<string, string> = new Map<string, string>([
        [RGBUImage.channels[0], "Near-IR"],
        [RGBUImage.channels[1], "Green"],
        [RGBUImage.channels[2], "Blue"],
        [RGBUImage.channels[3], "UV"]
    ]);

    static displayChannelToChannel(disp: string): string
    {
        for(let [channel, channelDisp] of RGBUImage.channelToDisplayMap.entries())
        {
            if(channelDisp == disp)
            {
                return channel;
            }
        }

        return " ";
    }

    static channelToDisplayChannel(ch: string): string
    {
        let dispChannel = RGBUImage.channelToDisplayMap.get(ch);
        if(dispChannel === undefined)
        {
            return "(None)";
        }
        return dispChannel;
    }

    protected _allChannelMinMax: MinMax = new MinMax();
    protected _loadComplete = false;

    constructor(
        public path: string,
        public r: FloatImage,
        public g: FloatImage,
        public b: FloatImage,
        public u: FloatImage,
    )
    {
    }

    get loadComplete(): boolean
    {
        return this._loadComplete;
    }

    get allChannelMinMax(): MinMax
    {
        return this._allChannelMinMax;
    }

    generateRGBDisplayImage(
        brightness: number,
        channelOrder: string,
        logColour: boolean,
        unselectedOpacity: number,
        unselectedGrayscale: boolean,
        pixelSelection: PixelSelection,
        colourRatioMin: number,
        colourRatioMax: number,
        cropSelection: PixelSelection = PixelSelection.makeEmptySelection(),
        removeTopSpecularArtifacts: boolean=false,
        removeBottomSpecularArtifacts: boolean=false,
    ): RGBUImageGenerated
    {
        if(channelOrder.length != 3)
        {
            return new RGBUImageGenerated(null, null);
        }

        if(!this._loadComplete)
        {
            return new RGBUImageGenerated(null, null);
        }

        const pixelCount = this.r.width*this.r.height;

        let overallImgBytes: Uint8Array = null;
        let csScaleData: ColourScalePixelDataSource = null;
        if(channelOrder[1] == "/")
        {
            let result = this.makeRatioImageBytes(channelOrder[0], channelOrder[2], pixelCount, brightness, colourRatioMin, colourRatioMax, cropSelection, removeTopSpecularArtifacts, removeBottomSpecularArtifacts);

            // Make a nice display name
            let dispName = RGBUImage.channelToDisplayChannel(channelOrder[0])+" / "+RGBUImage.channelToDisplayChannel(channelOrder[2]);
            csScaleData = new ColourScalePixelDataSource(dispName, pixelCount, result.values, result.seenMinMax, result.minmax, result.specularRemovedMinMax);
            overallImgBytes = result.bytes;
        }
        else
        {
            overallImgBytes = this.makeRGBImageBytes(channelOrder, pixelCount, brightness);
        }

        if(pixelSelection.selectedPixels.size > 0 || cropSelection.selectedPixels.size > 0)
        {
            // We need to indicate selected vs unselected pixels
            for(let c = 0; c < pixelCount; c++)
            {
                // If pixel isn't in the cropped selection, 0 out channels
                if(cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(c)) 
                {
                    overallImgBytes[c*3] = null;
                    overallImgBytes[c*3+1] = null;
                    overallImgBytes[c*3+2] = null;
                }
                else if(cropSelection.selectedPixels.size > 0 && pixelSelection.selectedPixels.size === 0)
                {
                    // If the pixel is in the cropped selection, but there isn't an active selection,
                    //  continue so we skip the regular pixel selection dimming logic
                    continue;
                }
                else if(pixelSelection.isPixelSelected(c))
                {
                    // Selected pixels are blue if we have grayscale turned on
                    if(unselectedGrayscale)
                    {
                        let grayMult = 0.5+0.5*(overallImgBytes[c*3]+overallImgBytes[c*3+1]+overallImgBytes[c*3+2]) / 3 / 255;

                        overallImgBytes[c*3] = Colours.CONTEXT_BLUE.r * grayMult;
                        overallImgBytes[c*3+1] = Colours.CONTEXT_BLUE.g * grayMult;
                        overallImgBytes[c*3+2] = Colours.CONTEXT_BLUE.b * grayMult;
                    }
                    // else we don't do anything, want to show selected pixels as they are
                }
                else
                {
                    // Unselected pixels are gray or dimmed
                    if(unselectedGrayscale)
                    {
                        // Make it gray (average of values)
                        let avg = (overallImgBytes[c*3]+overallImgBytes[c*3+1]+overallImgBytes[c*3+2]) / 3 * unselectedOpacity;
                        overallImgBytes[c*3] = avg;
                        overallImgBytes[c*3+1] = avg;
                        overallImgBytes[c*3+2] = avg;
                    }
                    else
                    {
                        // Dim it
                        overallImgBytes[c*3] = overallImgBytes[c*3]*unselectedOpacity;
                        overallImgBytes[c*3+1] = overallImgBytes[c*3+1]*unselectedOpacity;
                        overallImgBytes[c*3+2] = overallImgBytes[c*3+2]*unselectedOpacity;
                    }
                }
            }
        }

        // And complete the overall image
        let rgbImage = rgbBytesToImage(overallImgBytes, this.r.width, this.r.height);

        return new RGBUImageGenerated(csScaleData, rgbImage);
    }

    private channelImageForName(nameRGBU: string): FloatImage
    {
        if(nameRGBU == RGBUImage.channels[0])
        {
            return this.r;
        }
        else if(nameRGBU == RGBUImage.channels[1])
        {
            return this.g;
        }
        else if(nameRGBU == RGBUImage.channels[2])
        {
            return this.b;
        }
        else if(nameRGBU == RGBUImage.channels[3])
        {
            return this.u;
        }

        return null;
    }

    private makeRGBImageBytes(channelOrder: string, pixelCount: number, brightness: number): Uint8Array
    {
        let channels = [];//[this.r, this.g, this.b, this.u];
        // fill it!
        for(let ch = 0; ch < channelOrder.length; ch++)
        {
            let img = this.channelImageForName(channelOrder[ch]);
            channels.push(img);
        }

        // Generate a display image using the channels specified
        let overallImgBytes = new Uint8Array(pixelCount*3);

        // NOTE: we take the max of all pixels, and we do our greyscale conversion using this value for ALL channels to make it uniform
        let maxValueInAllChannels = this._allChannelMinMax.max;

        for(let ch = 0; ch < channels.length; ch++)
        {
            if(!channels[ch])
            {
                // User chose to skip this channel
                continue;
            }

            //            let bytes = new Uint8Array(pixels*3);
            let writeIdx = 0;

            // Generate a greyscale image using the range of values in this float image
            for(let px = 0; px < pixelCount; px++)
            {
                let greyValue = Math.floor(channels[ch].values[px] * 255.0 / maxValueInAllChannels * brightness);
                if(greyValue > 255)
                {
                    greyValue = 255;
                }
                /*
                bytes[writeIdx] = greyValue;
                bytes[writeIdx+1] = greyValue;
                bytes[writeIdx+2] = greyValue;
*/
                // Also write it to the overall image for the appropriate channel
                //if(ch < 3)
                {
                    overallImgBytes[writeIdx+ch] = greyValue;
                }

                writeIdx += 3;
            }
        }

        return overallImgBytes;
    }

    private makeRatioImageBytes(numerator: string, denominator: string, pixelCount: number, brightness: number, colourRatioMin: number, colourRatioMax: number, cropSelection: PixelSelection, removeTopSpecularArtifacts: boolean, removeBottomSpecularArtifacts: boolean): RatioData
    {
        let numCh = this.channelImageForName(numerator);
        let denCh = this.channelImageForName(denominator);

        if(!numCh || !denCh)
        {
            return null;
        }

        // First, calculate the ratio values and the min/max we find
        let ratioValues = new Float32Array(pixelCount);
        let unclampedRatioValues = new Float32Array(pixelCount);
        let ratioMinMax = new MinMax();
        let seenMinMax = new MinMax();

        for(let px = 0; px < pixelCount; px++)
        {
            // Ignore the pixel if it's not in an active crop selection
            if(cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(px)) 
            {
                ratioValues[px] = null;
                unclampedRatioValues[px] = null;
                continue;
            }
            let ratio = denCh.values[px] > 0 ? numCh.values[px] / denCh.values[px] : 0;

            seenMinMax.expand(ratio);

            unclampedRatioValues[px] = ratio * brightness;
            // If the value is outside our specified range, clamp it to the range
            if(colourRatioMin !== null && ratio < colourRatioMin)
            {
                ratio = colourRatioMin;
            }
            if(colourRatioMax !== null && ratio > colourRatioMax)
            {
                ratio = colourRatioMax;
            }
            
            // Remember the value in our min-max range, divide by brightness so scale updates 
            ratioMinMax.expand(ratio / brightness);

            // But save the value with brightness applied
            ratioValues[px] = ratio * brightness;
        }

        // Sort the ratio values so we can determine that line for the top 99% value (max value without specular artifacts)
        let sortedRatioValues = unclampedRatioValues.slice().sort();
        let maxValueWithoutSpecular = sortedRatioValues[Math.floor(sortedRatioValues.length * 0.99)] / brightness;
        let minValueWithoutSpecular = sortedRatioValues[Math.ceil(sortedRatioValues.length * 0.01)] / brightness;

        // We're storing the specular removed min max to allow toggling of this in the UI without having to regenerate the image
        let specularRemovedMinMax = new MinMax(minValueWithoutSpecular, maxValueWithoutSpecular);

        // If remove specular artifacts is toggled, then we need to remove top 1% of pixels
        if(removeTopSpecularArtifacts)
        {
            // Remap the seen min max so that the color scale is updated as well
            seenMinMax = new MinMax(seenMinMax.min, maxValueWithoutSpecular);

            // Remap the ratio values if the new max value is less than the specified color ratio max or no color ratio is specified
            if(colourRatioMax === null || maxValueWithoutSpecular < colourRatioMax)
            {
                ratioMinMax = new MinMax(ratioMinMax.min, maxValueWithoutSpecular / brightness);
                ratioValues = ratioValues.map((ratioValue) => Math.min(ratioValue, maxValueWithoutSpecular * brightness));
            }
        }

        if(removeBottomSpecularArtifacts)
        {
            // Remap the seen min max so that the color scale is updated as well
            seenMinMax = new MinMax(minValueWithoutSpecular, seenMinMax.max);

            // Remap the ratio values if the new min value is greater than the specified color ratio max or no color ratio is specified
            if(colourRatioMax === null || minValueWithoutSpecular > colourRatioMin)
            {
                ratioMinMax = new MinMax(minValueWithoutSpecular, ratioMinMax.max);
                ratioValues = ratioValues.map((ratioValue) => Math.max(minValueWithoutSpecular * brightness, ratioValue));
            }
        }

        // Generate a display image using the channels specified
        let overallImgBytes = new Uint8Array(pixelCount*3);
        let writeIdx = 0;

        // Generate colour scaled image
        for(let px = 0; px < pixelCount; px++)
        {
            if(cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(px)) 
            {
                overallImgBytes[writeIdx] = null;
                overallImgBytes[writeIdx+1] = null;
                overallImgBytes[writeIdx+2] = null;
            }
            else 
            {
            // NOTE: Due to brightness, we're likely to blow out in 1 or the other direction. We also clamp
            // because we don't want to send an invalid value to sample
                let pct = ratioMinMax.getAsPercentageOfRange(ratioValues[px], true);

                let clr = Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, pct);

                overallImgBytes[writeIdx] = clr.r;
                overallImgBytes[writeIdx+1] = clr.g;
                overallImgBytes[writeIdx+2] = clr.b;
            }

            writeIdx += 3;
        }

        return new RatioData(overallImgBytes, ratioValues, ratioMinMax, seenMinMax, specularRemovedMinMax);
    }

    static readImage(data: ArrayBuffer, imgName: string): Observable<RGBUImage>
    {
        return defer(async ()=>
        {
            let result = new RGBUImage(imgName, null, null, null, null);

            const tiff = await GeoTiff.fromArrayBuffer(data);
            const image = await tiff.getImage(); // by default, the first image is read

            const pixels = image.getWidth()*image.getHeight();

            // Expect the image to be of the right format:
            // 32bit (BitsPerSample=32)
            // 4 channels (SamplesPerPixel=4)
            // Floating point (SampleFormat=3 aka SAMPLEFORMAT_IEEEFP)
            // Uncompressed (Compression=1)
            // Is at least 1x1 pixel
            if( image.fileDirectory.SamplesPerPixel == 4 &&

                    image.fileDirectory.BitsPerSample.length == 4 &&

                    image.fileDirectory.BitsPerSample[0] == 32 &&
                    image.fileDirectory.BitsPerSample[1] == 32 &&
                    image.fileDirectory.BitsPerSample[2] == 32 &&
                    image.fileDirectory.BitsPerSample[3] == 32 &&

                    image.fileDirectory.SampleFormat.length == 4 &&

                    image.fileDirectory.SampleFormat[0] == 3 &&
                    image.fileDirectory.SampleFormat[1] == 3 &&
                    image.fileDirectory.SampleFormat[2] == 3 &&
                    image.fileDirectory.SampleFormat[3] == 3 &&

                    image.fileDirectory.Compression == 1 &&

                    image.fileDirectory.StripByteCounts.length == 1 &&
                    image.fileDirectory.StripByteCounts[0] == pixels*4*4 &&

                    image.getWidth() > 0 &&
                    image.getHeight() > 0 )
            {
                console.log("read tiff: "+image.getWidth()+"x"+image.getHeight()+", bpp="+image.getSamplesPerPixel());

                // Turn this into something that can be shown as an image
                let readIdx = 0;
                let readFloatPixels = new Float32Array(image.source.arrayBuffer, 0, image.fileDirectory.StripByteCounts[0]/4);

                let channels: FloatImage[] = [];
                // There are 4 channels... set them up
                for(let ch = 0; ch < 4; ch++)
                {
                    channels.push(new FloatImage(image.getWidth(), image.getHeight(), new Float32Array(pixels), new MinMax()));
                }

                // Find max value in each channel while demultiplexing the float array
                for(let px = 0; px < pixels; px++)
                {
                    for(let ch = 0; ch < 4; ch++)
                    {
                        let fVal = readFloatPixels[readIdx+ch];

                        // DTU thought they are setting <0 to 0, but not. They will make this change soon but
                        // we need this here too in case we load an older image
                        if(fVal < 0)
                        {
                            fVal = 0;
                        }

                        // TIF to RGBU mapping:
                        // Looks like the image channels aren't in R=0,G=1,B=2,U=3 order as expected, but that they are saved
                        // in this way:
                        // red=blue (2)
                        // green=UV (3)
                        // blue=red (0)
                        // UV=green (1)

                        // So we modify where we write the data...
                        let writeChannel = (ch+2) % 4;

                        channels[writeChannel].values[px] = fVal;
                        channels[writeChannel].valueRange.expand(fVal);
                    }

                    readIdx += 4;
                }

                result._allChannelMinMax = new MinMax();
                for(let ch of channels)
                {
                    result._allChannelMinMax.expandByMinMax(ch.valueRange);
                }

                // And complete the overall image
                result.r = channels[0];
                result.g = channels[1];
                result.b = channels[2];
                result.u = channels[3];

                result._loadComplete = true;

                return result;
            }

            // Not happy with one or more params
            throw throwError("TIFF image not in expected format. Not loaded");
        }
        );
    }
}