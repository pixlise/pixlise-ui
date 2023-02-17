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
import { Router } from "@angular/router";
import { Subject, Subscription } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { chordState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, WidgetDataUpdateReason, WidgetRegionDataService, RegionDataResults } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { HelpMessage } from "src/app/utils/help-message";
import { getPearsonCorrelation } from "src/app/utils/utils";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "../atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "../atoms/interactive-canvas/pan-zoom";
import { ChordDiagramDrawer } from "./drawer";
import { ChordDiagramInteraction } from "./interaction";
import { ChordDrawMode, ChordNodeData, ChordViewModel } from "./model";


@Component({
    selector: ViewStateService.widgetSelectorChordDiagram,
    templateUrl: "./chord-view-widget.component.html",
    styleUrls: ["./chord-view-widget.component.scss"]
})
export class ChordViewWidgetComponent implements OnInit, OnDestroy, CanvasDrawer
{
    @Input() widgetPosition: string = "";

    //    private id = randomString(4);
    private _subs = new Subscription();

    public drawForSelection: boolean = false;

    private _mdl: ChordViewModel = null;

    private _drawMode: string = ChordDrawMode.BOTH.toString();
    private _threshold: number = 0;

    private _displayROI: string = "";
    private _displayExpressionIDs: string[] = [];

    public helpMessage: string = null;

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;

    currentRegionName: string = "";
    currentRegionColour: string = "";
    showKey: boolean = false;

    private _viewInited: boolean = false;

    constructor(
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _exprService: DataExpressionService,
        private _viewStateService: ViewStateService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog,
        private router: Router
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (updReason: WidgetDataUpdateReason)=>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring chord diagram view state...");

                    let loadedState = this._widgetDataService.viewState.chordDiagrams.get(this.widgetPosition);

                    if(loadedState)
                    {
                        // Save & validate what we can
                        this.drawForSelection = loadedState.showForSelection;
                        this._displayExpressionIDs = loadedState.expressionIDs;
                        this._displayROI = loadedState.displayROI;

                        this._drawMode = loadedState.drawMode;
                        if(this._drawMode != ChordDrawMode.BOTH.toString() &&
                            this._drawMode != ChordDrawMode.NEGATIVE.toString() &&
                            this._drawMode != ChordDrawMode.POSITIVE.toString())
                        {
                            this._drawMode = ChordDrawMode.BOTH.toString();
                        }
                        this._threshold = loadedState.threshold;
                        if(this._threshold < 0 || this._threshold > 1)
                        {
                            this._threshold = 0;
                        }
                    }
                    else
                    {
                        console.warn("Failed to find view state for chord diagram: "+this.widgetPosition);
                    }

                    // Apply to the model if it exists already
                    if(this._mdl)
                    {
                        this._mdl.chordLowerThreshold = this._threshold;
                        this._mdl.drawMode = ChordDrawMode[this._drawMode];
                    }

                    this._viewInited = true;
                }

