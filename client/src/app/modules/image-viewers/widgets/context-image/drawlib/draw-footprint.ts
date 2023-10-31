import { addVectors, scaleVector, Point } from "src/app/models/Geometry";
import { Footprint } from "../../../models/footprint";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";

export function drawFootprint(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, footprint: Footprint, transform: PanZoom): void {
  const lineWidth = 2 / transform.scale.x;

  const innerInflate = 0;
  const outerInflate = lineWidth;

  screenContext.lineWidth = lineWidth;

  drawFootprintLine(screenContext, footprint, innerInflate, "", footprint.innerColour.asString());
  drawFootprintLine(screenContext, footprint, outerInflate, "", footprint.outerColour.asString());
}

// Inflate: how many pixels to inflate the hull points by
// If fillStyle is not null, the area will be filled with that style.
// If strokeStyle is not null, the area will be outlined with that style.
function drawFootprintLine(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  footprint: Footprint,
  inflate: number,
  fillStyle: string,
  strokeStyle: string
): void {
  if (fillStyle) {
    screenContext.fillStyle = fillStyle;
  }

  if (strokeStyle) {
    screenContext.strokeStyle = strokeStyle;
  }

  screenContext.beginPath();

  for (const hullPoints of footprint.points) {
    let firstPt: Point | null = null;

    for (let c = 0; c < hullPoints.length; c++) {
      const hullPt = hullPoints[c];
      let pt: Point = new Point(hullPt.x, hullPt.y);
      if (inflate > 0 && hullPt.normal) {
        pt = addVectors(pt, scaleVector(hullPt.normal, inflate));
      }

      if (c == 0) {
        screenContext.moveTo(pt.x, pt.y);
        firstPt = new Point(pt.x, pt.y);
      } else {
        screenContext.lineTo(pt.x, pt.y);
      }
    }

    if (firstPt) {
      screenContext.lineTo(firstPt.x, firstPt.y);
    }
  }

  screenContext.closePath();

  if (fillStyle) {
    screenContext.fill();
  }

  if (strokeStyle) {
    screenContext.stroke();
  }
}
