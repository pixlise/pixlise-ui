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

export type EnergyCalibrationData = {
  draggable?: boolean;
  scanIds?: string[];
};

export class SpectrumEnergyCalibrationResult {
  constructor(
    public calibrationForScans: Map<string, SpectrumEnergyCalibration[]>,
    public useCalibration: boolean = true
  ) {}
}

class CalibrationSource {
  constructor(
    public name: string,
    public enabled: boolean
  ) {}
}

const sourceDataset = "Dataset File";
const sourceNone = "None";
const sourceCustom = "Custom";
const sourceQuant = "Current Quantification";

@Component({
  selector: "spectrum-energy-calibration",
  templateUrl: "./spectrum-energy-calibration.component.html",
  styleUrls: ["./spectrum-energy-calibration.component.scss"],
})
export class SpectrumEnergyCalibrationComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  allScans: ScanItem[] = [];
  private _visibleScanId: string = "";

  eVStartA: string = "";
  eVPerChannelA: string = "";

  eVStartB: string = "";
  eVPerChannelB: string = "";

  xAxisEnergyScale: boolean = false;

  sources: CalibrationSource[] = [];
  selectedSource: string = "";

  // Stuff we load
  private _scanCalibrations = new Map<string, SpectrumEnergyCalibration[]>();
  private _currentCalibrations = new Map<string, SpectrumEnergyCalibration[]>();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _energyCalibrationService: EnergyCalibrationService,
    public dialogRef: MatDialogRef<SpectrumEnergyCalibrationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EnergyCalibrationData
  ) {}

  ngOnInit(): void {
    this._visibleScanId = this._analysisLayoutService.defaultScanId;

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = [];
        if (!this.data.scanIds) {
          return;
        }

        for (const scan of scans) {
          if (this.data.scanIds.indexOf(scan.id) > -1) {
            this.allScans.push(scan);
          }
        }
      })
    );

    this.sources = [];
    this.sources.push(new CalibrationSource(sourceNone, true));
    this.sources.push(new CalibrationSource(sourceDataset, false));
    this.sources.push(new CalibrationSource(sourceQuant, false));
    this.sources.push(new CalibrationSource(sourceCustom, true));

    if (this.data.scanIds.length > 0) {
      this._visibleScanId = this.data.scanIds[0];
    }

    for (const scanId of this.data.scanIds) {
      this.readScanCalibration(scanId);
    }

    if (!this.xAxisEnergyScale) {
      this.selectedSource = sourceNone;
    } //else setScan will take care of it when the observables complete
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  readScanCalibration(scanId: string) {
    combineLatest([
      this._energyCalibrationService.getScanCalibration(scanId),
      this._energyCalibrationService.getCurrentCalibration(scanId),
      //this._energyCalibrationService.getQuantCalibration(), TODO!
    ]).subscribe(cals => {
      const scanCalibration = cals[0] as SpectrumEnergyCalibration[];
      const currentCalibration = cals[1] as SpectrumEnergyCalibration[];

      // Save it
      this._scanCalibrations.set(scanId, scanCalibration);
      this._currentCalibrations.set(scanId, currentCalibration);

      if (this._visibleScanId == scanId) {
        this.setCalibration(currentCalibration, scanCalibration);
      }
    });
  }

  private setCalibration(
    currentCalibration: SpectrumEnergyCalibration[],
    scanCalibration: SpectrumEnergyCalibration[]
    /*, quantCalibration: SpectrumEnergyCalibration[]*/
  ) {
    for (let c = 0; c < currentCalibration.length; c++) {
      const item = currentCalibration[c];
      if (item.detector == "A") {
        this.eVStartA = item.eVstart.toFixed(3);
        this.eVPerChannelA = item.eVperChannel.toFixed(3);
      } else {
        this.eVStartB = item.eVstart.toFixed(3);
        this.eVPerChannelB = item.eVperChannel.toFixed(3);
      }
    }

    let eq = 0;
    for (let c = 0; c < currentCalibration.length; c++) {
      if (currentCalibration[c].equals(scanCalibration[c])) {
        eq++;
      }
    }

    if (eq == scanCalibration.length) {
      this.selectedSource = sourceDataset;
      /*} else {
      eq = 0;
      for (let c = 0; c < currentCalibration.length; c++) {
        if (currentCalibration[c].equals(quantCalibration[c])) {
          eq++;
        }
      }

      if (eq == scanCalibration.length) {
        this.selectedSource = sourceQuant;
      }*/
    } else {
      // We don't know where the value came from at this point so just show custom...
      this.selectedSource = sourceCustom;
    }

    // We have loaded stuff, set it enabled if possible
    for (const src of this.sources) {
      if (src.name == sourceDataset) {
        src.enabled = scanCalibration.length > 0;
      } /*else if (src.name == sourceQuant) {
        src.enabled = quantCalibration.length > 0;
      }*/
    }
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    if (scanId == this._visibleScanId) {
      return;
    }

    // Save the previous one
    this.readUserEntry(this._visibleScanId);

    // Set the current scan
    this._visibleScanId = scanId;
    this.update();
  }

  private update() {
    // If we have loaded stuff, show...
    const currCal = this._currentCalibrations.get(this._visibleScanId);
    const scanCal = this._scanCalibrations.get(this._visibleScanId);
    if (currCal && scanCal) {
      this.setCalibration(currCal, scanCal);
    }
  }

  private readUserEntry(intoScanId: string) {
    if (this.selectedSource == sourceNone) {
      return;
    }

    // Make sure they are valid strings
    const eVStartNumA = Number.parseFloat(this.eVStartA);
    const eVPerChannelNumA = Number.parseFloat(this.eVPerChannelA);

    const eVStartNumB = Number.parseFloat(this.eVStartB);
    const eVPerChannelNumB = Number.parseFloat(this.eVPerChannelB);

    if (isNaN(eVStartNumA) || isNaN(eVPerChannelNumA) || isNaN(eVStartNumB) || isNaN(eVPerChannelNumB)) {
      alert("Please enter a number for eV Start and eV per channel for each detector.");
      return;
    }

    if (eVPerChannelNumA <= 0 || eVPerChannelNumB <= 0) {
      alert("eV per channel values must be greater than 0");
      return;
    }

    // Read them into whatever scan ID is asked
    this._scanCalibrations.set(intoScanId, [
      new SpectrumEnergyCalibration(eVStartNumA, eVPerChannelNumA, "A"),
      new SpectrumEnergyCalibration(eVStartNumB, eVPerChannelNumB, "B"),
    ]);
  }

  get calibrationIcon(): string {
    if (this.selectedSource == sourceNone) {
      return "assets/button-icons/disabled-gray.svg";
    }

    return "assets/button-icons/yellow-tick.svg";
  }

  get editDisabled(): boolean {
    return this.selectedSource != sourceCustom;
  }

  onSwitchSource(event /*: MatSelectChange*/): void {
    this.selectedSource = event.value;

    if (event.value == sourceDataset) {
      this._currentCalibrations = this._scanCalibrations;
      this.update();
    } else if (event.value == sourceQuant) {
      this.update();
    } else {
      this.eVStartA = "";
      this.eVPerChannelA = "";

      this.eVStartB = "";
      this.eVPerChannelB = "";
    }
  }

  onValueChanged(): void {
    //if (this.eVChanged()) {
    //   We no longer do this - if it's not on custom, the text boxes are disabled
    //  this.selectedSource = sourceCustom;
    //}
  }

  private resetToQuant(): void {
    /*this.eVStartA = energyCal.eVCalibrationFromQuantA.eVstart.toFixed(3);
    this.eVPerChannelA = energyCal.eVCalibrationFromQuantA.eVperChannel.toFixed(3);

    this.eVStartB = energyCal.eVCalibrationFromQuantB.eVstart.toFixed(3);
    this.eVPerChannelB = energyCal.eVCalibrationFromQuantB.eVperChannel.toFixed(3);*/
  }
  /*
  private resetToScan(): void {
    if (this._scanCalibration.length > 0) {
      for (const scanCal of this._scanCalibration) {
        if (scanCal.detector == "A") {
          this.eVStartA = scanCal.eVstart.toFixed(3);
          this.eVPerChannelA = scanCal.eVperChannel.toFixed(3);
        } else {
          this.eVStartB = scanCal.eVstart.toFixed(3);
          this.eVPerChannelB = scanCal.eVperChannel.toFixed(3);
        }
      }
    }
  }
*/
  onApply(): void {
    const result = new SpectrumEnergyCalibrationResult(
      this._scanCalibrations,
      // This one applies to the chart directly
      this.selectedSource != sourceNone
    );

    this.dialogRef.close(result);
  }
}
