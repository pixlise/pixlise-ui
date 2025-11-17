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

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { combineLatest, Subscription } from "rxjs";
import { ScanConfiguration, ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { ScanItem } from "src/app/generated-protos/scan";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ActivatedRoute } from "@angular/router";
import { filterScans, sortScans } from "src/app/utils/search";
import { getScanTitle, SentryHelper } from "src/app/utils/utils";
import { Overlay, OverlayRef, PositionStrategy } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { MarkdownTooltipComponent } from "src/app/modules/pixlisecore/components/atoms/markdown-tooltip/markdown-tooltip.component";
import { Tag } from "../../../../../../generated-protos/tags";
import { TagService } from "src/app/modules/tags/services/tag.service";

@Component({
  standalone: false,
  selector: "scan-configuration",
  templateUrl: "./scan-configuration.component.html",
  styleUrls: ["./scan-configuration.component.scss"],
})
export class ScanConfigurationTabComponent implements OnInit, OnDestroy {
  @ViewChild("addScanMenuButton") addScanMenuButton!: ElementRef<HTMLButtonElement>;
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

  private tooltipOverlayRef: OverlayRef | null = null;

  filteredTagIDs: string[] = [];

  private _tags: Map<string, Tag> = new Map<string, Tag>();

  constructor(
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _route: ActivatedRoute,
    private overlay: Overlay,
    private _tagService: TagService
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
      this._tagService.tags$.subscribe(tags => {
        this._tags = tags;
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(quants => {
        this.scanQuants = quants;
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this.closeTooltip();
  }

  loadScreenConfiguration(screenConfig: ScreenConfiguration) {
    this.scanConfigurations = Object.values(JSON.parse(JSON.stringify(screenConfig.scanConfigurations)));
    this.selectedScanIds = new Set<string>();

    const quantReqs = this.scanConfigurations.map(config => {
      return this._analysisLayoutService.fetchQuantsForScanAsync(config.id);
    });

    combineLatest(quantReqs).subscribe(scans => {
      let updatedScan = false;
      scans.forEach((quants, i) => {
        const scanConfig = this.scanConfigurations[i];

        if (!scanConfig) {
          SentryHelper.logMsg(true, `scanConfigurations item ${i} is undefined/null for screen config: ${screenConfig.id}`);
          return;
        }

        this.scanQuants[scanConfig.id] = quants;

        // If the scan has quants, but no selected quant id, set the default quant
        if (!scanConfig.quantId && quants && quants.length > 0) {
          const defaultQuant = this._analysisLayoutService.getDefaultQuant(quants);

          if (defaultQuant) {
            scanConfig.quantId = defaultQuant.id;
            updatedScan = true;
          }
        }
      });

      this.sortScans();
      if (updatedScan) {
        this.hasConfigChanged = true;
        this.onSave();
      } else {
        this.hasConfigChanged = false;
      }
    });
  }

  // Sorts the scan configurations list
  private sortScans() {
    // Only sort if we have scans and idToScan
    if (this.scanConfigurations && this.scanConfigurations.length > 0 && this.idToScan && Object.keys(this.idToScan).length > 0) {
      this.scanConfigurations.sort((a, b) => {
        const scanA = this.idToScan?.[a?.id];
        const scanB = this.idToScan?.[b?.id];

        const solA = Number(scanA?.meta?.["Sol"]);
        const solB = Number(scanB?.meta?.["Sol"]);

        if (isNaN(solA) && !isNaN(solB)) {
          return 1;
        } else if (!isNaN(solA) && isNaN(solB)) {
          return -1;
        } else if (!isNaN(solA) && !isNaN(solB)) {
          return solA - solB;
        } else {
          if (scanA && scanB) {
            return scanA.title < scanB.title ? -1 : scanA.title > scanB.title ? 1 : 0;
          } else {
            return scanA && !scanB ? -1 : !scanA && scanB ? 1 : 0;
          }
        }
      });
    }
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

  onTagFilterChanged(tagIDs: string[]) {
    this.filteredTagIDs = tagIDs;
    this.onSearchAddScanList(this._scanSearchText);
  }

  onSearchAddScanList(text: string) {
    const filtered = filterScans(text, [], this.filteredTagIDs, this.allScans);
    this.addScanList = sortScans(filtered);
  }

  onAddScan(scanId: string) {
    const scan = this.idToScan[scanId];
    if (!scan || this.scanConfigurations.find(config => config.id === scanId)) {
      return;
    }

    setTimeout(() => {
      this.scanSearchText = "";
      this.filteredTagIDs = [];
    }, 10);

    this._analysisLayoutService.fetchQuantsForScan(scanId, quants => {
      this.scanQuants[scanId] = quants;
      if (quants) {
        let defaultQuant = this._analysisLayoutService.getDefaultQuant(quants);

        if (defaultQuant) {
          this.scanConfigurations.push(ScanConfiguration.create({ id: scanId, quantId: defaultQuant.id }));
        } else {
          this.scanConfigurations.push(ScanConfiguration.create({ id: scanId }));
        }
      } else {
        this.scanConfigurations.push(ScanConfiguration.create({ id: scanId }));
      }

      this.selectedScanIds.add(scanId);

      // Save the configuration
      this.hasConfigChanged = true;
      this.onSave();
    });
  }

  onRemoveConfiguration(scanId: string) {
    this.scanConfigurations = this.scanConfigurations.filter(config => config.id !== scanId);
    this.selectedScanIds.delete(scanId);
    this.hasConfigChanged = true;
  }

  updateConfig(config: ScanConfiguration) {
    const index = this.scanConfigurations.findIndex(c => c.id === config.id);
    if (index >= 0) {
      this.scanConfigurations[index] = config;
      this.hasConfigChanged = true;
      this.onSave();
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

    this.dialog.openDialogs.forEach(dialog => {
      dialog.close();
    });

    this.closeTooltip();
    (this.addScanMenuButton as any)?.close();
  }

  getScanTitle(scan: ScanItem): string {
    // Provide the util function
    return getScanTitle(scan);
  }

  trackByScanId(index: number, scan: ScanItem): string {
    return scan.id;
  }

  getTagTitle(tagId: string): string {
    return this._tags.get(tagId)?.name ?? "";
  }

  getShortDescription(description: string): string {
    if (!description) return "";
    const maxLength = 100;
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  }

  onScanItemHover(scan: ScanItem, event: MouseEvent) {
    if (!scan.description) return;
    
    const target = event.currentTarget as HTMLElement;
    this.openTooltip(`# ${this.getScanTitle(scan)}\n\n${scan.description}`, target);
  }

  onScanItemLeave() {
    this.closeTooltip();
  }

  private openTooltip(content: string, origin: HTMLElement) {
    if (this.tooltipOverlayRef) return;

    const positionStrategy = this.getTooltipPositionStrategy(origin);
    this.tooltipOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false,
    });

    const portal = new ComponentPortal(MarkdownTooltipComponent);
    const componentRef = this.tooltipOverlayRef.attach(portal);
    componentRef.instance.content = content;
  }

  private closeTooltip() {
    if (this.tooltipOverlayRef) {
      this.tooltipOverlayRef.dispose();
      this.tooltipOverlayRef = null;
    }
  }

  private getTooltipPositionStrategy(origin: HTMLElement): PositionStrategy {
    return this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions([
        {
          originX: "end",
          originY: "center",
          overlayX: "start",
          overlayY: "center",
          offsetX: 8,
        },
        {
          originX: "start",
          originY: "center",
          overlayX: "end",
          overlayY: "center",
          offsetX: -8,
        },
        {
          originX: "end",
          originY: "bottom",
          overlayX: "start",
          overlayY: "top",
          offsetX: 8,
        },
      ]);
  }
}
