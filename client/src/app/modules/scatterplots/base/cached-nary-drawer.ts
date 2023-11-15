import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { Colours } from "src/app/utils/colours";
import { PointDrawer, PLOT_POINTS_SIZE } from "src/app/utils/drawing";
import { DrawModelWithPointGroup, NaryChartDataGroup } from "./model";

export function drawScatterPoints(
  screenContext: OffscreenCanvasRenderingContext2D,
  mdl: DrawModelWithPointGroup,
  lightMode: boolean,
  pointGroups: NaryChartDataGroup[]
): void {
  // Render points to an image for drawing
  const alpha = PointDrawer.getOpacity(mdl.totalPointCount);
  for (let c = 0; c < mdl.pointGroupCoords.length; c++) {
    const isAllPoints = PredefinedROIID.isAllPointsROI(pointGroups[c].roiId);
    const colourGroup = isAllPoints && lightMode ? Colours.GRAY_80 : pointGroups[c].colour;
    const visibility = isAllPoints && lightMode ? 0.4 : alpha;
    const drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, colourGroup, null, pointGroups[c].shape);
    drawer.drawPointsWithRayLabel(mdl.pointGroupCoords[c], visibility, false, 15, mdl.isNonSelectedPoint[c]);
  }

  // Draw selected points last
  for (let c = 0; c < mdl.selectedPointGroupCoords.length; c++) {
    const drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, Colours.CONTEXT_BLUE, null, pointGroups[c].shape);
    drawer.drawPointsWithRayLabel(mdl.selectedPointGroupCoords[c], alpha);
  }
}
