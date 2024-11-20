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
import { catchError, from, mergeMap, Subscription, tap, toArray } from "rxjs";
import { ScanImage, ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageGetReq, ImageListReq } from "src/app/generated-protos/image-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { makeImageTooltip } from "src/app/utils/image-details";
import { getPathBase, getScanIdFromImagePath, invalidPMC, SDSFields } from "src/app/utils/utils";
import { environment } from "src/environments/environment";

export class ImageChoice {
  constructor(
    public name: string,
    public path: string,
    public scanIds: string[] = [],
    public url: string = "",
    public marsViewerURL: string = "",
    public imgType: "RGBU" | "MCC" | "OTHER" = "MCC",
    public imagePMC: number = invalidPMC
  ) {}

  copy(): ImageChoice {
    return new ImageChoice(this.name, this.path, this.scanIds, this.url, this.marsViewerURL, this.imgType, this.imagePMC);
  }
}

export class ImagePickerDialogData {
  constructor(
    public purpose: ScanImagePurpose,
    public liveUpdate: boolean,
    public scanIds: string[],
    public selectedImagePath: string,
    public selectedImageDetails: string = "",
    public defaultScanId?: string,
    public multipleSelection?: boolean,
    public selectedPaths?: string[] // Only used if multipleSelection is true
  ) {}
}

export interface ImagePickerDialogResponse {
  selectedPaths: string[]; // Only used if multipleSelection is true
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

  // If multipleSelection is true, then the user can select multiple images
  public selectedPaths: Set<string> = new Set<string>();

  public selectedImagePath: string = "";
  public selectedChoice: ImageChoice | null = null;
  public selectedImageDetails: string = "";

  @Output() onSelectedImageChange = new EventEmitter();

  _subs = new Subscription();

  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  private _filterScanId: string = "";

