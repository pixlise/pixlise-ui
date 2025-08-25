import { MinMax } from "src/app/models/BasicTypes";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Point, PointWithRayLabel, scaleVector } from "src/app/models/Geometry";
import { degToRad } from "src/app/utils/utils";
import { PLOT_POINTS_SIZE, HOVER_POINT_RADIUS, CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";
import { RegionDataResults } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { DrawModelWithPointGroup, NaryChartDataGroup, NaryChartDataItem, NaryChartModel, makeDrawablePointGroups } from "../../base/model";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ScanItem } from "../../../../generated-protos/scan";
import { ReferenceData } from "../../../../generated-protos/references";

export class TernaryChartModel extends NaryChartModel<TernaryData, TernaryDrawModel> {
  public static readonly FONT_SIZE_SMALL = CANVAS_FONT_SIZE_TITLE - 4;

  private _referenceData: ReferenceData[] = [];
  hoverReferenceData: ReferenceData | null = null;

  get references(): ReferenceData[] {
    return this._referenceData;
  }

  set references(refs: ReferenceData[]) {
    this._referenceData = refs;
    this._drawModel.references = refs;
    this.needsDraw$.next();
  }

  protected regenerateDrawModel(raw: TernaryData | null, canvasParams: CanvasParams): void {
    this._drawModel.regenerate(raw, this._beamSelection, canvasParams);

    // Calculate reference coordinates after the draw model is regenerated
    if (this._referenceData.length > 0 && raw) {
      this._drawModel.referenceCoords = this.calculateReferenceCoordinates(raw);
    } else {
      this._drawModel.referenceCoords = [];
    }
  }

  setData(data: RegionDataResults, scanItems: ScanItem[] = []): WidgetError[] {
    const corners: ScatterPlotAxisInfo[] = [
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
    ];

    return this.processQueryResult("Ternary", data, corners, scanItems);
  }

  protected makeData(axes: ScatterPlotAxisInfo[], pointGroups: NaryChartDataGroup[]): TernaryData {
    if (axes.length != 3) {
      throw new Error(`Invalid axis count for ternary: ${axes.length}`);
    }

    return new TernaryData(axes[0], axes[1], axes[2], pointGroups);
  }

  protected axisName(axisIdx: number): string {
    return axisIdx == 0 ? "left" : axisIdx == 1 ? "right" : "top";
  }

  private calculateReferenceCoordinates(raw: TernaryData): PointWithRayLabel[] {
    const coords: PointWithRayLabel[] = [];

    if (this.expressionIds.length < 3) {
      return coords;
    }

    for (const reference of this._referenceData) {
      // Find A, B, and C values for this reference
      let aValue: number | null = null;
      let aPair: { expressionId: string; expressionName: string; value: number } | undefined = undefined;
      let bValue: number | null = null;
      let bPair: { expressionId: string; expressionName: string; value: number } | undefined = undefined;
      let cValue: number | null = null;
      let cPair: { expressionId: string; expressionName: string; value: number } | undefined = undefined;

      // A-axis (first expression - corner A)
      const aExpressionId = this.expressionIds[0];
      if (aExpressionId && reference.expressionValuePairs) {
        aPair = reference.expressionValuePairs.find((pair: { expressionId: string; value: number }) => pair.expressionId === aExpressionId);
        aValue = aPair?.value || null;
      }

      if (!aValue) {
        // If can't find an exact match, see if we can match the expression name
        const aExpressionName = raw?.cornerA.label || "";
        if (aExpressionName) {
          aPair = reference.expressionValuePairs.find(
            (pair: { expressionId: string; expressionName: string; value: number }) => pair.expressionName === aExpressionName
          );
        }
        aValue = aPair?.value || null;
      }

      // B-axis (second expression - corner B)
      const bExpressionId = this.expressionIds[1];
      if (bExpressionId && reference.expressionValuePairs) {
        bPair = reference.expressionValuePairs.find((pair: { expressionId: string; value: number }) => pair.expressionId === bExpressionId);
        bValue = bPair?.value || null;
      }

      if (!bValue) {
        // If can't find an exact match, see if we can match the expression name
        const bExpressionName = raw?.cornerB.label || "";
        if (bExpressionName) {
          bPair = reference.expressionValuePairs.find((pair: { expressionId: string; value: number }) => pair.expressionId === bExpressionId);
          bValue = bPair?.value || null;
        }
      }

      // C-axis (third expression - corner C)
      const cExpressionId = this.expressionIds[2];
      if (cExpressionId && reference.expressionValuePairs) {
        cPair = reference.expressionValuePairs.find((pair: { expressionId: string; value: number }) => pair.expressionId === cExpressionId);
        cValue = cPair?.value || null;
      }

      if (!cValue) {
        // If can't find an exact match, see if we can match the expression name
        const cExpressionName = raw?.cornerC.label || "";
        if (cExpressionName) {
          cPair = reference.expressionValuePairs.find((pair: { expressionId: string; value: number }) => pair.expressionId === cExpressionId);
          cValue = cPair?.value || null;
        }
      }

      // Only add the point if we have all three values
      if (aValue !== null && bValue !== null && cValue !== null) {
        // Create a fake ternary data item to use existing coordinate calculation
        const ternaryItem: NaryChartDataItem = {
          values: [aValue, bValue, cValue],
          nullMask: [false, false, false],
          scanEntryId: -1,
          label: reference.mineralSampleName,
        };

        // Use the existing calculation method
        const coord = this._drawModel.calcPointForTernary(ternaryItem);

        // Override the id for the reference
        coord.id = reference.id;

        coords.push(coord);
      }
    }

    return coords;
  }

