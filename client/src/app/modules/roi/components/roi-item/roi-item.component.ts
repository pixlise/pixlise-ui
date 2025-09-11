import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from "@angular/core";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { SelectionService, SnackbarService, WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";
import { Subscription } from "rxjs";
import { DEFAULT_ROI_SHAPE, ROIShape, ROI_SHAPES } from "../roi-shape/roi-shape.component";
import { COLOURS, COLOUR_MAP, ColourOption, findColourOption, generateDefaultColour } from "../../models/roi-colors";
import { ROIDisplaySettings, createDefaultROIDisplaySettings } from "../../models/roi-region";
import { ObjectType } from "src/app/generated-protos/ownership-access";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { UsersService } from "src/app/modules/settings/services/users.service";
import { UserInfo } from "src/app/generated-protos/user";
import { PredefinedROIID } from "../../../../models/RegionOfInterest";
import { RGBA } from "../../../../utils/colours";
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";

export type SubItemOptionSection = {
  title: string;
  options: { title: string; value: string }[]; // { title, value }
};

@Component({
  selector: "roi-item",
  templateUrl: "./roi-item.component.html",
  styleUrls: ["./roi-item.component.scss"],
})
export class ROIItemComponent implements OnInit, OnDestroy, OnChanges {
  @Input() rightSelection: boolean = false;
  @Input() isSelectable = false;
  @Input() isSingleSelect: boolean = false;

  // If these are specified and isSelectable, they will replace the checkbox selection
  @Input() selectionOptions: SubItemOptionSection[] = [];
  @Input() selectionLabel: string = "";

  @Input() selectedOptions: string[] = [];
  @Input() selected = false;
  @Input() isVisible = false;
  @Input() colorChangeOnly = false;

  customSelectedColour: string = "";

  @Input() colorOptions: ColourOption[] = COLOURS;
  @Input() shapeOptions: ROIShape[] = ROI_SHAPES;

  @Input() lightVariant: boolean = false;
  @Input() showDetailsButton: boolean = true;
  @Input() showVisibilityButton: boolean = true;
  @Input() showCreatorIcon: boolean = true;
  @Input() nextDisplayOnFirstToggle: boolean = true;

  objectType: ObjectType = ObjectType.OT_ROI;
  @Input() summary!: ROIItemSummary;

  creatorUser: UserInfo = UserInfo.create();

  @Output() onROISelect = new EventEmitter();
  @Output() onVisibilityChange = new EventEmitter<boolean>();

  @Input() selectAuthorToFilter: boolean = false;
  @Output() onFilterAuthor = new EventEmitter();

  @ViewChild("settingsButton") settingsButton!: ElementRef;
  @ViewChild("editROIButton") editROIButton!: ElementRef;
  @ViewChild("deleteROIConfirmButton") deleteROIConfirmButton!: ElementRef;
  @ViewChild(CdkVirtualScrollViewport) pmcViewport!: CdkVirtualScrollViewport;

  private _subs = new Subscription();

  showDetails = false;
  showScanEntryPoints = false;

  hoverIndex = -1;
  singleSelectionIndex = -1;
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

  constructor(
    private _snackBarService: SnackbarService,
    private _roiService: ROIService,
    private _selectionService: SelectionService,
    private _usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.updateUser();

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        if (this._selectionService.hoverScanId === this.summary?.scanId) {
          this.hoverIndex = this._selectionService.hoverEntryIdx;
        } else {
          this.hoverIndex = -1;
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel) => {
        const selIdxs = sel.beamSelection.getSelectedScanEntryIndexes(this.summary?.scanId || "");
        if (selIdxs.size == 1) {
          this.singleSelectionIndex = selIdxs.values().next().value || -1;
        } else {
          this.singleSelectionIndex = -1;
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

        this.updateUser();
      }
    }
  }

  updateUser() {
    let cachedUsers = this._usersService?.cachedUsers;
    let userId = this.summary?.owner?.creatorUser?.id || "";
    if (cachedUsers && userId && this.summary?.owner && cachedUsers[userId]) {
      this.creatorUser = UserInfo.create(cachedUsers[userId]);
    } else if (this.summary?.owner?.creatorUser) {
      this.creatorUser = UserInfo.create(this.summary.owner.creatorUser);
    }
  }

  get canEdit(): boolean {
    return this.summary.owner?.canEdit || false;
  }

  get isSubItemSelectionEnabled(): boolean {
    return this.isSelectable && this.selectionOptions.length > 0 && this.selectionLabel.length > 0;
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
    return this.creatorUser?.iconURL || "";
  }

  get id(): string {
    return this.summary.id;
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

  get semiTransparentSelectedColour(): string {
    if (this._selectedColour.startsWith("#") && this._selectedColour.length === 7) {
      return this._selectedColour + "80";
    } else if (this._selectedColour.startsWith("#") && this._selectedColour.length === 9) {
      return this._selectedColour.slice(0, 7) + "80";
    } else if (this.selectedColour.startsWith("rgba")) {
      return this._selectedColour.replace(/,[01](?:\.[0-9]*)?\)/, ",0.5)");
    } else if (this.selectedColour.startsWith("rgb")) {
      return this._selectedColour.replace(")", ",0.5)").replace("rgb", "rgba");
    } else {
      return "";
    }
  }

  set selectedColour(value: string) {
    this._selectedColour = value;
    this.colour = findColourOption(value);
  }

  get isCustomColour(): boolean {
    return !COLOUR_MAP.get(this._selectedColour);
  }

  get rawSelectedColour(): string {
    return this._selectedColour;
  }

  set rawSelectedColour(value: string) {
    this._selectedColour = value;
  }

  onSelectCustomColour() {
    let option: ColourOption = {
      name: "Custom",
      colour: this.customSelectedColour,
      rgba: RGBA.fromString(this.customSelectedColour),
      colourBlindSafe: false,
    };

    this.colour = option;
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

  get isAllPointsROI(): boolean {
    return PredefinedROIID.isAllPointsROI(this.summary.id);
  }

  onSelectColour(colour: ColourOption) {
    this.selectedColour = colour.colour;
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

  filterToAuthor() {
    if (this.selectAuthorToFilter && this.summary?.owner?.creatorUser?.id) {
      this.onFilterAuthor.emit(this.summary.owner.creatorUser.id);
    }
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

  onCloseDelete() {
    if (this.deleteROIConfirmButton && this.deleteROIConfirmButton instanceof ActionButtonComponent) {
      (this.deleteROIConfirmButton as ActionButtonComponent).closeDialog();
    }
  }

  onConfirmDelete(deleteAll: boolean) {
    this._roiService.deleteROI(deleteAll ? this.summary.associatedROIId : this.summary.id, false, deleteAll);
    this.closeSettingsMenu();

    this.onCloseDelete();
  }

  onShare() {
    this.closeSettingsMenu();
  }

  onVisibility(evt: any) {
    this.onVisibilityChange.emit(!this.isVisible);
  }

  onScanEntryIdxEnter(scanId: string, scanEntryIdx: number) {
    this._selectionService.setHoverEntryIndex(scanId, scanEntryIdx);
  }

  onScanEntryIdxLeave(scanId: string) {
    this._selectionService.clearHoverEntry();
  }

  onScanEntryIdxClick(scanId: string, scanEntryIdx: number) {
    let pmcSelection = new Map<string, Set<number>>();
    pmcSelection.set(scanId, new Set([scanEntryIdx]));
    this._selectionService.setSelection(new BeamSelection(pmcSelection), PixelSelection.makeEmptySelection());
  }

  onKeyboardArrow(scanId: string, up: boolean, event: Event) {
    // See what the next or previous PMC is to select
    if (this.singleSelectionIndex == -1) {
      console.log("Selection is not a single PMC, ignoring arrow key on roi pmc list");
      return;
    }

    const entries = this.scanEntryIndicesByDataset[scanId];
    const idx = entries.indexOf(this.singleSelectionIndex);
    if (idx == -1) {
      console.log("Unknown current index, ignoring arrow key on roi pmc list");
      return;
    }

    let toSelIdx = up ? idx - 1 : idx + 1;
    if (toSelIdx >= 0 && toSelIdx < entries.length) {
      // Select it!
      let pmcSelection = new Map<string, Set<number>>();
      pmcSelection.set(scanId, new Set([entries[toSelIdx]]));
      this._selectionService.setSelection(new BeamSelection(pmcSelection), PixelSelection.makeEmptySelection());

      this.pmcViewport.scrollToIndex(toSelIdx);
    }

    event.preventDefault();
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

      if (this.nextDisplayOnFirstToggle && !this.colour.colour && this.shape === DEFAULT_ROI_SHAPE) {
        let displaySettingOption = this._roiService.nextDisplaySettings(this.summary?.scanId, this.summary?.id);
        this.colour = displaySettingOption.colour;
        this.shape = displaySettingOption.shape;
      }
    }
  }

  onToggleCustomSelect(value: string) {
    let newSelectedOptions = [];
    if (this.onROISelect) {
      if (this.selectedOptions.includes(value)) {
        newSelectedOptions = this.selectedOptions.filter(option => option !== value);
      } else {
        newSelectedOptions = [...this.selectedOptions, value];
      }

      this.onROISelect.emit({
        selectedOptions: newSelectedOptions,
      });
    }
  }

  clearCustomSelection() {
    this.onROISelect.emit({
      selectedOptions: [],
    });
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

  onSaveSelectionToROI(): void {
    let currentSelection = this._selectionService.getCurrentSelection();
    let scanIds = currentSelection.beamSelection.getScanIds();

    let currentROIScanId = this._detailedInfo?.scanId || "";

    if (currentROIScanId && !scanIds.includes(currentROIScanId)) {
      this._snackBarService.openError("Cannot save selection to ROI. Selection is from a different scan.");
      return;
    }

    let pmcSelection = currentSelection.beamSelection.getSelectedScanEntryPMCs(currentROIScanId);
    let pixelSelection = currentSelection.pixelSelection;

    if (pmcSelection.size <= 0 && pixelSelection.selectedPixels.size <= 0) {
      this._snackBarService.openError("Cannot save an empty ROI. Please select something!");
      return;
    }

    if (!this._detailedInfo) {
      this._snackBarService.openError("Cannot save selection to ROI. ROI not found.");
      return;
    }

    this._detailedInfo.scanEntryIndexesEncoded = Array.from(pmcSelection);
    this._detailedInfo.pixelIndexesEncoded = Array.from(pixelSelection.selectedPixels);
    this._detailedInfo.imageName = pixelSelection.imageName;

    this._roiService.writeROI(this._detailedInfo, false, false);
  }

  onAddRGBUPixelsToROI(): void {
    let currentSelection = this._selectionService.getCurrentSelection();
    let scanIds = currentSelection.beamSelection.getScanIds();

    let currentROIScanId = this._detailedInfo?.scanId || "";

    if (currentROIScanId && !scanIds.includes(currentROIScanId)) {
      this._snackBarService.openError("Cannot save selection to ROI. Selection is from a different scan.");
      return;
    }

    let pmcSelection = currentSelection.beamSelection.getSelectedScanEntryPMCs(currentROIScanId);
    let pixelSelection = currentSelection.pixelSelection;

    if (pmcSelection.size <= 0 && pixelSelection.selectedPixels.size <= 0) {
      this._snackBarService.openError("Cannot save an empty ROI. Please select something!");
      return;
    }

    if (!this._detailedInfo) {
      this._snackBarService.openError("Cannot save selection to ROI. ROI not found.");
      return;
    }

    // this._selectionService.selectRGBUPixels();

    let joinedPixels = new Set<number>(this._detailedInfo.pixelIndexesEncoded);
    pixelSelection.selectedPixels.forEach(pixel => {
      joinedPixels.add(pixel);
    });

    this._detailedInfo.pixelIndexesEncoded = Array.from(joinedPixels);
    this._detailedInfo.imageName = pixelSelection.imageName;

    this._roiService.writeROI(this._detailedInfo, false, false);
  }

  onSelect(): void {
    if (this._detailedInfo) {
      let pmcSelection = new Map<string, Set<number>>();
      Object.entries(this.scanEntryIndicesByDataset).forEach(([scanId, pmcs]) => {
        pmcSelection.set(scanId, new Set(pmcs));
      });

      let pixels = new Set<number>(this._detailedInfo.pixelIndexesEncoded);
      let pixelSelection = new PixelSelection(pixels, 0, 0, this._detailedInfo.imageName);

      this._selectionService.setSelection(new BeamSelection(pmcSelection), pixelSelection);
    }
  }

  onNewColour(): void {}
}
