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

import { Component, Inject, OnInit, OnDestroy } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig, MatDialog } from "@angular/material/dialog";
import { Observable, Subscription, map, of, throwError } from "rxjs";
import { DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { QuantCreateParams } from "src/app/generated-protos/quantification-meta";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { QuantModes } from "src/app/models/Quantification";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIPickerData, ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { decodeIndexList, encodeIndexList, isValidElementsString } from "src/app/utils/utils";

export class QuantificationStartOptionsParams {
  constructor(
    public scanIds: string[],
    public defaultCommand: string,
    public atomicNumbers: Set<number>
  ) {}
}

// The resulting quantification parameters, these are the ones directly passed to the API
// for creating a quant, so this has to match the API struct!
// We used to return a class called QuantCreateParameters but now we return protos.QuantCreateParams

class QuantModeItem {
  constructor(
    public id: string,
    public label: string
  ) {}
}

@Component({
  selector: "app-quantification-start-options",
  templateUrl: "./quantification-start-options.component.html",
  styleUrls: ["./quantification-start-options.component.scss"],
})
export class QuantificationStartOptionsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _roisSelected: string[] = [];
  private _roiSelectedDisplay: string = "";
  private _roiSelectedDisplayTooltip: string = "";
  private _roiNames = new Map<string, string>();
  private _roiScans = new Map<string, string>();
  private _scanNames = new Map<string, string>();
  private _detectorConfigs = new Set<string>();
  private _lastDetectorConfigReq = "";

  asCarbonates: boolean = false;
  ignoreArgon: boolean = true;
  includeDwells: boolean = true;
  ironProportion: number = 1.0;
  selectedDetectorConfig: string = "";
  singleSelectROI: boolean = true;
  parameters: string = "";
  quantName: string = "";
  elements: string = "";
  configVersions: string[] = [];

  detectorSettingLabels: string[] = ["Detectors Combined", "Detectors Separate"];
  detectorSettingChoices: string[] = [QuantModes.quantModeCombined, QuantModes.quantModeAB];
  detectorSetting: string = QuantModes.quantModeCombined;

  quantModeId: string = "PMC";
  private static _quantModes: QuantModeItem[] = [
    new QuantModeItem("PMC", "Quantify Individual PMCs"),
    new QuantModeItem("Bulk", "Homogeneous ROI (total counts)"),
    //new QuantModeItem("Bulk", "Heterogeneous ROI (counts/ms)"),
    new QuantModeItem("Fit", "Spectral Fit"),
  ];

  private _xraySourceElement: string = "";

  constructor(
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<QuantificationStartOptionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuantificationStartOptionsParams
  ) {
    if (this.data.defaultCommand) {
      this.quantModeId = this.data.defaultCommand;
    }
  }

  ngOnInit() {
    const elemSymbols = periodicTableDB.getElementSymbolsForAtomicNumbers(this.data.atomicNumbers);
    this.elements = elemSymbols.join(",");

    this.checkSingleSelectROIMode();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get currentROI(): string {
    if (this._roisSelected.length <= 0) {
      return "None Selected";
    }

    return this._roiSelectedDisplay;
  }

  get loading(): boolean {
    // Return true if we're still loading up our values
    return this.configVersions.length <= 0;
  }

  get quantModes(): QuantModeItem[] {
    return QuantificationStartOptionsComponent._quantModes;
  }

  get roiSelectedDisplayTooltip(): string {
    return this._roiSelectedDisplayTooltip;
  }

  get multiDetectorError(): boolean {
    return this._detectorConfigs.size > 1;
  }

  onSelectROI() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      draggable: false,
      liveUpdate: false,
      selectedIds: this._roisSelected,
      title: "Region To Quantify",
      singleSelect: this.singleSelectROI,
    };

    const dlgRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dlgRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      this._roisSelected = [];
      this._roiNames.clear();

      if (result && result.selectedROIs) {
        for (const roi of result.selectedROIs) {
          this._roisSelected.push(roi.id);
          this._roiNames.set(roi.id, roi.name);
          this._roiScans.set(roi.id, roi.scanId);

          // If we don't have this scan yet, get its name
          const scanName = this._scanNames.get(roi.scanId);
          if (!scanName) {
            this._cachedDataService
              .getScanList(
                ScanListReq.create({
                  searchFilters: { scanId: roi.scanId },
                })
              )
              .subscribe((resp: ScanListResp) => {
                if (resp.scans && resp.scans.length == 1) {
                  const scan = resp.scans[0];
                  this._scanNames.set(roi.scanId, scan.title);
                  this.buildSelectedROIDisplay();

                  this._detectorConfigs.add(scan.instrumentConfig);
                  this.buildDetectorConfigChoices();
                } else {
                  throw new Error(`Failed to retrieve scan: ${roi.scanId} when starting a quantification`);
                }
              });
          }
        }
      }

      this.buildSelectedROIDisplay();
    });
  }

  private buildSelectedROIDisplay() {
    this._roiSelectedDisplay = "";
    this._roiSelectedDisplayTooltip = "";

    for (const roiId of this._roisSelected) {
      let roiName = this._roiNames.get(roiId);
      if (!roiName) {
        roiName = roiId;
      }

      if (this._roiSelectedDisplayTooltip.length > 0) {
        this._roiSelectedDisplayTooltip += ", ";
      }

      let scanName = "Unknown scan";
      const roiScanId = this._roiScans.get(roiId);
      if (roiScanId) {
        scanName = this._scanNames.get(roiScanId) || scanName;
      }

      this._roiSelectedDisplayTooltip += roiName + " (scan: " + scanName + ")";
    }

    if (this._roisSelected.length > 1) {
      this._roiSelectedDisplay = this._roisSelected.length + " regions";
    } else {
      this._roiSelectedDisplay = this._roiSelectedDisplayTooltip;
      this._roiSelectedDisplayTooltip = "";
    }
  }

  buildDetectorConfigChoices() {
    if (this._lastDetectorConfigReq && this._detectorConfigs.size == 1 && this._detectorConfigs.values().next().value == this._lastDetectorConfigReq) {
      // No change so don't need to bother UI...
      return;
    }

    // Something significant has changed so reset all these and read
    this.configVersions = [];
    this.selectedDetectorConfig = "";
    this._xraySourceElement = "";

    if (this._detectorConfigs.size == 1) {
      const cfgName = this._detectorConfigs.values().next().value;
      this._lastDetectorConfigReq = cfgName; // Prevent future pointless requests
      this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: cfgName })).subscribe(
        (resp: DetectorConfigResp) => {
          if (resp.config && resp.piquantConfigVersions) {
            if (resp.config.tubeElement) {
              const elem = periodicTableDB.getElementByAtomicNumber(resp.config.tubeElement);
              this._xraySourceElement = elem?.symbol || "";
            }

            if (resp.piquantConfigVersions.length <= 0) {
              this._snackService.openError("Failed to determine PIQUANT config versions, quantification will fail.");
            } else {
              // Set these to be valid strings of config + version
              for (const ver of resp.piquantConfigVersions) {
                this.configVersions.push(cfgName + "/" + ver);
              }

              if (this.configVersions.length > 0) {
                this.selectedDetectorConfig = this.configVersions[this.configVersions.length - 1];
              }
            }
          } else {
            this._snackService.openError("Got unexpected response for configs for detector: " + cfgName);
          }
        },
        (err: Error) => {
          this._snackService.openError("Failed to refresh configs for detector: " + cfgName, err.message);
        }
      );
    } // else multiDetectorError will become true on the get()
  }

  onOK() {
    // If no quant name, don't continue
    if (this.canSetName) {
      if (this.quantName.length <= 0) {
        alert("Please enter a name for the quantification you are creating");
        return;
      }
    } else {
      // Make sure there is no name set
      this.quantName = "";
    }

    // API checks for this too but better if we don't even send it in!
    let elements = this.elements;
    if (!isValidElementsString(elements)) {
      alert("Elements string is empty or invalid. Must be composed comma-separated symbols only.");
      return;
    }

    // If we're in sum then quantify, user is selecting a range of ROIs so we don't care if the single field is not set
    if (this._roisSelected.length <= 0) { //&& this.selectedROI.length <= 0) {
      alert("Please select a region of interest (ROI)");
      return;
    }

    // If the element list contains the xray source element, this will almost definitely come up with a weird quantification, so we bring
    // up a warning
    if (
      elements.indexOf(this._xraySourceElement) > -1 &&
      !confirm(
        'You have included "' +
          this._xraySourceElement +
          '" in the quantification.\n\nThis will generate errors in PIQUANT because this element is used in construction of the instrument X-ray tube source. Either exclude the element or supply the required parameters to PIQUANT to make it work.'
      )
    ) {
      console.log("User cancelled due to element list containing xray source element");
      return;
    }

    // To tell PIQUANT to use carbonates when quantifying, we have to give it "CO3," at the start of the element list
    if (this.asCarbonates) {
      elements = "CO3," + elements;
    }

    if (this.ignoreArgon) {
      elements = "Ar_I," + elements;
    }

    let parameters = this.parameters;
    if (this.ironProportion !== null && !isNaN(this.ironProportion)) {
      parameters += "-Fe," + this.ironProportion;
    }

    // Take our multiple inputs and form a quant mode
    let quantMode = this.detectorSetting;
    if (this.quantModeId == "Bulk") {
      quantMode += this.quantModeId;
    }

    // If we have multiple scan ids involved, stop here
    if (this.data.scanIds.length != 1) {
      alert("There must only be one scan in the quantification");
      return;
    }

    let roiID = "";
    if (this._roisSelected.length == 1) {
      roiID = this._roisSelected[0];
    }
    if (PredefinedROIID.isAllPointsROI(roiID)) {
      roiID = ""; // Ensure it's empty in this case, so we behave like if none were selected
    }

    const selectedROIs: string[] = [];
    for (const id of this._roisSelected) {
      if (PredefinedROIID.isAllPointsROI(id)) {
        // Only pass up "AllPoints"
        selectedROIs.push("AllPoints");
      } else {
        selectedROIs.push(id);
      }
    }

    this.makePMCList(roiID).subscribe({
      next: (pmcs: number[]) => {
        const result: QuantCreateParams = QuantCreateParams.create({
          command: this.quantModeId == "Fit" ? "quant" : "map",
          name: this.quantName,
          scanId: this.data.scanIds[0],
          pmcs: encodeIndexList(pmcs),
          elements: elements.split(","),
          detectorConfig: this.selectedDetectorConfig,
          parameters: parameters,
          runTimeSec: 60,
          quantMode: quantMode,
          roiIDs: selectedROIs, // useful for quantMode==*Bulk, where we need to sum PMCs in an ROI before quantifying them
          includeDwells: this.includeDwells,
        });

        this.dialogRef.close(result);
      },
      error: err => {
        this._snackService.openError("Failed to create PMC list for quantification job", err);
      },
    });
  }

  private makePMCList(roiID: string): Observable<number[]> {
    if (roiID.length > 0) {
      return this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiID })).pipe(
        map((resp: RegionOfInterestGetResp) => {
          if (!resp.regionOfInterest) {
            throw new Error("makePMCList: Failed to query region of interest: " + roiID);
          }
          return decodeIndexList(resp.regionOfInterest.scanEntryIndexesEncoded);
        })
      );
    }

    // If we have multiple scan ids involved, stop here
    if (this.data.scanIds.length != 1) {
      return throwError(() => new Error("There must only be one scan in the quantification"));
    }

    // Empty ROI so request all PMCs that have spectra
    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: this.data.scanIds[0] })).pipe(
      map((resp: ScanEntryResp) => {
        const pmcs = [];
        for (const entry of resp.entries) {
          if (entry.normalSpectra || entry.dwellSpectra) {
            pmcs.push(entry.id);
          }
        }

        return pmcs;
      })
    );
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onToggleAsCarbonates(): void {
    this.asCarbonates = !this.asCarbonates;
  }

  onToggleIgnoreArgon(): void {
    this.ignoreArgon = !this.ignoreArgon;
  }

  onQuantModeChanged(event): void {
    this.checkSingleSelectROIMode();

    if (this.singleSelectROI && this._roisSelected.length > 1) {
      alert("You have multiple ROIs selected but are not in bulk quantification mode. Please choose only one ROI");
    }
  }

  get canSetName(): boolean {
    return this.quantModeId != "Fit";
  }

  private checkSingleSelectROIMode(): void {
    this.singleSelectROI = this.quantModeId != "Bulk";
  }

  onChangeDetectorSetting(event): void {
    this.detectorSetting = event;
  }

  onToggleIncludeDwells() {
    this.includeDwells = !this.includeDwells;
  }
}
