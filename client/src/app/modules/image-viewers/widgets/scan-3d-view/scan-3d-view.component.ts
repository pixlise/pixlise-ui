import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { combineLatest, Subscription } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";
import { AnalysisLayoutService, APICachedDataService, ContextImageDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { CanvasSizeNotification, ThreeRenderData } from "./interactive-canvas-3d.component";
import { Point } from "src/app/models/Geometry";
import { AxisAlignedBBox } from "src/app/models/Geometry3D";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ContextImageModelLoadedData } from "../context-image/context-image-model-internals";
import Delaunator from "delaunator";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";

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
    private _contextDataService: ContextImageDataService,
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

  protected load(canvasElement?: ElementRef) {
    const scanId = this._analysisLayoutService.defaultScanId;

    combineLatest([
      //this._contextDataService.getWithoutImage(scanId),
      this._cacheDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })),
      this._cacheDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId }))
    ]).subscribe(results => {
      //const contextImgModel = results[0] as ContextImageModelLoadedData;
      const scanEntries = results[0] as ScanEntryResp;
      const beams = results[1] as ScanBeamLocationsResp;

      let bbox = new AxisAlignedBBox();
      let pmcLocs = this.getBeamXYZs(beams, scanEntries.entries, bbox);

      // At this point we use a delaunay lib to generate 2D polygons. The z-value is not required for this, we know
      // our surface was scanned from above so polygons generated will be "correct", we just need to add the "z" back

      // First, generate the 2D coordinates needed
      let pmcLocs2D: number[] = [];
      let pmcLocs3D: number[] = [];
      let pmcForLocs: number[] = [];
      for (const [pmc, loc] of pmcLocs.entries()) {
        pmcLocs2D.push(loc.x);
        pmcLocs2D.push(loc.z);

        pmcLocs3D.push(loc.x);
        pmcLocs3D.push(loc.y);
        pmcLocs3D.push(loc.z);

        pmcForLocs.push(pmc);
      }

/*
      let pmcLocs2D: number[] = [];
      let pmcLocs3D: number[] = [];
      const coords = [377,479,  453,434,  326,387,  444,359,  511,389,
              586,429,  470,315,  622,493,  627,367,  570,314];

      for (let c = 0; c < coords.length; c += 2) {
        pmcLocs2D.push(coords[c]);
        pmcLocs2D.push(coords[c + 1]);

        const tmp = new THREE.Vector3(coords[c], -3, coords[c+1]);

        pmcLocs3D.push(tmp.x);
        pmcLocs3D.push(tmp.y);
        pmcLocs3D.push(tmp.z);
        
        bbox.expandToFit(tmp);
      }
*/
      const delaunay = new Delaunator(pmcLocs2D);
/*
      const coords = [377,479,  453,434,  326,387,  444,359,  511,389,
                586,429,  470,315,  622,493,  627,367,  570,314];
      const delaunay2 = new Delaunator(coords);
      console.log(delaunay2.triangles);
// [4,3,1,  4,6,3,  1,5,4,  4,9,6,  2,0,1,  1,7,5,
//  5,9,4,  6,2,3,  3,2,1,  5,8,9,  0,7,1,  5,7,8]
*/
      // Now associate them back to PMC, hence the xyz, location and form 3D triangles using these indexes
      if (delaunay.triangles.length % 3 != 0) {
        throw new Error("Expected delaunay to deliver a multiple of 3 indexes");
      }

      const terrainGeom = new THREE.BufferGeometry();
      const positionNumComponents = 3;
      // const normalNumComponents = 3;
      // const uvNumComponents = 2;
      terrainGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));
      // terrainGeom.setAttribute(
      //     'normal',
      //     new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
      // terrainGeom.setAttribute(
      //     'uv',
      //     new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
      /*for (let c = 0; c < delaunay.length; c += 3) {

      }*/

      terrainGeom.setIndex(new THREE.BufferAttribute(delaunay.triangles, 1));
      terrainGeom.computeVertexNormals();

      // Form triangle mesh
      const terrain = new THREE.Mesh(
        terrainGeom,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(1, 1, 1),
          roughness: 0.5,
          metalness: 0.5
        })
        /*new THREE.MeshPhongMaterial({
          color: new THREE.Color(1, 1, 1),
          side: THREE.FrontSide,
          shininess: 100,
        })*/
       //new THREE.MeshToonMaterial()
        /*new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.3,0.3,0.3),
            wireframe: true
        })*/
      );

      // Form point cloud too
      const pointsGeom = new THREE.BufferGeometry();
      pointsGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));
      const points = new THREE.Points(
        pointsGeom,
        new THREE.PointsMaterial({color: new THREE.Color(0,1,0), size: 3, sizeAttenuation: false})
      );

      this.isWidgetDataLoading = false;

      this.initScene(terrain, points, bbox, canvasElement);
    });
  }

  protected getBeamXYZs(beams: ScanBeamLocationsResp, scanEntries: ScanEntry[], bbox: AxisAlignedBBox): Map<number, THREE.Vector3> {
    let result = new Map<number, THREE.Vector3>();
    
    const scale = 1000;
    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];
      if(scanEntry.location && scanEntry.normalSpectra) {
        const loc = beams.beamLocations[c];
        const pt = new THREE.Vector3(loc.x * scale, loc.z * scale, loc.y * scale);
        result.set(scanEntry.id, pt);
        bbox.expandToFit(pt);
      }
    }

    return result;
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onCanvasSize(event: CanvasSizeNotification) {
    const isFirst = this._canvasSize === undefined;
    this._canvasSize = event.size;

    // If we have a size and it's the first time it was set, we now load our model data
    if (isFirst && this._canvasSize) {
      this.load(event.canvasElement);
    }
  }

  protected initScene(
    terrain: THREE.Mesh,
    points: THREE.Points,
    //pmcLocations: number[],
    size: AxisAlignedBBox,
    //contextImgModel: ContextImageModelLoadedData,
    canvasElement?: ElementRef
  ) {
    if (!canvasElement) {
      console.error("initScene called without canvas reference");
      return;
    }
    if (!this._canvasSize) {
      console.error("initScene called without known canvas size");
      return;
    }
    if (this._sceneInited) {
      console.error("initScene already called");
      return;
    }
    this._sceneInited = true;

    const dataCenter = size.center();

    const ambientLight = new THREE.AmbientLight(new THREE.Color(1,1,1), 0.2);
    this.renderData.scene.add(ambientLight);

    const lightPos = new THREE.Vector3(dataCenter.x, size.maxCorner.y + (size.maxCorner.y-size.minCorner.y) * 5, dataCenter.z);
    const pointLight = new THREE.PointLight(new THREE.Color(1,1,1), 10);
    pointLight.position.set(lightPos.x, lightPos.y, lightPos.z);
    this.renderData.scene.add(pointLight);

    const lightPointMat = new THREE.MeshToonMaterial();
    const lightPointBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1), 
      lightPointMat
    );
    lightPointBox.position.set(lightPos.x, lightPos.y, lightPos.z);
    this.renderData.scene.add(lightPointBox);

    this.renderData.scene.add(terrain);
    //this.renderData.scene.add(points);

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

    this.renderData.camera.position.set(dataCenter.x, dataCenter.y, size.minCorner.z - (size.maxCorner.z-size.minCorner.z) * 0.5);

    this.renderData.camera.lookAt(dataCenter);
    this.renderData.scene.add(this.renderData.camera);

    this.renderData.controls = new OrbitControls(this.renderData.camera, canvasElement!.nativeElement);

    // Set up what to orbit around
    this.renderData.controls.target.set(dataCenter.x, dataCenter.y, dataCenter.z);
    this.renderData.controls.update();

    // Redraw if camera changes
    this.renderData.controls.addEventListener('change', (e) => {
      this.mdl.needsDraw$.next();
    });

    this.mdl.needsDraw$.next();
  }
}
