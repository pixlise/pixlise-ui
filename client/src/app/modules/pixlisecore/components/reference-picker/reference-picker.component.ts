import { Component, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import * as papa from "papaparse";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "../../../expressions/components/expression-picker/expression-picker.component";
import { ReferenceData, ExpressionValuePair } from "src/app/generated-protos/references";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import {
  ReferenceDataListReq,
  ReferenceDataListResp,
  ReferenceDataWriteReq,
  ReferenceDataWriteResp,
  ReferenceDataBulkWriteReq,
  ReferenceDataBulkWriteResp,
  ReferenceDataDeleteReq,
  ReferenceDataDeleteResp,
} from "../../../../generated-protos/references-msgs";
import { DataExpression } from "../../../../generated-protos/expressions";
import { ExpressionsService } from "../../../expressions/services/expressions.service";
import { levenshteinDistance } from "../../../../utils/search";

export interface ReferenceDataItem extends ReferenceData {
  isEditing?: boolean;
  isCollapsed?: boolean;
}

export interface ReferencePickerData {
  widgetType?: string;
  widgetId?: string;
  selectedReferences?: ReferenceData[];
  allowEdit?: boolean;
  requiredExpressions?: string[];
}

export interface ReferencePickerResponse {
  selectedReferences: ReferenceData[];
}

@Component({
  selector: "reference-picker",
  templateUrl: "./reference-picker.component.html",
  styleUrls: ["./reference-picker.component.scss"],
})
export class ReferencePickerComponent implements OnDestroy {
  private _subs = new Subscription();

  references: ReferenceDataItem[] = [];
  filteredReferences: ReferenceDataItem[] = [];
  selectedReferences: Set<string> = new Set();
  allowEdit: boolean = false;

  searchText: string = "";
  showMatchingExpressionsOnly: boolean = false;
  requiredExpressions: string[] = [];
  _allExpressions: Record<string, DataExpression[]> = {};

  private _currentExpressionSelection: { reference: ReferenceData; pairIndex: number } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferencePickerData,
    public dialogRef: MatDialogRef<ReferencePickerComponent, ReferencePickerResponse>,
    private dialog: MatDialog,
    private _apiDataService: APIDataService,
    private _snackBarService: SnackbarService,
    private _expressionsService: ExpressionsService
  ) {
    this.allowEdit = this.data.allowEdit || false;
    this.requiredExpressions = this.data.requiredExpressions || [];

    this.fetchLatestReferences();
    this.fetchLatestExpressions();

    if (this.data.selectedReferences) {
      this.data.selectedReferences.forEach(ref => {
        this.selectedReferences.add(ref.id);
      });
    }

    this.applyFilters();
  }

  fetchLatestReferences(): void {
    this._apiDataService.sendReferenceDataListRequest(ReferenceDataListReq.create({})).subscribe({
      next: (response: ReferenceDataListResp) => {
        if (response?.referenceData) {
          this.references = response.referenceData.map(ref => ({ ...ref, isEditing: false, isCollapsed: true }) as ReferenceDataItem);
          this.applyFilters();
        }
      },
    });
  }

  fetchLatestExpressions(): void {
    this._expressionsService.fetchExpressionsAsync().subscribe({
      next: expressions => {
        Object.values(expressions).forEach(expr => {
          this._allExpressions[expr.name] = [...(this._allExpressions[expr.name] || []), expr];
        });
      },
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get selectedReferencesArray(): ReferenceData[] {
    return this.references.filter(ref => this.selectedReferences.has(ref.id));
  }

  get matchingReferencesCount(): number {
    return this.references.filter(ref => this.hasAllRequiredExpressions(ref)).length;
  }

  trackByReferenceId(index: number, reference: ReferenceData): string {
    return reference.id;
  }

  onSearchChange(searchText: string): void {
    this.searchText = searchText;
    this.applyFilters();
  }

  onToggleExpressionFilter(): void {
    this.showMatchingExpressionsOnly = !this.showMatchingExpressionsOnly;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.references];

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      filtered = filtered.filter(ref => this.matchesSearch(ref, search));
    }

    if (this.showMatchingExpressionsOnly) {
      filtered = filtered.filter(ref => this.hasAllRequiredExpressions(ref));
    }

    this.filteredReferences = filtered;
  }

  private matchesSearch(reference: ReferenceData, searchText: string): boolean {
    const searchableFields = [
      reference.mineralSampleName,
      reference.category,
      reference.group,
      reference.sourceCitation,
      reference.sourceLink,
      ...reference.expressionValuePairs.map(pair => pair.expressionName),
      ...reference.expressionValuePairs.map(pair => pair.value?.toString() || ""),
    ];

    return searchableFields.some(field => field?.toLowerCase().includes(searchText));
  }

  private hasAllRequiredExpressions(reference: ReferenceData): boolean {
    const referenceExpressions = reference.expressionValuePairs.map(pair => pair.expressionName);
    return this.requiredExpressions.every(required => referenceExpressions.includes(required));
  }

  onToggleSelection(referenceId: string): void {
    if (this.selectedReferences.has(referenceId)) {
      this.selectedReferences.delete(referenceId);
    } else {
      this.selectedReferences.add(referenceId);
    }
  }

  isSelected(referenceId: string): boolean {
    return this.selectedReferences.has(referenceId);
  }

  onToggleReferenceEdit(reference: ReferenceDataItem): void {
    reference.isEditing = !reference.isEditing;
  }

  onAddReference(): void {
    const newReference: ReferenceDataItem = {
      id: "",
      category: "",
      group: "",
      mineralSampleName: "",
      sourceCitation: "",
      sourceLink: "",
      expressionValuePairs: [],
      isEditing: true,
      isCollapsed: false,
    };
    this.references = [newReference, ...this.references];
    this.applyFilters();
  }

  onSaveReference(reference: ReferenceDataItem): void {
    reference.isEditing = false;
    const referenceData = ReferenceData.create({
      id: reference.id,
      category: reference.category,
      group: reference.group,
      mineralSampleName: reference.mineralSampleName,
      sourceCitation: reference.sourceCitation,
      sourceLink: reference.sourceLink,
      expressionValuePairs: reference.expressionValuePairs,
    });
    this._apiDataService.sendReferenceDataWriteRequest(ReferenceDataWriteReq.create({ referenceData })).subscribe({
      next: (response: ReferenceDataWriteResp) => {
        console.log(response);
        this.references = this.references.map(ref => (ref.id === reference.id && response?.referenceData ? response.referenceData : ref));
        this.applyFilters();
      },
      error: error => {
        console.error(error);
      },
    });
  }

  formatExpressionValue(value: number | undefined): number | string {
    if (value === undefined) {
      return "-";
    }
    return Math.round(value * 1000) / 1000;
  }

  onDeleteReference(referenceId: string): void {
    this._apiDataService.sendReferenceDataDeleteRequest(ReferenceDataDeleteReq.create({ id: referenceId })).subscribe({
      next: (response: ReferenceDataDeleteResp) => {
        this.references = this.references.filter(ref => ref.id !== referenceId);
        this.selectedReferences.delete(referenceId);
        this.applyFilters();
      },
      error: error => {
        console.error(error);
      },
    });
  }

  onAddExpressionPair(reference: ReferenceData): void {
    reference.expressionValuePairs.push({
      expressionId: "",
      expressionName: "",
      value: 0,
    });
  }

  onDeleteExpressionPair(reference: ReferenceData, index: number): void {
    reference.expressionValuePairs.splice(index, 1);
    this.applyFilters();
  }

  onSelectExpression(reference: ReferenceData, pairIndex: number): void {
    this._currentExpressionSelection = { reference, pairIndex };

    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      maxSelection: 1,
      disableExpressionGroups: true,
      expressionsOnly: true,
    };

    const expressionPickerRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

    this._subs.add(
      expressionPickerRef.afterClosed().subscribe((response: ExpressionPickerResponse) => {
        if (response && response.selectedExpressions && response.selectedExpressions.length > 0) {
          const selectedExpression = response.selectedExpressions[0];
          if (this._currentExpressionSelection) {
            this._currentExpressionSelection.reference.expressionValuePairs[this._currentExpressionSelection.pairIndex].expressionName = selectedExpression.name;
            this._currentExpressionSelection.reference.expressionValuePairs[this._currentExpressionSelection.pairIndex].expressionId = selectedExpression.id;
            this.applyFilters();
          }
        }
        this._currentExpressionSelection = null;
      })
    );
  }

  onSave(): void {
    const selectedReferenceData = this.references.filter(ref => this.selectedReferences.has(ref.id));

    const result: ReferencePickerResponse = {
      selectedReferences: selectedReferenceData,
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onToggleAccordion(reference: ReferenceDataItem): void {
    reference.isCollapsed = !reference.isCollapsed;
  }

  generateTooltipContent(reference: ReferenceDataItem): string {
    const category = reference.category || "No category";
    const group = reference.group || "No group";
    const citation = reference.sourceCitation || "No citation";
    const expressionCount = reference.expressionValuePairs?.length || 0;

    const expressionText =
      expressionCount === 0 ? "No expressions defined" : expressionCount === 1 ? "1 expression defined" : `${expressionCount} expressions defined`;

    return `${reference.mineralSampleName || "Unnamed Sample"}
Category: ${category}
Group: ${group}
Citation: ${citation}
Expressions: ${expressionText}`;
  }

  onUploadCSV(): void {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";
    fileInput.style.display = "none";

    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const fileReader = new FileReader();
      fileReader.onload = evt => {
        const csvData = evt.target?.result as string;
        this.parseCsvAndUpload(csvData);
      };
      fileReader.readAsText(file);
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  private parseCsvAndUpload(csvData: string): void {
    try {
      const parseResult = papa.parse(csvData, { header: true, skipEmptyLines: true });

      if (parseResult.errors.length > 0) {
        this._snackBarService.openError("CSV parsing failed", parseResult.errors.map(e => e.message).join(", "));
        return;
      }

      const rows = parseResult.data as any[];
      if (rows.length === 0) {
        this._snackBarService.openError("No data found in CSV");
        return;
      }

      const referenceDataList: ReferenceData[] = [];
      const metaLabels = ["Category", "Group", "Mineral/Sample Name", "Source Citation", "Source Link"];

      for (const row of rows) {
        const reference: ReferenceData = {
          id: "",
          mineralSampleName: row["Mineral/Sample Name"] || "",
          category: row["Category"] || "",
          group: row["Group"] || "",
          sourceCitation: row["Source Citation"] || "",
          sourceLink: row["Source Link"] || "",
          expressionValuePairs: [],
        };

        const keys = Object.keys(row);
        const expressionKeys = keys.filter(key => !metaLabels.includes(key) && row[key] !== "");

        for (const expressionKey of expressionKeys) {
          let expressionName = row[expressionKey];
          const value = parseFloat(row[expressionKey]);

          if (expressionName && !isNaN(value)) {
            const matchingExpressions = this._allExpressions[expressionName];
            let expressionId = matchingExpressions?.[0]?.id || "";
            if (!expressionId) {
              const closestMatches = Object.keys(this._allExpressions).sort((a, b) => {
                const aDistance = levenshteinDistance(a, expressionName);
                const bDistance = levenshteinDistance(b, expressionName);
                return aDistance - bDistance;
              });

              const closestMatch = closestMatches[0];
              const distanceToClosestMatch = levenshteinDistance(expressionName, closestMatch);
              if (distanceToClosestMatch < 3) {
                const closestExpression = this._allExpressions[closestMatch]?.[0];
                if (closestExpression) {
                  expressionId = closestExpression.id;
                  expressionName = closestExpression.name;
                }
              }
            }

            reference.expressionValuePairs.push({
              expressionId: expressionId,
              expressionName: expressionName,
              value: value,
            });
          }
        }

        if (reference.mineralSampleName) {
          referenceDataList.push(reference);
        }
      }

      if (referenceDataList.length === 0) {
        this._snackBarService.openError("No valid reference data found in CSV");
        return;
      }

      this.bulkUploadReferences(referenceDataList);
    } catch (error) {
      this._snackBarService.openError("Failed to parse CSV file", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private bulkUploadReferences(referenceDataList: ReferenceData[]): void {
    this._apiDataService.sendReferenceDataBulkWriteRequest(ReferenceDataBulkWriteReq.create({ referenceData: referenceDataList, matchByFields: true })).subscribe({
      next: (response: ReferenceDataBulkWriteResp) => {
        if (response?.referenceData && response.referenceData.length > 0) {
          this._snackBarService.openSuccess(`Successfully uploaded ${response.referenceData.length} references from CSV`);

          this.fetchLatestReferences();
        } else {
          this._snackBarService.openError("No references were created from the CSV upload");
        }
      },
      error: error => {
        this._snackBarService.openError("Failed to upload references", error?.message || "Unknown error");
      },
    });
  }
}
