import { Rect, Point } from "src/app/models/Geometry";
import { CanvasWorldTransform } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";

export function makeBBox(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  worldTransform: CanvasWorldTransform) {
    // Make a bounding box in world space to compare points to
    const worldBBox = new Rect(0, 0, screenContext.canvas.width, screenContext.canvas.height);
    const tmp = worldTransform.canvasToWorldSpace(new Point(0, 0));
    const tmp2 = worldTransform.canvasToWorldSpace(new Point(screenContext.canvas.width, screenContext.canvas.height));
    worldBBox.x = tmp.x;
    worldBBox.y = tmp.y;
    worldBBox.w = tmp2.x-tmp.x;
    worldBBox.h = tmp2.y-tmp.y;

    return worldBBox;
}

export function pointInView(worldBBox: Rect, coord: Point, pointRadius: number): boolean {
  return worldBBox.containsPoint(coord);
  //return coord.x >= 0 && coord.x < screenContext.canvas.width && coord.y >= 0 && coord.y < screenContext.canvas.height;
}