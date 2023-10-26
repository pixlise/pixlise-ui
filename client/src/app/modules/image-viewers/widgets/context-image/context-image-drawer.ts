import { CachedCanvasChartDrawer } from "src/app/modules/scatterplots/base/cached-drawer";
import { ContextImageModel } from "./context-image-model";
import { ContextImageToolHost } from "./tools/tool-host";
import { ChartAxisDrawer } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";

export class ContextImageDrawer extends CachedCanvasChartDrawer {
  protected _dbg: string = "";
  protected _mdl: ContextImageModel;
  protected _toolHost: ContextImageToolHost;

  constructor(ctx: ContextImageModel, toolHost: ContextImageToolHost) {
    super();

    this._mdl = ctx;
    this._toolHost = toolHost;
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  override drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw tool UI on top
    this.drawWorldSpaceToolUIs(screenContext, drawParams);
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  protected drawWorldSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    //screenContext.save();
    for (const drawer of this._toolHost.getDrawers()) {
      screenContext.save();
      drawer.drawWorldSpace(screenContext, drawParams);
      screenContext.restore();
    }
    //screenContext.restore();
  }

  protected drawScreenSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    //screenContext.save();
    for (const drawer of this._toolHost.getDrawers()) {
      screenContext.save();
      drawer.drawScreenSpace(screenContext, drawParams);
      screenContext.restore();
    }
    //screenContext.restore();
  }
}
