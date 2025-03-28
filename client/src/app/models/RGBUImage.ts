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

import { Observable, concatMap, from, map, of } from "rxjs";

import { MinMax } from "src/app/models/BasicTypes";
import { ColourRamp, Colours } from "src/app/utils/colours";
import { rgbBytesToImage } from "src/app/utils/drawing";
import { PixelSelection } from "../modules/pixlisecore/models/pixel-selection";
import { fromArrayBuffer } from "geotiff";
import { MapColourScaleSourceData } from "../modules/image-viewers/widgets/context-image/ui-elements/map-colour-scale/map-colour-scale-model";

export class FloatImage {
  constructor(
    public width: number,
    public height: number,
    public values: Float32Array,
    public valueRange: MinMax //public displayImage: HTMLImageElement,
  ) {}

  generateDisplayImage(maxValueInAllChannels: number, brightness: number, logColour: boolean): Observable<HTMLImageElement> {
    const pixels = this.width * this.height;

    const bytes = new Uint8Array(pixels * 3);
    let writeIdx = 0;

    // Generate a greyscale image using the range of values in this float image
    for (let px = 0; px < pixels; px++) {
      let greyValue = Math.floor(((this.values[px] * 255.0) / maxValueInAllChannels) * brightness);
      if (greyValue > 255) {
        greyValue = 255;
      }

      bytes[writeIdx] = greyValue;
      bytes[writeIdx + 1] = greyValue;
      bytes[writeIdx + 2] = greyValue;

      writeIdx += 3;
    }

    return rgbBytesToImage(bytes, this.width, this.height);
  }
}

class RatioData {
  constructor(
    public bytes: Uint8Array,
    public scaleData: MapColourScaleSourceData
  ) {}
}

export class RGBUImageGenerated {
  constructor(
    public layerForScale: MapColourScaleSourceData | null,
    public image: HTMLImageElement | null
  ) {}
}

export class RGBUImage {
  public static readonly channels: string[] = ["R", "G", "B", "U"];
  public static readonly channelToDisplayMap: Map<string, string> = new Map<string, string>([
    [RGBUImage.channels[0], "Near-IR"],
    [RGBUImage.channels[1], "Green"],
    [RGBUImage.channels[2], "Blue"],
    [RGBUImage.channels[3], "UV"],
  ]);

  static displayChannelToChannel(disp: string): string {
    for (const [channel, channelDisp] of RGBUImage.channelToDisplayMap.entries()) {
      if (channelDisp == disp) {
        return channel;
      }
    }

    return " ";
  }

  static channelToDisplayChannel(ch: string): string {
    const dispChannel = RGBUImage.channelToDisplayMap.get(ch);
    if (dispChannel === undefined) {
      return "(None)";
    }
    return dispChannel;
  }

  protected _allChannelMinMax: MinMax = new MinMax();

  constructor(
    public path: string,
    public r: FloatImage,
    public g: FloatImage,
    public b: FloatImage,
    public u: FloatImage
  ) {}

  getChannel(channelName: string): FloatImage | null {
    const ch = channelName.toLowerCase();
    if (ch == "r") {
      return this.r;
    } else if (ch == "g") {
      return this.g;
    } else if (ch == "b") {
      return this.b;
    } else if (ch == "u") {
      return this.u;
    }
    return null;
  }

  get allChannelMinMax(): MinMax {
    return this._allChannelMinMax;
  }

