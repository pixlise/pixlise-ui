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
import { Observable, of, Subject } from "rxjs";
import { tap } from "rxjs/operators";

import { addVectors, Point, } from "src/app/models/Geometry";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasParams, CanvasDrawNotifier, ResizingCanvasComponent } from "./resizing-canvas.component";
import { CanvasMouseKeyEventHandler, ICanvasHost } from "./canvas-mouse-key-event-handler";

export { CanvasParams, CanvasDrawNotifier };


export class CanvasDrawParameters {
  constructor(
    public worldTransform: CanvasWorldTransform,
    public drawViewport: CanvasParams,
    // If not drawing for export, set to null/empty...
    //public exportChoices: ExportDataChoice[],
    public exportItemIDs: string[],
    // Allows signalling to disable all draw-caching, forcing everything to be drawn to canvas fresh
    public disableCache: boolean
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export class InteractiveCanvasComponent extends ResizingCanvasComponent implements AfterViewInit, OnDestroy, ICanvasHost {
  @Input() drawer: CanvasDrawer | null = null;
  @Input() transform: CanvasWorldTransform | null = null;
  @Input() interactionHandler: CanvasInteractionHandler | null = null;

  @ViewChild("InteractiveCanvas") _imgCanvas?: ElementRef;

  private _triggerRedraw$: Subject<void> = new Subject<void>();

  private _screenContext!: CanvasRenderingContext2D;
  mouseKeyHandler: CanvasMouseKeyEventHandler;

  constructor(layoutService: AnalysisLayoutService) {
    super(layoutService);
    this.mouseKeyHandler = new CanvasMouseKeyEventHandler(this);
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  @HostListener("document:mouseup", ["$event"])
  onGlobalMouseUpCanvas(event: MouseEvent) {
    this.mouseKeyHandler.onGlobalMouseUpCanvas(event);
  }

  @HostListener("document:mousemove", ["$event"])
  onGlobalMouseMoveCanvas(event: MouseEvent) {
    this.mouseKeyHandler.onGlobalMouseMoveCanvas(event);
  }

  public static drawFrame(
    screenContext: CanvasRenderingContext2D,
    viewport: CanvasParams,
    transform: CanvasWorldTransform,
    drawer: CanvasDrawer,
    exportItemIDs: string[] = [],
    disableCache: boolean = false
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

    const drawParams = new CanvasDrawParameters(transform, viewport, exportItemIDs, disableCache);

    screenContext.save();
    return drawer.draw(screenContext, drawParams).pipe(
      tap(() => {
        screenContext.restore();
      })
    );
  }

  // ICanvasHost
  canvasToWorldSpace(canvasPt: Point): Point | null {
    if (!canvasPt) {
      return canvasPt;
    }
    // Transform to worldspace
    return this.transform?.canvasToWorldSpace(canvasPt) || null;
  }

  getInteractionHandler(): CanvasInteractionHandler | null {
    return this.interactionHandler;
  }

  getCanvas(): HTMLCanvasElement | undefined {
      return this._imgCanvas?.nativeElement;
  }

  viewport(): CanvasParams {
    return this._viewport;
  }

  override triggerRedraw(): void {
    window.requestAnimationFrame(() => {
      if (this._screenContext && this._viewport && this.transform && this.drawer) {
        InteractiveCanvasComponent.drawFrame(this._screenContext, this._viewport, this.transform, this.drawer).subscribe();
      }
    });
  }
}
