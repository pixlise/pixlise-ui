import { getVectorBetweenPoints } from "src/app/models/Geometry";
import { CanvasMouseEvent, CanvasInteractionResult, CanvasMouseEventId } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MouseMode, ScaleInfo, MapColourScaleModel, MapColourScaleDrawModel } from "./map-colour-scale-model";
import { MinMax } from "src/app/models/BasicTypes";

export class MapColourScaleInteraction {
  private _tagDragYInitialPos: number = 0;
  private _tagDragYTopLimit: number = 0;
  private _tagDragYBottomLimit: number = 0;

  private _dragPosCache: ScaleInfo | null = null;

  constructor(private _mdl: MapColourScaleModel) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._mdl.drawModel.isValid || !this._mdl.drawModel.pos) {
      // Not ready yet or similar...
      return CanvasInteractionResult.neither;
    }

    this._mdl.tagDragYPos = -1;

    // If we're already hijacking mouse events... continue processing as needed
    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG && (this._mdl.mouseMode == MouseMode.DRAG_TOP_TAG || this._mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG)) {
      // Continue drag operation
      return this.handleMouseDrag(event);
    } else if (
      event.eventId == CanvasMouseEventId.MOUSE_UP //||
      //(event.eventId == CanvasMouseEventId.MOUSE_LEAVE && (this._mdl.mouseMode == MouseMode.DRAG_TOP_TAG || this._mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG))
    ) {
      // Finish drag operation
      return this.handleMouseDragEnd(event, this._mdl.drawModel.pos);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      // Potentially starting drag
      return this.handleMouseDown(event, this._mdl.drawModel.pos);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // Check hover
      return this.handleMouseMove(event, this._mdl.drawModel.pos);
    }

    return CanvasInteractionResult.neither;
  }

  protected handleMouseDrag(event: CanvasMouseEvent): CanvasInteractionResult {
    const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);

    // If still just dragging, update dragged items position
    switch (this._mdl.mouseMode) {
      case MouseMode.DRAG_TOP_TAG:
      case MouseMode.DRAG_BOTTOM_TAG:
        this._mdl.tagDragYPos = this._tagDragYInitialPos + moved.y;

        // NOTE: This is in canvas space, increasing values are DOWN the screen...
        // For eg, top might be 30, bottom might be 280
        // So we want to check we're within that range...
        if (this._mdl.tagDragYPos < this._tagDragYTopLimit) {
          this._mdl.tagDragYPos = this._tagDragYTopLimit;
        }
        if (this._mdl.tagDragYPos > this._tagDragYBottomLimit) {
          this._mdl.tagDragYPos = this._tagDragYBottomLimit;
        }

        if (this._dragPosCache) {
          this._mdl.tagRawValue = this.getRawValueForYPos(
            this._mdl.tagDragYPos,
            this._dragPosCache.stepsShown,
            this._dragPosCache.rect.maxY(),
            this._dragPosCache.tagHeight,
            this._dragPosCache.boxHeight
          );
        }

        //console.log('DRAG: '+this._mdl.tagDragYPos+', down='+event.canvasMouseDown.x+','+event.canvasMouseDown.y+', pt='+event.canvasPoint.x+','+event.canvasPoint.y+' moved='+moved.x+','+moved.y+', initial='+this._tagDragYInitialPos+', bottom='+this._tagDragYBottomLimit+', top='+this._tagDragYTopLimit);
        break;
    }
    return CanvasInteractionResult.redrawAndCatch;
  }

  protected checkAndHandleTagClickEvent(event: CanvasMouseEvent): boolean {
    let isClickEvent = false;

    let allowUnclampedMin = false;
    let allowUnclampedMax = false;

    // If we're dragging, check how far we've moved. If it's not far, we'll treat it as a click
    const distanceMoved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
    const distance = Math.sqrt(distanceMoved.x * distanceMoved.x + distanceMoved.y * distanceMoved.y);
    if (distance < 1) {
      const displayValueRange = new MinMax(this._mdl.displayValueRange.min, this._mdl.displayValueRange.max);
      if (this._mdl.mouseMode === MouseMode.DRAG_TOP_TAG) {
        isClickEvent = true;

        let roundedTagRawValue = Math.round(this._mdl.tagRawValue * 100) / 100;
        const newMax = prompt("Enter new max value", roundedTagRawValue.toString());
        if (newMax !== null) {
          const newMaxNum = parseFloat(newMax);
          if (!isNaN(newMaxNum)) {
            displayValueRange.setMax(newMaxNum);
            allowUnclampedMax = true;
          } else {
            const scaleRange = this._mdl.valueRange;
            if (scaleRange.max !== null) {
              displayValueRange.setMax(scaleRange.max);
              this._mdl.tagRawValue = scaleRange.max;
            }
          }
        }
      } else if (this._mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
        isClickEvent = true;

        let roundedTagRawValue = Math.round(this._mdl.tagRawValue * 100) / 100;
        const newMin = prompt("Enter new min value", roundedTagRawValue.toString());
        if (newMin !== null) {
          const newMinNum = parseFloat(newMin);
          if (!isNaN(newMinNum)) {
            displayValueRange.setMin(newMinNum);
            allowUnclampedMin = true;
          } else {
            const scaleRange = this._mdl.valueRange;
            if (scaleRange.min !== null) {
              displayValueRange.setMin(scaleRange.min);
              // TODO: don't need to set this._mdl.tagRawValue ??
            }
          }
        }
      }

      // Set it back on the model
      this._mdl.setDisplayValueRange(displayValueRange, allowUnclampedMin, allowUnclampedMax);
    }

    return isClickEvent;
  }

  protected handleMouseDragEnd(event: CanvasMouseEvent, pos: ScaleInfo): CanvasInteractionResult {
    if (!event?.canvasMouseDown || !event?.canvasPoint) {
      // Not sure why the above would be null?
      return CanvasInteractionResult.neither;
    }

    if (pos && this.checkAndHandleTagClickEvent(event)) {
      const valueRange = this._mdl.valueRange;
      this._mdl.tagDragYPos = valueRange.max
        ? MapColourScaleDrawModel.getScaleYPos(valueRange.max, valueRange, pos.stepsShown, pos.boxHeight, pos.rect.maxY(), pos.tagHeight)
        : 0;

      this._dragPosCache = null;
      this._mdl.tagRawValue = 0;

      return CanvasInteractionResult.redrawAndCatch;
    }

    let result = false;

    if (this._mdl.mouseMode == MouseMode.DRAG_TOP_TAG || this._mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
      // Apply changes
      const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
      const dragEndY = this._tagDragYInitialPos + moved.y;

      // Work out the raw value & set it
      const rawValue = this.getRawValueForYPos(dragEndY, pos.stepsShown, pos.rect.maxY(), pos.tagHeight, pos.boxHeight);
      //console.log('mouse UP mode: '+this._mdl.mouseMode+', tagDrag['+this._tagDragYMin+', '+this._tagDragYMax+'], y='+this._mdl.tagDragYPos+', rawValue='+rawValue);
      if (this._mdl.mouseMode == MouseMode.DRAG_TOP_TAG) {
        // We may have them reversed, eg if both were equal and user dragged one down...
        const toSet = new MinMax();
        if (this._mdl.displayValueRange.min !== null) {
          toSet.expand(this._mdl.displayValueRange.min);
        }
        toSet.expand(rawValue);

        this._mdl.setDisplayValueRange(toSet);

        const valueRange = this._mdl.valueRange;
        if (valueRange.max) {
          this._tagDragYTopLimit = MapColourScaleDrawModel.getScaleYPos(valueRange.max, valueRange, pos.stepsShown, pos.boxHeight, pos.rect.maxY(), pos.tagHeight);
        }

        // Now remain in "hover" mode for this tag...
        this._mdl.mouseMode = MouseMode.HOVER_TOP_TAG;
      } else {
        const toSet = new MinMax();
        if (this._mdl.displayValueRange.max !== null) {
          toSet.expand(this._mdl.displayValueRange.max);
        }
        toSet.expand(rawValue);

        this._mdl.setDisplayValueRange(toSet);

        const valueRange = this._mdl.valueRange;
        if (valueRange.min) {
          this._tagDragYBottomLimit = MapColourScaleDrawModel.getScaleYPos(valueRange.min, valueRange, pos.stepsShown, pos.boxHeight, pos.rect.maxY(), pos.tagHeight);
        }

        // Now remain in "hover" mode for this tag...
        this._mdl.mouseMode = MouseMode.HOVER_BOTTOM_TAG;
      }

      //this._ctx.saveState("layer scale tab");
      result = true;
    } else {
      this._mdl.mouseMode = MouseMode.NONE;
    }

    this._mdl.tagDragYPos = -1;
    this._dragPosCache = null;
    this._mdl.tagRawValue = 0;

    if (result) {
      return CanvasInteractionResult.redrawAndCatch;
    }
    return CanvasInteractionResult.neither;
  }

  protected handleMouseDown(event: CanvasMouseEvent, pos: ScaleInfo): CanvasInteractionResult {
    // Check if we're starting any sort of drag...
    if (pos.rect.containsPoint(event.canvasPoint)) {
      const scaleTagValues = this._mdl.displayValueRange;
      const dataValueRange = this._mdl.valueRange;

      if (this._mdl.displayScalingAllowed && scaleTagValues.isValid()) {
        // At this point, check if we're at least hovering over the buttons
        if (pos.getTagRect(true).containsPoint(event.canvasPoint)) {
          this._mdl.mouseMode = MouseMode.DRAG_TOP_TAG;
          this._mdl.tagDragYPos = MapColourScaleDrawModel.getScaleYPos(
            scaleTagValues.max!,
            dataValueRange,
            pos.stepsShown,
            pos.boxHeight,
            pos.rect.maxY(),
            pos.tagHeight
          );
        } else if (pos.getTagRect(false).containsPoint(event.canvasPoint)) {
          this._mdl.mouseMode = MouseMode.DRAG_BOTTOM_TAG;
          this._mdl.tagDragYPos = MapColourScaleDrawModel.getScaleYPos(
            scaleTagValues.min!,
            dataValueRange,
            pos.stepsShown,
            pos.boxHeight,
            pos.rect.maxY(),
            pos.tagHeight
          );
        }
      }

      // If we're dragging tags, remember how far they can go
      if (this._mdl.mouseMode == MouseMode.DRAG_TOP_TAG || this._mdl.mouseMode == MouseMode.DRAG_BOTTOM_TAG) {
        // Work out the min/max values we're allowed to drag between. When we're done
        // we apply the value as a % between these values, so it's important!
        if (dataValueRange.isValid()) {
          this._tagDragYBottomLimit = MapColourScaleDrawModel.getScaleYPos(
            dataValueRange.min!,
            dataValueRange,
            pos.stepsShown,
            pos.boxHeight,
            pos.rect.maxY(),
            pos.tagHeight
          );
          this._tagDragYTopLimit = MapColourScaleDrawModel.getScaleYPos(
            dataValueRange.max!,
            dataValueRange,
            pos.stepsShown,
            pos.boxHeight,
            pos.rect.maxY(),
            pos.tagHeight
          );
        }

        this._tagDragYInitialPos = this._mdl.tagDragYPos;

        this._dragPosCache = pos;

        // Set the initial value...
        this._mdl.tagRawValue = this.getRawValueForYPos(
          this._mdl.tagDragYPos,
          this._dragPosCache.stepsShown,
          this._dragPosCache.rect.maxY(),
          pos.tagHeight,
          pos.boxHeight
        );
        return CanvasInteractionResult.redrawAndCatch;
      }
    }

    this._mdl.mouseMode = MouseMode.NONE;
    return CanvasInteractionResult.neither;
  }

  protected handleMouseMove(event: CanvasMouseEvent, pos: ScaleInfo): CanvasInteractionResult {
    // Check if mouse is hovering over us...
    if (pos.rect.containsPoint(event.canvasPoint)) {
      // At this point, check if we're at least hovering over the buttons
      if (this._mdl.displayScalingAllowed && pos.getTagRect(true).containsPoint(event.canvasPoint)) {
        this._mdl.mouseMode = MouseMode.HOVER_TOP_TAG;
      } else if (this._mdl.displayScalingAllowed && pos.getTagRect(false).containsPoint(event.canvasPoint)) {
        this._mdl.mouseMode = MouseMode.HOVER_BOTTOM_TAG;
      } else {
        this._mdl.mouseMode = MouseMode.HOVER_MOVE;
      }
      return CanvasInteractionResult.redrawAndCatch;
    }

    if (this._mdl.mouseMode != MouseMode.NONE) {
      this._mdl.mouseMode = MouseMode.NONE;
      return CanvasInteractionResult.redrawAndCatch;
    }
    return CanvasInteractionResult.neither;
  }

  protected getRawValueForYPos(y: number, stepsShown: number, bottomY: number, tagHeight: number, boxHeight: number): number {
    // Y pixel position -> rawValue
    const scaleH = stepsShown * boxHeight;
    const scaleY = bottomY - tagHeight - scaleH;

    // NOTE: have to flip Y!
    let pct = 1 - (y - scaleY) / scaleH;

    // Also clamp it!
    if (pct > 1) {
      pct = 1;
    } else if (pct < 0) {
      pct = 0;
    }

    const valueRange = this._mdl.valueRange;
    return (valueRange.min || 0) + pct * valueRange.getRange();
  }
}
