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

import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { ScanCalibrationConfiguration, ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { ScanItem } from "src/app/generated-protos/scan";
import {
  EnergyCalibrationData,
  SpectrumEnergyCalibrationComponent,
  SpectrumEnergyCalibrationResult,
} from "src/app/modules/spectrum/widgets/spectrum-chart-widget/spectrum-energy-calibration/spectrum-energy-calibration.component";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { COLOURS, ColourOption } from "src/app/modules/roi/models/roi-colors";
import { ReplaceScanDialogComponent, ReplaceScanDialogData } from "./replace-scan-dialog/replace-scan-dialog.component";

@Component({
  standalone: false,
  selector: "scan-configuration-item",
  templateUrl: "./scan-configuration-item.component.html",
  styleUrls: ["./scan-configuration-item.component.scss"],
})
export class ScanConfigurationItemComponent implements OnDestroy {
  private _subs: Subscription = new Subscription();

  @Input() config: ScanConfiguration = ScanConfiguration.create();
  @Input() scan: ScanItem = ScanItem.create();
  @Input() colorOptions: ColourOption[] = COLOURS;

  @Output() removeConfiguration = new EventEmitter();
  @Output() updateConfig = new EventEmitter<ScanConfiguration>();

  constructor(
    public dialog: MatDialog,
    private _energyCalibrationService: EnergyCalibrationService
  ) {}

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onCalibration(scanId: string) {
    const dialogConfig = new MatDialogConfig<EnergyCalibrationData>();

    dialogConfig.data = {
      draggable: true,
      scanQuants: new Map<string, string>([[scanId, this.config.quantId]]),
      xAxisEnergyScale: !!this.config.calibrations && this.config.calibrations.length > 0,
      hideXAxisEnergyScaleToggle: true,
    };

    const dialogRef = this.dialog.open(SpectrumEnergyCalibrationComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: SpectrumEnergyCalibrationResult) => {
      if (result) {
        // Set the calibration in service and in our model
        for (const [scanId, cal] of result.calibrationForScans.entries()) {
          this._energyCalibrationService.setCurrentCalibration(scanId, cal);
          this.config.calibrations = cal;
          this.updateConfig.emit(this.config);
        }
      }
    });
  }

  getSemiTransparentColour(colour: string): string {
    if (colour.startsWith("#") && colour.length === 7) {
      return colour + "80";
    } else if (colour.startsWith("#") && colour.length === 9) {
      return colour.slice(0, 7) + "80";
    } else if (colour.startsWith("rgba")) {
      return colour.replace(/,[01](?:\.[0-9]*)?\)/, ",0.5)");
    } else if (colour.startsWith("rgb")) {
      return colour.replace(")", ",0.5)").replace("rgb", "rgba");
    } else {
      return "";
    }
  }

  get semiTransparentSelectedColour(): string {
    return this.getSemiTransparentColour(this.config.colour);
  }

  onSelectColor(color: ColourOption) {
    this.config.colour = color.colour;
    this.updateConfig.emit(this.config);
  }

  clearColor() {
    this.config.colour = "";
    this.updateConfig.emit(this.config);
  }

  onSelectQuantForScan(quantId: string, scanId: string) {
    this.config.quantId = quantId;
    this.updateConfig.emit(this.config);
  }

  onRemoveConfiguration() {
    this.removeConfiguration.emit();
  }

  getCalibrationDisplayText(calibrations: ScanCalibrationConfiguration[]): string {
    let text = "";
    calibrations.forEach(calibration => {
      const detectorCalibration = `${calibration.detector}: (${calibration.eVstart.toFixed(3)}, ${calibration.eVperChannel.toFixed(3)})`;
      text += `${detectorCalibration}\n`;
    });
    return text;
  }

  onReplaceScan() {
    const dialogConfig = new MatDialogConfig<ReplaceScanDialogData>();

    dialogConfig.data = {
      scanId: this.scan.id,
    };

    const dialogRef = this.dialog.open(ReplaceScanDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(result => {});
  }
}
