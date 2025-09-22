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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy } from "@angular/core";
import { ReplaySubject, Subject, Subscription } from "rxjs";

import { Point, Rect } from "src/app/models/Geometry";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";

export class CanvasParams {
  constructor(
    public width: number,
    public height: number,
    public dpi: number
  ) {}

  getCenterPoint(): Point {
    return new Point(this.width / 2, this.height / 2);
  }

  getRect(): Rect {
    return new Rect(0, 0, this.width, this.height);
  }

  equals(other: CanvasParams): boolean {
    return this.width == other.width && this.height == other.height && this.dpi == other.dpi;
  }
}

export interface CanvasDrawNotifier {
  needsDraw$: Subject<void>;
  needsCanvasResize$?: Subject<void>;
  resolution$?: ReplaySubject<number>;
  borderWidth$?: ReplaySubject<number>;
}

@Component({
  standalone: false,
  template: "",
//   selector: "resizing-canvas",
//   templateUrl: "./interactive-canvas.component.html",
//   styleUrls: ["./interactive-canvas.component.scss"],
})
export abstract class ResizingCanvasComponent implements AfterViewInit, OnDestroy {
  _drawNotifier: CanvasDrawNotifier | null = null;

  protected _subs = new Subscription();
  protected _viewport: CanvasParams = new CanvasParams(0, 0, 1);

  private _resolutionMultiplier = 1;

  constructor(private _layoutService: AnalysisLayoutService) {}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.triggerRedraw();
    this.callFitCanvasToContainer();

    this._subs.add(
      this._layoutService.resizeCanvas$.subscribe(() => {
        this.callFitCanvasToContainer();
      })
    );

    if (this._drawNotifier) {
      this._subs.add(
        this._drawNotifier.needsDraw$.subscribe(() => {
          this.triggerRedraw();
        })
      );

      if (this._drawNotifier.needsCanvasResize$) {
        this._subs.add(
          this._drawNotifier.needsCanvasResize$.subscribe(() => {
            this.callFitCanvasToContainer();
          })
        );
      }

      if (this._drawNotifier.resolution$) {
        this._subs.add(
          this._drawNotifier.resolution$.subscribe(multiplier => {
            this._resolutionMultiplier = multiplier;
            this.callFitCanvasToContainer();
          })
        );
      }

      if (this._drawNotifier.borderWidth$) {
        this._subs.add(
          this._drawNotifier.borderWidth$.subscribe(borderWidth => {
            this.setDrawerBorderWidth(borderWidth);

            this.callFitCanvasToContainer();
            this.triggerRedraw();
          })
        );
      }
    }
  }
/*
  get drawNotifier() {
    return this._drawNotifier;
  }
*/
  protected setDrawNotifier(notifier: CanvasDrawNotifier | null) {
    this._drawNotifier = notifier;
    if (this._drawNotifier) {
      this._subs.add(
        this._drawNotifier.needsDraw$.subscribe(() => {
          this.triggerRedraw();
        })
      );

      if (this._drawNotifier.needsCanvasResize$) {
        this._subs.add(
          this._drawNotifier.needsCanvasResize$.subscribe(() => {
            this.callFitCanvasToContainer();
          })
        );
      }
    }
  }

  abstract triggerRedraw(): void;
  protected abstract setTransformCanvasParams(params: CanvasParams, canvas: ElementRef<any>): void;
  protected abstract refreshContext(): void;
  protected abstract getCanvasElement(): ElementRef | undefined;
  protected abstract setDrawerBorderWidth(width: number): void;

  protected callFitCanvasToContainer() {
    const imgCanvas = this.getCanvasElement();

    if (!imgCanvas) {
      console.error("this._imgCanvas was not set");
      return;
    }

    //const canvasElem = imgCanvas.nativeElement;
    const newViewport = this.fitCanvasToContainer(imgCanvas);
    if (newViewport) {
      //console.log('callFitCanvasToContainer viewport: '+newViewport.width+'x'+newViewport.height+', dpi='+newViewport.dpi);
      //console.log(canvasElem);

      this._viewport = newViewport;
      this.setTransformCanvasParams(newViewport, imgCanvas);
      this.triggerRedraw();
    }

    this.refreshContext();
  }

  fitCanvasToContainer(canvas: ElementRef): CanvasParams | null {
    if (!canvas) {
      //console.error('fitCanvasToContainer failed: null canvas');
      return null;
    }

    const dpi = window.devicePixelRatio * this._resolutionMultiplier;

    const canvasElem = canvas.nativeElement;
    if (canvasElem.width == canvasElem.parentNode.clientWidth * dpi && canvasElem.height == canvasElem.parentNode.clientHeight * dpi) {
      //console.error('fitCanvasToContainer failed: size already matched');
      return null;
    }

    const width = canvasElem.parentNode.clientWidth;
    const height = canvasElem.parentNode.clientHeight;

    const displayBackup = canvasElem.style.display;
    canvasElem.style.display = "none";

    canvasElem.width = width * dpi;
    canvasElem.height = height * dpi;

    canvasElem.style.display = displayBackup;

    // canvasElem.style.width = width + "px";
    // canvasElem.style.height = height + "px";
    canvasElem.style.width = "100%";
    canvasElem.style.height = "100%";

    return new CanvasParams(width, height, dpi);
  }
}
