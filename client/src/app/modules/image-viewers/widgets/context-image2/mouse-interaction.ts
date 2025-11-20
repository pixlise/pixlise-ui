import * as THREE from 'three';
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImage2Model } from "./ctx-image-model";
import { Point } from "src/app/models/Geometry";
import { Subject } from "rxjs";

export class ContextImage2MouseInteraction {
  private _mouseMoved = false;
  private _mouseDownPos: Point = new Point();

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
  }

  clearMouseEventListeners() {
    this._canvas?.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this._canvas?.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this._canvas?.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }

  onMouseDown(event: MouseEvent): void {
    this._mouseDownPos = new Point(event.clientX, event.clientY);
    this._mouseMoved = false;

    // Check what user is clicking on, if anything
    this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));
  }

  onMouseMove(event: MouseEvent): void {
    this._mouseMoved = true;
    this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));
  }

  onMouseUp(event: MouseEvent): void {
    this.saveState$.next();

    // Handle as selection?
    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }
  }

  private mouseDrag(event: MouseEvent): Point {
    return new Point(event.clientX-this._mouseDownPos.x, this._mouseDownPos.y-event.clientY);
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