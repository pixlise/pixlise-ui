import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from 'three';
import { ThreeRenderData } from "./interactive-canvas-3d.component";
import { Scan3DDrawModel } from "./scan-3d-draw-model";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ElementRef } from "@angular/core";
import { Scan3DViewModel } from "./scan-3d-view-model";
import { Point } from "src/app/models/Geometry";

// Class to represent a picked point
class PickedPoint {
    constructor(
      public pointIndex: number,
      public worldPosition: THREE.Vector3,
      public distance: number
    ) {}
  }

export class Scan3DMouseInteraction {
  private _mouseMoved = false;
  private _planeDragBoxesHovered = false;
  private _planeDragStartY: number = Infinity;

  private _mouseDownPos: Point = new Point();

  // Raycasting for point picking
  private _raycaster = new THREE.Raycaster();

  private _canvas?: HTMLCanvasElement;

  constructor(
    protected _selectionService: SelectionService,
    protected _mdl: Scan3DViewModel) {
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
    this._planeDragStartY = Infinity;

    // Check what user is clicking on, if anything
    this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));

    if (this._planeDragBoxesHovered) {
      // User is dragging the plane, set up for it...
      this._planeDragStartY = this._mdl.planeYScale;
      if (this._mdl.drawModel.renderData.orbitControl) {
        this._mdl.drawModel.renderData.orbitControl.enabled = false;
      }
    }
  }

  onMouseMove(event: MouseEvent): void {
    this._mouseMoved = true;

    if (this._planeDragStartY != Infinity) {
      let scale = this._planeDragStartY + this.mouseDrag(event).y * 0.01;
      if (scale > 1) {
        scale = 1;
      }
      if (scale > 0) {
        this._mdl.planeYScale = scale;
      }
      this.redraw();
    } else {
      this.checkHover(event.target as HTMLCanvasElement, new Point(event.clientX, event.clientY));
    }
  }

  onMouseUp(event: MouseEvent): void {
    // If we're dragging the plane, finish the operation here
    if (this._planeDragStartY != Infinity) {
      // Finish plane drag
      let scale = this._planeDragStartY + this.mouseDrag(event).y * 0.01;
      if (scale > 1) {
        scale = 1;
      }
      if (scale > 0) {
        this._mdl.planeYScale = scale;
      }

      this._planeDragStartY = Infinity;
      if (this._mdl.drawModel.renderData.orbitControl) {
        this._mdl.drawModel.renderData.orbitControl.enabled = true;
      }
      this.redraw();
    }

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

    if (!this._mdl.drawModel.renderData) {
      return;
    }

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((mousePoint.x - rect.left) / rect.width) * 2 - 1,
      -((mousePoint.y - rect.top) / rect.height) * 2 + 1
    );

    // Update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(mouse, this._mdl.drawModel.renderData.camera);

    // Check any interactive elements
    let boxesHit = false;
    for (const box of this._mdl.drawModel.planeDragBoxes) {
      const intersects = this._raycaster.intersectObject(box);
      if (intersects.length > 0) {
        boxesHit = true;
        break;
      }
    }

    // If hover state changed, we have some work to do:
    const lastPlaneDragBoxesHovered = this._planeDragBoxesHovered;
    if (lastPlaneDragBoxesHovered != boxesHit) {
      this._planeDragBoxesHovered = boxesHit;
      this._mdl.drawModel.setPlaneDragBoxHover(boxesHit);
      this.redraw();
      return;
    }

    // If we have points, check hover on each of them 
    const pts = this._mdl.drawModel.meshPoints;
    if (pts) {
      // Calculate objects intersecting the picking ray
      const intersects = this._raycaster.intersectObject(pts);

      if (intersects.length > 0) {
        //console.log("intersects", intersects);
        
        // Find the intersection with the smallest distanceToRay (closest to the mouse ray)
        let closestIntersection = intersects[0];
        for (const intersect of intersects) {
          if ((intersect.distanceToRay ?? Infinity) < (closestIntersection.distanceToRay ?? Infinity)) {
            closestIntersection = intersect;
          }
        }
        
        // Get the point index directly from the intersection
        const pointIndex = closestIntersection.index;
        //console.log("closestIntersection", closestIntersection);
        if (pointIndex !== undefined) {
          const pickedPoint = new PickedPoint(
            pointIndex,
            closestIntersection.point.clone(),
            closestIntersection.distanceToRay ?? 0
          );

          const pt = this._mdl.drawModel.getPointForIndex(pickedPoint.pointIndex);
          if (pt !== undefined) {
            // Get the PMC for this point index
            const pmc = this._mdl.drawModel.getPMCForIndex(pt.scanEntryIndex);
            
            if (pmc !== undefined) {
              // Notify the selection service, treat this like a hover
              let scanId = "";
              if (this._mdl.scanIds.length > 0) {
                scanId = this._mdl.scanIds[0];
              }
              if (scanId.length <= 0) {
                console.error("Failed to set hover point, scan id unknown");
              } else {
                this._selectionService.setHoverEntryPMC(scanId, pmc);
              }
            }

            this.redraw();
            return;
          }
        }
      }
    }
  }

  private redraw() {
    this._mdl.needsDraw$.next();
  }
}