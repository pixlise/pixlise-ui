import { ElementRef } from "@angular/core";
import { map, Observable, switchMap, tap, throwError } from "rxjs";
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
import { ROIItemSummary } from "../../../../generated-protos/roi";
import { DataExpression } from "../../../../generated-protos/expressions";

export const EXPORT_PREVIEW_ID_PREFIX = "export-preview-";

export type WidgetExportOptionType = "checkbox" | "multiswitch" | "dropdown" | "regions" | "expressions" | "images" | "number";

export type UpdateCountsFn = (selection: WidgetExportRequest, selected: boolean) => Record<string, number>;

export type DropdownOption = {
  id: string;
  name: string;
};

export type WidgetExportOption = {
  id: string;
  name: string;
  unitIcon?: string;
  type: WidgetExportOptionType;
  description: string;
  selected: boolean;
  optionIcon?: string;

  disabled?: boolean;
  disabledText?: string;

  // Only for multiswitch
  options?: string[];
  selectedOption?: string;

  // Only for dropdown
  dropdownOptions?: DropdownOption[];

  // For nested accordion options - main option applies to all subOptions
  subOptions?: WidgetExportOption[];

  value?: number | string;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  unit?: string;
  placeholder?: string;

  // For regions & expressions
  scanId?: string;
  quantId?: string;

  // For image picker
  selectedImagePaths?: string[];

  selectedRegions?: ROIItemSummary[];
  selectedExpressions?: DataExpression[];

  colorPicker?: boolean;
  colorPickerValue?: string;

  toggleable?: boolean;

  // For counts that aren't 1
  count?: number;
  updateCounts?: UpdateCountsFn;
};

export type DataControl = {
  id: string;
  name: string;

  iconColour: string; // Base colour for the icon
  icon?: string; // If provided, replaces the iconColour with the icon

  visible: boolean;
  disabled: boolean;
  opacity: number;
};

export type WidgetExportDialogData = {
  title: string;
  defaultZipName: string;

  options: WidgetExportOption[];

  // Simple download case
  dataProducts?: WidgetExportOption[];

  // Complex/interactive download case
  dataControls?: DataControl[];
  chartOptions?: WidgetExportOption[];
  keyOptions?: WidgetExportOption[];

  hideProgressLabels?: boolean;

  // Preview Options
  showPreview: boolean;

  // For widget previews, we need to dynamically load the preview component
  widgetId?: string;
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

export const WIDGET_EXPORT_DATA_KEYS = ["csvs", "txts", "images", "tiffImages", "msas", "luas", "mds"];
export type WidgetExportData = {
  csvs?: WidgetExportFile[];
  txts?: WidgetExportFile[];
  images?: WidgetExportFile[];
  tiffImages?: WidgetExportFile[];
  msas?: WidgetExportFile[];
  luas?: WidgetExportFile[];
  mds?: WidgetExportFile[];
  interactiveCanvas?: boolean;
  interactiveKey?: boolean;
};

const drawStaticLegend = (screenContext: CanvasRenderingContext2D, keyItems: WidgetKeyItem[], viewport: CanvasParams, lightMode: boolean): void => {
  if (keyItems.length === 0) {
    return;
  }

  let legendWidth = 200;

  //   Get width of every key item text and set the legend width to the maximum
  keyItems.forEach(keyItem => {
    const textWidth = screenContext?.measureText(keyItem?.label || "")?.width || 0;
    legendWidth = Math.max(legendWidth, textWidth + 65);
  });

  const legendHeight = 35 + keyItems.length * 20;
  const legendX = viewport.width - legendWidth - 10;
  const legendY = 10;

  screenContext.save();

  screenContext.strokeStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.lineWidth = 1;
  screenContext.strokeRect(legendX, legendY, legendWidth, legendHeight);
  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();

  screenContext.font = "12px Arial";
  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.textAlign = "left";
  screenContext.textBaseline = "middle";

  const legendTextX = legendX + 15;
  let legendTextY = legendY + 15;

  screenContext.fillText("Key", legendTextX - 5, legendTextY);
  legendTextY += 20;

  screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
  screenContext.fillRect(legendTextX - 15, legendTextY - 10, legendWidth, 1.5);

  legendTextY += 5;

  keyItems.forEach(keyItem => {
    const drawer = new PointDrawer(
      screenContext,
      5,
      keyItem.label === "Dataset" && lightMode ? Colours.GRAY_80 : RGBA.fromString(keyItem.colour),
      null,
      keyItem.shape
    );
    drawer.drawPoints([new Point(legendTextX, legendTextY)], 1);

    screenContext.fillStyle = lightMode ? Colours.GRAY_80.asString() : Colours.WHITE.asString();
    screenContext.fillText(keyItem.label, legendTextX + 15, legendTextY, legendWidth - 15);

    legendTextY += 20;
  });
};

export function exportPlotImage(
  drawer: CanvasDrawer,
  transform: CanvasWorldTransform,
  keyItems: WidgetKeyItem[],
  includeKey: boolean,
  darkMode: boolean,
  width: number,
  height: number,
  dpi: number
): Observable<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get 2D context for canvas");
  }

  const viewport = new CanvasParams(width, height, dpi);

  const existingMode = drawer.lightMode;

  drawer.showSwapButton = false;
  drawer.lightMode = !darkMode;

  return InteractiveCanvasComponent.drawFrame(context, viewport, transform, drawer, []).pipe(
    map(() => {
      if (includeKey) {
        drawStaticLegend(context, keyItems, viewport, !darkMode);
      }

      // Reset the drawer
      drawer.showSwapButton = true;
      drawer.lightMode = existingMode;

      const dataURL = canvas.toDataURL("image/png")?.split(",");
      if (!dataURL || dataURL.length < 2) {
        throwError(() => "Error creating plot export data URL");
      }

      return dataURL[1];
    })
  );
}
