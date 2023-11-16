import { Point, vectorsEqual } from "src/app/models/Geometry";
import {
  CanvasInteractionHandler,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { MultiChannelViewerModel } from "./multi-channel-viewer-model";

export class MultiChannelViewerInteraction implements CanvasInteractionHandler {
  constructor(private _mdl: MultiChannelViewerModel) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // If we have the context image transform available, we operate on it, otherwise operate on our own one
    const transform = this._mdl.transform;

    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      const newScale = transform.scale.x * (1 - event.deltaY / 100);
      transform.setScaleRelativeTo(new Point(newScale, newScale), event.point, false);
      return CanvasInteractionResult.redrawAndCatch;
    }

    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG || (event.eventId == CanvasMouseEventId.MOUSE_UP && event.mouseDown != null)) {
      const drag = new Point(event.point.x - event.mouseLast.x, event.point.y - event.mouseLast.y);

      const newPan = new Point(transform.pan.x + drag.x * transform.scale.x, transform.pan.y + drag.y * transform.scale.x);

      // If there is no change, don't do anything!
      // We do want to forward mouse up msgs, because they end our pan cycle...
      if (event.eventId == CanvasMouseEventId.MOUSE_UP || !vectorsEqual(transform.pan, newPan)) {
        transform.setPan(newPan, event.eventId == CanvasMouseEventId.MOUSE_UP);
      }

      // NOTE: Returning true for redraw is not needed because canvas is subscribed to panzoom changes
      return CanvasInteractionResult.neither;
    }

    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}
