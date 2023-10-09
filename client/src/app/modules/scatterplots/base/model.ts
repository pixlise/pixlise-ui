import { Subject } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { MinMax } from "src/app/models/BasicTypes";
import { Point } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { RGBA, Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, PointDrawer } from "src/app/utils/drawing";
import { CursorId } from "../../analysis/components/widget/interactive-canvas/cursor-id";
import { CanvasDrawNotifier, CanvasParams } from "../../analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanZoom, PanRestrictorToCanvas } from "../../analysis/components/widget/interactive-canvas/pan-zoom";
import { WidgetDataIds, ScanDataIds } from "../../pixlisecore/models/widget-data-source";
import { WidgetKeyItem, RegionDataResults, ExpressionReferences } from "../../pixlisecore/pixlisecore.module";
import { ScatterPlotAxisInfo } from "../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { BaseChartDataItem, BaseChartDataValueItem, BaseChartDrawModel, BaseChartModel } from "./model-interfaces";

export class NaryChartDataItem implements BaseChartDataValueItem {
  constructor(
    public scanEntryId: number, // Aka PMC, id that doesn't change on scan for a data point source (spectrum id)
    public values: number[],
    public nullMask: boolean[] = [],
    public label: string = ""
  ) {}
}

export class NaryChartDataGroup implements BaseChartDataItem {
  constructor(
    // This group contains data for the following ROI within the following scan:
    public scanId: string,
    public roiId: string,

    // It contains these values to show:
    public valuesPerScanEntry: NaryChartDataItem[],

    // And these are the draw settings for the values:
    public colour: RGBA,
    public shape: string,

    // A reverse lookup from scan entry Id (aka PMC) to the values array
    // This is mainly required for selection service hover notifications, so
    // we can quickly find the valus to display
    public scanEntryIdToValueIdx: Map<number, number>
  ) {}
}

