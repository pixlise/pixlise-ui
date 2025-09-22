import { Observable, of, ReplaySubject, Subject } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { MinMax } from "src/app/models/BasicTypes";
import { Point, PointWithRayLabel } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { RGBA, Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, PointDrawer } from "src/app/utils/drawing";
import { CursorId } from "../../widget/components/interactive-canvas/cursor-id";
import { CanvasDrawNotifier, CanvasParams } from "../../widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom, PanRestrictorToCanvas } from "../../widget/components/interactive-canvas/pan-zoom";
import { WidgetDataIds, ScanDataIds } from "../../pixlisecore/models/widget-data-source";
import { WidgetKeyItem, RegionDataResults, ExpressionReferences } from "../../pixlisecore/pixlisecore.module";
import { ScatterPlotAxisInfo } from "../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { BaseChartDataItem, BaseChartDataValueItem, BaseChartDrawModel, BaseChartModel } from "./model-interfaces";
import { WidgetError } from "src/app/modules/pixlisecore/models/widget-data-source";
import { BeamSelection } from "../../pixlisecore/models/beam-selection";
import { invalidPMC } from "src/app/utils/utils";
import { ScanItem } from "../../../generated-protos/scan";

export class NaryChartDataItem implements BaseChartDataValueItem {
  constructor(
    public scanEntryId: number, // Aka PMC, id that doesn't change on scan for a data point source (spectrum id)
    public values: number[],
    public nullMask: boolean[] = [],
    public label: string = ""
  ) {}
}

export class NaryChartDataGroup implements BaseChartDataItem {
  // A reverse lookup from scan entry Id (aka PMC) to the values array
  // This is mainly required for selection service hover notifications, so
  // we can quickly find the valus to display
  public scanEntryPMCToValueIdx: Map<number, number> = new Map<number, number>();

  constructor(
    // This group contains data for the following ROI within the following scan:
    public scanId: string,
    public roiId: string,

    // It contains these values to show:
    public valuesPerScanEntry: NaryChartDataItem[],

    // And these are the draw settings for the values:
    public colour: RGBA,
    public shape: string
  ) {}
}

export interface NaryData {
  get pointGroups(): NaryChartDataGroup[];
}

export interface DrawModelWithPointGroup extends BaseChartDrawModel {
  pointGroupCoords: PointWithRayLabel[][];
  totalPointCount: number;

  // Selection is handled separately, so here we have an array (per group) of booleans saying
  // whether that item is selected or not. When drawing we draw first with the non-selected points
  // (which are in the same pointGroupCoords array because if we remove them, indexes screw up and
  // selection won't be able to find the right points). We then draw the selectedPointGroupCoords
  // in selection colour at the end (so we draw over all the other points)
  isNonSelectedPoint: boolean[][];
  selectedPointGroupCoords: PointWithRayLabel[][];
}

export function makeDrawablePointGroups(
  fromPointGroups: NaryChartDataGroup[] | undefined,
  forDrawModel: DrawModelWithPointGroup,
  beamSelection: BeamSelection,
  makePointFunc: (item: NaryChartDataItem) => PointWithRayLabel
) {
  forDrawModel.pointGroupCoords = [];
  forDrawModel.isNonSelectedPoint = [];
  forDrawModel.selectedPointGroupCoords = [];

  const shapesPerScan = new Map<string, string>();
  if (fromPointGroups) {
    for (const group of fromPointGroups) {
      shapesPerScan.set(group.scanId, group.shape);

      const selectedPMCs = beamSelection.getSelectedScanEntryPMCs(group.scanId);

      const coords: PointWithRayLabel[] = [];
      const selectedCoords: PointWithRayLabel[] = [];
      const notSelected: boolean[] = [];

      for (let c = 0; c < group.valuesPerScanEntry.length; c++) {
        const value = group.valuesPerScanEntry[c];
        const coord = makePointFunc(value);
        const isSelected = selectedPMCs.has(value.scanEntryId);
        notSelected.push(!isSelected);

        if (isSelected) {
          // It's selected, store its coordinates in the selected points array
          selectedCoords.push(coord);
        }

        coords.push(coord);
      }

      forDrawModel.pointGroupCoords.push(coords);
      forDrawModel.isNonSelectedPoint.push(notSelected);
      forDrawModel.totalPointCount += coords.length;

      forDrawModel.selectedPointGroupCoords.push(selectedCoords);
    }
  }
}