  generateRGBDisplayImage(
    brightness: number,
    channelOrder: string,
    //logColour: boolean,
    unselectedOpacity: number,
    unselectedGrayscale: boolean,
    pixelSelection: PixelSelection,
    colourRatioMin: number | null,
    colourRatioMax: number | null,
    cropSelection: PixelSelection = PixelSelection.makeEmptySelection(),
    removeTopSpecularArtifacts: boolean = false,
    removeBottomSpecularArtifacts: boolean = false
  ): Observable<RGBUImageGenerated | null> {
    if (channelOrder.length !== 3) {
      throw new Error("RGBU Channel definition must be 3 characters");
    }

    const pixelCount = this.r.width * this.r.height;

    let overallImgBytes: Uint8Array | null = null;

    let csScaleData: MapColourScaleSourceData | null = null;
    if (channelOrder[1] == "/") {
      const result = this.makeRatioImageBytes(
        channelOrder[0],
        channelOrder[2],
        pixelCount,
        colourRatioMin,
        colourRatioMax,
        cropSelection,
        removeTopSpecularArtifacts,
        removeBottomSpecularArtifacts
      );

      if (result) {
        // Make a nice display name
        result.scaleData.name = RGBUImage.channelToDisplayChannel(channelOrder[0]) + " / " + RGBUImage.channelToDisplayChannel(channelOrder[2]);
        csScaleData = result.scaleData;
        overallImgBytes = result.bytes;
      }
    } else {
      overallImgBytes = this.makeRGBImageBytes(channelOrder, pixelCount, brightness);
    }

    if (!overallImgBytes) {
      throw new Error("Failed to generate ratio image for channel: " + channelOrder);
    }

    if (overallImgBytes && (pixelSelection.selectedPixels.size > 0 || cropSelection.selectedPixels.size > 0)) {
      // We need to indicate selected vs unselected pixels
      for (let c = 0; c < pixelCount; c++) {
        // If pixel isn't in the cropped selection, 0 out channels
        if (cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(c)) {
          overallImgBytes[c * 3] = 0; // was null
          overallImgBytes[c * 3 + 1] = 0; // was null
          overallImgBytes[c * 3 + 2] = 0; // was null
        } else if (cropSelection.selectedPixels.size > 0 && pixelSelection.selectedPixels.size === 0) {
          // If the pixel is in the cropped selection, but there isn't an active selection,
          //  continue so we skip the regular pixel selection dimming logic
          continue;
        } else if (pixelSelection.isPixelSelected(c)) {
          // Selected pixels are blue if we have grayscale turned on
          if (unselectedGrayscale) {
            const grayMult = 0.5 + (0.5 * (overallImgBytes[c * 3] + overallImgBytes[c * 3 + 1] + overallImgBytes[c * 3 + 2])) / 3 / 255;

            overallImgBytes[c * 3] = Colours.CONTEXT_BLUE.r * grayMult;
            overallImgBytes[c * 3 + 1] = Colours.CONTEXT_BLUE.g * grayMult;
            overallImgBytes[c * 3 + 2] = Colours.CONTEXT_BLUE.b * grayMult;
          }
          // else we don't do anything, want to show selected pixels as they are
        } else {
          // Unselected pixels are gray or dimmed
          if (unselectedGrayscale) {
            // Make it gray (average of values)
            const avg = ((overallImgBytes[c * 3] + overallImgBytes[c * 3 + 1] + overallImgBytes[c * 3 + 2]) / 3) * unselectedOpacity;
            overallImgBytes[c * 3] = avg;
            overallImgBytes[c * 3 + 1] = avg;
            overallImgBytes[c * 3 + 2] = avg;
          } else {
            // Dim it
            overallImgBytes[c * 3] = overallImgBytes[c * 3] * unselectedOpacity;
            overallImgBytes[c * 3 + 1] = overallImgBytes[c * 3 + 1] * unselectedOpacity;
            overallImgBytes[c * 3 + 2] = overallImgBytes[c * 3 + 2] * unselectedOpacity;
          }
        }
      }
    }

    // And complete the overall image
    const rgbImage$ = rgbBytesToImage(overallImgBytes, this.r.width, this.r.height);

    return rgbImage$.pipe(
      map((imgGenerated: HTMLImageElement) => {
        return new RGBUImageGenerated(csScaleData, imgGenerated);
      })
    );
  }

  channelImageForName(nameRGBU: string): FloatImage | null {
    if (nameRGBU == RGBUImage.channels[0]) {
      return this.r;
    } else if (nameRGBU == RGBUImage.channels[1]) {
      return this.g;
    } else if (nameRGBU == RGBUImage.channels[2]) {
      return this.b;
    } else if (nameRGBU == RGBUImage.channels[3]) {
      return this.u;
    }

    return null;
  }

  private makeRGBImageBytes(channelOrder: string, pixelCount: number, brightness: number): Uint8Array {
    let channels: (FloatImage | null)[] = []; //[this.r, this.g, this.b, this.u];
    // fill it!
    for (let ch = 0; ch < channelOrder.length; ch++) {
      const img = this.channelImageForName(channelOrder[ch]);
      channels.push(img);
    }

    // Generate a display image using the channels specified
    const overallImgBytes = new Uint8Array(pixelCount * 3);

    // NOTE: we take the max of all pixels, and we do our greyscale conversion using this value for ALL channels to make it uniform
    const maxValueInAllChannels = this._allChannelMinMax.max;
    if (maxValueInAllChannels !== null) {
      for (let ch = 0; ch < channels.length; ch++) {
        if (!channels[ch]) {
          // User chose to skip this channel
          continue;
        }

        let writeIdx = 0;

        // Generate a greyscale image using the range of values in this float image
        for (let px = 0; px < pixelCount; px++) {
          let greyValue = Math.floor(((channels[ch]!.values[px] * 255.0) / maxValueInAllChannels) * brightness);
          if (greyValue > 255) {
            greyValue = 255;
          }

          // Also write it to the overall image for the appropriate channel
          if (ch < 3) {
            overallImgBytes[writeIdx + ch] = greyValue;
          }

          writeIdx += 3;
        }
      }
    }

    return overallImgBytes;
  }