export abstract class NaryChartModel<RawModel, DrawModel extends BaseChartDrawModel> implements CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());

  // All expressions required
  expressionIds: string[] = [];

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  // Settings of the binary chart
  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // Some commonly used constants
  public static readonly OUTER_PADDING = 10;
  public static readonly LABEL_PADDING = 4;
  public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE - 1;

  // The raw data we start with
  protected _raw: RawModel | null = null;

  // Mouse interaction drawing
  hoverPoint: Point | null = null;
  hoverScanId: string = "";
  hoverPointData: NaryChartDataItem | null = null;
  hoverShape: string = PointDrawer.ShapeCircle;

  cursorShown: string = CursorId.defaultPointer;
  mouseLassoPoints: Point[] = [];

  keyItems: WidgetKeyItem[] = [];
  expressionsMissingPMCs: string = "";

  private _references: string[] = [];

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  // The drawable data (this will derive its data from the raw model)
  constructor(protected _drawModel: DrawModel) {}

  hasRawData(): boolean {
    return this._raw != null;
  }

  get raw(): RawModel | null {
    return this._raw;
  }

  get drawModel(): DrawModel {
    return this._drawModel;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerateDrawModel(this._raw, canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  // For now an ugly solution that makes this compile...
  // Will need to call this._drawModel.regenerate(this._raw, canvasParams);
  protected abstract regenerateDrawModel(raw: RawModel | null, canvasParams: CanvasParams): void;

  // Should just call this.processQueryResult, providing axis infoss along with the results
  abstract setData(data: RegionDataResults): void;

  protected processQueryResult(
    chartName: string, // Expecting Binary or Ternary here, just used in error msgs
    queryData: RegionDataResults,
    axes: ScatterPlotAxisInfo[]
  ) {
    const t0 = performance.now();

    this.keyItems = [];
    this.expressionsMissingPMCs = "";

    const pointGroups: NaryChartDataGroup[] = [];

    const queryWarnings: string[] = [];

    for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx += this.expressionIds.length) {
      // Set up storage for our data first
      const scanId = queryData.queryResults[queryIdx].query.scanId;
      const roiId = queryData.queryResults[queryIdx].query.roiId;
      const region = queryData.queryResults[queryIdx].region;

      let pointGroup: NaryChartDataGroup | null = null;

      // Filter out PMCs that don't exist in the data for all axes
      const toFilter: PMCDataValues[] = [];
      for (let c = 0; c < this.expressionIds.length; c++) {
        toFilter.push(queryData.queryResults[queryIdx + c].values);

        if (queryData.queryResults[queryIdx + c].warning) {
          queryWarnings.push(queryData.queryResults[queryIdx + c].warning);
        }
      }

      const filteredValues = PMCDataValues.filterToCommonPMCsOnly(toFilter);

      // Read for each expression
      for (let c = 0; c < this.expressionIds.length; c++) {
        // Read the name
        const expr = queryData.queryResults[queryIdx + c].expression;
        axes[c].label = getExpressionShortDisplayName(18, expr?.id || "", expr?.name || "?").shortName;

        const mmolAppend = "(mmol)";
        if (this.showMmol && !axes[c].label.endsWith(mmolAppend)) {
          // Note this won't detect if (mmol) was modified by short name to be (mm...
          axes[c].label += mmolAppend;
        }

        // TODO!!!
        //axes[c].modulesOutOfDate = queryData.queryResults[queryIdx + c].expression?.moduleReferences || "?";

        // Did we find an error with this query?
        if (queryData.queryResults[queryIdx + c].error) {
          axes[c].errorMsgShort = queryData.queryResults[queryIdx + c].errorType || "";
          axes[c].errorMsgLong = queryData.queryResults[queryIdx + c].error || "";

          console.error(
            `${chartName} encountered error with expression: ${this.expressionIds[c]}, on region: ${roiId}, axes: ${c == 0 ? "left" : c == 1 ? "top" : "right"}`
          );
          continue;
        }

        // Expression didn't have errors, so try read its values
        if (!region) {
          // Show an error, we clearly don't have region data ready
          axes[c].errorMsgShort = "Region error";
          axes[c].errorMsgLong = "Region data not found for: " + roiId;

          console.error(axes[c].errorMsgLong);
          continue;
        }

        if (!pointGroup) {
          // Reading the region for the first time, create a point group and key entry
          pointGroup = new NaryChartDataGroup(
            scanId,
            roiId,
            [],
            RGBA.fromWithA(region.displaySettings.colour, 1),
            region.displaySettings.shape,
            new Map<number, number>()
          );

          // Add to key too. We only specify an ID if it can be brought to front - all points & selection
          // are fixed in their draw order, so don't supply for those
          let roiIdForKey = region.region.id;
          if (PredefinedROIID.isPredefined(roiIdForKey)) {
            roiIdForKey = "";
          }

          this.keyItems.push(new WidgetKeyItem(roiIdForKey, region.region.name, region.displaySettings.colour, [], region.displaySettings.shape));
        }

        const roiValues: PMCDataValues | null = filteredValues[c];
        if (roiValues) {
          // Update axis min/max
          axes[c].valueRange.expandByMinMax(roiValues.valueRange);

          // Store the A/B/C values
          for (let i = 0; i < roiValues.values.length; i++) {
            const value = roiValues.values[i];

            // Save it in A, B or C - A also is creating the value...
            if (c == 0) {
              pointGroup.valuesPerScanEntry.push(new NaryChartDataItem(value.pmc, [value.value, 0, 0]));
              pointGroup.scanEntryIdToValueIdx.set(value.pmc, pointGroup.valuesPerScanEntry.length - 1);
            } else {
              // Ensure we're writing to the right PMC
              // Should always be the right order because we run 3 queries with the same ROI
              if (pointGroup.valuesPerScanEntry[i].scanEntryId != value.pmc) {
                throw new Error(
                  `Received PMCs in unexpected order for ${chartName} axis: ${c}, got PMC: ${value.pmc}, expected: ${pointGroup.valuesPerScanEntry[i].scanEntryId}`
                );
              }

              pointGroup.valuesPerScanEntry[i].values[c] = value.value;
            }
          }
        }
      }

      // TODO: we may need to store PMC vs location index lookups like we did here:
      /*
        for (let c = 0; c < pointGroup.values.length; c++) {
          pmcLookup.set(pointGroup.values[c].scanEntryId, new TernaryPlotPointIndex(pointGroups.length, c));
        }
      */

      if (pointGroup && pointGroup.valuesPerScanEntry.length > 0) {
        pointGroups.push(pointGroup);
      }
    }

    if (this._references.length > 0) {
      const refGroup = this.makeReferenceGroup(chartName);
      if (refGroup) {
        pointGroups.push(refGroup);
        this.keyItems.push(new WidgetKeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, [], PointDrawer.ShapeCircle));
      }
    }

    if (queryWarnings.length > 0) {
      this.expressionsMissingPMCs = queryWarnings.join("\n");
    }

    // If we had all points defined, add to the key. This is done here because the actual
    // dataByRegion array would contain 2 of the same IDs if all points is turned on - one
    // for all points, one for selection... so if we did it in the above loop we'd double up
    /*        if(hadAllPoints)
        {
            this.keyItems.unshift(new KeyItem(ViewStateService.SelectedPointsLabel, ViewStateService.SelectedPointsColour));
            this.keyItems.unshift(new KeyItem(ViewStateService.AllPointsLabel, ViewStateService.AllPointsColour));
        }
  */
    this._raw = this.makeData(axes, pointGroups); //, pmcLookup);

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log(`  ${chartName} prepareData took: ${(t1 - t0).toLocaleString()}ms, needsDraw$ took: ${(t2 - t1).toLocaleString()}ms`);

    this._recalcNeeded = true;
  }

  private makeReferenceGroup(chartName: string) {
    const refPointGroup: NaryChartDataGroup = new NaryChartDataGroup("", "", [], Colours.CONTEXT_PURPLE, PointDrawer.ShapeCircle, new Map<number, number>());

    this._references.forEach((referenceName, i) => {
      const reference = ExpressionReferences.getByName(referenceName);

      if (!reference) {
        console.error(`${chartName}: Couldn't find reference ${referenceName}`);
        return;
      }

      const refValues: number[] = [];
      const nullMask: boolean[] = [];
      for (const exprId of this.expressionIds) {
        let ref = ExpressionReferences.getExpressionValue(reference, exprId)?.weightPercentage || null;
        if (ref === null) {
          ref = 0;
          console.warn(`${chartName}: Reference ${referenceName} has undefined value for expression: ${exprId}`);
        }

        refValues.push(ref);
        nullMask.push(ref === null);
      }

      // We don't have a PMC for these, so -10 and below are now reserverd for reference values
      const referenceIndex = ExpressionReferences.references.findIndex(ref => ref.name === referenceName);
      const id = -10 - referenceIndex;

      refPointGroup.valuesPerScanEntry.push(new NaryChartDataItem(id, refValues, nullMask, referenceName));
      // TODO: if we put back the PMC->location index lookup, we need an entry here too
      //pmcLookup.set(id, new TernaryPlotPointIndex(this._references.length, i));
    });

    return refPointGroup;
  }

  protected abstract makeData(axes: ScatterPlotAxisInfo[], pointGroups: NaryChartDataGroup[]): RawModel;
}
