import { MinMax } from "src/app/models/BasicTypes";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Point, Rect } from "src/app/models/Geometry";
import { CANVAS_FONT_SIZE, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { Subject } from "rxjs";
import { WidgetDataIds, ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { RegionDataResults } from "src/app/modules/pixlisecore/pixlisecore.module";
import { getPearsonCorrelation, httpErrorToString } from "src/app/utils/utils";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { DataExpression } from "src/app/generated-protos/expressions";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";

export class ChordDiagramModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  // The raw data we start with
  private _raw: ChordDiagramData | null = null;

  // The drawable data (derived from the above)
  private _drawModel: ChordDiagramDrawModel = new ChordDiagramDrawModel();

  expressionIds: string[] = [];

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  // Settings
  drawForSelection: boolean = false;
  private _drawMode: ChordDrawMode = ChordDrawMode.BOTH;
  private _threshold: number = 0;

  // Hovering displays only the connections to the node you're over
  hoverElementIdx = -1;
  hoverChordExprIds: string[] = [];

  // If user clicks on hovered node, the view freezes this way
  selectedElementIdx: number = -1;

  cursorShown: string = CursorId.defaultPointer;
  errorMessage: string = "";

  hasRawData(): boolean {
    return this._raw != null;
  }

  get raw(): ChordDiagramData | null {
    return this._raw;
  }

  get drawModel(): ChordDiagramDrawModel {
    return this._drawModel;
  }

  get threshold(): number {
    return this._threshold;
  }

  set threshold(value: number) {
    this._threshold = value;
    this._recalcNeeded = true;
  }

  get drawMode(): ChordDrawMode {
    return this._drawMode;
  }

  set drawMode(value: ChordDrawMode) {
    this._drawMode = value;
    this._recalcNeeded = true;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this._drawModel.regenerate(this._raw, canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  // Returns error msg if one is generated
  setData(queryData: RegionDataResults): WidgetError[] {
    const errResult: WidgetError[] = [];
    const t0 = performance.now();

    this._recalcNeeded = true;

    // TODO: David says we can probably average A and B values here

    try {
      if (queryData.error) {
        throw new Error(queryData.error);
      }

      if (queryData.queryResults.length <= 1) {
        throw new Error("Chord diagram needs at least 2 nodes");
      }

      // Here we expect all query results to be for the same ROI, quant, but different expressions. Error if not so
      // Also check that all responses have data/no errors
      for (let c = 0; c < queryData.queryResults.length; c++) {
        const result = queryData.queryResults[c];
        if (result.error) {
          throw new Error(`Node expression ${result.identity()} error: ${result.error.message}. Description: ${result.error.description}`);
        }

        if (!result.expression) {
          throw new Error(`Node expression ${result.identity()} failed to be read`);
        }

        if (!result.region) {
          throw new Error(`Node with expression ${result.identity()} failed to find region ${result.query.roiId}`);
        }

        if (!result.isPMCTable) {
          throw new Error(`Node with expression ${result.identity()} did not return data in correct format`);
        }

        if (result.values.values.length <= 0) {
          throw new Error(`Node with expression ${result.identity()} did not return data`);
        }

        if (
          c > 0 &&
          (result.query.quantId != queryData.queryResults[0].query.quantId ||
            result.query.roiId != queryData.queryResults[0].query.roiId ||
            result.query.scanId != queryData.queryResults[0].query.scanId)
        ) {
          throw new Error("Queried data expected to have the same ROI and Quantification for all nodes");
        }

        if (c > 0 && result.values.values.length != queryData.queryResults[0].values.values.length) {
          throw new Error("Queried data expected to all have the same number of points for all nodes");
        }
      }

      const elemColumns: Map<string, number[]> = new Map<string, number[]>();
      const elemColumnTotals: Map<string, number> = new Map<string, number>();
      const elemColumnError: Map<string, number> = new Map<string, number>();

      // TODO: bring back display warning for module out of date
      //const expressionsOutOfDate: Map<string, boolean> = new Map<string, boolean>();

      let allTotals = 0;
      let rowCount = 0;

      // Build an expression lookup map (from query results)
      const expressionLookup = new Map<string, DataExpression>();
      for (const query of queryData.queryResults) {
        expressionLookup.set(query.query.exprId, query.expression);
      }

      for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx++) {
        const colData = queryData.queryResults[queryIdx];
        const exprId = colData.query.exprId;

        //expressionsOutOfDate.set(exprId, colData?.expression?.checkModuleReferences(this._moduleService) ?? false);

        // NOTE: values won't be empty by now, we checked for that above
        const concentrationCol = colData.values;
        rowCount = concentrationCol.values.length;

        let errorCol: PMCDataValues | null = null;

        const elem = DataExpressionId.getPredefinedQuantExpressionElement(exprId);
        if (elem.length) {
          errorCol = queryData.queryResults[queryIdx + 1].values;

          // skip next column, as we're reading it together with this one
          queryIdx++;
        }

        // Calc sum of concentrations and read out column into an array
        let concentrationSum = 0;
        const concentrationValues: number[] = [];
        let errorSum = 0;

        for (let c = 0; c < concentrationCol.values.length; c++) {
          const concentration = concentrationCol.values[c].value;
          concentrationSum += concentration;
          concentrationValues.push(concentration);

          if (errorCol) {
            errorSum += errorCol.values[c].value;
          }
        }

        let avgError = 0;
        if (errorCol && errorCol.values && errorCol.values.length > 0) {
          avgError = errorSum / errorCol.values.length;
        }

        elemColumns.set(exprId, concentrationValues);
        elemColumnTotals.set(exprId, concentrationSum);
        elemColumnError.set(exprId, avgError);

        allTotals += concentrationSum;
      }

      // Build correlation matrix between elements
      //let corrMatrix = jz.arr.correlationMatrix(quantdata, quant.getElements());

      // Loop through each expr and calculate the correlation for each other expr array
      const rawNodes: ChordNodeData[] = [];
      for (const exprId of this.expressionIds) {
        const expr = expressionLookup.get(exprId);
        const exprTotal = elemColumnTotals.get(exprId);
        let errorMsg = "";
        const names = getExpressionShortDisplayName(10, exprId, expr?.name || "");

        let concentration = 0;
        let dispConcentration = 0;
        let error: number | undefined = 0;

        if (exprTotal == undefined) {
          // We don't have data for this, probably an issue with the expression specified, just skip over it
          errorMsg = "No data found, does this exist in quantification?";
        } else {
          concentration = exprTotal / allTotals;
          dispConcentration = exprTotal / rowCount;
          error = elemColumnError.get(exprId) || 0;
        }

        //console.log(elem+' error='+error+', %='+concentration);
        const item = new ChordNodeData(
          names.shortName,
          names.name,
          exprId,
          concentration,
          dispConcentration,
          error,
          [],
          errorMsg,
          false /*expressionsOutOfDate.get(exprId)*/
        );

        // Add chords
        // NOTE: We add a chord value for every node. This means the drawing code has a value for all and we don't
        //       need to store a from-to index or anything. However, if you leave one out, drawing code will connect
        //       lines between the wrong nodes!
        for (const otherExprId of this.expressionIds) {
          let otherCols = elemColumns.get(otherExprId);
          if (!otherCols) {
            otherCols = [];
          }

          let elemCol = elemColumns.get(exprId);
          if (!elemCol) {
            elemCol = [];
          }

          let correlation: number | null = 0;
          if (exprId != otherExprId) {
            correlation = getPearsonCorrelation(elemCol, otherCols);
          }

          //console.log('add chord to: '+item.label+', other: '+otherExprId+', thisExpr: '+exprId+', correlation='+correlation);
          if (correlation != null) {
            item.chords.push(correlation);
          }
        }

        rawNodes.push(item);
      }

      this._raw = rawNodes;
    } catch (err) {
      if (err instanceof WidgetError) {
        errResult.push(err as WidgetError);
      } else {
        errResult.push(new WidgetError(httpErrorToString(err, "Chord diagram"), ""));
      }
    }

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log(`  Chord processQueryResult took: ${(t1 - t0).toLocaleString()}ms, needsDraw$ took: ${(t2 - t1).toLocaleString()}ms`);
    return errResult;
  }
}

export class ChordNodeData {
  constructor(
    public label: string,
    public longLabel: string,
    public exprId: string,
    public value: number,
    public displayValue: number,
    public errorValue: number,
    public chords: number[], // Assumes the array is ordered in the same way the actual ChordNodeData list is
    // so if Fe is first in ChordNodeData[], links[0] is Fe
    public errorMsg: string,
    public modulesOutOfDate: boolean = false
  ) {}
}

export type ChordDiagramData = ChordNodeData[];

export enum ChordDrawMode {
  BOTH = "BOTH",
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

export class ChordViewNode {
  constructor(
    public coord: Point,
    public labelRect: Rect,
    public radius: number,
    public valuePct: number,
    public errorPct: number,
    public item: ChordNodeData
  ) {}
}

export class ChordDiagramDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  //drawnData: OffscreenCanvas | null = null;

  public static readonly BASE_SIZE = 1;
  //public static readonly NODE_RADIUS = 10*ChordDiagramDrawModel.BASE_SIZE;
  public static readonly MAX_CHORD_WIDTH = 10 * ChordDiagramDrawModel.BASE_SIZE; //ChordDiagramDrawModel.NODE_RADIUS;
  private OUTER_PADDING = 8 * ChordDiagramDrawModel.BASE_SIZE;
  public static readonly NODE_VALUE_DRAW_LENGTH = 20 * ChordDiagramDrawModel.BASE_SIZE;
  public static readonly NODE_CHAR_WIDTH = CANVAS_FONT_SIZE * CANVAS_FONT_WIDTH_PERCENT;
  public static readonly NODE_LABEL_PADDING_X = 2;
  public static readonly NODE_LABEL_PADDING_Y = 4;

  nodes: ChordViewNode[] = [];
  maxChordValueMagnitude: number = 0;

  regenerate(chordNodes: ChordDiagramData | null, canvasParams: CanvasParams): void {
    this.nodes = [];

    if (!chordNodes) {
      return;
    }

    let c = 0;
    const segmentAngle = (-2 * Math.PI) / chordNodes.length;
    const segmentAngleStart = Math.PI + segmentAngle;

    const diagramRadius = Math.min(canvasParams.height, canvasParams.width) / 2;
    const centreOffset = canvasParams.getCenterPoint();

    let maxValue = chordNodes[0].value;
    for (const item of chordNodes) {
      if (item.value > maxValue) {
        maxValue = item.value;
      }
    }

    const nodePosRadius = diagramRadius - /*ChordDiagramDrawModel.NODE_RADIUS-*/ ChordDiagramDrawModel.NODE_VALUE_DRAW_LENGTH - this.OUTER_PADDING;

    if (nodePosRadius < 0) {
      // Way too small, just give up!
      return;
    }

    let maxChordValue = 0;
    let minChordValue = 0;

    const nodeXExtents = new MinMax();
    const nodeYExtents = new MinMax();

    // They're allowed to overlap for eg if 2 neighbours are close to max value. So the size limit is how
    // many nodes, and the Y height of the chord node circle
    const maxNodeRadius = nodePosRadius / 2;

    for (const item of chordNodes) {
      // Calculate its coordinates
      const x = Math.sin(c * segmentAngle + segmentAngleStart);
      const y = Math.cos(c * segmentAngle + segmentAngleStart);

      let valuePct = item.value;
      if (maxValue != 0) {
        valuePct /= maxValue;
      }

      let errorPct = item.errorValue / 100;
      if (errorPct > 1) {
        errorPct = 1;
      }

      const nodePos = new Point(Math.floor(x * nodePosRadius + centreOffset.x), Math.floor(y * nodePosRadius + centreOffset.y));
      const labelRect = new Rect(
        nodePos.x,
        nodePos.y,
        item.label.length * ChordDiagramDrawModel.NODE_CHAR_WIDTH + ChordDiagramDrawModel.NODE_LABEL_PADDING_X * 2,
        CANVAS_FONT_SIZE + ChordDiagramDrawModel.NODE_LABEL_PADDING_Y * 2
      );

      nodeXExtents.expand(nodePos.x);
      nodeYExtents.expand(nodePos.y);

      // Store this node
      // NOTE: 100% value is maxNodeRadius, below that it varies by area of circle not radius, so visually
      // it looks more comparable by area
      // Factored out pi here to save calculations...
      const maxArea = /*Math.PI**/ maxNodeRadius * maxNodeRadius;

      // This area is a percentage of the above
      const thisArea = valuePct * maxArea;

      // Calculate radius
      // A=pi*r*r
      // r=sqrt(A/pi)
      const thisRadius = Math.sqrt(thisArea /*/Math.PI*/);

      this.nodes.push(new ChordViewNode(nodePos, labelRect, thisRadius, valuePct, errorPct, item));

      // Remember min/max values
      maxChordValue = Math.max(maxChordValue, ...item.chords);
      minChordValue = Math.min(minChordValue, ...item.chords);

      c++;
    }

    // Recalculate label positions so they're outside and near the nodes
    for (const node of this.nodes) {
      //let pctX = nodeXExtents.getAsPercentageOfRange(node.coord.x, false);

      // Offset so it's in the middle near 0.5, left starts at right edge, right starts at left edge
      //node.labelRect.x += node.labelRect.w*(pctX-0.5)-node.labelRect.w/2;
      node.labelRect.x -= node.labelRect.w / 2;
      // Label y-pos should center over the node circle
      node.labelRect.y -= node.labelRect.h / 2;
    }

    this.maxChordValueMagnitude = Math.max(Math.abs(minChordValue), Math.abs(maxChordValue));
  }

  getChordWidthPx(chordValue: number): number {
    return (Math.abs(chordValue) / this.maxChordValueMagnitude) * ChordDiagramDrawModel.MAX_CHORD_WIDTH;
  }
}
