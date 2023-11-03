import { MinMax } from "src/app/models/BasicTypes";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { Rect } from "src/app/models/Geometry";
import { MapPointState } from "src/app/modules/image-viewers/models/map-layer";
import { Colours } from "src/app/utils/colours";
import { drawTextWithBackground, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { getValueDecimals } from "src/app/utils/utils";
import { drawStrokedText } from "../base-ui-element";
import { MapColourScale } from "./map-colour-scale";
import { MapColourScaleDrawModel } from "./map-colour-scale-model";

export class MapColourScaleDrawer {
  drawColourScale(
    screenContext: CanvasRenderingContext2D,
    mdl: MapColourScaleDrawModel,
    viewportHeight: number,
    viewportWidth: number,
    layer: IColourScaleDataSource
  ): void {
    const clrBlack = Colours.BLACK.asString();
    const clrBottomTag = Colours.CONTEXT_BLUE.asString();
    const clrTopTag = Colours.CONTEXT_PURPLE.asString();

    screenContext.font = mdl.pos.fontSize + "px Roboto";
    screenContext.textAlign = "left";

    if (!MapColourScale.isMapDataValid(mdl.histogram)) {
      // Quantification returned all 0's, so don't draw the usual scale, just
      // draw an error msg to the middle of the viewport
      screenContext.textBaseline = "middle";
      screenContext.textAlign = "center";

      const msg = layer.name + " Not Detected";
      drawStrokedText(screenContext, msg, viewportWidth / 2, viewportHeight / 2);
      return;
    }

    screenContext.textBaseline = "top";

    // Draw the actual scale
    this.drawScale(screenContext, mdl, layer, clrBlack);

    // Draw the title at the top
    const pos = mdl.pos;

    drawTextWithBackground(
      screenContext,
      mdl.scaleName,
      pos.rect.x + pos.histBarMaxSize,
      pos.rect.y,
      pos.fontSize,
      4,
      Colours.GRAY_100.asStringWithA(0.5),
      mdl.hasOutOfDateModules ? Colours.ORANGE.asString() : Colours.GRAY_10.asString()
    );
    //drawStrokedText(screenContext, layer.getChannelName(this._channel), pos.rect.x+pos.histBarMaxSize, pos.rect.y);

    // Draw the tags for above/below the range. If it's hovered, the tags are bigger so it's clear theyre draggable
    if (mdl.histogram.values.length > 2 && layer.displayScalingAllowed) {
      // Draw the tag if we're hovering over the ctrl in general, but if we're hovering over a given tag
      // only draw that one
      const tags = mdl.scaleTagValues;
      if (!tags || !tags.isValid()) {
        return;
      }

      const topTagValue = mdl.topTagOverrideValue === null ? tags.max! : mdl.topTagOverrideValue;
      const bottomTagValue = mdl.bottomTagOverrideValue === null ? tags.min! : mdl.bottomTagOverrideValue;

      // Bottom tag
      if (!isNaN(bottomTagValue) && bottomTagValue !== null) {
        // We had instances where expression failed, min/max/value were null, don't want to draw then!
        this.drawTag(screenContext, pos.bottomTagRect, mdl, clrBottomTag, bottomTagValue, mdl.scaleRange);
      }

      // Top tag
      if (!isNaN(topTagValue) && topTagValue !== null) {
        // We had instances where expression failed, min/max/value were null, don't want to draw then!
        this.drawTag(screenContext, pos.topTagRect, mdl, clrTopTag, topTagValue, mdl.scaleRange);
      }
    }
  }

  /*
  Draws the scale area:
   __
  |  |  "topFrame", drawn if our gradient range doesn't extend to the top of the scale
  XXXX  The gradient area is a bunch of filled rects
  ||||
  OOOO
  |__|  "bottomFrame", drawn if our gradient range doesn't extend to the top of the scale
  
  */
  private drawScale(screenContext: CanvasRenderingContext2D, mdl: MapColourScaleDrawModel, layer: IColourScaleDataSource, labelStyle: string) {
    const pos = mdl.pos;
    const scaleRange = mdl.scaleRange;

    if (scaleRange.min === null || scaleRange.max === null) {
      return;
    }

    let rawValue = scaleRange.min;
    const rawIncr = scaleRange.getRange() / (pos.stepsShown - 1);

    // Start drawing them from the bottom up
    const startingY = Math.floor(pos.rect.maxY() - pos.tagYPadding - pos.boxHeight);
    let y = startingY;
    const x = Math.floor(pos.rect.x + pos.histBarMaxSize);

    // If we're not filling the whole area with scale gradient, we will draw a frame around the top/bottom area
    // Here we store vars to make that happen
    let topFrameYPos: number | null = null;
    let topFrameColour: string = "";
    let bottomFrameYPos: number | null = null;
    let bottomFrameColour: string = "";

    const showHoverText = mdl.hoverValue !== null;

    // Calculate which step in the loop to show the hover text if it should be visible
    let showAtStep = 0;
    if (mdl.hoverValue !== null && mdl.hoverValue > rawValue) {
      // Only show hover text at these 5 intervals
      const showRanges = [0, pos.stepsShown - 1, Math.floor(pos.stepsShown / 2), Math.floor(pos.stepsShown / 4), Math.floor((pos.stepsShown * 3) / 4)];

      // Get the closest step corresponding to the hover value
      showAtStep = Math.min(Math.floor((mdl.hoverValue - rawValue) / rawIncr), pos.stepsShown - 1);

      // Convert the closest step to the closest interval
      showAtStep = showRanges.reduce((prev, curr) => (Math.abs(curr - showAtStep) < Math.abs(prev - showAtStep) ? curr : prev));
    }

    // Min box (bottom) to Max box (top) in steps
    let lastState: MapPointState | null = null;
    for (let c = 0; c < pos.stepsShown; c++) {
      // Draw the rect
      const rep = mdl.getDrawParamsForRawValue(rawValue, mdl.displayValueRange);
      if (rep.state == MapPointState.IN_RANGE) {
        // Get the color of the top-most gradient rectangle
        topFrameColour = rep.colour.asString();

        screenContext.fillStyle = rep.colour.asString();
        screenContext.fillRect(x, y, pos.boxWidth, pos.boxHeight);
      }

      // Save info for drawing the rects at the end
      if (lastState != rep.state) {
        if (lastState == MapPointState.BELOW) {
          bottomFrameYPos = y;
          // Get the color of the bottom-most gradient rectangle
          bottomFrameColour = rep.colour.asString();
        } else if (lastState == MapPointState.IN_RANGE) {
          topFrameYPos = y;
        }

        lastState = rep.state;
      }

      // Draw the label if required

      // NOTE: for binary we calculate position differently...
      let printValue = "";
      let lblYOffset = 0;
      if (mdl.histogram.values.length == 2) {
        if (mdl.histogram.max() != 0) {
          // If it's binary, show text labels, otherwise the values (it may be a map of say all 3 and 8's)
          if (scaleRange.min == 0 && scaleRange.max == 1) {
            // Assume 0==false, 1==true
            printValue = c == 0 ? "False" : "True";
          } else {
            // Draw the min vs max of the value range
            // NOTE: This needs to be limited to the top & bottom of the range, otherwise we end up drawing
            //       the same value going up the entire chart
            if (
              c == 0 || // bottom
              c == pos.stepsShown - 1 // top
            ) {
              printValue = this.getScaleValueStr(Math.round(c == 0 ? scaleRange.min : scaleRange.max), scaleRange);
            }
          }

          // Draw these labels next to the 2 boxes we show in case of a binary map
          lblYOffset = 8;
        }
      } else if (
        c == 0 || // bottom
        c == pos.stepsShown - 1 || // top
        c == Math.floor(pos.stepsShown / 2) || // middle
        c == Math.floor(pos.stepsShown / 4) || // bottom-qtr
        c == Math.floor((pos.stepsShown * 3) / 4) // top-qtr
      ) {
        printValue = this.getScaleValueStr(scaleRange.min + scaleRange.getRange() * (c / pos.stepsShown), scaleRange);
      }

      screenContext.fillStyle = labelStyle;

      const padding = 2;
      if (printValue.length > 0) {
        drawTextWithBackground(screenContext, printValue, x + pos.boxWidth + pos.txtGap, y + lblYOffset - pos.fontSize / 2, pos.fontSize, padding);
      }

      if (showHoverText && showAtStep === c) {
        let xOffset = x + pos.boxWidth + pos.txtGap;
        xOffset = xOffset + screenContext.measureText(printValue.length > 0 ? printValue : "0.0").width;

        // Draw arrow pointing at closest label
        screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
        screenContext.beginPath();
        screenContext.moveTo(xOffset + padding, y + lblYOffset - pos.fontSize / 2 + padding * 3);
        screenContext.lineTo(xOffset + 12 - padding, y + lblYOffset - pos.fontSize + padding * 3);
        screenContext.lineTo(xOffset + 12 - padding, y + lblYOffset + padding * 3);
        screenContext.fill();
        screenContext.fillStyle = labelStyle;

        // TODO: Hover value is not necessarily % at this point is it???
        drawTextWithBackground(screenContext, `${mdl.hoverValue!.toFixed(2)}%`, xOffset + 12, y + lblYOffset - pos.fontSize / 2, pos.fontSize, padding);
      }

      // Draw histogram bar if there is one
      if (mdl.histogram.values.length && mdl.histogram.values.length > 2) {
        const histBarLength = (mdl.histogram.values[c] / mdl.histogram.max()) * pos.histBarMaxSize;
        screenContext.fillRect(x - histBarLength - 1, y, histBarLength, pos.boxHeight);

        // Draw a white tip (for dark background situations)
        screenContext.lineWidth = 1;
        screenContext.strokeStyle = Colours.WHITE.asString();
        screenContext.beginPath();
        screenContext.moveTo(x - histBarLength - 1, y);
        screenContext.lineTo(x - histBarLength - 1, y + pos.boxHeight);
        screenContext.stroke();
      }

      // Move up to the next one
      y -= pos.boxHeight;

      rawValue += rawIncr;
    }

    // If we have anything to draw outside the range, do it
    if (bottomFrameYPos != null) {
      if (layer.channelCount > 1) {
        if (bottomFrameColour.length > 0) {
          screenContext.fillStyle = bottomFrameColour;
        }
        screenContext.fillRect(x, startingY, pos.boxWidth, bottomFrameYPos - startingY);
      } else {
        // Color for blue bottom slider bar
        const minRep = mdl.getDrawParamsForRawValue(scaleRange.min, mdl.displayValueRange);
        screenContext.strokeStyle = minRep.colour.asString();
        screenContext.lineWidth = 2;
        screenContext.beginPath();
        screenContext.moveTo(x, pos.bottomTagRect.midY());
        screenContext.lineTo(x, startingY);
        screenContext.lineTo(x + pos.boxWidth, startingY);
        screenContext.lineTo(x + pos.boxWidth, pos.bottomTagRect.midY());
        screenContext.stroke();
      }
    }

    if (topFrameYPos != null) {
      if (layer.channelCount > 1) {
        if (topFrameColour.length > 0) {
          screenContext.fillStyle = topFrameColour;
        }
        screenContext.fillRect(x, topFrameYPos + 4, pos.boxWidth, y - topFrameYPos - 2);
      } else {
        // Color for pink top slider bar
        const maxRep = mdl.getDrawParamsForRawValue(scaleRange.max, mdl.displayValueRange);
        screenContext.strokeStyle = maxRep.colour.asString();
        screenContext.lineWidth = 2;

        // y is the top of the box, we don't want it to quite extend that far
        y += 2;
        screenContext.beginPath();
        screenContext.moveTo(x, pos.topTagRect.midY());
        screenContext.lineTo(x, y);
        screenContext.lineTo(x + pos.boxWidth, y);
        screenContext.lineTo(x + pos.boxWidth, pos.topTagRect.midY());
        screenContext.stroke();
      }
    }
  }

  /*
      Draws an entire tag:
         ____    ________
       -<____>-< | 1.234 |   (Tag only drawn if showValue==true)
                 --------
       "sample box"   Tag
  
  */
  private drawTag(screenContext: CanvasRenderingContext2D, rect: Rect, mdl: MapColourScaleDrawModel, colour: string, value: number, scaleRange: MinMax) {
    screenContext.lineWidth = 2;

    const pos = mdl.pos;

    const midY = rect.midY();
    const tagTextX = rect.x + pos.boxWidth;

    const shrink = 3;
    const yHeight = 4;

    // Fill in the area behind the sample box
    const rep = mdl.getDrawParamsForRawValue(value, mdl.displayValueRange);
    if (rep.state == MapPointState.IN_RANGE) {
      screenContext.fillStyle = rep.colour.asString();
      screenContext.fillRect(rect.x + shrink + 1, midY - yHeight / 2 + 1, pos.boxWidth - shrink - shrink - 2, yHeight - 2);
    }

    screenContext.strokeStyle = colour;
    screenContext.fillStyle = colour;

    // The line (2 parts, we don't want to draw where the rect is going!)
    screenContext.beginPath();
    screenContext.moveTo(rect.x, midY);
    screenContext.lineTo(rect.x + shrink, midY);

    screenContext.moveTo(tagTextX - shrink, midY);
    screenContext.lineTo(tagTextX, midY);
    screenContext.stroke();

    // And colour sample box
    if (mdl.showTagValue) {
      screenContext.lineWidth = 3;
    }

    screenContext.strokeRect(rect.x + shrink, midY - yHeight / 2, pos.boxWidth - shrink - shrink, yHeight);

    // And the label if needed
    if (mdl.showTagValue) {
      // Draw a box for the value with a triangle pointing towards the line
      const tagBoxLeft = tagTextX + 6;

      const valueStr = this.getScaleValueStr(value, scaleRange);
      screenContext.beginPath();
      screenContext.moveTo(tagTextX, midY);
      screenContext.lineTo(tagBoxLeft, rect.y);
      screenContext.lineTo(tagBoxLeft, rect.maxY());
      screenContext.closePath();
      screenContext.fill();

      screenContext.fillRect(tagBoxLeft, rect.y, valueStr.length * pos.fontSize * CANVAS_FONT_WIDTH_PERCENT + pos.txtGap, rect.h);

      screenContext.fillStyle = Colours.WHITE.asString();
      screenContext.textBaseline = "bottom";
      screenContext.fillText(valueStr, tagBoxLeft + pos.txtGap, rect.maxY() - 2);
    }
  }

  private getScaleValueStr(value: number, valueRange: MinMax): string {
    const decimals = getValueDecimals(valueRange.getRange());

    if (value === null) {
      // Shouldn't be null but we've got the odd sentry report for this
      return "null";
    }

    return value.toFixed(decimals);
  }
}