  private makeRatioImageBytes(
    numerator: string,
    denominator: string,
    pixelCount: number,
    colourRatioMin: number | null,
    colourRatioMax: number | null,
    cropSelection: PixelSelection,
    removeTopSpecularArtifacts: boolean,
    removeBottomSpecularArtifacts: boolean
  ): RatioData | null {
    const numCh = this.channelImageForName(numerator);
    const denCh = this.channelImageForName(denominator);

    if (!numCh || !denCh) {
      return null;
    }

    // First, calculate the ratio values and the min/max we find
    let ratioValues = new Float32Array(pixelCount);
    const unclampedRatioValues = new Float32Array(pixelCount);
    let ratioMinMax = new MinMax();
    let seenMinMax = new MinMax();

    for (let px = 0; px < pixelCount; px++) {
      // Ignore the pixel if it's not in an active crop selection
      if (cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(px)) {
        ratioValues[px] = 0; // was null
        unclampedRatioValues[px] = 0; // was null
        continue;
      }
      let ratio = denCh.values[px] > 0 ? numCh.values[px] / denCh.values[px] : 0;

      seenMinMax.expand(ratio);

      unclampedRatioValues[px] = ratio;
      // If the value is outside our specified range, clamp it to the range
      if (colourRatioMin !== null && ratio < colourRatioMin) {
        ratio = colourRatioMin;
      }
      if (colourRatioMax !== null && ratio > colourRatioMax) {
        ratio = colourRatioMax;
      }

      // Remember the value in our min-max range, divide by brightness so scale updates
      ratioMinMax.expand(ratio);

      // But save the value with brightness applied
      ratioValues[px] = ratio;
    }

    // Sort the ratio values so we can determine that line for the top 99% value (max value without specular artifacts)
    const sortedRatioValues = unclampedRatioValues.slice().sort();
    const maxValueWithoutSpecular = sortedRatioValues[Math.floor(sortedRatioValues.length * 0.99)];
    const minValueWithoutSpecular = sortedRatioValues[Math.ceil(sortedRatioValues.length * 0.01)];

    // We're storing the specular removed min max to allow toggling of this in the UI without having to regenerate the image
    const specularRemovedMinMax = new MinMax(minValueWithoutSpecular, maxValueWithoutSpecular);

    // If remove specular artifacts is toggled, then we need to remove top 1% of pixels
    if (removeTopSpecularArtifacts) {
      // Remap the seen min max so that the color scale is updated as well
      seenMinMax = new MinMax(seenMinMax.min, maxValueWithoutSpecular);

      // Remap the ratio values if the new max value is less than the specified color ratio max or no color ratio is specified
      if (colourRatioMax === null || maxValueWithoutSpecular < colourRatioMax) {
        ratioMinMax = new MinMax(ratioMinMax.min, maxValueWithoutSpecular);
        ratioValues = ratioValues.map(ratioValue => Math.min(ratioValue, maxValueWithoutSpecular));
      }
    }

    if (removeBottomSpecularArtifacts) {
      // Remap the seen min max so that the color scale is updated as well
      seenMinMax = new MinMax(minValueWithoutSpecular, seenMinMax.max);

      // Remap the ratio values if the new min value is greater than the specified color ratio max or no color ratio is specified
      if (colourRatioMax === null || minValueWithoutSpecular > (colourRatioMin || 0)) {
        ratioMinMax = new MinMax(minValueWithoutSpecular, ratioMinMax.max);
        ratioValues = ratioValues.map(ratioValue => Math.max(minValueWithoutSpecular, ratioValue));
      }
    }

    // Generate a display image using the channels specified
    const overallImgBytes = new Uint8Array(pixelCount * 3);
    let writeIdx = 0;

    // Generate colour scaled image
    for (let px = 0; px < pixelCount; px++) {
      if (cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(px)) {
        overallImgBytes[writeIdx] = 0; // was null
        overallImgBytes[writeIdx + 1] = 0; // was null
        overallImgBytes[writeIdx + 2] = 0; // was null
      } else {
        // NOTE: Due to brightness, we're likely to blow out in 1 or the other direction. We also clamp
        // because we don't want to send an invalid value to sample
        const pct = ratioMinMax.getAsPercentageOfRange(ratioValues[px], true);

        const clr = Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, pct);

        overallImgBytes[writeIdx] = clr.r;
        overallImgBytes[writeIdx + 1] = clr.g;
        overallImgBytes[writeIdx + 2] = clr.b;
      }

      writeIdx += 3;
    }

    const csScaleData = new MapColourScaleSourceData();
    csScaleData.addSimpleValues(ratioValues, ratioMinMax, specularRemovedMinMax, seenMinMax);

