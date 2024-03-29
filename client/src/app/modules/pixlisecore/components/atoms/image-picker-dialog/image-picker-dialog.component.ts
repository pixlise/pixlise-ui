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

import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Observable, Subscription } from "rxjs";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageGetReq, ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { RGBUImage } from "src/app/models/RGBUImage";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { makeImageTooltip } from "src/app/utils/image-details";
import { SDSFields } from "src/app/utils/utils";
import { environment } from "src/environments/environment";

export class ImageChoice {
  constructor(
    public name: string,
    public path: string,
    public scanIds: string[] = [],
    public url: string = "",
    public marsViewerURL: string = "",
    public isTiff: boolean = false
  ) {}
}

export class ImagePickerDialogData {
  constructor(
    public purpose: ScanImagePurpose,
    public liveUpdate: boolean,
    public scanIds: string[],
    public selectedImagePath: string,
    public selectedImageDetails: string = "",
    public defaultScanId?: string
  ) {}
}

export interface ImagePickerDialogResponse {
  selectedImagePath: string;
  selectedImageName: string | null;
  selectedImageScanId?: string | null;
}

@Component({
  selector: "image-picker-dialog",
  templateUrl: "./image-picker-dialog.component.html",
  styleUrls: ["./image-picker-dialog.component.scss"],
})
export class ImagePickerDialogComponent implements OnInit {
  public imageChoices: ImageChoice[] = [];
  public filteredImageChoices: ImageChoice[] = [];

  public selectedImagePath: string = "";
  public selectedChoice: ImageChoice | null = null;
  public selectedImageDetails: string = "";

  @Output() onSelectedImageChange = new EventEmitter();

  _subs = new Subscription();

  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  private _filterScanId: string = "";

  waitingForImages: ImageChoice[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImagePickerDialogData,
    public dialogRef: MatDialogRef<ImagePickerDialogComponent, ImagePickerDialogResponse>,
    private _cachedDataService: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _endpointsService: APIEndpointsService,
    private _dataService: APIDataService
  ) {}

