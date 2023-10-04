import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from "@angular/core";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { SelectionService, SnackbarService, WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";
import { Subscription } from "rxjs";
import { DEFAULT_ROI_SHAPE, ROIShape, ROI_SHAPES } from "../roi-shape/roi-shape.component";
import { COLOURS, ColourOption, findColourOption, generateDefaultColour } from "../../models/roi-colors";
import { ROIDisplaySettings, createDefaultROIDisplaySettings } from "../../models/roi-region";

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

  @Input() colorOptions: ColourOption[] = COLOURS;
  @Input() shapeOptions: ROIShape[] = ROI_SHAPES;

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

  private _displaySettings: ROIDisplaySettings = createDefaultROIDisplaySettings();

  private _selectedColour: string = "";
  private _colour: ColourOption = generateDefaultColour();
  private _shape: ROIShape = DEFAULT_ROI_SHAPE;

  private _shapeDefined: boolean = false;
  private _colourDefined: boolean = false;

  openScanIdxs: Set<string> = new Set<string>();
  scanEntryIndicesByDataset: Record<string, number[]> = {};
  isEditable: boolean = false;

  constructor(
    private _snackBarService: SnackbarService,
    private _roiService: ROIService,
    private _selectionService: SelectionService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        if (this._selectionService.hoverScanId === this.summary?.scanId) {
          this.hoverPMC = this._selectionService.hoverEntryId;
        } else {
          this.hoverPMC = -1;
        }
      })
    );

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
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  // We need to check if the id has changed (meaning the class is being reused for a different ROI like in a virtualized list),
  // and if so, clear the detailed info and display settings so that we don't display the wrong info for the ROI
  ngOnChanges(changes: SimpleChanges): void {
    if ("summary" in changes) {
      if (changes["summary"].previousValue?.id !== changes["summary"].currentValue?.id) {
        this._detailedInfo = null;
        this.openScanIdxs = new Set<string>();
        this.scanEntryIndicesByDataset = {};

        // Clear display settings if not in changes
        if (!changes["displaySettings"] || changes["displaySettings"].currentValue === undefined) {
          this._detailedInfo = null;
          this._selectedColour = "";
          this._colour = generateDefaultColour();
          this._shape = DEFAULT_ROI_SHAPE;
          this._shapeDefined = false;
          this._colourDefined = false;
        }
      }
    }
  }

  get displaySettings(): ROIDisplaySettings {
    return this._displaySettings;
  }

  @Input() set displaySettings(value: ROIDisplaySettings) {
    if (value) {
      this._displaySettings = value;
      this._colour = findColourOption(value.colour);
      this._selectedColour = this._colour.colour;
      this._shape = value.shape;

      this._shapeDefined = true;
      this._colourDefined = true;
    } else {
      this._displaySettings = createDefaultROIDisplaySettings();

      this._shapeDefined = false;
      this._colourDefined = false;
    }
  }

  get displayConfigured(): boolean {
    return this._shapeDefined || this._colourDefined;
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

  get selectedColour(): string {
    return this._selectedColour;
  }

  set selectedColour(value: string) {
    this._selectedColour = value;
    this.colour = findColourOption(value);
  }

  get shape(): ROIShape {
    return this._shape;
  }

  set shape(value: ROIShape) {
    this._shape = value;
    this._shapeDefined = !!value;
    this._roiService.updateRegionDisplaySettings(this.summary.id, this.colour.rgba, this._shape || DEFAULT_ROI_SHAPE);
    if (!this.selected) {
      this.onCheckboxClick(true);
    }
  }

  get dateCreatedString(): string {
    return this.createdDate > 0 ? new Date(this.createdDate).toLocaleDateString() : "Unknown";
  }

  get mistLevels(): boolean[] {
    return new Array(5).fill(0).map((_, i) => i < this.mistDepth);
  }

  get mistDepth(): number {
    return this.summary?.mistROIItem?.idDepth || 0;
  }

  get colourBlindSafeOptions(): ColourOption[] {
    return this.colorOptions.filter(option => option.colourBlindSafe);
  }

  get additionalColorOptions(): ColourOption[] {
    return this.colorOptions.filter(option => !option.colourBlindSafe);
  }

  get colour(): ColourOption {
    return this._colour;
  }

  set colour(value: ColourOption) {
    this._colour = value;
    this._colourDefined = value && value.colour.length > 0;
    this._roiService.updateRegionDisplaySettings(this.summary.id, this._colour.rgba, this.shape || DEFAULT_ROI_SHAPE);
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

  clearColour() {
    this.colour = generateDefaultColour();
    this._selectedColour = "";
    this._colourDefined = false;
  }

  clearShape() {
    this.shape = DEFAULT_ROI_SHAPE;
    this._shapeDefined = false;
  }
}
