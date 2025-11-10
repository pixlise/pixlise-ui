import { CanvasWorldTransform } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImageItemTransform } from "../../../models/image-transform";
import { ContextImageRegionLayer, RegionDisplayPolygon } from "../../../models/region";
import { drawImageOrMaskWithOptionalTransform } from "./draw-image";
import { RGBA } from "src/app/utils/colours";

export function drawRegion(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  worldTransform: CanvasWorldTransform,
  region: ContextImageRegionLayer,
  imageTransform: ContextImageItemTransform | null,
  colourOverride: RGBA | null,
  drawOutline: boolean
): void {
  if (region.pixelMask) {
    drawImageOrMaskWithOptionalTransform(screenContext, region.pixelMask, imageTransform);
  }

  if (!region.colour) {
    return;
  }

  let drawColour = colourOverride;
  if (!drawColour) {
    drawColour = RGBA.fromWithA(region.colour, 0.8);
  }
  //drawOutline = true;
  let opacityMult = 1;
  if (drawOutline) {
    opacityMult = 0.6;
    screenContext.strokeStyle = drawColour.asStringWithA(region.opacity);
    screenContext.lineWidth = 2 / worldTransform.getScale().x;
  }

  let defaultFill = drawColour.asStringWithA(region.opacity * opacityMult);
  screenContext.fillStyle = defaultFill;

  for (const poly of region.polygons) {
    if (poly.opacity !== undefined) {
      screenContext.fillStyle = drawColour.asStringWithA(region.opacity * opacityMult * poly.opacity);
    } else {
      screenContext.fillStyle = defaultFill;
    }

    drawPolygon(screenContext, poly);

    screenContext.fill();

    if (drawOutline) {
      screenContext.stroke();
    }
  }

  screenContext.fillStyle = defaultFill;
}

function drawPolygon(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, polygon: RegionDisplayPolygon): void {
  // Don't draw polygons with less than 3 points
  if (polygon.boundaryPoints.length < 3) {
    return;
  }

  ctx.beginPath();

  // Draw the polygon
  ctx.moveTo(polygon.boundaryPoints[0].x, polygon.boundaryPoints[0].y);

  for (let c = 1; c < polygon.boundaryPoints.length; c++) {
    ctx.lineTo(polygon.boundaryPoints[c].x, polygon.boundaryPoints[c].y);
  }

  ctx.closePath();

  // Draw holes inside the polygon

  for (const hole of polygon.holePolygons) {
    ctx.moveTo(hole[0].x, hole[0].y);

    for (let c = 1; c < hole.length; c++) {
      ctx.lineTo(hole[c].x, hole[c].y);
    }

    ctx.closePath();
  }
}
