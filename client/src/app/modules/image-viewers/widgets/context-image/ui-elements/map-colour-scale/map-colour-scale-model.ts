import { MinMax } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { Histogram } from "src/app/models/histogram";
import { ContextImageMapLayer } from "src/app/modules/image-viewers/models/map-layer";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ColourRamp } from "src/app/utils/colours";
import { randomString } from "src/app/utils/utils";

export class MapColourScaleModel {
  private _id: string = randomString(6);

  // The draw model we regenerate when we have canvas width/height data given to us
  private _drawModel: MapColourScaleDrawModel = new MapColourScaleDrawModel();

  // Interaction
  private _mouseMode: MouseMode = MouseMode.NONE;
  private _tagDragYPos: number = 0;
  private _tagRawValue: number = -1;
  private _displayValueRange: MinMax; // How much of that we have visible (controlled by mouse-draggable tags)

  constructor(
    // Raw data
    public scanId: string,
    public expressionId: string,
    public scaleName: string,
    private _mapData: ContextImageMapLayer,
    public valueRange: MinMax, // Range of all data points
    public hasOutOfDateModules: boolean, // So we can visually indicate...
    public hoverValue: number | null,

    // Settings used for drawing
    public displayScalingAllowed: boolean, // Do we allow the drawing/movement of little tags?
    public scaleNumber: number, // Which scale are we of...
    public scaleTotalCount: number, // how many total scales
    public scaleColourRamp: ColourRamp
  ) {
    this._displayValueRange = new MinMax(valueRange.min, valueRange.max);
  }

  get id(): string {
    return this._id;
  }

  // Interaction
  get mouseMode(): MouseMode {
    return this._mouseMode;
  }
  get tagDragYPos(): number {
    return this._tagDragYPos;
  }
  set tagDragYPos(x: number) {
    this._tagDragYPos = x;
  }
  get tagRawValue(): number {
    return this._tagRawValue;
  }
  set tagRawValue(x: number) {
    this._tagRawValue = x;
  }
  get displayValueRange(): MinMax {
    return this._displayValueRange;
  }
  get drawModel(): MapColourScaleDrawModel {
    return this._drawModel;
  }

  recalcDisplayData(canvasParams: CanvasParams): void {
    this._drawModel.regenerate(canvasParams, this, this._mapData);
  }
}

export class MapColourScaleDrawModel {
  pos: ScaleInfo | null = null;
  showTagValue: boolean = false;
  isValid: boolean = true;
  topTagValue: number | null = null;
  bottomTagValue: number | null = null;
  histogram: Histogram = new Histogram();

  regenerate(canvasParams: CanvasParams, mdl: MapColourScaleModel, mapData: ContextImageMapLayer) {
    this.pos = this.getPosition(canvasParams, mdl.scaleTotalCount > 1, mdl.scaleNumber, mapData.isBinary, mdl.mouseMode, mdl.tagDragYPos, mdl.valueRange);

    this.histogram = this.generateHistogram(mapData, this.pos.stepsShown);
    this.isValid = this.histogram.values.length != 2 || this.histogram.max() != 0;

    this.showTagValue = mdl.mouseMode == MouseMode.HOVER_MOVE || mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG || mdl.mouseMode == MouseMode.HOVER_BOTTOM_TAG;

    this.topTagValue = null;
    this.bottomTagValue = null;
    // If user is dragging it, get the current value at the mouse
    if (mdl.mouseMode == MouseMode.DRAG_TOP_TAG) {
      this.topTagValue = mdl.tagRawValue;
    } else if (mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      this.bottomTagValue = mdl.tagRawValue;
    }
  }

