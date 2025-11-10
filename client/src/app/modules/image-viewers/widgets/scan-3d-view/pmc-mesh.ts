import * as THREE from 'three';
import { AxisAlignedBBox, coordinate3DToThreeVector3 } from 'src/app/models/Geometry3D';
import Delaunator from "delaunator";
import { Point, ptWithinPolygon, Rect } from 'src/app/models/Geometry';
import { Observable } from 'rxjs';
import { ContextImageScanModel, PointCluster } from '../context-image/context-image-model-internals';
import { ScanEntry } from 'src/app/generated-protos/scan-entry';
import { Coordinate3D } from 'src/app/generated-protos/scan-beam-location';
import { ContextImageScanModelGenerator } from '../context-image/context-image-scan-model-generator';
import { ScanPoint } from '../../models/scan-point';
import { HullPoint } from '../../models/footprint';
import { ModelStyle } from 'src/app/generated-protos/widget-data';
import { ScanPointPolygon } from '../../models/context-image-draw-model';


export class PMCMeshPoint {
  constructor(
    public terrainPoint: THREE.Vector3, // PMC locations (x,y,z as viewed in scene)
    public rawPoint: THREE.Vector3, // PMC locations in raw x,y,z units
    public scanEntryIndex: number, // "location index" - where in the scan entry array does this come from? (-1 if not real PMC)
    public u: number, // Texture u coordinate
    public v: number, // Texture v coordinate
  ) {}
}

export class PMCPoly {
  constructor(
    public scanEntryIndex: number, // "location index" - where in the scan entry array does this PMC sit?
    public terrainPoints: THREE.Vector3[], // PMC locations (x,y,z as viewed in scene)
    public rawPoints: THREE.Vector3[], // PMC locations in raw x,y,z units
    public u: number[], // U's for each point
    public v: number[] // V's for each point
  ) {}
}

export function loadTexture(image: HTMLImageElement): Observable<THREE.Texture> {
  return new Observable(obs => {
    const loader = new THREE.TextureLoader();
    const imgDataUrl = THREE.ImageUtils.getDataURL(image)
    loader.load(imgDataUrl, (texture) => {
      // Texture loaded!
      texture.colorSpace = THREE.SRGBColorSpace;
      obs.next(texture);
      obs.complete();
    });
  });
}

// TODO: is this redundant?? Just use THREE's own thing??
class GeometryAttributes {
  constructor(public xyz: Float32Array, public uv: Float32Array, public pointScanEntryIdx?: Int32Array, public colours?: Float32Array) {}
}

const downDir = new THREE.Vector3(0, 0, -1);

export class PMCMeshData {
  private _bboxRawXYZ = new AxisAlignedBBox();
  private _bboxRawImageModel = new AxisAlignedBBox();
  private _bboxImageModelMesh = new AxisAlignedBBox();
  private _bboxRawUV = new AxisAlignedBBox();
  private _bboxMCC = new AxisAlignedBBox();
  private _bboxMeshPMCs = new AxisAlignedBBox();
  private _bboxMeshAll = new AxisAlignedBBox();
  private _points: PMCMeshPoint[] = [];
  private _pmcToPoint: Map<number, number> = new Map<number, number>();
  private _rawCornerPoints: THREE.Vector3[] = [];
  private _rawCornerUVs: THREE.Vector2[] = [];
  private _hullPoints: THREE.Vector3[] = [];
  private _hullPointNormals: THREE.Vector3[] = [];
  private _displayHullPoints: THREE.Vector3[] = [];
  private _displayHullNormals: THREE.Vector3[] = [];
  private _averagePointDistanceRaw: number = 0;
  private _averagePointDistanceTerrain: number = 0;

  private _simpleTerrainMesh?: THREE.Mesh;
  private _image3DModel?: THREE.Mesh;
  private _pmcHeightToImageModelHeightOffset = 0;

  private _pmcPolygons: PMCPoly[] = [];

  private _raycaster = new THREE.Raycaster();

  constructor(
    private _scanEntries: ScanEntry[],
    private _beamLocations: Coordinate3D[],
    private _image3DPoints: Coordinate3D[],
    private _contextImgMdl?: ContextImageScanModel,
    private _image?: HTMLImageElement)
  {}

  regenerate(modelStyle: ModelStyle) {
    // Clear stuff
    this._points = [];
    this._simpleTerrainMesh = undefined;
    this._averagePointDistanceRaw = 0;
    this._averagePointDistanceTerrain = 0;
    this._pmcHeightToImageModelHeightOffset = 0;

    this.createRawBBoxes(this._scanEntries, this._beamLocations, this._image3DPoints, this._contextImgMdl);

    if (this._image) {
      this.calculateImageBBox(this._image.width, this._image.height);
    }

    // Find the bbox of all the stuff we'll be scaling to fit the visible area
    const allBBox = this._image ? this._bboxMCC : this._bboxRawXYZ;
    // if (!usePMCModel && this._image3DPoints.length > 0) {
    //   allBBox.expandToFit(this._bboxRawImageModel.minCorner);
    //   allBBox.expandToFit(this._bboxRawImageModel.maxCorner);
    // }

    const scale = this.calculateDisplayScaleFactor(allBBox);

    if (
      this._image3DPoints.length > 0 &&
      this._image &&
      this.isMCCModelEnabled(modelStyle)) {
      // We're basing our model on the images 3d points, and we'll sprinkle the PMCs on the mesh this generates
      // NOTE: Here we calculate a scale factor for just the 3d model points. This is because we want to display it
      // the same way as we do the rest, x/y is the size of the image
      const modelScale = this._image.width > this._image.height ?
        PMCMeshData.maxWorldMeshSize / this._image.width :
        PMCMeshData.maxWorldMeshSize / this._image.height;

      this._image3DModel = this.calculateImagePoint3DModel(modelScale, 0.01, this._image3DPoints);
    } //else {
      // We're basing the model on PMC xyz locations and the rest of the model is just going to be flat-ish
      // heading towards the corners
      this.calculateScanRelatedPoints(scale, this._scanEntries, this._beamLocations, this._contextImgMdl);
    //}

    this.calculateAveragePointDistance();
    this.makePMCMap();

    if (this._image && !this.isMCCModelEnabled(modelStyle)) {
      this.calculateImageSupportPoints(scale, this._image.width, this._image.height);
    }

    // Check if we have an image model and are being asked to use it - if so, we move the PMCs so their terrain points are
    if (this._image3DModel && this.isMCCModelEnabled(modelStyle)) {
      this._pmcHeightToImageModelHeightOffset = this.movePMCTerrainPointsOntoModel(this._image3DModel);
      this.applyOffsetToPoints(this._pmcHeightToImageModelHeightOffset);

      // Add the image model points to our terrain support points
      this.calculateImage3DModelSupportPoints(true);//modelStyle != ModelStyle.MS_MCC_MODEL_ONLY);
    }

    this.calculateHullPoints(scale);

    this.processUVs();

    this.calculateMeshPointPolygons(scale);

    // Calculate terrain mesh for internal use that includes PMC locations (xyz) and image corners
    let geom = this.createPositionArray(modelStyle != ModelStyle.MS_MCC_MODEL_ONLY, true);
    const idxs = this.calculateTriangleIndexes(geom);
    const meshGeom = this.createMeshGeometry(geom, idxs, !!this._image);
    this._simpleTerrainMesh = new THREE.Mesh(meshGeom);

    // Make the polygon Z's sit on the terrain... if we have an image model, also give them the offset so they line up with PMCs
    this.updateMeshPointPolygonZs(this._simpleTerrainMesh, this._pmcHeightToImageModelHeightOffset);
    /*if (this._image3DModel && !usePMCModel) {
      this.updateMeshPointPolygonZs(this._image3DModel, this._bboxImageModelMesh);
    } else {
    }*/

    this.calcDisplayHullPoints(this._simpleTerrainMesh);
  }

