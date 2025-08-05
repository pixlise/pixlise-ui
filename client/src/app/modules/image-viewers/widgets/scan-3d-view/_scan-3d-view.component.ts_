import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";
import * as THREE from 'three';

@Component({
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;

  cursorShown: string = "";

  constructor(public dialog: MatDialog) {
    super();

    this.mdl = new Scan3DViewModel();

    this._widgetControlConfiguration = {
      // topToolbar: [],
      // bottomToolbar: [],
    };
  }

  ngOnInit() {
    this.isWidgetDataLoading = false;
    this.createThreeJsBox();
  }

  createThreeJsBox(): void {
    const canvasContainer = document.getElementsByClassName("canvas-container").item(0);
    const canvas = document.getElementById('canvas-box');

    const scene = new THREE.Scene();

    const material = new THREE.MeshToonMaterial();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.x = 2;
    pointLight.position.y = 2;
    pointLight.position.z = 2;
    scene.add(pointLight);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5), 
      material
    );

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.5, 16, 100),
      material
    );

    scene.add(torus, box);

  const canvasSizes = {
    width: canvasContainer!.clientWidth * window.devicePixelRatio, // window.innerWidth,
    height: canvasContainer!.clientHeight * window.devicePixelRatio, // window.innerHeight,
  };

  const camera = new THREE.PerspectiveCamera(
    75,
    canvasSizes.width / canvasSizes.height,
    0.001,
    1000
  );
  camera.position.z = 30;
  scene.add(camera);

  if (!canvas) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  });

  renderer.setClearColor(0xe232222, 1);
  renderer.setSize(canvasSizes.width, canvasSizes.height);

  window.addEventListener('resize', () => {
    //const theCanvas = document.getElementById('canvas-box');
    canvasSizes.width = canvasContainer!.clientWidth * window.devicePixelRatio; //window.innerWidth;
    canvasSizes.height = canvasContainer!.clientHeight * window.devicePixelRatio; //window.innerHeight;

    camera.aspect = canvasSizes.width / canvasSizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.render(scene, camera);
  });

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
    renderer.render(scene, camera);

    // Call animateGeometry again on the next frame
    window.requestAnimationFrame(animateGeometry);
  };

  animateGeometry();
}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
