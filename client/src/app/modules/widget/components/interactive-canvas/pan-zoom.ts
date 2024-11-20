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

import { Subject, Subscription, timer } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { getMatrixAs2x3Array, getTransformMatrix, inverseMatrix, Point, pointByMatrix, Rect, vectorsEqual } from "src/app/models/Geometry";
// import { CanvasParams, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { CanvasParams, CanvasWorldTransform } from "./interactive-canvas.component";
import { isValidNumber, SentryHelper } from "src/app/utils/utils";

export interface PanRestrictor {
  restrict(panZoom: PanZoom): void;
}

export class PanRestrictorToCanvas {
  restrict(panZoom: PanZoom): void {
    if (!panZoom?.canvasParams) {
      return;
    }

    // Don't want users to pan it to the right to reveal nothing
    if (panZoom.pan.x > 0) {
      // checking panning against left-side of canvas
      panZoom.pan.x = 0;
    } else {
      // Don't want users to pan to the left and reveal nothing
      // To determine this, we work out if pan would drag out more
      // than the zoomed (scaled-up) canvas space
      let rightBound = panZoom.canvasParams.width * (panZoom.scale.x - 1);
      if (panZoom.pan.x < -rightBound) {
        panZoom.pan.x = -rightBound;
      }
    }

    let yBound = panZoom.canvasParams.height * (panZoom.scale.y - 1);
    if (panZoom.pan.y < -yBound) {
      // Pan.y negative means user is panning the charts up relative to the canvas
      panZoom.pan.y = -yBound;
    } else {
      // Pan.y positive means user is panning the charts down relative to the canvas
      if (panZoom.pan.y > 0) {
        panZoom.pan.y = 0;
      }
      //this.logDebug();
    }
  }
}
/*
export class PanRestrictorToCenter
{
    restrict(panZoom: PanZoom): void
    {
//console.log('pan: '+panZoom.pan.x+','+panZoom.pan.y+', scale: '+panZoom.scale.x+','+panZoom.scale.y);
console.log(panZoom);
        // Work out image bounds in terms of canvas sizing (apply scale)
//        let maxPan = new Point(panZoom.canvasParams.width
        if(panZoom.pan.x < 0)
        {
            panZoom.pan.x = 0;
        }

        if(panZoom.pan.y < 0)
        {
            panZoom.pan.y = 0;
        }
    }
}
*/
export class PanZoom implements CanvasWorldTransform {
  // TODO: These should be read-only really. Some points in the code do write to them though, like view states, but
  //       the intent is for these to only be modified through operations that end up calling transformChangeComplete$
  scale: Point = new Point(1, 1);
  pan: Point = new Point(0, 0);

  canvasParams: CanvasParams | null = null;

  // If this is called, the transform has changed (so for eg, redrawing is a good idea!)
  // but if the parameter is true, the transform is signalled to be complete, not an in-progress
  // pan operation. So if saving state, only save if parameter is true
  transformChangeComplete$: Subject<boolean> = new Subject<boolean>();
  transformChangeStarted$: Subject<void> = new Subject<void>();

  private _lastTransformCompleteMs: number = 0;
  private _timerSubs: Subscription | null = null;

  constructor(
    protected _zoomLimitX: MinMax = new MinMax(0.2, 10000),
    protected _zoomLimitY: MinMax = new MinMax(0.2, 10000),
    protected _panRestrictor: PanRestrictor | null = null
  ) {
    this.reset();
  }

  setCanvasParams(canvasParams: CanvasParams) {
    this.canvasParams = canvasParams;
  }

  clone(): CanvasWorldTransform {
    let result = new PanZoom();
    if (this.canvasParams) {
      result.setCanvasParams(this.canvasParams);
    }

    // Set the existing transform
    result.scale = this.scale.copy();
    result.pan = this.pan.copy();

    return result;
  }

