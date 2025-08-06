import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Point } from "src/app/models/Geometry";
import { CanvasDrawNotifier, CanvasParams, ResizingCanvasComponent } from "src/app/modules/widget/components/interactive-canvas/resizing-canvas.component";

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


export class ThreeRenderData {
  constructor(
    public scene: THREE.Scene,
    public camera: THREE.PerspectiveCamera,
    public controls?: OrbitControls
  ) {}
}

export class CanvasSizeNotification {
  constructor(
    public size: Point,
    public canvasElement?: ElementRef
  ) {}
}

@Component({
  standalone: false,
  selector: "interactive-canvas-3d",
  templateUrl: "./interactive-canvas-3d.component.html",
  styleUrls: ["./interactive-canvas-3d.component.scss"],
})
export class InteractiveCanvas3DComponent extends ResizingCanvasComponent {
  @ViewChild("InteractiveCanvas3D") _imgCanvas?: ElementRef;

  @Output() canvasSize = new EventEmitter();

  @Input() renderData?: ThreeRenderData;
  protected _renderer?: THREE.WebGLRenderer;

  get drawNotifier(): CanvasDrawNotifier | null {
    return this._drawNotifier;
  }

  @Input() set drawNotifier(notifier: CanvasDrawNotifier | null) {
    this.setDrawNotifier(notifier);
  }

  protected override setDrawerBorderWidth(width: number): void {
    //this.drawer!.borderWidth = width;
  }

  protected override getCanvasElement(): ElementRef | undefined {
    return this._imgCanvas;
  }

  override triggerRedraw(): void {
    if (this._renderer && this.renderData) {
      window.requestAnimationFrame(() => {
        if (this._renderer && this.renderData) {
          //this._controls?.update();
          this._renderer.render(this.renderData.scene, this.renderData.camera);
        }
      });
    }
  }

  protected override setTransformCanvasParams(params: CanvasParams): void {
    if (!this._renderer) {
      this.create3();
    }

    if (!this._renderer) {
      console.error("No renderer for setTransformCanvasParams");
      return;
    }
    this._renderer.setSize(params.width, params.height);

    this.canvasSize.emit(new CanvasSizeNotification(
      new Point(params.width, params.height),
      this._imgCanvas
    ));

    if (!this.renderData) {
      console.warn("No renderData for setTransformCanvasParams");
      return;
    }

    this.renderData.camera.aspect = params.width / params.height;
    this.renderData.camera.updateProjectionMatrix();

    this.triggerRedraw();
  }

  protected override refreshContext(): void {
    // We don't need a context
  }

  create3(): void {
    const canvasContainer = document.getElementsByClassName("canvas-container").item(0);
    const canvas = this.getCanvasElement()?.nativeElement;

    const canvasSizes = {
      width: canvasContainer!.clientWidth * window.devicePixelRatio, // window.innerWidth,
      height: canvasContainer!.clientHeight * window.devicePixelRatio, // window.innerHeight,
    };
/*
    this._sceneCamera = new THREE.PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.001,
      1000
    );
    this._sceneCamera.position.z = 30;
    this._scene.add(this._sceneCamera);
*/
    if (!canvas) {
      console.error("No canvas for creating WebGLRenderer");
      return;
    }

    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    });

    this._renderer.setClearColor(new THREE.Color(0.005, 0.01, 0.005), 1);
    this._renderer.setSize(canvasSizes.width, canvasSizes.height);

/*
  window.addEventListener('resize', () =>
{
    //const theCanvas = document.getElementById('canvas-box');
    canvasSizes.width = canvasContainer!.clientWidth * window.devicePixelRatio; //window.innerWidth;
    canvasSizes.height = canvasContainer!.clientHeight * window.devicePixelRatio; //window.innerHeight;

    camera.aspect = canvasSizes.width / canvasSizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.render(scene, camera);
  });
*/
/*
    const clock = new THREE.Clock();

    const animateGeometry = () => {
      const elapsedTime = clock.getElapsedTime();

      // Update animation objects
      box.rotation.x = elapsedTime;
      box.rotation.y = elapsedTime;
      box.rotation.z = elapsedTime;

      torus.rotation.x = -elapsedTime;
      torus.rotation.y = -elapsedTime;
      torus.rotation.z = -elapsedTime;

      // Render
      if (this._renderer && this._scene && this._sceneCamera) {
        this._renderer.render(this._scene, this._sceneCamera);
      }

      // Call animateGeometry again on the next frame
      window.requestAnimationFrame(animateGeometry);
    };

    animateGeometry();*/
  }
}