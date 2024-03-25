// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

///////////////////////////////////////////////
// Geometry transformations
import { inv, matrix, Matrix, multiply } from "mathjs";
import { MinMax } from "src/app/models/BasicTypes";
import { environment } from "src/environments/environment";

// TODO: Use point class from:
// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Geometry.jsm
// Or some other NPM library
// Unless we want to maintain our own??
export class Point {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  public copy(): Point {
    return new Point(this.x, this.y);
  }
}

// This is a special "kind" of point used on some diagrams where it represents a point
// which has an undefined "other" value, so we draw it as a line, and have a hover label
// for it
export class PointWithRayLabel extends Point {
  constructor(
    x: number,
    y: number,
    public label: string = "",
    public endX: number | null = null,
    public endY: number | null = null
  ) {
    super(x, y);
  }

  public override copy(): PointWithRayLabel {
    return new PointWithRayLabel(this.x, this.y, this.label, this.endX, this.endY);
  }
}

export class Rect {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public w: number = 0,
    public h: number = 0
  ) {}

  static makeRect(topLeft: Point, width: number, height: number) {
    return new Rect(topLeft.x, topLeft.y, width, height);
  }

  public copy(): Rect {
    return new Rect(this.x, this.y, this.w, this.h);
  }

  public maxX(): number {
    return this.x + this.w;
  }

  public maxY(): number {
    return this.y + this.h;
  }

  public midX(): number {
    return this.x + this.w / 2;
  }

  public midY(): number {
    return this.y + this.h / 2;
  }

  public center(): Point {
    return new Point(this.x + this.w / 2, this.y + this.h / 2);
  }

  public containsPoint(ptTest: Point): boolean {
    return ptTest.x >= this.x && ptTest.x <= this.maxX() && ptTest.y >= this.y && ptTest.y <= this.maxY();
  }
  /*
    public intersects(other: Rect): boolean
    {
        return (
            this.containsPoint(new Point(other.x, other.y)) ||
            this.containsPoint(new Point(other.maxX(), other.y)) ||
            this.containsPoint(new Point(other.maxX(), other.maxY())) ||
            this.containsPoint(new Point(other.x, other.maxY()))
        );
    }
*/
  public expandToFitPoint(pt: Point): void {
    if (pt.x < this.x) {
      this.w += this.x - pt.x;
      this.x = pt.x;
    }

    if (pt.y < this.y) {
      this.h += this.y - pt.y;
      this.y = pt.y;
    }

    let tmp = this.maxX();
    if (pt.x > tmp) {
      this.w += pt.x - tmp;
    }
    tmp = this.maxY();
    if (pt.y > tmp) {
      this.h += pt.y - tmp;
    }
  }

  public expandToFitPoints(pts: Point[]): void {
    for (let pt of pts) {
      this.expandToFitPoint(pt);
    }
  }

  public expandToFitRect(rect: Rect): void {
    this.expandToFitPoints([new Point(rect.x, rect.y), new Point(rect.maxX(), rect.maxY())]);
  }

  public inflate(xDir: number, yDir: number): void {
    this.x -= xDir;
    this.w += xDir;
    this.w += xDir;

    this.y -= yDir;
    this.h += yDir;
    this.h += yDir;
  }
}

export function getTransformMatrix(scaleX: number, scaleY: number, panX: number, panY: number): math.Matrix {
  return matrix([
    [scaleX, 0, panX],
    [0, scaleY, panY],
    [0, 0, 1],
  ]);
}

export function getRotationMatrix(angleRad: number): math.Matrix {
  return matrix([
    [Math.cos(angleRad), -Math.sin(angleRad), 0],
    [Math.sin(angleRad), Math.cos(angleRad), 0],
    [0, 0, 1],
  ]);
}

export function getMatrixAs2x3Array(mat: Matrix): number[] {
  return [mat.get([0, 0]), mat.get([1, 0]), mat.get([0, 1]), mat.get([1, 1]), mat.get([0, 2]), mat.get([1, 2])];
}

