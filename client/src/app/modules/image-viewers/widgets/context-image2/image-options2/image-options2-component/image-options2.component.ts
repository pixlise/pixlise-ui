import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ContextImagePickerComponent, ImageSelection } from 'src/app/modules/image-viewers/components/context-image-picker/context-image-picker.component';
import { SliderValue } from 'src/app/modules/pixlisecore/components/atoms/slider/slider.component';


export class ImageDisplayOptions2 {
  constructor(
    public currentImage: string,
    public imageSmoothing: boolean,
    public imageBrightness: number,
    public selectedScanId: string
  ) {}


  copy(): ImageDisplayOptions2 {
    return new ImageDisplayOptions2(
      this.currentImage,
      this.imageSmoothing,
      this.imageBrightness,
      this.selectedScanId
    );
  }
}

export class ImagePickerParams2 {
  constructor(
    public scanIds: string[],
    public warningMsg: string,
    public options: ImageDisplayOptions2
  ) {}
}
export class ImagePickerResult2 {
  constructor(public options: ImageDisplayOptions2) {}
}


@Component({
  selector: 'app-image-options2',
  standalone: false,
  templateUrl: './image-options2.component.html',
  styleUrl: './image-options2.component.scss'
})
export class ImageOptions2Component implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // All the settings we can manipulate. We construct a ImagePickerResult from these
  private _options = new ImageDisplayOptions2("", true, 1, "");
  private _imageBrightnessCache: Map<string, number> = new Map<string, number>();

  @Output() optionChange = new EventEmitter();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImagePickerParams2,
    public dialogRef: MatDialogRef<ContextImagePickerComponent, ImagePickerResult2>,
    public dialog: MatDialog
  ) {
    // Copy the options so we can have "reset" buttons for eg
    this.loadOptions(data.options);
  }

  loadOptions(options: ImageDisplayOptions2) {
    this._options = options.copy();
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  // Options
  get options(): ImageDisplayOptions2 {
    return this._options;
  }

  onToggleImageSmoothing(): void {
    this._options.imageSmoothing = !this._options.imageSmoothing;
    this.publishOptionChange();
  }

  onResetBrightness(): void {
    this._options.imageBrightness = 1;
    this._imageBrightnessCache.set(this._options.currentImage, this._options.imageBrightness);
    this.publishOptionChange();
  }

  onChangeBrightness(event: SliderValue): void {
    this._options.imageBrightness = event.value;

    if (event.finish) {
      this._imageBrightnessCache.set(this._options.currentImage, this._options.imageBrightness);

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
      this._imageBrightnessCache.set(this._options.currentImage, this._options.imageBrightness);
      this.publishOptionChange();
    }
  }
  get selectedScanId(): string {
    return this._options.selectedScanId || "";
  }

  // Notifying caller of our options changing
  private publishOptionChange() {
    this.optionChange.emit(this.makeImagePickerResult());
  }

  private makeImagePickerResult(): ImagePickerResult2 {
    return new ImagePickerResult2(this._options.copy());
  }

  onSelectedImageChanged(selection: ImageSelection) {
    this._options.currentImage = selection.path;
    this._options.selectedScanId = selection.scanId;

    // Set brightness back to whatever we last had it as for this image, or 1
    let br = this._imageBrightnessCache.get(selection.path);
    if (!br) {
      br = 1;
    }

    this._options.imageBrightness = br;
    this.publishOptionChange();
  }
}