  ngOnInit() {
    if (this.data.selectedImagePath) {
      this.selectedImagePath = this.data.selectedImagePath;
    }

    if (this.data.selectedImageDetails) {
      this.selectedImageDetails = this.data.selectedImageDetails;
    }

    if (this.data.scanIds && this.data.scanIds.length > 0) {
      this.filterScanId = this.data.defaultScanId ? this.data.defaultScanId : this.data.scanIds[0];
    }

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }
      })
    );

    this._subs.add(
      this._cachedDataService.getImageList(ImageListReq.create({ scanIds: this.data.scanIds })).subscribe((resp: ImageListResp) => {
        this.imageChoices = [];
        this.filteredImageChoices = [];

        // Check if all have the same prefix, because then we don't want to show it as part of the name field
        let prefix = "";
        let allSamePrefix = true;
        for (const img of resp.images) {
          if (prefix.length <= 0) {
            const pos = img.imagePath.indexOf("/");
            prefix = img.imagePath.substring(0, pos + 1);
          } else {
            if (!img.imagePath.startsWith(prefix)) {
              allSamePrefix = false;
              break;
            }
          }
        }

        for (const responseImage of resp.images.sort((a, b) => b.imagePath.localeCompare(a.imagePath))) {
          if (this.data.purpose === ScanImagePurpose.SIP_UNKNOWN || responseImage.purpose === this.data.purpose) {
            let marsViewerURL = this.makeMarsViewerURL(responseImage.imagePath);
            this.waitingForImages.push(
              new ImageChoice(
                responseImage.imagePath,
                responseImage.imagePath,
                responseImage.associatedScanIds,
                "",
                marsViewerURL,
                responseImage.purpose === ScanImagePurpose.SIP_MULTICHANNEL
              )
            );

            let imageChoice = new ImageChoice(
              responseImage.imagePath,
              responseImage.imagePath,
              responseImage.associatedScanIds,
              "loading",
              marsViewerURL,
              responseImage.purpose === ScanImagePurpose.SIP_MULTICHANNEL
            );

            if (allSamePrefix) {
              imageChoice.name = imageChoice.name.substring(prefix.length);
            }

            this.imageChoices.push(imageChoice);
            if (responseImage.associatedScanIds.includes(this.filterScanId)) {
              this.filteredImageChoices.push(imageChoice);
            }

            if (this.selectedImagePath === responseImage.imagePath) {
              this.selectedChoice = imageChoice;
            }

            if (imageChoice.isTiff) {
              this._endpointsService.loadRGBUImageTIFPreview(responseImage.imagePath).subscribe({
                next: (url: string) => {
                  let imgChoice = this.imageChoices.find(imgChoice => imgChoice.path === responseImage.imagePath);
                  if (imgChoice) {
                    imgChoice.url = url;
                    if (this.selectedImagePath === responseImage.imagePath) {
                      this.selectedChoice = imgChoice;
                    }
                    this.waitingForImages = this.waitingForImages.filter(imgChoice => imgChoice.path !== responseImage.imagePath);
                  }
                },
                error: (err: any) => {
                  console.error(err);

                  let imgChoice = this.imageChoices.find(imgChoice => imgChoice.path === responseImage.imagePath);
                  if (imgChoice) {
                    imgChoice.url = "error";
                    if (this.selectedImagePath === responseImage.imagePath) {
                      this.selectedChoice = imgChoice;
                    }
                  }
                  this.waitingForImages = this.waitingForImages.filter(imgChoice => imgChoice.path !== responseImage.imagePath);
                },
              });
            } else {
              this._endpointsService.loadImageForPath(responseImage.imagePath).subscribe({
                next: (img: HTMLImageElement) => {
                  let imgChoice = this.imageChoices.find(imgChoice => imgChoice.path === responseImage.imagePath);
                  if (imgChoice) {
                    imgChoice.url = img.src;
                    if (this.selectedImagePath === responseImage.imagePath) {
                      this.selectedChoice = imgChoice;
                    }
                  }
                  this.waitingForImages = this.waitingForImages.filter(imgChoice => imgChoice.path !== responseImage.imagePath);
                },
                error: (err: any) => {
                  console.error(err);
                  let imgChoice = this.imageChoices.find(imgChoice => imgChoice.path === responseImage.imagePath);
                  if (imgChoice) {
                    imgChoice.url = "error";
                    if (this.selectedImagePath === responseImage.imagePath) {
                      this.selectedChoice = imgChoice;
                    }
                  }
                  this.waitingForImages = this.waitingForImages.filter(imgChoice => imgChoice.path !== responseImage.imagePath);
                },
              });
            }
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get waitingForImagesTooltip(): string {
    return "Waiting For:\n" + this.waitingForImages.map(img => img.name).join("\n");
  }

  get filterScanId(): string {
    return this._filterScanId;
  }

  set filterScanId(scanId: string) {
    this._filterScanId = scanId;
    this.filteredImageChoices = this.imageChoices.filter(img => img.scanIds.includes(scanId));
  }

  get scanIds(): string[] {
    if (!this.data.scanIds) {
      return [this._analysisLayoutService.defaultScanId];
    }

    return this.data.scanIds;
  }

  private makeMarsViewerURL(path: string): string {
    // If this is not a valid file name, don't try
    let mvName = path.toUpperCase();
    const fields = SDSFields.makeFromFileName(mvName);
    if (!fields) {
      return "";
    }

    // Work out what the mars viewer URL would be
    if (mvName.toUpperCase().endsWith(".PNG")) {
      mvName = mvName.substring(0, mvName.length - 3) + "IMG";
    } else {
      // TIF images shouldn't have mars viewer links!
      return "";
    }

    // Switch the prodType to something that's likely to be found in MarsViewer
    if (fields.prodType == "RCM") {
      // Replace this with something that's likely to appear
      /*
        Response from Kyle Uckert about RCM and what we should point to...

        The RCM product type is something that we (Luca and I) generate, not IDS - it is not archived in the PDS and will not appear in MarsViewer.
        RCM is the same as ECM, but has the second TIF layer with the X-ray beam locations. ECM is an EDR product that is essentially the "raw
        image". The camera SIS has a description of all of these products, but the main differences are summarized below:

        ECM - raw image
        EDR - decompanded image
        FDR - the raw image that all RDRs are derived from (usually identical to ECM)
        RAD - radiometrically-corrected in absolute radiance units (15-bit int)
        RAF - radiometrically-corrected in absolute radiance units (floats)
        RAS - radiometrically-corrected in absolute radiance units (12-bit ints)
        RZS - zenith-scaled radiance (12-bit ints)

        We were originally using the ECM files as our source because a radiometric calculation was not available at the start of the mission to
        generate the RAD/RAF/RAS/RZS files. In some cases, the radiometric calculation fails and the resulting image is purely white, which also
        causes our pipeline to have some issues.

        I would suggest opening the ECM file, which should allow a user to select the dropdown button at the top right (see image below) to change
        the image to any other RDR file. Also note that the images in MarsViewer are often scaled and the contrast that is shown in these images can
        be a bit misleading.
      */

      mvName = mvName.substring(0, 23) + "ECM" + mvName.substring(26);
    }

    // Generate URL
    // An example, when browsing around finding one manually:
    // https://marsviewer.sops.m20.jpl.nasa.gov/?B_ocs_type_name=m20-edr-rdr-m20-mosaic&EDR=s3%3A%2F%2Fm20-sops-ods%2Fods%2Fsurface%2Fsol%2F00257%2Fids%2Ffdr%2Fpixl%2FPCW_0257_0689790669_000FDR_N00800000890639430006075J01.IMG&FS_instrument_id=PC&FS_ocs_name=PCW_0257_0689790669_000FDR_N00800000890639430006075J01.IMG&FS_ocs_type_name=m20-edr-rdr-m20-mosaic&FS_time1=257%2C257&center=376.00000%2C290.00000&iti=0&overlays=PCW_0257_0689790669_000RAD_N00800000890639430006075J02.IMG&sti=1&zoom=1.13830
    // We only want to specify the minimum, which seems to be:
    return environment.marsViewerUrlRoot + "/?FS_ocs_name=" + mvName;
  }

  onSelectImage(image: ImageChoice): void {
    this.selectedImagePath = image.path;
    this.selectedChoice = image;

    this.selectedImageDetails = "Loading...";
    this._dataService.sendImageGetRequest(ImageGetReq.create({ imageName: image.path })).subscribe((resp: any) => {
      this.selectedImageDetails = makeImageTooltip(resp.image);
    });

    if (this.data.liveUpdate) {
      this.onSelectedImageChange.emit(image.path);
    }
  }

  onApply(): void {
    this.dialogRef.close({ selectedImagePath: this.selectedImagePath, selectedImageName: this.selectedChoice?.name || "", selectedImageScanId: this.filterScanId });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
