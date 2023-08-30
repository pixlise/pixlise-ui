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

import { Component, ElementRef, Inject, OnInit, ViewContainerRef } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DetectorConfigList } from "src/app/models/BasicTypes";
import { DatasetFilter } from "../../../dataset-filter";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { positionDialogNearParent } from "src/app/utils/utils";

export class FilterDialogData {
  constructor(
    public filter: DatasetFilter,
    public triggerElementRef: ElementRef
  ) {}
}

@Component({
  selector: "app-filter-dialog",
  templateUrl: "./filter-dialog.component.html",
  styleUrls: ["./filter-dialog.component.scss"],
})
export class FilterDialogComponent implements OnInit {
  allDetectorConfigs: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FilterDialogData,
    private _envService: EnvConfigurationService,
    public dialogRef: MatDialogRef<FilterDialogComponent>,
    private _ViewContainerRef: ViewContainerRef
  ) {}

  ngOnInit(): void {
    this._envService.listConfigs().subscribe((configs: DetectorConfigList) => {
      this.allDetectorConfigs = ["", ...configs.configNames];
    });
  }

  ngAfterViewInit() {
    // Move to be near the element that opened us
    if (this.data.triggerElementRef) {
      const openerRect = this.data.triggerElementRef.nativeElement.getBoundingClientRect();
      const ourWindowRect = this._ViewContainerRef.element.nativeElement.parentNode.getBoundingClientRect();

      let pos = positionDialogNearParent(openerRect, ourWindowRect);
      this.dialogRef.updatePosition(pos);
    }
  }

  get solSet(): boolean {
    return this.data.filter.solMin != null || this.data.filter.solMax != null;
  }

  get targetSet(): boolean {
    return this.data.filter.target != null;
  }

  get driveSet(): boolean {
    return this.data.filter.drive != null;
  }

  get siteSet(): boolean {
    return this.data.filter.site != null;
  }

  get detectorSet(): boolean {
    return this.data.filter.detectorChosen != null;
  }

  get dwellSet(): boolean {
    return this.data.filter.hasDwell;
  }

  get quantSet(): boolean {
    return this.data.filter.hasQuant;
  }

  get normalSet(): boolean {
    return this.data.filter.hasNormal;
  }

  get pmcsSet(): boolean {
    return this.data.filter.pmcsMin != null || this.data.filter.pmcsMax != null;
  }

  onToggleHasDwell(): void {
    this.data.filter.hasDwell = !this.data.filter.hasDwell;
  }

  onToggleHasQuant(): void {
    this.data.filter.hasQuant = !this.data.filter.hasQuant;
  }

  onToggleHasNormal(): void {
    this.data.filter.hasNormal = !this.data.filter.hasNormal;
  }

  onClear(): void {
    this.data.filter.clear();
  }

  onApply(): void {
    this.dialogRef.close(this.data.filter);
  }
}
