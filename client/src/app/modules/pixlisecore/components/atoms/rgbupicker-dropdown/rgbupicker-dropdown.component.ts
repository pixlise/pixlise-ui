import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatSelectChange } from "@angular/material/select";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/services/analysis-layout.service";
import { APICachedDataService } from "../../../services/apicacheddata.service";

class ImageChoice {
  constructor(
    public name: string,
    public path: string
  ) {}
}

@Component({
  standalone: false,
  selector: "rgbupicker-dropdown",
  templateUrl: "./rgbupicker-dropdown.component.html",
  styleUrls: ["./rgbupicker-dropdown.component.scss"],
})
export class RGBUPickerDropdownComponent implements OnInit {
  @Input() scanIds: string[] = [];
  @Input() imageName: string = "";
  @Input() purpose: ScanImagePurpose = ScanImagePurpose.SIP_UNKNOWN;
  @Output() imageChosen = new EventEmitter();

  private _imageChoices: ImageChoice[] = [];

  constructor(
    private _cachedDataService: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  ngOnInit() {
    // NOTE: we should list all TIFs for all scans in the workspace
    this._cachedDataService.getImageList(ImageListReq.create({ scanIds: this.scanIds })).subscribe((resp: ImageListResp) => {
      this._imageChoices = [];

      for (const img of resp.images) {
        if (this.purpose === ScanImagePurpose.SIP_UNKNOWN || img.purpose === this.purpose) {
          this._imageChoices.push(new ImageChoice(img.imagePath, img.imagePath));
        }
      }
    });
  }

  get scanIdsForRGBUPicker(): string[] {
    if (!this._analysisLayoutService.defaultScanId) {
      return [];
    }

    return [this._analysisLayoutService.defaultScanId];
  }

  onImageChanged(change: MatSelectChange) {
    if (this.imageName == change.value) {
      // No change, stop here
      return;
    }

    this.imageChosen.emit(change.value);
  }

  get imageChoices(): ImageChoice[] {
    return this._imageChoices;
  }
}
