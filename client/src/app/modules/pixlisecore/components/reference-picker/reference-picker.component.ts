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
  selectedReferences: Set<string> = new Set();
  allowEdit: boolean = false;

  // For tracking current expression selection
  private _currentExpressionSelection: { reference: ReferenceData; pairIndex: number } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferencePickerData,
    public dialogRef: MatDialogRef<ReferencePickerComponent, ReferencePickerResponse>,
    private dialog: MatDialog
  ) {
    this.allowEdit = this.data.allowEdit || false;

    // Initialize with existing data or sample data
    this.references = this.data.selectedReferences || this.getSampleData();

    // Initialize editing state for all references
    this.references.forEach(ref => (ref.isEditing = false));

    // Mark initially selected references
    if (this.data.selectedReferences) {
      this.data.selectedReferences.forEach(ref => {
        this.selectedReferences.add(ref.id);
      });
    }
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
    ];
  }

  get selectedReferencesArray(): ReferenceData[] {
    return this.references.filter(ref => this.selectedReferences.has(ref.id));
  }

  trackByReferenceId(index: number, reference: ReferenceData): string {
    return reference.id;
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
      isEditing: true, // Start new references in edit mode
    };
    this.references.push(newReference);
  }

  onDeleteReference(referenceId: string): void {
    this.references = this.references.filter(ref => ref.id !== referenceId);
    this.selectedReferences.delete(referenceId);
  }

  onAddExpressionPair(reference: ReferenceData): void {
    reference.expressionValuePairs.push({
      expression: "",
      value: 0,
    });
  }

  onDeleteExpressionPair(reference: ReferenceData, index: number): void {
    reference.expressionValuePairs.splice(index, 1);
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
