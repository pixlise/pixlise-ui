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

import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, ViewChild } from "@angular/core";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";

import { addVectors, Point, } from "src/app/models/Geometry";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasParams, CanvasDrawNotifier, ResizingCanvasComponent } from "./resizing-canvas.component";

export { CanvasParams, CanvasDrawNotifier };


export class CanvasDrawParameters {
  constructor(
    public worldTransform: CanvasWorldTransform,
    public drawViewport: CanvasParams,
    // If not drawing for export, set to null/empty...
    //public exportChoices: ExportDataChoice[],
    public exportItemIDs: string[]
  ) {}
}

export interface CanvasDrawer {
  // Previously we had 2 draw functions:
  // - drawWorldSpace for drawing with the transform applied
  // - drawScreenSpace for drawing screen-aligned overlays like buttons/colour scales
  // This only ended up really being used in the Context Image and for the image uploader tool which
  // both support pan/zoom. Charts which have pan/zoom support usually implement this separately
  // through the use of the x/y axis and it doesn't make sense to transform these via a matrix because
  // we want to limit the number of line segments drawn to just what's on the screen.
  //
  // Therefore, this has been refactored to only a single draw function but we supply the
  // transformation in drawParams and it can be applied at will by the drawing code.

  // NOTE: parameters are supplied via CanvasDrawParameters in case we want to implement future draw
  // modes (eg for Export) and we don't have to then refactor everything implementing this interface
  // as this has happened in the past too!

  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void>;

  // Optional parameters just for export
  showSwapButton?: boolean;
  lightMode?: boolean;
  transparentBackground?: boolean;
  borderWidth?: number;
}

export enum CanvasMouseEventId {
  MOUSE_DOWN,
  MOUSE_UP,
  MOUSE_MOVE,
  MOUSE_DRAG,
  MOUSE_WHEEL,
  MOUSE_ENTER,
  MOUSE_LEAVE,
}

export class CanvasMouseEvent {
  constructor(
    public eventId: CanvasMouseEventId,

    // World-space coordinates
    public point: Point,
    public mouseDown: Point,
    public mouseLast: Point,

    // Canvas-space coordinates
    public canvasPoint: Point,
    public canvasMouseDown: Point,
    public canvasMouseLast: Point,

    // Canvas size info
    public canvasParams: CanvasParams,

    // Mouse wheel
    public deltaY: number,

    // Modifier key states
    public shiftKey: boolean,
    public ctrlKey: boolean,
    public metaKey: boolean
  ) {}

  public static makeCanvasTranslatedCopy(of: CanvasMouseEvent, translation: Point): CanvasMouseEvent {
    return new CanvasMouseEvent(
      of.eventId,
      of.point,
      of.mouseDown,
      of.mouseLast,
      addVectors(of.canvasPoint, translation),
      addVectors(of.canvasMouseDown, translation),
      addVectors(of.canvasMouseLast, translation),
      of.canvasParams,
      of.deltaY,
      of.shiftKey,
      of.ctrlKey,
      of.metaKey
    );
  }
}

export class CanvasKeyEvent {
  constructor(
    public key: string,
    public down: boolean
  ) {}
}

export class CanvasInteractionResult {
  constructor(
    public redraw: boolean,
    public catchEvent: boolean
  ) {}

  static get redrawAndCatch(): CanvasInteractionResult {
    return new CanvasInteractionResult(true, true);
  }
  static get neither(): CanvasInteractionResult {
    return new CanvasInteractionResult(false, false);
  }
  static get redrawOnly(): CanvasInteractionResult {
    return new CanvasInteractionResult(true, false);
  }
}

export interface CanvasInteractionHandler {
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult;
  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult;
}

export interface CanvasWorldTransform {
  setCanvasParams(canvasParams: CanvasParams): any;

  getScale(): Point;

  canvasToWorldSpace(canvasPt: Point): Point;
  getTransformMatrix(): math.Matrix;

  applyTransform(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;

  clone(): CanvasWorldTransform;
}

@Component({
  standalone: false,
  selector: "interactive-canvas",
  templateUrl: "./interactive-canvas.component.html",
  styleUrls: ["./interactive-canvas.component.scss"],
})
export class InteractiveCanvasComponent extends ResizingCanvasComponent implements AfterViewInit, OnDestroy {
  @Input() drawer: CanvasDrawer | null = null;
  @Input() transform: CanvasWorldTransform | null = null;
  @Input() interactionHandler: CanvasInteractionHandler | null = null;

  @ViewChild("InteractiveCanvas") _imgCanvas?: ElementRef;

  private _screenContext!: CanvasRenderingContext2D;

  private _mouseDown: Point | null = null;
  private _mouseLast: Point | null = null;

  constructor(layoutService: AnalysisLayoutService) { super(layoutService); }

  get drawNotifier(): CanvasDrawNotifier | null {
    return this._drawNotifier;
  }

