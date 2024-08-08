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

import { Component, Input, Output, EventEmitter, SimpleChanges } from "@angular/core";
import { WidgetExportOption } from "../widget-export-model";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "../../../../roi/components/roi-picker/roi-picker.component";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "../../../../expressions/components/expression-picker/expression-picker.component";
import { ROIItemSummary } from "../../../../../generated-protos/roi";
import { DataExpression } from "../../../../../generated-protos/expressions";
import {
  ImagePickerDialogComponent,
  ImagePickerDialogData,
  ImagePickerDialogResponse,
} from "../../../../pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";
import { ScanImagePurpose } from "../../../../../generated-protos/image";

@Component({
  selector: "widget-export-button",
  templateUrl: "./widget-export-button.component.html",
  styleUrls: ["./widget-export-button.component.scss"],
})
export class WidgetExportButtonComponent {
  @Input() option: WidgetExportOption | null = null;
  @Output() toggleOption = new EventEmitter<any>();
  @Output() selectOption = new EventEmitter<any>();
  @Output() selectDropdownOption = new EventEmitter<any>();
  @Output() selectROIsOption = new EventEmitter<any>();
  @Output() selectExpressionsOption = new EventEmitter<any>();
  @Output() selectImagesOption = new EventEmitter<any>();

  accordionOpen: boolean = false;

  selectedRegions: ROIItemSummary[] = [];
  selectedExpressions: DataExpression[] = [];

  constructor(private _dialog: MatDialog) {}

  ngOnInit() {
    if (this.option?.selectedRegions) {
      this.selectedRegions = this.option.selectedRegions;
    }
    if (this.option?.selectedExpressions) {
      this.selectedExpressions = this.option.selectedExpressions;
    }
    if (this.option?.selected && this.option?.subOptions && this.option.subOptions.length > 0) {
      this.accordionOpen = this.option.selected;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["option"] && changes["option"].currentValue) {
      this.selectedRegions = [];
      this.selectedExpressions = [];
      this.option = changes["option"].currentValue;
      if (!this.option) {
        return;
      }

      if (this.option.selectedRegions) {
        this.selectedRegions = this.option.selectedRegions;
      }
      if (this.option.selectedExpressions) {
        this.selectedExpressions = this.option.selectedExpressions;
      }
    }
  }

  onToggleOption(option: WidgetExportOption | null = this.option) {
    if (option) {
      this.toggleOption.emit(option);
      if (option.subOptions && option.subOptions.length > 0) {
        this.accordionOpen = option.selected;
      }
    }
  }

  onSelectOption(event: any, option: WidgetExportOption | null = this.option) {
    if (option) {
      this.selectOption.emit({ option: this.option, event });
    }
  }

  onSelectDropdownOption(event: any, option: WidgetExportOption | null = this.option) {
    if (option) {
      this.selectDropdownOption.emit({ option: this.option, event });
    }
  }

  onSelectROIsOption(event: any, option: WidgetExportOption | null = this.option) {
    if (option) {
      this.selectedRegions = event;
      this.selectROIsOption.emit({ option: this.option, event });
    }
  }

  onSelectExpressionsOption(event: any, option: WidgetExportOption | null = this.option) {
    if (option) {
      this.selectedExpressions = event;
      this.selectExpressionsOption.emit({ option: this.option, event });
    }
  }

  onSelectImagesOption(event: any, option: WidgetExportOption | null = this.option) {
    if (option) {
      this.selectImagesOption.emit({ option: this.option, event });
    }
  }

  onToggleSubOption(option: WidgetExportOption) {
    this.toggleOption.emit(option);
  }

  onSelectSubOption(selection: any) {
    this.selectOption.emit(selection);
  }

  onSelectSubDropdownOption(selection: any) {
    this.selectDropdownOption.emit(selection);
  }

  onSelectSubRegionOption(selection: any) {
    this.selectROIsOption.emit(selection);
  }

  onSelectSubExpressionOption(selection: any) {
    this.selectExpressionsOption.emit(selection);
  }

  onSelectSubImageOption(selection: any) {
    this.selectImagesOption.emit(selection);
  }

  onOpenRegionPicker() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    dialogConfig.data = {
      requestFullROIs: true,
      scanId: this.option?.scanId,
      selectedROISummaries: this.selectedRegions,
      hideBuiltin: true,
    };

    const dialogRef = this._dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        // Make sure the selected ROI is from the correct scan
        let rois = result.selectedROISummaries.filter(roi => roi.scanId === this.option?.scanId);
        this.onSelectROIsOption(rois);
      }
    });
  }

  onOpenExpressionPicker() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "export",
      widgetId: "exporter",
      scanId: this.option?.scanId,
      quantId: this.option?.quantId,
      selectedIds: this.selectedExpressions.map(exp => exp.id),
      disableExpressionGroups: false,
      disableWidgetSwitching: true,
    };

    this.accordionOpen = true;
    let dialogRef = this._dialog.open(ExpressionPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((response: ExpressionPickerResponse) => {
      this.accordionOpen = true;
      if (response) {
        this.onSelectExpressionsOption(response.selectedExpressions);
      }
    });
  }

  onOpenImagePicker() {
    const dialogConfig = new MatDialogConfig<ImagePickerDialogData>();
    // Pass data to dialog
    dialogConfig.data = {
      defaultScanId: "",
      scanIds: [],
      purpose: ScanImagePurpose.SIP_UNKNOWN,
      selectedImagePath: "",
      selectedImageDetails: "",
      selectedPaths: this.option?.selectedImagePaths || [],
      liveUpdate: false,
      multipleSelection: true,
    };

    const dialogRef = this._dialog.open(ImagePickerDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((response: ImagePickerDialogResponse) => {
      if (response?.selectedPaths) {
        this.onSelectImagesOption(response.selectedPaths);
      }
    });
  }

  trackByFn(index: number, item: WidgetExportOption): string {
    return item.id;
  }
}
