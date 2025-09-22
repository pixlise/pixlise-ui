import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/services/analysis-layout.service";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { parseNumberRangeString } from "src/app/utils/utils";

@Component({
  standalone: false,
  selector: "pmc-selector-dialog",
  templateUrl: "./pmc-selector-dialog.component.html",
  styleUrls: ["./pmc-selector-dialog.component.scss"],
})
export class PMCSelectorDialogComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  selectedPMCsByScan: Record<string, string> = {};

  constructor(
    public dialogRef: MatDialogRef<PMCSelectorDialogComponent>,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService
  ) {}

  ngOnInit() {
    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }

        // Initialize selected PMCs
        this.configuredScans.forEach(scan => {
          if (!this.selectedPMCsByScan[scan.id]) {
            this.selectedPMCsByScan[scan.id] = "";
          }
        });
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSelectionChange(scanId: string, pmcs: string) {
    this.selectedPMCsByScan[scanId] = pmcs;
  }

  onApply() {
    // this._selectionService.clearSelection();
    // this._selectionService.setSelection;
    // let beamSelection = BeamSelection.makeSelectionFromScanEntryPMCSets(this.selectedPMCsByScan);
    let expandedSelection: Map<string, Set<number>> = new Map();
    Object.entries(this.selectedPMCsByScan).forEach(([scanId, pmcs]) => {
      if (scanId && pmcs && pmcs.trim().length > 0) {
        let parsedPMCs = parseNumberRangeString(pmcs);
        expandedSelection.set(scanId, parsedPMCs);
      }
    });

    let beamSelection = BeamSelection.makeSelectionFromScanEntryPMCSets(expandedSelection);
    this._selectionService.setSelection(beamSelection, PixelSelection.makeEmptySelection(), true, true);

    this.dialogRef.close();
  }
}
