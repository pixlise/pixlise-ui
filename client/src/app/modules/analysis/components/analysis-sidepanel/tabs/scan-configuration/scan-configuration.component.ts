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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { Subscription } from "rxjs";
import { ScanConfiguration, ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { ScanItem } from "src/app/generated-protos/scan";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ActivatedRoute } from "@angular/router";
import { SentryHelper } from "src/app/utils/utils";

@Component({
  selector: "scan-configuration",
  templateUrl: "./scan-configuration.component.html",
  styleUrls: ["./scan-configuration.component.scss"],
})
export class ScanConfigurationTabComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  scanConfigurations: ScanConfiguration[] = [];
  columnIDs: string[] = ["delete", "id", "name", "quantId", "calibrations"];

  allScans: ScanItem[] = [];
  scanQuants: Record<string, QuantificationSummary[]> = {};

  private _scanSearchText: string = "";
  addScanList: ScanItem[] = [];

  selectedScanIds: Set<string> = new Set<string>();
  idToScan: Record<string, ScanItem> = {};

  hasConfigChanged: boolean = false;

  constructor(
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        this.loadScreenConfiguration(screenConfig);
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        this.onSearchAddScanList(this._scanSearchText);
        this.idToScan = {};
        scans.forEach(scan => {
          this.idToScan[scan.id] = scan;
        });

        this.sortScans();
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(quants => {
        this.scanQuants = quants;
      })
    );
  }

  loadScreenConfiguration(screenConfig: ScreenConfiguration) {
    this.scanConfigurations = Object.values(JSON.parse(JSON.stringify(screenConfig.scanConfigurations)));
    this.selectedScanIds = new Set<string>();
    this.scanConfigurations.forEach(config => {
      this.selectedScanIds.add(config.id);
      this._analysisLayoutService.fetchQuantsForScan(config.id);
    });

    this.sortScans();
    this.hasConfigChanged = false;
  }

  private sortScans() {
    if (this.scanConfigurations && this.scanConfigurations.length > 0 && this.idToScan && Object.keys(this.idToScan).length > 0) {
      this.scanConfigurations.sort((a, b) => {
        const checkIds = [a.id, b.id];
        for (const id of checkIds) {
          const s = this.idToScan[id];
          if (!s || !s.meta || !s.meta["Sol"]) {
            SentryHelper.logMsg(true, `sortScans failed to read Sol for scan id: ${id}`)
            return -1;
          }
        }

        return Number(this.idToScan[a.id].meta?.["Sol"]) - Number(this.idToScan[b.id].meta?.["Sol"]);
      });
    } else {
      SentryHelper.logMsg(true, `sortScans failed when called with ${this.scanConfigurations.length} configs and ${Object.keys(this.idToScan).length} idToScans`);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onScanSearchMenu() {
    const searchBox = document.getElementsByClassName("scan-search");
    if (searchBox.length > 0) {
      (searchBox[0] as any).focus();
    }
  }

  onAddScanSearchClick(evt: any) {
    evt.stopPropagation();
  }

  get scanSearchText() {
    return this._scanSearchText;
  }

  set scanSearchText(value: string) {
    this._scanSearchText = value;
    this.onSearchAddScanList(value);
  }

  onSearchAddScanList(text: string) {
    this.addScanList = this.allScans.filter(scan => scan.title.toLowerCase().includes(text.toLowerCase()));
  }

  onAddScan(scanId: string) {
    const scan = this.idToScan[scanId];
    if (!scan || this.scanConfigurations.find(config => config.id === scanId)) {
      return;
    }

    setTimeout(() => {
      this.scanSearchText = "";
    }, 500);

    this._analysisLayoutService.fetchQuantsForScan(scanId);

    this.scanConfigurations.push(ScanConfiguration.create({ id: scanId }));
    this.selectedScanIds.add(scanId);
  }

  onRemoveConfiguration(scanId: string) {
    this.scanConfigurations = this.scanConfigurations.filter(config => config.id !== scanId);
    this.selectedScanIds.delete(scanId);
  }

  updateConfig(config: ScanConfiguration) {
    const index = this.scanConfigurations.findIndex(c => c.id === config.id);
    if (index >= 0) {
      this.scanConfigurations[index] = config;
      this.hasConfigChanged = true;
    }
  }

  onReset(): void {
    this.loadScreenConfiguration(this._analysisLayoutService.activeScreenConfiguration$.value);
  }

  onSave(): void {
    const screenConfig = this._analysisLayoutService.activeScreenConfiguration$.value;
    if (!screenConfig) {
      return;
    }

    this.hasConfigChanged = false;

    screenConfig.scanConfigurations = {};
    this.scanConfigurations.forEach(config => {
      screenConfig.scanConfigurations[config.id] = config;
    });

    this._analysisLayoutService.writeScreenConfiguration(screenConfig);
  }
}