export function pointByMatrix(matrix3x3: Matrix, pt: Point): Point {
  //console.log('multiply:');
  //console.log(matrix3x3);
  //console.log(pt.x+','+pt.y);
  const result = /*math.*/ multiply(matrix3x3, [[pt.x], [pt.y], [1]]) as Matrix;
  //console.log('equals:');
  //console.log(result);
  return new Point(result.get([0, 0]), result.get([1, 0]));
}

export function inverseMatrix(matrix3x3: Matrix): any {
  return /*math.*/ inv(matrix3x3);
}

export function ptWithinBox(ptTest: Point, ptBoxCentre: Point, boxWidth: number, boxHeight: number): boolean {
  /*
    let halfSize = boxSize/2;
    let rect = new Rect(ptBoxCentre.x-halfSize, ptBoxCentre.y-halfSize, boxSize, boxSize);
    return rect.containsPoint(ptTest);
*/
  return Math.abs(ptTest.x - ptBoxCentre.x) < boxWidth / 2 && Math.abs(ptTest.y - ptBoxCentre.y) < boxHeight / 2;
}

export function getVectorBetweenPoints(pt1: Point, pt2: Point): Point {
  return new Point(pt2.x - pt1.x, pt2.y - pt1.y);
}

export function getVectorCrossProduct(v1: Point, v2: Point): number {
  return v1.x * v2.y - v1.y * v2.x;
}

