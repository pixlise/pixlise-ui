import { Colours } from 'src/app/utils/colours';
import * as THREE from 'three';
import { ThreeRenderData } from './interactive-canvas-3d.component';
import { SelectionService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { AxisAlignedBBox } from 'src/app/models/Geometry3D';
import { ScanPoint } from '../../models/scan-point';
import Delaunator from "delaunator";
import { Point } from 'src/app/models/Geometry';
import { Observable, Subscriber } from 'rxjs';
import { LightMode } from 'src/app/generated-protos/widget-data';


const positionNumComponents = 3;


export class Scan3DDrawModel {
  private _sceneInited = false;
  renderData: ThreeRenderData = new ThreeRenderData(new THREE.Scene(), new THREE.PerspectiveCamera());

  // The "Draw Model"...
  private _terrain?: THREE.Mesh;
  private _points?: THREE.Points;
  private _selection?: THREE.Object3D;
  private _plane?: THREE.Mesh;
  private _planeDragBox?: THREE.Mesh;

  private _planeScaleY = 0.5;

  // The lights we can use
  private _pointLight?: THREE.PointLight;
  private _ambientLight = new THREE.AmbientLight(new THREE.Color(1,1,1), 0.2);
  private _hemisphereLight = new THREE.HemisphereLight(new THREE.Color(.63, .48, .41), new THREE.Color(.37, .17, .08), 1)

  // Store PMC data for point lookup
  private _pmcForLocs: number[] = [];
  //private _pmcUVs: Float32Array = new Float32Array([]);
  private _pmcLocs3D: number[] = [];

  private _bboxFootprint: AxisAlignedBBox = new AxisAlignedBBox();
  private _bboxMCC: AxisAlignedBBox = new AxisAlignedBBox();

  // Visual indicator for picked point
  //private _pickedPointIndicator?: THREE.Mesh;

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
  private _pointSize: number = 0.02;

  get bboxMCC(): AxisAlignedBBox {
    return this._bboxMCC.copy();
  }

  get points(): THREE.Points | undefined {
    return this._points;
  }
  get pmcForLocs(): number[] {
    return this._pmcForLocs;
  }

  get pointLight(): THREE.PointLight | undefined {
    return this._pointLight;
  }

  // Create the initial draw model
  create(
    scanId: string,
    pmcLocs: Map<number, THREE.Vector3>,
    bbox: AxisAlignedBBox,
    scanPoints: ScanPoint[],
    lightMode: LightMode,
    showPoints: boolean,
    image?: HTMLImageElement,): Observable<void> {
      return new Observable(
        (subscriber) => {
          // Remember the bounding volume of our scene data here
          this._bboxFootprint = bbox;
          const bboxCenter = this._bboxFootprint.center();

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

          let scanPointLookup = new Map<number, ScanPoint>();

          // If we have an image, we can generate an outer border of locations that give us
          // enough triangle mesh to drape the MCC Image over it
          if (scanPoints && scanPoints.length > 0 && image) {
          let uvbbox = new AxisAlignedBBox();
            for (const pt of scanPoints) {
              scanPointLookup.set(pt.PMC, pt);
              if (pt.coord) {
                uvbbox.expandToFit(new THREE.Vector3(pt.coord.x, bboxCenter.y, pt.coord.y));
              }
            }

            this.padPMCLocationsToImageBorder(this._bboxFootprint, uvbbox, image.width, image.height, pmcLocs2D, pmcLocs3D, pmcForLocs, scanPointLookup);
          }

          const delaunay = new Delaunator(pmcLocs2D);

          // Now associate them back to PMC, hence the xyz, location and form 3D triangles using these indexes
          if (delaunay.triangles.length % 3 != 0) {
            throw new Error("Expected delaunay to deliver a multiple of 3 indexes");
          }

          const terrainGeom = new THREE.BufferGeometry();
          // const normalNumComponents = 3;
          const uvNumComponents = 2;
          terrainGeom.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));
          // terrainGeom.setAttribute(
          //     'normal',
          //     new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));

          if (scanPoints && scanPoints.length > 0 && image) {
            const uvs = this.readUVs(pmcLocs2D, pmcForLocs, scanPointLookup);
            this.processUVs(uvs, image.width, image.height);

            //this._pmcUVs = uvs;
            terrainGeom.setAttribute(
                'uv',
                new THREE.BufferAttribute(uvs, uvNumComponents));
          }

          terrainGeom.setIndex(new THREE.BufferAttribute(delaunay.triangles, 1));
          terrainGeom.computeVertexNormals();

          // Load the texture if there is one
          // Form triangle mesh
          const terrain = new THREE.Mesh(
            terrainGeom,
            this._terrainMatStandard
          );

          if (image) {
            const loader = new THREE.TextureLoader();
            const imgDataUrl = THREE.ImageUtils.getDataURL(image)
            loader.load(imgDataUrl, (texture) => {
              // Texture loaded!
              texture.colorSpace = THREE.SRGBColorSpace;

              // Set it in any materials that need it
              this._terrainMatStandard.map = texture;
              this._terrainMatBasic.map = texture;

              this.continueInitScene(pmcLocs3D, pmcForLocs, terrain, subscriber, lightMode, showPoints);
            });
          } else {
            this.continueInitScene(pmcLocs3D, pmcForLocs, terrain, subscriber, lightMode, showPoints);
          }
        }
      );
  }

  protected continueInitScene(
    pmcLocs3D: number[],
    pmcForLocs: number[],
    terrain: THREE.Mesh,
    subscriber: Subscriber<void>,
    lightMode: LightMode,
    showPoints: boolean,
    ) {
    // Form point cloud too
    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));
  
    // Store PMC data for point lookup
    this._pmcForLocs = [...pmcForLocs];
    this._pmcLocs3D = [...pmcLocs3D];
  
    const points = new THREE.Points(
      pointsGeom,
      new THREE.PointsMaterial({
        color: this._selectionColour,
        size: this._pointSize,
        sizeAttenuation: true
      })
    );
    points.position.y += 0.002;
  
    this.initScene(terrain, points);

    // Add optional items depending on visibility flags
    if (this._pointLight) {
      this.setLightMode(lightMode);
    }

    if (this._points) {
      this.setShowPoints(showPoints);
    }

    if (this._planeScaleY > 0) {
      this.setPlaneYScale(this._planeScaleY);
    }

    subscriber.next();
    subscriber.complete();
  }

  protected readUVs(
    pmcLocs2D: number[],
    pmcForLocs: number[],
    scanPointLookup: Map<number, ScanPoint>): Float32Array {
    const uvs = new Float32Array(pmcLocs2D.length)

    let uvWriteIdx = 0;
    for (const pmc of pmcForLocs) {
      const scanPt = scanPointLookup.get(pmc);
      if (scanPt === undefined) {
        throw new Error("Failed to find scan point for PMC: "+pmc);
      }
      if (!scanPt.coord) {
        throw new Error("No beam ij found for PMC: "+pmc);
      }

      if (uvWriteIdx >= uvs.length-1) {
        throw new Error(`Not enough UVs allocated, need more than ${uvs.length}`);
      }

      uvs[uvWriteIdx++] = scanPt.coord!.x;
      uvs[uvWriteIdx++] = scanPt.coord!.y;
    }

    return uvs;
  }

  protected processUVs(
    uvs: Float32Array,
    contextImageWidth: number,
    contextImageHeight: number) {
    for (let c = 0; c < uvs.length; c += 2) {
      uvs[c] = /*1 -*/ (uvs[c] / contextImageWidth); // NOT SURE WHY WE NEED A X-FLIP???
      uvs[c+1] = (1 - (uvs[c+1] / contextImageHeight)); // OpenGL textures start at 0,0 => bottom left corner
    }
  }

  protected padPMCLocationsToImageBorder(
    bbox: AxisAlignedBBox,
    uvbbox: AxisAlignedBBox,
    contextImageWidth: number,
    contextImageHeight: number,
    pmcLocs2D: number[],
    pmcLocs3D: number[],
    pmcForLocs: number[],
    scanPointLookup: Map<number, ScanPoint>) {
    const bboxCenter = bbox.center();

    // Find the conversion factor between pixels and physical units in both directions
    const uvboxSize = new Point(uvbbox.maxCorner.x-uvbbox.minCorner.x, uvbbox.maxCorner.z-uvbbox.minCorner.z);
    const xyzboxSize = new Point(bbox.maxCorner.x-bbox.minCorner.x, bbox.maxCorner.z-bbox.minCorner.z);

    // Calculate diagonal size of both
    const uvDiag = Math.sqrt(uvboxSize.x*uvboxSize.x + uvboxSize.y*uvboxSize.y);
    const xyzDiag = Math.sqrt(xyzboxSize.x*xyzboxSize.x + xyzboxSize.y*xyzboxSize.y);

    // Calculate pixels per physical unit
    const pixPerPhysical = uvDiag / xyzDiag;

    // Add the 4 corners of the image
    const rectL = bbox.minCorner.x - uvbbox.minCorner.x / pixPerPhysical;
    const rectT = bbox.minCorner.z - uvbbox.minCorner.z / pixPerPhysical;
    const rectR = bbox.maxCorner.x + (contextImageWidth - uvbbox.maxCorner.x) / pixPerPhysical;
    const rectB = bbox.maxCorner.z + (contextImageHeight - uvbbox.maxCorner.z) / pixPerPhysical;

    pmcLocs2D.push(rectL);
    pmcLocs2D.push(rectT);

    pmcLocs2D.push(rectR);
    pmcLocs2D.push(rectT);

    pmcLocs2D.push(rectR);
    pmcLocs2D.push(rectB);

    pmcLocs2D.push(rectL);
    pmcLocs2D.push(rectB);

    // Originally defined as:
    //let paddedUVs: number[] = [0,0, contextImageWidth,0, contextImageWidth,contextImageHeight, 0,contextImageHeight];
    // But needed a x-flip
    let paddedUVs: number[] = [contextImageWidth,contextImageHeight, 0,contextImageHeight, 0,0, contextImageWidth,0];

    this._bboxMCC = this._bboxFootprint.copy();
    let i = 0;
    for (let c = pmcLocs2D.length-8; c < pmcLocs2D.length; c += 2) {
      const pt = new THREE.Vector3(pmcLocs2D[c], bboxCenter.y, pmcLocs2D[c + 1])
      pmcLocs3D.push(pt.x);
      pmcLocs3D.push(pt.y);
      pmcLocs3D.push(pt.z);

      this._bboxMCC.expandToFit(pt)

      const padPMC = -(1+i);
      pmcForLocs.push(padPMC);
      scanPointLookup.set(padPMC, new ScanPoint(padPMC, new Point(paddedUVs[i*2], paddedUVs[i*2+1]), -1, false, false, false, false))
      i++;
    }
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

  protected initScene(
    terrain: THREE.Mesh,
    points: THREE.Points,
    ) {
    if (this._sceneInited) {
      console.error("initScene already called");
      return;
    }
    this._sceneInited = true;
  
    const dataCenter = this._bboxMCC.center();
  
    // Add all the stuff to the scene with references separately so we can remove them if toggled 
    this._pointLight = this.makeLight(
      new THREE.Vector3(
        dataCenter.x,
        this._bboxMCC.maxCorner.y + (this._bboxMCC.maxCorner.y-this._bboxMCC.minCorner.y) * 10,
        dataCenter.z
      )
    );
    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._light);

    this._terrain = terrain;
    this.renderData.scene.add(this._terrain);

    // Create (but don't add) a plane that we can move up and down to compare peaks on the terrain
    const planeXSize = this._bboxMCC.maxCorner.x-this._bboxMCC.minCorner.x;
    const planeYSize = this._bboxMCC.maxCorner.y-this._bboxMCC.minCorner.y;
    const planeZSize = this._bboxMCC.maxCorner.z-this._bboxMCC.minCorner.z;
    this._plane = new THREE.Mesh(
      new THREE.BoxGeometry(
        planeXSize,
        planeYSize * this._planeScaleY,
        planeZSize,
        1, 1, 1),
      new THREE.MeshPhongMaterial({ color: new THREE.Color(.37, .17, .08) })
    );
    this._plane.position.set(dataCenter.x, this._bboxMCC.minCorner.y, dataCenter.z);

    // And a box to adjust the plane height
    let dragBoxSize = Math.sqrt(planeXSize * planeXSize + planeZSize * planeZSize) / 100;
    if (dragBoxSize < 1) {
      dragBoxSize = 1;
    }

    this._planeDragBox = new THREE.Mesh(
      new THREE.BoxGeometry(
        dragBoxSize, dragBoxSize, dragBoxSize,
        1, 1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(.37, .17, .08) })
    );
    this._planeDragBox.position.set(dataCenter.x, this.getPlaneY(), dataCenter.z);

    this._points = points;
    // NOTE: We now just create the object, don't add it... this.renderData.scene.add(this._points);
  }

  protected getPlaneY(): number {
    const planeYSize = this._bboxMCC.maxCorner.y-this._bboxMCC.minCorner.y;
    return this._bboxMCC.minCorner.y + planeYSize * this._planeScaleY;
  }
  
  updateSelection(selectionService: SelectionService) {
    if (this._selection) {
      this.renderData.scene.remove(this._selection);
    }

    this._selection = new THREE.Object3D();

    // Form the points we're drawing the selection for
    const pmcToIdx = new Map<number, number>();
    for (let c = 0; c < this._pmcForLocs.length; c++) {
      pmcToIdx.set(this._pmcForLocs[c], c);
    }

    const sphere = new THREE.SphereGeometry(this._pointSize, 8, 8);
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
        let idx = pmcToIdx.get(pmc);
        if (idx !== undefined) {
          idx *= 3;

          let m = new THREE.Mesh(sphere, matSelect);
          m.position.set(this._pmcLocs3D[idx], this._pmcLocs3D[idx+1], this._pmcLocs3D[idx+2]);

          this._selection.add(m);
        }
      }

      if (selectionService.hoverScanId == scanId && selectionService.hoverEntryPMC > -1) {
        let idx = pmcToIdx.get(selectionService.hoverEntryPMC);

        if (idx !== undefined) {
          idx *= 3;

          let m = new THREE.Mesh(sphere, matHover);
          m.position.set(this._pmcLocs3D[idx], this._pmcLocs3D[idx+1], this._pmcLocs3D[idx+2]);

          this._selection.add(m);
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
      this._terrain!.material = this._terrainMatBasic;
    } else if (mode == LightMode.LM_POINT) {
      this.renderData.scene.add(this._pointLight);
      this._terrain!.material = this._terrainMatStandard;

      if (this.renderData.transformControl) {
        this.renderData.transformControl.attach(this._pointLight);
      }
    } else {
      this.renderData.scene.add(this._hemisphereLight);
      this._terrain!.material = this._terrainMatStandard;
    }
  }

  setShowPoints(show: boolean) {
    if (!this._points) {
      console.error("setShowPoints: Points not set up yet");
      return;
    }

    if (!show) {
      this.renderData.scene.remove(this._points);
    } else {
      this.renderData.scene.add(this._points);
    }
  }

  setPlaneYScale(scale: number) {
    if (!this._plane || !this._planeDragBox) {
      console.error("setPlaneHeight: Plane not set up yet");
      return;
    }

    this.renderData.scene.remove(this._plane);
    this.renderData.scene.remove(this._planeDragBox);
    

    if (scale > 0 && scale <= 1) {
      this._planeScaleY = scale;
      //this._plane.position.y = this._bboxMCC.center().y;// + height;
      //this._plane.scale.setY(2);

      this._planeDragBox.position.setY(this.getPlaneY());

      this.renderData.scene.add(this._plane);
      this.renderData.scene.add(this._planeDragBox);
    }
  }
}