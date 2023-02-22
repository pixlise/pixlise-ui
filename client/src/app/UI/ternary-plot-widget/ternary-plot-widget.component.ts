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
import { DataSet } from "src/app/models/DataSet";
import { orderVisibleROIs, PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { ternaryState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, DataUnit, RegionDataResults, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { httpErrorToString, randomString } from "src/app/utils/utils";
import { TernaryDiagramDrawer } from "./drawer";
import { TernaryInteraction } from "./interaction";
import { TernaryModel } from "./model";
import { TernaryCorner, TernaryData, TernaryDataColour, TernaryDataItem, TernaryPlotPointIndex } from "./ternary-data";
import { exportScatterPlot, ExportPlotCaller } from "src/app/UI/ternary-plot-widget/export-helper";
import { ExpressionReferences } from "../references-picker/references-picker.component";


@Component({
    selector: ViewStateService.widgetSelectorTernaryPlot,
    templateUrl: "./ternary-plot-widget.component.html",
    styleUrls: ["./ternary-plot-widget.component.scss"]
})
export class TernaryPlotWidgetComponent implements OnInit, OnDestroy, CanvasDrawer, ExportPlotCaller
{
    @Input() widgetPosition: string = "";
    @Input() previewExpressionIDs: string[] = [];

    private id = randomString(4);
    private _subs = new Subscription();

    private _visibleROIs: string[] = [];

    private _references: string[] = [];

    // Triangle points
    //    C
    //
    // A     B
    private _aExpressionId: string = "";
    private _bExpressionId: string = "";
    private _cExpressionId: string = "";

    showMmol: boolean = false;

    private _ternaryModel: TernaryModel = null;

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
                if(!this._aExpressionId.startsWith("unsaved-") && !this._bExpressionId.startsWith("unsaved-") && !this._cExpressionId.startsWith("unsaved-"))
                {
                    // Default set axes to first three preview expressions passed
                    if(this._exprService.getExpression(this.previewExpressionIDs[0]))
                    {
                        this._aExpressionId = this.previewExpressionIDs[0];
                    }
                    if(this.previewExpressionIDs.length > 1 && this._exprService.getExpression(this.previewExpressionIDs[1]))
                    {
                        this._bExpressionId = this.previewExpressionIDs[1];
                    }
                    if(this.previewExpressionIDs.length > 2 && this._exprService.getExpression(this.previewExpressionIDs[2]))
                    {
                        this._cExpressionId = this.previewExpressionIDs[2];
                    }
                }

                this.prepareData("preview-expression-refresh", null);
            }));
        }

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
                    console.log("Restoring ternary plot view state...");

                    let loadedState = this._widgetDataService.viewState.ternaryPlots.get(this.widgetPosition);

                    if(loadedState)
                    {
                        this.showMmol = loadedState.showMmol;

                        if(loadedState.expressionIDs.length == 3)
                        {
                            this._aExpressionId = loadedState.expressionIDs[0];
                            this._bExpressionId = loadedState.expressionIDs[1];
                            this._cExpressionId = loadedState.expressionIDs[2];
                        }
                        else
                        {
                            this._aExpressionId = "";
                            this._bExpressionId = "";
                            this._cExpressionId = "";
                        }

                        this._visibleROIs = orderVisibleROIs(loadedState.visibleROIs);
                    }
                    else
                    {
                        console.warn("Failed to find view state for ternary plot: "+this.widgetPosition);
                    }

                    this._viewInited = true;
                }
                else
                {
                    // Not the first time, check if we can ignore...
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
        return ViewStateService.widgetSelectorTernaryPlot;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    get cursorShown(): string
    {
        let cursor = "";
        if(this._ternaryModel)
        {
            cursor = this._ternaryModel.cursorShown;
        }
        return cursor;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    private saveState(reason: string): void
    {
        console.log("ternary plot saveState called due to: "+reason);
        this._viewStateService.setTernary(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): ternaryState
    {
        let toSave = new ternaryState(
            this.showMmol,
            [this._aExpressionId, this._bExpressionId, this._cExpressionId],
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
        console.log("Ternary ["+this.id+"] prepareData reason: "+reason);

        let t0 = performance.now();
        this.setDefaultsIfNeeded(widgetUpdReason);

        // Use widget data service to rebuild our data model
        let expressions: DataExpression[] = []; // TODO: Remove this and refactor to rely on the result from getData()

        let exprIds = [this._aExpressionId, this._bExpressionId, this._cExpressionId];

        for(let exprId of exprIds)
        {
            if(exprId.length > 0)
            {
                let expr = this._exprService.getExpression(exprId);
                expressions.push(expr);
            }
        }

        let corners: TernaryCorner[] = [
            new TernaryCorner("", "", "", new MinMax()),
            new TernaryCorner("", "", "", new MinMax()),
            new TernaryCorner("", "", "", new MinMax()),
        ];

        this.keyItems = [];
        this.expressionsMissingPMCs = "";

        if(expressions.length != 3)
        {
            this.assignEmptyQuery(t0);
        }
        else
        {
            for(let c = 0; c < expressions.length; c++)
            {
                let expr = expressions[c];
                if(expr)
                {
                    corners[c].label = expr.getExpressionShortDisplayName(18).shortName;

                    const mmolAppend = "(mmol)";
                    if(this.showMmol && !corners[c].label.endsWith(mmolAppend)) // Note this won't detect if (mmol) was modified by short name to be (mm...
                    {
                        corners[c].label += mmolAppend;
                    }
                }
            }

            let query: DataSourceParams[] = [];
            for(let roiId of this._visibleROIs)
            {
                for(let exprId of exprIds)
                {
                    query.push(new DataSourceParams(exprId, roiId, "", this.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT));
                }
            }

            this._widgetDataService.getData(query, true).subscribe(
                (queryData)=>
                {
                    if(queryData.error)
                    {
                        console.error("Ternary prepareData failed: "+queryData.error);
                    }
                    else
                    {
                        this.processQueryResult(t0, exprIds, queryData, corners);
                    }
                },
                (err)=>
                {
                    console.error(httpErrorToString(err, "Ternary prepareData error"));
                    this.assignEmptyQuery(t0);
                }
            );
        }
    }

    private processQueryResult(t0: number, exprIds: string[], queryData: RegionDataResults, corners: TernaryCorner[])
    {
        let pointGroups: TernaryDataColour[] = [];
        let pmcLookup: Map<number, TernaryPlotPointIndex> = new Map<number, TernaryPlotPointIndex>();

        let queryWarnings: string[] = [];

        for(let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx+=exprIds.length)
        {
            // Set up storage for our data first
            const roiId = queryData.queryResults[queryIdx].query.roiId;

            let region = queryData.queryResults[queryIdx].region;
            if(!region || !region.colour)
            {
                if(!region)
                {
                    console.log("Ternary failed to find region: "+roiId+". Skipped.");
                }

                continue;
            }

            let pointGroup: TernaryDataColour = new TernaryDataColour(RGBA.fromWithA(region.colour, 1), region.shape, []);

            // Filter out PMCs that don't exist in the data for all 3 corners
            let toFilter: PMCDataValues[] = [];
            for(let c = 0; c < exprIds.length; c++)
            {
                toFilter.push(queryData.queryResults[queryIdx+c].values);

                if(queryData.queryResults[queryIdx+c].warning)
                {
                    queryWarnings.push(queryData.queryResults[queryIdx+c].warning);
                }
            }

            let filteredValues = PMCDataValues.filterToCommonPMCsOnly(toFilter);

            // Read for each expression
            for(let c = 0; c < exprIds.length; c++)
            {
            // Did we find an error with this query?
                if(queryData.queryResults[queryIdx+c].error)
                {
                    corners[c].errorMsgShort = queryData.queryResults[queryIdx+c].errorType;
                    corners[c].errorMsgLong = queryData.queryResults[queryIdx+c].error;

                    console.log("Ternary encountered error with expression: "+exprIds[c]+", on region: "+roiId+", corner: "+(c == 0 ? "left" : (c == 1 ? "top": "right")));
                    continue;
                }

                let roiValues: PMCDataValues = filteredValues[c];

                // Update corner min/max
                corners[c].valueRange.expandByMinMax(roiValues.valueRange);

                // Store the A/B/C values
                for(let i = 0; i < roiValues.values.length; i++)
                {
                    let value = roiValues.values[i];

                    // Save it in A, B or C - A also is creating the value...
                    if(c == 0)
                    {
                        pointGroup.values.push(new TernaryDataItem(value.pmc, value.value, 0, 0));
                    }
                    else
                    {
                        // Ensure we're writing to the right PMC
                        // Should always be the right order because we run 3 queries with the same ROI
                        if(pointGroup.values[i].pmc != value.pmc)
                        {
                            throw new Error("Received PMCs in unexpected order for ternary corner: "+c+", got PMC: "+value.pmc+", expected: "+pointGroup.values[i].pmc);
                        }

                        if(c == 1)
                        {
                            pointGroup.values[i].b = value.value;
                        }
                        else // exprIds is an array of 3 so can only be: if(c == 2)
                        {
                            pointGroup.values[i].c = value.value;
                        }
                    }
                }
            }

            // Add to key too. We only specify an ID if it can be brought to front - all points & selection
            // are fixed in their draw order, so don't supply for those
            let roiIdForKey = region.id;
            if(PredefinedROIID.isPredefined(roiIdForKey))
            {
                roiIdForKey = "";
            }

            this.keyItems.push(new KeyItem(roiIdForKey, region.name, region.colour, null, region.shape));

            for(let c = 0; c < pointGroup.values.length; c++)
            {
                pmcLookup.set(pointGroup.values[c].pmc, new TernaryPlotPointIndex(pointGroups.length, c));
            }

            if(pointGroup.values.length > 0)
            {
                pointGroups.push(pointGroup);
            }
        }

        this.assignQueryResult(t0, pointGroups, corners, pmcLookup, queryWarnings);
    }

    private assignEmptyQuery(t0: number)
    {
        this.assignQueryResult(
            t0,
            [],
            [],
            new Map<number, TernaryPlotPointIndex>(),
            [],
        );
    }

    private assignQueryResult(
        t0: number,
        pointGroups: TernaryDataColour[] = [],
        corners: TernaryCorner[],
        pmcLookup: Map<number, TernaryPlotPointIndex>,
        queryWarnings: string[]
    )
    {
        if(this._references.length > 0)
        {
            let pointGroup: TernaryDataColour = new TernaryDataColour(Colours.CONTEXT_PURPLE, "circle", []);

            this._references.forEach((referenceName, i) =>
            {
                let reference = ExpressionReferences.getByName(referenceName);

                if(!reference)
                {
                    console.error(`TernaryPlot prepareData: Couldn't find reference ${referenceName}`);
                    return;
                }

                let refAValue = ExpressionReferences.getExpressionValue(reference, this._aExpressionId)?.weightPercentage;
                let refBValue = ExpressionReferences.getExpressionValue(reference, this._bExpressionId)?.weightPercentage;
                let refCValue = ExpressionReferences.getExpressionValue(reference, this._cExpressionId)?.weightPercentage;
                let nullMask = [refAValue == null, refBValue == null, refCValue == null];

                // If we have more than one null value, we can't plot this reference on a ternary plot
                if(nullMask.filter(isNull => isNull).length > 1)
                {
                    console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this._aExpressionId},${this._bExpressionId},${this._cExpressionId} values`);
                    return;
                }

                if(refAValue == null)
                {
                    refAValue = 0;
                    console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this._aExpressionId} value`);
                }
                if(refBValue == null)
                {
                    refBValue = 0;
                    console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this._bExpressionId} value`);
                }
                if(refCValue == null)
                {
                    refCValue = 0;
                    console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this._cExpressionId} value`);
                }

                // We don't have a PMC for these, so -10 and below are now reserverd for reference values
                let referenceIndex = ExpressionReferences.references.findIndex((ref) => ref.name === referenceName);
                let id = -10 - referenceIndex;

                pointGroup.values.push(new TernaryDataItem(id, refAValue, refBValue, refCValue, referenceName, nullMask));
                pmcLookup.set(id, new TernaryPlotPointIndex(this._references.length, i));
            });

            pointGroups.push(pointGroup);
            this.keyItems.push(new KeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, null, "circle"));
        }

        if(queryWarnings.length > 0)
        {
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
        let ternaryData = new TernaryData(
            corners[0],
            corners[1],
            corners[2],
            pointGroups,
            pmcLookup,
            this._visibleROIs
        );

        if(!this._ternaryModel)
        {
            this._ternaryModel = new TernaryModel();
        }

        this._ternaryModel.showMmol = this.showMmol;

        let terIntr = new TernaryInteraction(this._ternaryModel, this._selectionService, this._datasetService, this._widgetDataService);
        this._subs.add(terIntr.cornerClick.subscribe(
            (corner: string)=>
            {
                this.onCornerSwap(corner);
            }
        ));

        this.interaction = terIntr;
        this.drawer = new TernaryDiagramDrawer(this._ternaryModel);

        this._ternaryModel.raw = ternaryData;
        
        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

        console.log("  Ternary prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }

    private setDefaultsIfNeeded(widgetUpdReason: WidgetDataUpdateReason): void
    {
        // If we don't have any elements set to display, use the first 3 in the quant data
        if(
            this._aExpressionId.length <= 0 ||
            this._bExpressionId.length <= 0 ||
            this._cExpressionId.length <= 0 ||
            (
                widgetUpdReason == WidgetDataUpdateReason.WUPD_QUANT &&
                DataExpressionId.hasPseudoIntensityExpressions(
                    [this._aExpressionId, this._bExpressionId, this._cExpressionId]
                )
            )
        )
        {
            // We don't have anything to show - get only the predefined expressions, as there should be data available for them
            let exprs = this._exprService.getStartingExpressions(this._widgetDataService.quantificationLoaded);


            if(exprs.length >= 3)
            {
                console.log("  Ternary view: Defaulting to first 3 expressions...");
                this._aExpressionId = exprs[0];
                this._bExpressionId = exprs[1];
                this._cExpressionId = exprs[2];
            }
            else
            {
                console.warn("  Ternary view: failed to default to first 3 expressions");
                /*                this._aExpressionId = '';
                this._bExpressionId = '';
                this._cExpressionId = '';*/
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
                    this._visibleROIs = orderVisibleROIs(visibleROIs);

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.prepareData(reason, null);
                }
            }
        );
    }

    exportPlotData(datasetId: string): string
    {
        let cornerALabel = this._ternaryModel.raw.cornerA.label;
        let cornerBLabel = this._ternaryModel.raw.cornerB.label;
        let cornerCLabel = this._ternaryModel.raw.cornerC.label;

        let data = `"PMC","ROI","${cornerALabel}","${cornerBLabel}","${cornerCLabel}"\n`;
        let dataset = this._datasetService.datasetLoaded;

        Array.from(this._ternaryModel.raw.pmcToValueLookup.entries()).forEach(([pmc, idx]) =>
        {
            // Check if this PMC is a member of the dataset ID we're exporting for
            if(dataset.getSubDatasetIdForPMC(pmc) == datasetId)
            {
                // Subtract the PMC offset
                pmc -= dataset.getIdOffsetForSubDataset(datasetId);

                let cornerAValue = this._ternaryModel.raw.pointGroups[idx.pointGroup].values[idx.valueIndex].a;
                let cornerBValue = this._ternaryModel.raw.pointGroups[idx.pointGroup].values[idx.valueIndex].b;
                let cornerCValue = this._ternaryModel.raw.pointGroups[idx.pointGroup].values[idx.valueIndex].c;

                let roiId = this._ternaryModel.raw.visibleROIs[idx.pointGroup];
                let roiName = this._widgetDataService.regions.get(roiId).name;
                data += `${pmc},"${roiName}",${cornerAValue},${cornerBValue},${cornerCValue}\n`;
            }
        });

        return data;
    }

    onExport()
    {
        if(!this._ternaryModel || !this._ternaryModel.raw)
        {
            return;
        }

        exportScatterPlot(this.dialog, "Ternary", this._datasetService.datasetLoaded, this);
    }

    onCornerSwap(corner: string): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        let exprIds = [];
        if(corner == "A")
        {
            exprIds = [this._aExpressionId];
        }
        else if(corner == "B")
        {
            exprIds = [this._bExpressionId];
        }
        else if(corner == "C")
        {
            exprIds = [this._cExpressionId];
        }

        dialogConfig.data = new ExpressionPickerData("Vertex", DataExpressionId.DataExpressionTypeAll, exprIds, true, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (displayIds: string[])=>
            {
                // Result should be a list of element symbol strings
                if(displayIds && displayIds.length > 0)
                {
                    // Transform back into our display elements
                    if(corner == "A")
                    {
                        this._aExpressionId = displayIds[0];
                    }
                    else if(corner == "B")
                    {
                        this._bExpressionId = displayIds[0];
                    }
                    else if(corner == "C")
                    {
                        this._cExpressionId = displayIds[0];
                    }

                    const reason = "corner-swap-"+corner;
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
        if(this._ternaryModel)
        {
            if(hoverPMC <= DataSet.invalidPMC && hoverPMC > -10)
            {
                // Clearing, easy case
                this._ternaryModel.hoverPoint = null;
                this._ternaryModel.hoverPointData = null;
                this._ternaryModel.hoverShape = "circle";
                this.needsDraw$.next();
                return;
            }

            // Find the point in our draw model data
            let idx = this._ternaryModel.raw.pmcToValueLookup.get(hoverPMC);
            if(idx != undefined && this._ternaryModel.drawData != null && this._ternaryModel.drawData.pointGroupCoords[idx.pointGroup])
            {
                let coords = this._ternaryModel.drawData.pointGroupCoords[idx.pointGroup];
                this._ternaryModel.hoverPoint = coords[idx.valueIndex];
                this._ternaryModel.hoverPointData = this._ternaryModel.raw.pointGroups[idx.pointGroup].values[idx.valueIndex];
                this._ternaryModel.hoverShape = this._ternaryModel.raw.pointGroups[idx.pointGroup].shape;
                this.needsDraw$.next();
                return;
            }
        }
    }

    onReferences(references)
    {
        this._references = references;
        this.prepareData("references changed", null);
    }

    get axesIDs(): string[]
    {
        return [this._aExpressionId, this._bExpressionId, this._cExpressionId];
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
        return this._ternaryModel ? this._ternaryModel.selectModeExcludeROI : false;
    }

    onToggleSelectModeExcludeROI()
    {
        this._ternaryModel.selectModeExcludeROI = !this._ternaryModel.selectModeExcludeROI;
    }
}
