import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from 'three';
import { ThreeRenderData } from "./interactive-canvas-3d.component";
import { Scan3DDrawModel } from "./scan-3d-draw-model";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ElementRef } from "@angular/core";
import { Scan3DViewModel } from "./scan-3d-view-model";

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

  // Raycasting for point picking
  private _raycaster = new THREE.Raycaster();

  private _canvas: any;

  constructor(
    protected _scanId: string,
    protected _selectionService: SelectionService,
    protected _mdl: Scan3DViewModel) {
  }

  setupMouseEvents(canvasElement?: ElementRef) {
    if (!canvasElement) return;
    
    this._canvas = canvasElement.nativeElement;
    
    // Remove existing event listeners to avoid duplicates
    this.clearMouseEventListeners();

    // Add click event listener
    this._canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this._canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this._canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  clearMouseEventListeners() {
    this._canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this._canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this._canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }

  onMouseDown(event: MouseEvent): void {
    this._mouseMoved = false;
  }

  onMouseMove(event: MouseEvent): void {
    this._mouseMoved = true;
  }

  onMouseUp(event: MouseEvent): void {
    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }

    if (!this._mdl.drawModel.renderData || !this._mdl.drawModel.points) {
      return;
    }

    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }

    const canvas = event.target as HTMLCanvasElement;
    if (!canvas) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(mouse, this._mdl.drawModel.renderData.camera);

    // Calculate objects intersecting the picking ray
    const intersects = this._raycaster.intersectObject(this._mdl.drawModel.points);

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
        
        this.onPointPicked(pickedPoint);
      }
    }
  }

  private onPointPicked(pickedPoint: PickedPoint) {
    //console.log('Point picked:', pickedPoint);
    
    if (!this._mdl.drawModel.points || pickedPoint.pointIndex >= this._mdl.drawModel.pmcForLocs.length) {
      return;
    }
    
    // Get the PMC for this point index
    const pmc = this._mdl.drawModel.pmcForLocs[pickedPoint.pointIndex];
    
    // Notify the selection service, treat this like a hover
    this._selectionService.setHoverEntryPMC(this._scanId, pmc);
    /*
    // Get position from the geometry
    const positions = this._points.geometry.attributes['position'];
    const x = positions.getX(pickedPoint.pointIndex);
    const y = positions.getY(pickedPoint.pointIndex);
    const z = positions.getZ(pickedPoint.pointIndex);
    
    //console.log('Point data:', { pmc, x, y, z, scanId: this.scanId });
    
    // Show a snackbar with the picked point information
    this._snackService.open(
      `Point picked: PMC ${pmc}, Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}), UV: (${this._pmcUVs[pickedPoint.pointIndex*2]}, ${this._pmcUVs[pickedPoint.pointIndex*2+1]})`
    );
    
    // Create or update visual indicator at the picked point
    this.updatePickedPointIndicator(x, y, z);
    
    // Here you can add more functionality:
    // - Show detailed information in a panel
    // - Trigger analysis on the selected point
    // - Navigate to related data
    */
  }
/*
  private updatePickedPointIndicator(x: number, y: number, z: number) {
    // Remove existing indicator if it exists
    if (this._pickedPointIndicator) {
      this.renderData.scene.remove(this._pickedPointIndicator);
    }

    // Create a small red sphere as the indicator
    const geometry = new THREE.SphereGeometry(this._pointSize * 1.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(0xff00f6), // Bright magenta/pink color
      transparent: true,
      opacity: 0.5
    });
    
    this._pickedPointIndicator = new THREE.Mesh(geometry, material);
    this._pickedPointIndicator.position.set(x, y, z);
    
    // Add to scene
    this.renderData.scene.add(this._pickedPointIndicator);
    
    // Trigger a redraw to show the indicator
    this.mdl.needsDraw$.next();
  }
*/
}