import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

export class SectionedSelectDialogInputs {
  selectionOptions: SubItemOptionSection[] = [];
  selectedOptions: string[] = [];
}

export type SelectedOptions = {
  selectedOptions: string[];
}

export type SubItemOptionSection = {
  title: string;
  options: { title: string; value: string }[];
};

@Component({
  selector: "sectioned-select-dialog",
  templateUrl: "./sectioned-select-dialog.component.html",
  styleUrls: ["./sectioned-select-dialog.component.scss"],
})
export class SectionedSelectDialogComponent {
  @Output() selectionChanged = new EventEmitter();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SectionedSelectDialogInputs,
    public dialogRef: MatDialogRef<SectionedSelectDialogComponent, void>
  ) {}

  get selectionOptions(): SubItemOptionSection[] {
    return this.data.selectionOptions;
  }

  get selectedOptions(): string[] {
    return this.data.selectedOptions;
  }

  onToggleSelection(value: string) {
    let newSelectedOptions = [];
    if (this.selectionChanged) {
      if (this.data.selectedOptions.includes(value)) {
        newSelectedOptions = this.data.selectedOptions.filter(option => option !== value);
      } else {
        newSelectedOptions = [...this.data.selectedOptions, value];
      }

      this.selectionChanged.emit({
        selectedOptions: newSelectedOptions,
      });

      this.data.selectedOptions = newSelectedOptions;
    }
  }

  onClearSelection() {
    this.selectionChanged.emit({ selectedOptions: [] });
    this.data.selectedOptions = [];
  }

  onClose() {
    this.dialogRef.close();
  }
}
