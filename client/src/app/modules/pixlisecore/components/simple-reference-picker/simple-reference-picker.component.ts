// Copyright (c) 2018-2022 California Institute of Technology ("Caltech"). U.S.
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

import { Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subscription } from "rxjs";
import { ReferenceData } from "src/app/generated-protos/references";
import { ReferenceDataListReq, ReferenceDataListResp } from "src/app/generated-protos/references-msgs";
import { APIDataService } from "../../services/apidata.service";
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { ReferenceDataItem, ReferencePickerComponent, ReferencePickerData, ReferencePickerResponse } from "../reference-picker/reference-picker.component";

@Component({
  selector: "simple-reference-picker",
  templateUrl: "./simple-reference-picker.component.html",
  styleUrls: ["./simple-reference-picker.component.scss"],
})
export class SimpleReferencePickerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _referenceSelectionChanged: boolean = false;

  _referenceSearchValue: string = "";

  private _allReferences: ReferenceData[] = [];

  references: ReferenceDataItem[] = [];
  filteredReferences: ReferenceDataItem[] = [];
  filteredCurrentReferences: ReferenceDataItem[] = [];
  selectedReferences: Set<string> = new Set();
  selectedReferencesArray: ReferenceData[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferencePickerData,
    private _apiDataService: APIDataService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<SimpleReferencePickerComponent, ReferencePickerResponse>
  ) {}

  ngOnInit() {
    this.fetchReferences();
    this.focusOnInput();

    // Update selected references
    this.selectedReferencesArray = this.data.selectedReferences || [];
    this.selectedReferences = new Set(this.selectedReferencesArray.map(ref => ref.id));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  fetchReferences(): void {
    this._subs.add(
      this._apiDataService.sendReferenceDataListRequest(ReferenceDataListReq.create({})).subscribe({
        next: (response: ReferenceDataListResp) => {
          if (response?.referenceData) {
            this._allReferences = response.referenceData.filter(ref => ref.id);
            this.updateVisibleReferences();
          }
        },
        error: error => {
          console.error("Failed to fetch references:", error);
        },
      })
    );
  }

  updateVisibleReferences(): void {
    this.references = [...this._allReferences];
    // Filter out references that dont include all required expressions
    this.references = this.references.filter(ref =>
      (this.data.requiredExpressions || []).every(expr => ref.expressionValuePairs?.some(pair => pair.expressionId === expr))
    );

    // Sort references by mineral sample name
    this.references.sort((a, b) => a.mineralSampleName.localeCompare(b.mineralSampleName));

    this.groupReferences();
    this.selectedReferencesArray = this.references.filter(ref => this.selectedReferences.has(ref.id));
  }

  get selectedReferencesTooltip(): string {
    return this.selectedReferences.size > 0
      ? `References:\n${Array.from(this.selectedReferences)
          .map(id => this.references.find(ref => ref.id === id)?.mineralSampleName || "Unnamed Sample")
          .join("\n")}`
      : "No references selected";
  }

  get referenceSearchValue(): string {
    return this._referenceSearchValue;
  }

  set referenceSearchValue(value: string) {
    this._referenceSearchValue = value.slice(0, 100);
    this.groupReferences();
  }

  get allCurrentReferencesSelected(): boolean {
    return this.filteredCurrentReferences.length > 0 && this.filteredCurrentReferences.every(ref => this.selectedReferences.has(ref.id));
  }

  get allAvailableReferencesSelected(): boolean {
    return this.filteredReferences.length > 0 && this.filteredReferences.every(ref => this.selectedReferences.has(ref.id));
  }

  onToggleAllCurrentReferences(): void {
    if (this.allCurrentReferencesSelected) {
      this.filteredCurrentReferences.forEach(ref => this.selectedReferences.delete(ref.id));
    } else {
      this.filteredCurrentReferences.forEach(ref => this.selectedReferences.add(ref.id));
    }

    this._referenceSelectionChanged = true;
  }

  onToggleAllAvailableReferences(): void {
    if (this.allAvailableReferencesSelected) {
      this.filteredReferences.forEach(ref => this.selectedReferences.delete(ref.id));
    } else {
      this.filteredReferences.forEach(ref => this.selectedReferences.add(ref.id));
    }

    this._referenceSelectionChanged = true;
  }

  onReferenceEnter(): void {
    if (this.filteredReferences.length > 0) {
      this.onToggleReference(this.filteredReferences[0].id);
      this.referenceSearchValue = "";
    }
  }

  delayedFocusOnInput(): void {
    setTimeout(() => this.focusOnInput(), 200);
  }

  focusOnInput(): void {
    const referenceInput = document.querySelector(".reference-search-container input") as any;
    if (referenceInput && referenceInput.focus) {
      referenceInput.focus({ focusVisible: true });
    }
  }

  filterSearch(references: ReferenceDataItem[]): ReferenceDataItem[] {
    return references.filter(
      (ref: ReferenceData) =>
        (ref.mineralSampleName || "").toLowerCase().includes(this.referenceSearchValue.trim().toLowerCase()) ||
        (ref.category || "").toLowerCase().includes(this.referenceSearchValue.trim().toLowerCase()) ||
        (ref.group || "").toLowerCase().includes(this.referenceSearchValue.trim().toLowerCase()) ||
        (ref.sourceCitation || "").toLowerCase().includes(this.referenceSearchValue.trim().toLowerCase())
    );
  }

  groupReferences(): void {
    this.filteredReferences = this.filterSearch(this.references).filter(ref => !this.selectedReferences.has(ref.id));
    this.filteredCurrentReferences = this.filterSearch(this.selectedReferencesArray);
  }

  checkReferenceActive(referenceID: string): boolean {
    return this.selectedReferences.has(referenceID);
  }

  onToggleReference(referenceID: string): void {
    let newReferences = Array.from(this.selectedReferences);
    if (this.selectedReferences.has(referenceID)) {
      newReferences = newReferences.filter(id => id !== referenceID);
    } else {
      newReferences.push(referenceID);
    }

    this._referenceSelectionChanged = true;
    this.selectedReferences = new Set(newReferences);

    this.focusOnInput();
  }

  onClose(): void {
    if (this._referenceSelectionChanged) {
      const result: ReferencePickerResponse = {
        selectedReferences: Array.from(this.selectedReferences)
          .map(id => this.references.find(ref => ref.id === id))
          .filter(ref => ref !== undefined) as ReferenceData[],
      };
      this.dialogRef.close(result);
      this._referenceSelectionChanged = false;
    } else {
      this.dialogRef.close();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.onClose();
  }

  onOpenAdvancedPicker(): void {
    const dialogConfig = new MatDialogConfig<ReferencePickerData>();
    dialogConfig.data = {
      widgetType: this.data.widgetType,
      widgetId: this.data.widgetId,
      selectedReferences: Array.from(this.selectedReferences)
        .map(id => this.references.find(ref => ref.id === id))
        .filter(ref => ref !== undefined) as ReferenceData[],
      allowEdit: true,
      requiredExpressions: this.data.requiredExpressions,
    };
    dialogConfig.maxWidth = "95vw";
    dialogConfig.maxHeight = "90vh";

    const referencePickerRef = this.dialog.open(ReferencePickerComponent, dialogConfig);

    this._subs.add(
      referencePickerRef.afterClosed().subscribe((response: ReferencePickerResponse) => {
        if (response && response.selectedReferences) {
          this.dialogRef.close(response);
        }
      })
    );
  }

  generateTooltipContent(reference: ReferenceData): string {
    const category = reference.category || "No category";
    const group = reference.group || "No group";
    const citation = reference.sourceCitation || "No citation";

    return `${reference.mineralSampleName || "Unnamed Sample"}
Category: ${category}
Group: ${group}
Citation: ${citation}`;
  }
}
