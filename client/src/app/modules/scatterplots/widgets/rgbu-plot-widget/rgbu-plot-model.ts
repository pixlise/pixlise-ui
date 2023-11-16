// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { MinMax } from "src/app/models/BasicTypes";
import { Point, Rect } from "src/app/models/Geometry";
import { RGBUImage, FloatImage } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { LinearChartAxis, ChartAxis, ChartAxisDrawer } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { Colours, RGBA, ColourRamp } from "src/app/utils/colours";
import { PLOT_POINTS_SIZE, HOVER_POINT_RADIUS } from "src/app/utils/drawing";
import { RGBUMineralPoint, RGBUPlotData, RGBUAxisUnit, RGBURatioPoint, ROICount, RGBUMineralRatios } from "./rgbu-plot-data";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { Subject } from "rxjs";
import { BaseChartModel } from "../../base/model-interfaces";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { ROIItem } from "src/app/generated-protos/roi";

const xMargin = 40;
const yMargin = 40;
const outerPadding = 2;

interface RegionData {
  roiItem: ROIItem;
  colour: RGBA;
  name: string;
}

export class RGBUPlotModel implements CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

  // The raw data we start with
  private _raw: RGBUImage | null = null;
  private _plotData: RGBUPlotData | null = null;

  // Selection
  protected _currentSelection: SelectionHistoryItem | null = null;

  // The drawable data (derived from the above)
  private _drawModel: RGBUPlotDrawModel = new RGBUPlotDrawModel();

  // Settings
  imageName: string = "";
  visibleROIs: string[] = [];

  // Start with some reasonable axis defaults. These get replaced when view state is loaded
  xAxisUnit = new RGBUAxisUnit(0, 1);
  yAxisUnit = new RGBUAxisUnit(2, 3);

  cursorShown: string = CursorId.defaultPointer;
  mouseLassoPoints: Point[] = [];
  selectionMode: string = RGBUPlotModel.SELECT_RESET;
  drawMonochrome: boolean = false;
  private _mineralsShown: string[] = [];

  xAxisMinMax: MinMax = new MinMax(0, 5);
  yAxisMinMax: MinMax = new MinMax(0, 5);

  selectedMinXValue: number | null = null;
  selectedMaxXValue: number | null = null;

  selectedMinYValue: number | null = null;
  selectedMaxYValue: number | null = null;

  public static readonly TITLE_FONT_SIZE = 14;
  public static readonly FONT_SIZE = 12;

  public static readonly SELECT_ADD = "add";
  public static readonly SELECT_SUBTRACT = "subtract";
  public static readonly SELECT_RESET = "reset";

  private _xAxis: LinearChartAxis | null = null;
  private _yAxis: LinearChartAxis | null = null;

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  set raw(r: RGBUImage) {
    this._raw = r;
  }

  get raw(): RGBUImage | null {
    return this._raw;
  }

  hasRawData(): boolean {
    return this._raw != null;
  }

  get plotData(): RGBUPlotData | null {
    return this._plotData;
  }

  get drawModel(): RGBUPlotDrawModel {
    return this._drawModel;
  }

  get xAxis(): ChartAxis | null {
    return this._xAxis;
  }

  get yAxis(): ChartAxis | null {
    return this._yAxis;
  }

  get mineralsShown(): string[] {
    return this._mineralsShown;
  }

  set mineralsShown(x: string[]) {
    this._mineralsShown = x;
  }

  setData(rgbuImage: RGBUImage) {
    this._raw = rgbuImage;
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  handleSelectionChange(sel: SelectionHistoryItem) {
    this._currentSelection = sel;
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  private setInitRange(xMinMax: MinMax, yMinMax: MinMax): void {
    this.selectedMinXValue = this.selectedMinXValue || 0;
    this.selectedMinYValue = this.selectedMinYValue || 0;
    this.selectedMaxXValue = this.selectedMaxXValue || xMinMax.max;
    this.selectedMaxYValue = this.selectedMaxYValue || yMinMax.max;

    // 5 seems to work well for both axes, as used by DTU
    const minAxisMax = 5;

    this.xAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this.xAxisUnit.numeratorChannelIdx, this.xAxisUnit.denominatorChannelIdx);
    this.xAxisMinMax.expand(0);
    this.xAxisMinMax.expand(Math.max((xMinMax.max || 0) * 1.2, minAxisMax));

    this.yAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this.yAxisUnit.numeratorChannelIdx, this.yAxisUnit.denominatorChannelIdx);
    this.yAxisMinMax.expand(0);
    this.yAxisMinMax.expand(Math.max((yMinMax.max || 0) * 1.2, minAxisMax));
  }

  private calcPoints(rgbu: RGBUImage, currentSelection: SelectionHistoryItem): RGBUPlotData {
    const currSelPixels = currentSelection.pixelSelection.selectedPixels;
    let cropSelection = currentSelection.cropSelection;
    if (!cropSelection) {
      cropSelection = PixelSelection.makeEmptySelection();
    }

    let selectedXRange: MinMax | undefined = undefined;
    if (this.selectedMinXValue !== null && this.selectedMaxXValue !== null) {
      selectedXRange = new MinMax(this.selectedMinXValue, this.selectedMaxXValue);
    }
    let selectedYRange: MinMax | undefined = undefined;
    if (this.selectedMinYValue !== null && this.selectedMaxYValue !== null) {
      selectedYRange = new MinMax(this.selectedMinYValue, this.selectedMaxYValue);
    }

    const [pts, srcPixelIdxs, xMinMax, yMinMax, xAxisMinMax, yAxisMinMax, xAxisRawMinMax, yAxisRawMinMax] = this.generatePoints(
      rgbu,
      cropSelection,
      this.xAxisUnit,
      this.yAxisUnit,
      selectedXRange,
      selectedYRange
    );

    this.setInitRange(xAxisRawMinMax, yAxisRawMinMax);

    const xBinCount = 200;
    const yBinCount = 200;

    const xBinSize = 1 / (xBinCount - 1);
    const yBinSize = 1 / (yBinCount - 1);

    // Minimize RGBU data into specified amounts of x and y bins
    const [countMinMax, binCounts, binMemberInfo, visibleROIs, binSrcPixels] = this.minimizeRGBUData(
      xBinCount,
      yBinCount,
      //this.visibleROIs,
      pts,
      xMinMax,
      yMinMax,
      currSelPixels,
      srcPixelIdxs
      //this._widgetDataService
    );

    // Generate ratio points for newly binned data
    const [ratioPoints, colourKey] = this.generateRGBURatioPoints(
      xBinCount,
      yBinCount,
      binCounts,
      xMinMax,
      yMinMax,
      Math.log(countMinMax.max || 0),
      this.drawMonochrome,
      binMemberInfo,
      visibleROIs,
      currSelPixels,
      binSrcPixels
    );

    const allMinerals = RGBUPlotModel.getMineralPointsForAxes(this.xAxisUnit, this.yAxisUnit);
    const shownMinerals: RGBUMineralPoint[] = allMinerals.filter(mineral => this._mineralsShown.indexOf(mineral.name) >= 0);

    const rgbuPlotData = new RGBUPlotData(
      this.xAxisUnit,
      this.yAxisUnit,
      ratioPoints,
      xBinSize,
      yBinSize,
      xAxisMinMax,
      yAxisMinMax,
      shownMinerals,
      "",
      rgbu.r.width,
      rgbu.r.height,
      rgbu.path
    );

    //this.keyItems = Object.entries(colourKey).map(([key, keyColour]) => new KeyItem(key, key, keyColour));

    return rgbuPlotData;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      // Calculate the points
      if (this._raw && this._currentSelection) {
        this._plotData = this.calcPoints(this._raw, this._currentSelection);

        // We don't pan/zoom
        const panZoom = new PanZoom();

        this.initAxes(canvasParams, panZoom, 0);

        if (!this._xAxis || !this._yAxis || !screenContext) {
          return;
        }

        // All this for variable y-axis label widths!!
        // We need to find the max sized label in pixels
        const drawer = this.makeChartAxisDrawer();
        const longestYTickLabelPx = drawer.getLongestTickLabelPx(screenContext, this._yAxis);

        // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
        this.initAxes(canvasParams, panZoom, longestYTickLabelPx);

        this._drawModel.regenerate(this._plotData, canvasParams, this._xAxis, this._yAxis);

        this._lastCalcCanvasParams = canvasParams;
        this._recalcNeeded = false;
      }
    }
  }

  private initAxes(canvasParams: CanvasParams, transform: PanZoom, leftAxisLabelWidthPx: number): void {
    if (!this._plotData || !this._plotData.xRange.isValid() || !this._plotData.yRange.isValid()) {
      return;
    }

    // The data has to be drawn a bit in from the axis border due to point size
    const dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) + 1;

    // Setup x-axis:
    const xAxis = new LinearChartAxis(
      true,
      xMargin + leftAxisLabelWidthPx,
      canvasParams.width - xMargin - leftAxisLabelWidthPx - dataPadding - dataPadding,
      this._plotData.xRange.min!,
      this._plotData.xRange.max!,
      dataPadding
    );
    xAxis.setMinPixelsBetweenTicks(30);
    this._xAxis = xAxis;
    this._xAxis.updateAxis(canvasParams, transform);

    // Setup y-axis:
    const yAxis = new LinearChartAxis(
      false,
      yMargin,
      canvasParams.height - yMargin - dataPadding - dataPadding,
      this._plotData.yRange.min!,
      this._plotData.yRange.max!,
      dataPadding
    );
    yAxis.setMinPixelsBetweenTicks(25);
    this._yAxis = yAxis;
    this._yAxis.updateAxis(canvasParams, transform);
  }

  makeChartAxisDrawer(): ChartAxisDrawer {
    return new ChartAxisDrawer(RGBUPlotModel.FONT_SIZE + "px Roboto", Colours.GRAY_80.asString(), Colours.GRAY_30.asString(), 4, 4, false);
  }

  excludeSelection(selectionService: SelectionService): void {
    if (!this._plotData) {
      return;
    }

    // Effectively inverts selection, we read the current selection, invert it, and re-assign it as the selection
    const curSel = selectionService.getCurrentSelection();
    const currSelPixels = curSel.pixelSelection.selectedPixels;

    const allPixels = new Set<number>();
    for (let c = 0; c < this._plotData.imgWidth * this._plotData.imgHeight; c++) {
      allPixels.add(c);
    }

    const difference = new Set([...allPixels].filter(x => !currSelPixels.has(x)));

    selectionService.setSelection(
      BeamSelection.makeEmptySelection(),
      new PixelSelection(difference, this._plotData.imgWidth, this._plotData.imgHeight, curSel.pixelSelection.imageName)
    );
  }

  generatePoints(
    rgbu: RGBUImage,
    cropSelection: PixelSelection,
    xAxisUnit: RGBUAxisUnit,
    yAxisUnit: RGBUAxisUnit,
    selectedXRange?: MinMax,
    selectedYRange?: MinMax
  ): [Point[], number[], MinMax, MinMax, MinMax, MinMax, MinMax, MinMax] {
    const channels = [rgbu.r, rgbu.g, rgbu.b, rgbu.u];
    const pixels = rgbu.r.width * rgbu.r.height;

    // Work out the min/max of mineral locations
    let xAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx);
    let yAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx);

    const xAxisRawMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx);
    const yAxisRawMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx);

    if (selectedXRange) {
      xAxisMinMax = selectedXRange;
    }
    if (selectedYRange) {
      yAxisMinMax = selectedYRange;
    }

    const pts: Point[] = [];
    const xMinMax = new MinMax();
    const yMinMax = new MinMax();

    // We also want to preserve where the pixels are, so store a corresponding array of source pixel indexes
    const srcPixelIdxs: number[] = [];

    for (let c = 0; c < pixels; c++) {
      // Skip pixels if there's an active crop selection and they're not included
      if (cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(c)) {
        continue;
      }

      const pt = new Point(
        RGBUPlotModel.getRatioValue(channels, xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx, c),
        RGBUPlotModel.getRatioValue(channels, yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx, c)
      );

      if (isFinite(pt.x) && isFinite(pt.y) && xAxisMinMax.isWithin(pt.x) && yAxisMinMax.isWithin(pt.y)) {
        xMinMax.expand(pt.x);
        yMinMax.expand(pt.y);

        pts.push(pt);
        srcPixelIdxs.push(c);
      }

      xAxisRawMinMax.expand(pt.x);
      yAxisRawMinMax.expand(pt.y);
    }

    return [pts, srcPixelIdxs, xMinMax, yMinMax, xAxisMinMax, yAxisMinMax, xAxisRawMinMax, yAxisRawMinMax];
  }

  minimizeRGBUData(
    xBinCount: number,
    yBinCount: number,
    //visibleROINames: string[],
    pts: Point[],
    xMinMax: MinMax,
    yMinMax: MinMax,
    currSelPixels: Set<number>,
    srcPixelIdxs: number[]
    //widgetDataService: WidgetRegionDataService
  ): [MinMax, Array<number>, Record<number, { selected: boolean; rois: number[] }>, RegionData[], number[][]] {
    const xBinSize = 1 / (xBinCount - 1);
    const yBinSize = 1 / (yBinCount - 1);

    // Allocate each bin so we can find their counts
    const binCounts = new Array(xBinCount * yBinCount).fill(0);
    const binMemberInfo: Record<number, { selected: boolean; rois: number[] }> = {};
    const countMinMax = new MinMax(0, null);

    const binSrcPixels: number[][] = Array.from({ length: xBinCount * yBinCount }, () => []);

    const visibleROIs: RegionData[] = []; //visibleROINames.filter(roi => widgetDataService.regions.get(roi)).map(roi => widgetDataService.regions.get(roi));

    for (let c = 0; c < pts.length; c++) {
      const pt = pts[c];

      // Work out which bins they sit in
      const pctX = xMinMax.getAsPercentageOfRange(pt.x, false);
      const pctY = yMinMax.getAsPercentageOfRange(pt.y, false);

      const xPos = Math.floor(pctX / xBinSize);
      const yPos = Math.floor(pctY / yBinSize);

      const idx = yPos * xBinCount + xPos;
      binCounts[idx]++;
      countMinMax.expand(binCounts[idx]);

      const currentPixelGroups = {
        selected: currSelPixels.has(srcPixelIdxs[c]),
        rois: [], //visibleROIs.map((roi, i) => (roi.pixelIndexes.has(srcPixelIdxs[c]) ? i : -1)).filter(roiIdx => roiIdx >= 0),
      };

      // Remember if it's selected...
      if (binMemberInfo[idx]) {
        binMemberInfo[idx].selected = binMemberInfo[idx].selected || currentPixelGroups.selected;
        binMemberInfo[idx].rois = Array.from(new Set([...binMemberInfo[idx].rois, ...currentPixelGroups.rois]));
      } else {
        binMemberInfo[idx] = currentPixelGroups;
      }

      // Remember what pixels are part of this bin
      binSrcPixels[idx].push(srcPixelIdxs[c]);
    }

    return [countMinMax, binCounts, binMemberInfo, visibleROIs, binSrcPixels];
  }

  generateRGBURatioPoints(
    xBinCount: number,
    yBinCount: number,
    binCounts: number[],
    xMinMax: MinMax,
    yMinMax: MinMax,
    logCountMax: number,
    drawMonochrome: boolean,
    binMemberInfo: Record<number, { selected: boolean; rois: number[] }>,
    visibleROIs: RegionData[],
    currSelPixels: Set<number>,
    binSrcPixels: number[][],
    useFirstROIColour: boolean = false,
    stackedROIs = false
  ): [RGBURatioPoint[], Record<string, RGBA>] {
    if (xMinMax.min === null || yMinMax.min === null) {
      throw new Error("generateRGBURatioPoints called with null xMinMax or yMinMax");
    }
    const colourRamp = drawMonochrome ? ColourRamp.SHADE_MONO_SOLID_GRAY : ColourRamp.SHADE_MAGMA;

    const ratioPoints: RGBURatioPoint[] = [];
    const colourKey: Record<string, RGBA> = {};

    for (let x = 0; x < xBinCount; x++) {
      for (let y = 0; y < yBinCount; y++) {
        const binIdx = y * xBinCount + x;
        const count = binCounts[binIdx];
        if (count > 0) {
          // Convert x and y (which are in terms of bin coordinates eg: 0-bin count) back to
          // the range we had our data in
          const binPt = new Point(xMinMax.min + (x / xBinCount) * xMinMax.getRange(), yMinMax.min + (y / yBinCount) * yMinMax.getRange());

          // Prevents divide by 0 error when count === 1 and log of 1 is 0
          let colourRampPct = 0;
          if (count === logCountMax) {
            colourRampPct = 1;
          } else if (logCountMax > 0) {
            colourRampPct = Math.log(count) / logCountMax;
          }

          // By default, colour based on the colour ramp selected
          let colour: RGBA = Colours.sampleColourRamp(colourRamp, colourRampPct);
          let roiCount: ROICount[] = [];
          let combinedCount: number = count;

          const activePixelROIs = binMemberInfo[binIdx].rois;

          // If nothing selected, we show these as opaque, but if we do have a selection, unselected points are transparent
          if (currSelPixels.size > 0 && binMemberInfo[binIdx] && binMemberInfo[binIdx].selected) {
            // binMemberInfo[binIdx] == -1 means it's selected
            // SELECTED points are drawn in blue if in monochrome mode
            if (drawMonochrome) {
              colour = Colours.CONTEXT_BLUE;
            }

            if (stackedROIs && binMemberInfo[binIdx].rois.length > 0) {
              roiCount = activePixelROIs.map(roi => ({ roi: visibleROIs[roi].name, count, colour: colour.asString() }));
              combinedCount = count * activePixelROIs.length;
            }
          } else {
            // If were generating data for a stacked bar chart, get counts per ROI
            if (stackedROIs && binMemberInfo[binIdx].rois.length > 0) {
              colour = visibleROIs[activePixelROIs[0]].colour;
              roiCount = activePixelROIs.map(roi => {
                let currentColour = visibleROIs[roi].colour;
                currentColour = new RGBA(currentColour.r, currentColour.g, currentColour.b, 255);
                return {
                  roi: visibleROIs[roi].name,
                  count,
                  colour: currentColour.asString(),
                };
              });
              combinedCount = count * activePixelROIs.length;
            }
            // If we don't care about overlapping ROIs, use first colour
            else if (useFirstROIColour && binMemberInfo[binIdx].rois.length > 0) {
              colour = visibleROIs[activePixelROIs[0]].colour;
            }
            // Unselected, is it a member of an ROI?
            else if (binMemberInfo[binIdx] && binMemberInfo[binIdx].rois.length > 0) {
              const activeColourKey = activePixelROIs
                .map(roi => visibleROIs[roi].name)
                .sort()
                .join(", ");

              if (colourKey[activeColourKey]) {
                colour = colourKey[activeColourKey];
              } else {
                const averageColour = activePixelROIs.reduce(
                  (prev, curr, i) => {
                    const currentColour = visibleROIs[activePixelROIs[i]].colour;
                    if (prev.r === -1) {
                      return { r: currentColour.r, g: currentColour.g, b: currentColour.b };
                    } else {
                      return {
                        r: (prev.r + currentColour.r) / 2,
                        g: (prev.g + currentColour.g) / 2,
                        b: (prev.b + currentColour.b) / 2,
                      };
                    }
                  },
                  { r: -1, g: -1, b: -1 }
                );

                colour = new RGBA(averageColour.r, averageColour.g, averageColour.b, 255);
                colourKey[activeColourKey] = colour;
              }
            } else {
              // Unselected colours are dimmed if not in monochrome
              if (!drawMonochrome && currSelPixels.size > 0) {
                colour = new RGBA(colour.r, colour.g, colour.b, colour.a * 0.2);
              }
            }
          }

          ratioPoints.push(new RGBURatioPoint(binPt, count, combinedCount, colour, binSrcPixels[binIdx], roiCount));
        }
      }
    }

    return [ratioPoints, colourKey];
  }

  static getRatioValue(channel: FloatImage[], numeratorChannel: number, denominatorChannel: number, pixelIdx: number): number {
    // Verify channels are valid, if not return -1 so these values can be filtered out
    if (!channel || !channel[numeratorChannel] || !channel[denominatorChannel]) {
      return -1;
    }

    const numeratorValue = channel[numeratorChannel]?.values[pixelIdx];
    const denominatorValue = channel[denominatorChannel]?.values[pixelIdx];

    // Numerator can be any number, denominator must be a non-zero number
    if (typeof numeratorValue === "number" && denominatorValue) {
      return numeratorValue / denominatorValue;
    } else {
      return -1;
    }
  }
  /*
  static selectMinerals(dialog: MatDialog, mineralsShown: string[], callback: (minerals: string[]) => void): void {
    const dialogConfig = new MatDialogConfig();

    const items: PickerDialogItem[] = [];
    items.push(new PickerDialogItem(null, "Minerals", null, true));

    for (const m of RGBUMineralRatios.names) {
      items.push(new PickerDialogItem(m, m, null, true));
    }

    dialogConfig.data = new PickerDialogData(true, true, true, false, items, mineralsShown, "", new ElementRef(event.currentTarget));

    const dialogRef = dialog.open(PickerDialogComponent, dialogConfig);
    dialogRef.componentInstance.onSelectedIdsChanged.subscribe(callback);
  }
  */
  static getMineralPointsForAxes(xAxisUnit: RGBUAxisUnit, yAxisUnit: RGBUAxisUnit): RGBUMineralPoint[] {
    // Build the list of minerals with appropriate coordinates (based on what our axes are configured for)
    const minerals: RGBUMineralPoint[] = [];
    for (let c = 0; c < RGBUMineralRatios.names.length; c++) {
      let xVal = RGBUMineralRatios.ratioValues[c][xAxisUnit.numeratorChannelIdx];
      if (xAxisUnit.denominatorChannelIdx > -1) {
        xVal /= RGBUMineralRatios.ratioValues[c][xAxisUnit.denominatorChannelIdx];
      }

      let yVal = RGBUMineralRatios.ratioValues[c][yAxisUnit.numeratorChannelIdx];
      if (yAxisUnit.denominatorChannelIdx > -1) {
        yVal /= RGBUMineralRatios.ratioValues[c][yAxisUnit.denominatorChannelIdx];
      }

      minerals.push(new RGBUMineralPoint(new Point(xVal, yVal), RGBUMineralRatios.names[c]));
    }
    return minerals;
  }

  static getAxisMinMaxForMinerals(numeratorChannelIdx: number, denominatorChannelIdx: number): MinMax {
    const result = new MinMax();

    // Look up the value for each
    for (const mineralValues of RGBUMineralRatios.ratioValues) {
      let value = mineralValues[numeratorChannelIdx];
      if (denominatorChannelIdx >= 0) {
        value /= mineralValues[denominatorChannelIdx];
      }

      result.expand(value);
    }

    return result;
  }

  static channelToIdx(ch: string): number {
    let idx = RGBUImage.channels.indexOf(ch);
    if (idx < 0) {
      console.log("channelToIdx: invalid channel: " + ch);
      idx = 0;
    }
    return idx;
  }

  static idxToChannel(idx: number): string {
    if (idx < 0 || idx >= RGBUImage.channels.length) {
      console.log("idxToChannel: invalid index: " + idx);
      return RGBUImage.channels[0];
    }

    return RGBUImage.channels[idx];
  }
}

