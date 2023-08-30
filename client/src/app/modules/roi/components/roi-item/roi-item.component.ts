import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { SnackbarService, WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";

@Component({
  selector: "roi-item",
  templateUrl: "./roi-item.component.html",
  styleUrls: ["./roi-item.component.scss"],
})
export class ROIItemComponent {
  @Input() summary!: ROIItemSummary;

  @ViewChild("settingsButton") settingsButton!: ElementRef;
  @ViewChild("editROIButton") editROIButton!: ElementRef;

  colorChangeOnly = false;
  showDetails = false;
  showScanEntryPoints = false;

  hoverPMC = -1;
  pmcPagePosition = 0;
  displaySelectedPMCs: any[] = [];

  private _name = "";
  private _description = "";

  constructor(
    private _snackBarService: SnackbarService,
    private _roiService: ROIService
  ) {}

  ngOnDestroy(): void {
    this.closeSettingsMenu();
  }

  get name(): string {
    return this._name || this.summary.name || "Unnamed";
  }

  set name(value: string) {
    this._name = value;
  }

  get description(): string {
    return this._description || this.summary.description || "";
  }

  set description(value: string) {
    this._description = value;
  }

  get color(): string {
    return "red";
  }

  get isVisible(): boolean {
    return true;
  }

  get createdDate(): number {
    return this.summary.owner?.createdUnixSec ? this.summary.owner.createdUnixSec * 1000 : 0;
  }

  get scanEntryCount(): number {
    return this.detailedInfo?.scanEntryIndexesEncoded?.length || 0;
  }

  get pixelCount(): number {
    return this.detailedInfo?.pixelIndexesEncoded?.length || 0;
  }

  get detailedInfo(): ROIItem | null {
    return this._roiService.roiItems[this.summary.id] || null;
  }

  onCancelEdit() {
    this.closeEditROIMenu();
  }

  onSaveEdit() {
    if (!this.detailedInfo) {
      this._snackBarService.openError(`ROI ${this.name} (${this.summary?.id}) not found`);
      return;
    }

    let newROI = this.detailedInfo;
    newROI.name = this.name;
    newROI.description = this.description;

    this._roiService.editROI(newROI);
    this.closeEditROIMenu();
  }

  onDelete() {
    this._roiService.deleteROI(this.summary.id);
    this.closeSettingsMenu();
  }

  onShare() {
    this.closeSettingsMenu();
  }

  onColours(evt: any) {
    this.closeSettingsMenu();
  }

  onVisibility(evt: any) {}

  onScanEntryIdxPagePrev() {}

  onScanEntryIdxPageNext() {}

  onScanEntryIdxEnter(scanEntryIdx: number) {}
  onScanEntryIdxLeave(scanEntryIdx: number) {}
  onDeleteScanEntryIdx(scanEntryIdx: number) {}

  onToggleDetails() {
    this.showDetails = !this.showDetails;
    if (this.showDetails) {
      this._roiService.fetchROI(this.summary.id);
    }
  }

  onToggleScanEntryPoints() {
    this.showScanEntryPoints = !this.showScanEntryPoints;
  }

  private closeSettingsMenu(): void {
    if (this.settingsButton && this.settingsButton instanceof WidgetSettingsMenuComponent) {
      (this.settingsButton as WidgetSettingsMenuComponent).close();
    }
  }

  private closeEditROIMenu(): void {
    if (this.editROIButton && this.editROIButton instanceof ActionButtonComponent) {
      (this.editROIButton as ActionButtonComponent).closeDialog();

      this.name = "";
      this.description = "";
    }
  }
}
