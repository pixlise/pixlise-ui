import { Colours } from "src/app/utils/colours";
import { Point } from "src/app/models/Geometry";
import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";

export function drawUserLine(screenContext: CanvasRenderingContext2D, points: Point[], transform: PanZoom): void {
  if (points.length <= 1) {
    return;
  }
  screenContext.save();

  screenContext.setLineDash([11 / transform.scale.x, 4 / transform.scale.x]);
  screenContext.strokeStyle = Colours.BLACK.asString();
  screenContext.lineWidth = 5 / transform.scale.x;
  drawLinePath(screenContext, points);

  screenContext.setLineDash([9 / transform.scale.x, 6 / transform.scale.x]);
  screenContext.lineDashOffset = -1 / transform.scale.x;
  screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
  screenContext.lineWidth = 3 / transform.scale.x;
  drawLinePath(screenContext, points);

  screenContext.restore();
}

function drawLinePath(screenContext: CanvasRenderingContext2D, points: Point[]): void {
  screenContext.beginPath();
  screenContext.moveTo(points[0].x, points[0].y);

  for (const pt of points) {
    screenContext.lineTo(pt.x, pt.y);
  }
  screenContext.stroke();
}
