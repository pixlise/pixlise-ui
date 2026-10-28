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

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  OnInit,
  Output,
  ViewContainerRef,
} from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ScanDataType } from "src/app/generated-protos/scan";
import { ScanSortField } from "src/app/utils/search";
import { positionDialogNearParent } from "src/app/utils/utils";

export const DEFAULT_SCAN_SORT_FIELD: ScanSortField = "RTT";
export const DEFAULT_SCAN_SORT_ASC = false;

export class DatasetFilterMenuData {
  constructor(
    public possibleInstruments: string[],
    public selectedInstruments: string[],
    public selectedDataTypes: ScanDataType[],
    public sortBy: ScanSortField,
    public sortAsc: boolean,
    public triggerElementRef: ElementRef
  ) {}
}

export class DatasetFilterMenuChange {
  constructor(
    public selectedInstruments: string[],
    public selectedDataTypes: ScanDataType[],
    public sortBy: ScanSortField,
    public sortAsc: boolean
  ) {}
}

export class DataTypeFilterOption {
  constructor(
    public type: ScanDataType,
    public label: string
  ) {}
}

@Component({
  standalone: false,
  selector: "dataset-filter-menu",
  templateUrl: "./dataset-filter-menu.component.html",
  styleUrls: ["./dataset-filter-menu.component.scss"],
})
export class DatasetFilterMenuComponent implements OnInit, AfterViewInit {
  isVisible = false;

  selectedInstruments: string[] = [];
  selectedDataTypes: ScanDataType[] = [];
  sortBy: ScanSortField = DEFAULT_SCAN_SORT_FIELD;
  sortAsc: boolean = DEFAULT_SCAN_SORT_ASC;

  scanSortFields: ScanSortField[] = ["RTT", "Sol", "Name"];

  dataTypeOptions: DataTypeFilterOption[] = [
    new DataTypeFilterOption(ScanDataType.SD_XRF, "XRF"),
    new DataTypeFilterOption(ScanDataType.SD_RGBU, "RGBU"),
  ];

  @Output() onFilterChanged = new EventEmitter<DatasetFilterMenuChange>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DatasetFilterMenuData,
    public dialogRef: MatDialogRef<DatasetFilterMenuComponent>,
    private _ViewContainerRef: ViewContainerRef
  ) {}

  ngOnInit(): void {
    this.isVisible = false;
    this.selectedInstruments = [...this.data.selectedInstruments];
    this.selectedDataTypes = [...this.data.selectedDataTypes];
    this.sortBy = this.data.sortBy;
    this.sortAsc = this.data.sortAsc;
  }

  ngAfterViewInit(): void {
    this.updateDialogPosition();
    setTimeout(() => {
      this.updateDialogPosition();
      this.isVisible = true;
    }, 100);
  }

  @HostListener("window:resize", [])
  onResize(): void {
    this.updateDialogPosition();
  }

  updateDialogPosition(): void {
    if (this.data.triggerElementRef?.nativeElement) {
      const openerRect =
        this.data.triggerElementRef.nativeElement.getBoundingClientRect();
      const ourWindowRect =
        this._ViewContainerRef.element.nativeElement.parentNode.getBoundingClientRect();
      const pos = positionDialogNearParent(openerRect, ourWindowRect, true);
      this.dialogRef.updatePosition(pos);
    }
  }

  get isDefaultSort(): boolean {
    return this.sortBy === DEFAULT_SCAN_SORT_FIELD && this.sortAsc === DEFAULT_SCAN_SORT_ASC;
  }

  get clearDisabled(): boolean {
    return (
      this.selectedInstruments.length === 0 &&
      this.selectedDataTypes.length === 0 &&
      this.isDefaultSort
    );
  }

  isInstrumentSelected(instrument: string): boolean {
    return this.selectedInstruments.includes(instrument);
  }

  isDataTypeSelected(type: ScanDataType): boolean {
    return this.selectedDataTypes.includes(type);
  }

  isSortActive(field: ScanSortField): boolean {
    return this.sortBy === field;
  }

  sortFieldTitle(field: ScanSortField): string {
    if (!this.isSortActive(field)) {
      return "Click to sort descending";
    }
    if (!this.sortAsc) {
      return "Click to sort ascending";
    }
    return "Click to reset sort";
  }

  onToggleInstrument(instrument: string): void {
    const idx = this.selectedInstruments.indexOf(instrument);
    if (idx < 0) {
      this.selectedInstruments.push(instrument);
    } else {
      this.selectedInstruments.splice(idx, 1);
    }
    this.emitChange();
  }

  onToggleDataType(type: ScanDataType): void {
    const idx = this.selectedDataTypes.indexOf(type);
    if (idx < 0) {
      this.selectedDataTypes.push(type);
    } else {
      this.selectedDataTypes.splice(idx, 1);
    }
    this.emitChange();
  }

  onSortFieldClick(field: ScanSortField): void {
    if (this.sortBy !== field) {
      this.sortBy = field;
      this.sortAsc = false;
    } else if (!this.sortAsc) {
      this.sortAsc = true;
    } else {
      this.sortBy = DEFAULT_SCAN_SORT_FIELD;
      this.sortAsc = DEFAULT_SCAN_SORT_ASC;
    }
    this.emitChange();
  }

  onClear(): void {
    this.selectedInstruments = [];
    this.selectedDataTypes = [];
    this.sortBy = DEFAULT_SCAN_SORT_FIELD;
    this.sortAsc = DEFAULT_SCAN_SORT_ASC;
    this.emitChange();
  }

  private emitChange(): void {
    this.onFilterChanged.emit(
      new DatasetFilterMenuChange(
        [...this.selectedInstruments],
        [...this.selectedDataTypes],
        this.sortBy,
        this.sortAsc
      )
    );
  }
}