  getReferenceAtPoint(pt: Point): ReferenceData | null {
    const boxSize = HOVER_POINT_RADIUS * 2;

    for (let i = 0; i < this._drawModel.referenceCoords.length; i++) {
      const coord = this._drawModel.referenceCoords[i];
      if (Math.abs(pt.x - coord.x) < boxSize / 2 && Math.abs(pt.y - coord.y) < boxSize / 2) {
        return this._referenceData[i];
      }
    }

    return null;
  }
}

export class TernaryDrawModel implements DrawModelWithPointGroup {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  triangleWidth: number = 0;
  triangleHeight: number = 0;

  // Coordinates we draw the points at
  pointGroupCoords: PointWithRayLabel[][] = [];
  totalPointCount: number = 0;
  references: ReferenceData[] = [];
  referenceCoords: PointWithRayLabel[] = [];

  isNonSelectedPoint: boolean[][] = [];
  selectedPointGroupCoords: PointWithRayLabel[][] = [];

  // Triangle points
  //    C
  //
  // A     B
  triangleA: Point = new Point();
  triangleB: Point = new Point();
  triangleC: Point = new Point();

  dataAreaA: Point = new Point();
  dataAreaWidth: number = 0;

  hoverLabelA: Point = new Point();
  hoverLabelB: Point = new Point();
  hoverLabelC: Point = new Point();

  regenerate(raw: TernaryData | null, beamSelection: BeamSelection, canvasParams: CanvasParams): void {
    this.totalPointCount = 0;
    this.drawnData = null; // Force regen

    const labelHeight = TernaryChartModel.FONT_SIZE + TernaryChartModel.LABEL_PADDING + TernaryChartModel.OUTER_PADDING;

    // Calculate triangle height (to make it equilateral) - assuming height is not the constraining direction
    this.triangleWidth = canvasParams.width - TernaryChartModel.OUTER_PADDING - TernaryChartModel.OUTER_PADDING;

    // Equilateral triangle height = sqrt(3)*height
    const ratio = Math.sqrt(3) / 2;
    this.triangleHeight = this.triangleWidth * ratio;

    let triangleLeft = TernaryChartModel.OUTER_PADDING;
    let triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;

    // If this won't fit, go by the height and center it width-wise
    if (this.triangleHeight + labelHeight * 2 > canvasParams.height) {
      //h=w*sqrt(3)/2
      //w=h/(sqrt(3)/2)

      this.triangleHeight = canvasParams.height - labelHeight * 2;
      this.triangleWidth = this.triangleHeight / ratio;
      //console.log('TERNARY: new tri size: '+this.triangleWidth+'x'+this.triangleHeight);
      triangleLeft = (canvasParams.width - this.triangleWidth) / 2;
      triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;
    }

    let xLabelOffset = (canvasParams.width - this.triangleWidth) / 4;
    if (xLabelOffset < TernaryChartModel.OUTER_PADDING) {
      xLabelOffset = TernaryChartModel.OUTER_PADDING;
    }

    // Calculate triangle and element label coordinates
    this.triangleA = new Point(triangleLeft, triangleTop + this.triangleHeight);
    this.triangleB = new Point(triangleLeft + this.triangleWidth, triangleTop + this.triangleHeight);
    this.triangleC = new Point(canvasParams.width / 2, triangleTop);
    //console.log('A:'+this.triangleA.x+','+this.triangleA.y+' B:'+this.triangleB.x+','+this.triangleB.y+' C:'+this.triangleC.x+','+this.triangleC.y+' w='+this.triangleWidth+', h='+this.triangleHeight);

    // Hover data positions
    const hoverUp = 50;
    this.hoverLabelA = new Point(this.triangleA.x + 20, this.triangleA.y - hoverUp); // left triangle point, but further up for space. Draw right-aligned!
    this.hoverLabelB = new Point(this.triangleB.x - 20, this.triangleB.y - hoverUp); // right triangle point, but further up for space
    this.hoverLabelC = new Point(this.triangleC.x + 10, this.triangleC.y); // right of top triangle point

    // Calculate data coordinates
    // We have to pad the drawn triangle based on point sizes we draw
    const dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) * 2;
    // This padding is applied into the corners of the triangle, differs in X and Y:
    const dataPaddingX = Math.cos(degToRad(30)) * dataPadding;
    const dataPaddingY = Math.sin(degToRad(30)) * dataPadding;

