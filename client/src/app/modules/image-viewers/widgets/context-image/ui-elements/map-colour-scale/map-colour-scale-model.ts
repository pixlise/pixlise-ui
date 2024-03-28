import { MinMax } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { Histogram } from "src/app/models/histogram";
import { MapPoint } from "src/app/modules/image-viewers/models/map-layer";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ColourRamp } from "src/app/utils/colours";
import { randomString } from "src/app/utils/utils";

// This is what we build our colour scales from. It can originate from map data (PMCDataValues), where it comes in
// via addMapValues, or it can originate from an RGBU ratio image calculated on the fly, where it comes in via
// addSimpleValues. Note that when it comes from the RGBU ratio image, more parameters are provided
export class MapColourScaleSourceData {
  isBinary = true;
  valueRange = new MinMax(); // Range of values actually stored, would be clamped to a specified min/max
  private _values: number[] = [];

  // ONLY for the case of reading from RGBU image
  specularRemovedValueRange = new MinMax(); // Optional range of values after specular removal for caching
  seenMinMax = new MinMax(); // Range of values we have seen but didn't store
  name: string = "";

  addMapValues(mapPoints: MapPoint[], valueIdx: number, valueRange: MinMax, isBinary: boolean) {
    for (const p of mapPoints) {
      this._values.push(p.values[valueIdx]);
    }

    this.valueRange.expandByMinMax(valueRange);
    if (!isBinary) {
      this.isBinary = false;
    }
  }

  addSimpleValues(values: Float32Array, valueRange: MinMax, specularRemovedValueRange: MinMax, seenMinMax: MinMax) {
    // Never treat this as binary as it comes from an image...
    this.isBinary = false;
    this._values = Array.from(values);
    this.valueRange = new MinMax(valueRange.min, valueRange.max);

    this.specularRemovedValueRange = specularRemovedValueRange;
    this.seenMinMax = seenMinMax;
  }

  get values(): number[] {
    return this._values;
  }
}

export class MapColourScaleModel {
  private _id: string = randomString(6);

  // The draw model we regenerate when we have canvas width/height data given to us
  private _drawModel: MapColourScaleDrawModel = new MapColourScaleDrawModel();

  // Interaction
  private _mouseMode: MouseMode = MouseMode.NONE;
  private _tagDragYPos: number = 0;
  private _tagRawValue: number = -1;

  // Signalling that we need recalculation
  private _needsRecalc: boolean = false;

  constructor(
    // Raw data
    public scanIds: string[],
    public expressionId: string,
    public scaleName: string,
    private _mapData: MapColourScaleSourceData,
    public hasOutOfDateModules: boolean, // So we can visually indicate...
    public hoverValue: number | null,
    private _displayValueRange: MinMax, // How much of that we have visible (controlled by mouse-draggable tags)

    // Settings used for drawing
    public displayScalingAllowed: boolean, // Do we allow the drawing/movement of little tags?
    public scaleNumber: number, // Which scale are we of...
    public scaleTotalCount: number, // how many total scales
    public scaleColourRamp: ColourRamp
  ) {}

  get id(): string {
    return this._id;
  }