  waitingForImages: ImageChoice[] = [];
  loadingList = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImagePickerDialogData,
    public dialogRef: MatDialogRef<ImagePickerDialogComponent, ImagePickerDialogResponse>,
    private _cachedDataService: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _endpointsService: APIEndpointsService,
    private _dataService: APIDataService
  ) {}

  ngOnInit() {
    if (this.data.multipleSelection && this.data.selectedPaths && this.data.selectedPaths.length > 0) {
      this.selectedPaths = new Set<string>(this.data.selectedPaths);
      if (!this.data.selectedImagePath) {
        this.selectedImagePath = Array.from(this.selectedPaths)[this.selectedPaths.size - 1];
        this.filterScanId = getScanIdFromImagePath(this.selectedImagePath);
      }
    }

    if (this.data.selectedImagePath) {
      this.selectedImagePath = this.data.selectedImagePath;
    }

    if (this.data.selectedImageDetails) {
      this.selectedImageDetails = this.data.selectedImageDetails;
    } else {
      this.loadSelectedImageDetails();
    }

    if (this.data.scanIds && this.data.scanIds.length > 0) {
      this.filterScanId = this.data.defaultScanId ? this.data.defaultScanId : this.data.scanIds[0];
    } else if (this.data.defaultScanId) {
      this.filterScanId = this.data.defaultScanId;
    }

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
          if (this.configuredScans && (!this.data.scanIds || this.data.scanIds.length === 0)) {
            if (!this.filterScanId) {
              this.filterScanId = this.configuredScans[0].id;
            }
          }
        } else {
          this.configuredScans = scans;
        }
      })
    );

    if (this.data.scanIds) {
      this.fetchImagesForScans(this.data.scanIds);
    }
  }

  fetchImagesForScans(scanIds: string[]): void {
    if (scanIds.length === 0) {
      return;
    }

    this.loadingList = true;
    this._subs.add(
      this._cachedDataService
        .getImageList(ImageListReq.create({ scanIds }))
        .pipe(
          tap(resp => {
            this.loadingList = false;
            this.filteredImageChoices = [];
            this.processImages(resp.images);
          })
        )
        .subscribe()
    );
  }

  private processImages(images: ScanImage[]): void {
    let loadedImageChoiceIds: Set<string> = new Set<string>();
    this.imageChoices.forEach(imgChoice => {
      loadedImageChoiceIds.add(imgChoice.path);
    });
    from(images)
      .pipe(
        //
        mergeMap(img => {
          // NOTE: We are passing this image choice by reference, not value, so any changes to it will be reflected in multiple
          // locations
          const imageChoice = this.makeImageChoice(img);

          if (!loadedImageChoiceIds.has(imageChoice.path)) {
            this.imageChoices.push(imageChoice);
          }

          if (img.associatedScanIds.includes(this.filterScanId)) {
            if (!this.filteredImageChoices.find(imgChoice => imgChoice.path === img.imagePath)) {
              this.filteredImageChoices.push(imageChoice);
              this.sortFilteredImages();
            }
          }

          if (this.selectedImagePath === img.imagePath) {
            this.selectedChoice = imageChoice;
          }

          return this.loadImagePreview(imageChoice);
        }),
        catchError(err => {
          console.error("Error processing image", err);
          return err;
        }),
        toArray()
      )
      .subscribe();
  }

  private makeImageChoice(image: ScanImage): ImageChoice {
    const imageName = image.imagePath.replace(/^\d+\//, "");
    const marsViewerURL = this.makeMarsViewerURL(imageName);
    const fields = SDSFields.makeFromFileName(getPathBase(image.imagePath));

    let imgType: "RGBU" | "MCC" | "OTHER" = image.purpose == ScanImagePurpose.SIP_MULTICHANNEL ? "RGBU" : "OTHER";

    if (fields && fields.prodType !== "MSA" && fields.prodType !== "VIS" && fields.producer == "J") {
      imgType = "MCC";
    }

    return new ImageChoice(imageName, image.imagePath, image.associatedScanIds, "loading", marsViewerURL, imgType, fields?.PMC || invalidPMC);
  }

  private loadImagePreview(imgChoice: ImageChoice) {
    const isTiff = imgChoice.name.toLowerCase().endsWith(".tif") || imgChoice.name.toLowerCase().endsWith(".tiff");
    if (isTiff) {
      return this._endpointsService.loadRGBUImageTIFPreview(imgChoice.path).pipe(
        tap(url => {
          imgChoice.url = url;
        }),
        catchError(err => {
          console.error("Error loading TIFF preview image", imgChoice.path, err);
          imgChoice.url = "error";
          return err;
        })
      );
    } else {
      return this._endpointsService.loadImageForPath(imgChoice.path).pipe(
        tap(img => {
          imgChoice.url = img.src;
        }),
        catchError(err => {
          console.error("Error loading preview image", imgChoice.path, err);
          imgChoice.url = "error";
          return err;
        })
      );
    }
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
    this.sortFilteredImages();

    if (this.filteredImageChoices.length === 0) {
      this.fetchImagesForScans([scanId]);
    }
  }

  get scanIds(): string[] {
    if (!this.data.scanIds) {
      return [this._analysisLayoutService.defaultScanId];
    }

    return this.data.scanIds;
  }

  private sortFilteredImages() {
    this.filteredImageChoices.sort((a: ImageChoice, b: ImageChoice) => {
      if (a.imgType === b.imgType) {
        // If we have valid PMCs, sort by that
        if (a.imagePMC >= 0 && b.imagePMC >= 0) {
          return a.imagePMC - b.imagePMC;
        }

        // Otherwise sort by file name
        return a.name.localeCompare(b.name);
      }
      return a.imgType.localeCompare(b.imgType);
    });
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

  loadSelectedImageDetails(): void {
    this.selectedImageDetails = "Loading...";
    if (this.selectedImagePath.length > 0) {
      this._dataService.sendImageGetRequest(ImageGetReq.create({ imageName: this.selectedImagePath })).subscribe((resp: any) => {
        this.selectedImageDetails = makeImageTooltip(resp.image);
      });
    }
  }

  onSelectImage(image: ImageChoice): void {
    // Toggle select unless we're live updating, in which case we only want to broadcast the new image
    if (this.selectedImagePath === image.path && !this.data.liveUpdate) {
      if (this.data.multipleSelection) {
        this.selectedPaths.delete(image.path);

        if (this.selectedPaths.size > 0) {
          this.selectedImagePath = Array.from(this.selectedPaths)[this.selectedPaths.size - 1];
          this.selectedChoice = this.imageChoices.find(img => img.path === this.selectedImagePath) || null;
          this.loadSelectedImageDetails();
        } else {
          this.selectedImagePath = "";
          this.selectedChoice = null;
          this.selectedImageDetails = "";
        }
      }
      // else: Single select - don't allow unselecting the only selected image
    } else if (this.selectedImagePath !== image.path) {
      this.selectedImagePath = image.path;
      this.selectedChoice = image;

      this.loadSelectedImageDetails();
      if (this.data.liveUpdate) {
        this.onSelectedImageChange.emit(image.path);
      }

      if (this.data.multipleSelection) {
        if (this.selectedPaths.has(image.path)) {
          this.selectedPaths.delete(image.path);
        } else {
          this.selectedPaths.add(image.path);
        }
      }
    }
  }

  checkSelected(image: ImageChoice): boolean {
    return this.data?.multipleSelection ? this.selectedPaths.has(image.path) : this.selectedImagePath === image.path;
  }

  onSelectAllForScan(): void {
    this.filteredImageChoices.forEach(img => {
      if (!this.selectedPaths.has(img.path)) {
        this.selectedPaths.add(img.path);
      }
    });

    if (this.selectedPaths.size > 0) {
      this.selectedImagePath = Array.from(this.selectedPaths)[this.selectedPaths.size - 1];
      this.selectedChoice = this.imageChoices.find(img => img.path === this.selectedImagePath) || null;
      this.loadSelectedImageDetails();
    }
  }

  onClear(): void {
    this.selectedPaths.clear();
    this.selectedImagePath = "";
    this.selectedChoice = null;
    this.selectedImageDetails = "";
  }

  onApply(): void {
    this.dialogRef.close({
      selectedPaths: Array.from(this.selectedPaths),
      selectedImagePath: this.selectedImagePath,
      selectedImageName: this.selectedChoice?.name || "",
      selectedImageScanId: this.filterScanId,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