    this.dataAreaA = new Point(this.triangleA.x + dataPaddingX, this.triangleA.y - dataPaddingY);
    this.dataAreaWidth = this.triangleB.x - this.triangleA.x - dataPaddingX * 2;

    // Loop through and calculate x/y coordinates for each point if we have any
    makeDrawablePointGroups(raw?.pointGroups, this, beamSelection, (value: NaryChartDataItem) => {
      return this.calcPointForTernary(value);
    });
  }

  private _sin60 = Math.sin((60 * Math.PI) / 180);

  calcPointForTernary(ternaryPoint: NaryChartDataItem): PointWithRayLabel {
    const aLabel = ternaryPoint.nullMask[0] ? "null" : ternaryPoint.values[0];
    const bLabel = ternaryPoint.nullMask[1] ? "null" : ternaryPoint.values[1];
    const cLabel = ternaryPoint.nullMask[2] ? "null" : ternaryPoint.values[2];
    const isMissingCoord = ternaryPoint.nullMask.some(x => x);

    // Using https://en.wikipedia.org/wiki/Ternary_plot
    // "Plotting a ternary plot" formula
    const sum = ternaryPoint.values[0] + ternaryPoint.values[1] + ternaryPoint.values[2];

    // If we're missing 1 point, we need to normalize the other two and then make sure the missing
    // one is much larger so it skews the end point all the way to the missing corner of the triangle
    // If we're missing 2 points, this is just going to point towards the middle of the 2 missing corners
    const normalizedA = ternaryPoint.nullMask[0] ? sum * 100 : ternaryPoint.values[0] / sum;
    const normalizedB = ternaryPoint.nullMask[1] ? sum * 100 : ternaryPoint.values[1] / sum;
    const normalizedC = ternaryPoint.nullMask[2] ? sum * 100 : ternaryPoint.values[2] / sum;
    const normalizedSum = normalizedA + normalizedB + normalizedC;

    const twoD = new PointWithRayLabel(
      0.5 * ((2 * ternaryPoint.values[1] + ternaryPoint.values[2]) / sum),
      this._sin60 * (ternaryPoint.values[2] / sum),
      ternaryPoint.label ? `${ternaryPoint.label} (${aLabel}, ${bLabel}, ${cLabel})` : "",
      isMissingCoord ? 0.5 * ((2 * normalizedB + normalizedC) / normalizedSum) : null,
      isMissingCoord ? -this._sin60 * (normalizedC / normalizedSum) : null
    );

    // NOTE: y is flipped for drawing!
    twoD.y = -twoD.y;

    //console.log('twoD: '+twoD.x+','+twoD.y);

    // This fits an equilateral triangle of side length=1. We need to scale it to our triangle size, so we need
    // to scale it. Triangle width and height are not equal, but our scale factor should be... we need the size=1
    // triangle to scale up to our triangle size, which has a side length of triangleWidth
    const scaled = scaleVector(twoD, this.dataAreaWidth);
    if (twoD.endX !== null && twoD.endY !== null) {
      const scaledEnd = scaleVector(new Point(twoD.endX, twoD.endY), this.dataAreaWidth);
      twoD.endX = scaledEnd.x;
      twoD.endY = scaledEnd.y;
    }

    // Now translate it so it starts where our triangle starts
    const result = new PointWithRayLabel(scaled.x, scaled.y, twoD.label, twoD.endX, twoD.endY);

    result.x += this.dataAreaA.x;
    result.y += this.dataAreaA.y;

    if (result.endX !== null) {
      result.endX += this.dataAreaA.x;
    }
    if (result.endY !== null) {
      result.endY += this.dataAreaA.y;
    }

    return result;
  }
}

/*
export class TernaryPlotPointIndex {
  constructor(
    public pointGroup: number,
    public valueIndex: number
  ) {}
}
*/
export class TernaryData {
  constructor(
    public cornerA: ScatterPlotAxisInfo,
    public cornerB: ScatterPlotAxisInfo,
    public cornerC: ScatterPlotAxisInfo,
    public pointGroups: NaryChartDataGroup[] //public pmcToValueLookup: Map<number, TernaryPlotPointIndex>
  ) {}
}
