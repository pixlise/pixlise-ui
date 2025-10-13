import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { SelectionService, SnackbarService, UsersService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { DEFAULT_ROI_SHAPE, ROIShape } from "../roi-shape/roi-shape.component";
import { ColourOption, findColourOption, generateDefaultColour } from "../../models/roi-colors";
import { ROIDisplaySettings, createDefaultROIDisplaySettings } from "../../models/roi-region";
import { ObjectType } from "src/app/generated-protos/ownership-access";
import { UserInfo } from "src/app/generated-protos/user";

export type SubItemOptionSection = {
  title: string;
  options: { title: string; value: string }[]; // { title, value }
};

@Component({
  standalone: false,
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

  // @Input() colorOptions: ColourOption[] = COLOURS;
  // @Input() shapeOptions: ROIShape[] = ROI_SHAPES;

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
  @Output() onROIDetails = new EventEmitter();

  @Input() selectAuthorToFilter: boolean = false;
  @Output() onFilterAuthor = new EventEmitter();

  private _subs = new Subscription();

  displaySelectedPMCs: any[] = [];

  private _name = "";
  private _description = "";

  //private _detailedInfo: ROIItem | null = null;

  private _displaySettings: ROIDisplaySettings = createDefaultROIDisplaySettings();

  private _colour: ColourOption = generateDefaultColour();
  private _shape: ROIShape = DEFAULT_ROI_SHAPE;

  private _shapeDefined: boolean = false;
  private _colourDefined: boolean = false;

  constructor(
    private _snackBarService: SnackbarService,
    private _roiService: ROIService,
    private _selectionService: SelectionService,
    private _usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.updateUser();

    // this._subs.add(
    //   this._roiService.loadROI(this.summary.id, true).subscribe(
    //     (roiItem: ROIItem) => {
    //       this._detailedInfo = roiItem;
    //   })
      // this._roiService.roiItems$.subscribe(roiItems => {
      //   if (this.summary?.id && roiItems[this.summary.id]) {
      //     this._detailedInfo = roiItems[this.summary.id];
      //   } else {
      //     this._detailedInfo = null;
      //   }
      // })
    //);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  // We need to check if the id has changed (meaning the class is being reused for a different ROI like in a virtualized list),
  // and if so, clear the detailed info and display settings so that we don't display the wrong info for the ROI
  ngOnChanges(changes: SimpleChanges): void {
    if ("summary" in changes) {
      if (changes["summary"].previousValue?.id !== changes["summary"].currentValue?.id) {
        //this._detailedInfo = null;

        // Clear display settings if not in changes
        if (!changes["displaySettings"] || changes["displaySettings"].currentValue === undefined) {
          //this._detailedInfo = null;
          //this._selectedColour = "";
          this._colour = generateDefaultColour();
          this._shape = DEFAULT_ROI_SHAPE;
          this._shapeDefined = false;
          this._colourDefined = false;
        }

        this.updateUser();
      }
    }
  }

  // get detailedInfo() {
  //   return this._detailedInfo;
  // }

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
      //this._selectedColour = this._colour.colour;
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

  filterToAuthor() {
    if (this.selectAuthorToFilter && this.summary?.owner?.creatorUser?.id) {
      this.onFilterAuthor.emit(this.summary.owner.creatorUser.id);
    }
  }

  onVisibility(evt: any) {
    this.onVisibilityChange.emit(!this.isVisible);
  }

  onShowDetails() {
    this.onROIDetails.emit(this.summary.id);
    // this.showDetails = !this.showDetails;
    // if (this.showDetails) {
    //   this._roiService.fetchROI(this.summary.id);
    // }
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

  onTagSelectionChanged(tagIDs: string[]) {
    if(!this.summary) {
      return;
    }
 
    this.selectedTagIDs = tagIDs;
    this._roiService.editROISummary(this.summary);
  }

  get selectedTagIDs(): string[] {
    return this.summary?.tags || [];
  }

  set selectedTagIDs(value: string[]) {
    if(this.summary) {
      this.summary.tags = value;
    }
  }
}
