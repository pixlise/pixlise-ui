import * as THREE from 'three';
import { AxisAlignedBBox } from 'src/app/models/Geometry3D';
import Delaunator from "delaunator";
import { Point } from 'src/app/models/Geometry';
import { Observable } from 'rxjs';
import { ContextImageScanModel, PointCluster } from '../context-image/context-image-model-internals';
import { ScanEntry } from 'src/app/generated-protos/scan-entry';
import { Coordinate3D } from 'src/app/generated-protos/scan-beam-location';
import { ContextImageScanModelGenerator } from '../context-image/context-image-scan-model-generator';
import { ScanPoint } from '../../models/scan-point';
import { HullPoint } from '../../models/footprint';
import { r } from 'node_modules/@angular/cdk/overlay-module.d-BvvR6Y05';
import { E } from 'node_modules/@angular/material/error-options.d-CGdTZUYk';
import { C } from 'node_modules/@angular/cdk/portal-directives.d-DbeNrI5D';


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

class GeometryAttributes {
  constructor(public xyz: Float32Array, public uv: Float32Array, public pointScanEntryIdx?: Int32Array) {}
}

export class PMCMeshData {
  private _bboxRawXYZ = new AxisAlignedBBox();
  private _bboxRawUV = new AxisAlignedBBox();
  private _bboxMCC = new AxisAlignedBBox();
  private _bboxMeshPMCs = new AxisAlignedBBox();
  private _bboxMeshAll = new AxisAlignedBBox();
  private _points: PMCMeshPoint[] = [];
  private _pmcToPoint: Map<number, number> = new Map<number, number>();
  private _rawCornerPoints: THREE.Vector3[] = [];
  private _rawCornerUVs: THREE.Vector2[] = [];
  private _hullPoints: THREE.Vector3[] = [];
  private _averagePointDistanceRaw: number = 0;
  private _averagePointDistanceTerrain: number = 0;

  private _simpleTerrainMesh?: THREE.Mesh;

  private _pmcPolygons: PMCPoly[] = [];

  constructor(
    private _scanEntries: ScanEntry[],
    private _beamLocations: Coordinate3D[],
    private _contextImgMdl?: ContextImageScanModel,
    private _image?: HTMLImageElement)
  {
    this.createRawBBoxes(this._scanEntries, this._beamLocations, this._contextImgMdl);
    if (this._image) {
      this.calculateImageBBox(this._image.width, this._image.height);
    }

    let scale = this.calculateDisplayScaleFactor(this._image ? this._bboxMCC : this._bboxRawXYZ);
    this.calculateScanRelatedPoints(scale, this._scanEntries, this._beamLocations, this._contextImgMdl);
    this.calculateAveragePointDistance();
    this.makePMCMap();

    if (this._image) {
      this.calculateSupportPoints(scale, this._image.width, this._image.height/*, this._scanEntries, this._beamLocations*/);
    }

    this.calculateHullPoints(scale);

    this.processUVs();

    this.calculateMeshPointPolygons(scale);

    // Calculate terrain mesh for internal use that includes PMC locations (xyz) and image corners
    let geom = this.createPositionArray(false);
    const idxs = this.calculateTriangleIndexes(geom);
    const meshGeom = this.createMeshGeometry(geom, idxs, !!this._image);
    this._simpleTerrainMesh = new THREE.Mesh(meshGeom);
    this.updateMeshPointPolygonZs(this._simpleTerrainMesh);
  }

  get points(): PMCMeshPoint[] {
    return this._points;
  }

  get maxWorldMeshSize(): number {
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

  createMesh(material: THREE.Material, usePMCPolys: boolean): THREE.Mesh {
    if (!this._simpleTerrainMesh) {
      throw new Error("createMesh called when internals not yet calculated");
    }

    if (!usePMCPolys) {
      // Use the already-created "simple" mesh
      this._simpleTerrainMesh!.material = material;
      return this._simpleTerrainMesh;
    }

    // Calculate a mesh that includes PMC locations (xyz), surrounding polygons and image corners
    let geom = this.createPositionPolysArray();
    let idxs = this.calculateTriangleIndexes(geom);

    idxs = this.removePMCPolyTriangles(idxs, geom);
    const meshGeom = this.createMeshGeometry(geom, idxs, !!this._image);

    return new THREE.Mesh(meshGeom, material);
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
        console.error("createPointPolygons: No colour for scan index: " + poly.scanEntryIndex)
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
/*
      const wireframe = new THREE.WireframeGeometry(polyGeom);

      const line = new THREE.LineSegments( wireframe );
      // line.material.depthTest = false;
      // line.material.opacity = 0.25;
      // line.material.transparent = true;

      result.add(line);
*/
      result.add(polyMesh);

      //break;
    }

    return result;
  }

