import { Component, HostListener, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

export interface ConfirmInputDialogData {
  confirmInputText: string;
  inputPlaceholder?: string;
  title?: string;
  confirmButtonText?: string;
  middleButtonText?: string;
}

export interface ConfirmInputDialogResult {
  confirmed: boolean;
  value: string;
  middleButtonClicked: boolean;
}

@Component({
  selector: "confirm-input-dialog",
  templateUrl: "./confirm-input-dialog.component.html",
  styleUrls: ["./confirm-input-dialog.component.scss"],
})
export class ConfirmInputDialogComponent {
  value: string = "";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmInputDialogData,
    public dialogRef: MatDialogRef<ConfirmInputDialogComponent, ConfirmInputDialogResult>
  ) {}

  onCancel(): void {
    this.dialogRef.close({ confirmed: false, value: "", middleButtonClicked: false });
  }

  onMiddleButton(): void {
    this.dialogRef.close({ confirmed: true, value: this.value, middleButtonClicked: true });
  }

  onConfirm(): void {
    this.dialogRef.close({ confirmed: true, value: this.value, middleButtonClicked: false });
  }

  // listen for enter key to confirm
  @HostListener("document:keydown.enter", ["$event"])
  onKeydown(event: any) {
    if (event.key === "Enter") {
      this.onConfirm();
    }
  }
}
