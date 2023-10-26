import { Point, Rect } from "src/app/models/Geometry";
import { degToRad } from "src/app/utils/utils";

export enum MapPointShape {
  CIRCLE,
  CROSSED_CIRCLE, // Like a no-entry sign
  DIAMOND,
  EX,
  POLYGON,
  // PLUS
}

export function drawMapData(screenContext: CanvasRenderingContext2D, points: , pointSize: number, opacity: number): void {
  const ptHalfSize = pointSize * 0.5;

  const drawFuncs = [drawCircle, drawCrossedCircle, drawDiamond, drawX];

  for (const loc of this._points) {
    screenContext.fillStyle = loc.rep.colour.asStringWithA(opacity);

    if (loc.shape === MapPointShape.POLYGON) {
      drawPolygon(screenContext, loc.polygon);
    } else {
      drawFuncs[loc.shape](screenContext, loc, ptHalfSize, loc.rep.scale)
    }
  }
}

function drawCircle(screenContext: CanvasRenderingContext2D, pos: Point, halfSize: number, scale: number | null) {
  screenContext.beginPath();

  // save a multiply TODO: maybe it's not worth it doing the if??
  screenContext.arc(pos.x, pos.y, scale === null ? halfSize : halfSize * scale, 0, 2 * Math.PI);

  screenContext.fill();
}

function drawCrossedCircle(screenContext: CanvasRenderingContext2D, pos: Point, halfSize: number, scale: number | null) {
  let rad = halfSize * 0.5;
  screenContext.beginPath();

  // save a multiply TODO: maybe it's not worth it doing the if??
  screenContext.arc(pos.x, pos.y, scale !== null ? rad * scale : rad, 0, 2 * Math.PI);

  screenContext.stroke();

  rad *= 0.8;
  screenContext.beginPath();
  screenContext.moveTo(pos.x - rad, pos.y + rad);
  screenContext.lineTo(pos.x + rad, pos.y - rad);
  screenContext.stroke();
}

const rad45 = degToRad(45);
function drawDiamond(screenContext: CanvasRenderingContext2D, pos: Point, halfSize: number, scale: number | null) {
  screenContext.save();
  screenContext.translate(pos.x, pos.y);
  screenContext.rotate(rad45);

  // save a multiply TODO: maybe it's not worth it doing the if??
  const offset = scale !== null ? -halfSize * scale : -halfSize;
  let size = halfSize + halfSize;
  if (scale !== null) {
    size *= scale;
  }
  screenContext.fillRect(offset, offset, size, size);

  screenContext.restore();
}

// Draw an X
function drawX(screenContext: CanvasRenderingContext2D, pos: Point, halfSize: number, scale: number | null) {
  const xscale = 0.6;

  // save a multiply TODO: maybe it's not worth it doing the if??
  if (scale !== null) {
    halfSize *= scale;
  }

  halfSize *= xscale;

  const size = halfSize + halfSize;

  const rect = new Rect(pos.x - halfSize, pos.y - halfSize, size, size);

  screenContext.lineWidth = 0.5;
  screenContext.strokeStyle = screenContext.fillStyle;

  screenContext.beginPath();

  screenContext.moveTo(rect.x, rect.y);
  screenContext.lineTo(rect.maxX(), rect.maxY());
  screenContext.moveTo(rect.maxX(), rect.y);
  screenContext.lineTo(rect.x, rect.maxY());

  screenContext.stroke();
}

function drawPolygon(screenContext: CanvasRenderingContext2D, pts: Point[]) {
  screenContext.beginPath();
  screenContext.moveTo(pts[0].x, pts[0].y);

  for (let c = 1; c < pts.length; c++) {
    screenContext.lineTo(pts[c].x, pts[c].y);
  }
  screenContext.closePath();
  screenContext.fill();
}
