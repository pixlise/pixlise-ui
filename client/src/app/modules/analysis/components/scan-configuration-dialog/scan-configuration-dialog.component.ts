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
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { Subscription } from "rxjs";
import { ScanCalibrationConfiguration, ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { MatTableDataSource } from "@angular/material/table";
import { ScanItem } from "src/app/generated-protos/scan";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import {
  SpectrumEnergyCalibrationComponent,
  SpectrumEnergyCalibrationResult,
} from "src/app/modules/spectrum/widgets/spectrum-chart-widget/spectrum-energy-calibration/spectrum-energy-calibration.component";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { ActivatedRoute, Router } from "@angular/router";

export type ScanConfigurationDialogData = {
  writeToQueryParams?: boolean;
};

@Component({
  selector: "scan-configuration-dialog",
  templateUrl: "./scan-configuration-dialog.component.html",
  styleUrls: ["./scan-configuration-dialog.component.scss"],
})
export class ScanConfigurationDialog implements OnInit {
  private _subs: Subscription = new Subscription();

  scanConfigurations: ScanConfiguration[] = [];

  scanConfigurationsSource = new MatTableDataSource([] as ScanConfiguration[]);
  columnIDs: string[] = ["delete", "id", "name", "quantId", "calibrations"];

  allScans: ScanItem[] = [];
  scanQuants: Record<string, QuantificationSummary[]> = {};

  selectedScanIds: Set<string> = new Set<string>();
  idToScan: Record<string, ScanItem> = {};

  writeQueryParams: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ScanConfigurationDialogData,
    public dialogRef: MatDialogRef<ScanConfigurationDialog>,
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {
    if (data && data.writeToQueryParams) {
      this.writeQueryParams = true;
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        this.scanConfigurations = Object.values(screenConfig.scanConfigurations);
        this.scanConfigurationsSource.data = this.scanConfigurations;
        this.selectedScanIds = new Set<string>();
        this.scanConfigurations.forEach(config => {
          this.selectedScanIds.add(config.id);
          this._analysisLayoutService.fetchQuantsForScan(config.id);
        });
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        this.idToScan = {};
        scans.forEach(scan => {
          this.idToScan[scan.id] = scan;
        });
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(quants => {
        this.scanQuants = quants;
      })
    );

    // Listen to query params and populate with these if we dont have an active screen config
    this._subs.add(
      this._route.queryParams.subscribe(params => {
        if (this.writeQueryParams) {
          if (params["scanId"]) {
            this.onAddScan(params["scanId"]);
            if (params["quantId"]) {
              this.onSelectQuantForScan(params["quantId"], params["scanId"]);
            }
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onCalibration(scanId: string) {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.data = {
      draggable: true,
      scanIds: [scanId],
      hideXAxisEnergyScaleToggle: true,
    };

    const dialogRef = this.dialog.open(SpectrumEnergyCalibrationComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: SpectrumEnergyCalibrationResult) => {
      if (result) {
        // Set the calibration in service and in our model
        for (const [scanId, cal] of result.calibrationForScans.entries()) {
          this._energyCalibrationService.setCurrentCalibration(scanId, cal);

          this.scanConfigurations.forEach((config, i) => {
            if (config.id === scanId) {
              this.scanConfigurations[i].calibrations = cal;
              this.scanConfigurationsSource.data = this.scanConfigurations;
            }
          });
        }
      }
    });
  }

  onSelectQuantForScan(quantId: string, scanId: string) {
    let scanConfig = this.scanConfigurations.find(config => config.id === scanId);
    if (!scanConfig) {
      return;
    }

    scanConfig.quantId = quantId;
  }

  onAddScan(scanId: string) {
    let scan = this.idToScan[scanId];
    if (!scan || this.scanConfigurations.find(config => config.id === scanId)) {
      return;
    }

    this._analysisLayoutService.fetchQuantsForScan(scanId);

    this.scanConfigurations.push(ScanConfiguration.create({ id: scanId }));
    this.scanConfigurationsSource.data = this.scanConfigurations;
    this.selectedScanIds.add(scanId);
  }

  onRemoveConfiguration(scanId: string) {
    this.scanConfigurations = this.scanConfigurations.filter(config => config.id !== scanId);
    this.scanConfigurationsSource.data = this.scanConfigurations;
    this.selectedScanIds.delete(scanId);
  }

  getCalibrationDisplayText(calibrations: ScanCalibrationConfiguration[]): string {
    let text = "";
    calibrations.forEach(calibration => {
      let detectorCalibration = `${calibration.detector}: (${calibration.eVstart.toFixed(3)}, ${calibration.eVperChannel.toFixed(3)})`;
      text += `${detectorCalibration}\n`;
    });
    return text;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get firstSelectedScanId(): string {
    return Array.from(this.selectedScanIds)[0] || "";
  }

  get firstSelectedScanQuantId(): string {
    let scanId = this.firstSelectedScanId;
    if (!scanId) {
      return "";
    }

    return this.scanConfigurations.find(config => config.id === scanId)?.quantId || "";
  }

  onSave(): void {
    if (!this.writeQueryParams) {
      let screenConfig = this._analysisLayoutService.activeScreenConfiguration$.value;
      if (!screenConfig) {
        return;
      }

      screenConfig.scanConfigurations = {};
      this.scanConfigurations.forEach(config => {
        screenConfig.scanConfigurations[config.id] = config;
      });

      this._analysisLayoutService.writeScreenConfiguration(screenConfig);
      this.dialogRef.close();
    } else {
      if (this.firstSelectedScanId && this.firstSelectedScanQuantId) {
        let queryParams = { ...this._route.snapshot.queryParams };
        queryParams["scanId"] = this.firstSelectedScanId;
        queryParams["quantId"] = this.firstSelectedScanQuantId;
        this._router.navigate([], { queryParams });
        this.dialogRef.close();
      }
    }
  }
}
