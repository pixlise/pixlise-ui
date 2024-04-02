import { ElementRef } from "@angular/core";
import { Observable } from "rxjs";
import { Point } from "src/app/models/Geometry";
import { WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import {
  CanvasDrawer,
  CanvasParams,
  CanvasWorldTransform,
  InteractiveCanvasComponent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { PointDrawer } from "src/app/utils/drawing";

export type WidgetExportOptionType = "checkbox" | "multiswitch";

export type WidgetExportOption = {
  id: string;
  name: string;
  type: WidgetExportOptionType;
  description: string;
  selected: boolean;

  disabled?: boolean;
  disabledText?: string;

  // Only for multiswitch
  options?: string[];
  selectedOption?: string;
};

export type WidgetExportDialogData = {
  title: string;
  defaultZipName: string;
  options: WidgetExportOption[];
  dataProducts: WidgetExportOption[];

  // Preview Options
  showPreview: boolean;
  preview?: ElementRef;
};

export type WidgetExportRequest = {
  options: Record<string, WidgetExportOption>;
  dataProducts: Record<string, WidgetExportOption>;
};

export type WidgetExportFile = {
  fileName: string;
  subFolder?: string;
  data: any;
};

export type WidgetExportData = {
  csvs?: WidgetExportFile[];
  txts?: WidgetExportFile[];
  images?: WidgetExportFile[];
};

const drawStaticLegend = (screenContext: CanvasRenderingContext2D, keyItems: WidgetKeyItem[], viewport: CanvasParams, lightMode: boolean): void => {
  if (keyItems.length === 0) {
    return;
  }

  let legendWidth = 200;

  //   Get width of every key item text and set the legend width to the maximum
  keyItems.forEach(keyItem => {
    let textWidth = screenContext?.measureText(keyItem?.label || "")?.width || 0;
    legendWidth = Math.max(legendWidth, textWidth + 65);
  });

  let legendHeight = 35 + keyItems.length * 20;
  let legendX = viewport.width - legendWidth - 10;
  let legendY = 10;

  screenContext.save();

  screenContext.strokeStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.lineWidth = 1;
  screenContext.strokeRect(legendX, legendY, legendWidth, legendHeight);
  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();

  screenContext.font = "12px Arial";
  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.textAlign = "left";
  screenContext.textBaseline = "middle";

  let legendTextX = legendX + 15;
  let legendTextY = legendY + 15;

  screenContext.fillText("Key", legendTextX - 5, legendTextY);
  legendTextY += 20;

  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.fillRect(legendTextX - 15, legendTextY - 10, legendWidth, 1.5);

  legendTextY += 5;

  keyItems.forEach(keyItem => {
    let drawer = new PointDrawer(screenContext, 5, keyItem.label === "Dataset" && lightMode ? Colours.GRAY_80 : RGBA.fromString(keyItem.colour), null, keyItem.shape);
    drawer.drawPoints([new Point(legendTextX, legendTextY)], 1);

    screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
    screenContext.fillText(keyItem.label, legendTextX + 15, legendTextY, legendWidth - 15);

    legendTextY += 20;
  });
};

export const generatePlotImage = (
  drawer: CanvasDrawer,
  transform: CanvasWorldTransform,
  keyItems: WidgetKeyItem[],
  width: number,
  height: number,
  showKey: boolean,
  lightMode: boolean = true,
  exportItemIds = []
): HTMLCanvasElement => {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  let context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get 2D context for canvas");
  }

  let viewport = new CanvasParams(width, height, 1);

  let existingMode = drawer.lightMode;

  drawer.showSwapButton = false;
  drawer.lightMode = lightMode;

  InteractiveCanvasComponent.drawFrame(context, viewport, transform, drawer, exportItemIds);

  if (showKey) {
    drawStaticLegend(context, keyItems, viewport, lightMode);
  }

  // Reset the drawer
  drawer.showSwapButton = true;
  drawer.lightMode = existingMode;

  return canvas;
};

export const exportPlotImage = (
  drawer: CanvasDrawer,
  transform: CanvasWorldTransform,
  keyItems: WidgetKeyItem[],
  includeKey: boolean,
  darkMode: boolean,
  width: number = 1200,
  height: number = 800
): Observable<string> => {
  return new Observable<string>(observer => {
    let plot = generatePlotImage(drawer, transform, keyItems, width, height, includeKey, !darkMode);
    if (plot) {
      let dataURL = plot?.toDataURL("image/png")?.split(",");
      if (dataURL && dataURL.length > 1) {
        observer.next(dataURL[1]);
      } else {
        observer.error("Error generating RGBU plot export data");
      }
    } else {
      observer.error("Error exporting RGBU plot data");
    }
  });
};
