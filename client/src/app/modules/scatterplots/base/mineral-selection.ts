import { ElementRef } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { RGBUMineralRatios } from "../widgets/rgbu-plot-widget/rgbu-plot-data";
import { PickerDialogItem, PickerDialogData } from "../../pixlisecore/components/atoms/picker-dialog/picker-dialog.component";
import { PickerDialogComponent } from "../../pixlisecore/pixlisecore.module";

export function selectMinerals(dialog: MatDialog, currentTarget: Element | undefined, mineralsShown: string[], callback: (minerals: string[]) => void): void {
  const dialogConfig = new MatDialogConfig();

  const items: PickerDialogItem[] = [];
  items.push(new PickerDialogItem("", "Minerals", "", true));

  for (const m of RGBUMineralRatios.names) {
    items.push(new PickerDialogItem(m, m, "", true));
  }

  dialogConfig.data = new PickerDialogData(true, true, true, false, items, mineralsShown, "", currentTarget ? new ElementRef(currentTarget) : undefined);

  const dialogRef = dialog.open(PickerDialogComponent, dialogConfig);
  dialogRef.componentInstance.onSelectedIdsChanged.subscribe(callback);
}
