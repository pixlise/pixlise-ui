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

import { Component, ElementRef, EventEmitter, Inject, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  EXPORT_PREVIEW_ID_PREFIX,
  UpdateCountsFn,
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportOption,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { MatSelectChange } from "@angular/material/select";
import { ROIItemSummary } from "../../../../generated-protos/roi";
import { DataExpression } from "../../../../generated-protos/expressions";
import { AnalysisLayoutService, SnackbarService, WidgetKeyItem } from "../../../pixlisecore/pixlisecore.module";
import { makeValidFileName } from "src/app/utils/utils";
import { WidgetLayoutConfiguration } from "../../../../generated-protos/screen-configuration";
import { WidgetComponent } from "../widget/widget.component";
import html2canvas from "html2canvas";

@Component({
  standalone: false,
  selector: "widget-export-dialog",
  templateUrl: "./widget-export-dialog.component.html",
  styleUrls: ["./widget-export-dialog.component.scss"],
})
export class WidgetExportDialogComponent implements OnInit, OnChanges {
  title: string = "Export Data";
  zipFileName: string = "";

  @ViewChild("previewWidgetContainer") previewWidgetContainer?: ElementRef;
  @ViewChild("previewWidget") previewWidget?: ElementRef;
  @ViewChild("widgetKeyDisplay") widgetKeyDisplay?: ElementRef;

  @Output() requestExportData: EventEmitter<WidgetExportRequest> = new EventEmitter<WidgetExportRequest>();

  @Output() liveOptionChanges: EventEmitter<{
    options: WidgetExportOption[];
    dataProducts: WidgetExportOption[];
    chartOptions: WidgetExportOption[];
    keyOptions: WidgetExportOption[];
    exportMode?: boolean;
  }> = new EventEmitter<{
    options: WidgetExportOption[];
    dataProducts: WidgetExportOption[];
    chartOptions: WidgetExportOption[];
    keyOptions: WidgetExportOption[];
    exportMode?: boolean;
  }>();

  public liveOptionChanges$ = this.liveOptionChanges.asObservable();

  loading: boolean = false;
  errorMessage: string = "";

  // Initial state to restore from
  initialOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.options);
  initialDataProducts: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.dataProducts || []);
  initialChartOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.chartOptions || []);
  initialKeyOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.keyOptions || []);

  options: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.options);
  dataProducts: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.dataProducts || []);
  chartOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.chartOptions || []);
  keyOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data?.keyOptions || []);

  keyItems: WidgetKeyItem[] = [];
  widgetKeyBackgroundColor: string = "";
  widgetKeyFontSize: number = 14;
  private _selectedDataProductsCount: number = 0;

  chartView: boolean = true;
  previewWidgetConfiguration: WidgetLayoutConfiguration | null = null;
  previewWidgetId: string | null = null;
  previewWidgetWidth: number = 500;
  previewWidgetHeight: number = 500;

  showPreview: boolean = false;
  hideProgressLabels: boolean = false;

  allDataProductsSelected: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: WidgetExportDialogData,
    public dialogRef: MatDialogRef<WidgetExportDialogComponent> | null,
    private _snackBarService: SnackbarService,
    private analysisLayoutService: AnalysisLayoutService
  ) {
    if (data.title) {
      this.title = data.title;
    }
    if (data.options) {
      this.options = data.options;
    }
    if (data.dataProducts) {
      this.dataProducts = data.dataProducts;
    }

    this.showPreview = !!data.showPreview;
    this.hideProgressLabels = !!data.hideProgressLabels;
  }

  copyWidgetExportOptionsDefaultState(exportOptions: WidgetExportOption[]): WidgetExportOption[] {
    return exportOptions.map(option => {
      return JSON.parse(JSON.stringify(option)) as WidgetExportOption;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["data"] || changes["dataProducts"] || changes["options"]) {
      this.mapAllCounts();
    }
  }

  ngOnInit(): void {
    this.mapAllCounts();

    if (this.data.widgetId && !this.previewWidgetConfiguration) {
      this.previewWidgetId = this.data.widgetId;
      this.analysisLayoutService.activeScreenConfiguration$.value.layouts.forEach(layout => {
        layout.widgets.forEach(widget => {
          if (widget.id === this.previewWidgetId) {
            const clonedWidget = JSON.parse(JSON.stringify(widget)) as WidgetLayoutConfiguration;
            clonedWidget.id = EXPORT_PREVIEW_ID_PREFIX + clonedWidget.id;
            this.previewWidgetConfiguration = clonedWidget;
          }
        });
      });
    }
  }

  trackByFn(index: number, item: WidgetExportOption): string {
    return item.id;
  }

  updateDataProductsCount(): void {
    this._selectedDataProductsCount = Math.ceil(this.dataProducts.filter(option => option.selected).reduce((a, b) => a + (b?.count ?? 1), 0));
    this.updateAllDataProductsSelected();

    if (this.showPreview) {
      // Update the preview widget size based on the selected aspect ratio
      const aspectRatio = this.options.find(option => option.id === "aspectRatio");
      if (aspectRatio) {
        if (aspectRatio.selectedOption === "square") {
          this.previewWidgetWidth = 500;
          this.previewWidgetHeight = 500;
        } else if (aspectRatio.selectedOption === "4:3") {
          this.previewWidgetHeight = 500;
          this.previewWidgetWidth = 666.67;
        } else if (aspectRatio.selectedOption === "16:9") {
          this.previewWidgetWidth = 700;
          this.previewWidgetHeight = 393.75;
        }
      }

      const widgetKeyBackgroundColor = this.keyOptions.find(option => option.id === "widgetKeyBackgroundColor")?.selectedOption;
      this.widgetKeyBackgroundColor = widgetKeyBackgroundColor ?? "";

      const widgetKeyFontSize = this.keyOptions.find(option => option.id === "widgetKeyFontSize")?.value;
      this.widgetKeyFontSize = Number(widgetKeyFontSize) ?? 14;

      this.liveOptionChanges.emit({
        options: this.options,
        dataProducts: this.dataProducts,
        chartOptions: this.chartOptions,
        keyOptions: this.keyOptions,
        exportMode: true,
      });
    }
  }

  get selectedDataProductsCount(): number {
    return this._selectedDataProductsCount;
  }

  onCancel(): void {
    this.errorMessage = "";
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onClear(): void {
    this.errorMessage = "";
    const initialOptions = this.copyWidgetExportOptionsDefaultState(this.initialOptions);
    const initialDataProducts = this.copyWidgetExportOptionsDefaultState(this.initialDataProducts);

    // We don't want to clear the updateCounts associated with options and dataProducts, so copy everything else
    this.options = this.options.map((option, index) => ({ ...initialOptions[index], updateCounts: option.updateCounts }));
    this.chartOptions = this.chartOptions.map((option, index) => ({ ...this.initialChartOptions[index], updateCounts: option.updateCounts }));
    this.keyOptions = this.keyOptions.map((option, index) => ({ ...this.initialKeyOptions[index], updateCounts: option.updateCounts }));
    this.dataProducts = this.dataProducts.map((option, index) => ({ ...initialDataProducts[index], updateCounts: option.updateCounts }));

    this.mapAllCounts();
  }

  mapAllCounts(): void {
    this.options.forEach(option => {
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.dataProducts.forEach(option => {
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.chartOptions.forEach(option => {
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.keyOptions.forEach(option => {
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.updateDataProductsCount();
  }

  mapAllDataProductCounts(): void {
    this.dataProducts.forEach(option => {
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.updateDataProductsCount();
  }

  mapNewDataProductCounts(updateCounts: UpdateCountsFn, selected: boolean): void {
    if (!updateCounts) {
      return;
    }

    const selection = this.formWidgetExportRequest();
    const countMap = updateCounts(selection, selected);

    Object.entries(countMap).forEach(([key, newCount]) => {
      const product = this.dataProducts.find(product => product.id === key);
      if (product) {
        product.count = newCount;
      }
    });
  }

  updateAllDataProductsSelected(): void {
    let isSomeDataProductSelected = false;
    this.allDataProductsSelected = this.dataProducts.every(option => {
      if (option.selected) {
        isSomeDataProductSelected = true;
      }

      return option.selected || option.disabled || option.count === 0;
    });

    if (!isSomeDataProductSelected) {
      this.allDataProductsSelected = false;
    }
  }

  toggleAllDataProducts(): void {
    this.errorMessage = "";

    this.allDataProductsSelected = !this.allDataProductsSelected;
    this.dataProducts.forEach(option => {
      if (option.disabled || option.count === 0) {
        return;
      }

      option.selected = this.allDataProductsSelected;
      if (option.updateCounts) {
        this.mapNewDataProductCounts(option.updateCounts, option.selected);
      }
    });

    this.updateDataProductsCount();
  }

  toggleOption(option: WidgetExportOption): void {
    this.errorMessage = "";

    option.selected = !option.selected;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectColor({ option, event }: { option: WidgetExportOption; event: string }): void {
    this.errorMessage = "";

    option.colorPickerValue = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectOption({ option, event }: { option: WidgetExportOption; event: string }): void {
    this.errorMessage = "";

    option.selectedOption = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectDropdownOption({ option, event }: { option: WidgetExportOption; event: MatSelectChange }): void {
    this.errorMessage = "";

    option.selectedOption = event.value;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectROIsOption({ option, event }: { option: WidgetExportOption; event: ROIItemSummary[] }): void {
    this.errorMessage = "";

    option.selectedRegions = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectExpressionsOption({ option, event }: { option: WidgetExportOption; event: DataExpression[] }): void {
    this.errorMessage = "";

    option.selectedExpressions = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectImagesOption({ option, event }: { option: WidgetExportOption; event: string[] }, isDataProduct: boolean = false): void {
    this.errorMessage = "";

    option.selectedImagePaths = event;
    option.selected = event.length > 0;

    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    } else if (isDataProduct) {
      this.mapNewDataProductCounts(() => ({ [option.id]: event.length }), option.selected);
    }

    this.updateDataProductsCount();
  }

  updateValue({ option, event }: { option: WidgetExportOption; event: number | string }): void {
    this.errorMessage = "";

    option.value = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  formWidgetExportRequest(): WidgetExportRequest {
    const options: Record<string, WidgetExportOption> = {};
    this.options.forEach(option => {
      options[option.id] = option;
    });

    const dataProducts: Record<string, WidgetExportOption> = {};
    this.dataProducts.forEach(option => {
      dataProducts[option.id] = option;
    });

    return { options, dataProducts };
  }

  onConfirm(): void {
    this.loading = true;
    this.errorMessage = "";

    const exportRequest = this.formWidgetExportRequest();
    this.requestExportData.emit(exportRequest);
  }

  private addFilesToZip(zip: JSZip, folderName: string, files: WidgetExportFile[] | undefined, extension: string, base64: boolean = false): void {
    if (files && files.length > 0) {
      const baseFolder = zip.folder(folderName);
      if (baseFolder) {
        files.forEach(item => {
          if (item?.fileName && item?.data) {
            const itemFolder: JSZip = item?.subFolder ? baseFolder.folder(item.subFolder) ?? baseFolder : baseFolder;

            // Fix any weirdness in the file name, for example if it contained an ROI with a / or other odd character in it
            const fileName = makeValidFileName(item.fileName.replace(extension, "") + extension);
            if (item?.fileName && item?.data) {
              itemFolder.file(fileName, item.data, { base64 });
            }
          }
        });
      }
    }
  }

  private async getKeyCanvas(): Promise<HTMLCanvasElement | null> {
    if (!this.widgetKeyDisplay) {
      return null;
    }

    return html2canvas(this.widgetKeyDisplay.nativeElement as HTMLElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 2,
    });
  }

  private getPreviewCanvas(): HTMLCanvasElement | null {
    const canvas = this.previewWidgetContainer?.nativeElement?.querySelector("canvas");
    return canvas as HTMLCanvasElement;
  }

  private async handlePNGAction(action: "copy" | "download"): Promise<void> {
    let canvas: HTMLCanvasElement | null = null;

    if (this.chartView) {
      canvas = this.getPreviewCanvas();
    } else {
      canvas = await this.getKeyCanvas();
    }

    if (!canvas) {
      return;
    }

    canvas.toBlob(blob => {
      if (!blob) {
        return;
      }

      if (action === "copy") {
        navigator.clipboard
          .write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ])
          .then(() => {
            this._snackBarService.openSuccess("Copied image to clipboard");
          })
          .catch(error => {
            console.error(error);
            this._snackBarService.openError("Failed to copy image to clipboard");
          });
      } else {
        const fileName = this.chartView ? "Plot Image.png" : "Widget Key.png";
        saveAs(blob, fileName);
      }
    });
  }

  onCopyPNG(): void {
    this.handlePNGAction("copy");
  }

  onDownloadPNG(): void {
    this.handlePNGAction("download");
  }

  async onDownload(data: WidgetExportData): Promise<void> {
    this.errorMessage = "";
    const zipFileName = (this.zipFileName || this.data.defaultZipName).replace(".zip", "") + ".zip";

    const zip = new JSZip();

    this.addFilesToZip(zip, "Data Files", data.csvs, ".csv");
    this.addFilesToZip(zip, "Data Files", data.txts, ".txt");
    this.addFilesToZip(zip, "Data Files", data.luas, ".lua");
    this.addFilesToZip(zip, "Data Files", data.mds, ".md");
    this.addFilesToZip(zip, "Data Files", data.msas, ".msa");
    this.addFilesToZip(zip, "Images", data.images, ".png", true);
    this.addFilesToZip(zip, "Images", data.tiffImages, ".tif", true);

    if (data.interactiveCanvas) {
      const canvas = this.previewWidgetContainer?.nativeElement?.querySelector("canvas");
      if (canvas) {
        await new Promise<void>(resolve => {
          (canvas as HTMLCanvasElement).toBlob(blob => {
            if (blob) {
              this.addFilesToZip(zip, "Images", [{ fileName: "Plot Image.png", data: blob }], ".png", true);
            }
            resolve();
          });
        });
      }
    }

    zip
      .generateAsync({ type: "blob" })
      .then(content => {
        saveAs(content, zipFileName);
        // this.onClear();
        this.loading = false;

        if (this.dialogRef) {
          this.dialogRef.close();
        }
      })
      .catch(err => {
        this.loading = false;
        console.error(err);
        if (!this.errorMessage) {
          this.errorMessage = "Failed to generate ZIP file.";
        }

        this._snackBarService.openError(this.errorMessage, err);
      });
  }

  onExportError(err: any): void {
    this.loading = false;
    this.errorMessage = err;
  }

  onSwitchView(evt: any): void {
    // Get the key items from the preview widget
    if (this.previewWidget) {
      const widget = this.previewWidget as unknown as WidgetComponent;
      this.keyItems = widget.widgetKeyItems;
    }

    this.chartView = evt === "Chart";
    setTimeout(() => {
      this.mapAllCounts();
    }, 500);
  }
}
