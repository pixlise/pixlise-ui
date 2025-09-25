import { Colours, RGBA } from 'src/app/utils/colours';
import * as THREE from 'three';
import { RenderData } from './interactive-canvas-3d.component';
import { SelectionService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { AxisAlignedBBox } from 'src/app/models/Geometry3D';
import { LightMode, ModelStyle } from 'src/app/generated-protos/widget-data';
import { loadTexture, PMCMeshData, PMCMeshPoint } from "./pmc-mesh";
import { map, Observable, of } from 'rxjs';
import { Coordinate3D } from 'src/app/generated-protos/scan-beam-location';
import { ScanEntry } from 'src/app/generated-protos/scan-entry';
import { ContextImageScanModel } from '../context-image/context-image-model-internals';
import { ContextImageMapLayer } from '../../models/map-layer';


const pushUpHeight = 0.01;

const renderOrderSelectedPoint = 1;
const renderOrderHoverPoint = 10;
const renderOrderComparePlane = 100;

const clrWhite = new THREE.Color(1,1,1);
const clrMarsDirtColour = new THREE.Color(.37, .17, .08);

export class Scan3DDrawModel {
  protected _sceneAttachment?: THREE.Object3D;
  protected _sceneMeshAttachment?: THREE.Object3D;

  protected _meshData?: PMCMeshData;
  protected _meshTerrain?: THREE.Mesh;
  //protected _imageTerrain?: THREE.Mesh;
  protected _meshPoints?: THREE.Points;
  protected _meshFootprint?: THREE.Object3D;
  protected _meshWireframe?: THREE.LineSegments;
  protected _texture?: THREE.Texture;

  protected _meshPointPolygons?: THREE.Group;

  protected _heightExaggerationScale: number = 1;

  protected _lastMaps: ContextImageMapLayer[] = [];
  protected _modelStyle: ModelStyle = ModelStyle.MS_FLAT_BOTTOM_GROUND_PLANE;

  get meshPoints(): THREE.Points | undefined {
    return this._meshPoints;
  }

  create(
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    image3DPoints: Coordinate3D[],
    modelStyle: ModelStyle,
    contextImgMdl?: ContextImageScanModel,
    image?: HTMLImageElement
  ): Observable<void> {
    this._modelStyle = modelStyle;

    this._pointSizeSelected = PMCMeshData.maxWorldMeshSize / 1000;
    this._footprintSize = this._pointSizeSelected;//meshData.maxWorldMeshSize / 1000;
    //this._pointSize = 2 * (contextImgMdl?.scanPointDisplayRadius || 1.5);
    this._pointSizeAttenuated = this._pointSizeSelected;

    const meshData = new PMCMeshData(scanEntries, beamLocations, image3DPoints, contextImgMdl, image);

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

    this._meshData = meshData;
    this._texture = texture;

    if (texture) {
      //this._terrainMatBasic.map = texture;
      this._terrainMatStandard.map = texture;
    }

    this.setModelStyle(this._modelStyle);
  }

  setModelStyle(style: ModelStyle) {
    this._modelStyle = style;
    if (!this._meshData) {
      console.error("setModelStyle: initScene was not yet called");
      return;
    }

    // Firstly, add our attachment point, effectively clears mesh data from scene
    if (this._sceneAttachment) {
      this.renderData.scene.remove(this._sceneAttachment);
    }

    // Clear our own references
    this._meshPoints = undefined;
    this._meshFootprint = undefined;
    this._meshTerrain = undefined;
    this._pointLight = undefined;
    const wasWireframe = this._meshWireframe != undefined;
    this._meshWireframe = undefined;

    this._meshData.regenerate(this._modelStyle);

    // To make things work nicer with three js default "right handed" coordinate space (where Z+ comes out of the screen)
    // we have to rotate any triangle mesh data that comes from PIXL data to have it's Z values point up on the screen.
    // This way things like the orbit tool work with default settings, else we'd always be encountering issues where
    // up vectors aren't as expected. Hence we attach all scene data to this attachment point from here on!
    this._sceneAttachment = new THREE.Object3D();
    this._sceneAttachment.rotation.x = -Math.PI/2;

    // Add the point where we attach the actual scene meshes
    this._sceneMeshAttachment = new THREE.Object3D();
    this._sceneAttachment.add(this._sceneMeshAttachment);

    this.renderData.scene.add(this._sceneAttachment);
    
    // Init mesh display
    this._meshTerrain = this._meshData!.createMesh(
      this._terrainMatStandard,
      this._modelStyle != ModelStyle.MS_MCC_MODEL_ONLY && this._modelStyle != ModelStyle.MS_MCC_MODEL_PMCS_DROPPED,
      this._modelStyle == ModelStyle.MS_FLAT_BOTTOM_GROUND_PLANE,
      false,
      false,
      []
    );

    //this._imageTerrain = this._meshData!.createImage3DPointModel(this._terrainMatStandard);

    // Init points display
    const sprite = new THREE.TextureLoader().load("assets/shapes/disc.png");
    sprite.colorSpace = THREE.SRGBColorSpace;
    const pointMat = new THREE.PointsMaterial({
      color: this._selectionColour,

      // size: this._pointSize,
      // sizeAttenuation: false,
      size: this._pointSizeAttenuated,
      sizeAttenuation: true,

      map: sprite,
      alphaTest: 0.5,
      transparent: true
    });

    if (this._modelStyle != ModelStyle.MS_MCC_MODEL_ONLY) {
      this._meshPoints = this._meshData.createPoints(
        pointMat,
        this._modelStyle == ModelStyle.MS_MCC_MODEL_PMCS_DROPPED ? this._meshTerrain : undefined
      );
      //this._meshPoints.position.z += pushUpHeight;
    }

    // Init footprint display
    this._meshFootprint = this._meshData.createFootprint(
      this._footprintSize,
      new THREE.MeshLambertMaterial({ color: this._hoverColour }),
      new THREE.MeshLambertMaterial({ color: this._selectionColour }),
      false
    );

    const meshBBox = this._meshData.bboxMeshPMCs;
    const dataCenter = meshBBox.center();
  
    // Init lighting
    // Add all the stuff to the scene with references separately so we can remove them if toggled 
    this._pointLight = this.makeLight(
      new THREE.Vector3(
        dataCenter.x,
        meshBBox.maxCorner.y + (meshBBox.maxCorner.y-meshBBox.minCorner.y) * 1.1,
        dataCenter.z
      )
    );
    // NOTE: We now just create the object, don't add it to the scene just yet

    this._sceneMeshAttachment.add(this._meshTerrain);
    // if (this._imageTerrain) {
    //   this._sceneMeshAttachment.add(this._imageTerrain);
    // }

    if (this._meshFootprint) {
      this._sceneMeshAttachment.add(this._meshFootprint);
    }

    // Create (but don't add) a plane that we can move up and down to compare peaks on the terrain
    this.initPlane(this._meshData.bboxMeshAll);

    // NOTE: We now just create the object, don't add it to the scene just yet

    if (wasWireframe) {
      this.setWireframe(true);
    }
  }

  protected makeLight(lightPos: THREE.Vector3) {
    const pointLight = new THREE.PointLight(clrWhite, 100);
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

  protected initPlane(meshBBox: AxisAlignedBBox) {
    const dataCenter = meshBBox.center();
    const planeXSize = meshBBox.sizeX();
    const planeYSize = meshBBox.sizeY();
    const planeZSize = meshBBox.sizeZ();

    const planeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        planeXSize,
        planeYSize,
        planeZSize,
        1, 1, 1),
      new THREE.MeshPhongMaterial({
        color: clrMarsDirtColour,
        opacity: 0.7,
        transparent: true,
        depthWrite: false
      })
    );

    // Box comes centered around 0,0,0, so we re-center it to be at 0,bottom,0
    this._plane = new THREE.Object3D();
    planeMesh.position.setZ(planeZSize/2);

    this._plane.add(planeMesh);
    this._plane.position.set(dataCenter.x, dataCenter.y, meshBBox.minCorner.z);
    this._plane.renderOrder = renderOrderComparePlane;

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
      new THREE.Vector3(meshBBox.minCorner.x, dataCenter.y, this.getPlaneZ(meshBBox)),
      new THREE.Vector3(meshBBox.maxCorner.x, dataCenter.y, this.getPlaneZ(meshBBox)),
      new THREE.Vector3(dataCenter.x, meshBBox.minCorner.y, this.getPlaneZ(meshBBox)),
      new THREE.Vector3(dataCenter.x, meshBBox.maxCorner.y, this.getPlaneZ(meshBBox)),
    ]
    for (let c = 0; c < 4; c++) {
      const boxMesh = new THREE.Mesh(
        boxGeom,
        new THREE.MeshBasicMaterial({ color: clrMarsDirtColour })
      );
      boxMesh.position.set(positions[c].x, positions[c].y, positions[c].z);
      this._planeDragBoxes.push(boxMesh);
    }
  }

  protected getPlaneZ(meshBBox: AxisAlignedBBox): number {
    const planeZSize = meshBBox.maxCorner.z-meshBBox.minCorner.z;
    return meshBBox.minCorner.z + planeZSize * this._planeScaleY;
  }

  get bboxMeshPMCs(): AxisAlignedBBox | undefined {
    return this._meshData?.bboxMeshPMCs;
  }

  renderData: RenderData;

  constructor() {
    this.renderData = new RenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  }

  // The "Draw Model"...
  private _selection?: THREE.Object3D;
  private _plane?: THREE.Object3D;
  private _planeDragBoxes: THREE.Mesh[] = [];

  private _planeScaleY = 0.5;

  // The lights we can use
  private _pointLight?: THREE.PointLight;
  private _ambientLightFullBright = new THREE.AmbientLight(clrWhite, Math.PI); // NOTE: Ambient light "100%" level is Pi!
  private _ambientLight = new THREE.AmbientLight(clrWhite, 0.1);
  private _hemisphereLight = new THREE.HemisphereLight(new THREE.Color(.63, .48, .41), new THREE.Color(.37, .17, .08), 1)

  private _terrainMatStandard = new THREE.MeshPhongMaterial({color: clrWhite, shininess: 50}); /*= new THREE.MeshStandardMaterial({
    color: clrWhite,
    roughness: 0.5,
    metalness: 0.5
  });*/

  private _selectionColour = RGBAtoTHREEColour(Colours.CONTEXT_BLUE);
  private _hoverColour = RGBAtoTHREEColour(Colours.CONTEXT_PURPLE);
  private _pointSizeAttenuated: number = 3;
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
    if (this._selection && this._sceneMeshAttachment) {
      this._sceneMeshAttachment.remove(this._selection);
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
            m.renderOrder = renderOrderSelectedPoint;

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
            m.renderOrder = renderOrderHoverPoint;

            this._selection.add(m);
          }
        }
      }
    }

    this._sceneMeshAttachment?.add(this._selection);
  }

  setLightMode(mode: LightMode) {
    if (!this._pointLight) {
      console.error("setLighting: Lights not set up yet");
      return;
    }

    this.renderData.scene.remove(this._ambientLightFullBright);
    this.renderData.scene.remove(this._ambientLight);
    this.renderData.scene.remove(this._pointLight);
    this.renderData.scene.remove(this._hemisphereLight);

    if (this.renderData.transformControl) {
      this.renderData.transformControl.detach();
    }

    if (mode == LightMode.LM_UNKNOWN) {
      this.renderData.scene.add(this._ambientLightFullBright);
      //this._meshTerrain!.material = this._terrainMatBasic;
    } else if (mode == LightMode.LM_POINT) {
      this.renderData.scene.add(this._pointLight);
      this.renderData.scene.add(this._ambientLight);
      //this._meshTerrain!.material = this._terrainMatStandard;

      if (this.renderData.transformControl) {
        this.renderData.transformControl.attach(this._pointLight);
      }
    } else {
      this.renderData.scene.add(this._hemisphereLight);
      this.renderData.scene.add(this._ambientLight);
      //this._meshTerrain!.material = this._terrainMatStandard;
    }
  }

  setShowPoints(show: boolean) {
    if (!this._meshPoints || !this._sceneMeshAttachment) {
      console.error("setShowPoints: Points not set up yet");
      return;
    }

    if (!show) {
      this._sceneMeshAttachment.remove(this._meshPoints);
    } else {
      this._sceneMeshAttachment.add(this._meshPoints);
    }
  }

  setShowFootprint(show: boolean) {
    if (!this._meshFootprint || !this._sceneMeshAttachment) {
      console.error("setShowFootprint: Footprint not set up yet");
      return;
    }

    if (!show) {
      this._sceneMeshAttachment.remove(this._meshFootprint);
    } else {
      this._sceneMeshAttachment.add(this._meshFootprint);
    }
  }

  setHeightExaggerationScale(s: number) {
    this._heightExaggerationScale = s;
    if(this._sceneMeshAttachment) {
      this._sceneMeshAttachment.scale.z = s;
    }
    /*if (this._meshPoints) {
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
    }*/
  }

  setLightIntensity(i: number) {
    if (this._pointLight) {
      this._pointLight.intensity = i;
    }
    if (this._hemisphereLight) {
      this._hemisphereLight.intensity = i;
    }
    if (this._ambientLightFullBright) {
      this._ambientLightFullBright.intensity = i;
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
      this._plane.scale.setZ(scale);

      this._sceneAttachment.add(this._plane);

      for (const box of this._planeDragBoxes) {
        box.position.setZ(this.getPlaneZ(this._meshData!.bboxMeshPMCs));
        this._sceneAttachment.add(box);
      }
    }
  }

  setPlaneDragBoxHover(hover: boolean) {
    // If they're hovered, change colour
    let clr = clrMarsDirtColour;
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

    //this._terrainMatBasic.map = texture;
    this._terrainMatStandard.map = texture;

    //this._terrainMatBasic.needsUpdate = true;
    this._terrainMatStandard.needsUpdate = true;
  }

  setWireframe(enabled: boolean) {
    if (enabled && !this._meshWireframe && this._meshTerrain) {
      // DEBUGGING: Add wireframe of terrain triangles too
      const wireframe = new THREE.WireframeGeometry(this._meshTerrain.geometry);
      this._meshWireframe = new THREE.LineSegments(wireframe);
      // line.material.depthTest = false;
      // line.material.opacity = 0.25;
      // line.material.transparent = true;
    }

    if(this._sceneMeshAttachment && this._meshWireframe) {
      this._sceneMeshAttachment.remove(this._meshWireframe);

      if (enabled) {
        this._sceneMeshAttachment?.add(this._meshWireframe);
      }
    }
  }

  private _layerDrawMode = "";
  setLayerDrawMode(mode: string) {
    this._layerDrawMode = mode;

    // Force-rebuild the maps
    this.updateMaps(this._lastMaps);
  }

  private _layerOpacity: number = 1;
  setLayerOpacity(opacity: number) {
    this._layerOpacity = opacity;

    // Force-rebuild the maps
    this.updateMaps(this._lastMaps);
  }

  updateMaps(maps: ContextImageMapLayer[]) {
    if (!this._sceneMeshAttachment) {
      console.error("updateMaps: called without inited scene");
      return;
    }

    // if (!this._meshData) {
    //   console.error("updateMaps: called without inited meshData");
    //   return;
    // }

    this._lastMaps = maps;
    
    const tintTerrain = this._layerDrawMode.indexOf("tint") > -1;

    // Remove the previous "other" option
    if (this._meshPointPolygons) {
      this._sceneMeshAttachment.remove(this._meshPointPolygons);
    }

    if (!tintTerrain) {
      this.tintPointPolygons([]);
    }

    if (maps.length > 0 && this._meshData && this._meshTerrain) {
      const map = maps[0];
      const colourDebug = this._layerDrawMode.indexOf("colourDebug") > -1;
      const mat = new THREE.MeshBasicMaterial({ color: clrWhite, transparent: !colourDebug && this._layerOpacity < 1, opacity: this._layerOpacity });

      const scanEntryIdxs = this._meshData.getPointPolygonOrder();
      const colours = [];

      // Build a lookup, we're supplying these in the same order as the polygons are defined
      const colourMap = new Map<number, THREE.Color>();
      if (colourDebug) {
        const colourChoices = [
          new THREE.Color(1, 0, 0),
          new THREE.Color(0, 1, 0),
          new THREE.Color(0, 0, 1),
          new THREE.Color(1, 1, 0),
          new THREE.Color(1, 0, 1),
          new THREE.Color(0, 1, 1),
          new THREE.Color(70/255, 9/255, 93/255),
          new THREE.Color(143/255, 53/255, 163/255),
          new THREE.Color(0.1, 0, 0),
          new THREE.Color(0.25, 0, 0),
          new THREE.Color(0.5, 0, 0),
          new THREE.Color(1, 0, 0),
          clrMarsDirtColour,
          clrWhite,
          new THREE.Color(0, 0, 0),
          new THREE.Color(0.003921569, 0.003921569, 0.003921569),
          new THREE.Color(0.019607843, 0.019607843, 0.019607843),
          new THREE.Color(0.03921569, 0.03921569, 0.03921569),
          new THREE.Color(0.1, 0.1, 0.1),
          new THREE.Color(0.25, 0.25, 0.25),
          new THREE.Color(0.5, 0.5, 0.5),
          clrWhite,
          new THREE.Color("rgb(10%, 10%, 10%)"),
          new THREE.Color("rgb(25%, 25%, 25%)"),
          new THREE.Color("rgb(50%, 50%, 50%)"),
          clrWhite,
        ];
        for (let c = 0; c < map.mapPoints.length; c++) {
          colourMap.set(map.mapPoints[c].scanEntryIndex, colourChoices[c % colourChoices.length]);
        }
      } else {
        for (const pt of map.mapPoints) {
          colourMap.set(pt.scanEntryIndex, RGBAtoTHREEColour(pt.drawParams.colour));
        }
      }

      for (const idx of scanEntryIdxs) {
        colours.push(colourMap.get(idx));        
      }

      if (!tintTerrain) {
        const drawCylinders = this._layerDrawMode.indexOf("cylinders") > -1;
        if (drawCylinders) {
          this._meshPointPolygons = this._meshData.createPointCylinders(this._meshTerrain, mat, colours);
        } else {
          this._meshPointPolygons = this._meshData.createPointPolygons(this._meshTerrain, mat, colours);
        }

        // Push it up slightly
        this._meshPointPolygons.position.z += pushUpHeight;

        this._sceneMeshAttachment.add(this._meshPointPolygons);
      } else {
        this.tintPointPolygons(colours);
      }
    }
  }

  private tintPointPolygons(scanEntryColours: (THREE.Color | undefined)[]) {
    if (!this._meshTerrain) {
      console.error("tintPointPolygons without meshTerrain");
      return;
    }
    if (!this._sceneMeshAttachment) {
      console.error("tintPointPolygons without sceneAttachment");
      return;
    }

    const colourOnlyPMC = this._layerDrawMode.indexOf("colourOnlyPMC") > -1;
    const duplicatePolyPoints = this._layerDrawMode.indexOf("duplicatePoints") > -1;

    // Clear if no tints...
    if (scanEntryColours.length <= 0) {
      // Why didn't this work? this._meshTerrain?.geometry.deleteAttribute("color");

      this._sceneMeshAttachment?.remove(this._meshTerrain);
      this._meshTerrain = this._meshData!.createMesh(
        this._meshTerrain.material as THREE.Material,
        this._modelStyle != ModelStyle.MS_MCC_MODEL_ONLY,
        this._modelStyle == ModelStyle.MS_FLAT_BOTTOM_GROUND_PLANE,
        duplicatePolyPoints,
        colourOnlyPMC,
        []
      );

      this._sceneMeshAttachment?.add(this._meshTerrain);

      //this._terrainMatBasic.vertexColors = false;
      this._terrainMatStandard.vertexColors = false;
    } else {
      //this._terrainMatBasic.vertexColors = true;
      this._terrainMatStandard.vertexColors = true;

      this._sceneMeshAttachment?.remove(this._meshTerrain);
      this._meshTerrain = this._meshData!.createMesh(
        this._meshTerrain.material as THREE.Material,
        this._modelStyle != ModelStyle.MS_MCC_MODEL_ONLY,
        this._modelStyle == ModelStyle.MS_FLAT_BOTTOM_GROUND_PLANE,
        duplicatePolyPoints,
        colourOnlyPMC,
        scanEntryColours
      );

      this._sceneMeshAttachment?.add(this._meshTerrain);
    }
    //this._terrainMatBasic.needsUpdate = true;
    this._terrainMatStandard.needsUpdate = true;
  }

  alignFootprint(alignment: string) {
    if (!this._sceneMeshAttachment) {
      console.error("alignFootprint called with no scene attachment");
      return;
    }

    const rad = 5 * Math.PI / 180;
    if (alignment == "x+") {
      this._sceneMeshAttachment.rotateX(rad);
    } else if (alignment == "x-") {
      this._sceneMeshAttachment.rotateX(-rad);
    } else if (alignment == "y+") {
      this._sceneMeshAttachment.rotateY(rad);
    } else if (alignment == "y-") {
      this._sceneMeshAttachment.rotateY(-rad);
    } else {
      this._sceneMeshAttachment.rotation.x = 0;
      this._sceneMeshAttachment.rotation.y = 0;
    }
  }
}

export function RGBAtoTHREEColour(colour: RGBA): THREE.Color {
  return new THREE.Color(`rgb(${Math.round(colour.r)}, ${Math.round(colour.g)}, ${Math.round(colour.b)})`);
  // NOTE: This is not gamma corrected or whatever... doesn't come out with what we're expecting!
  //return new THREE.Color(colour.r / 255, colour.g / 255, colour.b / 255);
}