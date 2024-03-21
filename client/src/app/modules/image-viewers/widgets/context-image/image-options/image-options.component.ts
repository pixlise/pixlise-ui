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

import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Observable, Subscription, map, of } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { ContextImagePickerComponent, ImageSelection } from "../../../components/context-image-picker/context-image-picker.component";
import { RangeSliderValue } from "src/app/modules/pixlisecore/components/atoms/range-slider/range-slider.component";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ImportMarsViewerImageReq, ImportMarsViewerImageResp } from "src/app/generated-protos/image-coreg-msgs";
import { MinMax } from "src/app/models/BasicTypes";

export class ImageDisplayOptions {
  constructor(
    public currentImage: string,
    public imageSmoothing: boolean,
    public imageBrightness: number,
    public removeTopSpecularArtifacts: boolean,
    public removeBottomSpecularArtifacts: boolean,
    public colourRatioMin: number | null,
    public colourRatioMax: number | null,
    public rgbuChannels: string,
    public unselectedOpacity: number,
    public unselectedGrayscale: boolean,
    public selectedScanId: string,
    public specularRemovedValueRange?: MinMax,
    public valueRange?: MinMax // public colourRatioRangeMin?: number,
  ) // public colourRatioRangeMax?: number
  {}

  copy(): ImageDisplayOptions {
    return new ImageDisplayOptions(
      this.currentImage,
      this.imageSmoothing,
      this.imageBrightness,
      this.removeTopSpecularArtifacts,
      this.removeBottomSpecularArtifacts,
      this.colourRatioMin,
      this.colourRatioMax,
      this.rgbuChannels,
      this.unselectedOpacity,
      this.unselectedGrayscale,
      this.selectedScanId,
      this.specularRemovedValueRange,
      this.valueRange
    );
  }
}
export class ImagePickerParams {
  constructor(
    public scanIds: string[],
    public options: ImageDisplayOptions
  ) {}
}
export class ImagePickerResult {
  constructor(public options: ImageDisplayOptions) {}
}

