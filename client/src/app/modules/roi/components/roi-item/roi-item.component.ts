import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { SelectionService, SnackbarService, WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";
import { Subscription } from "rxjs";
import { ROIShape, SHAPES } from "../roi-shape/roi-shape.component";
import { COLORS, ColorOption } from "../../models/roi-colors";

@Component({
  selector: "roi-item",
  templateUrl: "./roi-item.component.html",
  styleUrls: ["./roi-item.component.scss"],
})
export class ROIItemComponent {
  @Input() rightSelection: boolean = false;
  @Input() isSelectable = false;

  @Input() selected = false;
  @Input() colorChangeOnly = false;

  @Input() colorOptions: ColorOption[] = COLORS;
  @Input() shapeOptions: ROIShape[] = SHAPES;

  @Input() lightVariant: boolean = false;
  @Input() showDetailsButton: boolean = true;
  @Input() showVisibilityButton: boolean = true;
  @Input() showCreatorIcon: boolean = true;

  @Input() summary!: ROIItemSummary;

  @Output() onROISelect = new EventEmitter();

  @ViewChild("settingsButton") settingsButton!: ElementRef;
  @ViewChild("editROIButton") editROIButton!: ElementRef;

  private _subs = new Subscription();

  showDetails = false;
  showScanEntryPoints = false;

  hoverPMC = -1;
  pmcPagePosition = 0;
  displaySelectedPMCs: any[] = [];

  private _name = "";
  private _description = "";

  private _detailedInfo: ROIItem | null = null;

  openScanIdxs: Set<string> = new Set<string>();
  scanEntryIndicesByDataset: Record<string, number[]> = {};
  isEditable: boolean = false;

  displayConfigured: boolean = false;
  private _color: ColorOption = { name: "", color: "", colorBlindSafe: false };
  private _shape: ROIShape | "" = "";

  constructor(
    private _snackBarService: SnackbarService,
    private _roiService: ROIService,
    private _selectionService: SelectionService
  ) {
    this._subs.add(
      this._roiService.roiItems$.subscribe(roiItems => {
        if (this.summary?.id && roiItems[this.summary.id]) {
          this._detailedInfo = roiItems[this.summary.id];
          this.scanEntryIndicesByDataset[this._detailedInfo.scanId] = this._detailedInfo.scanEntryIndexesEncoded;
        } else {
          this._detailedInfo = null;
        }
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        if (this._selectionService.hoverScanId === this.summary?.scanId) {
          this.hoverPMC = this._selectionService.hoverEntryId;
        } else {
          this.hoverPMC = -1;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.closeSettingsMenu();
  }

  get creatorName(): string {
    return this.summary.owner?.creatorUser?.name || "";
  }

  get creatorAbbreviation(): string {
    return this.creatorName && this.creatorName.length > 0 ? this.creatorName[0] : "N/A";
  }

  get icon(): string {
    return this.summary.owner?.creatorUser?.iconURL || "";
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

  get shape(): ROIShape | "" {
    return this._shape;
  }

  set shape(value: ROIShape | "") {
    this._shape = value;
    if (!this.selected) {
      this.onCheckboxClick(true);
    }
  }

  get colorBlindSafeOptions(): ColorOption[] {
    return this.colorOptions.filter(option => option.colorBlindSafe);
  }

  get additionalColorOptions(): ColorOption[] {
    return this.colorOptions.filter(option => !option.colorBlindSafe);
  }

  get color(): ColorOption {
    return this._color;
  }

  set color(value: ColorOption) {
    this._color = value;
    if (!this.selected) {
      this.onCheckboxClick(true);
    }
  }

  get isVisible(): boolean {
    return false;
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
    return this._detailedInfo;
  }

  get scanIds(): string[] {
    return Object.keys(this.scanEntryIndicesByDataset);
  }

  get selectedTagIDs(): string[] {
    return this.summary.tags || [];
  }

  set selectedTagIDs(value: string[]) {
    this.summary.tags = value;
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

  onVisibility(evt: any) {}

  onScanEntryIdxPagePrev() {}

  onScanEntryIdxPageNext() {}

  onScanEntryIdxEnter(scanId: string, scanEntryIdx: number) {
    this._selectionService.setHoverEntry(scanId, scanEntryIdx);
  }

  onScanEntryIdxLeave(scanId: string, scanEntryIdx: number) {
    this._selectionService.setHoverEntry("", -1);
  }

  onDeleteScanEntryIdx(scanEntryIdx: number) {
    if (!this.detailedInfo) {
      this._snackBarService.openError(`ROI ${this.name} (${this.summary?.id}) not found`);
      return;
    }

    let newROI = this.detailedInfo;
    newROI.scanEntryIndexesEncoded = newROI.scanEntryIndexesEncoded.filter(idx => idx !== scanEntryIdx);

    // We don't need to update summaries for changes to scan entry points
    this._roiService.editROI(newROI, false);
  }

  onToggleDetails() {
    this.showDetails = !this.showDetails;
    if (this.showDetails) {
      this._roiService.fetchROI(this.summary.id);
    }
  }

  onToggleScanMenu(scanId: string) {
    if (this.openScanIdxs.has(scanId)) {
      this.openScanIdxs.delete(scanId);
    } else {
      this.openScanIdxs.add(scanId);
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

  onTagSelectionChanged(tagIDs: string[]) {
    this.selectedTagIDs = tagIDs;
    this._roiService.editROISummary(this.summary);
  }

  onCheckboxClick(checked: boolean) {
    if (this.onROISelect) {
      this.onROISelect.emit();
    }
  }

  clearColor() {
    this.color = { name: "", color: "", colorBlindSafe: false };
  }

  clearShape() {
    this._shape = "";
  }
}
