import { Point } from "src/app/models/Geometry";
import { CanvasMouseEventId, CanvasKeyEvent, CanvasMouseEvent, CanvasInteractionHandler, CanvasParams } from "./interactive-canvas.component";
import { ElementRef } from "@angular/core";
import { Subject } from "rxjs";

export interface ICanvasHost {
    canvasToWorldSpace(pt: Point): Point | null;
    getCanvas(): HTMLCanvasElement | undefined;
    getInteractionHandler(): CanvasInteractionHandler | null;
    viewport(): CanvasParams;
    triggerRedraw(): void;
}

export class CanvasMouseKeyEventHandler {
  private _mouseDown: Point | null = null;
  private _mouseLast: Point | null = null;

  constructor(private _canvasHost: ICanvasHost)
  {
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
    const canvas = this._canvasHost.getCanvas();
    if (canvas) {
      canvas.focus();
    }
    const mouse = new Point(event.clientX, event.clientY);
    this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_ENTER, event.shiftKey, event.ctrlKey, event.metaKey);
    //this.mouseEntered = true;
  }

  onMouseLeave(event: MouseEvent): void {
    event.preventDefault();
    // Relinquish focus
    const canvas = this._canvasHost.getCanvas();
    if (canvas) {
      canvas.blur();
    }

    const mouse = new Point(event.clientX, event.clientY);
    this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_LEAVE, event.shiftKey, event.ctrlKey, event.metaKey);
    //this.mouseEntered = false;
  }

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
    const ih = this._canvasHost.getInteractionHandler();
    if (!ih) {
      console.warn("sendKeyEvent: No interaction handler defined");
      return;
    }

    const eventResult = ih.keyEvent(new CanvasKeyEvent(key, down));
    if (eventResult && eventResult.redraw) {
      this._canvasHost.triggerRedraw();
    }
  }

  private sendMouseEvent(mousePos: Point, deltaY: number, eventId: number, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean): void {
    if (!this._mouseLast) {
      this._mouseLast = mousePos;
    }

    const ih = this._canvasHost.getInteractionHandler();
    if (!ih) {
      console.warn("sendMouseEvent: No interaction handler defined");
    } else {
      const eventResult = ih.mouseEvent(
        new CanvasMouseEvent(
          eventId,

          mousePos ? (this.screenToWorldSpace(mousePos) as Point) : new Point(0, 0),
          this._mouseDown ? (this.screenToWorldSpace(this._mouseDown!) as Point) : new Point(0, 0),
          this.screenToWorldSpace(this._mouseLast) as Point,

          this.screenToCanvasSpace(mousePos),
          this._mouseDown ? this.screenToCanvasSpace(this._mouseDown!) : new Point(0, 0),
          this.screenToCanvasSpace(this._mouseLast),

          this._canvasHost.viewport(),

          deltaY,
          shiftKey,
          ctrlKey,
          metaKey
          /*, rect: this.imgCanvas.nativeElement.getBoundingClientRect()*/
        )
      );

      if (eventResult && eventResult.redraw) {
        this._canvasHost.triggerRedraw();
      }
    }

    this._mouseLast = mousePos;
  }

  protected screenToCanvasSpace(pt: Point): Point {
    if (!pt) {
      return pt;
    }

    // Make it relative to our canvas
    const canvas = this._canvasHost.getCanvas();
    if (!canvas) {
      return new Point(0, 0);
    }

    const canvasScreenRect = canvas.getBoundingClientRect();

    const canvasPt = new Point(pt.x - canvasScreenRect.left, pt.y - canvasScreenRect.top);
    return canvasPt;
  }

  protected screenToWorldSpace(pt: Point): Point | null {
    if (!pt) {
      return pt;
    }

    const canvasPt = this.screenToCanvasSpace(pt);

    // Transform to worldspace
    return this._canvasHost.canvasToWorldSpace(canvasPt) || null;
  }
}