  createPoints(material: THREE.Material): THREE.Points {
    const geom = this.createPositionArray(true);

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

  createFootprint(radius: number, material: THREE.Material): THREE.Mesh | undefined {
    if (this._hullPoints.length <= 0) {
      return undefined;
    }

    // Create a mesh to show the footprint
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    for (let c = 1; c < this._hullPoints.length; c++) {
      curvePath.add(new THREE.LineCurve3(this._hullPoints[c-1], this._hullPoints[c]));
    }
    // Add the last one
    if (this._hullPoints.length > 1) {
      curvePath.add(new THREE.LineCurve3(this._hullPoints[this._hullPoints.length-1], this._hullPoints[0]));
    }

    const geom = new THREE.TubeGeometry(curvePath, 500, radius, 8, false);
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

    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, material);
    return mesh;
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

  private createRawBBoxes(
    scanEntries: ScanEntry[],
    beamLocations: Coordinate3D[],
    contextImgMdl?: ContextImageScanModel
  ) {
    // Find the physical PMCs bounding box first
    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];
      if(scanEntry.location && scanEntry.normalSpectra) {
        this._bboxRawXYZ.expandToFit(new THREE.Vector3(beamLocations[c].x, beamLocations[c].y, beamLocations[c].z));
        if (contextImgMdl && contextImgMdl.scanPoints[c] && contextImgMdl.scanPoints[c].coord) {
          this._bboxRawUV.expandToFit(new THREE.Vector3(contextImgMdl.scanPoints[c].coord!.x, 0, contextImgMdl.scanPoints[c].coord!.y));
        }
      }
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
    const maxSize = this.maxWorldMeshSize;

    // Work out a scale factor - if we have the image bbox use that as extents otherwise just the xyzs
    let scale = 1;

    if (wholeScanBBox.sizeX() > wholeScanBBox.sizeY()) {
      scale = maxSize / wholeScanBBox.sizeX();
    } else {
      scale = maxSize / wholeScanBBox.sizeY();
    }

    return scale;
  }

