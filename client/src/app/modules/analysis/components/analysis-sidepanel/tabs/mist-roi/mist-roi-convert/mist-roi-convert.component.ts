// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
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

import { Component, Inject, OnInit } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { ROIItemSummary } from "src/app/generated-protos/roi";

export class MistROIConvertData {
  constructor(public selected: ROIItemSummary[]) {}
}

@Component({
  standalone: false,
  selector: "app-mist-roi-convert",
  templateUrl: "./mist-roi-convert.component.html",
  styleUrls: ["./mist-roi-convert.component.scss"],
})
export class MistRoiConvertComponent implements OnInit {
  public selectedROIs: ROIItemSummary[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MistROIConvertData,
    public dialogRef: MatDialogRef<MistRoiConvertComponent>,
    public dialog: MatDialog
  ) {
    this.selectedROIs = data.selected;
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConvert(shareROIs: boolean = false): void {
    if (this.selectedROIs.length > 0) {
      this.dialogRef.close({
        ids: this.selectedROIs.map(roi => roi.id),
      });
    }
  }
}
