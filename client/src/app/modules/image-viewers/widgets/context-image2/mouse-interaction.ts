import * as THREE from 'three';
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImage2Model } from "./ctx-image-model";
import { Point, subtractVectors, vectorsEqual } from "src/app/models/Geometry";
import { Subject } from "rxjs";

export class ContextImage2MouseInteraction {
  private _mouseMoved = false;
  private _mouseDownPos: Point | undefined;
  private _mouseLastPos: Point | undefined;

  // Raycasting for point picking
  //private _raycaster = new THREE.Raycaster();

  private _canvas?: HTMLCanvasElement;

  saveState$ = new Subject<void>();

  constructor(
    protected _selectionService: SelectionService,
    protected _mdl: ContextImage2Model) {
  }

  setupMouseEvents(canvasElement: HTMLCanvasElement) {
    this._canvas = canvasElement;
    
    // Remove existing event listeners to avoid duplicates
    this.clearMouseEventListeners();

    // Add click event listener
    this._canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this._canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this._canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this._canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
  }

  clearMouseEventListeners() {
    this._canvas?.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this._canvas?.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this._canvas?.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this._canvas?.removeEventListener('wheel', this.onMouseWheel.bind(this));
  }

  onMouseDown(event: MouseEvent): void {
    this._mouseDownPos = new Point(event.clientX, event.clientY);
    //this._mouseDragInitialPan = this._mdl.pan;
    this._mouseLastPos = new Point(event.clientX, event.clientY);
    this._mouseMoved = false;

    // Check what user is clicking on, if anything
    this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));
  }

  onMouseMove(event: MouseEvent): void {
    this._mouseMoved = true;
    this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));

    if (this._mouseDownPos) {
      const dragged = this.mouseDrag(event);
      //this._mdl.setPan(dragged);
      this._mdl.panBy(dragged);
    }

    this._mouseLastPos = new Point(event.clientX, event.clientY);
  }

  onMouseUp(event: MouseEvent): void {
    this.saveState$.next();

    this._mouseDownPos = undefined;
    this._mouseLastPos = new Point(event.clientX, event.clientY);

    // Handle as selection?
    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }
  }

  onMouseWheel(event: WheelEvent): void {
    const zoomPctChange = 0.05;
    if (event.deltaY != 0) {
      let zoomPct = zoomPctChange + 1;
      if (event.deltaY > 0) {
        zoomPct = 1 - zoomPctChange;
      }

      this._mdl.setZoom(this._mdl.zoom * zoomPct);
      this.redraw();
    }

    this.saveState$.next();
  }

  private mouseDrag(event: MouseEvent): Point {
    const lastPos = new Point(
      this._mouseLastPos ? this._mouseLastPos.x : event.clientX,
      this._mouseLastPos ? this._mouseLastPos.y : event.clientY
    );

    const thisPos = new Point(event.clientX, event.clientY);
    return subtractVectors(thisPos, lastPos);
  }

  private checkHover(canvas: HTMLCanvasElement, mousePoint: Point) {
    if (!canvas) {
      return;
    }
  }

  private redraw() {
    this._mdl.needsDraw$.next();
  }
}