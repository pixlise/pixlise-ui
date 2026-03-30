import { Colours, RGBA } from "src/app/utils/colours";
import { drawEmptyCircle, drawFilledCircle, drawPlusCoordinates } from "src/app/utils/drawing";
import { ScanPoint } from "../../../models/scan-point";
import { Point, Rect } from "src/app/models/Geometry";
import { CanvasWorldTransform } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { makeBBox, pointInView } from "./culling";

// The actual selectable locations, small circles (currently blue)
// We draw enlarged borders around these a little faded out to not interfere too much
export function drawScanPoints(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  worldTransform: CanvasWorldTransform,
  points: ScanPoint[],
  selectedPointPMCs: Set<number>,
  selectedPointIndexes: Set<number>,
  excludeIdx: number,
  drawUnselectedPts: boolean,
  drawSelectedPts: boolean,
  pointRadius: number,
  lineWidth: number,
  secondaryColour: RGBA,
  pmcColourLookup: Map<number, RGBA>
): void {
  // We're drawing them as small lines, use the default line width
  screenContext.lineWidth = lineWidth;

  // Get colours - we have a transparent version for drawing the filled transparent (unselected) circles
  const clrDataPoint = secondaryColour;
  const clrMissingDataStr = Colours.BLACK.asStringWithA(0.7);

  let lastSetColour: RGBA | null = null;

  // Make a bounding box in world space to compare points to
  const worldBBox = makeBBox(screenContext, worldTransform);

  let drawnEmpty = 0;
  let drawnFilled = 0;
  let drawnUnselected = 0;
  let drawnSelected = 0;

  // Draw the unselected points as transparent beam sized circle with a solid small circle in the middle
  if (drawUnselectedPts) {
    // Make a list of unselected location indexes
    const unselectedLocationIndexes: number[] = [];

    // If we encounter anything with missing data, we draw it differently here...
    screenContext.strokeStyle = clrMissingDataStr;
    screenContext.lineWidth = lineWidth * 1.5;

    for (let idx = 0; idx < points.length; idx++) {
      const loc = points[idx];
      if (idx != excludeIdx && loc && loc.coord) {
        if (loc.hasMissingData && pointInView(worldBBox, loc.coord, pointRadius)) {
          // Just draw it here as an empty point
          drawEmptyCircle(screenContext, loc.coord, pointRadius);
          drawnEmpty++;
        } else if (!selectedPointPMCs.has(loc.PMC)) {
          unselectedLocationIndexes.push(idx);
        }
      }
    }

    screenContext.lineWidth = lineWidth;

    // First the transparent backgrounds...
    for (const unselIdx of unselectedLocationIndexes) {
      const loc = points[unselIdx];
      if (loc.coord && pointInView(worldBBox, loc.coord, pointRadius)) {
        lastSetColour = setPointColour(screenContext, loc.PMC, pmcColourLookup, clrDataPoint, true, lastSetColour);
        drawFilledCircle(screenContext, loc.coord, pointRadius);
        drawnFilled++;
      }
    }

    // Now solid inner shapes
    const innerRadius = pointRadius / 3;
    lastSetColour = null;

    for (const unselIdx of unselectedLocationIndexes) {
      const loc = points[unselIdx];

      if (loc.coord && pointInView(worldBBox, loc.coord, pointRadius)) {
        lastSetColour = setPointColour(screenContext, loc.PMC, pmcColourLookup, clrDataPoint, false, lastSetColour);

        if (loc.hasDwellSpectra) {
          screenContext.beginPath();
          drawPlusCoordinates(screenContext, loc.coord, pointRadius * 2);
          screenContext.fill();
        } else {
          drawFilledCircle(screenContext, loc.coord, innerRadius);
        }

        drawnUnselected++;
      }
    }
  }

  // Now draw selected indexes (using the list of location indexes in selection). These are solid empty circles
  if (drawSelectedPts) {
    lastSetColour = null;

    for (const selIdx of selectedPointIndexes) {
      const loc = points[selIdx];
      if (selIdx != excludeIdx && loc && loc.coord && pointInView(worldBBox, loc.coord, pointRadius)) {
        lastSetColour = setPointColour(screenContext, loc.PMC, pmcColourLookup, clrDataPoint, false, lastSetColour);
        if (loc.hasDwellSpectra) {
          screenContext.beginPath();
          drawPlusCoordinates(screenContext, loc.coord, pointRadius * 2);
          screenContext.stroke();
        } else {
          drawEmptyCircle(screenContext, loc.coord, pointRadius);
        }

        drawnSelected++;
      }
    }
  }
}

function setPointColour(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  pmc: number,
  pmcColourLookup: Map<number, RGBA>,
  defaultColour: RGBA,
  makeTransparent: boolean,
  lastColour: RGBA | null
): RGBA {
  const clr: RGBA = pmcColourLookup.get(pmc) || defaultColour;

  // At this point we can early-out
  if (lastColour != null && clr.equals(lastColour)) {
    return lastColour;
  }

  let clrStr: string = "";

  // If we need to make it transparent, do so
  if (makeTransparent) {
    clrStr = clr.asStringWithA(0.15);
  } else {
    clrStr = clr.asString();
  }

  screenContext.fillStyle = clrStr;
  screenContext.strokeStyle = clrStr;

  return clr;
}
