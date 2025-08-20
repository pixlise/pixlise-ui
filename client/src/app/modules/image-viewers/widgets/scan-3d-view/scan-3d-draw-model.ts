import { Colours } from 'src/app/utils/colours';
import * as THREE from 'three';
import { ThreeRenderData } from './interactive-canvas-3d.component';
import { SelectionService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { AxisAlignedBBox } from 'src/app/models/Geometry3D';
import { LightMode } from 'src/app/generated-protos/widget-data';
import { loadTexture, PMCMeshData, PMCMeshPoint } from "./pmc-mesh";
import { map, Observable, of } from 'rxjs';
import { Coordinate3D } from 'src/app/generated-protos/scan-beam-location';
import { ScanEntry } from 'src/app/generated-protos/scan-entry';
import { ContextImageScanModel } from '../context-image/context-image-model-internals';


export class Scan3DDrawModel {
  protected _meshData?: PMCMeshData;
  protected _meshTerrain?: THREE.Mesh;
  protected _meshPoints?: THREE.Points;
  protected _meshFootprint?: THREE.Mesh;
  protected _texture?: THREE.Texture;

  protected _heightExaggerationScale: number = 1;

  get meshPoints(): THREE.Points | undefined {
    return this._meshPoints;
  }

  create(
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    contextImgMdl?: ContextImageScanModel,
    image?: HTMLImageElement
  ): Observable<void> {
    const meshData = new PMCMeshData(scanEntries, beamLocations, contextImgMdl, image);

    if (image) {
      return loadTexture(image).pipe(
        map(texture => {
          this.initScene(meshData, texture);
        })
      );
    }

    this.initScene(meshData, undefined);
    return of();
  }

  protected initScene(meshData: PMCMeshData, texture: THREE.Texture | undefined) {
    if (this._meshData) {
      console.error("initScene already called");
      return;
    }

    this._meshData = meshData;
    this._texture = texture;

    if (texture) {
      this._terrainMatBasic.map = texture;
      this._terrainMatStandard.map = texture;
    }

    this._meshTerrain = this._meshData!.createMesh(this._terrainMatBasic);

    const pointMat = new THREE.PointsMaterial({
      color: this._selectionColour,
      size: this._pointSize,
      sizeAttenuation: false
    });

    this._meshPoints = this._meshData.createPoints(pointMat);

    this._meshFootprint = this._meshData.createFootprint(
      this._footprintSize,
      new THREE.MeshPhongMaterial({ color: this._hoverColour })
    );

    const meshBBox = meshData.bboxMesh;
    const dataCenter = meshBBox.center();
  
    // Add all the stuff to the scene with references separately so we can remove them if toggled 
    this._pointLight = this.makeLight(
      new THREE.Vector3(
        dataCenter.x,
        meshBBox.maxCorner.y + (meshBBox.maxCorner.y-meshBBox.minCorner.y) * 10,
        dataCenter.z
      )
    );
    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._light);

    this.renderData.scene.add(this._meshTerrain);

    if (this._meshFootprint) {
      this.renderData.scene.add(this._meshFootprint);
    }

    // Create (but don't add) a plane that we can move up and down to compare peaks on the terrain
    this.initPlane(meshBBox, dataCenter);

    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._meshPoints);
  }

  protected makeLight(lightPos: THREE.Vector3) {
    const pointLight = new THREE.PointLight(new THREE.Color(1,1,1), 100);
    pointLight.position.set(lightPos.x, lightPos.y, lightPos.z);
  
    const lightPointMat = new THREE.MeshToonMaterial();
    const lightPointBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1), 
      lightPointMat
    );
  
    pointLight.add(lightPointBox);
    return pointLight;
  }

  protected initPlane(meshBBox: AxisAlignedBBox, dataCenter: THREE.Vector3) {
    const planeXSize = meshBBox.maxCorner.x-meshBBox.minCorner.x;
    const planeYSize = meshBBox.maxCorner.y-meshBBox.minCorner.y;
    const planeZSize = meshBBox.maxCorner.z-meshBBox.minCorner.z;
    const planeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        planeXSize,
        planeYSize,
        planeZSize,
        1, 1, 1),
      new THREE.MeshPhongMaterial({ color: this._marsDirtColour, opacity: 0.7, transparent: true })
    );

    // Box comes centered around 0,0,0, so we re-center it to be at 0,bottom,0
    this._plane = new THREE.Object3D();
    planeMesh.position.setY(planeYSize/2);

    this._plane.add(planeMesh);
    this._plane.position.set(dataCenter.x, meshBBox.minCorner.y, dataCenter.z);

    // And a box to adjust the plane height
    let dragBoxSize = Math.sqrt(planeXSize * planeXSize + planeZSize * planeZSize) / 200;
    if (dragBoxSize < 0.1) {
      dragBoxSize = 0.1;
    }

    const boxGeom = new THREE.BoxGeometry(
      dragBoxSize, dragBoxSize, dragBoxSize,
      1, 1, 1);

    // Place boxes on each side of the plane so it can be easily moved
    const positions = [
      new THREE.Vector3(meshBBox.minCorner.x, this.getPlaneY(meshBBox), dataCenter.z),
      new THREE.Vector3(meshBBox.maxCorner.x, this.getPlaneY(meshBBox), dataCenter.z),
      new THREE.Vector3(dataCenter.x, this.getPlaneY(meshBBox), meshBBox.minCorner.z),
      new THREE.Vector3(dataCenter.x, this.getPlaneY(meshBBox), meshBBox.maxCorner.z),
    ]
    for (let c = 0; c < 4; c++) {
      const boxMesh = new THREE.Mesh(
        boxGeom,
        new THREE.MeshBasicMaterial({ color: this._marsDirtColour })
      );
      boxMesh.position.set(positions[c].x, positions[c].y, positions[c].z);
      this._planeDragBoxes.push(boxMesh);
    }
  }

  protected getPlaneY(meshBBox: AxisAlignedBBox): number {
    const planeYSize = meshBBox.maxCorner.y-meshBBox.minCorner.y;
    return meshBBox.minCorner.y + planeYSize * this._planeScaleY;
  }

  get bboxMesh(): AxisAlignedBBox | undefined {
    return this._meshData?.bboxMesh;
  }

  renderData: ThreeRenderData;

  constructor() {
    this.renderData = new ThreeRenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  }

  // The "Draw Model"...
  private _selection?: THREE.Object3D;
  private _plane?: THREE.Object3D;
  private _planeDragBoxes: THREE.Mesh[] = [];

  private _planeScaleY = 0.5;

  // The lights we can use
  private _pointLight?: THREE.PointLight;
  private _ambientLight = new THREE.AmbientLight(new THREE.Color(1,1,1), 0.2);
  private _hemisphereLight = new THREE.HemisphereLight(new THREE.Color(.63, .48, .41), new THREE.Color(.37, .17, .08), 1)

  private _terrainMatStandard = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1, 1, 1),
    roughness: 0.5,
    metalness: 0.5
  });
  private _terrainMatBasic = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1, 1, 1)
  });

  private _selectionColour = new THREE.Color(Colours.CONTEXT_BLUE.r/255, Colours.CONTEXT_BLUE.g/255, Colours.CONTEXT_BLUE.b/255);
  private _hoverColour = new THREE.Color(Colours.CONTEXT_PURPLE.r/255, Colours.CONTEXT_PURPLE.g/255, Colours.CONTEXT_PURPLE.b/255);
  private _marsDirtColour = new THREE.Color(.37, .17, .08);
  private _pointSize: number = 3;
  private _pointSizeSelected: number = 0.5;
  private _footprintSize: number = 0.05;

  get pointLight(): THREE.PointLight | undefined {
    return this._pointLight;
  }

  get planeDragBoxes(): THREE.Mesh[] {
    return this._planeDragBoxes;
  }

  getPointForIndex(ptIdx: number): PMCMeshPoint | undefined {
    return this._meshData?.points[ptIdx];
  }

  getPMCForIndex(idx: number): number | undefined {
    return this._meshData?.getPMCForIndex(idx);
  }