  // Interaction
  get mouseMode(): MouseMode {
    return this._mouseMode;
  }
  set mouseMode(x: MouseMode) {
    this._mouseMode = x;
    this._drawModel.updateForMouse(x, this._tagRawValue, this._tagDragYPos);
  }
  get tagDragYPos(): number {
    return this._tagDragYPos;
  }
  set tagDragYPos(x: number) {
    this._tagDragYPos = x;
    this._drawModel.updateForMouse(this._mouseMode, this._tagRawValue, x);
  }
  get tagRawValue(): number {
    return this._tagRawValue;
  }
  set tagRawValue(x: number) {
    this._tagRawValue = x;
    this._drawModel.updateForMouse(this._mouseMode, x, this._tagDragYPos);
  }
  get displayValueRange(): MinMax {
    return new MinMax(
      this._displayValueRange.min === null ? this.valueRange.min : this._displayValueRange.min,
      this._displayValueRange.max === null ? this.valueRange.max : this._displayValueRange.max
    );
  }
  setDisplayValueRange(r: MinMax) {
    const prevRange = new MinMax(this._displayValueRange.min, this._displayValueRange.max);

    if (r.min !== null) {
      this._displayValueRange.setMin(r.min);
    }
    if (r.max !== null) {
      this._displayValueRange.setMax(r.max);
    }

    // Check against the value range
    if (
      this._displayValueRange.max !== null &&
      this._displayValueRange.min !== null &&
      this._mapData.valueRange.max !== null &&
      this._mapData.valueRange.min !== null
    ) {
      // Don't allow overlap...
      if (this._displayValueRange.max < this._displayValueRange.min) {
        this._displayValueRange.setMax(this._displayValueRange.min + Math.abs(this._displayValueRange.getRange()) * 0.001);
      }
      if (this._displayValueRange.min > this._displayValueRange.max) {
        this._displayValueRange.setMin(this._displayValueRange.max - Math.abs(this._displayValueRange.getRange()) * 0.001);
      }

      // Keep it within the data limits
      if (this._displayValueRange.max > this._mapData.valueRange.max) {
        this._displayValueRange.setMax(this._mapData.valueRange.max);
      }
      if (this._displayValueRange.min < this._mapData.valueRange.min) {
        this._displayValueRange.setMin(this._mapData.valueRange.min);
      }
    }

    if (!prevRange.equals(this._displayValueRange)) {
      this._needsRecalc = true;
    }
  }
  get valueRange(): MinMax {
    return this._mapData.valueRange;
  }
  get drawModel(): MapColourScaleDrawModel {
    return this._drawModel;
  }
  get needsRecalc(): boolean {
    return this._needsRecalc;
  }

  recalcDisplayData(canvasParams: CanvasParams): void {
    this._drawModel.regenerate(canvasParams, this, this._mapData);
    this._needsRecalc = false;
  }
}

export class MapColourScaleDrawModel {
  pos: ScaleInfo | null = null;
  showTopTagValue: boolean = false;
  showBottomTagValue: boolean = false;
  isValid: boolean = true;
  topTagValue: number | null = null;
  bottomTagValue: number | null = null;
  histogram: Histogram = new Histogram();

  regenerate(canvasParams: CanvasParams, mdl: MapColourScaleModel, mapData: MapColourScaleSourceData) {
    this.pos = this.getPosition(canvasParams, mdl.scaleTotalCount > 1, mdl.scaleNumber, mapData.isBinary, mdl.valueRange, mdl.displayValueRange);

    this.histogram = this.generateHistogram(mapData, this.pos.stepsShown);
    this.isValid = this.histogram.values.length != 2 || this.histogram.max() != 0;

    this.updateForMouse(mdl.mouseMode, mdl.tagRawValue, mdl.tagDragYPos);
  }

  updateForMouse(mouseMode: MouseMode, tagRawValue: number, tagDragYPos: number) {
    this.showTopTagValue = mouseMode == MouseMode.HOVER_MOVE || mouseMode == MouseMode.DRAG_TOP_TAG || mouseMode == MouseMode.HOVER_TOP_TAG;
    this.showBottomTagValue = mouseMode == MouseMode.HOVER_MOVE || mouseMode == MouseMode.DRAG_BOTTOM_TAG || mouseMode == MouseMode.HOVER_BOTTOM_TAG;

    this.topTagValue = null;
    this.bottomTagValue = null;
    if (this.pos) {
      this.pos.topTagYOverride = null;
      this.pos.bottomTagYOverride = null;
    }

    // If user is dragging it, get the current value at the mouse
    if (mouseMode == MouseMode.DRAG_TOP_TAG) {
      this.topTagValue = tagRawValue;
      if (this.pos && tagDragYPos != -1) {
        this.pos.topTagYOverride = tagDragYPos;
      }
    } else if (mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      this.bottomTagValue = tagRawValue;
      if (this.pos && tagDragYPos != -1) {
        this.pos.bottomTagYOverride = tagDragYPos;
      }
    }
  }

  private generateHistogram(data: MapColourScaleSourceData, stepsShown: number): Histogram {
    // Generate a histogram using the stepping defined in "pos"
    const histogram: Histogram = new Histogram();
    histogram.clear(stepsShown);

    // We now have a bunch of 0's, now run through all values and make sure their counts are in the right bin
    const stepSize = data.valueRange.getRange() / (stepsShown - 1);
    if (stepSize > 0) {
      for (const v of data.values) {
        const val = v - data.valueRange.min!;

        // Find where to slot it in
        const idx = Math.floor(val / stepSize);

        histogram.increment(idx);
      }
    } // else map is all 0's most likely
    return histogram;
  }