  private isMCCModelEnabled(modelStyle: ModelStyle) {
    return (
      modelStyle == ModelStyle.MS_MCC_MODEL_PMCS_DROPPED ||
      modelStyle == ModelStyle.MS_MCC_MODEL_PMCS_POKING_THROUGH ||
      modelStyle == ModelStyle.MS_MCC_MODEL_ONLY
    );
  }

  get points(): PMCMeshPoint[] {
    return this._points;
  }

  static get maxWorldMeshSize(): number {
    return 100;
  }

  getPointForPMC(pmc: number): number | undefined {
    return this._pmcToPoint.get(pmc);
  }

  getPMCForIndex(idx: number): number | undefined {
    if (idx < 0 || idx >= this._scanEntries.length) {
        return undefined;
    }
    return this._scanEntries[idx].id;
  }

  getPointPolygonOrder(): number[] {
    const result: number[] = [];
    for (const poly of this._pmcPolygons) {
      result.push(poly.scanEntryIndex);
    }
    return result;
  }

  createMesh(material: THREE.Material, includePMCPolys: boolean, makeSeparateGroundPlane: boolean, duplicatePolyPoints: boolean, colourOnlyPMC: boolean, scanEntryColours: (THREE.Color | undefined)[]): THREE.Mesh {
    if (!this._simpleTerrainMesh) {
      throw new Error("createMesh called when internals not yet calculated");
    }

    // if (!usePMCPolys) {
    //   // Use the already-created "simple" mesh
    //   this._simpleTerrainMesh!.material = material;
    //   return this._simpleTerrainMesh;
    // }

    // Calculate a mesh that includes PMC locations (xyz), surrounding polygons and image corners
    let geom = this.createPositionPolysArray(includePMCPolys, !makeSeparateGroundPlane, colourOnlyPMC, scanEntryColours);
    let idxs = this.calculateTriangleIndexes(geom);

    idxs = this.removePMCPolyTriangles(idxs, geom);
    
    const meshGeom = this.createMeshGeometry(geom, idxs, !!this._image);

    const mesh = new THREE.Mesh(meshGeom, material);

    // If we need a separate ground plane, make one here
    if (makeSeparateGroundPlane && this._image) {
      const planeGeom = new THREE.PlaneGeometry(this._bboxMeshAll.sizeX(), this._bboxMeshAll.sizeY(), 1, 1);
      const planeMesh = new THREE.Mesh(planeGeom, material);
      planeMesh.position.z = this._bboxMeshAll.minCorner.z;
      mesh.add(planeMesh);
    }
    return mesh;
  }

  createImage3DPointModel(material: THREE.Material): THREE.Mesh | undefined {
    if (this._image3DModel) {
      this._image3DModel.material = material;
      this._image3DModel.material.needsUpdate = true;
    }
    return this._image3DModel;
  }

  createPointPolygons(terrainMesh: THREE.Mesh, material: THREE.Material, polyColours: (THREE.Color | undefined)[]): THREE.Group {
    /*if (this._pmcPolygons.length != polyColours.length) {
      throw new Error(`createPointPolygons: Expected ${this._pmcPolygons.length} colours, got: ${polyColours.length}`);
    }*/

    const result = new THREE.Group();

    for (const poly of this._pmcPolygons) {
      if (poly.terrainPoints.length <= 0) {
        continue;
      }

      const insertPMCPoints = false;

      // Construct x,y,z array
      const extraPoints = insertPMCPoints ? 1 : 0;
      const xyz = new Float32Array((poly.terrainPoints.length + extraPoints) * 3);
      const colours = new Float32Array((poly.terrainPoints.length + extraPoints) * 3);

      if (insertPMCPoints) {
        // Set the first point to be the PMC location itself
        const pmcPtIdx = this._pmcToPoint.get(this._scanEntries[poly.scanEntryIndex].id);
        if (pmcPtIdx === undefined || pmcPtIdx < 0) {
          console.error("createPointPolygons: Failed to look up PMC location for scan index: " + poly.scanEntryIndex)
          continue;
        }

        xyz[0] = this._points[pmcPtIdx].terrainPoint.x;
        xyz[1] = this._points[pmcPtIdx].terrainPoint.y;
        xyz[2] = this._points[pmcPtIdx].terrainPoint.z;
      }

      const clr = polyColours[poly.scanEntryIndex];
      if (clr === undefined) {
        // If map has a hole in it we get this... it's not an error!
        //console.error("createPointPolygons: No colour for scan index: " + poly.scanEntryIndex)
        continue;
      }

      if (insertPMCPoints) {
        colours[0] = clr.r;
        colours[1] = clr.g;
        colours[2] = clr.b;
      }

      let c3 = insertPMCPoints ? 3 : 0;
      for (let c = 0; c < poly.terrainPoints.length; c++) {
        xyz[c3] = poly.terrainPoints[c].x;
        xyz[c3 + 1] = poly.terrainPoints[c].y;
        xyz[c3 + 2] = poly.terrainPoints[c].z;

        colours[c3] = clr.r;
        colours[c3 + 1] = clr.g;
        colours[c3 + 2] = clr.b;
        c3 += 3;
      }

      const polyGeom = new THREE.BufferGeometry();
      polyGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(xyz, 3));

      polyGeom.setAttribute(
        "color",
        new THREE.BufferAttribute(colours, 3));

      const mat = material.clone();
      mat.vertexColors = true;

      // Draw polygon as a triangle fan
      const indexes: number[] = [];
      for (let c = 2; c < (poly.terrainPoints.length + extraPoints); c++) {
        indexes.push(0);
        indexes.push(c);
        indexes.push(c-1);
      }
      //if (insertPMCPoints) {
        // Add closing triangle
        const last = indexes[indexes.length-2];
        indexes.push(0);
        indexes.push(1);
        indexes.push(last);
      //}

      polyGeom.setIndex(new THREE.BufferAttribute(new Uint32Array(indexes), 1));

      const polyMesh = new THREE.Mesh(
        polyGeom,
        mat,
      );

      result.add(polyMesh);

      //break;
    }

