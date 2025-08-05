import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";
import { AnalysisLayoutService, APICachedDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ThreeRenderData } from "./interactive-canvas-3d.component";
import { Point } from "src/app/models/Geometry";
import { AxisAlignedBBox } from "src/app/models/Geometry3D";
import * as THREE from 'three';

@Component({
  standalone: false,
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;

  cursorShown: string = "";
  renderData: ThreeRenderData = new ThreeRenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  private _sceneInited = false;
  private _canvasSize?: Point;

  constructor(
		private _cacheDataService: APICachedDataService,
		private _analysisLayoutService: AnalysisLayoutService
  ) {
    super();

    this.mdl = new Scan3DViewModel();

    this._widgetControlConfiguration = {
      // topToolbar: [],
      // bottomToolbar: [],
    };
  }

  ngOnInit() {
  }

  protected load() {
		const scanId = this._analysisLayoutService.defaultScanId;
		this._cacheDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })).subscribe(
			(resp: ScanBeamLocationsResp) => {
				const locs: number[] = [];
				
				const scale = 100;
        const size = new AxisAlignedBBox();
				for (const loc of resp.beamLocations) {
					if (loc.x != 0 && loc.y != 0 && loc.z != 0) {
            let pt = new THREE.Vector3(loc.x * scale, loc.z * scale, loc.y * scale);
            //pt = scaleVec3D(pt, scale);

            size.expandToFit(pt);

						locs.push(pt.x);
						locs.push(pt.y);
						locs.push(pt.z);
					}
				}

        this.isWidgetDataLoading = false;

        this.initScene(locs, size);
			}
		);
  }
  
  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onCanvasSize(size: Point) {
    const isFirst = this._canvasSize === undefined;
    this._canvasSize = size;

    // If we have a size and it's the first time it was set, we now load our model data
    if (isFirst && this._canvasSize) {
      this.load();
    }
  }

  protected initScene(pmcLocations: number[], size: AxisAlignedBBox) {
    if (!this._canvasSize) {
      console.error("initScene called without known canvas size");
      return;
    }
    if (this._sceneInited) {
      console.error("initScene already called");
      return;
    }
    this._sceneInited = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.renderData.scene.add(ambientLight);
/*
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.x = 2;
    pointLight.position.y = 1;
    pointLight.position.z = 10;
    this.renderData.scene.add(pointLight);

    const material = new THREE.MeshToonMaterial();

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5), 
      material
    );

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.5, 16, 100),
      material
    );

    this.renderData.scene.add(torus, box);
*/
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute(new Float32Array(pmcLocations), 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({color: new THREE.Color(0,1,0), size: 0.01})
    );
    this.renderData.scene.add(points);

    if (!this._canvasSize.x || !this._canvasSize.y) {
      console.error(`Canvas size invalid for scene: w=${this._canvasSize.x}, h=${this._canvasSize.y}`);
      return;
    }

    this.renderData.camera = new THREE.PerspectiveCamera(
      60,
      this._canvasSize.x / this._canvasSize.y,
      0.001,
      1000
    );

    const dataCenter = size.center();
    //this.renderData.camera.lookAt(new THREE.vector3dataSize.).rotateX(0.3);
    this.renderData.camera.position.x = dataCenter.x;
    this.renderData.camera.position.y = size.maxCorner.y + (size.maxCorner.y-size.minCorner.y) * 3;
    this.renderData.camera.position.z = dataCenter.z + (size.maxCorner.z-size.minCorner.z)*0.8;
    
    this.renderData.camera.lookAt(dataCenter);

    this.renderData.scene.add(this.renderData.camera);

    this.mdl.needsDraw$.next();
  }
}