export function getVectorDotProduct(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function getVectorLength(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v: Point): Point {
  const len = getVectorLength(v);
  return scaleVector(v, 1 / len);
}

export function scaleVector(v: Point, s: number): Point {
  return new Point(v.x * s, v.y * s);
}

export function addVectors(v1: Point, v2: Point): Point {
  return new Point(v1.x + v2.x, v1.y + v2.y);
}

// Returns v1-v2
export function subtractVectors(v1: Point, v2: Point): Point {
  return new Point(v1.x - v2.x, v1.y - v2.y);
}

export function distanceBetweenPoints(pt1: Point, pt2: Point): number {
  let vec = getVectorBetweenPoints(pt1, pt2);
  return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function closestDistanceBetweenPointAndLine(pt: Point, lineStart: Point, lineDirNormalVec: Point, lineLength: number): number {
  // Flip the vector so we now have the perpendicular direction we need to measure in to see how far
  // the point is from the line
  let perpLineVec = new Point(lineDirNormalVec.y, -lineDirNormalVec.x);
  let toPointVec = getVectorBetweenPoints(lineStart, pt);

  // Given the line vec was normal, and so is our perpendicular vector, the dot product represents the distance to the line
  let distClosest = getVectorDotProduct(toPointVec, perpLineVec);

  // Also work out we're still within the line start/end points
  // Note Y is flipped because window coordinates start at top-left and increase in + direction to bottom-right
  // Dist along line was coming out wrong
  // TODO: Investigate why this isn't affecting other parts of the application, maybe the worldspace unit conversion
  // should be flipping Y already!
  let distAlongLine = getVectorDotProduct(toPointVec, new Point(lineDirNormalVec.x, lineDirNormalVec.y));

  // If it's before the start of the line or after the end, stop
  if (distAlongLine < 0 || distAlongLine > lineLength) {
    return null;
  }

  return distClosest;
}

export function vectorsEqual(v1: Point, v2: Point): boolean {
  return v1.x == v2.x && v1.y == v2.y;
}

export function colinearVectors(v1: Point, v2: Point): boolean {
  // if the 2 vectors point in the same direction (roughly) or opposite to each other, consider
  // them colinear
  if (Math.abs(Math.abs(v2.x) - Math.abs(v1.x)) < 0.0001 && Math.abs(Math.abs(v2.y) - Math.abs(v1.y)) < 0.0001) return true;
  return false;
}

export function pointWithinSingleAxisPlane(point: Point, polyPoints: Point[], axis: "x" | "y" = "x"): boolean {
  if (polyPoints.length < 1) {
    return false;
  }

  // Get min/max bounds for axis
  let minMaxPolyBounds = new MinMax(polyPoints[0][axis], polyPoints[0][axis]);
  polyPoints.forEach(pt => {
    if (isNaN(pt[axis])) {
      // If any point is NaN, skip it
      return;
    }

    minMaxPolyBounds.expandMin(pt[axis]);
    minMaxPolyBounds.expandMax(pt[axis]);
  });

  if (minMaxPolyBounds.min === null || minMaxPolyBounds.max === null) {
    return false;
  }

  // If the point is within the min/max bounds, it's within the plane
  return point[axis] >= minMaxPolyBounds.min && point[axis] <= minMaxPolyBounds.max;
}

export function ptWithinPolygon(p: Point, polyPoints: Point[], polyPointBBox: Rect | null = null): boolean {
  // Using the ray casting algorithm to determine if point is within polygon:
  // https://en.wikipedia.org/wiki/Point_in_polygon

  // Loop through all "lines" formed by polygon points, count how many times a ray from ptTest to x infinity intersects a line
  // Odd = in, Even = out

  // Math: https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect/565282#565282
  // Starting from p, we cast a ray in direction of unit vector r

  // Line segment tested is from q to lineEnd, where a unit vector s points towards lineEnd

  // Their intersection point is:
  // p+tr = q+us
  // We can calculate t and u and that'll give us the point
  // Then we see if u is still within the line segment!

  // Initially we were using a vector of (1,0) here but this often ends up intersecting a line end point
  // and creating false counts, including points that are far out of the area... so we
  // now generate a random direction vector
  //let r = new Point(1,0);
  let r = normalizeVector(new Point(Math.random() * 100, Math.random() * 100));
  let intersectCount = 0;

  let log = [];

  for (let c = 1; c <= polyPoints.length; c++) {
    let q = polyPoints[c - 1];
    let lineEnd = polyPoints[c % polyPoints.length];

    let s = getVectorBetweenPoints(q, lineEnd);

    // if they're parallel, ignore
    if (!colinearVectors(r, s)) {
      // check if they intersect within the line segment
      // t = ((q - p) x s) / (r x s)
      // where
      let qp = getVectorBetweenPoints(p, q);
      let rxs = getVectorCrossProduct(r, s);

      // If r x s == 0 && q

      let t = getVectorCrossProduct(qp, s) / rxs;

      // u = ((q - p) x r) / (r x s)
      let u = getVectorCrossProduct(qp, r) / rxs;

      // If t > 0 (this way we're testing only intersections in the direction of r) and 0 < u < 1, it's a hit!
      if (t > 0 && u >= 0 && u <= 1) {
        log.push(`HIT: p=${p.x},${p.y}, r=1,0, q=${q.x},${q.y}, lineEnd=${lineEnd.x},${lineEnd.y}, s=${s.x},${s.y}, u=${u}, t=${t}`);
        intersectCount++;
      }

      //console.log('p='+p.x+','+p.y+', r=1,0, q='+q.x+','+q.y+', lineEnd='+lineEnd.x+','+lineEnd.y+', s='+s.x+','+s.y+', u='+u+', t='+t);
    }
  }

  let isInside = intersectCount % 2 != 0;

  if (polyPointBBox !== null && isInside && !polyPointBBox.containsPoint(p)) {
    // Bounding box overrules
    isInside = false;

    if (!environment.production) {
      console.warn("IGNORING POINT OUTSIDE BBOX: " + p.x + "," + p.y + ", bbox:");
      console.log(polyPointBBox);

      console.warn("Polygon:");
      let c = 0;
      for (let pt of polyPoints) {
        console.log(c + ": " + pt.x + "," + pt.y);
        c++;
      }

      console.warn("Hits:");
      for (let l of log) {
        console.log(l);
      }
    }
  }

  return isInside;
}
