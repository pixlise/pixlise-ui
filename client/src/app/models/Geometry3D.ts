export class Vec3D {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  public copy(): Vec3D {
    return new Vec3D(this.x, this.y, this.z);
  }
}

export class AxisAlignedBBox {
  constructor(public minCorner: Vec3D = new Vec3D(Infinity, Infinity, Infinity), public maxCorner: Vec3D = new Vec3D(-Infinity, -Infinity, -Infinity)) {
  }

  public copy(): AxisAlignedBBox {
    return new AxisAlignedBBox(this.minCorner.copy(), this.maxCorner.copy());
  }

  public center(): Vec3D {
    return new Vec3D(
      (this.maxCorner.x+this.minCorner.x) / 2,
      (this.maxCorner.y+this.minCorner.y) / 2,
      (this.maxCorner.z+this.minCorner.z) / 2
    );
  }

  public expandToFit(pt: Vec3D): void {
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
}

export function scaleVec3D(v: Vec3D, s: number) {
  return new Vec3D(v.x * s, v.y * s, v.z * s);
}

export function addVec3Ds(v1: Vec3D, v2: Vec3D) {
  return new Vec3D(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
}

// Returns v1-v2
export function subtractVec3Ds(v1: Vec3D, v2: Vec3D) {
  return new Vec3D(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
}