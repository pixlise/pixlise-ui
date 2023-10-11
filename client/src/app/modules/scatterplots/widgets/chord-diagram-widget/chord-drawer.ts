import { Point } from "src/app/models/Geometry";
import { CanvasDrawer, CanvasParams, CanvasDrawParameters } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE, drawErrorIcon } from "src/app/utils/drawing";
import { ChordViewNode, ChordDrawMode, ChordDiagramModel, ChordDiagramDrawModel } from "./chord-model";

export class ChordDiagramDrawer implements CanvasDrawer {
  private COLOUR_NODE = "rgba(245, 247, 250, 0.4)";
  private COLOUR_NODE_LABEL_BACKGROUND = Colours.GRAY_90.asString();

  private COLOUR_NODE_LABEL = Colours.GRAY_10.asString();

  private COLOUR_NODE_ERROR = Colours.PURPLE.asString();

  private COLOUR_CHORD_POSITIVE = Colours.BLUE.asString();
  private COLOUR_CHORD_NEGATIVE = Colours.YELLOW.asString();

  constructor(protected _mdl: ChordDiagramModel) {}

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this._mdl.recalcDisplayDataIfNeeded(drawParams.drawViewport);

    this.drawChordDiagram(this._mdl.drawModel, screenContext, drawParams.drawViewport);
  }

  private drawChordDiagram(drawModel: ChordDiagramDrawModel, screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void {
    const restrictToElementIdx = this._mdl.hoverElementIdx == -1 ? this._mdl.selectedElementIdx : this._mdl.hoverElementIdx;

    // If there's a chord being highlighted, draw something under there first
    let chordHighlightIdx1 = -1;
    let chordHighlightIdx2 = -1;

    for (let i = 0; i < drawModel.nodes.length; i++) {
      const node = drawModel.nodes[i];
      if (this._mdl.hoverChordExprIds.length == 2) {
        if (node.item.exprId == this._mdl.hoverChordExprIds[0]) {
          chordHighlightIdx1 = i;
        } else if (node.item.exprId == this._mdl.hoverChordExprIds[1]) {
          chordHighlightIdx2 = i;
        }
      }
    }

    let usrMsg = "";
    let usrMsgInBottomHalf = true;
    if (chordHighlightIdx1 != -1 && chordHighlightIdx1 != chordHighlightIdx2) {
      this.drawChordHighlight(drawModel, screenContext, chordHighlightIdx1, chordHighlightIdx2);

      // Also draw text to describe it, and advice that user can click on this chord to select these 2 expressions
      const chordValue = this._mdl.drawModel.nodes[chordHighlightIdx1].item.chords[chordHighlightIdx2];

      if (chordValue > 0) {
        usrMsg = "Positive";
      } else {
        usrMsg = "Negative";
      }
      usrMsg += " correlation\n";
      usrMsg += "Click chord to view in binary chart (if one is open)";

      // If both are towards the bottom, reposition the message
      usrMsgInBottomHalf = !(
        this._mdl.drawModel.nodes[chordHighlightIdx1].coord.y > viewport.height / 2 && this._mdl.drawModel.nodes[chordHighlightIdx2].coord.y > viewport.height / 2
      );
    }

    // Draw chords (only draw for the selected hovered item if there is one, or ALL nodes if nothing selected/highlighted)
    if (restrictToElementIdx < 0) {
      for (let i = 0; i < drawModel.nodes.length; i++) {
        const node = drawModel.nodes[i];
        this.drawChords(drawModel, screenContext, this._mdl.drawMode, node, i, this.COLOUR_CHORD_POSITIVE, this.COLOUR_CHORD_NEGATIVE);
      }
    } else {
      this.drawChords(
        drawModel,
        screenContext,
        this._mdl.drawMode,
        drawModel.nodes[restrictToElementIdx],
        restrictToElementIdx,
        this.COLOUR_CHORD_POSITIVE,
        this.COLOUR_CHORD_NEGATIVE
      );
    }

    // Then draw nodes/elements on top
    screenContext.font = CANVAS_FONT_SIZE + "px Roboto";

    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";

    // Draw first pass, only the background circles
    for (const node of drawModel.nodes) {
      this.drawElementNodePass1(screenContext, viewport, node);
    }

    // Draw second pass, so labels don't get overdrawn by neighbouring background circles
    for (const node of drawModel.nodes) {
      this.drawElementNodePass2(screenContext, viewport, node);
    }

    // Draw label for hovered node (if any)
    if (restrictToElementIdx > -1 && restrictToElementIdx < drawModel.nodes.length) {
      this.drawNodeInfo(screenContext, viewport, drawModel.nodes[restrictToElementIdx]);
    }

    if (usrMsg) {
      this.drawMessage(screenContext, viewport, usrMsg, usrMsgInBottomHalf);
    }
  }

  private drawNodeInfo(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void {
    // Figure out text labels to show
    const displayDecPlaces = 3;
    const padding = 4;
    const gap = 4;

    let valueText = "";
    let errorText = "";

    if (node.item.errorMsg.length > 0) {
      valueText = node.item.label;
      errorText = node.item.errorMsg;
    } else {
      valueText = node.item.longLabel + ": " + node.item.displayValue.toFixed(displayDecPlaces);
      errorText = "Avg Error: " + node.item.errorValue.toPrecision(displayDecPlaces);
    }

    const valueSize = screenContext.measureText(valueText);
    const errorSize = screenContext.measureText(errorText);

    // We just draw the values in the top-left corner, should generally be out of the way of other things
    screenContext.textBaseline = "top";

    const w = Math.max(valueSize.width, errorSize.width) + padding * 2;
    const h = CANVAS_FONT_SIZE * 2 + gap + padding * 2;

    const pos = viewport.getCenterPoint();

    const textX = pos.x;

    pos.x -= w / 2;
    pos.y -= h / 2;

    screenContext.textAlign = "center";

    // Draw background
    screenContext.fillStyle = Colours.GRAY_90.asString();
    screenContext.fillRect(pos.x, pos.y, w, h);

    // Draw the text
    screenContext.fillStyle = node.item.modulesOutOfDate ? Colours.ORANGE.asString() : Colours.GRAY_10.asString();
    screenContext.fillText(valueText, textX, pos.y + padding);

    // Draw error in error arc colour
    screenContext.fillStyle = this.COLOUR_NODE_ERROR;
    screenContext.fillText(errorText, textX, pos.y + padding + CANVAS_FONT_SIZE + gap);
  }

  private drawElementNodePass1(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void {
    // If there's an error...
    if (node.item.errorMsg.length <= 0) {
      // Value is drawn as a transparent circle that may overlap with neighbours, we don't mind...
      screenContext.fillStyle = this.COLOUR_NODE;
      screenContext.beginPath();
      screenContext.arc(node.coord.x, node.coord.y, node.radius, 0, 2 * Math.PI);
      screenContext.fill();
    }
  }

  private drawElementNodePass2(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, node: ChordViewNode): void {
    // If there's an error...
    let labelOffsetX = 0;
    if (node.item.errorMsg.length > 0) {
      // Draw node label background
      screenContext.fillStyle = this.COLOUR_NODE_LABEL_BACKGROUND;
      screenContext.fillRect(node.labelRect.x, node.labelRect.y, node.labelRect.w, node.labelRect.h);

      const iconSize = node.labelRect.h * 0.7;
      labelOffsetX = node.labelRect.h * 0.5;
      const offset = 3;
      drawErrorIcon(screenContext, new Point(node.labelRect.x + iconSize / 2 + offset, node.labelRect.y + iconSize / 2 + offset), iconSize);
    } else {
      // NOTE: Value was already drawn in pass 1

      // Draw node label background
      screenContext.fillStyle = this.COLOUR_NODE_LABEL_BACKGROUND;
      screenContext.fillRect(node.labelRect.x, node.labelRect.y, node.labelRect.w, node.labelRect.h);

      // Error is drawn as a purple % bar across the label
      screenContext.fillStyle = this.COLOUR_NODE_ERROR;

      const barW = node.errorPct * node.labelRect.w;
      screenContext.fillRect(node.labelRect.x, node.labelRect.y, barW, node.labelRect.h);
    }

    // Label text
    screenContext.fillStyle = node.item.modulesOutOfDate ? Colours.ORANGE.asString() : this.COLOUR_NODE_LABEL;
    const pt = node.labelRect.center();
    screenContext.fillText(node.item.label, pt.x + labelOffsetX, pt.y);
  }

  private drawChords(
    drawModel: ChordDiagramDrawModel, 
    screenContext: CanvasRenderingContext2D,
    drawMode: ChordDrawMode,
    node: ChordViewNode,
    nodeIdx: number,
    positiveColour: string,
    negativeColour: string
  ): void {
    const chordThresholdValue = Math.abs(this._mdl.threshold * drawModel.maxChordValueMagnitude);

    // Draw chords to other elements
    for (let c = 0; c < node.item.chords.length; c++) {
      const chordValue = node.item.chords[c];
      //console.log('chord: '+Math.abs(chordValue)+', threshold: '+chordThresholdValue);

      // Work out if we're drawing this one
      if (
        c != nodeIdx && // Don't draw lines to ourself!
        Math.abs(chordValue) > chordThresholdValue && // Apply thresholding
        // Apply draw mode
        ((drawMode == ChordDrawMode.BOTH && chordValue != 0) ||
          (drawMode == ChordDrawMode.POSITIVE && chordValue > 0) ||
          (drawMode == ChordDrawMode.NEGATIVE && chordValue < 0))
      ) {
        // Draw a line from here to there
        if (chordValue > 0) {
          screenContext.strokeStyle = positiveColour;
        } else {
          screenContext.strokeStyle = negativeColour;
        }

        screenContext.lineWidth = drawModel.getChordWidthPx(chordValue);

        screenContext.beginPath();
        screenContext.moveTo(node.coord.x, node.coord.y);
        screenContext.lineTo(drawModel.nodes[c].coord.x, drawModel.nodes[c].coord.y);
        screenContext.stroke();
      }
    }
  }

  private drawChordHighlight(drawModel: ChordDiagramDrawModel, screenContext: CanvasRenderingContext2D, chordIdx1: number, chordIdx2: number) {
    screenContext.save();
    screenContext.strokeStyle = Colours.GRAY_60.asString();
    screenContext.lineWidth = ChordDiagramDrawModel.MAX_CHORD_WIDTH * 1.25 * 2;
    screenContext.lineCap = "round";

    const pt1 = drawModel.nodes[chordIdx1].coord;
    const pt2 = drawModel.nodes[chordIdx2].coord;

    screenContext.beginPath();
    screenContext.moveTo(pt1.x, pt1.y);
    screenContext.lineTo(pt2.x, pt2.y);
    screenContext.stroke();
    screenContext.restore();
  }

  private drawMessage(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, msg: string, bottomHalf: boolean): void {
    const textScale = 1.3;
    const padding = 4;

    // We just draw the values in the top-left corner, should generally be out of the way of other things
    screenContext.textBaseline = "top";
    screenContext.font = CANVAS_FONT_SIZE * textScale + "px Roboto";

    const lines = msg.split("\n");

    // Find longest line
    let msgSize = 0;
    for (const line of lines) {
      const lineSize = screenContext.measureText(line);
      if (lineSize.width > msgSize) {
        msgSize = lineSize.width;
      }
    }

    const w = msgSize + padding * 2;
    const lineH = CANVAS_FONT_SIZE * textScale + padding;
    const h = lineH * lines.length + padding * 2;

    const pos = viewport.getCenterPoint();
    pos.y += bottomHalf ? pos.y * 0.5 : pos.y * -0.5; // We want this a bit away from center so other hover info can still be read

    const textX = pos.x;

    pos.x -= w / 2;
    pos.y -= h / 2;

    screenContext.textAlign = "center";

    // Draw background
    screenContext.fillStyle = Colours.GRAY_90.asString();
    screenContext.fillRect(pos.x, pos.y, w, h);

    // Draw the text
    screenContext.fillStyle = Colours.GRAY_10.asString();
    for (let c = 0; c < lines.length; c++) {
      const line = lines[c];
      screenContext.fillText(line, textX, pos.y + padding + c * lineH);
    }
  }
}