  // Getting transform info
  canvasToWorldSpace(canvasPt: Point): Point {
    // Take the transform that is used when drawing and apply it
    const xform = this.getTransformMatrix();
    const invxform = inverseMatrix(xform);

    const worldPt = pointByMatrix(invxform, canvasPt);
    //worldPt.x = Math.round(worldPt.x);
    //worldPt.y = Math.round(worldPt.y);
    //console.log('World Pt: '+worldPt.x+','+worldPt.y);
    return worldPt;
  }

  getTransformMatrix(): math.Matrix {
    return getTransformMatrix(this.scale.x, this.scale.y, this.pan.x, this.pan.y);
  }

  applyTransform(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const xformMat = this.getTransformMatrix();
    const xform = getMatrixAs2x3Array(xformMat);

    screenContext.transform(xform[0], xform[1], xform[2], xform[3], xform[4], xform[5]);
  }

  getScale(): Point {
    return this.scale;
  }

  // Setting the transform to something related to our view, etc
  reset(): void {
    this.scale = new Point(1, 1);
    this.pan = new Point(0, 0);
    this.transformChangeStarted$.next();
    this.notifyTransformChangeComplete(true);
  }

  private notifyTransformChangeComplete(completeFlag: boolean): void {
    this.transformChangeComplete$.next(completeFlag);
    if (completeFlag) {
      this._lastTransformCompleteMs = Date.now();
      this.clearTransformTimer();
    }
  }
/*
  setZoomLimits(xLimits: MinMax, yLimits: MinMax): void {
    // Set the zoom limits
    // If unchanged, don't do anything (prevents a transformChangeComplete$ being sent unnecessarily)
    if (this._zoomLimitX.equals(xLimits) && this._zoomLimitY.equals(yLimits)) {
      return;
    }

    this._zoomLimitX = xLimits;
    this._zoomLimitY = yLimits;

    // Enforce the new limits
    this.setScale(this.scale);
  }
*/
  isZoomXAtMinLimit(): boolean {
    return this.scale.x <= (this._zoomLimitX?.min || this.scale.x);
  }

  isZoomYAtMinLimit(): boolean {
    return this.scale.y <= (this._zoomLimitY?.min || this.scale.y);
  }

  setScale(scale: Point) {
    let filteredScale = this.filterScale(scale);

    if (!vectorsEqual(filteredScale, this.scale)) {
      // mainly here due to scaling on startup, don't want to save state if we don't have to
      this.scale = filteredScale;
      this.transformChangeStarted$.next();
      this.notifyTransformChangeComplete(true);
    }
    //this.logDebug();
  }

  setPan(pan: Point, panFinished: boolean) {
    this.pan = pan;
    this.transformChangeStarted$.next();

    if (this._panRestrictor) {
      this._panRestrictor.restrict(this);
    }

    this.notifyTransformChangeComplete(panFinished);
    //this.logDebug();
  }

  setScaleRelativeTo(scale: Point, pt: Point, scaleFinished: boolean) {
    let oldScale = this.scale;
    let newScale = this.filterScale(scale);

    // Set the scale value
    this.scale = newScale;
    this.transformChangeStarted$.next();

    // Pan also to make it like the zoom happened relative to the mouse cursor
    let panScale = new Point(newScale.x - oldScale.x, newScale.y - oldScale.y);
    let newPan = new Point(this.pan.x - pt.x * panScale.x, this.pan.y - pt.y * panScale.y);
    //console.log('mouse: '+event.point.x+','+event.point.y+', old scale: '+oldScale+', new scale: '+newScale+', old pan: '+ctx.panZoom.pan.x+','+ctx.panZoom.pan.y+', new pan: '+newPan.x+','+newPan.y+', panScale: '+panScale);

    // We've handled the zoom part, now pan so we're still centered over pt
    // NOTE: if we've been told the scale op isn't yet finished, it's likely something like a mouse wheel scrolling
    // and we don't have a definite end-point at which we alert out (and end up saving view state, etc)
    // So if the last operation was a while ago, we say it's finished, but if recently, we start a timer and wait a little
    // in case another one comes in soon (as wheel is scrolling)
    const throttleMs = 1000;
    if (!scaleFinished) {
      let now = Date.now();
      if (now - this._lastTransformCompleteMs > throttleMs) {
        scaleFinished = true;
      } else {
        this.clearTransformTimer();
        this._timerSubs = timer(throttleMs + 10).subscribe(() => {
          // If we haven't been cancelled by this point, we cause a transform complete
          this.notifyTransformChangeComplete(true);
        });
      }
    }

    this.setPan(newPan, scaleFinished);
  }

