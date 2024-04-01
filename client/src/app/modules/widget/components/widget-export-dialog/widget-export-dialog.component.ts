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
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportOption,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

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

  options: WidgetExportOption[] = this.data.options;
  dataProducts: WidgetExportOption[] = this.data.dataProducts;

  showPreview: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: WidgetExportDialogData,
    public dialogRef: MatDialogRef<WidgetExportDialogComponent>
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

  ngOnInit(): void {}

  get selectedDataProductsCount(): number {
    return this.dataProducts.filter(option => option.selected).length;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.loading = true;
    this.errorMessage = "";

    let options: Record<string, WidgetExportOption> = {};
    this.options.forEach(option => {
      options[option.id] = option;
    });

    let dataProducts: Record<string, WidgetExportOption> = {};
    this.dataProducts.forEach(option => {
      dataProducts[option.id] = option;
    });

    this.requestExportData.emit({
      options,
      dataProducts,
    });
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
    this.loading = false;
    this.errorMessage = "";
    let zipFileName = (this.zipFileName || this.data.defaultZipName).replace(".zip", "") + ".zip";

    let zip = new JSZip();

    this.addFilesToZip(zip, "csvs", data.csvs, ".csv");
    this.addFilesToZip(zip, "txts", data.txts, ".txt");
    this.addFilesToZip(zip, "images", data.images, ".png", true);

    zip
      .generateAsync({ type: "blob" })
      .then(content => {
        saveAs(content, zipFileName);
      })
      .catch(err => {
        console.error(err);
      });

    this.dialogRef.close();
  }

  onExportError(err: any): void {
    this.loading = false;
    this.errorMessage = err;
  }
}
