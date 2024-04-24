import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

export class LayerVisiblilityData {
  sections: LayerVisibilitySection[] = [];
}

export type LayerVisibilitySection = {
  id: string;
  title: string;
  scanId?: string;
  isOpen: boolean;
  isVisible: boolean;

  options: LayerVisibilityOption[];
};

export type LayerVisibilityOption = {
  id: string;
  name: string;
  opacity: number;
  visible: boolean;

  isSubMenuOpen?: boolean;
  subOptions?: LayerVisibilityOption[];
};

@Component({
  selector: "layer-visibility-dialog",
  templateUrl: "./layer-visibility-dialog.component.html",
  styleUrls: ["./layer-visibility-dialog.component.scss"],
})
export class LayerVisibilityDialogComponent {
  @Output() selectionChanged = new EventEmitter();

  sections: LayerVisibilitySection[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LayerVisiblilityData,
    public dialogRef: MatDialogRef<LayerVisibilityDialogComponent, void>
  ) {
    this.sections = data.sections;
    console.log("SECT", this.sections);
  }

  onLayerVisibilityChanged(layer: LayerVisibilityOption, visible: boolean) {
    layer.visible = visible;
  }

  onClose() {
    this.dialogRef.close();
  }
}
