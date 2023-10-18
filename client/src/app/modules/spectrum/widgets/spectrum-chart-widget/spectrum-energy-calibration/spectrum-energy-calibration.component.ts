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

import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Subscription, combineLatest, filter } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { SingleScanEnergyCalibration } from "./single-scan-energy-calibration/single-scan-energy-calibration.component";

export type EnergyCalibrationData = {
  draggable?: boolean;
  scanIds?: string[];
  xAxisEnergyScale?: boolean;
};

export class SpectrumEnergyCalibrationResult {
  constructor(
    public calibrationForScans: Map<string, SpectrumEnergyCalibration[]>,
    public useCalibration: boolean = true
  ) {}
}

@Component({
  selector: "spectrum-energy-calibration",
  templateUrl: "./spectrum-energy-calibration.component.html",
  styleUrls: ["./spectrum-energy-calibration.component.scss"],
})
export class SpectrumEnergyCalibrationComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  allScans: SingleScanEnergyCalibration[] = [];

  xAxisEnergyScale: boolean = false;

  constructor(
    private _energyCalibrationService: EnergyCalibrationService,
    private _analysisLayoutService: AnalysisLayoutService,
    public dialogRef: MatDialogRef<SpectrumEnergyCalibrationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EnergyCalibrationData
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.xAxisEnergyScale !== undefined) {
      this.xAxisEnergyScale = this.data.xAxisEnergyScale;
    }

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = [];
        if (!this.data.scanIds) {
          return;
        }

        for (const scan of scans) {
          if (this.data.scanIds.indexOf(scan.id) > -1) {
            this._energyCalibrationService.getCurrentCalibration(scan.id).subscribe(cal => {
              this.allScans.push(new SingleScanEnergyCalibration(scan, cal));
            });
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get calibrationIcon(): string {
    if (!this.xAxisEnergyScale) {
      return "assets/button-icons/disabled-gray.svg";
    }

    return "assets/button-icons/yellow-tick.svg";
  }

  onApply(): void {
    const items = new Map<string, SpectrumEnergyCalibration[]>();
    for (const scan of this.allScans) {
      items.set(scan.scan.id, scan.calibration);
    }

    const result = new SpectrumEnergyCalibrationResult(
      items,
      // This one applies to the chart directly
      this.xAxisEnergyScale
    );

    this.dialogRef.close(result);
  }
}
