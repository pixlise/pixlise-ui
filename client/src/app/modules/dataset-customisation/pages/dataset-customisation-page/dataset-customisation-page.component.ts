import { Component, OnDestroy, OnInit } from "@angular/core";
import { ContextImageItem, ContextImageItemTransform, ContextImageModelLoadedData, ContextImageScanModel } from "src/app/modules/image-viewers/image-viewers.module";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { APIDataService, PickerDialogComponent, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { ImageMatchTransform, ScanImage, ScanImageSource } from "src/app/generated-protos/image";
import { Subscription } from "rxjs";
import {
  ImageListReq,
  ImageListResp,
  ImageSetDefaultReq,
  ImageSetDefaultResp,
  ImageGetDefaultReq,
  ImageGetDefaultResp,
  ImageSetMatchTransformReq,
  ImageSetMatchTransformResp,
} from "src/app/generated-protos/image-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ScanMetaWriteReq, ScanMetaWriteResp } from "src/app/generated-protos/scan-msgs";
import { DatasetCustomisationService } from "../../services/dataset-customisation.service";
import { DatasetCustomisationModel } from "./dataset-customisation-model";
import { DatasetCustomisationDrawer } from "./dataset-customisation-drawer";
import { AlignmentInteraction } from "./dataset-customisation-interaction";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { ImageDeleteReq } from "src/app/generated-protos/image-msgs";
import { ImageDeleteResp } from "src/app/generated-protos/image-msgs";
import { MatSelectChange } from "@angular/material/select";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ContextImageMapLayer } from "src/app/modules/image-viewers/models/map-layer";
import { ColourRamp } from "src/app/utils/colours";
import { SDSFields } from "src/app/utils/utils";
import { AddCustomImageParameters, AddCustomImageComponent, AddCustomImageResult } from "../../components/add-custom-image/add-custom-image.component";
import { ImageUploadReq } from "src/app/generated-protos/image-msgs";
import { ImageUploadResp } from "src/app/generated-protos/image-msgs";
import { PickerDialogItem, PickerDialogData } from "src/app/modules/pixlisecore/components/atoms/picker-dialog/picker-dialog.component";