  private clearTransformTimer(): void {
    if (this._timerSubs) {
      this._timerSubs.unsubscribe();
      this._timerSubs = null;
    }
  }

  calcViewportCentreInWorldspace(): Point {
    if (!this.canvasParams) {
      return new Point(0, 0);
    }

    return this.canvasToWorldSpace(this.canvasParams.getCenterPoint());
  }

  // Calculates a transform that describes showing rectRequested on the canvas. Canvas has top-left=(0,0) and
  // rect needs to be relative to this origin also.
  resetViewToRect(rectRequested: Rect, uniformXYScale: boolean): void {
    /*
console.log(
'resetViewToRect: rect=('+rectRequested.x.toLocaleString()+','+rectRequested.y.toLocaleString()+') '+
rectRequested.w.toLocaleString()+'x'+rectRequested.h.toLocaleString()+
', uniform='+uniformXYScale+', canvas: '+this.canvasParams.width+'x'+this.canvasParams.height
);
*/
    // Zoom to area size:
    let zoomToW = rectRequested.w;
    let zoomToH = rectRequested.h;

    if (!this.canvasParams) {
      return;
    }

    let scale = new Point(this.canvasParams.width / zoomToW, this.canvasParams.height / zoomToH);
    if (uniformXYScale) {
      scale.x = Math.min(scale.x, scale.y);
      scale.y = scale.x;
    }

    // Sets the right scale
    //scale.x = this.scale.x;
    //scale.y = this.scale.y;
    this.scale = this.filterScale(scale);
    this.transformChangeStarted$.next();

    // Work out the pan value
    let pan = new Point(
      -(rectRequested.x + zoomToW / 2) * scale.x + this.canvasParams.width / 2,
      -(rectRequested.y + zoomToH / 2) * scale.y + this.canvasParams.height / 2
    );
    //pan.x = this.pan.x;
    //pan.y = this.pan.y;
    //pan.y = 0;
    this.setPan(pan, true);
  }

  private logDebug(): void {
    console.log(
      "transform: scale=" +
        this.scale.x.toLocaleString() +
        ", " +
        this.scale.y.toLocaleString() +
        ", pan=" +
        this.pan.x.toLocaleString() +
        ", " +
        this.pan.y.toLocaleString()
    );
  }

  private filterScale(scale: Point): Point {
    let result = new Point(scale.x, scale.y);

    // Firstly, check if they're valid
    if (!isValidNumber(result.x, false) || !isValidNumber(result.y, false)) {
      SentryHelper.logMsg(true, `Replacing invalid zoom(${result.x},${result.y}) with 1,1 before saving view state`);
      result = new Point(1, 1);
    }

    if (this._zoomLimitX.min !== null && result.x < this._zoomLimitX.min) {
      result.x = this._zoomLimitX.min;
    }
    if (this._zoomLimitX.max !== null && result.x > this._zoomLimitX.max) {
      result.x = this._zoomLimitX.max;
    }

    if (this._zoomLimitY.min !== null && result.y < this._zoomLimitY.min) {
      result.y = this._zoomLimitY.min;
    }
    if (this._zoomLimitY.max !== null && result.y > this._zoomLimitY.max) {
      result.y = this._zoomLimitY.max;
    }
    return result;
  }
}
