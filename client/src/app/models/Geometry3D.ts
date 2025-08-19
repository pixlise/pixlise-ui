import * as THREE from 'three';

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
/*
export function scaleVec3D(v: Vec3D, s: number) {
  return new Vec3D(v.x * s, v.y * s, v.z * s);
}

export function addVec3Ds(v1: Vec3D, v2: Vec3D) {
  return new Vec3D(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
}

// Returns v1-v2
export function subtractVec3Ds(v1: Vec3D, v2: Vec3D) {
  return new Vec3D(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
}*/