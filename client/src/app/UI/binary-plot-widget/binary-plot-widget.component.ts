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
import { PMCDataValues, PMCDataValue } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { Point } from "src/app/models/Geometry";
import { orderVisibleROIs, PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { binaryState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, DataUnit, RegionDataResults, WidgetDataErrorType, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { httpErrorToString, randomString } from "src/app/utils/utils";
import { BinaryPlotAxisData, BinaryPlotData, BinaryPlotPointIndex } from "./binary-data";
import { BinaryDiagramDrawer } from "./drawer";
import { BinaryInteraction } from "./interaction";
import { BinaryPlotModel } from "./model";
import { exportScatterPlot, ExportPlotCaller } from "src/app/UI/ternary-plot-widget/export-helper";
import { ExpressionReferences } from "../references-picker/references-picker.component";


@Component({
    selector: ViewStateService.widgetSelectorBinaryPlot,
    templateUrl: "./binary-plot-widget.component.html",
    styleUrls: ["./binary-plot-widget.component.scss"]
})
export class BinaryPlotWidgetComponent implements OnInit, OnDestroy, CanvasDrawer, ExportPlotCaller
{
    @Input() widgetPosition: string = "";
    @Input() previewExpressionIDs: string[] = [];

    private id = randomString(4);
    private _subs = new Subscription();

    private _visibleROIs: string[] = [];

    private _xAxisExpressionId: string = "";
    private _yAxisExpressionId: string = "";

    showMmol: boolean = false;

    private _references: string[] = [];

    private _binaryModel: BinaryPlotModel = new BinaryPlotModel();

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;

    keyItems: KeyItem[] = [];
    expressionsMissingPMCs: string = "";

    private _viewInited: boolean = false;

    constructor(
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _exprService: DataExpressionService,
        private _viewStateService: ViewStateService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog
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
                // If user has changed axes, but still has unsaved expression showing, dont reset
                if(!this._xAxisExpressionId.startsWith("unsaved-") && !this._yAxisExpressionId.startsWith("unsaved-"))
                {
                    // Default set axes to first two preview expressions passed
                    if(this._exprService.getExpression(this.previewExpressionIDs[0]))
                    {
                        this._xAxisExpressionId = this.previewExpressionIDs[0];
                    }
                    if(this.previewExpressionIDs.length > 1 && this._exprService.getExpression(this.previewExpressionIDs[1]))
                    {
                        this._yAxisExpressionId = this.previewExpressionIDs[1];
                    }
                }

                this.prepareData("preview-expression-refresh", null);
            }));
        }

        this._subs.add(this._selectionService.chordClicks$.subscribe(
            (chordExprIds: string[])=>
            {
                // Binary plots listen for chord clicks
                if(chordExprIds.length == 2)
                {
                    this._xAxisExpressionId = chordExprIds[0];
                    this._yAxisExpressionId = chordExprIds[1];
                    this.prepareData("chord-click", null);
                }
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._selectionService.hoverChangedReplaySubject$.subscribe(
            ()=>
            {
                this.handleHoverPointChanged();
            }
        ));

        this._subs.add(this.transform.transformChangeComplete$.subscribe(
            (complete: boolean)=>
            {
                this.prepareData("transform", null);
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (updReason: WidgetDataUpdateReason)=>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring binary plot view state...");

                    let loadedState = this._widgetDataService.viewState.binaryPlots.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this.showMmol = loadedState.showMmol;

                        // If there are 2 expressions...
                        if(loadedState.expressionIDs.length == 2)
                        {
                            this._xAxisExpressionId = loadedState.expressionIDs[0];
                            if(this._xAxisExpressionId.startsWith("unsaved-"))
                            {
                                this._xAxisExpressionId = "";
                            }
                            this._yAxisExpressionId = loadedState.expressionIDs[1];
                            if(this._yAxisExpressionId.startsWith("unsaved-"))
                            {
                                this._yAxisExpressionId = "";
                            }
                        }
                        else
                        {
                            this._xAxisExpressionId = "";
                            this._yAxisExpressionId = "";
                        }

                        this._visibleROIs = orderVisibleROIs(loadedState.visibleROIs);
                    }
                    else
                    {
                        console.warn("Failed to find view state for binary plot: "+this.widgetPosition);
                    }

                    this._viewInited = true;
                }
                else
                {
                    // Not the first one, check if we can ignore
                    if(updReason == WidgetDataUpdateReason.WUPD_SELECTION && this._visibleROIs.indexOf(PredefinedROIID.SelectedPoints) == -1)
                    {
                        // We're not showing selection, so ignore
                        return;
                    }

                    if(updReason == WidgetDataUpdateReason.WUPD_REMAINING_POINTS && this._visibleROIs.indexOf(PredefinedROIID.RemainingPoints) == -1)
                    {
                        // We're not showing selection, so ignore
                        return;
                    }
                }

                // Region info has been updated, rebuild our chart
                this.prepareData("widget-data", updReason);
            }
        ));
    }

    ngOnDestroy()
    {
        //console.warn('N-ary ['+this.id+'] ngOnDestroy');
        this._subs.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorBinaryPlot;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    get cursorShown(): string
    {
        let cursor = "";
        if(this._binaryModel)
        {
            cursor = this._binaryModel.cursorShown;
        }
        return cursor;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    private saveState(reason: string): void
    {
        console.log("binary plot saveState called due to: "+reason);
        this._viewStateService.setBinary(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): binaryState
    {
        let toSave = new binaryState(
            this.showMmol,
            [this._xAxisExpressionId, this._yAxisExpressionId],
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

    private prepareData(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        console.log("Binary ["+this.id+"] prepareData reason: "+reason);

        let t0 = performance.now();
        this.setDefaultsIfNeeded(widgetUpdReason);

        // We've got data, create a model!
        this.keyItems = [];
        this.expressionsMissingPMCs = "";

        // Use widget data service to rebuild our data model
        let query: DataSourceParams[] = [];

        // Query each region for both expressions if we have any...
        if(this._xAxisExpressionId.length <= 0 || this._yAxisExpressionId.length <= 0)
        {
            console.error("BinaryPlot prepareData: No query ran");
            this.assignEmptyQuery(t0);
        }
        else
        {
            // NOTE: we need the selected points to be last in this list, so they are drawn last, and are always visible
            for(let roiId of this._visibleROIs)
            {
                query.push(new DataSourceParams(this._xAxisExpressionId, roiId, "", this.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT));
                query.push(new DataSourceParams(this._yAxisExpressionId, roiId, "", this.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT));
            }

            this._widgetDataService.getData(query, true).subscribe(
                (queryData)=>
                {
                    if(queryData.error)
                    {
                        console.error("BinaryPlot prepareData error: "+queryData.error);
                        this.assignEmptyQuery(t0);
                    }
                    else
                    {
                        this.processQueryResult(t0, queryData);
                    }
                },
                (err)=>
                {
                    console.error(httpErrorToString(err, "BinaryPlot prepareData error"));
                    this.assignEmptyQuery(t0);
                }
            );
        }
    }

    private processQueryResult(t0: number, queryData: RegionDataResults)
    {
        let exprIdX = "";
        let exprIdY = "";
        let xLabel = "";
        let yLabel = "";

        // Make bottom-left corner always e 0, 0
        let xValueRange = new MinMax(0, null);
        let yValueRange = new MinMax(0, null);

        let shapes: string[] = [];
        let coloursRGB: RGBA[] = [];
        let xPointGroup: PMCDataValues[] = [];
        let yPointGroup: PMCDataValues[] = [];

        let pmcLookup: Map<number, BinaryPlotPointIndex> = new Map<number, BinaryPlotPointIndex>();

        let xErrorShort: string = "";
        let xErrorLong: string = "";
        let yErrorShort: string = "";
        let yErrorLong: string = "";

        let queryWarnings: Set<string> = new Set<string>();

        let labelMaxChars = this.showMmol ? 18 : 24;

        if(queryData.queryResults.length > 0)
        {
            exprIdX = queryData.queryResults[0].query.exprId;
            xLabel = queryData.queryResults[0].expression?.getExpressionShortDisplayName(labelMaxChars).shortName;
        }
        if(queryData.queryResults.length > 1)
        {
            exprIdY = queryData.queryResults[1].query.exprId;
            yLabel = queryData.queryResults[1].expression?.getExpressionShortDisplayName(labelMaxChars).shortName;
        }

        if(this.showMmol)
        {
            const mmolAppend = "(mmol)";
            if(xLabel.length > 0 && !xLabel.endsWith(mmolAppend)) // Note this won't detect if (mmol) was modified by short name to be (mm...
            {
                xLabel += mmolAppend;
            }

            if(yLabel.length > 0 && !yLabel.endsWith(mmolAppend)) // Note this won't detect if (mmol) was modified by short name to be (mm...
            {
                yLabel += mmolAppend;
            }
        }

        // Read data for each region
        for(let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx+=2)
        {
            let resultX = queryData.queryResults[queryIdx];
            let resultY = queryData.queryResults[queryIdx+1];

            if(resultX.warning)
            {
                queryWarnings.add(resultX.warning);
            }
            if(resultY.warning)
            {
                queryWarnings.add(resultY.warning);
            }

            if( resultX.errorType == WidgetDataErrorType.WERR_ROI &&
                resultY.errorType == WidgetDataErrorType.WERR_ROI )
            {
                // Don't log anything for ROI causing a fail, we just silently ignore if UI is set
                // to show ROIs that have been deleted. The moment an ROI selection dialog has save
                // clicked, we purge invalid ones anyway
                continue;
            }

            // Show any abbreviated errors that we need to here
            if(resultX.errorType)
            {
                xErrorShort = resultX.errorType;
                xErrorLong = resultX.error;
            }

            if(resultY.errorType)
            {
                yErrorShort = resultY.errorType;
                yErrorLong = resultY.error;
            }

            if(resultX.errorType || resultY.errorType)
            {
                continue;
            }

            // Filter out any data for PMCs which don't exist in BOTH x and y
            // This fixes issues we saw when using for eg housekeeping data vs quantification data
            // where housekeeping values could be more numerous because they exist in PMCs that don't
            // have location data...
            let values = PMCDataValues.filterToCommonPMCsOnly([resultX.values, resultY.values]);

            let valuesX = values[0];
            let valuesY = values[1];

            xValueRange.expandByMinMax(valuesX.valueRange);
            yValueRange.expandByMinMax(valuesY.valueRange);

            for(let c = 0; c < valuesX.values.length; c++)
            {
                pmcLookup.set(valuesX.values[c].pmc, new BinaryPlotPointIndex(xPointGroup.length, c));
            }

            xPointGroup.push(valuesX);
            yPointGroup.push(valuesY);

            let region = resultX.region;
            if(region.colour)
            {
                coloursRGB.push(RGBA.fromWithA(region.colour, 1));
                shapes.push(region?.shape || "circle");

                // Add to key too. We only specify an ID if it can be brought to front - all points & selection
                // are fixed in their draw order, so don't supply for those
                let roiIdForKey = region.id;
                if(PredefinedROIID.isPredefined(roiIdForKey))
                {
                    roiIdForKey = "";
                }

                this.keyItems.push(new KeyItem(roiIdForKey, region.name, region.colour, null, region.shape));
            }

            if(resultX.values.values.length != resultY.values.values.length)
            {
                queryWarnings.add("X and Y axes had different sets of PMCs, only showing PMCs that exist on both axes");
            }
        }

        this.assignQueryResult(
            t0,
            exprIdX,
            exprIdY,
            xLabel,
            yLabel,
            xValueRange,
            yValueRange,
    
            shapes,
            coloursRGB,
            xPointGroup,
            yPointGroup,
    
            pmcLookup,
    
            xErrorShort,
            xErrorLong,
            yErrorShort,
            yErrorLong,

            queryWarnings
        );
    }

    private assignEmptyQuery(t0: number)
    {
        this.assignQueryResult(
            t0,
            "",
            "",
            "",
            "",
            new MinMax(),
            new MinMax(),
    
            [],
            [],
            [],
            [],
    
            new Map<number, BinaryPlotPointIndex>(),
    
            "",
            "",
            "",
            "",

            new Set<string>()
        );
    }

    private assignQueryResult(
        t0: number,
        exprIdX: string,
        exprIdY: string,
        xLabel: string,
        yLabel: string,
        xValueRange: MinMax,
        yValueRange: MinMax,

        shapes: string[],
        coloursRGB: RGBA[],
        xPointGroup: PMCDataValues[],
        yPointGroup: PMCDataValues[],

        pmcLookup: Map<number, BinaryPlotPointIndex>,

        xErrorShort: string,
        xErrorLong: string,
        yErrorShort: string,
        yErrorLong: string,

        queryWarnings: Set<string>
    )
    {
        if(this._references.length > 0)
        {
            let refXDataValue = new PMCDataValues();
            let refYDataValue = new PMCDataValues();

            this._references.forEach((referenceName, i) =>
            {
                let reference = ExpressionReferences.getByName(referenceName);

                if(!reference)
                {
                    console.error(`BinaryPlot prepareData: Couldn't find reference ${referenceName}`);
                    return;
                }

                let refXValue = ExpressionReferences.getExpressionValue(reference, exprIdX)?.weightPercentage;
                let isRefXNull = refXValue == null;
                let refYValue = ExpressionReferences.getExpressionValue(reference, exprIdY)?.weightPercentage;
                let isRefYNull = refYValue == null;

                if(isRefXNull && isRefYNull)
                {
                    console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined values for: ${xLabel}, ${yLabel}`);
                    return;
                }

                if(isRefXNull)
                {
                    refXValue = 0;
                    console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined ${xLabel} value`);
                }
                if(isRefYNull)
                {
                    refYValue = 0;
                    console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined ${yLabel} value`);
                }

                // We don't have a PMC for these, so -10 and below are now reserverd for reference values
                let referenceIndex = ExpressionReferences.references.findIndex((ref) => ref.name === referenceName);
                let id = -10 - referenceIndex;

                console.log(`BinaryPlot prepareData: Adding reference ${referenceName} with id ${id} and values (${refXValue}, ${refYValue})`);

                refXDataValue.values.push(new PMCDataValue(id, refXValue, isRefXNull, referenceName));
                refYDataValue.values.push(new PMCDataValue(id, refYValue, isRefYNull, referenceName));
                pmcLookup.set(refXDataValue.values[i].pmc, new BinaryPlotPointIndex(xPointGroup.length, i));
            });

            refXDataValue = PMCDataValues.makeWithValues(refXDataValue.values);
            refYDataValue = PMCDataValues.makeWithValues(refYDataValue.values);
            
            xValueRange.expandByMinMax(refXDataValue.valueRange);
            yValueRange.expandByMinMax(refYDataValue.valueRange);

            xPointGroup.push(refXDataValue);
            yPointGroup.push(refYDataValue);
            coloursRGB.push(Colours.CONTEXT_PURPLE);
            this.keyItems.push(new KeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, null, "circle"));
        }

        if(queryWarnings.size > 0)
        {
            this.expressionsMissingPMCs = Array.from(queryWarnings).join("\n");
        }

        let binaryData = new BinaryPlotData(
            shapes,
            coloursRGB,
            new BinaryPlotAxisData(xLabel, xPointGroup, xValueRange, xErrorShort, xErrorLong),
            new BinaryPlotAxisData(yLabel, yPointGroup, yValueRange, yErrorShort, yErrorLong),
            pmcLookup,
            this._visibleROIs
        );

        this._binaryModel.showMmol = this.showMmol;
        let binIntr = new BinaryInteraction(this._binaryModel, this._selectionService, this._datasetService, this._widgetDataService);
        this._subs.add(binIntr.axisClick$.subscribe(
            (axis: string)=>
            {
                this.onAxisChooseExpression(axis);
            }
        ));

        this.interaction = binIntr;
        this.drawer = new BinaryDiagramDrawer(this._binaryModel);

        this._binaryModel.raw = binaryData;

        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

        console.log("  Binary prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }

    get axesIDs(): string[]
    {
        return [this._xAxisExpressionId, this._yAxisExpressionId];
    }

    private setDefaultsIfNeeded(widgetUpdReason: WidgetDataUpdateReason): void
    {
        // If we don't have any elements set to display, use the first 2 in the quant data
        if(
            this._xAxisExpressionId.length <= 0 ||
            this._yAxisExpressionId.length <= 0 ||
            (
                widgetUpdReason == WidgetDataUpdateReason.WUPD_QUANT &&
                DataExpressionId.hasPseudoIntensityExpressions([this._xAxisExpressionId, this._yAxisExpressionId])
            )
        )
        {
            let exprs = this._exprService.getStartingExpressions(this._widgetDataService.quantificationLoaded);

            if(exprs.length >= 2)
            {
                console.log("  Binary view: Defaulting to first 2 expressions...");
                this._xAxisExpressionId = exprs[0];
                this._yAxisExpressionId = exprs[1];
            }
            else
            {
                console.warn("  Binary view: failed to default to first 2 expressions");
                //console.log(exprList);
                this._xAxisExpressionId = "";
                this._yAxisExpressionId = "";
            }
        }

        // If no ROI selected, use all points
        if(this._visibleROIs.length <= 0)
        {
            this._visibleROIs = PredefinedROIID.defaultROIs;
        }
    }

    setShowMmol(show: boolean): void
    {
        this.showMmol = show;

        const reason = "show-mmol";
        this.saveState(reason);
        this.prepareData(reason, null);
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
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs)
                {
                    // Ensure selected points is last, so it's drawn on top of everything else
                    this._visibleROIs = orderVisibleROIs(visibleROIs);

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.prepareData(reason, null);
                }
            }
        );
    }

    onAxisChooseExpression(axis: string): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        let exprIds = [];
        if(axis == "X")
        {
            exprIds = [this._xAxisExpressionId];
        }
        else if(axis == "Y")
        {
            exprIds = [this._yAxisExpressionId];
        }

        dialogConfig.data = new ExpressionPickerData("Plot Axis", DataExpressionId.DataExpressionTypeAll, exprIds, true, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (displayIds: string[])=>
            {
                // Result should be a list of element symbol strings
                if(displayIds && displayIds.length > 0)
                {
                    // Transform back into our display elements
                    if(axis == "X")
                    {
                        this._xAxisExpressionId = displayIds[0];
                    }
                    else if(axis == "Y")
                    {
                        this._yAxisExpressionId = displayIds[0];
                    }

                    const reason = "axis-swap-"+axis;
                    this.saveState(reason);
                    this.prepareData(reason, null);
                }
            }
        );
    }

    handleHoverPointChanged(): void
    {
    // Hover point changed, if we have a model, set it and redraw, otherwise ignore
        let hoverPMC = this._selectionService.hoverPMC;
        if(this._binaryModel && this._binaryModel.raw)
        {
            if(hoverPMC < 0 && hoverPMC > -10)
            {
                // Clearing, easy case
                this._binaryModel.hoverPoint = null;
                this._binaryModel.hoverPointData = null;
                this._binaryModel.hoverShape = "circle";
                this.needsDraw$.next();
                return;
            }
            
            // Find the point in our draw model data
            let idx = this._binaryModel.raw.pmcToValueLookup.get(hoverPMC);

            // Yuck, really need to do something about these null checks. This kept coming up with sentry errors
            // so now checking for all of this stuff
            if(
                idx != undefined &&
                idx.pointGroup >= 0 &&
                this._binaryModel.drawData != null &&
                this._binaryModel.drawData.pointGroupCoords &&
                idx.pointGroup < this._binaryModel.drawData.pointGroupCoords.length)
            {
                let coords = this._binaryModel.drawData.pointGroupCoords[idx.pointGroup];
                this._binaryModel.hoverPoint = coords[idx.valueIndex];
                this._binaryModel.hoverShape = this._binaryModel.raw.shapeGroups[idx.pointGroup];
                this._binaryModel.hoverPointData = new Point(
                    this._binaryModel.raw.xAxisData.pointGroups[idx.pointGroup].values[idx.valueIndex].value,
                    this._binaryModel.raw.yAxisData.pointGroups[idx.pointGroup].values[idx.valueIndex].value
                );
                this.needsDraw$.next();
                return;
            }
        }
    }

    onBringToFront(roiID: string): void
    {
        let idx = this._visibleROIs.indexOf(roiID);
        if(idx > -1)
        {
            this._visibleROIs.splice(idx, 1);
            this._visibleROIs.push(roiID);
            this._visibleROIs = orderVisibleROIs(this._visibleROIs);

            const reason = "roi-bring-to-front";
            this.saveState(reason);
            this.prepareData(reason, null);
        }
    }

    get selectModeExcludeROI(): boolean
    {
        return this._binaryModel ? this._binaryModel.selectModeExcludeROI : false;
    }

    onToggleSelectModeExcludeROI()
    {
        this._binaryModel.selectModeExcludeROI = !this._binaryModel.selectModeExcludeROI;
    }

    onReferences(references)
    {
        this._references = references;
        this.prepareData("references-update", null);
    }

    onExport()
    {
        if(!this._binaryModel || !this._binaryModel.raw)
        {
            return;
        }

        exportScatterPlot(this.dialog, "Binary", this._datasetService.datasetLoaded, this);
    }

    exportPlotData(datasetId: string): string
    {
        let xLabel = this._binaryModel.raw.xAxisData.axisLabel;
        let yLabel = this._binaryModel.raw.yAxisData.axisLabel;

        let data = `"PMC","ROI","${xLabel}","${yLabel}"\n`;
        let dataset = this._datasetService.datasetLoaded;

        Array.from(this._binaryModel.raw.pmcToValueLookup.entries()).forEach(([pmc, idx]) =>
        {
            // Check if this PMC is a member of the dataset ID we're exporting for
            if(dataset.getSubDatasetIdForPMC(pmc) == datasetId)
            {
                // Subtract the PMC offset
                pmc -= dataset.getIdOffsetForSubDataset(datasetId);

                let xValue = this._binaryModel.raw.xAxisData.pointGroups[idx.pointGroup].values[idx.valueIndex].value;
                let yValue = this._binaryModel.raw.yAxisData.pointGroups[idx.pointGroup].values[idx.valueIndex].value;

                let roiId = this._binaryModel.raw.visibleROIs[idx.pointGroup];
                let roiName = this._widgetDataService.regions.get(roiId).name;
                data += `${pmc},"${roiName}",${xValue},${yValue}\n`;
            }
        });

        return data;
    }
}
