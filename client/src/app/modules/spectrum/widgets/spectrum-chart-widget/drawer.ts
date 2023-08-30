import { CanvasDrawParameters, CanvasDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";

export class SpectrumChartDrawer implements CanvasDrawer {
    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
        screenContext.textAlign = "left";
        screenContext.textBaseline = "top";
        screenContext.fillStyle = Colours.ORANGE.asString();
        screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
        screenContext.fillText("TEST", 0, 0);
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    }
}