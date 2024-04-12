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

import { Component, EventEmitter, Inject, OnInit, Output, SimpleChanges } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
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
import { SnackbarService } from "../../../pixlisecore/pixlisecore.module";

@Component({
  selector: "widget-export-dialog",
  templateUrl: "./widget-export-dialog.component.html",
  styleUrls: ["./widget-export-dialog.component.scss"],
})
export class WidgetExportDialogComponent implements OnInit {
  title: string = "Export Data";
  zipFileName: string = "";

  @Output() requestExportData: EventEmitter<WidgetExportRequest> = new EventEmitter<WidgetExportRequest>();
  loading: boolean = false;
  errorMessage: string = "";

  // Initial state to restore from
  initialOptions: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.options);
  initialDataProducts: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.dataProducts);

  options: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.options);
  dataProducts: WidgetExportOption[] = this.copyWidgetExportOptionsDefaultState(this.data.dataProducts);

  private _selectedDataProductsCount: number = 0;

  showPreview: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: WidgetExportDialogData,
    public dialogRef: MatDialogRef<WidgetExportDialogComponent> | null,
    private _snackBarService: SnackbarService
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
  }

  trackByFn(index: number, item: WidgetExportOption): string {
    return item.id;
  }

  updateDataProductsCount(): void {
    this._selectedDataProductsCount = Math.ceil(this.dataProducts.filter(option => option.selected).reduce((a, b) => a + (b?.count ?? 1), 0));
  }

  get selectedDataProductsCount(): number {
    return this._selectedDataProductsCount;
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onClear(): void {
    this.options = this.copyWidgetExportOptionsDefaultState(this.initialOptions);
    this.dataProducts = this.copyWidgetExportOptionsDefaultState(this.initialDataProducts);

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

    let selection = this.formWidgetExportRequest();
    let countMap = updateCounts(selection, selected);

    Object.entries(countMap).forEach(([key, newCount]) => {
      let product = this.dataProducts.find(product => product.id === key);
      if (product) {
        product.count = newCount;
      }
    });
  }

  toggleOption(option: WidgetExportOption): void {
    option.selected = !option.selected;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectOption({ option, event }: { option: WidgetExportOption; event: string }): void {
    option.selectedOption = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectDropdownOption({ option, event }: { option: WidgetExportOption; event: MatSelectChange }): void {
    option.selectedOption = event.value;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectROIsOption({ option, event }: { option: WidgetExportOption; event: ROIItemSummary[] }): void {
    option.selectedRegions = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectExpressionsOption({ option, event }: { option: WidgetExportOption; event: DataExpression[] }): void {
    option.selectedExpressions = event;
    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    }

    this.updateDataProductsCount();
  }

  selectImagesOption({ option, event }: { option: WidgetExportOption; event: string[] }, isDataProduct: boolean = false): void {
    option.selectedImagePaths = event;
    option.selected = event.length > 0;

    if (option.updateCounts) {
      this.mapNewDataProductCounts(option.updateCounts, option.selected);
    } else if (isDataProduct) {
      this.mapNewDataProductCounts(() => ({ [option.id]: event.length }), option.selected);
    }

    this.updateDataProductsCount();
  }

  formWidgetExportRequest(): WidgetExportRequest {
    let options: Record<string, WidgetExportOption> = {};
    this.options.forEach(option => {
      options[option.id] = option;
    });

    let dataProducts: Record<string, WidgetExportOption> = {};
    this.dataProducts.forEach(option => {
      dataProducts[option.id] = option;
    });

    return { options, dataProducts };
  }

  onConfirm(): void {
    this.loading = true;
    this.errorMessage = "";

    let exportRequest = this.formWidgetExportRequest();
    this.requestExportData.emit(exportRequest);
  }

  private addFilesToZip(zip: JSZip, folderName: string, files: WidgetExportFile[] | undefined, extension: string, base64: boolean = false): void {
    if (files && files.length > 0) {
      let baseFolder = zip.folder(folderName);
      if (baseFolder) {
        files.forEach(item => {
          if (item?.fileName && item?.data) {
            let itemFolder: JSZip = item?.subFolder ? baseFolder.folder(item.subFolder) ?? baseFolder : baseFolder;

            let fileName = item.fileName.replace(extension, "") + extension;
            item?.fileName && item?.data && itemFolder.file(fileName, item.data, { base64 });
          }
        });
      }
    }
  }

  onDownload(data: WidgetExportData): void {
    this.errorMessage = "";
    let zipFileName = (this.zipFileName || this.data.defaultZipName).replace(".zip", "") + ".zip";

    let zip = new JSZip();

    this.addFilesToZip(zip, "Data Files", data.csvs, ".csv");
    this.addFilesToZip(zip, "Data Files", data.txts, ".txt");
    this.addFilesToZip(zip, "Data Files", data.msas, ".msa");
    this.addFilesToZip(zip, "Images", data.images, ".png", true);
    this.addFilesToZip(zip, "Images", data.tiffImages, ".tif", true);

    zip
      .generateAsync({ type: "blob" })
      .then(content => {
        saveAs(content, zipFileName);
        this.onClear();
        this.loading = false;
      })
      .catch(err => {
        this.loading = false;
        console.error(err);
        if (!this.errorMessage) {
          this.errorMessage = "Failed to generate ZIP file.";
        }

        this._snackBarService.openError(this.errorMessage, err);
      });

    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onExportError(err: any): void {
    this.loading = false;
    this.errorMessage = err;
  }
}
