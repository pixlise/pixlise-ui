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

import { Component, ElementRef, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionService } from "src/app/services/selection.service";
import { histogramState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { HelpMessage } from "src/app/utils/help-message";
import { HistogramDrawer } from "./drawer";
import { HistogramInteraction } from "./interaction";
import { HistogramModel, HistogramBar, HistogramBars, HistogramData, ConcentrationBands } from "./model";


@Component({
    selector: ViewStateService.widgetSelectorHistogram,
    templateUrl: "./histogram-view.component.html",
    styleUrls: ["./histogram-view.component.scss"]
})
export class HistogramViewComponent implements OnInit, OnDestroy, CanvasDrawer
{
    @Input() widgetPosition: string = "";
    @Input() previewExpressionIDs: string[] = [];

    private _subs = new Subscription();

    private _visibleROIs: string[] = [];
    private _displayExpressionIDs: string[] = [];

    private _mdl: HistogramModel = null;

    private _showStdDeviation: boolean = true;
    private _logScale: boolean = false;
    private _showWhiskers: boolean = false;

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;
    cursorShown: string;

    keyItems: KeyItem[] = [];

    helpMessage: string = null;

    private _viewInited: boolean = false;

    constructor(
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _exprService: DataExpressionService,
        private _roiService: ROIService,
        private _viewStateService: ViewStateService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        // Only subscribe to expressions if we have preview expressions passed
        if(this.previewExpressionIDs && this.previewExpressionIDs.length > 0)
        {
            this._subs.add(this._exprService.expressionsUpdated$.subscribe(() =>
            {
                let unsavedExpressions = this._displayExpressionIDs.filter(id => this.previewExpressionIDs.includes(id));

                // If user has changed axes, but still has unsaved expression showing, dont reset
                if(unsavedExpressions.length < this.previewExpressionIDs.length)
                {
                    let validPreviewExpressions = this.previewExpressionIDs.filter(id => this._exprService.getExpression(id));
                    if(validPreviewExpressions.length > 0)
                    {
                        this._displayExpressionIDs = validPreviewExpressions;
                    }
                }

                this.recalcHistogram("preview-expression-refresh", null);
            }));
        }

        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (updReason: WidgetDataUpdateReason) =>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring histogram view state...");

                    let loadedState = this._widgetDataService.viewState.histograms.get(this.widgetPosition);

                    if(loadedState)
                    {
                        this._showStdDeviation = loadedState.showStdDeviation;
                        this._logScale = loadedState.logScale;
                        this._showWhiskers = loadedState.showWhiskers;
                        this._visibleROIs = loadedState.visibleROIs;
                        this._displayExpressionIDs = loadedState.expressionIDs;
                    }

                    this._viewInited = true;
                }

                // Region info has been updated, rebuild our chart
                this.recalcHistogram("widget-data", updReason);
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorHistogram;
    }

    get showStdDeviation(): boolean
    {
        return this._showStdDeviation;
    }

    toggleShowStdDeviation(): void
    {
        this._showStdDeviation = !this._showStdDeviation;
        this.recalcHistogram("toggle stddev", null);
    }

    get logScale(): boolean
    {
        return this._logScale;
    }

    onToggleLogScale(): void
    {
        this._logScale = !this._logScale;
        this.recalcHistogram("toggle logscale", null);
    }

    get showWhiskers(): boolean
    {
        return this._showWhiskers;
    }

    onToggleShowWhiskers(): void
    {
        this._showWhiskers = !this._showWhiskers;
        this.recalcHistogram("toggle showWhiskers", null);
    }

    private saveState(reason: string): void
    {
        console.log("histogram saveState called due to: " + reason);
        this._viewStateService.setHistogram(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): histogramState
    {
        let toSave = new histogramState(
            this._showStdDeviation,
            this._logScale,
            this._showWhiskers,
            this._displayExpressionIDs,
            this._visibleROIs
        );
        return toSave;
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawWorldSpace(screenContext, drawParams);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawScreenSpace(screenContext, drawParams);
        }
    }

    onClickChooseBars(): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ExpressionPickerData("Bars", DataExpressionService.DataExpressionTypeAll, this._displayExpressionIDs, false, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (displayIds: string[]) =>
            {
                // Result should be a list of element symbol strings
                if(displayIds)
                {
                    this._displayExpressionIDs = displayIds;

                    const reason = "choose-bars";
                    this.saveState(reason);
                    this.recalcHistogram(reason, null);
                }
            }
        );
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ROIPickerData(true, true, true, false, this._visibleROIs, true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[]) =>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs)
                {
                    this._visibleROIs = Array.from(visibleROIs);

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.recalcHistogram(reason, null);
                }
            }
        );
    }

    // Copied from chord, can this be made into common code?
    private removeInvalidElements(): void
    {
        const exprList = this._exprService.getAllExpressionIds(DataExpressionService.DataExpressionTypeAll, this._widgetDataService.quantificationLoaded);
        let newDisplayExprIds: string[] = [];

        for(let exprId of this._displayExpressionIDs)
        {
            if(exprList.indexOf(exprId) !== -1)
            {
                // We found a valid one, use it
                newDisplayExprIds.push(exprId);
            }
        }

        this._displayExpressionIDs = newDisplayExprIds;
    }

    // Copied from chord, can this be made into common code?
    private setStartingExpressions()
    {
        // Pick all elements/pseudointensities, don't pick expressions randomly!
        this._displayExpressionIDs = this._exprService.getStartingExpressions(this._widgetDataService.quantificationLoaded);
        console.log("Histogram view: Starting expression set to: " + this._displayExpressionIDs.join(","));
    }

    private recalcHistogram(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        console.log("Histogram recalcHistogram reason: " + reason);//+', regions: '+JSON.stringify(this._visibleROIs)+', exprs: '+JSON.stringify(this._displayExpressionIDs));

        let t0 = performance.now();

        // Assume it'll work...
        this.helpMessage = null;

        if(this._displayExpressionIDs.length <= 0 ||
            (
                widgetUpdReason == WidgetDataUpdateReason.WUPD_QUANT &&
                DataExpressionService.hasPseudoIntensityExpressions(this._displayExpressionIDs)
            )
        )
        {
            this.setStartingExpressions();
        }
        else
        {
            this.removeInvalidElements();
        }

        // If we still can't display...
        if(this._displayExpressionIDs.length < 1)
        {
            this.helpMessage = HelpMessage.NOT_ENOUGH_ELEMENTS;
            return;
        }

        // If no ROI selected, use all points
        if(this._visibleROIs.length <= 0)
        {
            this._visibleROIs = PredefinedROIID.defaultROIs;
        }

        // Use widget data service to rebuild our data model
        let exprPseudointensityCount = 0;
        let exprWeightPctCount = 0;
        let query: DataSourceParams[] = [];
        for(let exprId of this._displayExpressionIDs)
        {
            for(let roiId of this._visibleROIs)
            {
                // Selected points ROI: Only add it if the selection is not empty!
                if(roiId != PredefinedROIID.SelectedPoints || this._selectionService.getCurrentSelection().beamSelection.locationIndexes.size > 0)
                {
                    query.push(new DataSourceParams(exprId, roiId, ""));
                }
            }

            // Also check if it's a pseudointensity expression
            if(DataExpressionService.getPredefinedPseudoIntensityExpressionElement(exprId).length > 0)
            {
                exprPseudointensityCount++;
            }
            else if(DataExpressionService.getPredefinedQuantExpressionElementColumn(exprId) == "%")
            {
                exprWeightPctCount++;
            }
        }

        let queryData = this._widgetDataService.getData(query, true);
        if(queryData.error)
        {
            console.error("Failed to query data for histogram: " + queryData.error);
            return;
        }

        this._mdl = new HistogramModel(this._showStdDeviation, this._logScale, this._showWhiskers);

        let histogramBars: HistogramBars[] = [];
        let bars: HistogramBar[] = [];
        let overallValueRange: MinMax = new MinMax();
        let barGroupValueRange: MinMax = new MinMax();

        for(let queryIdx = 0; queryIdx < query.length; queryIdx++)
        {
            const exprId = query[queryIdx].exprId;
            const roiId = query[queryIdx].roiId;

            const colData = queryData.queryResults[queryIdx];
            if(colData.error)
            {
                console.error("Failed to get data for roi: " + roiId + ", expr: " + exprId + ". Error: " + colData.error);
                continue;
            }

            const region = this._widgetDataService.regions.get(roiId);

            let concentrationCol = colData.values;

            // If we get no values for the given PMCs, display an error and stop here
            let errorMsg = "";

            if(concentrationCol.values.length <= 0)
            {
                console.log("  Histogram got no values back for expression: " + exprId + ", roi: " + roiId);
                errorMsg = "No values found for: " + region.name;
                //continue;
            }

            // Calc sum of concentrations and read out column into an array
            let errorCol = this.getErrorColForExpression(exprId, roiId);

            // TODO: Should this and chord diagram be common code?
            let concentrationSum = 0;
            let errorSum = 0;
            for(let c = 0; c < concentrationCol.values.length; c++)
            {
                let concentration = concentrationCol.values[c].value;
                concentrationSum += concentration;

                if(errorCol)
                {
                    errorSum += errorCol.values[c].value;
                }
            }

            let avg = concentrationCol.values.length > 0 ? concentrationSum / concentrationCol.values.length : 0;

            // Calculate std deviation or std error, depending on setting
            let minMax = new MinMax(avg, avg);

            const concentrationPrecision = 0.01;
            let bands: Record<number, number> = {};
            let stdDevSum = 0;
            for(let c = 0; c < concentrationCol.values.length; c++)
            {
                let concentration = concentrationCol.values[c].value;

                const roundedConcentration = Math.round(concentration / concentrationPrecision) * concentrationPrecision;
                bands[roundedConcentration] = bands[roundedConcentration] ? bands[roundedConcentration] + 1 : 1;

                const variation = concentration - avg;
                stdDevSum += variation * variation;
            }

            let stdDev = concentrationCol.values.length > 0 && stdDevSum > 0 ? Math.sqrt(stdDevSum / (concentrationCol.values.length - 1)) : 0;
            let stdErr = null;

            if(this._showStdDeviation)
            {
                minMax = new MinMax(avg - stdDev, avg + stdDev);
            }
            else
            {
                // std error calculated from std dev
                stdErr = stdDev / Math.sqrt(concentrationCol.values.length);
                minMax = new MinMax(avg - stdErr, avg + stdErr);
            }

            let avgError = 0;
            if(errorCol && errorCol.values && errorCol.values.length > 0)
            {
                avgError = errorSum / errorCol.values.length;
            }

            const concentrationBands: ConcentrationBands = {
                count: concentrationCol.values.length,
                precision: concentrationPrecision,
                bands,
            };

            bars.push(
                new HistogramBar(
                    region.name,
                    region.colour,
                    avg,
                    minMax,
                    avgError,
                    errorMsg,
                    stdDev,
                    stdErr,
                    concentrationBands,
                )
            );
            barGroupValueRange.expandByMinMax(minMax);

            // Find the next one (that we actually got data for!)
            let nextExprId = "";
            for(let c = queryIdx + 1; c < query.length; c++)
            {
                if(queryData.queryResults[c] != null)
                {
                    nextExprId = query[c].exprId;
                    break;
                }
            }

            // If we have a "next" column, or are the last column we have to finish this bar group up
            if(queryIdx >= query.length - 1 ||
                queryIdx < (query.length - 1) && exprId != nextExprId)
            {
                let shortName = this._exprService.getExpressionShortDisplayName(exprId, 10);
                histogramBars.push(
                    new HistogramBars(
                        bars,
                        shortName.shortName,
                        shortName.name,
                        barGroupValueRange
                    )
                );
                overallValueRange.expandByMinMax(barGroupValueRange);
                barGroupValueRange = new MinMax();
                bars = [];
            }
        }

        // Generate data for key display
        this.keyItems = this.makeKeyItems(this._visibleROIs);

        // Pick a Y-axis label
        let yAxisLabel = "Expression Results"; // whatever they return... could be a mix of values for all we know
        // Specific values have nicer Y labels
        if(exprWeightPctCount == this._displayExpressionIDs.length)
        {
            yAxisLabel = "Mean Weight %";
        }
        else if(exprPseudointensityCount == this._displayExpressionIDs.length)
        {
            yAxisLabel = "% Above Background";
        }

        // Make raw data structure
        this._mdl.raw = new HistogramData(histogramBars, overallValueRange, yAxisLabel);

        // Set up the rest
        this.drawer = new HistogramDrawer(this._mdl);
        this.interaction = new HistogramInteraction(this._mdl);

        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

        console.log("  Histogram prepareData took: " + (t1 - t0).toLocaleString() + "ms, needsDraw$ took: " + (t2 - t1).toLocaleString() + "ms");
    }

    protected getErrorColForExpression(exprId: string, roiId: string): PMCDataValues
    {
        // If we've got a corresponding error column, use that, otherwise return null
        let elem = DataExpressionService.getPredefinedQuantExpressionElement(exprId);
        if(elem.length <= 0)
        {
            return null;
        }

        // Get the detector too. If not specified, it will be '' which will mean some defaulting will happen
        let detector = DataExpressionService.getPredefinedQuantExpressionDetector(exprId);

        // Try query it
        let errExprId = DataExpressionService.makePredefinedQuantElementExpression(elem, "err", detector);
        let query: DataSourceParams[] = [new DataSourceParams(errExprId, roiId, "")];
        let queryData = this._widgetDataService.getData(query, false);
        if(queryData.error || queryData.hasQueryErrors() || queryData.queryResults.length != 1)
        {
            return null;
        }

        return queryData.queryResults[0].values;
    }

    protected makeKeyItems(roiIDs: string[]): KeyItem[]
    {
        let result: KeyItem[] = [];

        for(let roiId of roiIDs)
        {
            const region = this._widgetDataService.regions.get(roiId);
            if(region)
            {
                result.push(new KeyItem(""/* Don't need bring-to-front feature, so no id specified*/, region.name, region.colour));
            }
        }

        return result;
    }
}
