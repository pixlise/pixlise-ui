import { Point } from "@angular/cdk/drag-drop";
import { DataExpression } from "src/app/generated-protos/expressions";
import { MinMax } from "src/app/models/BasicTypes";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { Rect, getVectorBetweenPoints } from "src/app/models/Geometry";
import { Histogram } from "src/app/models/histogram";
import {
  CanvasDrawParameters,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { drawTextWithBackground, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { getValueDecimals } from "src/app/utils/utils";
import { MapPointState } from "../../../../models/map-layer";
import { IContextImageModel } from "../../context-image-model-interface";
import { drawStrokedText } from "../base-ui-element";
import { MapColourScale } from "./map-colour-scale";
import { ScaleInfo } from "./map-colour-scale-model";


export class LayerChannelScale {
  private _startTranslation: Point | null = null;
  private _mouseMode: MouseMode = MouseMode.NONE;

  private _tagDragYPos: number = 0;
  private _tagDragYInitialPos: number = 0;
  private _tagDragYTopLimit: number = 0;
  private _tagDragYBottomLimit: number = 0;

  private _tagRawValue: number = 0;

  private _dragPosCache: ScaleInfo | null = null;

  private _boxHeight: number = 0;

  private _manualScaleMin: number | null = null;
  private _manualScaleMax: number | null = null;

  constructor(
    private _ctx: IContextImageModel,
    public layer: IColourScaleDataSource,
    private _channel: number
  ) {}

  // The inputs and outputs to this UI element - brought together here because we now need not only to operate on a "layer", but also
  // in the situation of dataset-relative scaling, we need to set the models "display view range" min/max values
  protected getScaleRange(): MinMax {
    // If we're in dataset-relative mode, we need the max of the entire dataset
    if (!this._ctx.elementRelativeShading) {
      let layerMan = this._ctx.layerManager;
      return layerMan.weightPctValueRange;
    }

    let layer = this.getMapLayer();
    if (!layer) {
      return null;
    }

    let layerRange = layer.getValueRange(this._channel);
    if (this._manualScaleMax !== null) {
      layerRange.setMax(this._manualScaleMax);
    }
    if (this._manualScaleMin !== null) {
      layerRange.setMin(this._manualScaleMin);
    }

    return layerRange;
  }

  protected getScaleTagValues(): MinMax {
    if (!this._ctx.elementRelativeShading) {
      return this._ctx.layerManager.datasetRelativeDisplayRange;
    }

    let layer = this.getMapLayer();
    if (!layer) {
      return null;
    }

    let displayValueRange = layer.getDisplayValueRange(this._channel);
    if (this._manualScaleMax !== null) {
      displayValueRange.setMax(this._manualScaleMax);
    }
    if (this._manualScaleMin !== null) {
      displayValueRange.setMin(this._manualScaleMin);
    }
    return new MinMax(displayValueRange.min, displayValueRange.max);
  }

  protected setDisplayValueRangeMin(value: number): void {
    if (!this._ctx.elementRelativeShading) {
      this._ctx.layerManager.setDatasetRelativeDisplayMin(value);
      return;
    }

    let layer = this.getMapLayer();
    if (layer) {
      layer.setDisplayValueRangeMin(this._channel, value);
    }
  }

  protected setDisplayValueRangeMax(value: number): void {
    if (!this._ctx.elementRelativeShading) {
      this._ctx.layerManager.setDatasetRelativeDisplayMax(value);
      return;
    }

    let layer = this.getMapLayer();
    if (layer) {
      layer.setDisplayValueRangeMax(this._channel, value);
    }
  }

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw the scale for the top visible layer
    let layer = this.getMapLayer();
    if (layer) {
      let pos = this.getPosition(drawParams.drawViewport, drawParams.worldTransform, layer);
      this.drawColourScale(screenContext, pos, drawParams.drawViewport.height, drawParams.drawViewport.width, layer);
    }
  }

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    let layer = this.getMapLayer();
    if (layer) {
      let histogram = layer.getHistogram(this._channel);
      if (!MapColourScale.isMapDataValid(histogram)) {
        return CanvasInteractionResult.neither;
      }
    }

    this._tagDragYPos = 0;

    // If we're already hijacking mouse events... continue processing as needed
    if (
      event.eventId == CanvasMouseEventId.MOUSE_DRAG &&
      (this._mouseMode == MouseMode.DRAG_ALL || this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG)
    ) {
      // Continue drag operation
      return this.handleMouseDrag(event);
    } else if (
      event.eventId == CanvasMouseEventId.MOUSE_UP ||
      (event.eventId == CanvasMouseEventId.MOUSE_LEAVE &&
        (this._mouseMode == MouseMode.DRAG_ALL || this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG))
    ) {
      // Finish drag operation
      return this.handleMouseDragEnd(event);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      // Potentially starting drag
      return this.handleMouseDown(event);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // Check hover
      return this.handleMouseMove(event);
    }

    return CanvasInteractionResult.neither;
  }

  protected handleMouseDrag(event: CanvasMouseEvent): CanvasInteractionResult {
    const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);

    // If still just dragging, update dragged items position
    switch (this._mouseMode) {
      case MouseMode.DRAG_TOP_TAG:
      case MouseMode.DRAG_BOTTOM_TAG:
        this._tagDragYPos = this._tagDragYInitialPos + moved.y;

        // NOTE: This is in canvas space, increasing values are DOWN the screen...
        // For eg, top might be 30, bottom might be 280
        // So we want to check we're within that range...
        if (this._tagDragYPos < this._tagDragYTopLimit) {
          this._tagDragYPos = this._tagDragYTopLimit;
        }
        if (this._tagDragYPos > this._tagDragYBottomLimit) {
          this._tagDragYPos = this._tagDragYBottomLimit;
        }

        let layer = this.getMapLayer();
        if (layer && this._dragPosCache) {
          this._tagRawValue = this.getRawValueForYPos(this._tagDragYPos, this._dragPosCache.stepsShown, this._dragPosCache.rect.maxY(), this._dragPosCache.tagHeight);
        }

        //console.log('DRAG: '+this._tagDragYPos+', down='+event.canvasMouseDown.x+','+event.canvasMouseDown.y+', pt='+event.canvasPoint.x+','+event.canvasPoint.y+' moved='+moved.x+','+moved.y+', initial='+this._tagDragYInitialPos+', bottom='+this._tagDragYBottomLimit+', top='+this._tagDragYTopLimit);
        break;
      case MouseMode.DRAG_ALL:
        this._startTranslation = this._ctx.uiLayerScaleTranslation.copy();
        this._ctx.uiLayerScaleTranslation = moved.copy();
        if (this._startTranslation) {
          this._ctx.uiLayerScaleTranslation.x += this._startTranslation.x;
          this._ctx.uiLayerScaleTranslation.y += this._startTranslation.y;
        }
        break;
    }
    return CanvasInteractionResult.redrawAndCatch;
  }

  protected checkAndHandleTagClickEvent(event: CanvasMouseEvent): boolean {
    let isClickEvent = false;

    // If we're dragging, check how far we've moved. If it's not far, we'll treat it as a click
    const distanceMoved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
    const distance = Math.sqrt(distanceMoved.x * distanceMoved.x + distanceMoved.y * distanceMoved.y);
    if (distance < 1) {
      if (this._mouseMode === MouseMode.DRAG_TOP_TAG) {
        isClickEvent = true;
        const newMax = prompt("Enter new max value", this._tagRawValue.toString());
        const newMaxNum = parseFloat(newMax);
        if (!isNaN(newMaxNum)) {
          this._manualScaleMax = newMaxNum;
          this.setDisplayValueRangeMax(this._manualScaleMax);
        } else {
          const scaleRange = this.getScaleRange();
          this._manualScaleMax = null;
          this.setDisplayValueRangeMax(scaleRange.max);
          this._tagRawValue = scaleRange.max;
        }
      } else if (this._mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
        isClickEvent = true;
        const newMin = prompt("Enter new min value", this._tagRawValue.toString());
        const newMinNum = parseFloat(newMin);
        if (!isNaN(newMinNum)) {
          this._manualScaleMin = newMinNum;
          this.setDisplayValueRangeMin(this._manualScaleMin);
        } else {
          const scaleRange = this.getScaleRange();
          this._manualScaleMin = null;
          this.setDisplayValueRangeMin(scaleRange.min);
        }
      }
    }

    return isClickEvent;
  }

  protected handleMouseDragEnd(event: CanvasMouseEvent): CanvasInteractionResult {
    const layer = this.getMapLayer();
    if (!layer || !event?.canvasMouseDown || !event?.canvasPoint) {
      return CanvasInteractionResult.neither;
    }

    if (this.checkAndHandleTagClickEvent(event)) {
      const pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);
      const valueRange = this.getScaleRange();
      this._tagDragYPos = this.getScaleYPos(valueRange.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);

      this._startTranslation = null;
      this._dragPosCache = null;
      this._tagRawValue = 0;

      return CanvasInteractionResult.redrawAndCatch;
    }

    let result = false;

    if (this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      // Apply changes
      const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
      const dragEndY = this._tagDragYInitialPos + moved.y;

      const pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);

      // Work out the raw value & set it
      const rawValue = this.getRawValueForYPos(dragEndY, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
      //console.log('mouse UP mode: '+this._mouseMode+', tagDrag['+this._tagDragYMin+', '+this._tagDragYMax+'], y='+this._tagDragYPos+', rawValue='+rawValue);
      if (this._mouseMode == MouseMode.DRAG_TOP_TAG) {
        this.setDisplayValueRangeMax(rawValue);
        this._manualScaleMax = null;

        const valueRange = this.getScaleRange();
        this._tagDragYTopLimit = this.getScaleYPos(valueRange.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);

        // Now remain in "hover" mode for this tag...
        this._mouseMode = MouseMode.HOVER_TOP_TAG;
      } else {
        this.setDisplayValueRangeMin(rawValue);
        this._manualScaleMin = null;

        const valueRange = this.getScaleRange();
        this._tagDragYBottomLimit = this.getScaleYPos(valueRange.min, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);

        // Now remain in "hover" mode for this tag...
        this._mouseMode = MouseMode.HOVER_BOTTOM_TAG;
      }

      this._ctx.saveState("layer scale tab");
      result = true;
    } else {
      this._mouseMode = MouseMode.NONE;
    }

    this._tagDragYPos = 0;
    this._startTranslation = null;
    this._dragPosCache = null;
    this._tagRawValue = 0;

    if (result) {
      return CanvasInteractionResult.redrawAndCatch;
    }
    return CanvasInteractionResult.neither;
  }

  protected handleMouseDown(event: CanvasMouseEvent): CanvasInteractionResult {
    const layer = this.getMapLayer();
    if (!layer) {
      return CanvasInteractionResult.neither;
    }

    // Check if we're starting any sort of drag...
    const pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);
    if (pos.rect.containsPoint(event.canvasPoint)) {
      const scaleTagValues = this.getScaleTagValues();

      // At this point, check if we're at least hovering over the buttons
      if (layer.displayScalingAllowed && pos.topTagRect.containsPoint(event.canvasPoint)) {
        this._mouseMode = MouseMode.DRAG_TOP_TAG;
        this._tagDragYPos = this.getScaleYPos(scaleTagValues.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
      } else if (layer.displayScalingAllowed && pos.bottomTagRect.containsPoint(event.canvasPoint)) {
        this._mouseMode = MouseMode.DRAG_BOTTOM_TAG;
        this._tagDragYPos = this.getScaleYPos(scaleTagValues.min, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
      } else {
        this._mouseMode = MouseMode.DRAG_ALL;
      }

      this._startTranslation = this._ctx.uiLayerScaleTranslation.copy();

      // If we're dragging tags, remember how far they can go
      if (this._mouseMode == MouseMode.DRAG_TOP_TAG || this._mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
        // Work out the min/max values we're allowed to drag between. When we're done
        // we apply the value as a % between these values, so it's important!
        const valueRange = this.getScaleRange();

        this._tagDragYBottomLimit = this.getScaleYPos(valueRange.min, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);
        this._tagDragYTopLimit = this.getScaleYPos(valueRange.max, pos.stepsShown, pos.rect.maxY(), pos.tagHeight);

        this._tagDragYInitialPos = this._tagDragYPos;

        this._dragPosCache = pos;

        // Set the initial value...
        this._tagRawValue = this.getRawValueForYPos(this._tagDragYPos, this._dragPosCache.stepsShown, this._dragPosCache.rect.maxY(), pos.tagHeight);
        //console.log('mouse DOWN mode: '+this._mouseMode+', tagDrag['+this._tagDragYMin+', '+this._tagDragYMax+'], y='+this._tagDragYPos);
        //console.log(pos);
      }
      return CanvasInteractionResult.redrawAndCatch;
    }

    this._mouseMode = MouseMode.NONE;
    return CanvasInteractionResult.neither;
  }

  protected handleMouseMove(event: CanvasMouseEvent): CanvasInteractionResult {
    const layer = this.getMapLayer();
    if (!layer) {
      return CanvasInteractionResult.neither;
    }

    // Check if mouse is hovering over us...
    const pos = this.getPosition(event.canvasParams, this._ctx.transform, layer);
    if (pos.rect.containsPoint(event.canvasPoint)) {
      // At this point, check if we're at least hovering over the buttons
      if (layer.displayScalingAllowed && pos.topTagRect.containsPoint(event.canvasPoint)) {
        this._mouseMode = MouseMode.HOVER_TOP_TAG;
      } else if (layer.displayScalingAllowed && pos.bottomTagRect.containsPoint(event.canvasPoint)) {
        this._mouseMode = MouseMode.HOVER_BOTTOM_TAG;
      } else {
        this._mouseMode = MouseMode.HOVER_MOVE;
      }
      return CanvasInteractionResult.redrawAndCatch;
    }

    if (this._mouseMode != MouseMode.NONE) {
      this._mouseMode = MouseMode.NONE;
      return CanvasInteractionResult.redrawAndCatch;
    }
    return CanvasInteractionResult.neither;
  }

  protected getPosition(viewport: CanvasParams, transform: CanvasWorldTransform, layer: IColourScaleDataSource): ScaleInfo {
    const baseSize = 16;

    // Make everything a calc from the above, can easily scale it!
    const txtGap = baseSize / 3;
    const fontSize = baseSize - 3;
    const boxWidth = baseSize * (layer.channelCount == 1 ? 2 : 1);
    const histBarMaxSize = boxWidth;
    const labelMaxWidth = fontSize * 5;
    const tagHeight = baseSize * 1.2;
    const tagYPadding = tagHeight / 2;

    const edgeMargin = 8;

    this._boxHeight = layer.isBinary ? baseSize : 3;
    const stepMul = layer.channelCount == 1 ? 2 : 4; // smaller if showing more scales
    const stepsShown = layer.isBinary ? 2 : Math.floor(256 / (this._boxHeight * stepMul));

    const scaleH = stepsShown * this._boxHeight;
    const h = Math.floor(fontSize * 2 + scaleH + tagYPadding);

    // Reverse idx here, 0 ends up at the bottom, we want R at the top (in case of multi-channel)
    const idxForHeight = layer.channelCount - this._channel - 1;

    const rect = new Rect(
      Math.floor(edgeMargin + this._ctx.uiLayerScaleTranslation.x),
      Math.floor(viewport.height - edgeMargin - h + this._ctx.uiLayerScaleTranslation.y) - idxForHeight * h,
      histBarMaxSize + boxWidth + labelMaxWidth,
      h
    );

    const tagX = Math.floor(rect.x + histBarMaxSize);
    const scaleTagValues = this.getScaleTagValues();

    let topTagY = this.getScaleYPos(scaleTagValues.max, stepsShown, rect.maxY(), tagHeight);
    if (this._mouseMode == MouseMode.DRAG_TOP_TAG) {
      topTagY = this._tagDragYPos;
    }

    let bottomTagY = this.getScaleYPos(scaleTagValues.min, stepsShown, rect.maxY(), tagHeight);
    if (this._mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      bottomTagY = this._tagDragYPos;
    }

    return new ScaleInfo(
      rect,
      this._boxHeight,
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

  protected getScaleYPos(rawValue: number, stepsShown: number, bottomY: number, tagHeight: number): number {
    // rawValue -> Y pixel position
    const scaleH = stepsShown * this._boxHeight;
    const scaleY = bottomY - tagHeight - scaleH;

    // NOTE: have to flip Y!
    const valueRange = this.getScaleRange();
    return scaleY + (1 - valueRange.getAsPercentageOfRange(rawValue, false)) * scaleH;
  }

  protected getRawValueForYPos(y: number, stepsShown: number, bottomY: number, tagHeight: number): number {
    // Y pixel position -> rawValue
    const scaleH = stepsShown * this._boxHeight;
    const scaleY = bottomY - tagHeight - scaleH;

    // NOTE: have to flip Y!
    const pct = 1 - (y - scaleY) / scaleH;

    const valueRange = this.getScaleRange();
    return valueRange.min + pct * valueRange.getRange();
  }

  protected getMapLayer(): IColourScaleDataSource {
    return this.layer;
  }
}
