import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { ContextImageItemTransform, ContextImageModelLoadedData, ContextImageScanModel } from "src/app/modules/image-viewers/image-viewers.module";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { APIDataService, PickerDialogComponent, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { ImageMatchTransform, ScanImage, ScanImageSource } from "src/app/generated-protos/image";
import { Observable, of, Subscription, throwError } from "rxjs";
import {
  ImageListReq,
  ImageListResp,
  ImageSetDefaultReq,
  ImageSetDefaultResp,
  ImageGetDefaultReq,
  ImageGetDefaultResp,
  ImageSetMatchTransformReq,
  ImageSetMatchTransformResp,
  ImageUploadHttpRequest,
} from "src/app/generated-protos/image-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ScanGetReq, ScanTriggerJobReq } from "src/app/generated-protos/scan-msgs";
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
import { SDSFields, getPathBase, isValidNumber, makeValidFloatString } from "src/app/utils/utils";
import { AddCustomImageParameters, AddCustomImageComponent, AddCustomImageResult } from "../../components/add-custom-image/add-custom-image.component";
import { PickerDialogItem, PickerDialogData } from "src/app/modules/pixlisecore/components/atoms/picker-dialog/picker-dialog.component";
import { ImageSelection } from "src/app/modules/image-viewers/components/context-image-picker/context-image-picker.component";
import { ScanItem } from "../../../../generated-protos/scan";
import { ObjectType } from "../../../../generated-protos/ownership-access";
import { rgbBytesToImage } from "src/app/utils/drawing";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { ElementRef, ViewChild } from "@angular/core";
@Component({
  selector: "app-dataset-customisation-page",
  templateUrl: "./dataset-customisation-page.component.html",
  styleUrls: ["./dataset-customisation-page.component.scss"],
})
export class DatasetCustomisationPageComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  @ViewChild("displayOptionsButton") displayOptionsButton!: ElementRef;

  mdl: DatasetCustomisationModel;
  drawer: CanvasDrawer;
  private _interaction: AlignmentInteraction;

  cursorShown: string = CursorId.panCursor;

  scanItemType: ObjectType = ObjectType.OT_SCAN;
  scanItem: ScanItem = ScanItem.create();

  defaultContextImage: string = "";
  selectedQuantId: string = "";
  quantifiedElements: string[] = [];

  unalignedImages: ScanImage[] = [];
  matchedImages: ScanImage[] = [];
  downlinkedImages: ScanImage[] = [];

  private _scanId: string = "";

  selectedImage: ScanImage | null = null;

  xOffset: string = "";
  yOffset: string = "";
  xScale: string = "";
  yScale: string = "";

  private _loadedImageTransform: ImageMatchTransform | null = null;

  private readonly waitGetDefaultImage = "Load Default Image";
  private readonly waitSaveDefaultImage = "Save Default Image";
  private readonly waitScan = "Load Scan";
  private readonly waitGetImageList = "List Images";
  private readonly waitGetMatchedImage = "Load Matched Image";
  private readonly waitGetUploadedImage = "Load Selected Image";
  private readonly waitSaveAlignment = "Save Alignment";
  private readonly waitGetAlignment = "Load Alignment";
  private readonly waitDeleteImage = "Delete Image";
  private readonly waitUploadImage = "Uploading Image";
  private readonly waitGetQuant = "Load Quantification";
  private readonly waitMakeMap = "Element Map";

  waitItems: Map<string, boolean> = new Map<string, boolean>([
    [this.waitGetDefaultImage, false],
    [this.waitSaveDefaultImage, false],
    [this.waitScan, false],
    [this.waitGetImageList, false],
    [this.waitGetMatchedImage, false],
    [this.waitGetUploadedImage, false],
    [this.waitSaveAlignment, false],
    [this.waitGetAlignment, false],
    [this.waitDeleteImage, false],
    [this.waitUploadImage, false],
    [this.waitGetQuant, false],
    [this.waitMakeMap, false],
  ]);
  hasWaitItems: boolean = false;
  waitItemsDisplay: string = "";

  // Just temporarily remember images that were deleted, so
  // if we re-request them we include "salt" in their URL to
  // bypass cache, otherwise we keep loading the same image!
  private _deletedImages = new Set<string>();

  private _images: ScanImage[] = [];

  jobs = ["AutoQuant"];

  constructor(
    private _dataService: APIDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _imageModelService: DatasetCustomisationService,
    protected _endpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    //private _userOptionsService: UserOptionsService,
    private _localStorageService: LocalStorageService,
    public dialog: MatDialog
  ) {
    this.mdl = new DatasetCustomisationModel();
    this.drawer = new DatasetCustomisationDrawer(this.mdl);
    this._interaction = new AlignmentInteraction(this.mdl);
  }

  ngOnInit() {
    this._scanId = this.getScanId();
    if (!this.scanId) {
      return;
    }

    this.setWait(this.waitGetDefaultImage, true);
    this._subs.add(
      this._dataService.sendImageGetDefaultRequest(ImageGetDefaultReq.create({ scanIds: [this.scanId] })).subscribe({
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
          this.setWait(this.waitGetDefaultImage, false);
        },
        error: err => {
          console.error(`Failed to get default image: ${err}`);
          this.setWait(this.waitGetDefaultImage, false);
        },
      })
    );

    this.setWait(this.waitScan, true);
    this._subs.add(
      this._dataService.sendScanGetRequest(ScanGetReq.create({ id: this.scanId })).subscribe({
        next: resp => {
          const scanItem = resp?.scan;
          if (scanItem) {
            this.scanItem = scanItem;
          }
          this.setWait(this.waitScan, false);
        },
        error: err => {
          this._snackService.openError(err);
          this.setWait(this.waitScan, false);
        },
      })
    );

    this._subs.add(
      this.mdl.transform.transformChangeComplete$.subscribe((complete: boolean) => {
        this.reDraw();
      })
    );

    this.refreshImages();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }

  setWait(name: string, isWait: boolean) {
    this.waitItems.set(name, isWait);

    let hasWaitItems = false;
    for (const i of this.waitItems.values()) {
      if (i) {
        hasWaitItems = true;
        break;
      }
    }

    this.hasWaitItems = hasWaitItems;

    const items: string[] = [];
    for (const [k, v] of this.waitItems.entries()) {
      if (v) {
        items.push(k);
      }
    }

    this.waitItemsDisplay = items.join(", ");
  }

  private refreshImages() {
    const scanId = this.getScanId();
    if (!scanId) {
      this._snackService.openError("No scan id supplied");
      return;
    }

    this.setWait(this.waitGetImageList, true);
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
        this.setWait(this.waitGetImageList, false);
      },
      error: err => {
        console.error(`Failed to list iamges: ${err}`);
        this.setWait(this.waitGetImageList, false);
      },
    });
  }

  private getScanId(): string {
    if (this.scanId) {
      return this.scanId;
    }

    if (!this._analysisLayoutService.defaultScanId) {
      this._snackService.openError("No scan id supplied");
      return "";
    }

    return this._analysisLayoutService.defaultScanId;
  }

  get scanId(): string {
    return this._scanId || this._analysisLayoutService.defaultScanId;
  }

  // For listing all images in a dropdown (currently for default image picker)
  get images(): ScanImage[] {
    return this._images;
  }

  get selectedImageLabelDisp(): string {
    return this.mdl.overlayImagePath ? getPathBase(this.mdl.overlayImagePath) : "Select one from list!";
  }

  get selectedImageLabelFull(): string {
    return this.mdl.overlayImagePath ? this.mdl.overlayImagePath : "Select one from list!";
  }

  get hasImageSelected(): boolean {
    return this.mdl.overlayImagePath.length > 0;
  }

  get alignToImageLabelDisp(): string {
    return this.mdl.imageName ? getPathBase(this.mdl.imageName) : "(None)";
  }

  get alignToImageLabelFull(): string {
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

  onChangeDefaultImage(selection: ImageSelection): void {
    if (selection.scanId) {
      this._scanId = selection.scanId;
    }

    if (!this.scanId) {
      return;
    }

    this.setWait(this.waitSaveDefaultImage, true);
    this._dataService.sendImageSetDefaultRequest(ImageSetDefaultReq.create({ scanId: this.scanId, defaultImageFileName: selection.path })).subscribe({
      next: (resp: ImageSetDefaultResp) => {
        //this.defaultContextImage = imgName;
        this._snackService.openSuccess("Default image changed", `Dataset ${this.scanId} now has default image set to: ${selection.path}`);
        this.setWait(this.waitSaveDefaultImage, false);
      },
      error: err => {
        this._snackService.openError(err);
        this.setWait(this.waitSaveDefaultImage, false);
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

    const title = "Add Image";
    const acceptTypes = "image/jpeg,image/png,image/tiff";

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
      this.setWait(this.waitUploadImage, true);

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

        this._endpointsService
          .uploadImage(
            ImageUploadHttpRequest.create({
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
            next: () => {
              this._snackService.openSuccess(`Successfully uploaded ${result.imageToUpload.name}`);
              this.refreshImages();
              this.setWait(this.waitUploadImage, false);
            },
            error: err => {
              this._snackService.openError(err);
              this.setWait(this.waitUploadImage, false);
            },
          });
      });
    });
  }

  onDeleteImage(imgType: string, img: ScanImage): void {
    this.setWait(this.waitDeleteImage, true);
    this._dataService.sendImageDeleteRequest(ImageDeleteReq.create({ name: img.imagePath })).subscribe({
      next: (resp: ImageDeleteResp) => {
        this._snackService.openSuccess("Image deleted", "Deleted image: " + img.imagePath);
        this._deletedImages.add(img.imagePath);

        // Delete from cache too!
        const imageUrl = APIEndpointsService.getImageURL(img.imagePath);
        this._localStorageService.deleteImage(imageUrl).then(() => {
          let changed = false;
          if (this.mdl.imageName == img.imagePath) {
            this.mdl.imageName = "";
            changed = true;
          }
          if (this.mdl.overlayImagePath == img.imagePath) {
            this.mdl.overlayImagePath = "";
            changed = true;
          }

          if (changed) {
            this.reloadModel();
          }
          this.refreshImages();
        });
        this.setWait(this.waitDeleteImage, false);
      },
      error: err => {
        this._snackService.openError(`Error deleting ${imgType} image: ${img?.imagePath}`, err);
        this.setWait(this.waitDeleteImage, false);
      },
    });
  }

  get canTransformImage(): boolean {
    return !!this.selectedImage && !!this.selectedImage.matchInfo;
  }

  onSelectImage(imgType: string, img: ScanImage): void {
    // Show this image
    this.mdl.overlayImagePath = img.imagePath;
    this.selectedImage = img;

    // If this image has alignment info, get it
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
      this.mdl.imageName = img.imagePath;
      this.reloadModel();
    }

    this.reloadOverlayImage();
  }

  // The transform is defined counter-intuitively, it defines how to transform the coordinates to align the points with the image
  // while the user is probably thinking how do I scale/offset this image to sit it over the coordinate area. Here we define a get
  // and set function for the UI inputs, any code that touches the UI inputs should go through here. This way we can recalculate
  // the transform however it makes more sense to the user
  private setTransformInputs(xOffset: number, yOffset: number, xScale: number, yScale: number) {
    if (!isValidNumber(xOffset, true)) {
      xOffset = 0;
    }
    if (!isValidNumber(yOffset, true)) {
      yOffset = 0;
    }
    if (!isValidNumber(xScale, false)) {
      xScale = 1;
    }
    if (!isValidNumber(yScale, false)) {
      yScale = 1;
    }

    this.xOffset = (xOffset / xScale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
    this.yOffset = (yOffset / yScale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
    this.xScale = (1 / xScale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
    this.yScale = (1 / yScale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  }

  private getTransformInputs(): ContextImageItemTransform {
    // Trying to account for cases where user enters 0,2 instead of 0.2
    let calcOffsetX = parseFloat(makeValidFloatString(this.xOffset));
    let calcOffsetY = parseFloat(makeValidFloatString(this.yOffset));
    let calcScaleX = parseFloat(makeValidFloatString(this.xScale));
    let calcScaleY = parseFloat(makeValidFloatString(this.yScale));

    if (!isValidNumber(calcOffsetX, true)) {
      calcOffsetX = 0;
    }
    if (!isValidNumber(calcOffsetY, true)) {
      calcOffsetY = 0;
    }
    if (!isValidNumber(calcScaleX, false)) {
      calcScaleX = 1;
    }
    if (!isValidNumber(calcScaleY, false)) {
      calcScaleY = 1;
    }

    const result = new ContextImageItemTransform(calcOffsetX, calcOffsetY, 1 / calcScaleX, 1 / calcScaleY);

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

      this.setWait(this.waitGetAlignment, true);
      this._dataService
        .sendImageSetMatchTransformRequest(
          ImageSetMatchTransformReq.create({
            imageName: this.mdl.overlayImagePath,
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
            this._snackService.openSuccess("Alignment saved successfully");
            this.setWait(this.waitGetAlignment, false);
          },
          error: err => {
            this._snackService.openError(err);
            this.setWait(this.waitGetAlignment, false);
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
    this.mdl.overlayOpacity = Math.floor(val.value * 100) / 100;
    this.reDraw();
  }

  get overlayBrightness(): number {
    return this.mdl.overlayBrightness;
  }

  onChangeOverlayBrightness(val: SliderValue): void {
    this.mdl.overlayBrightness = Math.floor(val.value * 100) / 100;

    if (val.finish) {
      this.reloadOverlayImage();
    }
  }

  onSelectQuantForScan(quantId: string) {
    this.selectedQuantId = quantId;

    // Load this quant summary to get the element list
    this.setWait(this.waitGetQuant, true);
    this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId, summaryOnly: true })).subscribe({
      next: (resp: QuantGetResp) => {
        if (resp && resp.summary) {
          this.quantifiedElements = resp.summary.elements;
        }
        this.setWait(this.waitGetQuant, false);
      },
      error: err => {
        console.error(`Failed to get quant: ${err}`);
        this.setWait(this.waitGetQuant, false);
      },
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
    this.setWait(this.waitMakeMap, true);
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
    if (this.mdl.hidePointsForScans.size <= 0) {
      shown.push("Scan Points");
    }
    if (this.mdl.hideFootprintsForScans.size <= 0) {
      shown.push("Footprint");
    }

    dialogConfig.data = new PickerDialogData(true, false, false, false, items, shown, "", this.displayOptionsButton);

    const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
    dialogRef.componentInstance.onSelectedIdsChanged.subscribe((ids: string[]) => {
      if (ids) {
        // If they are NOT selected, put them in...
        if (ids.indexOf("Footprint") === -1) {
          this.mdl.hideFootprintsForScans = new Set<string>([this.scanId]);
        } else {
          this.mdl.hideFootprintsForScans.clear();
        }
        if (ids.indexOf("Scan Points") === -1) {
          this.mdl.hidePointsForScans = new Set<string>([this.scanId]);
        } else {
          this.mdl.hidePointsForScans.clear();
        }

        this.reDraw();
      }
    });
  }

  onRunJob(name: string) {
    this._dataService.sendScanTriggerJobRequest(ScanTriggerJobReq.create({ scanId: this._scanId, jobId: name })).subscribe(() => {
      alert("Job: " + name + " started...");
    });
  }

  private reloadModel() {
    if (!this.mdl.imageName) {
      this._snackService.openError("No image selected!");
      return;
    }

    this.setWait(this.waitGetMatchedImage, true);
    this._imageModelService.getModelData(this.mdl.imageName, this.mdl.beamLocationVersionsRequested, "customization-page").subscribe({
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
                    this._snackService.openError(err);
                  },
                });
            }

            // Expecting only one item!
            break;
          }
        } else {
          this.reDraw();
        }

        this.setWait(this.waitMakeMap, false);
        this.setWait(this.waitGetMatchedImage, false);
      },
      error: err => {
        console.error(`Failed to generate context image model: ${err}`);
        this.setWait(this.waitGetMatchedImage, false);
      },
    });
  }

  private clearModel() {
    this.mdl.imageName = "";
    this.mdl.setData(new ContextImageModelLoadedData(null, null, new Map<string, ContextImageScanModel>(), null));
    this.xOffset = "";
    this.yOffset = "";
    this.xScale = "";
    this.yScale = "";
    this.reDraw();
  }

  private loadImage(imgPath: string): Observable<HTMLImageElement> {
    if (!imgPath) {
      return throwError(() => {
        return new Error("no image name specified when loading image on dataset edit page");
      });
    }

    const pathLower = imgPath.toLowerCase().trim().split("?")[0];

    if (this._deletedImages.has(imgPath)) {
      // This was recently deleted, to ensure we don't read from disk cache, add "salt". This is
      // to prevent a user re-uploading a new copy of an image (with the same name) from being stuck
      // seeing their previous copy. NOTE, this doesn't persist beyond page reloads, but by then maybe
      // local cache won't be preventing it from loading?
      imgPath += "?nocache=" + Date.now();
    }

    if (pathLower && pathLower.endsWith(".tif")) {
      return this._endpointsService.loadRGBTIFFDisplayImage(imgPath);
    }
    return this._endpointsService.loadImageForPath(imgPath);
  }

  private reloadOverlayImage() {
    this.mdl.overlayImage = null;
    if (this.mdl.overlayImagePath) {
      this.setWait(this.waitGetUploadedImage, true);
      const obs$: Observable<HTMLImageElement> = this.loadImage(this.mdl?.overlayImagePath || "");
      obs$.subscribe({
        next: img => {
          // NOTE: we don't apply brightness here - should we?
          this.processOverlayImage(img).subscribe(img => {
            this.mdl.overlayImage = img;
            this.reDraw();
          });
        },
        error: () => {
          this.setWait(this.waitGetUploadedImage, false);
        },
      });
    }
  }

  private processOverlayImage(src: HTMLImageElement): Observable<HTMLImageElement> {
    // Apply brightness to the image and return it
    if (this.mdl.overlayBrightness == 1) {
      this.setWait(this.waitGetUploadedImage, false);
      return of(src); // no change needed
    }

    return new Observable<HTMLImageElement>(observer => {
      //overlayBrightness
      const canvas = new OffscreenCanvas(src.width, src.height);
      const offscreenContext = canvas.getContext("2d");

      if (!offscreenContext) {
        const errStr = "Failed to get off-screen canvas, image uploader preview brightness setting not applied";
        console.error(errStr);
        observer.error(errStr);
        this.setWait(this.waitGetUploadedImage, false);
        return;
      }

      const process = () => {
        offscreenContext.drawImage(src, 0, 0);
        const imgData = offscreenContext.getImageData(0, 0, src.width, src.height);
        const imgBytes = new Uint8Array(imgData.width * imgData.height * 3);
        let w = 0;
        for (let c = 0; c < imgData.data.length; c += 4) {
          imgBytes[w] = Math.min(imgData.data[c] * this.mdl.overlayBrightness, 255); // R
          imgBytes[w + 1] = Math.min(imgData.data[c + 1] * this.mdl.overlayBrightness, 255); // G
          imgBytes[w + 2] = Math.min(imgData.data[c + 2] * this.mdl.overlayBrightness, 255); // B
          w += 3;
        }

        const img$ = rgbBytesToImage(imgBytes, imgData.width, imgData.height);
        img$.subscribe({
          next: (img: HTMLImageElement) => {
            observer.next(img);
            observer.complete();
            this.setWait(this.waitGetUploadedImage, false);
          },
          error: err => {
            console.error(err);
            observer.error(err);
            this.setWait(this.waitGetUploadedImage, false);
          },
        });
      };

      if (src.complete) {
        process();
      } else {
        src.onload = process;

        src.onerror = () => {
          const errStr = "Failed process overlay image!";
          console.error(errStr);
          observer.error(errStr);
          this.setWait(this.waitGetUploadedImage, false);
        };
      }
    });
  }

  justName(name: string): string {
    return getPathBase(name);
  }
}
