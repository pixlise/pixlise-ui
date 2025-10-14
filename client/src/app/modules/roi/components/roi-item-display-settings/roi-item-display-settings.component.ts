import { Component, Input } from '@angular/core';
import { RGBA } from 'src/app/utils/colours';
import { ColourOption, generateDefaultColour, findColourOption, COLOUR_MAP, COLOURS } from '../../models/roi-colors';
import { ROIShape, DEFAULT_ROI_SHAPE, ROI_SHAPES } from '../roi-shape/roi-shape.component';
import { ROIService } from '../../services/roi.service';
import { ROIItem } from 'src/app/generated-protos/roi';
import { PredefinedROIID } from 'src/app/models/RegionOfInterest';
import { ROIDisplaySettings, createDefaultROIDisplaySettings } from '../../models/roi-region';
import { Subscription } from 'rxjs';

@Component({
  selector: 'roi-item-display-settings',
  standalone: false,
  templateUrl: './roi-item-display-settings.component.html',
  styleUrl: './roi-item-display-settings.component.scss'
})
export class ROIItemDisplaySettings {
  private _subs = new Subscription();

  @Input() roiId: string = "";
  @Input() colorOptions: ColourOption[] = COLOURS;
  @Input() shapeOptions: ROIShape[] = ROI_SHAPES;

  private _colour: ColourOption = generateDefaultColour();
  private _shape: ROIShape = DEFAULT_ROI_SHAPE;

  private _selectedColour: string = "";
  private _displaySettings: ROIDisplaySettings = createDefaultROIDisplaySettings();

  customSelectedColour: string = "";

  roi?: ROIItem;

  constructor(
    private _roiService: ROIService
  ) {}


  ngOnInit(): void {
    if (!this.roiId) {
      throw new Error("roiId not set on roi-item-display-settings");
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  clearColour() {
    this.colour = generateDefaultColour();
    this._selectedColour = "";
  }

  clearShape() {
    this.shape = DEFAULT_ROI_SHAPE;
  }

  get colour(): ColourOption {
    return this._colour;
  }

  set colour(value: ColourOption) {
    this._colour = value;
    this._roiService.updateRegionDisplaySettings(this.roiId, this.colour.rgba, this.shape || DEFAULT_ROI_SHAPE);
  }

  get shape(): ROIShape {
    return this._shape;
  }

  set shape(value: ROIShape) {
    this._shape = value;
    this._roiService.updateRegionDisplaySettings(this.roiId, this.colour.rgba, this.shape || DEFAULT_ROI_SHAPE);
  }

  onSelectColour(colour: ColourOption) {
    this.selectedColour = colour.colour;
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

  get isAllPointsROI(): boolean {
    if (!this.roiId) {
      return false;
    }

    return PredefinedROIID.isAllPointsROI(this.roiId);
  }

  get colourBlindSafeOptions(): ColourOption[] {
    return this.colorOptions.filter(option => option.colourBlindSafe);
  }

  get additionalColorOptions(): ColourOption[] {
    return this.colorOptions.filter(option => !option.colourBlindSafe);
  }

  get displaySettings(): ROIDisplaySettings {
    return this._displaySettings;
  }

  @Input() set displaySettings(value: ROIDisplaySettings) {
    if (value) {
      this._displaySettings = value;
      this._colour = findColourOption(value.colour);
      this._selectedColour = this.colour.colour;
      this._shape = value.shape;
    } else {
      this._displaySettings = createDefaultROIDisplaySettings();
    }
  }
}
