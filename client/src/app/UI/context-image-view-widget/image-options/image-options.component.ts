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

import { Component, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { ContextImageItem } from "src/app/models/DataSet";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { RangeSliderValue } from "src/app/UI/atoms/range-slider/range-slider.component";


@Component({
    selector: ViewStateService.widgetSelectorContextImageOptions,
    templateUrl: "./image-options.component.html",
    styleUrls: ["./image-options.component.scss"]
})
export class ImageOptionsComponent implements OnInit
{
    private _subs = new Subscription();

    displayedChannels: string[] = [];
    displayedChannelsWithNone: string[] = [];

    imageBrightness: number = 1;

    private _chosenChannels: string = "RGB";
    private _chosenRatios: string = "R/G";

    constructor(
        private _contextImageService: ContextImageService,
        private _datasetService: DataSetService
    )
    {   
        this.displayedChannels = [...RGBUImage.channelToDisplayMap.values()];
        this.displayedChannelsWithNone = [...this.displayedChannels, "(None)"];
    }

    ngOnInit(): void
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.gotModel();
            }
        ));
    }

    private gotModel(): void
    {
        this._subs.add(this._contextImageService.mdl.contextImageItemShowing$.subscribe(
            (contextImgShowing: ContextImageItem)=>
            {
                // Get latest value
                this.imageBrightness = this._contextImageService.mdl.brightness;
            }
        ));

        // Update the defaults so if user switches between ratio vs channels, we have a sensible "last seen" thing to show
        if(this.isRatio(this._contextImageService.mdl.displayedChannels))
        {
            this._chosenRatios = this._contextImageService.mdl.displayedChannels;
        }
        else
        {
            this._chosenChannels = this._contextImageService.mdl.displayedChannels;
        }
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private isRatio(channels: string): boolean
    {
        return channels.length == 3 && channels[1] == "/";
    }

    private setChannels(r: string, g: string, b: string)
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let existingChannels = this._chosenChannels;
        let read = [r, g, b];
        let channels = "";

        let c = 0;
        for(let chRead of read)
        {
            let write = existingChannels.charAt(c);
            if(chRead)
            {
                write = RGBUImage.displayChannelToChannel(chRead);
            }
            channels += write;

            c++;
        }

        this._chosenChannels = channels;
        this._contextImageService.mdl.displayedChannels = channels;
    }

    private setRatio(numerator: string, denominator: string)
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let existingRatio = this._chosenRatios;
        let read = [numerator, denominator];
        let ratio = "";

        let c = 0;
        for(let chRead of read)
        {
            let write = existingRatio.charAt(c);
            if(chRead)
            {
                write = RGBUImage.displayChannelToChannel(chRead);
            }
            if(ratio.length > 0)
            {
                ratio += "/";
            }

            ratio += write;

            c+=2;
        }

        this._chosenRatios = ratio;
        this._contextImageService.mdl.displayedChannels = ratio;
    }

    get channelForRed(): string
    {
        return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(0,1));
    }

    set channelForRed(val: string)
    {
        this.setChannels(val, null, null);
    }

    get channelForGreen(): string
    {
        return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(1,2));
    }

    set channelForGreen(val: string)
    {
        this.setChannels(null, val, null);
    }

    get channelForBlue(): string
    {
        return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(2,3));
    }

    set channelForBlue(val: string)
    {
        this.setChannels(null, null, val);
    }

    get unselectedOpacity(): number
    {
        if(!this._contextImageService.mdl)
        {
            return 0;
        }

        return this._contextImageService.mdl.unselectedOpacity;
    }

    onChangeUnselectedOpacity(event)
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        this._contextImageService.mdl.unselectedOpacity = event.value;
    }

    get unselectedGrayscale(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }

        return this._contextImageService.mdl.unselectedGrayscale;
    }

    onResetUnselectedOpacity(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.unselectedOpacity = 0.4;
        }
    }

    onToggleUnselectedGrayscale(event)
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        this._contextImageService.mdl.unselectedGrayscale = !this._contextImageService.mdl.unselectedGrayscale;
    }

    get channelForNumerator(): string
    {
        return RGBUImage.channelToDisplayChannel(this._chosenRatios.substring(0,1));
    }

    set channelForNumerator(val: string)
    {
        this.setRatio(val, null);
    }

    get channelForDenominator(): string
    {
        return RGBUImage.channelToDisplayChannel(this._chosenRatios.substring(2,3));
    }

    set channelForDenominator(val: string)
    {
        this.setRatio(null, val);
    }

    get isRGBU(): boolean
    {
        if(!this._contextImageService.mdl || !this._contextImageService.mdl.contextImageItemShowing)
        {
            // Don't have access to one, so lets say no...
            return false;
        }

        // Check if it's an RGBU capable image (tif file format)
        return (this._contextImageService.mdl.contextImageItemShowing.rgbuSourceImage != null);
    }

    get rgbuOnlyHelpText(): string
    {
        if(this.isRGBU)
        {
            return "";
        }
        return "Select a .tif image to enable these options";
    }

    get rgbuAsChannels(): boolean
    {
        if(this._contextImageService.mdl)
        {
            return !this.isRatio(this._contextImageService.mdl.displayedChannels);
        }
        return true;
    }

    autoSelectTiff(): void
    {
        // Verify the context image service is loaded and there is an image showing
        if(!this._contextImageService || !this._contextImageService.mdl || !this._contextImageService.mdl.contextImageItemShowing)
        {
            return null;
        }

        // Only auto-select a tiff if one isn't already selected
        let currentImagePath = this._contextImageService.mdl.contextImageItemShowing.path;
        if(currentImagePath && !currentImagePath.endsWith(".tif"))
        {
            // Filter down to all tiff images in the dataset
            let tiffImages = this._datasetService.datasetLoaded.contextImages.filter(image => image.path && image.path.endsWith(".tif"));
            if(tiffImages.length > 0)
            {
                // Select the "MSA" tiff image if it exists, else auto select the first existing tiff image
                let msaTiffImages = tiffImages.filter(image => image.path && image.path.toLowerCase().includes("msa_"));
                if(msaTiffImages.length > 0)
                {
                    tiffImages = msaTiffImages;
                }
                
                this._contextImageService.mdl.setContextImageShowing(tiffImages[0]);
            }
        }
    }

    onRGBUAsChannels()
    {
        this.autoSelectTiff();
        this._contextImageService.mdl.displayedChannels = this._chosenChannels;
    }

    onRGBUAsRatio()
    {
        this.onResetBrightness();   
        this.autoSelectTiff();
        this._contextImageService.mdl.displayedChannels = this._chosenRatios;
    }

    onResetBrightness(): void
    {
        this.imageBrightness = 1;
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.brightness = this.imageBrightness;
        }
    }

    onChangeBrightness(event: SliderValue): void
    {
        this.imageBrightness = event.value;

        if(event.finish && this._contextImageService.mdl)
        {
            // Regenerate the image
            this._contextImageService.mdl.brightness = this.imageBrightness;
        }
    }

    get imageSmoothing(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }
        return this._contextImageService.mdl.smoothing;
    }

    onToggleImageSmoothing(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.smoothing = !this._contextImageService.mdl.smoothing;
        }
    }

    get removeTopSpecularArtifacts(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }
        return this._contextImageService.mdl.removeTopSpecularArtifacts;
    }

    get removeBottomSpecularArtifacts(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }
        return this._contextImageService.mdl.removeBottomSpecularArtifacts;
    }

    onToggleRemoveTopSpecularArtifacts(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.removeTopSpecularArtifacts = !this._contextImageService.mdl.removeTopSpecularArtifacts;
            this.onResetRatioColourRemapping();
        }
    }

    onToggleRemoveBottomSpecularArtifacts(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.removeBottomSpecularArtifacts = !this._contextImageService.mdl.removeBottomSpecularArtifacts;
            this.onResetRatioColourRemapping();
        }
    }

    onResetRatioColourRemapping(): void
    {
        this.onResetBrightness();
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.colourRatioMin = null;
            this._contextImageService.mdl.colourRatioMax = null;
        }
    }

    // colourRatioMin - as number, used for slider
    get colourRatioMin(): number
    {
        if(this._contextImageService.mdl.colourRatioMin == null || isNaN(this._contextImageService.mdl.colourRatioMin))
        {
            return this.colourRatioRangeMin;
        }
        return this._contextImageService.mdl.colourRatioMin;
    }

    set colourRatioMin(val: number)
    {
        if(this._contextImageService.mdl && !isNaN(val))
        {
            this._contextImageService.mdl.colourRatioMin = val;
        }
    }

    // colourRatioMinStr - as string, used for text box entry
    get colourRatioMinStr(): string
    {
        let val = this.colourRatioMin;
        if(val === undefined || val === null)
        {
            return "";
        }
        /*
        if(val == 0)
        {
            return '0.'; // in case user wants to type...
        }
*/
        return val.toString();
    }

    set colourRatioMinStr(minRatio: string)
    {
        let parsedMin = parseFloat(minRatio);
        if(!isNaN(parsedMin))
        {
            this.colourRatioMin = parsedMin;
        }
    }

    get imageBrightnessStr(): string
    {
        let brightness = this.imageBrightness;
        return brightness ? brightness.toFixed(2) : "";
    }

    set imageBrightnessStr(brightness: string)
    {

        let parsedBrightness = parseFloat(brightness);
        if(!isNaN(parsedBrightness))
        {
            this.imageBrightness = parsedBrightness;
            this._contextImageService.mdl.brightness = this.imageBrightness;
        }
    }

    // colourRatioMax - as number, used for slider
    get colourRatioMax(): number
    {
        if(this._contextImageService.mdl.colourRatioMax == null || isNaN(this._contextImageService.mdl.colourRatioMax) || this.colourRatioRangeMax < this._contextImageService.mdl.colourRatioMax)
        {
            return Math.round(this.colourRatioRangeMax * 100) / 100;
        }
        return this._contextImageService.mdl.colourRatioMax;
    }

    set colourRatioMax(val: number)
    {
        if(this._contextImageService.mdl && !isNaN(val))
        {
            this._contextImageService.mdl.colourRatioMax = val;
        }
    }

    // colourRatioMaxStr - as string, used for text box entry
    get colourRatioMaxStr(): string
    {
        let val = this.colourRatioMax;
        if(val === undefined || val === null)
        {
            return "";
        }
        /*
        if(val == 0)
        {
            return '0.'; // in case user wants to type...
        }
*/
        return val.toString();
    }

    set colourRatioMaxStr(maxRatio: string)
    {
        let parsedMax = parseFloat(maxRatio);
        if(!isNaN(parsedMax)) 
        {
            this.colourRatioMax = parsedMax;
        }
    }

    // Getting the min/max of the entire colour ratio range
    get colourRatioRangeMin(): number
    {
        let rgbuImgLayer = this._contextImageService.mdl.rgbuImageLayerForScale;
       
        if(this.removeBottomSpecularArtifacts && rgbuImgLayer && rgbuImgLayer.getSpecularRemovedValueRange(0))
        {
            return rgbuImgLayer.getSpecularRemovedValueRange(0).min;
        }
        else if(rgbuImgLayer && rgbuImgLayer.getValueRange(0))
        {
            return rgbuImgLayer.getValueRange(0).min;
        }

        return 0;
    }

    get colourRatioRangeMax(): number
    {
        let rgbuImgLayer = this._contextImageService.mdl.rgbuImageLayerForScale;

        if(this.removeTopSpecularArtifacts && rgbuImgLayer && rgbuImgLayer.getSpecularRemovedValueRange(0))
        {
            return rgbuImgLayer.getSpecularRemovedValueRange(0).max;
        }
        else if(rgbuImgLayer && rgbuImgLayer.getValueRange(0))
        {
            return rgbuImgLayer.getValueRange(0).max;
        }

        return 0;
    }

    scaleImageWidth: number = 100;

    onChangeRatioMinMaxSlider(event: RangeSliderValue): void
    {
        if(event.finish)
        {
            this.colourRatioMin = event.minValue;
            this.colourRatioMax = event.maxValue;
        }
    }

    onExport(): void
    {
        
    }
}
