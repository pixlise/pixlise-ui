import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { CanvasDrawNotifier, CanvasParams, ResizingCanvasComponent } from "src/app/modules/widget/components/interactive-canvas/resizing-canvas.component";
import * as THREE from 'three';


@Component({
  standalone: false,
  selector: "interactive-canvas-3d",
  templateUrl: "./interactive-canvas-3d.component.html",
  styleUrls: ["./interactive-canvas-3d.component.scss"],
})
export class InteractiveCanvas3DComponent extends ResizingCanvasComponent implements OnInit {
  @ViewChild("InteractiveCanvas3D") _imgCanvas?: ElementRef;

  protected _scene?: THREE.Scene;
  protected _sceneCamera?: THREE.PerspectiveCamera;
  protected _renderer?: THREE.WebGLRenderer;

  ngOnInit() {
    this.createThreeJsBox();
  }

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
    // ???
  }

  protected override setTransformCanvasParams(params: CanvasParams): void {
    if (!this._sceneCamera || !this._renderer || !this._scene) {
      this.createThreeJsBox();
    }

    if (!this._sceneCamera || !this._renderer || !this._scene) {
      console.error("No scene, renderer or camera for setTransformCanvasParams");
      return;
    }

    this._sceneCamera.aspect = params.width / params.height;
    this._sceneCamera.updateProjectionMatrix();

    this._renderer.setSize(params.width, params.height);
    this._renderer.render(this._scene, this._sceneCamera);
  }

  protected override refreshContext(): void {
    // We don't need a context
  }

  createThreeJsBox(): void {
    const canvasContainer = document.getElementsByClassName("canvas-container").item(0);
    const canvas = this.getCanvasElement()?.nativeElement;

    this._scene = new THREE.Scene();

    const material = new THREE.MeshToonMaterial();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this._scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.x = 2;
    pointLight.position.y = 2;
    pointLight.position.z = 2;
    this._scene.add(pointLight);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5), 
      material
    );

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.5, 16, 100),
      material
    );

    this._scene.add(torus, box);

    const canvasSizes = {
      width: canvasContainer!.clientWidth * window.devicePixelRatio, // window.innerWidth,
      height: canvasContainer!.clientHeight * window.devicePixelRatio, // window.innerHeight,
    };

    this._sceneCamera = new THREE.PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.001,
      1000
    );
    this._sceneCamera.position.z = 30;
    this._scene.add(this._sceneCamera);

    if (!canvas) {
      console.error("No canvas for creating WebGLRenderer");
      return;
    }

    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    });

    this._renderer.setClearColor(0xe232222, 1);
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

    animateGeometry();
  }
}