                // Region info has been updated, rebuild our chart
                this.recalcCorrelationData("widget-data", updReason);
            }
        ));
    }

    ngOnDestroy()
    {
        //console.warn('Chord ['+this.id+'] ngOnDestroy');
        this._subs.unsubscribe();
    }

    get cursorShown(): string
    {
        let cursor = "";
        if(this._mdl)
        {
            cursor = this._mdl.cursorShown;
        }
        return cursor;
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorChordDiagram;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    onToggleKey(): void
    {
        this.showKey = !this.showKey;
    }

    private saveState(reason: string): void
    {
        console.log("chord plot saveState called due to: "+reason);
        this._viewStateService.setChord(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): chordState
    {
        let toSave = new chordState(
            this.drawForSelection,
            this._displayExpressionIDs,
            this._displayROI,
            this.getChordLowerThreshold(),
            this.getChordDrawMode()
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

    onChangeShowSelection(show: boolean): void
    {
        this.drawForSelection = show;
        this.recalcCorrelationData("sel-toggle", null);
    }

    getChangeDrawModeNames(): string[]
    {
        return [ChordDrawMode.NEGATIVE, ChordDrawMode.BOTH, ChordDrawMode.POSITIVE];
    }

    onChangeDrawMode(activeMode: string): void
    {
        this._drawMode = activeMode;
        this._mdl.drawMode = ChordDrawMode[activeMode];
        this.saveState("chord-draw-mode");
        this.needsDraw$.next();
    }

    getChordDrawMode(): string
    {
        return ChordDrawMode[this._drawMode];
    }

    get sliderTrackColourYellow(): string
    {
        return Colours.GRAY_50.asString();
    }

    get sliderTrackColourGray(): string
    {
        return Colours.GRAY_50.asString();
    }

    get showSelectionSwitch(): boolean
    {
        return this._displayROI == PredefinedROIID.AllPoints;
    }

    getChordLowerThreshold(): number
    {
        return this._threshold;
    }

    onChangeChordLowerThreshold(value: SliderValue): void
    {
        this._threshold = value.value;
        this._mdl.chordLowerThreshold = value.value;
        if(value.finish)
        {
            this.saveState("chord-threshold");
        }
        this.needsDraw$.next();
    }

    onClickChooseNodes(): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ExpressionPickerData("Nodes", DataExpressionService.DataExpressionTypeAll, this._displayExpressionIDs, false, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (displayIds: string[])=>
            {
                // Result should be a list of element symbol strings
                if(displayIds)
                {
                    this._displayExpressionIDs = displayIds;

                    const reason = "choose-node";
                    this.saveState(reason);
                    this.recalcCorrelationData(reason, null);
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
        dialogConfig.data = new ROIPickerData(true, true, true, true, [this._displayROI], true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs && visibleROIs.length > 0)
                {
                    this._displayROI = visibleROIs[0];

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.recalcCorrelationData(reason, null);
                }
            }
        );
    }

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

    private setStartingExpressions()
    {
        // Pick the first 10 elements/pseudointensities, don't pick expressions randomly!
        // If the quant has A and B, we just pick off the A's
        const startExprCount = 10;

        let ids = this._exprService.getStartingExpressions(this._widgetDataService.quantificationLoaded);
        let detectorCount = (this._widgetDataService.quantificationLoaded ? this._widgetDataService.quantificationLoaded.getDetectors().length : 0);
        if(detectorCount > 1)
        {
            // We have multiple detectors, pick off the first ones
            this._displayExpressionIDs = [];
            for(let c = 0; c < ids.length; c++)
            {
                if(c % detectorCount == 0)
                {
                    this._displayExpressionIDs.push(ids[c]);
                    if(this._displayExpressionIDs.length > startExprCount)
                    {
                        break;
                    }
                }
            }
        }
        else
        {
            this._displayExpressionIDs = ids.slice(0, 10);
        }

        console.log("  Chord view: Starting expression set to: "+this._displayExpressionIDs.join(","));
    }

    private recalcCorrelationData(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        //console.warn('Chord ['+this.id+'] recalcCorrelationData reason: '+reason);
        console.log("Chord recalcCorrelationData reason: "+reason+", region: "+this._displayROI+", selectedPts: "+this.drawForSelection);

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
        if(this._displayExpressionIDs.length < 2)
        {
            this.helpMessage = HelpMessage.NOT_ENOUGH_ELEMENTS;
            return;
        }

        // If no ROI selected, use all points
        if(this._displayROI.length <= 0)
        {
            this._displayROI = PredefinedROIID.AllPoints;
        }

        let queryROI = this._displayROI;
        if(this.drawForSelection && queryROI == PredefinedROIID.AllPoints)
        {
            queryROI = PredefinedROIID.SelectedPoints;
        }

        // Use widget data service to rebuild our data model
        let query: DataSourceParams[] = [];
        for(let exprId of this._displayExpressionIDs)
        {
            query.push(new DataSourceParams(exprId, queryROI, ""));

            // If we just added a request for an element expression, also add one for the corresponding error column value
            let elem = DataExpressionService.getPredefinedQuantExpressionElement(exprId);
            if(elem.length)
            {
                let detector = DataExpressionService.getPredefinedQuantExpressionDetector(exprId);

                let errExprId = DataExpressionService.makePredefinedQuantElementExpression(elem, "err", detector);
                query.push(new DataSourceParams(errExprId, queryROI, ""));
            }
        }

        this._widgetDataService.getData(query, false).subscribe(
            (queryData: RegionDataResults)=>
            {
                if(queryData.error)
                {
                    this.helpMessage = HelpMessage.ROI_QUERY_FAILED;
                    return;
                }

                this.processQueryResult(t0, queryROI, query, queryData);
            }
        )
    }
 
    private processQueryResult(t0: number, queryROI: string, query: DataSourceParams[], queryData: RegionDataResults)
    {
        let region = this._widgetDataService.regions.get(queryROI);
        if(region)
        {
            this.currentRegionName = region.name;

            if(region.colour)
            {
                let clrNoAlpha = RGBA.from(region.colour);
                clrNoAlpha.a = 255;
                this.currentRegionColour = clrNoAlpha.asString();
            }
            else
            {
                this.currentRegionColour = "";
            }

            // If we've been instructed to view selected points, but none are available, show a specific
            // error so user can diagnose this easily. If this wasn't here we'd show NO_QUANT_FOR_SELECTION
            // which is a bit misleading
            if(region.locationIndexes.length <= 0 && queryROI == PredefinedROIID.SelectedPoints)
            {
                this.helpMessage = HelpMessage.SELECTION_EMPTY;
                return;
            }
            // As above, for remaining points
            if(region.locationIndexes.length <= 0 && queryROI == PredefinedROIID.RemainingPoints)
            {
                this.helpMessage = HelpMessage.REMAINING_POINTS_EMPTY;
                return;
            }
        }

        this._mdl = new ChordViewModel();

        // Apply the view settings
        this._mdl.chordLowerThreshold = this._threshold;
        this._mdl.drawMode = ChordDrawMode[this._drawMode];

        let elemColumns: Map<string, number[]> = new Map<string, number[]>();
        let elemColumnTotals: Map<string, number> = new Map<string, number>();
        let elemColumnError: Map<string, number> = new Map<string, number>();
        let allTotals = 0;
        let rowCount = 0;

        for(let queryIdx = 0; queryIdx < query.length; queryIdx++)
        {
            const colData = queryData.queryResults[queryIdx];
            const exprId = query[queryIdx].exprId;

            // TODO: David says we can probably average A and B values here
            if(queryData.queryResults[queryIdx].errorType)
            {
                let err = "Failed to retrieve data for node in chord diagram, expression id: "+exprId+", error: "+queryData.queryResults[queryIdx].error;
                console.warn(err);
                continue;
            }

            let concentrationCol = colData.values;

            rowCount = concentrationCol.values.length;

            // If we get no values for the given PMCs, display an error and stop here
            if(concentrationCol.values.length <= 0)
            {
                this.helpMessage = HelpMessage.NO_QUANT_FOR_SELECTION;
                return;
            }

            let errorCol: PMCDataValues = null;

            let elem = DataExpressionService.getPredefinedQuantExpressionElement(exprId);
            if(elem.length)
            {
                errorCol = queryData.queryResults[queryIdx+1].values;

                // skip next column, as we're reading it together with this one
                queryIdx++;
            }

            // Calc sum of concentrations and read out column into an array
            let concentrationSum = 0;
            let concentrationValues: number[] = [];
            let errorSum = 0;

            for(let c = 0; c < concentrationCol.values.length; c++)
            {
                let concentration = concentrationCol.values[c].value;
                concentrationSum += concentration;
                concentrationValues.push(concentrationCol.values[c].value);

                if(errorCol)
                {
                    errorSum += errorCol.values[c].value;
                }
            }

            let avgError = 0;
            if(errorCol && errorCol.values && errorCol.values.length > 0)
            {
                avgError = errorSum/errorCol.values.length;
            }

            elemColumns.set(exprId, concentrationValues);
            elemColumnTotals.set(exprId, concentrationSum);
            elemColumnError.set(exprId, avgError);

            allTotals += concentrationSum;
        }

        // Build correlation matrix between elements
        //let corrMatrix = jz.arr.correlationMatrix(quantdata, quant.getElements());

        // Loop through each expr and calculate the correlation for each other expr array
        let rawNodes: ChordNodeData[] = [];
        for(let exprId of this._displayExpressionIDs)
        {
            let exprTotal = elemColumnTotals.get(exprId);
            let errorMsg = "";
            let names = this._exprService.getExpressionShortDisplayName(exprId, 10);

            let concentration = 0;
            let dispConcentration = 0;
            let error = 0;

            if(exprTotal == undefined)
            {
                // We don't have data for this, probably an issue with the expression specified, just skip over it
                errorMsg = "No data found, does this exist in quantification?";
            }
            else
            {
                concentration = exprTotal/allTotals;
                dispConcentration = exprTotal/rowCount;
                error = elemColumnError.get(exprId);
            }

            //console.log(elem+' error='+error+', %='+concentration);
            let item = new ChordNodeData(names.shortName, names.name, exprId, concentration, dispConcentration, error, [], errorMsg);

            // Add chords
            // NOTE: We add a chord value for every node. This means the drawing code has a value for all and we don't
            //       need to store a from-to index or anything. However, if you leave one out, drawing code will connect
            //       lines between the wrong nodes!
            for(let otherExprId of this._displayExpressionIDs)
            {
                let otherCols = elemColumns.get(otherExprId);
                if(!otherCols)
                {
                    otherCols = [];
                }

                let elemCol = elemColumns.get(exprId);
                if(!elemCol)
                {
                    elemCol = [];
                }

                let correlation = 0;
                if(exprId != otherExprId)
                {
                    correlation = getPearsonCorrelation(elemCol, otherCols);
                }

                //console.log('add chord to: '+item.label+', other: '+otherExprId+', thisExpr: '+exprId+', correlation='+correlation);
                if(correlation != null)
                {
                    item.chords.push(correlation);
                }
            }

            rawNodes.push(item);
        }

        this._mdl.raw = rawNodes;

        // Set up the rest
        this.drawer = new ChordDiagramDrawer(this._mdl);
        this.interaction = new ChordDiagramInteraction(this._mdl, this._selectionService);

        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

        console.log("  Chord prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }
}