export class RGBUPlotDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  // xAxis: ChartAxis | null = null;
  // yAxis: ChartAxis | null = null;

  // Coordinates we draw the points at
  points: Point[] = [];
  colours: string[] = [];

  pointWidth: number = 0;
  pointHeight: number = 0;

  xAxisUnitLabel: string = "";
  yAxisUnitLabel: string = "";

  minerals: RGBUMineralPoint[] = [];
  mineralHoverIdx: number = -1;

  // Axis & data labels:
  //
  // A (y axis)
  // ^
  // |
  // |
  // +--------> B (x axis)

  axisBorder: Rect = new Rect(0, 0, 0, 0);
  dataArea: Rect = new Rect(0, 0, 0, 0);

  xAxisLabelArea: Rect = new Rect(0, 0, 0, 0);
  yAxisLabelArea: Rect = new Rect(0, 0, 0, 0);

  hoverLabel: string = "";

  regenerate(raw: RGBUPlotData, canvasParams: CanvasParams, xAxis: LinearChartAxis, yAxis: LinearChartAxis): void {
    // The absolute outer border (outside of this is just padding)
    const outerBorder = new Rect(outerPadding, outerPadding, canvasParams.width - outerPadding * 2, canvasParams.height - outerPadding * 2);

    this.axisBorder = new Rect(outerBorder.x + xMargin, outerBorder.y, outerBorder.w - xMargin, outerBorder.h - yMargin);

    // The data has to be drawn a bit in from the axis border due to point size
    const dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) + 1;
    this.dataArea = this.axisBorder.copy();
    this.dataArea.inflate(-dataPadding, -dataPadding);

    // Work out the size of rects for each point
    this.pointWidth = raw.pointWidth * canvasParams.width;
    this.pointHeight = raw.pointHeight * canvasParams.height;

    // Calculate coordinates to draw
    this.points = [];
    this.colours = [];
    this.minerals = [];
    if (raw.errorMsg.length <= 0 && raw.points && raw.points.length > 0) {
      for (const pt of raw.points) {
        this.points.push(
          new Point(
            xAxis.valueToCanvas(pt.ratioPt.x),
            yAxis.valueToCanvas(pt.ratioPt.y) - this.pointHeight // Move so box is above axis
          )
        );

        this.colours.push(pt.colour.asString());
      }

      // Do the minerals too
      for (const m of raw.minerals) {
        this.minerals.push(new RGBUMineralPoint(new Point(xAxis.valueToCanvas(m.ratioPt.x), yAxis.valueToCanvas(m.ratioPt.y)), m.name));
      }
    }

    const axisClickAreaSize = 20;
    if (raw.xAxisUnit) {
      this.xAxisUnitLabel = raw.xAxisUnit.label;
      const leftAxisSpace = yMargin;
      this.xAxisLabelArea = new Rect(outerBorder.x + leftAxisSpace, outerBorder.maxY() - axisClickAreaSize, outerBorder.w - leftAxisSpace, axisClickAreaSize);
    }
    if (raw.yAxisUnit) {
      this.yAxisUnitLabel = raw.yAxisUnit.label;
      const bottomAxisSpace = xMargin;
      this.yAxisLabelArea = new Rect(outerBorder.x, outerBorder.y, axisClickAreaSize, outerBorder.h - bottomAxisSpace);
    }
  }
}