  private generateHistogram(data: ContextImageMapLayer, stepsShown: number): Histogram {
    // Generate a histogram using the stepping defined in "pos"
    const histogram: Histogram = new Histogram();
    histogram.clear(stepsShown);

    // We now have a bunch of 0's, now run through all values and make sure their counts are in the right bin
    const stepSize = data.valueRange.getRange() / (stepsShown - 1);
    if (stepSize > 0) {
      for (const p of data.points) {
        const val = p.value - data.valueRange.min!;

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
    mouseMode: MouseMode,
    tagDragYPos: number,
    scaleRange: MinMax
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

    let topTagY = MapColourScaleDrawModel.getScaleYPos(scaleRange.max || 0, scaleRange, stepsShown, boxHeight, rect.maxY(), tagHeight);
    if (mouseMode == MouseMode.DRAG_TOP_TAG) {
      topTagY = tagDragYPos;
    }

    let bottomTagY = MapColourScaleDrawModel.getScaleYPos(scaleRange.min || 0, scaleRange, stepsShown, boxHeight, rect.maxY(), tagHeight);
    if (mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      bottomTagY = tagDragYPos;
    }

    return new ScaleInfo(
      rect,
      boxHeight,
      stepsShown,
      new Rect(tagX, Math.floor(topTagY), labelMaxWidth + boxWidth, tagHeight),
      new Rect(tagX, Math.floor(bottomTagY), labelMaxWidth + boxWidth, tagHeight),
      baseSize,
      boxWidth,
      histBarMaxSize,
      txtGap,
      fontSize,
      labelMaxWidth,
      tagHeight,
      tagYPadding
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
  constructor(
    public rect: Rect,
    public boxHeight: number,
    public stepsShown: number,
    public topTagRect: Rect,
    public bottomTagRect: Rect,

    // Fine grained sizing
    public baseSize: number,
    public boxWidth: number,
    public histBarMaxSize: number,
    public txtGap: number,
    public fontSize: number,
    public labelMaxWidth: number,
    public tagHeight: number,
    public tagYPadding: number
  ) {}
}

export enum MouseMode {
  NONE,
  DRAG_TOP_TAG,
  DRAG_BOTTOM_TAG,
  HOVER_MOVE,
  HOVER_TOP_TAG,
  HOVER_BOTTOM_TAG,
}
/*
export class MapColourScaleModel {
  constructor(
    public scaleName: string,
    public scaleColourRamp: ColourRamp,
    public histogram: Histogram,
    public scaleRange: MinMax,
    public scaleTagValues: MinMax,
    public hoverValue: number | null,
    public displayValueRange: MinMax,
    public pos: ScaleInfo,
    public showTagValue: boolean,
    public hasOutOfDateModules: boolean,
    public displayScalingAllowed: boolean,
    public channelCount: number, // Not 100% sure why the drawing code cares, but if we have more than one channel (so more than one scale drawer...)
    public topTagOverrideValue: number | null, // When user is dragging tag, this is the number we write in the tag box
    public bottomTagOverrideValue: number | null // When user is dragging tag, this is the number we write in the tag box
  ) {}

  getDrawParamsForRawValue(rawValue: number, range: MinMax): MapPointDrawParams {
    return getDrawParamsForRawValue(this.scaleColourRamp, rawValue, range);
  }
}

export function makeColourScaleModelForMap(
  pos: ScaleInfo,
  tagRawValue: number | null,
  mouseMode: MouseMode,
  hoverIdx: number,
  data: ContextImageMapLayer
): MapColourScaleDrawModel {
  // Generate a histogram using the stepping defined in "pos"
  const histogram: Histogram = new Histogram();
  histogram.clear(pos.stepsShown);

  let hoverValue: number | null = null;
  if (hoverIdx > -1 && hoverIdx < data.points.length && data.points[hoverIdx]) {
    hoverValue = data.points[hoverIdx].value;
  }

  if (pos.stepsShown > 1 && data.valueRange.getRange() > 0) {
    // We now have a bunch of 0's, now run through all values and make sure their counts are in the right bin
    const stepSize = data.valueRange.getRange() / (pos.stepsShown - 1);
    if (stepSize > 0) {
      for (const p of data.points) {
        const val = p.value - data.valueRange.min!;

        // Find where to slot it in
        const idx = Math.floor(val / stepSize);

        histogram.increment(idx);
      }
    } // else map is all 0's most likely
  }

  let topTagValue: number | null = null;
  let bottomTagValue: number | null = null;
  // If user is dragging it, get the current value at the mouse
  if (mouseMode == MouseMode.DRAG_TOP_TAG) {
    topTagValue = tagRawValue;
  } else if (mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
    bottomTagValue = tagRawValue;
  }

/*
  scaleRange = layer.getDisplayValueRange(this._channel) || scaleRange;
  if (this._manualScaleMax !== null && this._manualScaleMax !== scaleRange.max) {
    layer.setDisplayValueRangeMax(this._channel, this._manualScaleMax);
    scaleRange.setMax(this._manualScaleMax);
  }
  if (this._manualScaleMin !== null && this._manualScaleMin !== scaleRange.min) {
    layer.setDisplayValueRangeMin(this._channel, this._manualScaleMin);
    scaleRange.setMin(this._manualScaleMin);
  }
/*
  let hasOutOfDateModules = false;
  if (layer?.expressionID && layer?.source) {
    hasOutOfDateModules = (layer.source as DataExpression).checkModuleReferences(this._ctx.layerManager.moduleService);
  }
* /

  const displayValueRange = new MinMax(data.valueRange.min, data.valueRange.max);

  return new MapColourScaleDrawModel(
    data.expressionName,
    ColourRamp.SHADE_MAGMA,
    histogram,
    data.valueRange,
    displayValueRange,
    hoverValue,
    displayValueRange,
    pos,
    mouseMode == MouseMode.HOVER_MOVE || mouseMode == MouseMode.DRAG_BOTTOM_TAG || mouseMode == MouseMode.HOVER_BOTTOM_TAG,
    data.hasOutOfDateModules,
    false,
    1,
    topTagValue,
    bottomTagValue
  );
}
*/
