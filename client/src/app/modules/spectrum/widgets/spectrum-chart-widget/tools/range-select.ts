// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { Clipboard } from "@angular/cdk/clipboard";

import { Subscription } from "rxjs";
import { Rect } from "src/app/models/Geometry";
import { EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
// import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
// import {
//   CanvasMouseEvent,
//   CanvasInteractionResult,
//   CanvasMouseEventId,
//   CanvasKeyEvent,
//   CanvasDrawParameters,
// } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
// import {
//   UserPromptDialogParams,
//   UserPromptDialogComponent,
//   UserPromptDialogResult,
// } from "src/app/modules/pixlisecore/components/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { Colours } from "src/app/utils/colours";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseSpectrumTool, ISpectrumToolHost, SpectrumToolId } from "./base-tool";
import { CursorId } from "../../../../widget/components/interactive-canvas/cursor-id";
import { SnackbarService } from "../../../../pixlisecore/pixlisecore.module";
import {
  CanvasDrawParameters,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasMouseEventId,
} from "../../../../widget/components/interactive-canvas/interactive-canvas.component";
import { RangeSelectData, RangeSelectDialogComponent } from "../range-select-dialog/range-select-dialog.component";
import { MinMax } from "../../../../../models/BasicTypes";
const MOUSE_TOLERANCE_TO_LINE = 10;

enum HandleState {
  NONE,
  LEFT,
  RIGHT,
}

export class RangeSelect extends BaseSpectrumTool {
  private _subs = new Subscription();

  private _rangeMin: number = 0;
  private _rangeMax: number = 0;

  private _draggingHandle: HandleState = HandleState.NONE;
  private _hover: HandleState = HandleState.NONE;

  private _acceptEventId: number = 0;

  private _xrfkeVLowerBound: number | null = null;
  private _xrfkeVUpperBound: number | null = null;

  private _rangeSelectDialog: MatDialogRef<RangeSelectDialogComponent> | null = null;

  constructor(
    ctx: ISpectrumChartModel,
    host: ISpectrumToolHost,
    public dialog: MatDialog,
    public clipboard: Clipboard,
    public _snackService: SnackbarService
  ) {
    super(
      SpectrumToolId.RANGE_SELECT,
      ctx,
      host,
      "Range Select Tool\nAllows selection of a range of the spectrum for analysis as maps on context image",
      "assets/button-icons/tool-spectrum-range.svg"
    );
  }

  private reset(): void {
    const gap = 5;

    if (!this._ctx?.xAxis) {
      return;
    }

    this._rangeMin = this._ctx.xAxis.canvasToValue(this._ctx.xAxis.startPx + gap);
    this._rangeMax = this._ctx.xAxis.canvasToValue(this._ctx.xAxis.endPx - gap);

    // Make sure the range is valid
    if (this._rangeMin < this.xrfkeVLowerBound) {
      this._rangeMin = this.xrfkeVLowerBound;
    }

    if (this._rangeMax > this.xrfkeVUpperBound) {
      this._rangeMax = this.xrfkeVUpperBound;
    }

    this._hover = HandleState.NONE;

    this.openRangeSelectDialog();
  }

  override activate(): void {
    // Don't reset if we've got a valid value
    //if(this._rangeMin <= 0)
    //{
    // Changed so it always resets when tool activated
    let min: number | null = null;
    let max: number | null = null;
    this._ctx.spectrumLines.forEach(line => {
      line.xValues.forEach(xValue => {
        const val = line.values[xValue];
        if (!val) {
          return;
        }

        if (min === null || xValue < min) {
          min = xValue;
        }
        if (max === null || xValue > max) {
          max = xValue;
        }
      });
    });

    this._xrfkeVLowerBound = min;
    this._xrfkeVUpperBound = max;
    if (!this._xrfkeVUpperBound || (this._ctx.lineRangeX.max && this._xrfkeVUpperBound > this._ctx.lineRangeX.max)) {
      this._xrfkeVUpperBound = this._ctx.lineRangeX.max;
    }

    this.reset();
    //}

    this._host.setCursor(CursorId.panCursor);

    // If the user hasn't got an energy calibrated chart, stop here
    if (!this._ctx.xAxisEnergyScale) {
      // this._ctx.snackService.add("Spectrum must be calibrated (keV)", "Dismiss", true);
      this._snackService.openWarning("Spectrum must be calibrated (keV)");
      this.onCancel();
      if (this._rangeSelectDialog) {
        this._rangeSelectDialog.close();
      }
    } else {
      this._snackService.open("Select range for map");

      // Listen to snack completions
      // this._subs.add(
      //   this._ctx.snackService.snacksEvents$.subscribe((event: SnackEvent) => {
      //     if (event.id == this._acceptEventId) {
      //       // If it's a cancel, do that
      //       if (event.action == "Accept") {
      //         this.onAccept();
      //       } else {
      //         this.onCancel();
      //       }
      //     }
      //   })
      // );
    }
  }

  override deactivate(): void {
    this._subs.unsubscribe();
    this._subs = new Subscription();

    // Remove the snack
    if (this._acceptEventId > 0) {
      // this._ctx.snackService.remove(this._acceptEventId);
      this._acceptEventId = 0;
    }
  }

  private openRangeSelectDialog() {
    if (!this._ctx.xAxisEnergyScale) {
      return;
    }

    const dialogConfig = new MatDialogConfig<RangeSelectData>();
    dialogConfig.data = {
      min: this._rangeMin,
      max: this._rangeMax,
      bounds: new MinMax(this.xrfkeVLowerBound, this.xrfkeVUpperBound),
    };

    dialogConfig.hasBackdrop = false;
    // const rect = trigger?.parentElement?.getBoundingClientRect();
    // if (rect) {
    // dialogConfig.position = getInitialModalPositionRelativeToTrigger(trigger, rect.height, rect.width);
    // }

    if (this._rangeSelectDialog) {
      this._rangeSelectDialog.close();
    }

    this._rangeSelectDialog = this.dialog.open(RangeSelectDialogComponent, dialogConfig);
    this._rangeSelectDialog.afterClosed().subscribe(() => {
      this.onCancel();
    });

    this._rangeSelectDialog.componentInstance.onRangeUpdate.subscribe(range => {
      if (range?.min !== undefined && range?.min !== null && range?.max) {
        this._rangeMin = range.min;
        this._rangeMax = range.max;

        // this._ctx.
      }
    });

    this._rangeSelectDialog.componentInstance.onRangeCopy.subscribe(() => {
      this.onAccept();
    });
  }

  private onExpressionEditor(expressionID: string): void {
    // const dialogConfig = new MatDialogConfig();
    // dialogConfig.panelClass = "panel";
    // dialogConfig.disableClose = true;
    // let toEdit = this._ctx.expressionService.getExpression(expressionID);
    // dialogConfig.data = new ExpressionEditorConfig(toEdit, true, false, false);
    // const dialogRef = this.dialog.open(ExpressionEditorComponent, dialogConfig);
    // dialogRef.afterClosed().subscribe(
    //   (dlgResult: ExpressionEditorConfig) => {
    //     if (dlgResult) {
    //       let expr = new DataExpression(
    //         toEdit.id,
    //         dlgResult.expr.name,
    //         dlgResult.expr.sourceCode,
    //         dlgResult.expr.sourceLanguage,
    //         dlgResult.expr.comments,
    //         toEdit.shared,
    //         toEdit.creator,
    //         toEdit.createUnixTimeSec,
    //         toEdit.modUnixTimeSec,
    //         [],
    //         [],
    //         null
    //       );
    //       this._ctx.expressionService
    //         .edit(expressionID, dlgResult.expr.name, dlgResult.expr.sourceCode, dlgResult.expr.sourceLanguage, dlgResult.expr.comments, [])
    //         .subscribe(
    //           () => null,
    //           () => {
    //             alert("Failed to save edit data expression: " + expr.name);
    //           }
    //         );
    //     }
    //   },
    //   () => {
    //     alert("Error while editing data expression: " + toEdit.name);
    //   }
    // );
  }

  private onAccept(): void {
    const det = "A"; // For now we just do this on the A spectrum!
    // TODO: the above needs to become whatever expression/format we choose to support in the spectrum widget for specifying things like
    // max(A, B) or sum(A, B)...

    // Generate the expression (keV->channel)
    // const minChannel = this._ctx.energyCalibrationManager.keVToChannel(this._rangeMin, det);
    // const maxChannel = this._ctx.energyCalibrationManager.keVToChannel(this._rangeMax, det);
    let scanId = this._ctx.spectrumLines[0].scanId;
    // Find scan id that includes rangeMin and rangeMax
    this._ctx.spectrumLines.forEach(line => {
      if (line.maxValue >= this._rangeMax) {
        scanId = line.scanId;
      }
    });
    const minChannel = this._ctx.keVToChannel(this._rangeMin, scanId, det);
    const maxChannel = this._ctx.keVToChannel(this._rangeMax, scanId, det);

    const expr = "spectrum(" + minChannel + "," + maxChannel + ', "' + det + '")';
    navigator.clipboard.writeText(expr);
    const name = this._ctx.makePrintableXValue(this._rangeMin) + "-" + this._ctx.makePrintableXValue(this._rangeMax);
    const expressionComment = `Generated expression for channel ${minChannel}->${maxChannel} (keV range: ${this._rangeMin.toLocaleString()}->${this._rangeMax.toLocaleString()})`;

    this._snackService.openSuccess("Expression copied to clipboard", `Expression: ${expr}\nName: ${name}\nComment: ${expressionComment}`);
    // const dialogConfig = new MatDialogConfig();
    // dialogConfig.data = new UserPromptDialogParams("New Range Expression", "Copy to Clipboard", "Okay", [], true, "Take Me There", () => null);
    // const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

    // this._ctx.expressionService.add(name, expr, EXPR_LANGUAGE_PIXLANG, expressionComment).subscribe(
    //   expressions => {
    //     console.log("Added expression: " + name);

    //     dialogRef.componentInstance.data.middleButtonCallback = () => {
    //       let expressionID = Object.keys(expressions).pop();
    //       this._ctx.viewStateService.showContextImageLayers = true;
    //       this.onExpressionEditor(expressionID);
    //       dialogRef.close();
    //     };
    //   },
    //   err => {
    //     alert("Failed to add data expression: " + name);
    //   }
    // );

    // dialogRef.afterClosed().subscribe((result: UserPromptDialogResult) => {
    //   if (result !== null) {
    //     this.clipboard.copy(expr);
    //   }
    // });

    // // Show the layers dropdown under context image
    // this._ctx.viewStateService.showContextImageLayers = true;

    // Reset ourself
    // this.reset();
    this.onCancel();
    if (this._rangeSelectDialog) {
      this._rangeSelectDialog?.close();
    }

    // this._ctx.setTool(SpectrumToolId.PAN);
  }

  private onCancel(): void {
    // User is just cancelling the whole thing, we switch to the pan tool in this case.
    this._host.setTool(SpectrumToolId.PAN);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._ctx.xAxisEnergyScale) {
      return CanvasInteractionResult.neither;
    }

    // If user starts dragging the left or right handle, respond
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      return this.startDrag(event.canvasPoint.x);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      return this.handleMouseMove(event.canvasPoint.x);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG && this._draggingHandle != HandleState.NONE) {
      this.setRangeDrag(event.canvasPoint.x);
      return CanvasInteractionResult.redrawOnly;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP && this._draggingHandle != HandleState.NONE) {
      this.setRangeDrag(event.canvasPoint.x);
      this._draggingHandle = HandleState.NONE;
      return CanvasInteractionResult.redrawOnly;
    }

    return CanvasInteractionResult.neither;
  }

  override keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    if (event.key == "Escape") {
      this.onCancel();
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  private get xrfkeVLowerBound(): number {
    return this._xrfkeVLowerBound ?? this._ctx.lineRangeX.min ?? 0;
  }

  private get xrfkeVUpperBound(): number {
    return this._xrfkeVUpperBound ?? this._ctx.lineRangeX.max ?? 0;
  }

  private startDrag(mouseX: number): CanvasInteractionResult {
    if (Math.abs(mouseX - this.getLeftHandlePx()) < MOUSE_TOLERANCE_TO_LINE) {
      this._draggingHandle = HandleState.LEFT;
      return CanvasInteractionResult.redrawAndCatch;
    } else if (Math.abs(mouseX - this.getRightHandlePx()) < MOUSE_TOLERANCE_TO_LINE) {
      this._draggingHandle = HandleState.RIGHT;
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  private setRangeDrag(mouseX: number): void {
    if (!this._ctx.xAxis) {
      return;
    }
    let mouseAsXValue = this._ctx.xAxis.canvasToValue(mouseX);

    if (this._draggingHandle == HandleState.LEFT) {
      if (mouseAsXValue < this.xrfkeVLowerBound) {
        mouseAsXValue = this.xrfkeVLowerBound;
      }

      // Don't allow crossing the other value
      if (mouseAsXValue < this._rangeMax) {
        this._rangeMin = mouseAsXValue;
        if (this._rangeSelectDialog) {
          this._rangeSelectDialog.componentInstance.dragMinRange = Math.round(this._rangeMin * 100) / 100;
        }
      }
    } else if (this._draggingHandle == HandleState.RIGHT) {
      if (mouseAsXValue > this.xrfkeVUpperBound) {
        mouseAsXValue = this.xrfkeVUpperBound;
      }

      // Don't allow crossing the other value
      if (mouseAsXValue > this._rangeMin) {
        this._rangeMax = mouseAsXValue;
        if (this._rangeSelectDialog) {
          this._rangeSelectDialog.componentInstance.dragMaxRange = Math.round(this._rangeMax * 100) / 100;
        }
      }
    }
  }

  private handleMouseMove(mouseX: number): CanvasInteractionResult {
    if (Math.abs(mouseX - this.getLeftHandlePx()) < MOUSE_TOLERANCE_TO_LINE) {
      this._hover = HandleState.LEFT;
    } else if (Math.abs(mouseX - this.getRightHandlePx()) < MOUSE_TOLERANCE_TO_LINE) {
      this._hover = HandleState.RIGHT;
    } else {
      this._hover = HandleState.NONE;
    }

    return CanvasInteractionResult.neither;
  }

  override draw(ctx: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._ctx.xAxisEnergyScale || !this._ctx.xAxis || !this._ctx.yAxis) {
      return;
    }

    let chartRect = new Rect(this._ctx.xAxis.startPx, 0, this._ctx.xAxis.pxLength, this._ctx.yAxis.pxLength);

    // Draw a transparent rect on top of what's already on each side
    let minPx = this.getLeftHandlePx();
    let maxPx = this.getRightHandlePx();

    //console.log(JSON.stringify(chartRect));
    //console.log('rangeMin='+this._rangeMin+', rangeMax='+this._rangeMax);
    //console.log('minPx='+minPx+', maxPx='+maxPx);

    // Draw left-side selection
    if (minPx > chartRect.x) {
      ctx.fillStyle = Colours.GRAY_100.asStringWithA(0.75);
      ctx.fillRect(chartRect.x, chartRect.y, minPx - chartRect.x, chartRect.h);
      this.drawHandle(ctx, minPx, chartRect.y, chartRect.maxY(), true, this._rangeMin, this._hover == HandleState.LEFT);
    }

    // Draw right-side selection
    if (maxPx < chartRect.maxX()) {
      ctx.fillStyle = Colours.GRAY_100.asStringWithA(0.75);
      ctx.fillRect(maxPx, chartRect.y, chartRect.maxX() - maxPx, chartRect.h);
      this.drawHandle(ctx, maxPx, chartRect.y, chartRect.maxY(), false, this._rangeMax, this._hover == HandleState.RIGHT);
    }
  }

  private getLeftHandlePx(): number {
    if (!this._ctx.xAxis) {
      return 0;
    }

    return this._ctx.xAxis.valueToCanvas(this._rangeMin);
  }

  private getRightHandlePx(): number {
    if (!this._ctx.xAxis) {
      return 0;
    }

    return this._ctx.xAxis.valueToCanvas(this._rangeMax);
  }

  private drawHandle(ctx: CanvasRenderingContext2D, x: number, topY: number, bottomY: number, isMin: boolean, value: number, filled: boolean): void {
    ctx.strokeStyle = Colours.YELLOW.asString();
    ctx.lineWidth = 2;

    let heightThird = (bottomY - topY) / 3;
    let handleHalfWidth = 2;

    let leftHandleX = x - handleHalfWidth;
    let rightHandleX = x + handleHalfWidth;

    // Draw the top/bottom line first
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, topY + heightThird);

    ctx.moveTo(x, bottomY - heightThird);
    ctx.lineTo(x, bottomY);
    ctx.stroke();

    // If we're drawing it filled, do that separately
    ctx.lineCap = "round";
    if (filled) {
      ctx.lineWidth = 2 + handleHalfWidth * 2;
      ctx.beginPath();
      ctx.moveTo(x, topY + heightThird);
      ctx.lineTo(x, bottomY - heightThird);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(leftHandleX, topY + heightThird);
      ctx.lineTo(leftHandleX, bottomY - heightThird);

      ctx.moveTo(rightHandleX, topY + heightThird);
      ctx.lineTo(rightHandleX, bottomY - heightThird);

      let y = topY + heightThird;
      ctx.moveTo(leftHandleX, y);
      ctx.lineTo(rightHandleX, y);

      y = bottomY - heightThird;
      ctx.moveTo(leftHandleX, y);
      ctx.lineTo(rightHandleX, y);
      ctx.stroke();
    }
    ctx.lineCap = "square";

    // Draw keV value
    ctx.fillStyle = Colours.GRAY_10.asString();

    let leftAlign = isMin ? false : true;
    let xOffset = isMin ? -5 : 5;

    // If we're NOT near screen edge, flip it
    const distFromAxis = 40;

    if (
      // If we're the left (min) line and we're near the left edge of the chart, draw the text on the right side
      (isMin && x < this._ctx.chartArea.x + distFromAxis) ||
      // If we're the right (max) line and we're near the right edge of the chart, draw the text on the left side
      (!isMin && x > this._ctx.chartArea.maxX() - distFromAxis)
    ) {
      leftAlign = !leftAlign;
      xOffset = -xOffset;
    }

    ctx.textAlign = leftAlign ? "left" : "right";

    // Don't let them draw on top of each other
    let yOffset = isMin ? 10 : -10;

    ctx.fillText(this._ctx.makePrintableXValue(value), x + xOffset, bottomY / 2 + yOffset);
  }
}
