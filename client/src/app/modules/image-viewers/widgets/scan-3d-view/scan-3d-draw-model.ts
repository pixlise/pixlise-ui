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
import { ContextImageMapLayer } from '../../models/map-layer';


const pushUpHeight = 0.01;

export class Scan3DDrawModel {
  protected _sceneAttachment?: THREE.Object3D;

  protected _meshData?: PMCMeshData;
  protected _meshTerrain?: THREE.Mesh;
  protected _meshPoints?: THREE.Points;
  protected _meshFootprint?: THREE.Mesh;
  protected _texture?: THREE.Texture;

  protected _meshPointPolygons?: THREE.Group;

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

    this._pointSize = 2 * (contextImgMdl?.scanPointDisplayRadius || 1.5);
    this._pointSizeSelected = meshData.maxWorldMeshSize / 1500;
    this._footprintSize = meshData.maxWorldMeshSize / 1000;

    if (image) {
      return loadTexture(image).pipe(
        map(texture => {
          this.initScene(meshData, texture);
        })
      );
    } // else...
    this.initScene(meshData, undefined);
    return of();
  }

  protected initScene(meshData: PMCMeshData, texture: THREE.Texture | undefined) {
    if (this._meshData) {
      console.error("initScene already called");
      return;
    }

    // Firstly, add our attachment point
    if (this._sceneAttachment) {
      this.renderData.scene.remove(this._sceneAttachment);
    }

    // To make things work nicer with three js default "right handed" coordinate space (where Z+ comes out of the screen)
    // we have to rotate any triangle mesh data that comes from PIXL data to have it's Z values point up on the screen.
    // This way things like the orbit tool work with default settings, else we'd always be encountering issues where
    // up vectors aren't as expected. Hence we attach all scene data to this attachment point from here on!
    this._sceneAttachment = new THREE.Object3D();
    this._sceneAttachment.rotation.x = -Math.PI/2;
    this.renderData.scene.add(this._sceneAttachment);

    this._meshData = meshData;
    this._texture = texture;

    if (texture) {
      this._terrainMatBasic.map = texture;
      this._terrainMatStandard.map = texture;
    }

    this._meshTerrain = this._meshData!.createMesh(this._terrainMatBasic, true);

    const sprite = new THREE.TextureLoader().load("assets/shapes/disc.png");
    sprite.colorSpace = THREE.SRGBColorSpace;

    const pointMat = new THREE.PointsMaterial({
      color: this._selectionColour,
      size: this._pointSize,
      sizeAttenuation: false,
      map: sprite,
      alphaTest: 0.5,
      transparent: true
    });

    this._meshPoints = this._meshData.createPoints(pointMat);
    //this._meshPoints.position.y += pushUpHeight;

    this._meshFootprint = this._meshData.createFootprint(
      this._footprintSize,
      new THREE.MeshPhongMaterial({ color: this._hoverColour })
    );

    const meshBBox = meshData.bboxMeshPMCs;
    const dataCenter = meshBBox.center();
  
    // Add all the stuff to the scene with references separately so we can remove them if toggled 
    this._pointLight = this.makeLight(
      new THREE.Vector3(
        dataCenter.x,
        meshBBox.maxCorner.y + (meshBBox.maxCorner.y-meshBBox.minCorner.y) * 5,
        dataCenter.z
      )
    );
    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._light);

    this._sceneAttachment.add(this._meshTerrain);

    // DEBUGGING: Add wireframe of terrain triangles too
    const wireframe = new THREE.WireframeGeometry(this._meshTerrain.geometry);
    const line = new THREE.LineSegments( wireframe );
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;
    this._sceneAttachment.add(line);

    if (this._meshFootprint) {
      this._sceneAttachment.add(this._meshFootprint);
    }

    // Create (but don't add) a plane that we can move up and down to compare peaks on the terrain
    this.initPlane(meshData.bboxMeshAll, dataCenter);

    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._meshPoints);
  }

  protected makeLight(lightPos: THREE.Vector3) {
    const pointLight = new THREE.PointLight(new THREE.Color(1,1,1), 100);
    pointLight.position.set(lightPos.x, lightPos.y, lightPos.z);
  
    const lightGeom = this.makeLightGeom();
/*
    const lightPointMat = new THREE.MeshToonMaterial();
    const lightGeom = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1), 
      lightPointMat
    );
*/

    pointLight.add(lightGeom);
    return pointLight;
  }

  protected makeLightGeom() {
    const scale = 0.3;
    let y = 0;

    const intensity = 100;
    const group = new THREE.Group();
    //main bulb
    let bulbGeometry = new THREE.SphereGeometry(scale, 16, 16);
    let bulbMat = new THREE.MeshStandardMaterial({
      emissive: 0xffffee,
      emissiveIntensity: intensity,
      color: 0xffffee,
      roughness: 1
    });
  
    let bulbMesh = new THREE.Mesh(bulbGeometry, bulbMat);
    bulbMesh.position.set(0, y, 0);

    //stem
    y += 0.9 * scale;
    let bulbStem = new THREE.CylinderGeometry(0.5 * scale, 0.65 * scale, 0.55 * scale, 16);
    let stemMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: intensity,
      metalness: 0.8,
      roughness: 0
    });

    let bStem = new THREE.Mesh(bulbStem, stemMat);
    bStem.position.set(0, y, 0);

    //plug main
    y += 0.3 * scale;
    let bulbPlug = new THREE.CylinderGeometry(0.52 * scale, 0.52 * scale, 1.2 * scale, 16);

    let plugMat = new THREE.MeshStandardMaterial({
      color: 0x807d7a,
      emissive: 0x807d7a,
      emissiveIntensity: 0.1
    });

    let plug = new THREE.Mesh(bulbPlug, plugMat);
    plug.position.set(0, y, 0);

    //plug top
    y += 0.55 * scale;
    let topGeo = new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 0.2 * scale, 16);

    let topMat = new THREE.MeshStandardMaterial({
      color: 0xe8d905,
      emissive: 0xe8d905,
      emissiveIntensity: 0.1
    });
    let plugTop = new THREE.Mesh(topGeo, topMat);
    plugTop.position.set(0, y, 0);

    //plug rings
    let ringGeo = new THREE.TorusGeometry(0.52 * scale, 0.04 * scale, 4, 16);

    let ringMat = new THREE.MeshStandardMaterial({
      color: 0x807d7a,
      emissive: 0x807d7a,
      emissiveIntensity: 0.1
    });

    y -= 0.4 * scale;
    for (let i = 0; i < 3; i++) {
      let ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, y, 0);
      group.add(ring);

      y += 0.15 * scale;
    }

    //top ring
    y -= 0.05 * scale;
    let topRingGeo = new THREE.TorusGeometry(0.49 * scale, 0.05 * scale, 8, 16);

    let topRing = new THREE.Mesh(topRingGeo, ringMat);
    topRing.position.set(0, y, 0);
    topRing.rotation.x = -Math.PI / 2;

    //bottom ring
    y -= 0.6 * scale;
    let botRingGeo = new THREE.TorusGeometry(0.5 * scale, 0.05 * scale, 8, 16);

    let botRing = new THREE.Mesh(botRingGeo, ringMat);
    botRing.position.set(0, y, 0);
    botRing.rotation.x = -Math.PI / 2;

    //add to group
    group.add(bStem);
    group.add(bulbMesh);
    group.add(plug);
    group.add(plugTop);
    group.add(botRing);
    group.add(topRing);

    return group;
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
      new THREE.MeshPhongMaterial({
        color: this._marsDirtColour,
        opacity: 0.7,
        transparent: true,
        depthWrite: false
      })
    );

    // Box comes centered around 0,0,0, so we re-center it to be at 0,bottom,0
    this._plane = new THREE.Object3D();
    planeMesh.position.setY(planeYSize/2);

    this._plane.add(planeMesh);
    this._plane.position.set(dataCenter.x, meshBBox.minCorner.y, dataCenter.z);
    this._plane.renderOrder = 100;

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

  get bboxMeshPMCs(): AxisAlignedBBox | undefined {
    return this._meshData?.bboxMeshPMCs;
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
    if (this._selection && this._sceneAttachment) {
      this._sceneAttachment.remove(this._selection);
    }

    this._selection = new THREE.Object3D();

    if (!this._meshData) {
      console.warn("updateSelection: No mesh data defined");
      return;
    }

    // Form the points we're drawing the selection for
    const sphere = new THREE.SphereGeometry(this._pointSizeSelected, 12, 12);
    const matSelect = new THREE.MeshBasicMaterial({
      color: this._selectionColour,
      opacity: 0.3,
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
            m.position.set(pt.x, pt.y, pt.z * this._heightExaggerationScale);
            m.renderOrder = 1;

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
            m.position.set(pt.x, pt.y, pt.z * this._heightExaggerationScale);
            m.renderOrder = 10;

            this._selection.add(m);
          }
        }
      }
    }

    this._sceneAttachment?.add(this._selection);
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
    if (!this._meshPoints || !this._sceneAttachment) {
      console.error("setShowPoints: Points not set up yet");
      return;
    }

    if (!show) {
      this._sceneAttachment.remove(this._meshPoints);
    } else {
      this._sceneAttachment.add(this._meshPoints);
    }
  }

  setShowFootprint(show: boolean) {
    if (!this._meshFootprint || !this._sceneAttachment) {
      console.error("setShowFootprint: Footprint not set up yet");
      return;
    }

    if (!show) {
      this._sceneAttachment.remove(this._meshFootprint);
    } else {
      this._sceneAttachment.add(this._meshFootprint);
    }
  }

  setHeightExaggerationScale(s: number) {
    this._heightExaggerationScale = s;
    if (this._meshPoints) {
      this._meshPoints.scale.z = s;
    }
    if (this._meshTerrain) {
      this._meshTerrain.scale.z = s;
    }
    if (this._meshFootprint) {
      this._meshFootprint.scale.z = s;
    }
    if (this._plane) {
      this._plane.scale.z = s;
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
    if (!this._plane || !this._sceneAttachment) {
      console.error("setPlaneHeight: Plane not set up yet");
      return;
    }

    this._sceneAttachment.remove(this._plane);
    for (const box of this._planeDragBoxes) {
      this._sceneAttachment.remove(box);
    }

    if (scale > 0 && scale <= 1) {
      this._planeScaleY = scale;
      //this._plane.position.y = this._bboxMCC.center().y;// + height;
      //this._plane.scale.setY(2);
      this._plane.scale.setY(scale);

      this._sceneAttachment.add(this._plane);

      for (const box of this._planeDragBoxes) {
        box.position.setY(this.getPlaneY(this._meshData!.bboxMeshPMCs));
        this._sceneAttachment.add(box);
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

  updateMaps(maps: ContextImageMapLayer[]) {
    if (!this._sceneAttachment) {
      console.error("updateMaps: called without inited scene");
      return;
    }

    if (this._meshPointPolygons) {
      this._sceneAttachment.remove(this._meshPointPolygons);
    }

    if (maps.length > 0 && this._meshData && this._meshTerrain) {
      const map = maps[0];
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });

      const scanEntryIdxs = this._meshData.getPointPolygonOrder();
      const colours = [];

      // Build a lookup, we're supplying these in the same order as the polygons are defined
      const colourMap = new Map<number, THREE.Color>();
      for (const pt of map.mapPoints) {
        colourMap.set(pt.scanEntryIndex, new THREE.Color(pt.drawParams.colour.r / 255, pt.drawParams.colour.g / 255, pt.drawParams.colour.b / 255));
      }

      for (const idx of scanEntryIdxs) {
        colours.push(colourMap.get(idx));        
      }

      this._meshPointPolygons = this._meshData!.createPointPolygons(this._meshTerrain, mat, colours);

      // Push it up slightly
      //this._meshPointPolygons.position.y += pushUpHeight;

      this._sceneAttachment.add(this._meshPointPolygons);
    }
  }
}