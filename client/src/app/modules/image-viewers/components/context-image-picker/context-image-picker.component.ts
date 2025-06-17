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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subscription } from "rxjs";
import { SDSFields, getPathBase, invalidPMC } from "src/app/utils/utils";
import { ContextImageItemTransform } from "../../models/image-transform";
import { ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { makeImageTooltip } from "src/app/utils/image-details";
import { ScanImagePurpose, ScanImageSource } from "src/app/generated-protos/image";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { environment } from "src/environments/environment";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import {
  ImagePickerDialogComponent,
  ImagePickerDialogData,
  ImagePickerDialogResponse,
} from "src/app/modules/pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";

export class ContextImageItem {
  constructor(
    public path: string,
    public imagePMC: number,
    public hasBeamData: boolean,
    public beamIJIndex: number, // -1=default context image beam ij's, 0+ indexes into beam.context_locations[]
    public imageDrawTransform: ContextImageItemTransform | null // public rgbuSourceImage: RGBUImage, // eg if image was a floating point TIF
  ) {}
}

// TODO: Should probably generalise this and make it into a reusable drop-list since the reason for writing
// this was that the standard mat-select wasn't doing enough for us!

class DisplayContextImageItem {
  marsViewerURL: string = "";
  title: string = "";

  constructor(
    public item: ContextImageItem,
    public selected: boolean,
    public tooltip: string
  ) {
    this.marsViewerURL = this.makeMarsViewerURL();
    this.title = this.makeTitle();
  }

  private makeMarsViewerURL(): string {
    // If this is not a valid file name, don't try
    let mvName = this.item.path.toUpperCase();
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

  private makeTitle(): string {
    let title = "";
    if (this.item.imagePMC != invalidPMC) {
      title = "PMC: " + this.item.imagePMC + " ";

      if (this.item.hasBeamData) {
        if (this.item.imageDrawTransform) {
          // File name might contain some info that we're interested in, eg is this mastcam/watson, etc
          // chop off extension though!
          let filename = this.item.path;
          const dotpos = filename.lastIndexOf(".");
          if (dotpos > -1) {
            filename = filename.substring(0, dotpos);
          }
          title += "(Matched)";
        } else {
          title += "(GDS)";
        }
      }
    }

    title += " " + this.item.path;

    return title;
  }
}

export type ImageSelection = {
  path: string;
  scanId: string;
};

@Component({
  selector: "image-picker",
  templateUrl: "./context-image-picker.component.html",
  styleUrls: ["./context-image-picker.component.scss"],
})
export class ContextImagePickerComponent implements OnInit, OnDestroy, OnChanges {
  private _subs = new Subscription();

  @Input() initialScanId: string = "";
  @Input() scanIds: string[] = [];
  @Input() currentImage: string = "";
  @Input() includeHideOption: boolean = true;
  @Input() onlyInstrumentImages: boolean = false;
  @Input() noAssociatedScreenConfiguration: boolean = false;
  @Input() preventDatasetChange: boolean = false;
  @Input() mccOnly: boolean = false;

  @Output() selectedImage = new EventEmitter<ImageSelection>();

  contextImageItemShowing: ContextImageItem | null = null;
  contextImagePath: string = "";
  contextImageItemShowingTooltip: string = "";
  contextImages: DisplayContextImageItem[] = [];
  showWarning = false;

  loading: boolean = false;
  errorText: string = "";

  constructor(
    private _dataService: APIDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.updateCurrentImageDisplayed();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // TODO: do we need the paranoid current != previous check?
    if (changes["currentImage"] && changes["currentImage"].currentValue !== changes["currentImage"].previousValue) {
      this.updateCurrentImageDisplayed();
    }
  }

  private checkImage(imagePath: string, callback: (item: ContextImageItem, tooltip: string) => void) {
    if (imagePath.length <= 0) {
      this.loading = false;
      this.errorText = "";
      return;
    }

    this._dataService.sendImageGetRequest(ImageGetReq.create({ imageName: imagePath })).subscribe({
      next: (resp: ImageGetResp) => {
        // NOTE: Image returned may not be the same one we requested - we may be receiving a newer version of the image. Use whatever
        // is returned, and point it out to the user too
        this.loading = false;
        this.errorText = "";

        if (!resp.image) {
          return;
        }

        const img = resp.image;

        if (this.onlyInstrumentImages && img.source != ScanImageSource.SI_INSTRUMENT) {
          // We're only showing images that came from the instrument
          return;
        }

        let matchInfo: ContextImageItemTransform | null = null;
        if (img.matchInfo) {
          matchInfo = new ContextImageItemTransform(img.matchInfo.xOffset, img.matchInfo.yOffset, img.matchInfo.xScale, img.matchInfo.yScale);
        }

        const item = new ContextImageItem(
          img.imagePath,
          invalidPMC, // pmc
          false, // has beam
          -1, // beam idx
          matchInfo
        );

        const tooltip = getPathBase(img.imagePath) + "\n\nDetails:\n" + makeImageTooltip(img);

        callback(item, tooltip);
      },
      error: err => {
        this.loading = false;
        this.errorText = err?.message || "Failed to load image list";
      },
    });
  }

  private updateCurrentImageDisplayed() {
    if (this.scanIds.length <= 0) {
      return;
    }

    this.loading = true;
    this.errorText = "";

    if (!this.currentImage) {
      this.contextImageItemShowing = null;
      this.contextImageItemShowingTooltip = "";
      this.contextImagePath = "";
      this.loading = false;
      return;
    }

    this.checkImage(this.currentImage, (item: ContextImageItem, tooltip: string) => {
      this.contextImageItemShowingTooltip = "";
      this.showWarning = false;
      if (item.path !== this.currentImage) {
        this.contextImageItemShowingTooltip = `NOTE: Image selected is: "${this.currentImage}"\nPIXLISE server provided: "${item.path}"\nThe server returns the latest version of the image requested, so your workspace may simply be referencing an older version of the image. If the image looks correct, this can be ignored.\n\n`;
        this.showWarning = true;
      }

      this.contextImageItemShowing = item;
      this.contextImageItemShowingTooltip += tooltip;
      this.contextImagePath = item.path;
    });
  }

  onImagePicker() {
    const dialogConfig = new MatDialogConfig<ImagePickerDialogData>();
    // Pass data to dialog
    dialogConfig.data = {
      defaultScanId: this.initialScanId,
      scanIds: this.scanIds,
      purpose: ScanImagePurpose.SIP_UNKNOWN,
      selectedImagePath: this.contextImagePath,
      liveUpdate: false,
      selectedImageDetails: "", // this.contextImageItemShowingTooltip,
      noAssociatedScreenConfiguration: this.noAssociatedScreenConfiguration,
      preventDatasetChange: this.preventDatasetChange,
      mccOnly: this.mccOnly,
    };

    const dialogRef = this.dialog.open(ImagePickerDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((response: ImagePickerDialogResponse) => {
      if (!response) {
        return; // Cancelled, ignore
      }

      if (response.selectedImagePath) {
        // Load the image requested
        this.checkImage(response?.selectedImagePath, (item: ContextImageItem, tooltip: string) => {
          let selected = false;
          if (item.path === this.currentImage) {
            selected = true;
          }

          this.onSetImage(new DisplayContextImageItem(item, selected, tooltip), response?.selectedImageScanId || "");
        });
      } else {
        this.onSetImage(null, response?.selectedImageScanId || "");
      }
    });
  }

  onSetImage(img: DisplayContextImageItem | null, scanId: string) {
    this.selectedImage.emit({ path: img ? img.item.path : "", scanId });
    this.currentImage = img?.item.path || "";
    this.updateCurrentImageDisplayed();
  }

  onOpenExternal(img: DisplayContextImageItem, event: any) {
    // Stop this triggering an image selection event
    event.stopPropagation();

    if (!img.marsViewerURL) {
      alert("This image is not in Mars Viewer");
      return;
    }

    // Open this URL in a new window
    window.open(img.marsViewerURL, "_blank");
  }

  get currentFileName(): string {
    return this.contextImageItemShowing ? getPathBase(this.contextImageItemShowing.path) : "(No Image)";
  }
}