export abstract class NaryChartModel<RawModel extends NaryData, DrawModel extends DrawModelWithPointGroup> implements CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();
  needsCanvasResize$: Subject<void> = new Subject<void>();
  resolution$: ReplaySubject<number> = new ReplaySubject<number>(1);
  borderWidth$: ReplaySubject<number> = new ReplaySubject<number>(1);

  borderColor: string = "";

  axisLabelFontSize: number = 14;
  axisLabelFontFamily: string = "Arial";
  axisLabelFontWeight: string = "";
  axisLabelFontColor: string = "";

  exportMode: boolean = false;

  transform: PanZoom = new PanZoom(new MinMax(1, null), new MinMax(1, null), new PanRestrictorToCanvas());

  // All expressions required
  expressionIds: string[] = [];

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  // Settings of the binary chart
  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  public static readonly SELECT_ADD = "add";
  public static readonly SELECT_SUBTRACT = "subtract";
  public static readonly SELECT_RESET = "reset";

  selectionMode: string = NaryChartModel.SELECT_RESET;

  // Some commonly used constants
  public static readonly OUTER_PADDING = 10;
  public static readonly LABEL_PADDING = 4;
  public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE - 1;

  // The raw data we start with
  protected _raw: RawModel | null = null;

  // Selection
  protected _beamSelection: BeamSelection = BeamSelection.makeEmptySelection();

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

  get beamSelection(): BeamSelection {
    return this._beamSelection;
  }

  handleSelectionChange(beamSelection: BeamSelection) {
    this._beamSelection = beamSelection;
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  recalculate() {
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  handleHoverPointChanged(hoverScanId: string, hoverScanEntryPMC: number): void {
    // Hover point changed, if we have a model, set it and redraw, otherwise ignore
    if (hoverScanEntryPMC == invalidPMC) {
      // Clearing, easy case
      this.hoverPoint = null;
      this.hoverScanId = "";
      this.hoverPointData = null;
      this.hoverShape = PointDrawer.ShapeCircle;
      this.needsDraw$.next();
      return;
    }

    // Find the point in our draw model data
    if (this._raw) {
      for (let groupIdx = 0; groupIdx < this._raw.pointGroups.length; groupIdx++) {
        const group = this._raw.pointGroups[groupIdx];

        if (group.scanId == hoverScanId) {
          const hoverValIndex = group.scanEntryPMCToValueIdx.get(hoverScanEntryPMC);
          if (hoverValIndex !== undefined) {
            // Find data to show
            const coords = this.drawModel.pointGroupCoords[groupIdx];

            if (coords && coords.length >= hoverValIndex && coords[hoverValIndex]) {
              this.hoverPoint = coords[hoverValIndex];
              this.hoverScanId = hoverScanId;
              this.hoverPointData = group.valuesPerScanEntry[hoverValIndex];
              this.hoverShape = group.shape;
              this.needsDraw$.next();
            }
          }
          return;
        }
      }
    }
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): Observable<void> {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerateDrawModel(this._raw, canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
    return of(void 0);
  }

  // For now an ugly solution that makes this compile...
  // Will need to call this._drawModel.regenerate(this._raw, canvasParams);
  protected abstract regenerateDrawModel(raw: RawModel | null, canvasParams: CanvasParams): void;

  // Should just call this.processQueryResult, providing axis infoss along with the results
  abstract setData(data: RegionDataResults): WidgetError[];

  protected processQueryResult(
    chartName: string, // Expecting Binary or Ternary here, just used in error msgs
    queryData: RegionDataResults,
    axes: ScatterPlotAxisInfo[],
    scanItems: ScanItem[] = []
  ): WidgetError[] {
    const errs: WidgetError[] = [];
    const t0 = performance.now();

    const previousKeyItems = this.keyItems.slice();

    this.keyItems = [];
    this.expressionsMissingPMCs = "";

    const pointGroups: NaryChartDataGroup[] = [];

    const queryWarnings: string[] = [];

    for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx += this.expressionIds.length) {
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
      let firstPointGroup = true;
      for (let c = 0; c < this.expressionIds.length; c++) {
        const scanId = queryData.queryResults[queryIdx + c].query.scanId;
        const roiId = queryData.queryResults[queryIdx + c].query.roiId;
        const region = queryData.queryResults[queryIdx + c].region;

        const selectedPMCs = this._beamSelection.getSelectedScanEntryPMCs(scanId);
        const selectionId = "selection";
        if (selectedPMCs.size > 0 && this.keyItems.find(key => key.id === selectionId) === undefined) {
          this.keyItems.push(new WidgetKeyItem(selectionId, "Selected Points", Colours.CONTEXT_BLUE, null, PointDrawer.ShapeCircle));
        }

        // // Add selection per scan if we have selected points
        // const selectedPMCs = this._beamSelection.getSelectedScanEntryPMCs(scanId);
        // let selectionId = PredefinedROIID.getSelectedPointsForScan(scanId);
        // if (selectedPMCs.size > 0 && this.keyItems.find(key => key.id === selectionId) === undefined) {
        //   // Add the selected PMCs to the selection
        //   let scanName = scanItems.find(scan => scan.id == scanId)?.title || scanId;
        //   this.keyItems.push(new WidgetKeyItem(selectionId, "Selected Points", Colours.CONTEXT_BLUE, null, PointDrawer.ShapeCircle, scanName));
        // }

        const existingKeyItem = previousKeyItems.find(key => key.id == roiId);
        if (existingKeyItem && !existingKeyItem.isVisible) {
          // This ROI is hidden, so we won't be drawing it, but we need to keep it in the key
          if (!this.keyItems.find(key => key.id == roiId)) {
            this.keyItems.push(existingKeyItem);
          }
          continue;
        }

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
        const qryErr = queryData.queryResults[queryIdx + c]?.error;
        if (qryErr) {
          axes[c].errorMsgShort = qryErr?.message || "";
          axes[c].errorMsgLong = qryErr?.description || "";

          const err = new WidgetError(`${chartName} ${this.axisName(c)} axis error for ${queryData.queryResults[queryIdx + c].identity()}`, axes[c].errorMsgLong);

          console.error(err);
          errs.push(err);
          continue;
        }

        // Expression didn't have errors, so try read its values
        if (!region) {
          // Show an error, we clearly don't have region data ready
          axes[c].errorMsgShort = "Region error";
          axes[c].errorMsgLong = "Region data not found for: " + roiId;

          const err = new WidgetError(
            `${chartName} ${this.axisName(c)} axis region missing for ${queryData.queryResults[queryIdx + c].identity()}`,
            axes[c].errorMsgLong
          );

          console.error(err);
          errs.push(err);
          continue;
        }

        if (!pointGroup) {
          // Reading the region for the first time, create a point group and key entry
          pointGroup = new NaryChartDataGroup(scanId, roiId, [], RGBA.fromWithA(region.displaySettings.colour, 1), region.displaySettings.shape);

          // Add to key too. We only specify an ID if it can be brought to front - all points & selection
          // are fixed in their draw order, so don't supply for those
          const roiIdForKey = region.region.id;
          let keyName = region.region.name;
          if (PredefinedROIID.isAllPointsROI(roiIdForKey)) {
            keyName = "All Points";
          }

          if (!roiIdForKey || !this.keyItems.find(key => key.id == roiIdForKey)) {
            const scanName = scanItems.find(scan => scan.id == scanId)?.title || scanId;
            this.keyItems.push(new WidgetKeyItem(roiIdForKey, keyName, region.displaySettings.colour, null, region.displaySettings.shape, scanName));
          }
        }

        const roiValues: PMCDataValues | null = filteredValues[c];
        if (roiValues) {
          // Update axis min/max
          axes[c].valueRange.expandByMinMax(roiValues.valueRange);

          // Store the A/B/C values
          for (let i = 0; i < roiValues.values.length; i++) {
            const value = roiValues.values[i];

            // Save it in A, B or C - A also is creating the value...
            if (firstPointGroup) {
              pointGroup.valuesPerScanEntry.push(new NaryChartDataItem(value.pmc, [value.value]));

              // Also add it to the PMC lookup map
              pointGroup.scanEntryPMCToValueIdx.set(value.pmc, i);
            } else {
              // Ensure we're writing to the right PMC
              // Should always be the right order because we run 3 queries with the same ROI
              if (pointGroup.valuesPerScanEntry[i].scanEntryId != value.pmc) {
                throw new Error(
                  `${chartName} ${this.axisName(c)} axis received PMCs in unexpected order. Got PMC: ${value.pmc}, expected: ${
                    pointGroup.valuesPerScanEntry[i].scanEntryId
                  }`
                );
              }

              pointGroup.valuesPerScanEntry[i].values.push(value.value);
            }
          }
        }

        firstPointGroup = false;
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
        this.keyItems.push(new WidgetKeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, null, PointDrawer.ShapeCircle));
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

    // If previousKeyItems were sorted, sort the new ones following the layerOrder
    const sortedPointGroups = pointGroups.sort((a, b) => {
      const keyItemA = previousKeyItems.find(key => key.id == a.roiId);
      const keyItemB = previousKeyItems.find(key => key.id == b.roiId);

      if (keyItemA === undefined && keyItemB === undefined) {
        return 0;
      } else if (keyItemA === undefined) {
        return 1;
      } else if (keyItemB === undefined) {
        return -1;
      } else {
        return keyItemB.layerOrder - keyItemA.layerOrder;
      }
    });

    // Update layer order for the key items
    this.keyItems = this.keyItems.map((keyItem, idx) => {
      const existingKeyItem = previousKeyItems.find(key => key.id == keyItem.id);
      if (existingKeyItem) {
        keyItem.layerOrder = existingKeyItem.layerOrder;
      } else {
        keyItem.layerOrder = -1;
      }

      return keyItem;
    });

    this._raw = this.makeData(axes, sortedPointGroups); //, pmcLookup);

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log(`  ${chartName} processQueryResult took: ${(t1 - t0).toLocaleString()}ms, needsDraw$ took: ${(t2 - t1).toLocaleString()}ms`);

    this._recalcNeeded = true;
    return errs;
  }

  private makeReferenceGroup(chartName: string) {
    const refPointGroup: NaryChartDataGroup = new NaryChartDataGroup("", "", [], Colours.CONTEXT_PURPLE, PointDrawer.ShapeCircle);

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
  protected abstract axisName(axisIdx: number): string; // Expected to return a text name for the axis, eg on binary we'd return x or y
}
