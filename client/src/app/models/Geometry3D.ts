import * as THREE from 'three';
import { Coordinate3D } from '../generated-protos/scan-beam-location';
import { Coordinate4D } from '../generated-protos/widget-data';

export class AxisAlignedBBox {
  constructor(public minCorner: THREE.Vector3 = new THREE.Vector3(Infinity, Infinity, Infinity), public maxCorner: THREE.Vector3 = new THREE.Vector3(-Infinity, -Infinity, -Infinity)) {
  }

  public copy(): AxisAlignedBBox {
    return new AxisAlignedBBox(new THREE.Vector3().copy(this.minCorner), new THREE.Vector3().copy(this.maxCorner));
  }

  public center(): THREE.Vector3 {
    return new THREE.Vector3(
      (this.maxCorner.x+this.minCorner.x) / 2,
      (this.maxCorner.y+this.minCorner.y) / 2,
      (this.maxCorner.z+this.minCorner.z) / 2
    );
  }

  public expandToFit(pt: THREE.Vector3): void {
    if (pt.x > this.maxCorner.x) {
      this.maxCorner.x = pt.x;
    }
    if (pt.y > this.maxCorner.y) {
      this.maxCorner.y = pt.y;
    }
    if (pt.z > this.maxCorner.z) {
      this.maxCorner.z = pt.z;
    }
    if (pt.x < this.minCorner.x) {
      this.minCorner.x = pt.x;
    }
    if (pt.y < this.minCorner.y) {
      this.minCorner.y = pt.y;
    }
    if (pt.z < this.minCorner.z) {
      this.minCorner.z = pt.z;
    }
  }

  public contains(pt: THREE.Vector3): boolean {
    return pt.x <= this.maxCorner.x && pt.x >= this.minCorner.x &&
      pt.y <= this.maxCorner.y && pt.y >= this.minCorner.y &&
      pt.z <= this.maxCorner.z && pt.z >= this.minCorner.z;
  }

  public sizeX() { return this.maxCorner.x-this.minCorner.x; }
  public sizeY() { return this.maxCorner.y-this.minCorner.y; }
  public sizeZ() { return this.maxCorner.z-this.minCorner.z; }
}

export function coordinate3DToThreeVector3(coord: Coordinate3D): THREE.Vector3 {
  return new THREE.Vector3(coord?.x||0, coord?.y||0, coord?.z||0);
}

export function coordinate4DToThreeQuaternion(coord: Coordinate4D): THREE.Quaternion {
  return new THREE.Quaternion(coord?.x||0, coord?.y||0, coord?.z||0, coord?.w||0);
}

export function vector3ToCoordinate3D(vec: THREE.Vector3Like) {
  return Coordinate3D.create({x: vec.x, y: vec.y, z: vec.z});
}

export function quaternionToCoordinate4D(q: THREE.QuaternionLike) {
  return Coordinate4D.create({x: q.x, y: q.y, z: q.z, w: q.w});
}