  // Create the point centered at 0,0,0 and scaled to what we want
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
      if (pt.scanEntryIndex >= 0 && this._scanEntries[pt.scanEntryIndex].normalSpectra || this._scanEntries[pt.scanEntryIndex].pseudoIntensities) {
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

  private calculateSupportPoints(
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

    const hullPMCs = this.makeHullPMCs(this._contextImgMdl);
    const xyzCenter = this._bboxRawXYZ.center();

    this._hullPoints = [];
    for (const footprintPMC of hullPMCs) {
      const idx = this._pmcToPoint.get(footprintPMC);
      if (idx !== undefined) {
        let rawCoord = this._points[idx].rawPoint;
        
        // Move this point out towards a corner point - find the nearest one then use that vector
        let nearestCorner = this.findNearestPoint(rawCoord, this._rawCornerPoints);
        if (nearestCorner[0] < 0) {
          console.error("Failed to find nearest corner point for hull PMC " + footprintPMC);
          continue;
        }

        const expandScale = 0.03;
        rawCoord.lerp(this._rawCornerPoints[nearestCorner[0]], expandScale);

        let rawUV = new THREE.Vector2(this._points[idx].u, this._points[idx].v);
        rawUV.lerp(this._rawCornerUVs[nearestCorner[0]], expandScale);

        const terrainCoord = this.rawToTerrainPoint(rawCoord, xyzCenter, scale); //this._points[idx].terrainPoint;
        this._hullPoints.push(terrainCoord);

        const pt = new PMCMeshPoint(
          terrainCoord,
          rawCoord,
          -1,
          rawUV.x, rawUV.y
        );
        this._points.push(pt);
      }
    }
  }

  // Returns the index, and the distance
  private findNearestPoint(pt: THREE.Vector3, ptList: THREE.Vector3[]): number[] {
    let dist = Infinity;
    let idx = -1;
    for (let c = 0; c < ptList.length; c++) {
      const len = pt.distanceTo(ptList[c]);
      if (len < dist) {
        dist = len;
        idx = c;
      }
    }

    return [idx, dist];
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
    const scanPointXYZPolygons: Point[][] = [];
    for (let c = 0; c < this._scanEntries.length; c++) {
      scanPointXYZPolygons.push([]);
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
      if (poly.length > 0) {
        const pmcPtIdx = this._pmcToPoint.get(this._scanEntries[polyIdx].id);
        if (pmcPtIdx === undefined || pmcPtIdx < 0) {
          throw new Error("calculateMeshPointPolygons: Failed to look up PMC location for scan index: " + polyIdx)
        }
        terrainVtxs.push(this._points[pmcPtIdx].terrainPoint);
        u.push(this._points[pmcPtIdx].u);
        v.push(this._points[pmcPtIdx].v);

        // const pmcTerrainPct = new Point(
        //   (this._points[pmcPtIdx].terrainPoint.x - this._bboxMeshAll.minCorner.x) / this._bboxMeshAll.sizeX(),
        //   (this._points[pmcPtIdx].terrainPoint.z - this._bboxMeshAll.minCorner.z) / this._bboxMeshAll.sizeZ()
        // );

        for (const pt of poly) {
          const vtx = new THREE.Vector3(pt.x, pt.y, xyzCenter.z);
          rawVtxs.push(vtx);
          const terrainVtx = this.rawToTerrainPoint(vtx, xyzCenter, scale);
          terrainVtxs.push(terrainVtx);

          let pct = ((terrainVtx.x - this._bboxMeshAll.minCorner.x) / this._bboxMeshAll.sizeX());// / pmcTerrainPct.x
          u.push(this._points[pmcPtIdx].u * pct);

          pct = ((terrainVtx.y - this._bboxMeshAll.minCorner.y) / this._bboxMeshAll.sizeY());// / pmcTerrainPct.y;
          v.push(this._points[pmcPtIdx].v * pct);
        }
      }

      const newPoly = new PMCPoly(polyIdx, terrainVtxs, rawVtxs, u, v);
      this._pmcPolygons.push(newPoly);
    }
  }

  private updateMeshPointPolygonZs(terrainMesh: THREE.Mesh) {
    // Construct x,y,z array while finding the y value
    const rayCaster = new THREE.Raycaster();
    const rayDir = new THREE.Vector3(0,0,-1);

    for (const poly of this._pmcPolygons) {
      if (poly.terrainPoints.length <= 0) {
        continue;
      }

      // NOTE: we loop from 1 because point 0 is the PMC original location so should be set already
      for (let c = 1; c < poly.terrainPoints.length; c++) {
        rayCaster.set(
          new THREE.Vector3(poly.terrainPoints[c].x, poly.terrainPoints[c].y, this._bboxMeshPMCs.maxCorner.z),
          rayDir
        );

        const intersects = rayCaster.intersectObject(terrainMesh);
        if (intersects.length > 0) {
          poly.terrainPoints[c].z = intersects[0].point.z;
        }
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

  /*
    // If this triangle is associated with a pre-existing PMC polygon, remove it

    for (let triIdx = 2; triIdx < idxs.length; triIdx += 3) {
      // If any of the indexes in this triangle refer to a PMC polygon related point, we don't include it
      if (geom.pointScanEntryIdx[idxs[triIdx-2]] < 0 ||
          geom.pointScanEntryIdx[idxs[triIdx-1]] < 0 ||
          geom.pointScanEntryIdx[idxs[triIdx]] < 0
      ) {
        continue;
      }

      outIdxs.push(idxs[triIdx-2]);
      outIdxs.push(idxs[triIdx-1]);
      outIdxs.push(idxs[triIdx]);
    }
*/
    // Remove any triangles that extend between 2 PMCs
/*
    for (let triIdx = 2; triIdx < idxs.length; triIdx += 3) {
      // If any of the indexes in this triangle refer to a PMC polygon related point, we don't include it
      let pmcCount = 0;
      let hasDifferingPMC = false;
      let lastIdx = Infinity;
      let skip = false;
      for (let c = -2; c < 0; c++) {
        let i = triIdx + c;
        const scanEntryIdx = geom.pointScanEntryIdx[idxs[i]];
        if (scanEntryIdx == 6) {
          skip = true;
          break;
        }
        // If we have a PMC on a corner, and we've already seen another PMC on a corner...
        // if (scanEntryIdx < 0 && lastIdx != Infinity && lastIdx != scanEntryIdx) {
        //   hasDifferingPMC = true;
        //   break;
        // }

        // // Save if negative!
        // if (scanEntryIdx < 0) {
        //   lastIdx = scanEntryIdx;
        // }
        // pmcCount += (scanEntryIdx < 0 ? 1 : 0);
      }

      if (!skip) { //(!hasDifferingPMC) { //pmcCount < 2) {
        outIdxs.push(idxs[triIdx-2]);
        outIdxs.push(idxs[triIdx-1]);
        outIdxs.push(idxs[triIdx]);
      } else if (pmcCount == 2) {
        // We span 2 PMCs, split down the middle
      } else {

      }
    }
*/
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

  private createPositionArray(onlyPMCs: boolean): GeometryAttributes {
    const xyz = new Float32Array(this._points.length * 3);
    const uv = new Float32Array(this._points.length * 2);

    let posIdx = 0;
    let uvIdx = 0;

    for (let c = 0; c < this._points.length; c++) {
      const pt = this._points[c];
      if (onlyPMCs && pt.scanEntryIndex < 0) {
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

  private createPositionPolysArray(): GeometryAttributes {
    let count = 0;
    for (const poly of this._pmcPolygons) {
      count += poly.terrainPoints.length;
    }
    for (const pt of this._points) {
      if (pt.scanEntryIndex < 0) {
        count++;
      }
    }

    const xyz = new Float32Array(count * 3);
    const uv = new Float32Array(count * 3);
    const scanEntryIdxs = new Int32Array(count);

    let posIdx = 0;
    let uvIdx = 0;
    let idxIdx = 0;
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
      }
    }

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
      }
    }

    return new GeometryAttributes(xyz, uv, scanEntryIdxs);
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