  @Input() set drawNotifier(notifier: CanvasDrawNotifier | null) {
    this.setDrawNotifier(notifier);
  }

  get transparentBackground(): boolean {
    return this.drawer?.transparentBackground || false;
  }

  protected override setDrawerBorderWidth(width: number): void {
    this.drawer!.borderWidth = width;
  }

  protected override getCanvasElement(): ElementRef | undefined {
    return this._imgCanvas;
  }

  override triggerRedraw(): void {
    window.requestAnimationFrame(() => {
      if (this._screenContext && this._viewport && this.transform && this.drawer) {
        InteractiveCanvasComponent.drawFrame(this._screenContext, this._viewport, this.transform, this.drawer).subscribe();
      }
    });
  }

  protected override setTransformCanvasParams(params: CanvasParams, canvas: ElementRef<any>): void {
      this.transform?.setCanvasParams(params);
  }

  protected override refreshContext(): void {
    if (!this._imgCanvas) {
      console.error("this._imgCanvas was not set");
      return;
    }

    const canvasElem = this._imgCanvas.nativeElement;

    const canvasContext = (<HTMLCanvasElement>canvasElem).getContext("2d", { colorSpace: "display-p3" }) || (<HTMLCanvasElement>canvasElem).getContext("2d");
    if (canvasContext) {
      this._screenContext = canvasContext;
    }
  }

  // Not using this because it's a global event, we're only interested if this canvas received it
  //@HostListener('document:mousedown', ['$event'])
  onMouseDownCanvas(event: MouseEvent) {
    event.preventDefault();
    // We only consider it a mouse down if it's the left mouse button
    if (event.button == 0) {
      this._mouseDown = new Point(event.clientX, event.clientY);
      this.sendMouseEvent(this._mouseDown, 0, CanvasMouseEventId.MOUSE_DOWN, event.shiftKey, event.ctrlKey, event.metaKey);
    }
  }

  private shouldProcessMouseEvent(event: MouseEvent): boolean {
    // If mouse is down, we're stalking the mouse, so process it
    if (this._mouseDown) {
      return true;
    }
    return false;
  }

  onMouseEnter(event: MouseEvent): void {
    event.preventDefault();
    // Grab focus - so we get keyboard presses
    if (this._imgCanvas) {
      this._imgCanvas.nativeElement.focus();
    }
    const mouse = new Point(event.clientX, event.clientY);
    this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_ENTER, event.shiftKey, event.ctrlKey, event.metaKey);
    //this.mouseEntered = true;
  }

