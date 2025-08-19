import * as THREE from 'three';
import { AxisAlignedBBox } from 'src/app/models/Geometry3D';
import Delaunator from "delaunator";
import { Point } from 'src/app/models/Geometry';
import { Observable } from 'rxjs';
import { ContextImageScanModel } from '../context-image/context-image-model-internals';
import { ScanEntry } from 'src/app/generated-protos/scan-entry';
import { Coordinate3D } from 'src/app/generated-protos/scan-beam-location';


export class PMCMeshPoint {
  constructor(
    public terrainPoint: THREE.Vector3, // PMC locations (x,y,z as viewed in scene)
    public rawPoint: THREE.Vector3, // PMC locations in raw x,y,z units
    public scanEntryIndex: number, // "location index" - where in the scan entry array does this come from? (-1 if not real PMC)
    public u: number, // Texture u coordinate
    public v: number, // Texture v coordinate
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

export class PMCMeshData {
  private _bboxRawXYZ = new AxisAlignedBBox();
  private _bboxRawUV = new AxisAlignedBBox();
  private _bboxMCC = new AxisAlignedBBox();
  private _bboxMesh = new AxisAlignedBBox();
  private _points: PMCMeshPoint[] = [];
  private _pmcToPoint: Map<number, number> = new Map<number, number>();
  private _rawCornerPoints: THREE.Vector3[] = [];
  private _hullPoints: THREE.Vector3[] = [];

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

    let scale = this.calculateDisplayScaleFactor(!!this._image)
    this.calculateScanRelatedPoints(scale, this._scanEntries, this._beamLocations, this._contextImgMdl);
    this.makePMCMap();

    if (this._image) {
      this.calculateSupportPoints(scale, this._image.width, this._image.height/*, this._scanEntries, this._beamLocations*/);
    }

    this.calculateHullPoints(scale);

    this.processUVs();
  }

  get points(): PMCMeshPoint[] {
    return this._points;
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

  createMesh(texture?: THREE.Texture): THREE.Mesh {
    const idxs = this.calculateTriangleIndexes();
    const meshGeom = this.createMeshGeometry(idxs, !!this._image);
    
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
    if (texture) {
      mat.map = texture;
    }

    return new THREE.Mesh(meshGeom, mat);
  }

  createPoints(material: THREE.PointsMaterial): THREE.Points {
    const xyz = this.createPositionArray();

    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(xyz, 3));

    const points = new THREE.Points(
      pointsGeom,
      material,
    );

    points.position.y += 0.002;
    return points;
  }

  createFootprint(radius: number, mat: THREE.MeshBasicMaterial): THREE.Mesh | undefined {
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

    const geom = new THREE.TubeGeometry(curvePath, 100, radius, 100, false);
    const mesh = new THREE.Mesh(geom, mat);
    return mesh;
  }

  get bboxMesh(): AxisAlignedBBox {
    return this._bboxMesh;
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

  private calculateDisplayScaleFactor(useMCCBBox: boolean) {
    // We want our display coordinates to fit into a known bounding box, make the max width or height a known size:
    const maxSize = 100;

    // Work out a scale factor - if we have the image bbox use that as extents otherwise just the xyzs
    let scale = 1;
    let useBox = useMCCBBox ? this._bboxMCC : this._bboxRawXYZ;

    if (useBox.sizeX() > useBox.sizeZ()) {
      scale = maxSize / useBox.sizeX();
    } else {
      scale = maxSize / useBox.sizeZ();
    }

    return scale;
  }

  // Create the point centered at 0,0,0 and scaled to what we want
  private rawToTerrainPoint(pt: THREE.Vector3Like, ptDataCenter: THREE.Vector3, scale: number): THREE.Vector3 {
    return new THREE.Vector3(
      (pt.x - ptDataCenter.x) * scale,
      (pt.z - ptDataCenter.z) * scale,
      (pt.y - ptDataCenter.y) * scale
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

        this._bboxMesh.expandToFit(terrainPt);

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

  private calculateSupportPoints(
    scale: number,
    imageWidth: number,
    imageHeight: number
  ) {
    const dataCenter = this._bboxMCC.center();

    // We assume this is set correctly...
    this._rawCornerPoints = [
      new THREE.Vector3(this._bboxMCC.minCorner.x, this._bboxMCC.minCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.maxCorner.x, this._bboxMCC.minCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.maxCorner.x, this._bboxMCC.maxCorner.y, dataCenter.z),
      new THREE.Vector3(this._bboxMCC.minCorner.x, this._bboxMCC.maxCorner.y, dataCenter.z),
    ];

    let uvs: Point[] = [
      new Point(imageWidth, imageHeight),
      new Point(0,imageHeight),
      new Point(0, 0),
      new Point(imageWidth, 0)
    ];

    for (let c = 0; c < this._rawCornerPoints.length; c++) {
      const coord = this._rawCornerPoints[c];
      this._points.push(new PMCMeshPoint(
        this.rawToTerrainPoint(coord, dataCenter, scale),
        coord,
        -1,
        uvs[c].x,
        uvs[c].y
      ))
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

  private calculateHullPoints(scale: number) {
    if (!this._contextImgMdl) {
      return;
    }

    const dataCenter = this._bboxMCC.center();

    this._hullPoints = [];
    for (const hull of this._contextImgMdl.footprint) {
      for (const hullPt of hull) {
        const footprintPMC = this._contextImgMdl.scanPoints[hullPt.idx].PMC;

        const idx = this._pmcToPoint.get(footprintPMC);
        if (idx !== undefined) {
          let rawCoord = this._points[idx].rawPoint;
          
          // Move this point out towards a corner point - find the nearest one then use that vector
          let nearestCorner = this.findNearestPoint(rawCoord, this._rawCornerPoints);
          if (nearestCorner[0] < 0) {
            console.error("Failed to find nearest corner point for hull PMC " + footprintPMC);
            continue;
          }

          rawCoord.lerp(this._rawCornerPoints[nearestCorner[0]], 0.2);

          const terrainCoord = this.rawToTerrainPoint(rawCoord, dataCenter, scale); //this._points[idx].terrainPoint;
          this._hullPoints.push(terrainCoord);

          // Also add them to the points array like we do for other support points
          this._points.push(new PMCMeshPoint(
            terrainCoord,
            rawCoord,
            -1,
            0.5,
            0.5
          ));

          // if (this._hullPoints.length > 1) {
          //   return;
          // }
        }
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

  private calculateTriangleIndexes(): Uint32Array {
    // We need just 2 dimensions, top-down view of the points. Then we substitute our 3d coordinates for each point
    const xy: number[] = [];
    for (const pt of this._points) {
      xy.push(pt.terrainPoint.x);
      xy.push(pt.terrainPoint.z);
    }

    const delaunay = new Delaunator(xy);

    // Now associate them back to PMC, hence the xyz, location and form 3D triangles using these indexes
    if (delaunay.triangles.length % 3 != 0) {
      throw new Error("Expected delaunay to deliver a multiple of 3 indexes");
    }

    return delaunay.triangles;
  }

  private createPositionArray(): Float32Array {
    const xyz = new Float32Array(this._points.length * 3);
    let uv: Float32Array | undefined;

    let c3 = 0;
    for (let c = 0; c < this._points.length; c++) {
      xyz[c3] = this._points[c].terrainPoint.x;
      xyz[c3+1] = this._points[c].terrainPoint.y;
      xyz[c3+2] = this._points[c].terrainPoint.z;
      c3 += 3;
    }

    return xyz;
  }

  private createMeshGeometry(indexes: Uint32Array, hasImage: boolean): THREE.BufferGeometry {
    const xyz = this.createPositionArray();

    const terrainGeom = new THREE.BufferGeometry();
    terrainGeom.setAttribute("position", new THREE.BufferAttribute(xyz, 3));
    // terrainGeom.setAttribute(
    //     'normal',
    //     new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));

    if (hasImage) {
      let uv: Float32Array = new Float32Array(this._points.length * 2);

      let c2 = 0;
      for (let c = 0; c < this._points.length; c++) {
        uv[c2] = this._points[c].u;
        uv[c2+1] = this._points[c].v;
        c2 += 2;
      }

      terrainGeom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }

    terrainGeom.setIndex(new THREE.BufferAttribute(indexes, 1));
    terrainGeom.computeVertexNormals();

    return terrainGeom;
  }
}