    return result;
  }

  createPointCylinders(terrainMesh: THREE.Mesh, material: THREE.Material, polyColours: (THREE.Color | undefined)[]): THREE.Group {
    const shape = new THREE.CylinderGeometry(0, this._averagePointDistanceTerrain / 2, this._averagePointDistanceTerrain/3, 16, 1, true);
    const result = new THREE.Group();

    for (const pt of this._points) {

      const clr = polyColours[pt.scanEntryIndex];
      if (clr === undefined) {
        // If map has a hole in it we get this... it's not an error!
        //console.error("createPointCylinders: No colour for scan index: " + pt.scanEntryIndex)
        continue;
      }

      const shapeMat = new THREE.MeshBasicMaterial({color: clr, opacity: material.opacity, transparent: material.transparent});
      const ptShape = new THREE.Mesh(shape, shapeMat);
      ptShape.rotateX(Math.PI/2);
      ptShape.position.set(pt.terrainPoint.x, pt.terrainPoint.y, pt.terrainPoint.z + this._averagePointDistanceTerrain/6);

      result.add(ptShape);
    }

    return result;
  }

  createPoints(material: THREE.Material, dropOnMesh: THREE.Mesh | undefined): THREE.Points {
    const geom = this.createPositionArray(true, false);

    // Drop the points if needed
    if (dropOnMesh != undefined) {
      for (let c3 = 0; c3 < geom.xyz.length; c3 += 3) {
        const pt = new THREE.Vector3(geom.xyz[c3], geom.xyz[c3+1], geom.xyz[c3+2]);
        const storedPoint = this.dropOnMesh(pt, dropOnMesh);
        geom.xyz[c3+2] = storedPoint.z;
      }
    }

    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(geom.xyz, 3));

    const points = new THREE.Points(
      pointsGeom,
      material,
    );

    return points;
  }

  createFootprint(radius: number, material1: THREE.Material, material2: THREE.Material, drawDebug: boolean): THREE.Object3D | undefined {
    if (this._hullPoints.length <= 0) {
      return undefined;
    }

    // We have calculated hull points intended for display (they are expaned outside the footprint area and follow the terrain)
    // Now we take these to form polygons showing the footprint area. This will be formed of 2 colours to conform to the context
    // image
    let strip1Verts: number[] = [];
    let strip2Verts: number[] = [];

    let strip1Idxs: number[] = [];
    let strip2Idxs: number[] = [];

    const thickness = radius;
    const lipHeight = radius;

    for (let c = 0; c < this._displayHullPoints.length; c++) {
      // Draw a polygon on either side of the line
      const thisPt = new THREE.Vector3(this._displayHullPoints[c].x, this._displayHullPoints[c].y, this._displayHullPoints[c].z + lipHeight);
      strip1Verts.push(thisPt.x);
      strip1Verts.push(thisPt.y);
      strip1Verts.push(thisPt.z);

      strip2Verts.push(thisPt.x);
      strip2Verts.push(thisPt.y);
      strip2Verts.push(thisPt.z);

      const norm = this._displayHullNormals[c];
      strip1Verts.push(...new THREE.Vector3(this._displayHullPoints[c].x, this._displayHullPoints[c].y, this._displayHullPoints[c].z + lipHeight).addScaledVector(norm, thickness).toArray());
      strip2Verts.push(...new THREE.Vector3(this._displayHullPoints[c].x, this._displayHullPoints[c].y, this._displayHullPoints[c].z + lipHeight).addScaledVector(norm, -thickness).toArray());

      const lastIdx = strip1Verts.length-1;
      // Now do the sides too
      strip1Verts.push(strip1Verts[lastIdx-2]);
      strip1Verts.push(strip1Verts[lastIdx-1]);
      //strip1Verts.push(strip1Verts[lastIdx]);
      strip1Verts.push(this._bboxMeshAll.minCorner.z);

      strip2Verts.push(strip2Verts[lastIdx-2]);
      strip2Verts.push(strip2Verts[lastIdx-1]);
      //strip2Verts.push(strip2Verts[lastIdx]);
      strip2Verts.push(this._bboxMeshAll.minCorner.z);

      if (c > 0) {
        const latestIdx = strip1Verts.length / 3 - 1;
        //
        //     Strip 1            Strip 2
        //   (4 triangles)    (4 triangles)
        //  3 ----- 4 ----- 5 ----- 4 ----- 3
        //  |    /  |  \    |    /  |  \    |
        //  |   /   |   \   |   /   |   \   |
        //  |  /    |    \  |  /    |    \  |
        //  0 ----- 1 ----- 2 ----- 1 ----- 0
        //

        // Top surface 2 triangles for each side
        strip1Idxs.push(latestIdx-2);
        strip1Idxs.push(latestIdx-1);
        strip1Idxs.push(latestIdx-4);

        strip1Idxs.push(latestIdx-2);
        strip1Idxs.push(latestIdx-4);
        strip1Idxs.push(latestIdx-5);

        strip2Idxs.push(latestIdx-2);
        strip2Idxs.push(latestIdx-4);
        strip2Idxs.push(latestIdx-1);

        strip2Idxs.push(latestIdx-2);
        strip2Idxs.push(latestIdx-5);
        strip2Idxs.push(latestIdx-4);

        // Side walls of each strip
        strip1Idxs.push(latestIdx);
        strip1Idxs.push(latestIdx-3);
        strip1Idxs.push(latestIdx-4);

        strip1Idxs.push(latestIdx);
        strip1Idxs.push(latestIdx-4);
        strip1Idxs.push(latestIdx-1);

        strip2Idxs.push(latestIdx);
        strip2Idxs.push(latestIdx-4);
        strip2Idxs.push(latestIdx-3);

        strip2Idxs.push(latestIdx);
        strip2Idxs.push(latestIdx-1);
        strip2Idxs.push(latestIdx-4);
      }
    }

    const result = new THREE.Object3D();

    const footprintstrip1 = new THREE.BufferGeometry();
    footprintstrip1.setAttribute("position", new THREE.BufferAttribute(new Float32Array(strip1Verts), 3));
    footprintstrip1.setIndex(new THREE.BufferAttribute(new Uint32Array(strip1Idxs), 1));
    //footprintstrip1.setIndex(new THREE.BufferAttribute(new Uint32Array([0,2,1, 1,2,3]), 1));
    footprintstrip1.computeVertexNormals();

    const strip1Mesh = new THREE.Mesh(footprintstrip1, material1);
    result.add(strip1Mesh);

    const footprintstrip2 = new THREE.BufferGeometry();
    footprintstrip2.setAttribute("position", new THREE.BufferAttribute(new Float32Array(strip2Verts), 3));
    footprintstrip2.setIndex(new THREE.BufferAttribute(new Uint32Array(strip2Idxs), 1));
    footprintstrip2.computeVertexNormals();

    const strip2Mesh = new THREE.Mesh(footprintstrip2, material2);
    result.add(strip2Mesh);

/* NOTE: we first tried drawing this with tube geometry... but of course having 2 different colours side-by-side didn't work
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    for (let c = 0; c < lineSegments.length; c += 2) {
      curvePath.add(new THREE.LineCurve3(lineSegments[c], lineSegments[c+1]));
    }
    const geom = new THREE.TubeGeometry(curvePath, lineSegments.length, radius, 8, false);*/
    /*const width = radius;
    const length = radius;
    const shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo( 0, width );
    shape.lineTo( length, width );
    shape.lineTo( length, 0 );
    shape.lineTo( 0, 0 );
    const geom = new THREE.ExtrudeGeometry(shape, {
      steps: 2,
      depth: 16,
      bevelEnabled: true,
      extrudePath: curvePath
    });*/

    //geom.computeVertexNormals();

    // const mesh = new THREE.Mesh(geom, material);

    //const wireframe = new THREE.WireframeGeometry(geom);

    if (drawDebug) {
      // Drawing the raw hull points as orange lines
      const pts = this._displayHullPoints;
      let lines = new Float32Array(pts.length * 6);
      let writeIdx = 0;
      for (let c = 1; c < pts.length; c++) {
        lines[writeIdx] = pts[c-1].x;
        lines[writeIdx+1] = pts[c-1].y;
        lines[writeIdx+2] = pts[c-1].z;//-0.05;
        writeIdx += 3;

        lines[writeIdx] = pts[c].x;
        lines[writeIdx+1] = pts[c].y;
        lines[writeIdx+2] = pts[c].z;
        writeIdx += 3;
      }

      const linesGeom = new THREE.BufferGeometry();
      linesGeom.setAttribute("position", new THREE.BufferAttribute(lines, 3));
      const mesh = new THREE.LineSegments(linesGeom, new THREE.LineBasicMaterial({color: new THREE.Color("orange")}));
      result.add(mesh);

      // Drawing raw hull point normals as green lines
      const normalGeom = new THREE.BufferGeometry();
      const normalPoints = new Float32Array(this._hullPointNormals.length * 6);
      for (let c = 0; c < this._hullPoints.length; c++) {
        const c6 = c * 6;
        normalPoints[c6] = this._hullPoints[c].x;
        normalPoints[c6+1] = this._hullPoints[c].y;
        normalPoints[c6+2] = this._hullPoints[c].z;

        normalPoints[c6+3] = this._hullPoints[c].x + this._hullPointNormals[c].x;
        normalPoints[c6+4] = this._hullPoints[c].y + this._hullPointNormals[c].y;
        normalPoints[c6+5] = this._hullPoints[c].z + this._hullPointNormals[c].z;
      }

      normalGeom.setAttribute("position", new THREE.BufferAttribute(normalPoints, 3));
      const normalLines = new THREE.LineSegments(normalGeom, new THREE.LineBasicMaterial({color: new THREE.Color("green")}));
      result.add(normalLines);
    }
    return result;
  }

  private movePMCTerrainPointsOntoModel(mesh: THREE.Mesh): number {
    // We don't want to warp the PMC xyz locations but we want them to sit "on" the terrain. This means we find the average
    // height of the points, and the terrain where the points are, and we bring the two together
    let averageMeshHeightAtFootprint = 0;
    let averagePMCTerrainHeight = 0;
    let pointCount = 0;

    for (let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (pt.scanEntryIndex >= 0) {
        averagePMCTerrainHeight += pt.terrainPoint.z;
        const pmcOnMesh = this.dropOnMesh(pt.terrainPoint, mesh);
        averageMeshHeightAtFootprint += pmcOnMesh.z;
        pointCount++;
      }
    }

    if (pointCount <= 0) {
      console.warn("movePMCTerrainPointsOntoModel: No points found, noop");
      return 0;
    }

    averagePMCTerrainHeight /= pointCount;
    averageMeshHeightAtFootprint /= pointCount;

    // Now do the move
    return averageMeshHeightAtFootprint - averagePMCTerrainHeight;
  }

  private applyOffsetToPoints(offset: number) {
    for (let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (pt.scanEntryIndex >= 0) {
        pt.terrainPoint.z += offset;
      }
    }
  }

  private calculateImage3DModelSupportPoints(excludePointsClashingWithinPMCPolygons: boolean) {
    if (!this._image3DModel) {
      console.warn("calculateImage3DModelSupportPoints: Skipped, no image3DModel created");
      return;
    }

    // Make a fast lookup if needed
    const excludeTestPolys = [];
    const excludeTestPolyBBoxes = [];
    if (excludePointsClashingWithinPMCPolygons) {
      for (const pmcPoly of this._pmcPolygons) {
        let rect: Rect | undefined = undefined;
        const poly = [];

        if (pmcPoly.terrainPoints.length > 0) {
          for (let c = 1; c < pmcPoly.terrainPoints.length; c++) {
            const pt = pmcPoly.terrainPoints[c];
            const pt2D = new Point(pt.x, pt.y);
            if (!rect) {
              rect = new Rect(pt2D.x, pt2D.y, 0, 0);
            } else {
              rect.expandToFitPoint(pt2D);
            }
            poly.push(pt2D);
          }

          excludeTestPolys.push(poly);
          excludeTestPolyBBoxes.push(rect);
        }
      }
    }

    const terrainPoints = this._image3DModel.geometry.getAttribute("position").array;
    let c3 = 0;
    for (let c = 0; c < this._image3DPoints.length; c++) {
      const pt = this._image3DPoints[c];
      if (excludePointsClashingWithinPMCPolygons) {
        // Check if this MCC 3D point is within a PMC polygon, as they will have differing heights
        // and cause weird dips/peaks in the model
        let exclude = false;
        for (let i = 0; i < excludeTestPolyBBoxes.length; i++) {
          if (ptWithinPolygon(new Point(terrainPoints[c3], terrainPoints[c3+1]), excludeTestPolys[i], null/*excludeTestPolyBBoxes[i]*/)) {
            exclude = true;
            break;
          }
        }

        if (exclude) {
          // This clashes with the PMC polygon, don't include it!
          c3 += 3; // Don't forget this! It's a bitch to debug.
          continue;
        }
      }

      this._points.push(new PMCMeshPoint(
        new THREE.Vector3(terrainPoints[c3], terrainPoints[c3+1], terrainPoints[c3+2]),
        new THREE.Vector3(pt.x, pt.y, pt.z),
        -1,
        pt.x,
        pt.y
      ));

      c3 += 3;
    }
  }

  private dropOnMesh(pt: THREE.Vector3, mesh: THREE.Mesh): THREE.Vector3 {
    this._raycaster.set(new THREE.Vector3(pt.x, pt.y, 1000000000 /* just use a big number*/), downDir);

    const intersects = this._raycaster.intersectObject(mesh);
    if (intersects.length > 0) {
      // return new THREE.Vector3(pt.x, pt.y, intersects[0].point.z);
      return intersects[0].point;
    }

    return pt;
  }

  get bboxMeshPMCs(): AxisAlignedBBox {
    return this._bboxMeshPMCs;
  }

  get bboxMeshAll(): AxisAlignedBBox {
    return this._bboxMeshAll;
  }

  private makePMCMap() {
    for(let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (pt.scanEntryIndex >= 0) {
        this._pmcToPoint.set(this._scanEntries[pt.scanEntryIndex].id, c);
      }
    }
  }

  private calculateImagePoint3DModel(scale: number, heightScale: number, image3DPoints: Coordinate3D[]): THREE.Mesh {
    // Take the points, form delaunay triangulation only considering the x,y axis, add the z values in
    // and generate a mesh which can be displayed
    let geom = this.createImage3DPointArray(scale, heightScale, this._image!.width, this._image!.height, image3DPoints, this._bboxRawImageModel, this._bboxImageModelMesh);
    const idxs = this.calculateTriangleIndexes(geom);
    const meshGeom = this.createMeshGeometry(geom, idxs, !!this._image);
    const mesh = new THREE.Mesh(meshGeom);
    return mesh;
  }

  private createImage3DPointArray(scale: number, heightScale: number, modelXSize: number, modelYSize: number, image3DPoints: Coordinate3D[], image3dPointsBBox: AxisAlignedBBox, image3dPointsMeshBBox: AxisAlignedBBox): GeometryAttributes {
    const xyz = new Float32Array(image3DPoints.length * 3);
    const uv = new Float32Array(image3DPoints.length * 2);

    let posIdx = 0;
    let uvIdx = 0;

    const xyzCenter = image3dPointsBBox.center();

    for (let c = 0; c < image3DPoints.length; c++) {
      const pt = coordinate3DToThreeVector3(image3DPoints[c]);

      // Need to do some transformations first
      pt.x = modelXSize - pt.x;
      pt.y = modelYSize - pt.y;
      pt.z = image3dPointsBBox.maxCorner.z - (pt.z - image3dPointsBBox.minCorner.z);

      let terrainPt = this.rawToTerrainPoint(pt, xyzCenter, scale);

      terrainPt.z *= heightScale;
      //terrainPt.z += 45;

      image3dPointsMeshBBox.expandToFit(terrainPt);

      xyz[posIdx] = terrainPt.x;
      xyz[posIdx+1] = terrainPt.y;
      xyz[posIdx+2] = terrainPt.z;
      posIdx += 3;

      uv[uvIdx] = 1 - image3DPoints[c].x / modelXSize;
      uv[uvIdx+1] = 1 - image3DPoints[c].y / modelYSize;
      uvIdx += 2;
    }

    return new GeometryAttributes(xyz, uv);
  }

  private createRawBBoxes(
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    imagePoints: Coordinate3D[],
    contextImgMdl?: ContextImageScanModel
  ) {
    // Find the physical PMCs bounding box first
    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];
      if(scanEntry.location && scanEntry.normalSpectra) {
        this._bboxRawXYZ.expandToFit(coordinate3DToThreeVector3(beamLocations[c]));
        if (contextImgMdl && contextImgMdl.scanPoints[c] && contextImgMdl.scanPoints[c].coord) {
          this._bboxRawUV.expandToFit(new THREE.Vector3(contextImgMdl.scanPoints[c].coord!.x, 0, contextImgMdl.scanPoints[c].coord!.y));
        }
      }
    }

    for (let pt of imagePoints) {
      this._bboxRawImageModel.expandToFit(coordinate3DToThreeVector3(pt));
    }
  }

  // Calculates the bounding box and coordinates of image corners
  private calculateImageBBox(imageWidth: number, imageHeight: number) {
    // Find the conversion factor between pixels and physical units in both directions
    const uvboxSize = new Point(this._bboxRawUV.sizeX(), this._bboxRawUV.sizeZ());
    const xyzboxSize = new Point(this._bboxRawXYZ.sizeX(), this._bboxRawXYZ.sizeY()); // <-- NOTE: using Y not Z!

    // Calculate diagonal size of both
    const uvDiag = Math.sqrt(uvboxSize.x*uvboxSize.x + uvboxSize.y*uvboxSize.y);
    const xyzDiag = Math.sqrt(xyzboxSize.x*xyzboxSize.x + xyzboxSize.y*xyzboxSize.y);

    // Calculate pixels per physical unit
    const pixPerPhysical = uvDiag / xyzDiag;

    // Add the 4 corners of the image
    const rectL = this._bboxRawXYZ.minCorner.x - this._bboxRawUV.minCorner.x / pixPerPhysical;
    const rectT = this._bboxRawXYZ.minCorner.y - this._bboxRawUV.minCorner.z / pixPerPhysical;
    const rectR = this._bboxRawXYZ.maxCorner.x + (imageWidth - this._bboxRawUV.maxCorner.x) / pixPerPhysical;
    const rectB = this._bboxRawXYZ.maxCorner.y + (imageHeight - this._bboxRawUV.maxCorner.z) / pixPerPhysical;

    const z = this._bboxRawXYZ.center().z;

    this._bboxMCC = new AxisAlignedBBox();
    this._bboxMCC.expandToFit(new THREE.Vector3(rectL, rectT, z));
    this._bboxMCC.expandToFit(new THREE.Vector3(rectR, rectT, z));
    this._bboxMCC.expandToFit(new THREE.Vector3(rectR, rectB, z));
    this._bboxMCC.expandToFit(new THREE.Vector3(rectL, rectB, z));
  }

  private calculateDisplayScaleFactor(wholeScanBBox: AxisAlignedBBox) {
    // We want our display coordinates to fit into a known bounding box, make the max width or height a known size:
    const maxSize = PMCMeshData.maxWorldMeshSize;

    // Work out a scale factor - if we have the image bbox use that as extents otherwise just the xyzs
    let scale = 1;

    if (wholeScanBBox.sizeX() > wholeScanBBox.sizeY()) {
      scale = maxSize / wholeScanBBox.sizeX();
    } else {
      scale = maxSize / wholeScanBBox.sizeY();
    }

    return scale;
  }

  // Create the point centerecreateImage3DPointArrayd at 0,0,0 and scaled to what we want
  private rawToTerrainPoint(pt: THREE.Vector3Like, ptDataCenter: THREE.Vector3, scale: number): THREE.Vector3 {
    return new THREE.Vector3(
      -(pt.x - ptDataCenter.x) * scale,
      (pt.y - ptDataCenter.y) * scale,
      (pt.z - ptDataCenter.z) * scale
    )
  }

  // Calculate points related to the scan
  private calculateScanRelatedPoints(
    scale: number,
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    contextImgMdl?: ContextImageScanModel
  ) {
    // Calculate the points
    const xyzCenter = this._bboxRawXYZ.center();

    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];

      if(scanEntry.location && scanEntry.normalSpectra) {
        let u = 0;
        let v = 0;
        if (contextImgMdl && contextImgMdl.scanPoints[c] && contextImgMdl.scanPoints[c].coord) {
          u = contextImgMdl.scanPoints[c].coord?.x;
          v = contextImgMdl.scanPoints[c].coord?.y;
        }

        let terrainPt = this.rawToTerrainPoint(beamLocations[c], xyzCenter, scale);

        this._bboxMeshPMCs.expandToFit(terrainPt);

        this._points.push(new PMCMeshPoint(
          terrainPt,
          new THREE.Vector3(beamLocations[c].x, beamLocations[c].y, beamLocations[c].z),
          c,
          u,
          v
        ));
      }
    }
  }

  private calculateAveragePointDistance() {
    if (this._points.length <= 0) {
      throw new Error("calculateAveragePointDistance called without points created");
    }
      
      // The average distance is just checked between the first N PMC xyz coordinates and we assume that's a good enough estimate
    // for the whole scan
    let checked = 0;
    let totalDistRaw = 0;
    let totalDistTerrain = 0;
    for (let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (pt.scanEntryIndex >= 0 && (this._scanEntries[pt.scanEntryIndex].normalSpectra || this._scanEntries[pt.scanEntryIndex].pseudoIntensities)) {
        if (checked > 0) {
          const last = this._points[c-1];
          let dist = pt.rawPoint.distanceTo(last.rawPoint);
          totalDistRaw += dist;

          dist = pt.terrainPoint.distanceTo(last.terrainPoint);
          totalDistTerrain += dist;

          if (checked > 10) {
            break;
          }
        }
      }
      checked++;
    }

    if (checked <= 0) {
      throw new Error("calculateAveragePointDistance failed to find any points to check")
    }

    this._averagePointDistanceRaw = totalDistRaw / checked;
    this._averagePointDistanceTerrain = totalDistTerrain / checked;
  }

  private calculateImageSupportPoints(
    scale: number,
    imageWidth: number,
    imageHeight: number
  ) {
    const dataCenter = this._bboxMCC.center();
    this._bboxMeshAll = new AxisAlignedBBox();
    this._bboxMeshAll.expandToFit(this._bboxMeshPMCs.minCorner);
    this._bboxMeshAll.expandToFit(this._bboxMeshPMCs.maxCorner);

    // We assume this is set correctly...
    this._rawCornerPoints = [
      new THREE.Vector3(this._bboxMCC.minCorner.x, this._bboxMCC.minCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.maxCorner.x, this._bboxMCC.minCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.maxCorner.x, this._bboxMCC.maxCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.minCorner.x, this._bboxMCC.maxCorner.y, dataCenter.z),
    ];

    this._rawCornerUVs = [
      new THREE.Vector2(imageWidth, imageHeight),
      new THREE.Vector2(0,imageHeight),
      new THREE.Vector2(0, 0),
      new THREE.Vector2(imageWidth, 0)
    ];

    for (let c = 0; c < this._rawCornerPoints.length; c++) {
      const coord = this._rawCornerPoints[c];
      const terrainPoint = this.rawToTerrainPoint(coord, dataCenter, scale);
      this._points.push(new PMCMeshPoint(
        terrainPoint,
        coord,
        -1,
        this._rawCornerUVs[c].x,
        this._rawCornerUVs[c].y
      ))

      this._bboxMeshAll.expandToFit(terrainPoint);
    }

/*      // Generate points in a circle, outside the footprint to break up long triangles casting outwards
      if (scanMdl) {
        for (const hull of scanMdl.footprint) {
          for (const hullPt of hull) {
            const footprintPMC = scanMdl.scanPoints[hullPt.idx].PMC;

            // Find the index... GROAN.. should be faster if we do away with this new set of indexes :(
            let idx = -1;
            for (let c = 0; c < pmcForLocs.length; c++) {
              if (pmcForLocs[c] == footprintPMC) {
                idx = c;
                break;
              }
            }

            if (idx >= 0) {
              // We have the index! Now calculate a point outside the footprint area
              const footprintPtCoord = new THREE.Vector3(pmcLocs3D[idx*3], pmcLocs3D[idx*3+1], pmcLocs3D[idx*3+2]);
              const vec = new THREE.Vector3().subVectors(footprintPtCoord, bboxCenter);// new THREE.Vector3();

              const len = vec.length();
              vec.normalize();

              const outerPoint = vec.multiplyScalar(len * 4.5);
              outerPoint.addVectors(outerPoint, bboxCenter);

              if (bbox.contains(outerPoint)) {
                pmcLocs3D.push(outerPoint.x);
                pmcLocs3D.push(outerPoint.y);
                pmcLocs3D.push(outerPoint.z);

                pmcLocs2D.push(outerPoint.x);
                pmcLocs2D.push(outerPoint.z);

                const u = 0.5;
                const v = 0.5;

                pmcForLocs.push(padPMC);
                scanPointLookup.set(padPMC, new ScanPoint(padPMC, new Point(u, v), -1, false, false, false, false))
                padPMC--;
              }
            }
          }

          break; // Doesn't currently work with multi-footprint!
        }
      }
    }*/
  }

  private makeHullPMCs(contextImgMdl: ContextImageScanModel): number[] {
    // Written this way to be easier to debug really... want a clear list off hull PMCs
    const visitedHullIdxs = new Set<number>();
    const hullPMCs: number[] = [];

    for (const hull of contextImgMdl.footprint) {
      for (const hullPt of hull) {
        // NOTE: we may have duplicated footprint hull points due to "fattening" of the hull for the context
        //       image. We don't need this effect because we're "fattening" it in 3D so we just want the PMCs!
        if (visitedHullIdxs.has(hullPt.idx)) {
          continue;
        }
        visitedHullIdxs.add(hullPt.idx);

        const footprintPMC = contextImgMdl.scanPoints[hullPt.idx].PMC;

        // Ensure we have a point stored for this
        if (this._pmcToPoint.get(footprintPMC) === undefined) {
          throw new Error(`makeHullPMCs: PMC ${footprintPMC} does not have a PMC lookup stored`);
        }

        hullPMCs.push(footprintPMC);
      }
      break; // NOTE: We only work on the first hull for now!
    }
    
    return hullPMCs;
  }

  private calculateHullPoints(scale: number) {
    if (!this._contextImgMdl) {
      return;
    }

    let hullPMCs = this.makeHullPMCs(this._contextImgMdl);

    const xyzCenter = this._bboxRawXYZ.center();

    this._hullPoints = [];
    this._hullPointNormals = [];

    // Get all the coordinates we're going to be dealing with so we can calculate normals
    let coords: THREE.Vector3[] = [];
    for (const footprintPMC of hullPMCs) {
      const idx = this._pmcToPoint.get(footprintPMC)!;
      coords.push(this._points[idx].terrainPoint);
    }

    let lastPt = coords[coords.length-1];
    let lastNormal = new THREE.Vector3().subVectors(coords[0], lastPt).normalize();
    lastNormal.cross(downDir);
    lastNormal.normalize();

    for (let c = 0; c < coords.length; c++) {
      // Find the normal of the line from this point to the next one. Using the normal from last point to this point, we can find a vertex normal
      const nextIdx = c == coords.length-1 ? 0 : c + 1;
      let normal = new THREE.Vector3().subVectors(coords[nextIdx], coords[c]).normalize();
      normal.cross(downDir);
      normal.normalize();

      let vtxNormal = new THREE.Vector3().addVectors(lastNormal, normal).normalize();
      this._hullPointNormals.push(vtxNormal);

      lastPt = coords[c];
      lastNormal = normal;
    }

    // Loop again and create the footprint coordinates, their normal, and add them to the mesh
    // expanded outwards
    for (let c = 0; c < hullPMCs.length; c++) {
      const footprintPMC = hullPMCs[c];
      const idx = this._pmcToPoint.get(footprintPMC)!;
      let rawCoord = this._points[idx].rawPoint;

      let terrainCoord = this.rawToTerrainPoint(rawCoord, xyzCenter, scale);
     //const normal = this._hullPointNormals[c];

      // Move it out
      //terrainCoord = terrainCoord.addScaledVector(normal, hullExpandDist);

      // Save it
      this._hullPoints.push(terrainCoord);
/*
      // Add a point so mesh generation takes this into account
      //const rawUV = new THREE.Vector2(this._points[idx].u, this._points[idx].v);
      const movedUV = this.calcUV(idx, [terrainCoord]);

      const pt = new PMCMeshPoint(
        terrainCoord,
        rawCoord,
        -1,
        movedUV[0].x, movedUV[0].y
      );
      this._points.push(pt);*/
    }
  }

  private calcDisplayHullPoints(terrainMesh: THREE.Mesh) {
    // The hull points we display are expanded out past the hull, and broken into short segments, and draped on the terrain!
    this._displayHullPoints = [];

    // How far we "expand" the footprint from the actual footprint points for display purposes. Context image view also does this!
    const expandSize = this._averagePointDistanceTerrain;

    // Create a mesh to show the footprint. Note we use the same footprint as the context image, but to represent it we
    // have to break it into short line segments so it follows the terrain contours
    const lastC = this._hullPoints.length-1;
    let ptLast = new THREE.Vector3(this._hullPoints[lastC].x, this._hullPoints[lastC].y, this._hullPoints[lastC].z).addScaledVector(this._hullPointNormals[lastC], expandSize);
    this._displayHullPoints.push(ptLast);
    this._displayHullNormals.push(this._hullPointNormals[lastC]);

    for (let c = 0; c < this._hullPoints.length; c++) {
      // Draw from current point to the next one
      let ptCurr = new THREE.Vector3(this._hullPoints[c].x, this._hullPoints[c].y, this._hullPoints[c].z).addScaledVector(this._hullPointNormals[c], expandSize);
      //this._displayHullPoints.push(ptCurr);

      const pts = this.makeLineSegments(ptLast, ptCurr);
      this._displayHullPoints.push(...pts);

      // Store normals for each point (these are just doubling up the hull point normals, no smoothing or anything applied)
      for (let i = 0; i < pts.length; i++) {
        this._displayHullNormals.push(this._hullPointNormals[c]);
      }

      ptLast = ptCurr;
    }

    // Lay everything onto the terrain mesh
    for (let c = 0; c < this._displayHullPoints.length; c++) {
      this._displayHullPoints[c] = this.dropOnMesh(this._displayHullPoints[c], terrainMesh);
    }
  }

  // We take the start, and return 1 or more points that form the rest of the line
  private makeLineSegments(
    ptStart: THREE.Vector3,
    ptEnd: THREE.Vector3,
  ): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
 
    const segLength = ptEnd.distanceTo(ptStart);

    // We break it up into smaller segments
    let segments = Math.ceil(segLength / (this._averagePointDistanceTerrain));
    if (segments <= 1) {
      result.push(ptEnd);
    } else {
      const segT = segLength / segments;

      const dir = new THREE.Vector3().subVectors(ptEnd, ptStart);
      //dir.setZ(0);
      dir.normalize();
      dir.multiplyScalar(segT);

      for (let c = 0; c < segments; c++) {
        let segEnd = new THREE.Vector3().addVectors(ptStart, dir);

        result.push(segEnd);
        ptStart = segEnd;
      }
    }

    return result;
  }

  private processUVs() {
    if (this._image) {
      for (const pt of this._points) {
        pt.u /= this._image!.width;
        pt.v = 1 - pt.v / this._image!.height;
      }
    }
  }

  protected calculateMeshPointPolygons(scale: number) {
    if (!this._contextImgMdl) {
      console.error("calculateMeshPointPolygons: no model available");
      return;
    }

    // We have to recalculate the voronoi polygons for each PMC first, but using xyz coordinates not ijs
    const scanPointsXYZ = [];
    for (let c = 0; c < this._scanEntries.length; c++) {
      const scanEntry = this._scanEntries[c];

      const beamXYZ = this._beamLocations[c];

      const scanPt = new ScanPoint(
        scanEntry.id,
        scanEntry.location ? new Point(beamXYZ.x, beamXYZ.y) : null,
        c,
        scanEntry.normalSpectra > 0,
        scanEntry.dwellSpectra > 0,
        scanEntry.pseudoIntensities,
        scanEntry.pseudoIntensities && scanEntry.normalSpectra == 0
      );

      scanPointsXYZ.push(scanPt);
    }

    // We have to use xyz space footprint points
    const footprintXYZ: HullPoint[] = [];
    const visitedHullIdxs = new Set<number>();

    for (const hull of this._contextImgMdl.footprint) {
      for (const hullPt of hull) {
        // NOTE: we may have duplicated footprint hull points due to "fattening" of the hull for the context
        //       image. We don't need this effect because we're "fattening" it in 3D so we just want the PMCs!
        if (visitedHullIdxs.has(hullPt.idx)) {
          continue;
        }
        visitedHullIdxs.add(hullPt.idx);

        footprintXYZ.push(new HullPoint(
          scanPointsXYZ[hullPt.idx].coord?.x || 0,
          scanPointsXYZ[hullPt.idx].coord?.y || 0,
          hullPt.idx,
          hullPt.normal
        ));
      }
      break; // NOTE: We only work on the first hull for now!
    }

    // Allocate blank polygons for each...
    const scanPointXYZPolygons: ScanPointPolygon[] = [];
    for (let c = 0; c < this._scanEntries.length; c++) {
      scanPointXYZPolygons.push(new ScanPointPolygon([]));
    }

    for (const cluster of this._contextImgMdl.clusters) {
      const clusterCopy = new PointCluster(
        Array.from(cluster.locIdxs),
        this._averagePointDistanceRaw,
        footprintXYZ,
        cluster.angleRadiansToContextImage,
      );

      clusterCopy.footprintPoints = ContextImageScanModelGenerator.fattenFootprint(
        clusterCopy.footprintPoints,
        clusterCopy.pointDistance / 2,
        clusterCopy.angleRadiansToContextImage
      );

      ContextImageScanModelGenerator.makeScanPointPolygons(50, clusterCopy, scanPointsXYZ, scanPointXYZPolygons);
      //wholeFootprintHullPoints.push(cluster.footprintPoints);
    }

    this._pmcPolygons = [];

    const xyzCenter = this._bboxRawXYZ.center();

    for (let polyIdx = 0; polyIdx < scanPointXYZPolygons.length; polyIdx++){
      const poly = scanPointXYZPolygons[polyIdx];

      const terrainVtxs = [];
      const rawVtxs = [];
      const u = [];
      const v = [];

      // Set the first point to be the PMC location itself
      if (poly.points.length > 0) {
        const pmcPtIdx = this._pmcToPoint.get(this._scanEntries[polyIdx].id);
        if (pmcPtIdx === undefined || pmcPtIdx < 0) {
          throw new Error("calculateMeshPointPolygons: Failed to look up PMC location for scan index: " + polyIdx)
        }
        terrainVtxs.push(this._points[pmcPtIdx].terrainPoint);
        u.push(this._points[pmcPtIdx].u);
        v.push(this._points[pmcPtIdx].v);

        // Eg PMC is at 65% of the terrain width
        // One of its polygon points is at 64% of the terrain
        // PMC happens to have a U coordinate of 0.4
        // To calculate U for the polygon point consider 0.4 = 65% of the terrain width

        for (const pt of poly.points) {
          const vtx = new THREE.Vector3(pt.x, pt.y, xyzCenter.z);
          rawVtxs.push(vtx);
          const terrainVtx = this.rawToTerrainPoint(vtx, xyzCenter, scale);
          terrainVtxs.push(terrainVtx);
        }

        const uvs = this.calcUVAroundPMC(pmcPtIdx, terrainVtxs.slice(1));
        for(const uv of uvs) {
          u.push(uv.x);
          v.push(uv.y);
        }
      }

      const newPoly = new PMCPoly(polyIdx, terrainVtxs, rawVtxs, u, v);
      this._pmcPolygons.push(newPoly);
    }
  }

  private calcUVAroundPMC(pmcPtIdx: number, calculatedTerrainPoints: THREE.Vector3[]): THREE.Vector2[] {
    const pmcTerrainPct = new Point(
      (this._points[pmcPtIdx].terrainPoint.x - this._bboxMeshAll.minCorner.x) / this._bboxMeshAll.sizeX(),
      (this._points[pmcPtIdx].terrainPoint.y - this._bboxMeshAll.minCorner.y) / this._bboxMeshAll.sizeY()
    );

    const result: THREE.Vector2[] = [];
    for (const terrainVtx of calculatedTerrainPoints) {
      const pctX = ((terrainVtx.x - this._bboxMeshAll.minCorner.x) / this._bboxMeshAll.sizeX());
      const pctY = ((terrainVtx.y - this._bboxMeshAll.minCorner.y) / this._bboxMeshAll.sizeY());

      result.push(new THREE.Vector2(
        pctX / pmcTerrainPct.x * this._points[pmcPtIdx].u,
        pctY / pmcTerrainPct.y * this._points[pmcPtIdx].v
      ));
    }

    return result;
  }

  private updateMeshPointPolygonZs(terrainMesh: THREE.Mesh, heightOffset: number) {
    // Construct x,y,z array while finding the y value
    for (const poly of this._pmcPolygons) {
      if (poly.terrainPoints.length <= 0) {
        continue;
      }

      // NOTE: we loop from 1 because point 0 is the PMC original location so should be set already
      for (let c = 1; c < poly.terrainPoints.length; c++) {
        poly.terrainPoints[c] = this.dropOnMesh(poly.terrainPoints[c], terrainMesh);
        //poly.terrainPoints[c].z += heightOffset;
      }
    }
  }

  private calculateTriangleIndexes(geom: GeometryAttributes): Uint32Array {
    // We need just 2 dimensions, top-down view of the points. Then we substitute our 3d coordinates for each point
    // NOTE: we're expecting the three buffer geometry position attribute with y = up, where we ignore y
    const xy: number[] = [];
    for (let c = 2; c < geom.xyz.length; c += 3) {
      xy.push(geom.xyz[c-2]);
      xy.push(geom.xyz[c-1]);
    }

    const delaunay = new Delaunator(xy);

    // Now associate them back to PMC, hence the xyz, location and form 3D triangles using these indexes
    if (delaunay.triangles.length % 3 != 0) {
      throw new Error("Expected delaunay to deliver a multiple of 3 indexes");
    }

    return delaunay.triangles;
  }

  private removePMCPolyTriangles(idxs: Uint32Array, geom: GeometryAttributes): Uint32Array {
    if (!geom.pointScanEntryIdx) {
      throw new Error("removePMCPolyTriangles called without pointScanEntryIdx array filled");
    }
    
    const outIdxs: number[] = [];

    let pmcSpanningTriangles = new Map<number, Map<number, number[][]>>();
    let scanEntryIdxList = new Set<number>();

    for (let triIdx = 2; triIdx < idxs.length; triIdx += 3) {
      let spanningPMCs = false;
      scanEntryIdxList.clear();

      // Check each point, see if it touches a real PMC
      let pmcCount = 0;
      for (let c = 0; c < 3; c++) {
        let i = triIdx - c;
        const scanEntryIdx = geom.pointScanEntryIdx[idxs[i]];
        if (scanEntryIdx >= 0) {
          pmcCount++;
          scanEntryIdxList.add(scanEntryIdx);
        }

        if (pmcCount > 1) {
          spanningPMCs = true;

          const scanEntryIdxs = Array.from(scanEntryIdxList.values()).sort((a, b) => a - b);
          // Store with lower PMC number so they find each other
          if (!pmcSpanningTriangles.has(scanEntryIdxs[0])) {
            pmcSpanningTriangles.set(scanEntryIdxs[0], new Map<number, []>());
          }
          let trisForOtherPMC = pmcSpanningTriangles.get(scanEntryIdxs[0]);

          if (!trisForOtherPMC!.has(scanEntryIdxs[1])) {
            trisForOtherPMC!.set(scanEntryIdxs[1], []);
          }

          let existingTris = trisForOtherPMC!.get(scanEntryIdxs[1]);

          let newTri = [];
          for (let c = 0; c < 3; c++) {
            let i = triIdx - c;
            newTri.push(idxs[i]);
          }

          existingTris!.push(newTri);
          break;
        }
      }

      if (!spanningPMCs) {
        // The simple case, just a triangle to add...
        outIdxs.push(idxs[triIdx-2]);
        outIdxs.push(idxs[triIdx-1]);
        outIdxs.push(idxs[triIdx]);
      }
      // Else case will be handled through processing pmcSpanningTriangles...
    }

    // Break the spanning triangles in another way so they don't span between PMCs!
    for (let [scanEntryIdx, otherEntries] of pmcSpanningTriangles.entries()) {
      for (let [otherPMC, otherPMCTris] of otherEntries.entries()) {
        // The span is expected to have a pair of triangles only
        if (otherPMCTris.length != 2) {
          console.log(`Skipping pmc-spanning triangles with more than 2 for scanEntryIdx ${scanEntryIdx}, ${otherPMC}, had ${otherPMCTris.length} triangles`);

          // Add them in reverse order to help us see them
          for (let tri of otherPMCTris) {
            outIdxs.push(tri[0]);
            outIdxs.push(tri[1]);
            outIdxs.push(tri[2]);
          }
          continue;
        }

        outIdxs.push(...this.breakPMCSpanningTriangles(otherPMCTris));
      }
    }
    return new Uint32Array(outIdxs);
  }

  // Expects 2 arrays of 3 numbers (2 triangles)
  private breakPMCSpanningTriangles(tris: number[][]): number[] {
    let result: number[] = [];

    // Find duplicate indexes
    let duplicates = [];
    for (let c = 0; c < 3; c++) {
      if (tris[1].indexOf(tris[0][c]) > -1) {
        duplicates.push(tris[0][c]);
      }
    }

    // Rotate each set of indexes so we have the outliers first
    for (let tri = 0; tri < 2; tri++) {
      for (let c = 0; c < 3; c++) {
        if (duplicates.indexOf(tris[tri][0]) == -1) {
          break;
        }

        tris[tri] = [tris[tri][2], tris[tri][0], tris[tri][1]];
      }
    }

    // Now we have the following diagram
    //    B
    // A     C
    //    D
    // And triangles:
    // B, C, A
    // D, A, C

    // We want to swap the 2 triangles around so we end up with:
    // B, D, A
    // D, B, C

    // But add them in reverse order ???
    result.push(tris[0][0]); // B
    result.push(tris[0][2]); // A
    result.push(tris[1][0]); // D

    result.push(tris[1][0]); // D
    result.push(tris[1][2]); // C
    result.push(tris[0][0]); // B

    return result;
  }

  private createPositionArray(includePMCs: boolean, includeNonPMCs: boolean): GeometryAttributes {
    const xyz = new Float32Array(this._points.length * 3);
    const uv = new Float32Array(this._points.length * 2);

    let posIdx = 0;
    let uvIdx = 0;

    for (let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (!includePMCs && pt.scanEntryIndex >= 0) {
        // This is a PMC, but we're asked to skip those
        continue;
      }
      if (!includeNonPMCs && pt.scanEntryIndex < 0) {
        // This is NOT a PMC, but we're asked to skip those
        continue;
      }

      xyz[posIdx] = pt.terrainPoint.x;
      xyz[posIdx+1] = pt.terrainPoint.y;
      xyz[posIdx+2] = pt.terrainPoint.z;
      posIdx += 3;

      uv[uvIdx] = this._points[c].u;
      uv[uvIdx+1] = this._points[c].v;
      uvIdx += 2;
    }

    return new GeometryAttributes(xyz, uv);
  }

  private createPositionPolysArray(
    includePMCPolys: boolean,
    includeSupportPoints: boolean,
    colourOnlyPMC: boolean,
    scanEntryColours: (THREE.Color | undefined)[]
  ): GeometryAttributes {
    let count = 0;
    if (includePMCPolys) {
      for (const poly of this._pmcPolygons) {
        count += poly.terrainPoints.length;
      }
    }

    if (includeSupportPoints) {
      for (const pt of this._points) {
        if (pt.scanEntryIndex < 0) {
          count++;
        }
      }
    }

    const scanEntryIdxs = new Int32Array(count);
    const xyz = new Float32Array(count * 3);
    const uv = new Float32Array(count * 3);
    let colours: Float32Array | undefined;
    if (scanEntryColours.length > 0) {
      // Yes we are setting colours!
      colours = new Float32Array(count * 3);
    }

    let posIdx = 0;
    let clrIdx = 0;
    let uvIdx = 0;
    let idxIdx = 0;

    if (includePMCPolys) {
      for (const poly of this._pmcPolygons) {
        for (let c = 0; c < poly.terrainPoints.length; c++) {
          const pt = poly.terrainPoints[c];
          xyz[posIdx] = pt.x;
          xyz[posIdx+1] = pt.y;
          xyz[posIdx+2] = pt.z;
          posIdx += 3;

          uv[uvIdx] = poly.u[c];
          uv[uvIdx+1] = poly.v[c];
          uvIdx += 2;

          // The index that's directly the PMC's own coordinates is negative, while points on the perimiter
          // are positive, points not with PMC are infinity
          // This way we can check for >= 0 to see if the point is assoicated directly with the PMC
          //scanEntryIdxs[idxIdx] = c > 0 ? poly.scanEntryIndex : -poly.scanEntryIndex;
          scanEntryIdxs[idxIdx] = c == 0 ? poly.scanEntryIndex : -1;
          //scanEntryIdxs[idxIdx] = poly.scanEntryIndex;
          idxIdx++;

          if (colours) {
            if (c == 0 || !colourOnlyPMC) {
              const clr = scanEntryColours[poly.scanEntryIndex];
              colours[clrIdx] = clr?.r || 1;
              colours[clrIdx + 1] = clr?.g || 1;
              colours[clrIdx + 2] = clr?.b || 1;
              clrIdx += 3;
            } else {
              // Apply white
              colours[clrIdx] = 1;
              colours[clrIdx + 1] = 1;
              colours[clrIdx + 2] = 1;
              clrIdx += 3;
            }
          }
        }
      }
    }

    if (includeSupportPoints) {
      // Also add the "support points" for displaying the whole MCC
      for (const pt of this._points) {
        if (pt.scanEntryIndex < 0) {
          xyz[posIdx] = pt.terrainPoint.x;
          xyz[posIdx+1] = pt.terrainPoint.y;
          xyz[posIdx+2] = pt.terrainPoint.z;
          posIdx += 3;

          uv[uvIdx] = pt.u;
          uv[uvIdx+1] = pt.v;
          uvIdx += 2;

          scanEntryIdxs[idxIdx] = -1;
          idxIdx++;


          if (colours) {
            // Apply white
            colours[clrIdx] = 1;
            colours[clrIdx + 1] = 1;
            colours[clrIdx + 2] = 1;
            clrIdx += 3;
          }
        }
      }
    }

    return new GeometryAttributes(xyz, uv, scanEntryIdxs, colours);
  }

  private createMeshGeometry(geomAttributes: GeometryAttributes, indexes: Uint32Array, hasImage: boolean): THREE.BufferGeometry {
    const terrainGeom = new THREE.BufferGeometry();
    terrainGeom.setAttribute("position", new THREE.BufferAttribute(geomAttributes.xyz, 3));
    // terrainGeom.setAttribute(
    //     'normal',
    //     new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));

    if (hasImage) {
      terrainGeom.setAttribute('uv', new THREE.BufferAttribute(geomAttributes.uv, 2));
    }

    if (geomAttributes.colours) {
      terrainGeom.setAttribute("color", new THREE.BufferAttribute(geomAttributes.colours, 3));
    }

    // Reverse triangle handedness
    for (let c = 0; c < indexes.length; c += 3) {
      const tmp = indexes[c];
      indexes[c] = indexes[c+2];
      indexes[c+2] = tmp;
    }

    terrainGeom.setIndex(new THREE.BufferAttribute(indexes, 1));
    terrainGeom.computeVertexNormals();

    return terrainGeom;
  }
}