  onMouseLeave(event: MouseEvent): void {
    event.preventDefault();
    // Relinquish focus
    if (this._imgCanvas) {
      this._imgCanvas.nativeElement.blur();
    }

    const mouse = new Point(event.clientX, event.clientY);
    this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_LEAVE, event.shiftKey, event.ctrlKey, event.metaKey);
    //this.mouseEntered = false;
  }

  @HostListener("document:mousemove", ["$event"])
  onGlobalMouseMoveCanvas(event: MouseEvent) {
    if (this.shouldProcessMouseEvent(event)) {
      this.onMouseMoveCanvas(event);
    }
  }

  onMouseMoveCanvas(event: MouseEvent) {
    event.preventDefault();
    const mouse = new Point(event.clientX, event.clientY);

    let sendEvent = CanvasMouseEventId.MOUSE_MOVE;
    if (this._mouseDown) {
      sendEvent = CanvasMouseEventId.MOUSE_DRAG;
    }
    this.sendMouseEvent(mouse, 0, sendEvent, event.shiftKey, event.ctrlKey, event.metaKey);
  }

  @HostListener("document:mouseup", ["$event"])
  onGlobalMouseUpCanvas(event: MouseEvent) {
    if (this.shouldProcessMouseEvent(event)) {
      this.onMouseUpCanvas(event);
    }
  }

  onMouseUpCanvas(event: MouseEvent) {
    event.preventDefault();

    // We only consider it a mouse up if it's the left mouse button
    if (event.button == 0) {
      const mouse = new Point(event.clientX, event.clientY);
      this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_UP, event.shiftKey, event.ctrlKey, event.metaKey);
      this._mouseDown = null;
    }
  }

  //@HostListener('document:wheel', ['$event'])
  onMouseWheelCanvas(event: WheelEvent) {
    // Found a whole bunch of funny stuff between browser versions/OS's...
    // OSX: Late 2019: if user pressed shift while mouse-scrolling, deltaY was 0, deltaX was populated but 10x deltaY units
    // Windows: Early 2021: getting +/-100 for the deltaY value, deltaX is always 0
    // To make this always do something useful, check if deltaY is 0, if so, operate off deltaX
    // Normalise the value (only care about the sign). We previously operated on delta=4, so maybe do that, or similar
    // and that should provide similar functionality on all browsers/platforms.

    //console.log('onMouseWheelCanvas:');
    //console.log(event);
    event.preventDefault();

    let delta = event.deltaY;
    if (delta == 0) {
      delta = event.deltaX;
    }

    const deltaStep = 6;

    // Found that on Windows, we were being given deltaX= +/-100, so lets standardise. On OSX we're getting about +/-4, and
    // wrote code to handle it that way...
    if (delta > 0) {
      delta = deltaStep;
    } else if (delta < 0) {
      delta = -deltaStep;
    }

    const mouse = new Point(event.clientX, event.clientY);
    this.sendMouseEvent(mouse, delta, CanvasMouseEventId.MOUSE_WHEEL, event.shiftKey, event.ctrlKey, event.metaKey);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Notify parent
    this.sendKeyEvent(event.key, true);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.sendKeyEvent(event.key, false);
  }

  private sendKeyEvent(key: string, down: boolean): void {
    if (!this.interactionHandler) {
      console.warn("sendKeyEvent: No interaction handler defined");
      return;
    }

    const eventResult = this.interactionHandler.keyEvent(new CanvasKeyEvent(key, down));
    if (eventResult && eventResult.redraw) {
      this.triggerRedraw();
    }
  }

  private sendMouseEvent(mousePos: Point, deltaY: number, eventId: number, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean): void {
    if (!this._mouseLast) {
      this._mouseLast = mousePos;
    }

    if (!this.interactionHandler) {
      console.warn("sendMouseEvent: No interaction handler defined");
    } else {
      const eventResult = this.interactionHandler.mouseEvent(
        new CanvasMouseEvent(
          eventId,

          mousePos ? (this.screenToWorldSpace(mousePos) as Point) : new Point(0, 0),
          this._mouseDown ? (this.screenToWorldSpace(this._mouseDown!) as Point) : new Point(0, 0),
          this.screenToWorldSpace(this._mouseLast) as Point,

          this.screenToCanvasSpace(mousePos),
          this._mouseDown ? this.screenToCanvasSpace(this._mouseDown!) : new Point(0, 0),
          this.screenToCanvasSpace(this._mouseLast),

          this._viewport,

          deltaY,
          shiftKey,
          ctrlKey,
          metaKey
          /*, rect: this.imgCanvas.nativeElement.getBoundingClientRect()*/
        )
      );

      if (eventResult && eventResult.redraw) {
        this.triggerRedraw();
      }
    }

    this._mouseLast = mousePos;
  }

  public static drawFrame(
    screenContext: CanvasRenderingContext2D,
    viewport: CanvasParams,
    transform: CanvasWorldTransform,
    drawer: CanvasDrawer,
    exportItemIDs: string[] = []
  ): Observable<void> {
    //let t0 = performance.now();
    if (!screenContext || !viewport || !transform || !drawer) {
      return of(void 0);
    }

    // Clear the frame as we know its dimensions
    // NOTE: strange bug - for 4 years this was just 0, 0, width, height but after v4 rewrite the context
    // image would not clear properly leaving a trail behind the context image. After multiplying by dpi
    // it was still not clearing the top line. This may be an introduced bug but for the time being
    // clearing slightly larger than the canvas does seem to fix it
    screenContext.clearRect(-1, -1, Math.max(viewport.width, viewport.width * viewport.dpi) + 2, Math.max(viewport.height, viewport.height * viewport.dpi) + 2);

    // Set a transform that will scale all points we generate by the dpi value, thereby giving us
    // native scaling on a high res monitor, for eg macbook pros 3000x2000-ish monitor, if we ignore
    // devicePixelRatio, we'd end up with say a 500x300 canvas scaled up by the browser to fit the
    // viewport of 1000x600. We instead make our canvas 1000x600 in size, and here we multiply all
    // points by 2, and it still looks the same but is at native resolution.
    screenContext.setTransform(viewport.dpi, 0, 0, viewport.dpi, 0, 0);

    const drawParams = new CanvasDrawParameters(transform, viewport, exportItemIDs);

    screenContext.save();
    return drawer.draw(screenContext, drawParams).pipe(
      tap(() => {
        screenContext.restore();
      })
    );
  }

  protected screenToCanvasSpace(pt: Point): Point {
    if (!pt) {
      return pt;
    }

    // Make it relative to our canvas
    if (!this._imgCanvas) {
      return new Point(0, 0);
    }

    const canvasScreenRect = this._imgCanvas.nativeElement.getBoundingClientRect();

    const canvasPt = new Point(pt.x - canvasScreenRect.left, pt.y - canvasScreenRect.top);
    return canvasPt;
  }

  protected screenToWorldSpace(pt: Point): Point | null {
    if (!pt) {
      return pt;
    }

    const canvasPt = this.screenToCanvasSpace(pt);

    // Transform to worldspace
    return this.transform?.canvasToWorldSpace(canvasPt) || null;
  }
}