/*
  getPointForPMC(pmc: number): PMCMeshPoint | undefined {
    const ptIdx = this._meshData!.getPointForPMC(pmc);
    if (ptIdx === undefined)
      return undefined;

    return this._meshData?.points[ptIdx];
  }
*/
  updateSelection(selectionService: SelectionService) {
    if (this._selection) {
      this.renderData.scene.remove(this._selection);
    }

    this._selection = new THREE.Object3D();

    if (!this._meshData) {
      console.warn("updateSelection: No mesh data defined");
      return;
    }

    // Form the points we're drawing the selection for
    const sphere = new THREE.SphereGeometry(this._pointSizeSelected, 8, 8);
    const matSelect = new THREE.MeshBasicMaterial({
      color: this._selectionColour,
      opacity: 0.5,
      transparent: true,
    });
    const matHover = new THREE.MeshBasicMaterial({
      color: this._hoverColour,
      opacity: 0.5,
      transparent: true,
    });

    const sel = selectionService.getCurrentSelection();

    for (const scanId of sel.beamSelection.getScanIds()) {
      // Find which locations we need to highlight. We have a list of PMCs, but we need to map the other way
      const pmcs = sel.beamSelection.getSelectedScanEntryPMCs(scanId);
      for (const pmc of pmcs) {
        const idx = this._meshData.getPointForPMC(pmc);
        if (idx !== undefined) {
          const pt = this._meshData?.points[idx].terrainPoint;

          if (pt) {
            const m = new THREE.Mesh(sphere, matSelect);
            m.position.set(pt.x, pt.y * this._heightExaggerationScale, pt.z);

            this._selection.add(m);
          }
        }
      }

      if (selectionService.hoverScanId == scanId && selectionService.hoverEntryPMC > -1) {
        const idx = this._meshData.getPointForPMC(selectionService.hoverEntryPMC);
        if (idx !== undefined) {
          const pt = this._meshData?.points[idx].terrainPoint;

          if (pt) {
            const m = new THREE.Mesh(sphere, matHover);
            m.position.set(pt.x, pt.y * this._heightExaggerationScale, pt.z);

            this._selection.add(m);
          }
        }
      }
    }

    this.renderData.scene.add(this._selection);
  }

  setLightMode(mode: LightMode) {
    if (!this._pointLight) {
      console.error("setLighting: Lights not set up yet");
      return;
    }

    this.renderData.scene.remove(this._ambientLight);
    this.renderData.scene.remove(this._pointLight);
    this.renderData.scene.remove(this._hemisphereLight);

    if (this.renderData.transformControl) {
      this.renderData.transformControl.detach();
    }

    if (mode == LightMode.LM_UNKNOWN) {
      this.renderData.scene.add(this._ambientLight);
      this._meshTerrain!.material = this._terrainMatBasic;
    } else if (mode == LightMode.LM_POINT) {
      this.renderData.scene.add(this._pointLight);
      this._meshTerrain!.material = this._terrainMatStandard;

      if (this.renderData.transformControl) {
        this.renderData.transformControl.attach(this._pointLight);
      }
    } else {
      this.renderData.scene.add(this._hemisphereLight);
      this._meshTerrain!.material = this._terrainMatStandard;
    }
  }

  setShowPoints(show: boolean) {
    if (!this._meshPoints) {
      console.error("setShowPoints: Points not set up yet");
      return;
    }

    if (!show) {
      this.renderData.scene.remove(this._meshPoints);
    } else {
      this.renderData.scene.add(this._meshPoints);
    }
  }

  setShowFootprint(show: boolean) {
    if (!this._meshFootprint) {
      console.error("setShowFootprint: Footprint not set up yet");
      return;
    }

    if (!show) {
      this.renderData.scene.remove(this._meshFootprint);
    } else {
      this.renderData.scene.add(this._meshFootprint);
    }
  }

  setHeightExaggerationScale(s: number) {
    this._heightExaggerationScale = s;
    if (this._meshPoints) {
      this._meshPoints.scale.y = s;
    }
    if (this._meshTerrain) {
      this._meshTerrain.scale.y = s;
    }
    if (this._meshFootprint) {
      this._meshFootprint.scale.y = s;
    }
    if (this._plane) {
      this._plane.scale.y = s;
    }
  }

  setLightIntensity(i: number) {
    if (this._pointLight) {
      this._pointLight.intensity = i;
    }
    if (this._hemisphereLight) {
      this._hemisphereLight.intensity = i;
    }
    if (this._ambientLight) {
      this._ambientLight.intensity = i;
    }
  }

  setPlaneYScale(scale: number) {
    if (!this._plane) {
      console.error("setPlaneHeight: Plane not set up yet");
      return;
    }

    this.renderData.scene.remove(this._plane);
    for (const box of this._planeDragBoxes) {
      this.renderData.scene.remove(box);
    }

    if (scale > 0 && scale <= 1) {
      this._planeScaleY = scale;
      //this._plane.position.y = this._bboxMCC.center().y;// + height;
      //this._plane.scale.setY(2);
      this._plane.scale.setY(scale);

      this.renderData.scene.add(this._plane);

      for (const box of this._planeDragBoxes) {
        box.position.setY(this.getPlaneY(this._meshData!.bboxMesh));
        this.renderData.scene.add(box);
      }
    }
  }

  setPlaneDragBoxHover(hover: boolean) {
    // If they're hovered, change colour
    let clr = this._marsDirtColour;
    if (hover) {
      clr = new THREE.Color(1,1,0);
    }

    for (const box of this._planeDragBoxes) {
      (box.material as THREE.MeshBasicMaterial).color = clr;
    }
  }

  setDrawTexture(draw: boolean) {
    let texture: THREE.Texture | null = null;
    if (draw) {
      texture = this._texture || null;
    }

    this._terrainMatBasic.map = texture;
    this._terrainMatStandard.map = texture;

    this._terrainMatBasic.needsUpdate = true;
    this._terrainMatStandard.needsUpdate = true;
  }
}