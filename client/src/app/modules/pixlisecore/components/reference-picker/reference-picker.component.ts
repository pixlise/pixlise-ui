import { Component, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "../../../expressions/components/expression-picker/expression-picker.component";

export interface ExpressionValuePair {
  expression: string;
  value: number;
}

export interface ReferenceData {
  id: string;
  category: string;
  group: string;
  mineralSampleName: string;
  sourceCitation: string;
  sourceLink: string;
  expressionValuePairs: ExpressionValuePair[];
  isEditing?: boolean;
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

  references: ReferenceData[] = [];
  filteredReferences: ReferenceData[] = [];
  selectedReferences: Set<string> = new Set();
  allowEdit: boolean = false;

  searchText: string = "";
  showMatchingExpressionsOnly: boolean = false;
  requiredExpressions: string[] = [];

  private _currentExpressionSelection: { reference: ReferenceData; pairIndex: number } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferencePickerData,
    public dialogRef: MatDialogRef<ReferencePickerComponent, ReferencePickerResponse>,
    private dialog: MatDialog
  ) {
    this.allowEdit = this.data.allowEdit || false;
    this.requiredExpressions = this.data.requiredExpressions || [];

    this.references = this.data.selectedReferences || this.getSampleData();

    this.references.forEach(ref => (ref.isEditing = false));

    if (this.data.selectedReferences) {
      this.data.selectedReferences.forEach(ref => {
        this.selectedReferences.add(ref.id);
      });
    }

    this.applyFilters();
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
          { expression: "Na2O", value: 2.75 },
          { expression: "MgO", value: 8.45 },
          { expression: "Al2O3", value: 9.12 },
        ],
        isEditing: false,
      },
      {
        id: "2",
        category: "Sedimentary",
        group: "Sandstone",
        mineralSampleName: "Windjana Target",
        sourceCitation: "Treiman et al. (2016)",
        sourceLink: "https://doi.org/10.1016/j.epsl.2016.07.014",
        expressionValuePairs: [
          { expression: "SiO2", value: 56.2 },
          { expression: "K2O", value: 4.8 },
        ],
        isEditing: false,
      },
      {
        id: "3",
        category: "Metamorphic",
        group: "Gneiss",
        mineralSampleName: "Sample ABC-123",
        sourceCitation: "Smith et al. (2020)",
        sourceLink: "https://doi.org/10.1000/xyz.2020.001",
        expressionValuePairs: [
          { expression: "SiO2", value: 65.8 },
          { expression: "Al2O3", value: 15.2 },
          { expression: "Fe2O3", value: 6.1 },
          { expression: "MgO", value: 3.4 },
        ],
        isEditing: false,
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
      ...reference.expressionValuePairs.map(pair => pair.expression),
      ...reference.expressionValuePairs.map(pair => pair.value?.toString() || ""),
    ];

    return searchableFields.some(field => field?.toLowerCase().includes(searchText));
  }

  private hasAllRequiredExpressions(reference: ReferenceData): boolean {
    const referenceExpressions = reference.expressionValuePairs.map(pair => pair.expression);
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

  onToggleReferenceEdit(reference: ReferenceData): void {
    reference.isEditing = !reference.isEditing;
  }

  onAddReference(): void {
    const newReference: ReferenceData = {
      id: Date.now().toString(),
      category: "",
      group: "",
      mineralSampleName: "",
      sourceCitation: "",
      sourceLink: "",
      expressionValuePairs: [],
      isEditing: true,
    };
    this.references = [newReference, ...this.references];
    this.applyFilters();
  }

  onDeleteReference(referenceId: string): void {
    this.references = this.references.filter(ref => ref.id !== referenceId);
    this.selectedReferences.delete(referenceId);
    this.applyFilters();
  }

  onAddExpressionPair(reference: ReferenceData): void {
    reference.expressionValuePairs.push({
      expression: "",
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
            this._currentExpressionSelection.reference.expressionValuePairs[this._currentExpressionSelection.pairIndex].expression = selectedExpression.name;
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
}