@Component({
  selector: "image-options",
  templateUrl: "./image-options.component.html",
  styleUrls: ["./image-options.component.scss"],
})
export class ImageOptionsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // All the settings we can manipulate. We construct a ImagePickerResult from these
  private _options = new ImageDisplayOptions("", true, 1, false, false, null, null, "RGB", 0.3, false, "");

  displayedChannels: string[] = [];
  displayedChannelsWithNone: string[] = [];

  private _chosenChannels: string = "RGB";
  private _chosenRatios: string = "R/G";

  public downloadLoading: boolean = false;

  // This prevents an infinite loop of loadOptions -> publishOptionChange in the case
  // something's wrong with loading a scale range
  private _requestedNewRange: boolean = false;

  @Output() optionChange = new EventEmitter();

  constructor(
    private _cachedDataService: APICachedDataService,
    private _dataService: APIDataService,
    private _snackService: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: ImagePickerParams,
    public dialogRef: MatDialogRef<ContextImagePickerComponent, ImagePickerResult>,
    public dialog: MatDialog //private _exportDataService: ExportDataService
  ) {
    // Copy the options so we can have "reset" buttons for eg
    this.loadOptions(data.options);
  }

  loadOptions(options: ImageDisplayOptions) {
    this._options = options.copy();

    this.displayedChannels = [...RGBUImage.channelToDisplayMap.values()];
    this.displayedChannelsWithNone = [...this.displayedChannels, "(None)"];
    if (!this._options.specularRemovedValueRange && !this._options.valueRange && !this.rgbuAsChannels && this.isRGBU) {
      if (!this._requestedNewRange) {
        // Wait a frame for the scale to be set up
        setTimeout(() => {
          this.publishOptionChange();
        }, 1);
        this._requestedNewRange = true;
      }
    } else {
      this._requestedNewRange = false;
    }
  }

  ngOnInit(): void {
    // Update the defaults so if user switches between ratio vs channels, we have a sensible "last seen" thing to show
    if (this.isRatio(this._options.rgbuChannels)) {
      this._chosenRatios = this._options.rgbuChannels;
    } else {
      this._chosenChannels = this._options.rgbuChannels;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  // Notifying caller of our options changing
  private publishOptionChange() {
    this.optionChange.emit(this.makeImagePickerResult());
  }

  private makeImagePickerResult(): ImagePickerResult {
    return new ImagePickerResult(this._options.copy());
  }

  // Options
  get options(): ImageDisplayOptions {
    return this._options;
  }

  onToggleImageSmoothing(): void {
    this._options.imageSmoothing = !this._options.imageSmoothing;
    this.publishOptionChange();
  }

  onResetBrightness(): void {
    this._options.imageBrightness = this.data.options.imageBrightness;
    this.publishOptionChange();
  }

  onChangeBrightness(event: SliderValue): void {
    this._options.imageBrightness = event.value;

    if (event.finish) {
      // Regenerate the image
      this.publishOptionChange();
    }
  }

  get imageBrightnessStr(): string {
    const brightness = this._options.imageBrightness;
    return brightness ? brightness.toFixed(2) : "";
  }

  set imageBrightnessStr(brightness: string) {
    const parsedBrightness = parseFloat(brightness);
    if (!isNaN(parsedBrightness)) {
      this._options.imageBrightness = parsedBrightness;
      this.publishOptionChange();
    }
  }

  // onSelectedImageChanged(image: ContextImageItem | null) {
  //   this._options.currentImage = image?.path || "";
  //   this.publishOptionChange();
  // }

  get selectedScanId(): string {
    return this._options.selectedScanId || "";
  }

  onSelectedImageChanged(selection: ImageSelection) {
    this._options.currentImage = selection.path;
    this._options.selectedScanId = selection.scanId;

    this.publishOptionChange();
  }

  private isRatio(channels: string): boolean {
    return channels.length == 3 && channels[1] == "/";
  }

  private setChannels(r: string | null, g: string | null, b: string | null) {
    const existingChannels = this._chosenChannels;
    const read = [r, g, b];
    let channels = "";

    let c = 0;
    for (const chRead of read) {
      let write = existingChannels.charAt(c);
      if (chRead) {
        write = RGBUImage.displayChannelToChannel(chRead);
      }
      channels += write;

      c++;
    }

    this._chosenChannels = channels;
    this._options.rgbuChannels = channels;
    this.publishOptionChange();
  }

  private setRatio(numerator: string | null, denominator: string | null) {
    const existingRatio = this._chosenRatios;
    const read = [numerator, denominator];
    let ratio = "";

    let c = 0;
    for (const chRead of read) {
      let write = existingRatio.charAt(c);
      if (chRead) {
        write = RGBUImage.displayChannelToChannel(chRead);
      }
      if (ratio.length > 0) {
        ratio += "/";
      }

      ratio += write;

      c += 2;
    }

    this._chosenRatios = ratio;
    this._options.rgbuChannels = ratio;
    this.publishOptionChange();
  }

  get channelForRed(): string {
    return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(0, 1));
  }

  set channelForRed(val: string) {
    this.setChannels(val, null, null);
  }

  get channelForGreen(): string {
    return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(1, 2));
  }

  set channelForGreen(val: string) {
    this.setChannels(null, val, null);
  }

  get channelForBlue(): string {
    return RGBUImage.channelToDisplayChannel(this._chosenChannels.substring(2, 3));
  }

  set channelForBlue(val: string) {
    this.setChannels(null, null, val);
  }

  onChangeUnselectedOpacity(event: SliderValue) {
    this._options.unselectedOpacity = event.value;
    if (event.finish) {
      this.publishOptionChange();
    }
  }

  onResetUnselectedOpacity(): void {
    this._options.unselectedOpacity = 0.4;
    this.publishOptionChange();
  }

  onToggleUnselectedGrayscale() {
    this._options.unselectedGrayscale = !this._options.unselectedGrayscale;
    this.publishOptionChange();
  }

  get channelForNumerator(): string {
    return RGBUImage.channelToDisplayChannel(this._chosenRatios.substring(0, 1));
  }

  set channelForNumerator(val: string) {
    this.setRatio(val, null);
  }

  get channelForDenominator(): string {
    return RGBUImage.channelToDisplayChannel(this._chosenRatios.substring(2, 3));
  }

  set channelForDenominator(val: string) {
    this.setRatio(null, val);
  }

  // TODO: Maybe need a more serious way of determining this... for now we're just checking if the current image is a TIF!
  get isRGBU(): boolean {
    return this._options?.currentImage.toUpperCase().endsWith(".TIF");
  }

  get rgbuOnlyHelpText(): string {
    if (this.isRGBU) {
      return "";
    }
    return "Select a .tif image to enable these options";
  }

  get rgbuAsChannels(): boolean {
    return !this.isRatio(this._options.rgbuChannels);
  }

  private autoSelectTiff(): Observable<string> {
    if (this.isRGBU) {
      // We're already showing an RGBU image, just make sure we're all set right
      return of(this._options.currentImage);
    }

    return this._cachedDataService.getImageList(ImageListReq.create({ scanIds: this.data.scanIds })).pipe(
      map((resp: ImageListResp) => {
        for (const img of resp.images) {
          // We auto pick the first "MSA" type multichannel image we find
          if (img.purpose === ScanImagePurpose.SIP_MULTICHANNEL && img.imagePath.toUpperCase().includes("MSA_")) {
            return img.imagePath;
          }
        }

        return "";
      })
    );
  }

  onRGBUAsChannels() {
    this.autoSelectTiff().subscribe((tiff: string) => {
      if (tiff) {
        this._options.currentImage = tiff;
        this._options.rgbuChannels = this._chosenChannels;
        this.publishOptionChange();
      }
    });
  }

  onRGBUAsRatio() {
    this.autoSelectTiff().subscribe((tiff: string) => {
      if (tiff) {
        this._options.currentImage = tiff;
        this.onResetBrightness();
        this._options.rgbuChannels = this._chosenRatios;
        this.publishOptionChange();
      }
    });
  }

  onToggleRemoveTopSpecularArtifacts(): void {
    this._options.removeTopSpecularArtifacts = !this._options.removeTopSpecularArtifacts;
    this.onResetRatioColourRemapping();
  }

  onToggleRemoveBottomSpecularArtifacts(): void {
    this._options.removeBottomSpecularArtifacts = !this._options.removeBottomSpecularArtifacts;
    this.onResetRatioColourRemapping();
  }

  onResetRatioColourRemapping(): void {
    this.onResetBrightness();
    this._options.colourRatioMin = this.data.options.colourRatioMax;
    this._options.colourRatioMax = this.data.options.colourRatioMax;
    this.publishOptionChange();
  }

  set colourRatioMin(val: number) {
    if (!isNaN(val)) {
      this._options.colourRatioMin = val;
      this.publishOptionChange();
    }
  }

  get colourRatioMin(): number {
    return this._options.colourRatioMin ?? Math.round(this.colourRatioRangeMin * 100) / 100;
  }

  // colourRatioMinStr - as string, used for text box entry
  get colourRatioMinStr(): string {
    const val = this.colourRatioMin;
    if (val === undefined || val === null) {
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

  set colourRatioMinStr(minRatio: string) {
    const parsedMin = parseFloat(minRatio);
    if (!isNaN(parsedMin)) {
      this._options.colourRatioMin = parsedMin;
      this.publishOptionChange();
    }
  }

  set colourRatioMax(val: number) {
    if (!isNaN(val)) {
      this._options.colourRatioMax = val;
      this.publishOptionChange();
    }
  }

  get colourRatioMax(): number {
    return this._options.colourRatioMax ?? Math.round(this.colourRatioRangeMax * 100) / 100;
  }

  // colourRatioMaxStr - as string, used for text box entry
  get colourRatioMaxStr(): string {
    const val = this.colourRatioMax;
    if (val === undefined || val === null) {
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

  set colourRatioMaxStr(maxRatio: string) {
    const parsedMax = parseFloat(maxRatio);
    if (!isNaN(parsedMax)) {
      this._options.colourRatioMax = parsedMax;
      this.publishOptionChange();
    }
  }

  // Getting the min/max of the entire colour ratio range
  get colourRatioRangeMin(): number {
    if (this.options.removeBottomSpecularArtifacts && this.options.specularRemovedValueRange) {
      return this.options.specularRemovedValueRange.min || 0;
    } else if (this.options.valueRange) {
      return this.options.valueRange.min || 0;
    } else {
      return 0;
    }
  }

  get colourRatioRangeMax(): number {
    if (this.options.removeTopSpecularArtifacts && this.options.specularRemovedValueRange) {
      return this.options.specularRemovedValueRange.max || 0;
    } else if (this.options.valueRange) {
      return this.options.valueRange.max || 0;
    } else {
      return 0;
    }
  }

  scaleImageWidth: number = 100;

  onChangeRatioMinMaxSlider(event: RangeSliderValue): void {
    if (event.finish) {
      this.colourRatioMin = event.minValue;
      this.colourRatioMax = event.maxValue;
      this.colourRatioMaxStr = event.maxValue.toString();
      this.colourRatioMinStr = event.minValue.toString();
      this.publishOptionChange();
    }
  }

  onExport(): void {
    // let outputName = `${this._datasetService.datasetIDLoaded} - Images.zip`;
    // this.downloadLoading = true;
    // this._exportDataService.generateExport(this._datasetService.datasetIDLoaded, "", ["context-image"], [], [], [], outputName).subscribe(
    //   (data: Blob) => {
    //     this.downloadLoading = false;
    //     saveAs(data, outputName);
    //   },
    //   err => {
    //     this.downloadLoading = false;
    //     console.error(`Error exporting images: ${err}`);
    //   }
    // );
  }

  onImport() {
    const entry = prompt("Enter token provided by MarsViewer");
    if (!entry) {
      return;
    }

    // We base64 decode it to find the URL
    const triggerUrl = atob(entry);

    this._dataService.sendImportMarsViewerImageRequest(ImportMarsViewerImageReq.create({ triggerUrl: triggerUrl })).subscribe({
      next: (resp: ImportMarsViewerImageResp) => {
        this._snackService.openSuccess(`Import from MarsViewer started...`, `Job id is ${resp.jobId}`);
      },
      error: err => {
        this._snackService.openError(err);
      },
    });
  }
}
