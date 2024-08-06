import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { MinMax } from "../../../../../models/BasicTypes";

export type RangeSelectData = {
  bounds: MinMax;
  min: number;
  max: number;
};

@Component({
  selector: "range-select-dialog",
  templateUrl: "./range-select-dialog.component.html",
  styleUrls: ["./range-select-dialog.component.scss"],
})
export class RangeSelectDialogComponent {
  private _subs: Subscription = new Subscription();

  @Output() onRangeUpdate = new EventEmitter<MinMax>();
  @Output() onRangeCopy = new EventEmitter();

  private _minRange: number = 0;
  private _maxRange: number = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RangeSelectData,
    public dialogRef: MatDialogRef<RangeSelectDialogComponent, void>
  ) {
    this.minRange = Math.round(data.min * 100) / 100;
    this.maxRange = Math.round(data.max * 100) / 100;
  }

  get minRange() {
    return this._minRange;
  }

  set minRange(value: number) {
    this._minRange = value;
    if (value && this.maxRange) {
      let valueRange = new MinMax(this._minRange, this.maxRange);
      this.onRangeUpdate.emit(valueRange);
    }
  }

  set dragMinRange(value: number) {
    this._minRange = value;
  }

  get maxRange() {
    return this._maxRange;
  }

  set maxRange(value: number) {
    this._maxRange = value;

    if (value && this.minRange) {
      this.onRangeUpdate.emit(new MinMax(this._minRange, this._maxRange));
    }
  }

  set dragMaxRange(value: number) {
    this._maxRange = value;
  }

  get minBound() {
    return this.data.bounds?.min ?? 0;
  }

  get maxBound() {
    return this.data.bounds?.max ?? 0;
  }

  ngOnInit() {}

  onClose() {
    this.dialogRef.close();
  }

  onCopy() {
    this.onRangeCopy.emit();
  }
}
