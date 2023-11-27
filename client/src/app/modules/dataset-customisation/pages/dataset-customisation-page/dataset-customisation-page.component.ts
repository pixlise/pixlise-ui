import { Component, OnDestroy, OnInit } from "@angular/core";
import { ContextImageItem, ContextImageModelLoadedData, ContextImageScanModel } from "src/app/modules/image-viewers/image-viewers.module";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MatDialog } from "@angular/material/dialog";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { ImageMatchTransform, ScanImage, ScanImageSource } from "src/app/generated-protos/image";
import { Subscription } from "rxjs";
import { ImageListReq, ImageListResp, ImageSetDefaultReq, ImageSetDefaultResp, ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
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
import { DefaultDetectorId } from "src/app/expression-language/predefined-expressions";

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
        },
      })
    );

    this._subs.add(
      this._dataService
        .sendScanListRequest(
          ScanListReq.create({
            searchFilters: { RTT: scanId },
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
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
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
    return this.mdl.overlayImagePath ? this.mdl.overlayImagePath : "Select one from below!";
  }

  get alignToImageLabel(): string {
    return this.mdl.imageName ? this.mdl.imageName : "(none)";
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
        next: (resp: ScanMetaWriteResp) => {},
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
          this._snackService.openSuccess("Title/description changed");
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
  /*
  onChangeAlignToImage(imgName: ContextImageItem): void {
    const scanId = this.getScanId();
    if (!scanId) {
      return;
    }

    this.mdl.imageName = imgName.path;
    this.reloadModel();
  }
*/
  onAddImage(imgType: string): void {}

  onDeleteImage(imgType: string, img: ScanImage, event): void {
    this._dataService.sendImageDeleteRequest(ImageDeleteReq.create({ name: img.name })).subscribe({
      next: (resp: ImageDeleteResp) => {
        this._snackService.openSuccess("Image deleted", "Deleted image: " + img.name);
      },
      error: err => {
        this._snackService.openError(err);
      },
    });
  }

  onSelectImage(imgType: string, img: ScanImage): void {
    // Show this image
    this.mdl.overlayImagePath = img.path;

    // If this image has alignent info, get it
    if (img.matchInfo) {
      this.xOffset = img.matchInfo.xOffset.toLocaleString();
      this.yOffset = img.matchInfo.yOffset.toLocaleString();
      this.xScale = img.matchInfo.xScale.toLocaleString();
      this.yScale = img.matchInfo.yScale.toLocaleString();

      this._loadedImageTransform = img.matchInfo;

      this.mdl.imageName = img.matchInfo.beamImageFileName;
      this.reloadModel();
    } else if (this.mdl.imageName) {
      this.clearModel();
    }

    this.reloadOverlayImage();
  }

  onPreviewMeta() {
    if (!this.mdl.overlayImageTransform) {
      return;
    }

    // We take the values from the input boxes and apply them to the view
    this.mdl.overlayImageTransform.xOffset = parseFloat(this.xOffset);
    this.mdl.overlayImageTransform.yOffset = parseFloat(this.yOffset);
    this.mdl.overlayImageTransform.xScale = parseFloat(this.xScale);
    this.mdl.overlayImageTransform.yScale = parseFloat(this.yScale);

    this.reDraw();
  }

  onApplyMeta() {
    // Force a preview so we have latest values saved in drawModel meta
    this.onPreviewMeta();

    if (confirm("Are you sure you want to overwrite scale/offset factors with the values currently visible?")) {
      // Save to API
      /*this._datasetService.editCustomImageMeta(this.datasetID, imgTypeMatched, this._drawModel.displayImageName, this._drawModel.meta).subscribe(
        () => {
          alert("Image scale and offset saved. Don't forget to click SAVE to regenerate the dataset.");
        },
        err => {
          alert(httpErrorToString(err, "Failed to save image scale and offset"));
        }
      );*/
    }
  }

  onResetMeta() {
    if (!this._loadedImageTransform) {
      return;
    }

    // Apply this to our view
    this.xOffset = this._loadedImageTransform.xOffset.toLocaleString();
    this.yOffset = this._loadedImageTransform.yOffset.toLocaleString();
    this.xScale = this._loadedImageTransform.xScale.toLocaleString();
    this.yScale = this._loadedImageTransform.yScale.toLocaleString();

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
