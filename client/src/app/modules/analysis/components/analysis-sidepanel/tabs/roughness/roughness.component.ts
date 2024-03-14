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

import { Component, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { DiffractionTabComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/diffraction.component";
import {
  UserPromptDialogComponent,
  UserPromptDialogParams,
  UserPromptDialogResult,
  UserPromptDialogStringItem,
} from "src/app/modules/pixlisecore/components/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { RoughnessItem } from "src/app/modules/pixlisecore/models/diffraction";
// import { BeamSelection } from "src/app/models/BeamSelection";
// import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
// import { AuthenticationService } from "src/app/services/authentication.service";
// import { ContextImageService } from "src/app/services/context-image.service";
// import { DataExpressionService } from "src/app/services/data-expression.service";
// import { DataExpressionId } from "src/app/models/Expression";
// import { DataSetService } from "src/app/services/data-set.service";
// import { DiffractionPeak, DiffractionPeakService, RoughnessItem, UserDiffractionPeak, UserRoughnessItem } from "src/app/services/diffraction-peak.service";
// import { SelectionService } from "src/app/services/selection.service";
// import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
// import { UserPromptDialogComponent, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "src/app/UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
// import { LayerManager } from "src/app/UI/context-image-view-widget/layer-manager";
// import { DiffractionComponent } from "../diffraction/diffraction.component";

@Component({
  selector: "app-roughness",
  templateUrl: "./roughness.component.html",
  styleUrls: ["./roughness.component.scss", "../diffraction/diffraction.component.scss"],
})
export class RoughnessComponent implements OnInit {
  private _subs = new Subscription();

  private _selectedScanId: string = "";
  public selectedScan: ScanItem = ScanItem.create();
  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  roughnessItems: RoughnessItem[] = [];
  userRoughnessItems: RoughnessItem[] = [];

  private _allRoughnessItems: RoughnessItem[] = [];
  private _visiblePeakId: string = "";

  sortModePMC = "PMC";
  sortModeGlobalDiff = "Global Difference";

  private _sortCriteria: string = this.sortModeGlobalDiff;
  private _sortAscending: boolean = false;

  isMapShown: boolean = false;
  //   private _roughnessLayer: LocationDataLayerProperties = null;

  userPeakEditing: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (!this.selectedScanId && scans.length > 0) {
          this.selectedScanId = this._analysisLayoutService.defaultScanId || scans[0].id;
        }

        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }
      })
    );
  }

  get selectedScanId() {
    return this._selectedScanId;
  }

  set selectedScanId(value: string) {
    this._selectedScanId = value;
    this.selectedScan = this.allScans.find(scan => scan.id === value) || ScanItem.create();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onShowMap() {
    this.isMapShown = !this.isMapShown;
  }

  get visiblePeakId(): string {
    return this._visiblePeakId;
  }

  get sort(): string {
    return this._sortCriteria;
  }

  set sort(criteria: string) {
    if (criteria == this._sortCriteria) {
      // Same column, user is just changing sort order
      this._sortAscending = !this._sortAscending;
    } else {
      this._sortCriteria = criteria;
      this._sortAscending = true;
    }

    this.updateDisplayList();
  }

  // Detected (automated) roughness (from Diffraction DB)
  onTogglePeakVisible(item: RoughnessItem) {
    this.roughnessClicked(item.pmc, item.id);
  }

  onClickPeakItem(item: RoughnessItem) {
    this.onTogglePeakVisible(item);
  }

  onDeletePeak(item: RoughnessItem) {
    // if (!confirm("Are you sure you want to delete roughness for PMC " + item.pmc + "?")) {
    //   return;
    // }
    // this._diffractionService.setPeakStatus(item.id, DiffractionPeak.statusNotAnomaly, this._datasetService.datasetIDLoaded).subscribe(
    //   () => {},
    //   err => {
    //     alert("Failed to delete roughness: " + item.id);
    //   }
    // );
  }

  // User-entered roughness
  onAddPeak() {
    if (!this.selectedScan) {
      return;
    }

    let scanPMCMin: number = 0;
    let scanPMCMax: number = 0;

    const pmcLabel = "PMC (between " + scanPMCMin + " and " + scanPMCMax + ")";

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new UserPromptDialogParams("Indicate a PMC that has roughness", "Add", "Cancel", [
      new UserPromptDialogStringItem(pmcLabel, (val: string) => {
        let pmcI = Number.parseInt(val);
        return !isNaN(pmcI) && pmcI >= scanPMCMin && pmcI <= scanPMCMax;
      }),
    ]);

    //dialogConfig.backdropClass = 'empty-overlay-backdrop';

    const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: UserPromptDialogResult) => {
      // Might've cancelled!
      if (result) {
        // Create a new diffraction peak value
        let val = result.enteredValues.get(pmcLabel);
        // let pmc = Number.parseInt(val);

        // this._diffractionService.addDiffractionPeak(pmc, -1, this._datasetService.datasetIDLoaded).subscribe(
        //   (result: Map<string, UserDiffractionPeak>) => {},
        //   err => {
        //     alert("Failed to add diffraction peak: " + err.error);
        //   }
        // );
      }
    });
  }

  onClickUserPeakItem(item: RoughnessItem) {
    this.onToggleUserPeakVisible(item);
  }

  onToggleUserPeakVisible(item: RoughnessItem) {
    this.roughnessClicked(item.pmc, item.id);
  }

  onDeleteUserPeak(item: RoughnessItem) {
    // if (confirm("Are you sure you want to delete this manually entered roughness PMC?")) {
    //   this._diffractionService.deleteDiffractionPeak(item.id, this._datasetService.datasetIDLoaded).subscribe(
    //     (result: Map<string, UserDiffractionPeak>) => {},
    //     err => {
    //       alert("Failed to delete roughness PMC: " + err.error);
    //     }
    //   );
    // }
  }

  private roughnessClicked(pmc: number, itemID: string): void {
    // // If already visible, turn off
    // if (this._visiblePeakId == itemID) {
    //   this._visiblePeakId = "";
    //   // NOTE: We don't clear the selection here...
    //   // But we do clear the band drawn
    //   if (this._spectrumService.mdl) {
    //     this._spectrumService.mdl.showDiffractionPeaks([]);
    //   }
    //   return;
    // }
    // this._visiblePeakId = itemID;
    // // Select this PMC, this way the spectrum chart will show the A/B lines
    // let locIdx = this._datasetService.datasetLoaded.pmcToLocationIndex.get(pmc);
    // if (locIdx != undefined) {
    //   // Select
    //   this._selectionService.setSelection(this._datasetService.datasetLoaded, new BeamSelection(this._datasetService.datasetLoaded, new Set([locIdx])), null);
    //   // Also set the hover point to this, so purple spot is more visible on other widgets
    //   this._selectionService.setHoverPMC(pmc);
    // }
    // if (this._spectrumService.mdl) {
    //   // No bands to show here, we apply to the whole spectrum
    //   this._spectrumService.mdl.showDiffractionPeaks([]);
    //   // Show the whole spectrum (taken out so if zoomed in, it'll stay there)
    //   //this._spectrumService.mdl.transform.reset();
    // }
  }

  private updateDisplayList() {
    this._allRoughnessItems.sort((a: RoughnessItem, b: RoughnessItem) => {
      let aValue = a.pmc;
      let bValue = b.pmc;

      if (this._sortCriteria == this.sortModeGlobalDiff) {
        aValue = a.globalDifference;
        bValue = b.globalDifference;
      }

      if (aValue < bValue) {
        return -1;
      }
      if (aValue > bValue) {
        return 1;
      }

      return 0;
    });

    if (this._sortAscending) {
      this._allRoughnessItems.reverse();
    }

    this.roughnessItems = [];
    for (let peak of this._allRoughnessItems) {
      if (!peak.deleted) {
        // We ignore ones that have been set to not-anomaly, these have been "deleted" by users
        this.roughnessItems.push(peak);
      }

      if (this.roughnessItems.length > DiffractionTabComponent.tableRowLimit) {
        break;
      }
    }
  }
}
