import { Point, PointWithRayLabel } from "src/app/models/Geometry";
import { CanvasParams } from "../../widget/components/interactive-canvas/interactive-canvas.component";

// For use with cached drawer
export interface BaseChartDrawModel {
  drawnData: OffscreenCanvas | null;
}

export interface BaseChartModel {
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams, screenContext?: CanvasRenderingContext2D): void;
  drawModel: BaseChartDrawModel;
  hasRawData(): boolean;
}

// For use with interaction-with-lasso-hover

export interface BaseChartDrawModelPoints {
  pointGroupCoords: (Point | PointWithRayLabel)[][];
}

export interface BaseChartModelWithLasso {
  mouseLassoPoints: Point[];
  cursorShown: string;
  drawModel: BaseChartDrawModelPoints;
  raw: BaseChartRawData | null;
  selectionMode?: string;
}

export interface BaseChartRawData {
  pointGroups: BaseChartDataItem[];
}

export interface BaseChartDataItem {
  scanId: string;
  valuesPerScanEntry: BaseChartDataValueItem[];
}

export interface BaseChartDataValueItem {
  scanEntryId: number;
}