    return new RatioData(overallImgBytes, csScaleData);
  }

  static readImage(data: ArrayBuffer, imgName: string): Observable<RGBUImage> {
    return from(fromArrayBuffer(data)).pipe(
      concatMap(tiff => {
        return from(tiff.getImage());
      }),
      concatMap(image => {
        const expectedSamples = 4; // R, G, B and U
        const pixelCount = image.getWidth() * image.getHeight();

        // Expect the image to be of the right format:
        // 32bit (BitsPerSample=32)
        // 4 channels (SamplesPerPixel=4)
        // Floating point (SampleFormat=3 aka SAMPLEFORMAT_IEEEFP)
        // Uncompressed (Compression=1)
        // Is at least 1x1 pixel
        const isValid =
          image.fileDirectory.SamplesPerPixel == expectedSamples &&
          image.fileDirectory.BitsPerSample.length == expectedSamples &&
          image.fileDirectory.BitsPerSample[0] == 32 &&
          image.fileDirectory.BitsPerSample[1] == 32 &&
          image.fileDirectory.BitsPerSample[2] == 32 &&
          image.fileDirectory.BitsPerSample[3] == 32 &&
          image.fileDirectory.SampleFormat.length == expectedSamples &&
          image.fileDirectory.SampleFormat[0] == 3 &&
          image.fileDirectory.SampleFormat[1] == 3 &&
          image.fileDirectory.SampleFormat[2] == 3 &&
          image.fileDirectory.SampleFormat[3] == 3 &&
          image.fileDirectory.Compression == 1 &&
          image.fileDirectory.StripByteCounts.length == 1 &&
          image.fileDirectory.StripByteCounts[0] == pixelCount * expectedSamples * 4 &&
          image.getWidth() > 0 &&
          image.getHeight() > 0;

        if (!isValid) {
          // Not happy with one or more params
          throw new Error("TIFF image not in expected format. Not loaded");
        }

        console.log("read tiff: " + image.getWidth() + "x" + image.getHeight() + ", bpp=" + image.getSamplesPerPixel());

        return from(image.readRasters({ interleave: true })).pipe(
          map(rasterResult => {
            // Turn this into something that can be shown as an image. Here we read the channels
            let readIdx = 0;
            const readFloatPixels = rasterResult as Float32Array;

            const channels: FloatImage[] = [];
            // There are 4 channels... set them up
            for (let ch = 0; ch < expectedSamples; ch++) {
              channels.push(new FloatImage(image.getWidth(), image.getHeight(), new Float32Array(pixelCount), new MinMax()));
            }

            // Find max value in each channel while demultiplexing the float array
            for (let px = 0; px < pixelCount; px++) {
              for (let ch = 0; ch < expectedSamples; ch++) {
                let fVal = readFloatPixels[readIdx + ch];

                // DTU thought they are setting <0 to 0, but not. They will make this change soon but
                // we need this here too in case we load an older image
                if (fVal < 0) {
                  fVal = 0;
                }

                // TIF to RGBU mapping has had issues in past! v3 used a previous geotiff lib that just dumped the data out and
                // the channels were not in R=0,G=1,B=2,U=3 order as expected, but came in as:
                // red=blue (2)
                // green=UV (3)
                // blue=red (0)
                // UV=green (1)
                //
                // For v3 image: PCCR0257_0689789827_000VIS_N008000008906394300060LUD01.tif, from idx 4139 onwards the channels
                // array ended up containing:
                // 0: 24688877
                // 1: 12344444
                // 2: 01122222222
                // 3: 01122222233
                //
                // With v4 PIXLISE we used a newer version of the geotiff lib (which has the above readRasters()). This was thought
                // to behave the same, but we had colour channel mismatches. Turns out this does seem to store the channels in expected
                // order BUT for some unknown reason, the data comes in like so:
                // v4:
                // 0: 4139 246888777777
                // 1: 4139 123444444333
                // 2: 4139 112222222222
                // 3: 4139 112222223333
                //
                // NOTE that v3 had 1 byte of offset for the B and U channels! This doesn't seem to look any different visually
                // though perhaps there is some padding that was interpreted as channel data in v3, and maybe the B and U channels
                // were off by 1?

                channels[ch].values[px] = fVal;
                channels[ch].valueRange.expand(fVal);
              }

              readIdx += 4;
            }

            const allChannelMinMax = new MinMax();
            for (const ch of channels) {
              allChannelMinMax.expandByMinMax(ch.valueRange);
            }

            // And complete the overall image
            const result = new RGBUImage(imgName, channels[0], channels[1], channels[2], channels[3]);
            result.r = channels[0];
            result.g = channels[1];
            result.b = channels[2];
            result.u = channels[3];

            result._allChannelMinMax = allChannelMinMax;

            return result;
          })
        );
      })
    );
  }
}