@Component({
  selector: "app-dataset-customisation-page",
  templateUrl: "./dataset-customisation-page.component.html",
  styleUrls: ["./dataset-customisation-page.component.scss"],
})
export class DatasetCustomisationPageComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  mdl: DatasetCustomisationModel;
  drawer: CanvasDrawer;
  private _interaction: AlignmentInteraction;

  cursorShown: string = "";

  title: string | null = null;
  description: string = "";
  defaultContextImage: string = "";
  selectedQuantId: string = "";
  quantifiedElements: string[] = [];

  unalignedImages: ScanImage[] = [];
  matchedImages: ScanImage[] = [];
  downlinkedImages: ScanImage[] = [];

  xOffset: string = "";
  yOffset: string = "";
  xScale: string = "";
  yScale: string = "";

  private _loadedImageTransform: ImageMatchTransform | null = null;

  showLog = false;

  private _images: ScanImage[] = [];

  constructor(
    private _dataService: APIDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _imageModelService: DatasetCustomisationService,
    protected _endpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    public dialog: MatDialog
  ) {
    this.mdl = new DatasetCustomisationModel();
    this.drawer = new DatasetCustomisationDrawer(this.mdl);
    this._interaction = new AlignmentInteraction(this.mdl);
  }

  ngOnInit() {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    this._subs.add(
      this._dataService.sendImageGetDefaultRequest(ImageGetDefaultReq.create({ scanIds: [this._analysisLayoutService.defaultScanId] })).subscribe({
        next: (resp: ImageGetDefaultResp) => {
          this.defaultContextImage = "";

          const def = resp.defaultImagesPerScanId[this._analysisLayoutService.defaultScanId];

          if (!def) {
            this._snackService.openWarning(
              "Scan has no default image selected",
              "This is OK, but you can select a default image to show for this scan if there are any"
            );
          } else {
            this.defaultContextImage = def;
          }
        },
      })
    );

    this._subs.add(
      this._dataService
        .sendScanListRequest(
          ScanListReq.create({
            searchFilters: { scanId: scanId },
          })
        )
        .subscribe({
          next: (resp: ScanListResp) => {
            if (!resp.scans || resp.scans.length != 1 || resp.scans[0].id != scanId) {
              this._snackService.openError("Failed to get scan title/description");
              return;
            }

            this.title = resp.scans[0].title;
            this.description = resp.scans[0].description;
          },
          error: err => {
            this._snackService.openError(err);
            this.title = ""; // To clear the spinner
            this.description = "";
          },
        })
    );

    this.refreshImages();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private refreshImages() {
    const scanId = this.getScanId();
    if (!scanId) {
      this._snackService.openError("No scan id supplied");
      return;
    }

    this._dataService.sendImageListRequest(ImageListReq.create({ scanIds: [scanId] })).subscribe({
      next: (resp: ImageListResp) => {
        this._images = resp.images;

        // Sort them into their individual lists
        this.unalignedImages = [];
        this.matchedImages = [];
        this.downlinkedImages = [];

        for (const img of resp.images) {
          if (img.source == ScanImageSource.SI_INSTRUMENT) {
            this.downlinkedImages.push(img);
          } else {
            if (img.matchInfo != null) {
              this.matchedImages.push(img);
            } else {
              this.unalignedImages.push(img);
            }
          }
        }

        if (resp.images.length <= 0) {
          this._snackService.openWarning("Scan has no images", "You can upload images and align them to scan locations on this page");
        }
      },
    });
  }

  private getScanId(): string {
    if (!this._analysisLayoutService.defaultScanId) {
      this._snackService.openError("No scan id supplied");
      return "";
    }

    return this._analysisLayoutService.defaultScanId;
  }

  get scanId(): string {
    return this._analysisLayoutService.defaultScanId;
  }

  // For listing all images in a dropdown (currently for default image picker)
  get images(): ScanImage[] {
    return this._images;
  }

  get selectedImageLabel(): string {
    return this.mdl.overlayImageName ? this.mdl.overlayImageName : "Select one from below!";
  }

  get hasImageSelected(): boolean {
    return this.mdl.overlayImageName.length > 0;
  }

  get alignToImageLabel(): string {
    return this.mdl.imageName ? this.mdl.imageName : "(None)";
  }

  get interactionHandler() {
    return this._interaction;
  }

  get transform() {
    return this.mdl.transform;
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  onSaveTitleDescription() {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    if (!this.title) {
      this._snackService.openError("Cannot set an empty title");
      return;
    }

    this._dataService
      .sendScanMetaWriteRequest(
        ScanMetaWriteReq.create({
          scanId: scanId,
          title: this.title,
          description: this.description,
        })
      )
      .subscribe({
        next: (resp: ScanMetaWriteResp) => {
          this._snackService.openSuccess("Title/description changed");
        },
        error: err => {
          this._snackService.openError(err);
          this.title = ""; // To clear the spinner
        },
      });
  }

  onSaveDefault() {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    if (!this.title) {
      this._snackService.openError("Cannot set an empty title");
      return;
    }

    this._dataService
      .sendScanMetaWriteRequest(
        ScanMetaWriteReq.create({
          scanId: scanId,
          title: this.title,
          description: this.description,
        })
      )
      .subscribe({
        next: (resp: ScanMetaWriteResp) => {
          this._snackService.openSuccess("Default image changed");
        },
        error: err => {
          this._snackService.openError(err);
          this.title = ""; // To clear the spinner
        },
      });
  }

  onChangeDefaultImage(imgName: ContextImageItem): void {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    this._dataService.sendImageSetDefaultRequest(ImageSetDefaultReq.create({ scanId: scanId, defaultImageFileName: imgName.path })).subscribe({
      next: (resp: ImageSetDefaultResp) => {
        //this.defaultContextImage = imgName;
        this._snackService.openSuccess("Default image changed", `Dataset ${scanId} now has default image set to: ${imgName.path}`);
      },
      error: err => {
        this._snackService.openError(err);
      },
    });
  }

  onAddImage(): void {
    const scanId = this.getScanId();
    if (!scanId) {
      this._snackService.openError("No scan id supplied");
      return;
    }

    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    let title = "Add Image";
    let acceptTypes = "image/jpeg,image/png,image/tiff";

    dialogConfig.data = new AddCustomImageParameters(acceptTypes, true, title, scanId);
    const dialogRef = this.dialog.open(AddCustomImageComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: AddCustomImageResult) => {
      if (!result) {
        // Cancelled
        return;
      }

      const nameToSave = result.imageToUpload.name;

      if (nameToSave.toUpperCase().endsWith(".TIF") || nameToSave.toUpperCase().endsWith(".TIFF")) {
        const errs = [];

        // Check that the file name is not too long because of file extension. We expect it to just be TIF not TIFF
        if (!nameToSave.toUpperCase().endsWith(".TIF")) {
          errs.push("Must end in .tif");
        } else {
          // Check that the file name conforms to the iSDS name standard, otherwise import will fail
          const fields = SDSFields.makeFromFileName(result.imageToUpload.name);

          // Expecting it to parse, and expecting:
          // - prodType to be VIS (visualisation image) or MSA (multi-spectral analysis... NOT to be confused with MSA spectrum files)
          // - instrument to be PC (PIXL MCC)
          // - colour filter to be C (special field for 4-channel RGBU TIF images)
          // - sol is non-zero length
          // - rtt is non-zero length
          // - sclk is non-zero length
          // - version is >= 1
          if (!fields) {
            errs.push("invalid length, should be 58 chars (including .tif)");
          } else {
            if (["VIS", "MSA"].indexOf(fields.prodType) < 0) {
              errs.push("Bad prod type: " + fields.prodType);
            }

            if (fields.instrument != "PC") {
              errs.push("Bad instrument: " + fields.instrument);
            }

            if (fields.colourFilter != "C") {
              errs.push("Bad colour filter: " + fields.colourFilter);
            }

            if (fields.getSolNumber() <= 0) {
              errs.push("Bad sol: " + fields.primaryTimestamp);
            }

            if (fields.RTT <= 0) {
              errs.push("Bad RTT: " + fields.seqRTT);
            }

            if (fields.SCLK <= 0) {
              errs.push("Bad SCLK: " + fields.secondaryTimestamp);
            }

            if (fields.version < 1) {
              errs.push("Bad version: " + fields.version);
            }
          }
        }

        if (errs.length > 0) {
          alert(`Invalid file name: "${result.imageToUpload.name}'\nErrors encountered:\n${errs.join("\n")}`);
          return;
        }
      }

      this._snackService.open(`Uploading ${result.imageToUpload.name}...`);

      // Do the actual upload
      result.imageToUpload.arrayBuffer().then((imgBytes: ArrayBuffer) => {
        let beamImageRef: ImageMatchTransform | undefined = undefined;
        if (result.imageToMatch) {
          // Create beam match transform, this can be fine-tuned by user later but at its existance will signify that this
          // is a matched image that _can_ be edited in this way
          beamImageRef = ImageMatchTransform.create({
            beamImageFileName: result.imageToMatch,
            xOffset: 0,
            yOffset: 0,
            xScale: 1,
            yScale: 1,
          });
        }

        this._dataService
          .sendImageUploadRequest(
            ImageUploadReq.create({
              name: result.imageToUpload.name,
              imageData: new Uint8Array(imgBytes),
              associatedScanIds: [scanId],
              originScanId: scanId,
              // oneof
              //locationPerScan
              beamImageRef: beamImageRef,
            })
          )
          .subscribe({
            next: (resp: ImageUploadResp) => {
              this._snackService.openSuccess(`Successfully uploaded ${result.imageToUpload.name}`);
              this.refreshImages();
            },
            error: err => {
              this._snackService.openError(err);
            },
          });
      });
    });
  }

  onDeleteImage(imgType: string, img: ScanImage, event): void {
    event.stopPropagation();

    if (!confirm(`Are you sure you want to delete ${img.name}?`)) {
      return;
    }

    this._dataService.sendImageDeleteRequest(ImageDeleteReq.create({ name: img.name })).subscribe({
      next: (resp: ImageDeleteResp) => {
        this._snackService.openSuccess("Image deleted", "Deleted image: " + img.name);
        this.refreshImages();
      },
      error: err => {
        this._snackService.openError(err);
      },
    });
  }

  onSelectImage(imgType: string, img: ScanImage): void {
    // Show this image
    this.mdl.overlayImageName = img.name;
    this.mdl.overlayImagePath = img.path;

    // If this image has alignent info, get it
    if (img.matchInfo) {
      this.setTransformInputs(img.matchInfo.xOffset, img.matchInfo.yOffset, img.matchInfo.xScale, img.matchInfo.yScale);

      this._loadedImageTransform = img.matchInfo;

      // Also store this in the model
      this.mdl.overlayImageTransform = new ContextImageItemTransform(img.matchInfo.xOffset, img.matchInfo.yOffset, img.matchInfo.xScale, img.matchInfo.yScale);

      this.mdl.imageName = img.matchInfo.beamImageFileName;
      this.reloadModel();
    } else if (this.mdl.imageName) {
      this.clearModel();
    } else if (
      img.associatedScanIds.length > 0 &&
      (this.mdl.drawModel.scanDrawModels.size <= 0 ||
        (this.mdl.drawModel.scanDrawModels.size == 1 && !this.mdl.drawModel.scanDrawModels.get(img.associatedScanIds[0])))
    ) {
      // No model data is present, but image has an associated scan, reload...
      this.mdl.imageName = img.name;
      this.reloadModel();
    }

    this.reloadOverlayImage();
  }

  // The transform is defined counter-intuitively, it defines how to transform the coordinates to align the points with the image
  // while the user is probably thinking how do I scale/offset this image to sit it over the coordinate area. Here we define a get
  // and set function for the UI inputs, any code that touches the UI inputs should go through here. This way we can recalculate
  // the transform however it makes more sense to the user
  private setTransformInputs(xOffset: number, yOffset: number, xScale: number, yScale: number) {
    this.xOffset = (xOffset / xScale).toLocaleString();
    this.yOffset = (yOffset / yScale).toLocaleString();
    this.xScale = (1 / xScale).toLocaleString();
    this.yScale = (1 / yScale).toLocaleString();
  }

  private getTransformInputs(): ContextImageItemTransform {
    const result = new ContextImageItemTransform(parseFloat(this.xOffset), parseFloat(this.yOffset), 1 / parseFloat(this.xScale), 1 / parseFloat(this.yScale));

    // Undo the divide of scale
    result.xOffset *= result.xScale;
    result.yOffset *= result.yScale;

    return result;
  }

  onPreviewMeta() {
    if (!this.mdl.overlayImageTransform) {
      return;
    }

    // We take the values from the input boxes and apply them to the view
    this.mdl.overlayImageTransform = this.getTransformInputs();
    this.reDraw();
  }

  onApplyMeta() {
    // Force a preview so we have latest values saved in drawModel meta
    this.onPreviewMeta();

    if (confirm("Are you sure you want to overwrite scale/offset factors with the values currently visible?")) {
      const xform = this.getTransformInputs();

      this._dataService
        .sendImageSetMatchTransformRequest(
          ImageSetMatchTransformReq.create({
            imageName: this.mdl.overlayImageName,
            transform: {
              beamImageFileName: this.mdl.imageName,
              xOffset: xform.xOffset,
              yOffset: xform.yOffset,
              xScale: xform.xScale,
              yScale: xform.yScale,
            },
          })
        )
        .subscribe({
          next: (resp: ImageSetMatchTransformResp) => {
            this._snackService.openSuccess("Transform saved successfully");
          },
          error: err => {
            this._snackService.openError(err);
          },
        });
    }
  }

  onResetMeta() {
    if (!this._loadedImageTransform) {
      return;
    }

    // Apply this to our view
    this.setTransformInputs(
      this._loadedImageTransform.xOffset,
      this._loadedImageTransform.yOffset,
      this._loadedImageTransform.xScale,
      this._loadedImageTransform.yScale
    );
    this.mdl.overlayImageTransform = this.getTransformInputs();

    this.reloadModel();
  }

  get overlayOpacity(): number {
    return this.mdl.overlayOpacity;
  }

  onChangeOverlayOpacity(val: SliderValue): void {
    this.mdl.overlayOpacity = val.value;
    this.reDraw();
  }

  get overlayBrightness(): number {
    return this.mdl.overlayBrightness;
  }

  onChangeOverlayBrightness(val: SliderValue): void {
    this.mdl.overlayBrightness = val.value;

    if (val.finish) {
      this.reloadOverlayImage();
    }
  }

  onSelectQuantForScan(quantId: string) {
    this.selectedQuantId = quantId;

    // Load this quant summary to get the element list
    this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId, summaryOnly: true })).subscribe((resp: QuantGetResp) => {
      if (resp && resp.summary) {
        this.quantifiedElements = resp.summary.elements;
      }
    });
  }

  get selectedElementMap(): string {
    if (!this.mdl.expressionIds) {
      return "";
    }

    // Just return the element
    return DataExpressionId.getPredefinedQuantExpressionElement(this.mdl.expressionIds[0]);
  }

  set selectedElementMap(x: string) {
    const exprId = DataExpressionId.makePredefinedQuantElementExpression(x, "%");
    this.mdl.expressionIds = [exprId];
  }

  onQuantElementChanged(change: MatSelectChange) {
    const exprId = DataExpressionId.makePredefinedQuantElementExpression(change.value, "%");
    this.mdl.expressionIds = [exprId];

    this.reloadModel();
  }

  onPickDisplayItems() {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    const dialogConfig = new MatDialogConfig();

    const items: PickerDialogItem[] = [];
    items.push(new PickerDialogItem("", "Visible Items", "", true));
    items.push(new PickerDialogItem("Scan Points", "Scan Points", "", true));
    items.push(new PickerDialogItem("Footprint", "Footprint", "", true));

    const shown = [];
    if (this.mdl.hidePointsForScans.length <= 0) {
      shown.push("Scan Points");
    }
    if (this.mdl.hideFootprintsForScans.length <= 0) {
      shown.push("Footprint");
    }

    dialogConfig.data = new PickerDialogData(true, false, false, false, items, shown, "", undefined);

    const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
    dialogRef.componentInstance.onSelectedIdsChanged.subscribe((ids: string[]) => {
      if (ids) {
        // If they are NOT selected, put them in...
        if (ids.indexOf("Footprint") == -1) {
          this.mdl.hideFootprintsForScans = [scanId];
        } else {
          this.mdl.hideFootprintsForScans = [];
        }
        if (ids.indexOf("Scan Points") == -1) {
          this.mdl.hidePointsForScans = [scanId];
        } else {
          this.mdl.hidePointsForScans = [];
        }

        this.reDraw();
      }
    });
  }

  private reloadModel() {
    if (!this.mdl.imageName) {
      this._snackService.openError("No image selected!");
      return;
    }

    this._imageModelService.getModelData(this.mdl.imageName).subscribe({
      next: (data: ContextImageModelLoadedData) => {
        this.mdl.setData(data);

        if (this.selectedQuantId && this.mdl.expressionIds.length > 0) {
          const exprId = this.mdl.expressionIds[0];

          // Loop through, but there should only really be one anyway...
          for (const scanId of this.mdl.scanIds) {
            const scanMdl = this.mdl.getScanModelFor(scanId);
            if (scanMdl) {
              const pts = scanMdl.scanPoints;
              const pmcToIndexLookup = new Map<number, number>();
              for (const pt of pts) {
                pmcToIndexLookup.set(pt.PMC, pt.locationIdx);
              }

              this._imageModelService
                .getLayerModel(scanId, exprId, this.selectedQuantId, PredefinedROIID.getAllPointsForScan(scanId), ColourRamp.SHADE_MAGMA, pmcToIndexLookup)
                .subscribe({
                  next: (layer: ContextImageMapLayer) => {
                    this.mdl.setMapLayer(layer);
                    this.reDraw();
                  },
                  error: err => {
                    this._snackService.openError("Failed to add element map layer: " + exprId + " for scan: " + scanId, err);
                  },
                });
            }

            // Expecting only one item!
            break;
          }
        } else {
          this.reDraw();
        }
      },
    });
  }

  private clearModel() {
    this.mdl.imageName = "";
    this.mdl.setData(new ContextImageModelLoadedData(null, null, new Map<string, ContextImageScanModel>(), null));
    this.reDraw();
  }

  private reloadOverlayImage() {
    if (!this.mdl.overlayImagePath) {
      this.mdl.overlayImage = null;
    } else {
      // OLD CODE had this... what do we do about it (for loading RGBU overlay images)
      /*
      // Load the display image, it can be one of:
      // * RGB (png or jpg format)
      // * RGBU (tif format)
      let img$: Observable<HTMLImageElement> = null;
      if(info.downloadLink.toUpperCase().endsWith(".TIF") || info.downloadLink.toUpperCase().endsWith(".TIF?LOADCUSTOMTYPE=MATCHED"))
      {
          img$ = this.loadRGBUImageToRGBDisplay(info.downloadLink, imgName);
      }

      */

      this._endpointsService.loadImageForPath(this.mdl.overlayImagePath).subscribe((img: HTMLImageElement) => {
        this.mdl.overlayImage = this.processOverlayImage(img);

        this.reDraw();
      });
    }
  }

  private processOverlayImage(src: HTMLImageElement): HTMLImageElement {
    // Apply brightness to the image and return it
    if (this.mdl.overlayBrightness == 1) {
      return src; // no change needed
    }

    //overlayBrightness
    return src;
  }
}