  protected getPosition(
    viewport: CanvasParams,
    isCompressedY: boolean,
    scaleNumber: number,
    isDataBinary: boolean,
    scaleRange: MinMax,
    displayRange: MinMax
  ): ScaleInfo {
    const baseSize = 16;

    // Make everything a calc from the above, can easily scale it!
    const txtGap = baseSize / 3;
    const fontSize = baseSize - 3;
    const boxWidth = baseSize * (isCompressedY ? 1 : 2);
    const histBarMaxSize = boxWidth;
    const labelMaxWidth = fontSize * 5;
    const tagHeight = baseSize * 1.2;
    const tagYPadding = tagHeight / 2;

    const edgeMargin = 8;

    const boxHeight = isDataBinary ? baseSize : 3;
    const stepMul = isCompressedY ? 4 : 2; // smaller if showing more scales
    const stepsShown = isDataBinary ? 2 : Math.floor(256 / (boxHeight * stepMul));

    const scaleH = stepsShown * boxHeight;
    const h = Math.floor(fontSize * 2 + scaleH + tagYPadding);

    const idxForHeight = scaleNumber;

    const rect = new Rect(Math.floor(edgeMargin), Math.floor(viewport.height - edgeMargin - h) - idxForHeight * h, histBarMaxSize + boxWidth + labelMaxWidth, h);
    const tagX = Math.floor(rect.x + histBarMaxSize);

    return new ScaleInfo(
      rect,
      boxHeight,
      stepsShown,
      baseSize,
      boxWidth,
      histBarMaxSize,
      txtGap,
      fontSize,
      labelMaxWidth,
      tagHeight,
      tagYPadding,

      MapColourScaleDrawModel.getScaleYPos(displayRange.max || 0, scaleRange, stepsShown, boxHeight, rect.maxY(), tagHeight),
      MapColourScaleDrawModel.getScaleYPos(displayRange.min || 0, scaleRange, stepsShown, boxHeight, rect.maxY(), tagHeight),

      tagX,
      labelMaxWidth + boxWidth,
      tagHeight
    );
  }

  public static getScaleYPos(rawValue: number, valueRange: MinMax, stepsShown: number, boxHeight: number, bottomY: number, tagHeight: number): number {
    // rawValue -> Y pixel position
    const scaleH = stepsShown * boxHeight;
    const scaleY = bottomY - tagHeight - scaleH;

    // NOTE: have to flip Y!
    return scaleY + (1 - valueRange.getAsPercentageOfRange(rawValue, false)) * scaleH;
  }
}

export class ScaleInfo {
  private _topTagYOverride: number | null = null;
  private _bottomTagYOverride: number | null = null;

  constructor(
    public rect: Rect,
    public boxHeight: number,
    public stepsShown: number,

    // Fine grained sizing
    public baseSize: number,
    public boxWidth: number,
    public histBarMaxSize: number,
    public txtGap: number,
    public fontSize: number,
    public labelMaxWidth: number,
    public tagHeight: number,
    public tagYPadding: number,

    private _topTagY: number,
    private _bottomTagY: number,

    private _tagX: number,
    private _tagWidth: number,
    private _tagHeight: number
  ) {}

  getTagRect(top: boolean): Rect {
    let tagY = top ? this._topTagY : this._bottomTagY;
    if (top && this._topTagYOverride !== null) {
      tagY = this._topTagYOverride;
    } else if (!top && this._bottomTagYOverride !== null) {
      tagY = this._bottomTagYOverride;
    }

    return new Rect(this._tagX, tagY, this._tagWidth, this._tagHeight);
  }

  set topTagYOverride(y: number | null) {
    this._topTagYOverride = y;
  }

  set bottomTagYOverride(y: number | null) {
    this._bottomTagYOverride = y;
  }
}

export enum MouseMode {
  NONE,
  DRAG_TOP_TAG,
  DRAG_BOTTOM_TAG,
  HOVER_MOVE,
  HOVER_TOP_TAG,
  HOVER_BOTTOM_TAG,
}
