import { Component, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "../../../expressions/components/expression-picker/expression-picker.component";
import { ReferenceData } from "src/app/generated-protos/references";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ReferenceDataListReq, ReferenceDataListResp, ReferenceDataWriteReq, ReferenceDataWriteResp } from "../../../../generated-protos/references-msgs";

export interface ExpressionValuePair {
  expression: string;
  value: number;
}

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

  private _currentExpressionSelection: { reference: ReferenceData; pairIndex: number } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferencePickerData,
    public dialogRef: MatDialogRef<ReferencePickerComponent, ReferencePickerResponse>,
    private dialog: MatDialog,
    private _apiDataService: APIDataService
  ) {
    this.allowEdit = this.data.allowEdit || false;
    this.requiredExpressions = this.data.requiredExpressions || [];

    // this.references = (this.data.selectedReferences || this.getSampleData()).map(
    //   ref =>
    //     ({
    //       ...ref,
    //       isEditing: false,
    //     }) as ReferenceDataItem
    // );

    this.fetchLatestReferences();

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

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getSampleData(): ReferenceData[] {
    return [
      {
        id: "1",
        category: "Igneous",
        group: "Basalt",
        mineralSampleName: "MSL Gale Crater O-Tray Dust Sol 571",
        sourceCitation: "Achilles et al. (2017)",
        sourceLink: "https://doi.org/10.1016/j.icarus.2017.02.025",
        expressionValuePairs: [
          { expressionId: "Na2O", expressionName: "Na2O", value: 2.75 },
          { expressionId: "MgO", expressionName: "MgO", value: 8.45 },
          { expressionId: "Al2O3", expressionName: "Al2O3", value: 9.12 },
        ],
      },
      {
        id: "2",
        category: "Sedimentary",
        group: "Sandstone",
        mineralSampleName: "Windjana Target",
        sourceCitation: "Treiman et al. (2016)",
        sourceLink: "https://doi.org/10.1016/j.epsl.2016.07.014",
        expressionValuePairs: [
          { expressionId: "SiO2", expressionName: "SiO2", value: 56.2 },
          { expressionId: "K2O", expressionName: "K2O", value: 4.8 },
        ],
      },
      {
        id: "3",
        category: "Metamorphic",
        group: "Gneiss",
        mineralSampleName: "Sample ABC-123",
        sourceCitation: "Smith et al. (2020)",
        sourceLink: "https://doi.org/10.1000/xyz.2020.001",
        expressionValuePairs: [
          { expressionId: "SiO2", expressionName: "SiO2", value: 65.8 },
          { expressionId: "Al2O3", expressionName: "Al2O3", value: 15.2 },
          { expressionId: "Fe2O3", expressionName: "Fe2O3", value: 6.1 },
          { expressionId: "MgO", expressionName: "MgO", value: 3.4 },
        ],
      },
    ];
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
    console.log(reference, "referenceData", referenceData);
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
    this.references = this.references.filter(ref => ref.id !== referenceId);
    this.selectedReferences.delete(referenceId);
    this.applyFilters();
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
}
