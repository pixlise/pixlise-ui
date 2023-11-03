import { DataExpression } from "src/app/generated-protos/expressions";
import { MinMax } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { Histogram } from "src/app/models/histogram";
import { MapPointDrawParams, getDrawParamsForRawValue } from "src/app/modules/image-viewers/models/map-layer";
import { ColourRamp } from "src/app/utils/colours";

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
  DRAG_ALL,
  DRAG_TOP_TAG,
  DRAG_BOTTOM_TAG,
  HOVER_MOVE,
  HOVER_TOP_TAG,
  HOVER_BOTTOM_TAG,
}

export class MapColourScaleDrawModel {
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
    public topTagOverrideValue: number | null, // When user is dragging tag, this is the number we write in the tag box
    public bottomTagOverrideValue: number | null // When user is dragging tag, this is the number we write in the tag box
  ) {}

  getDrawParamsForRawValue(rawValue: number, range: MinMax): MapPointDrawParams {
    return getDrawParamsForRawValue(this.scaleColourRamp, rawValue, range);
  }
}

function makeModel(pos: ScaleInfo): MapColourScaleDrawModel {
  const scaleRange = this.getScaleRange();
  if (!scaleRange) {
    return;
  }

  let topTagValue: number | null = null;
  let bottomTagValue: number | null = null;
  // If user is dragging it, get the current value at the mouse
  if (this._mouseMode == MouseMode.DRAG_TOP_TAG) {
    topTagValue = this._tagRawValue;
  } else if (this._mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
    bottomTagValue = this._tagRawValue;
  }

  if (this._manualScaleMax !== null && this._manualScaleMax !== scaleRange.max) {
    layer.setDisplayValueRangeMax(this._channel, this._manualScaleMax);
    scaleRange.setMax(this._manualScaleMax);
  }
  if (this._manualScaleMin !== null && this._manualScaleMin !== scaleRange.min) {
    layer.setDisplayValueRangeMin(this._channel, this._manualScaleMin);
    scaleRange.setMin(this._manualScaleMin);
  }

  
  scaleRange = layer.getDisplayValueRange(this._channel) || scaleRange;
  if (this._manualScaleMax !== null && this._manualScaleMax !== scaleRange.max) {
    layer.setDisplayValueRangeMax(this._channel, this._manualScaleMax);
    scaleRange.setMax(this._manualScaleMax);
  }
  if (this._manualScaleMin !== null && this._manualScaleMin !== scaleRange.min) {
    layer.setDisplayValueRangeMin(this._channel, this._manualScaleMin);
    scaleRange.setMin(this._manualScaleMin);
  }

  let hasOutOfDateModules = false;
  if (layer?.expressionID && layer?.source) {
    hasOutOfDateModules = (layer.source as DataExpression).checkModuleReferences(this._ctx.layerManager.moduleService);
  }
  
  
  let layerMan = this._ctx.layerManager;
  let activeLayer = layerMan.getFirstVisibleLayer();

  // Check whether the user is hovering over a PMC value
  const locInfo = this._ctx.dataset.locationPointCache[this._ctx.highlighedLocationIdx];
  if (activeLayer && locInfo && locInfo.PMC) {
    const values = activeLayer.getValue(locInfo.PMC);
    if (values[this._channel] && typeof values[this._channel].value === "number") {
      hoverValue = values[this._channel].value;
      showHoverText = true;
    }
  }

    // Generate the histogram
    layer.setHistogramSteps(pos.stepsShown);

  const histogram = layer.getHistogram(this._channel);

  return new MapColourScaleDrawModel(
    histogram,
    scaleRange,
    hoverValue,
    displayValueRange,
    pos,
    this._mouseMode == MouseMode.HOVER_MOVE || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG || this._mouseMode == MouseMode.HOVER_BOTTOM_TAG,
    hasOutOfDateModules,
    topTagValue,
    bottomTagValue
  );
}