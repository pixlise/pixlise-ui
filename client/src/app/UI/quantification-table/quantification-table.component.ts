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
import { Subscription, combineLatest, Observable } from "rxjs";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { PredefinedROIID } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpressionId } from "src/app/models/Expression";
import { tableState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, RegionDataResults, WidgetDataUpdateReason, WidgetRegionDataService, RegionData } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { TableData, TableHeaderItem, TableRow } from "src/app/UI/atoms/table/table.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { SentryHelper } from "src/app/utils/utils";
import { ExpressionReferences } from "../references-picker/references-picker.component";


@Component({
    selector: ViewStateService.widgetSelectorQuantificationTable,
    templateUrl: "./quantification-table.component.html",
    styleUrls: ["./quantification-table.component.scss", "../atoms/table/table.component.scss"]
})
export class QuantificationTableComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    @Input() widgetPosition: string = "";

    private _visibleROIs: string[] = [PredefinedROIID.AllPoints, PredefinedROIID.SelectedPoints];
    private _usePureElement: boolean = false;
    private _orderByAbundance: boolean = false;

    private _showSettings: boolean = false;

    private _viewInited: boolean = false;

    private _references: string[] = [];

    regionDataTables: TableData[] = [];
    helpMessage: string = "";

    constructor(
        private _widgetDataService: WidgetRegionDataService,
        private _viewStateService: ViewStateService,
        private _exprService: DataExpressionService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (updReason: WidgetDataUpdateReason)=>
            {
                // Check if we have applied the view state
                if(!this._viewInited)
                {
                    console.log("Restoring table view state...");

                    let loadedState = this._widgetDataService.viewState.tables.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this._usePureElement = loadedState.showPureElements;
                        this._orderByAbundance = loadedState.order != "atomic-number";
                        this._visibleROIs = loadedState.visibleROIs;
                    }

                    this._viewInited = true;
                }

                this.updateTable("widget-data", updReason);
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorQuantificationTable;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    private saveState(reason: string): void
    {
        console.log("table saveState called due to: "+reason);
        this._viewStateService.setTable(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): tableState
    {
        let toSave = new tableState(
            this._usePureElement,
            this._orderByAbundance ? "abundance" : "atomic-number",
            this._visibleROIs
        );
        return toSave;
    }

    get validDetectors(): string[]
    {
        return this._exprService.validDetectors;
    }

    private updateTable(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        console.log("Quantification table update reason: "+reason);

        // Rebuild the table
        this.regionDataTables = [];
        this.helpMessage = "";

        const detectors = this.validDetectors;
        const quantification = this._widgetDataService.quantificationLoaded;

        if(!quantification)
        {
            this.helpMessage = "Citizen must load a quantification first!";
            return;
        }

        const formulae = this.getFormulaeToQuery(quantification);

        let allFormulaeQueried: string[][] = [];
        let allResults$: Observable<RegionDataResults>[] = [];

        for(let roiId of this._visibleROIs)
        {
            // Query the data as columns
            let query: DataSourceParams[] = [];

            // For each element...
            let region = this._widgetDataService.regions.get(roiId);
            if(!region)
            {
                const err = "Region: "+roiId+" not found";
                this.helpMessage = err;
                console.warn(err);
                continue;
            }

            let formulaeQueried: string[] = [];

            for(let formula of formulae)
            {
                for(let detector of detectors)
                {
                    let exprId = DataExpressionId.makePredefinedQuantElementExpression(formula, "%", detector);
                    query.push(new DataSourceParams(exprId, roiId, ""));
                    formulaeQueried.push(formula);
                }
            }

            // Query these
            allFormulaeQueried.push(formulaeQueried);
            allResults$.push(this._widgetDataService.getData(query, false));
        }

        // Wait for them all
        combineLatest(allResults$).subscribe(
            (resultsByROI: RegionDataResults[])=>
            {
                let c = 0;
                for(let roiResult of resultsByROI)
                {
                    this.processROIColumns(roiResult, detectors, allFormulaeQueried[c]);
                    c++;
                }

                // Finally we update references...
                this.updateReferences();
            }
        );
    }

    private processROIColumns(queryData: RegionDataResults, detectors: string[], formulaeQueried: string[])
    {
        let region: RegionData = null;
        let rows: TableRow[] = [];
        let totalValues: number[] = [];
        let headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];

        if(queryData.error)
        {
            const err = "Error: "+queryData.error;
            this.helpMessage = err;
            console.error(err);
        }
        else
        {
            // Loop through all of them...
            let row: TableRow = null;

            for(let det of detectors)
            {
                totalValues.push(0);
                headers.push(new TableHeaderItem("Weight %", "("+det+")"));
            }

            for(let c = 0; c < queryData.queryResults.length; c++)
            {
                let data = queryData.queryResults[c];
                if(data)
                {
                    // Save this for later... it should be the same one in all queryResults
                    region = data.region;

                    if(!row || (c % detectors.length) == 0)
                    {
                        if(row)
                        {
                            rows.push(row);
                        }

                        row = new TableRow(formulaeQueried[c], [], []);
                    }

                    // Calculate the average/total for this row value (combination of element+detector)
                    let weightTotal = 0;
                    let weightAvg = 0;

                    if(!data.values || !data.values.values)
                    {
                        // We've seen this in Sentry a few times and it's not obvious why, so alert about it
                        SentryHelper.logMsg(false, "Table data.values null for region: "+data.query.roiId+", elem: "+formulaeQueried[c]+", for quant: "+(this._widgetDataService.quantificationLoaded ? this._widgetDataService.quantificationLoaded.quantId : "no-quant"));
                    }

                    if(data.values && data.values.values && data.values.values.length > 0)
                    {
                        for(let value of data.values.values)
                        {
                            weightTotal += value.value;
                        }

                        weightAvg = weightTotal / data.values.values.length;
                        totalValues[row.values.length] += weightAvg;
                    }
                    else if(data.region.locationIndexes.length <= 0)
                    {
                        weightAvg = null;
                    }

                    // Save in the row
                    row.values.push(weightAvg);
                }
                else
                {
                    // Remember that we got errors here
                    const err = "Table failed to retrieve data for expr: "+data.query.exprId+", roi: "+data.query.roiId;
                    this.helpMessage = err;
                    console.error(err);
                }
            }

            // Save the last one
            if(row)
            {
                rows.push(row);
            }
        }

        if(rows.length > 0)
        {
            if(this._orderByAbundance)
            {
                this.orderRowsByWeightPct(rows);
            }

            this.regionDataTables.push(
                new TableData(
                    region.name,
                    region.colour ? RGBA.fromWithA(region.colour, 1).asString() : "",
                    " Wt.%",
                    headers,
                    rows,
                    new TableRow("Totals:", totalValues, [])
                )
            );
        }
    }

    private updateReferences()
    {
        this._references.forEach((referenceName) =>
        {
            let headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];
            headers.push(new TableHeaderItem("Weight %", ""));
            headers.push(new TableHeaderItem("Error", ""));

            let reference = ExpressionReferences.getByName(referenceName);
            let combinedExpressionValues = ExpressionReferences.getCombinedExpressionValues(reference);
            let rows = combinedExpressionValues.map((expressionValue) =>
            {
                let detectorAName = `${expressionValue.name}-%(A)`;

                let expressionName = this._exprService.getExpressionShortDisplayName(detectorAName, 30);
                let elementName = expressionName.shortName.replace("-A", "");

                let refValue = ExpressionReferences.getExpressionValue(reference, detectorAName);

                return new TableRow(elementName, [refValue.weightPercentage, refValue.error], []);
            });

            let total = rows.reduce((total, row) => total + row.values[0], 0);
            let totalErr = rows.reduce((total, row) => total + row.values[1], 0);

            this.regionDataTables.push(
                new TableData(
                    referenceName,
                    Colours.CONTEXT_PURPLE.asString(),
                    [" Wt.% ", ""],
                    headers,
                    rows,
                    new TableRow("Totals:", [total, totalErr], [])
                )
            );
        });
    }

    private getFormulaeToQuery(quant: QuantificationLayer): string[]
    {
        let formulae = quant.getElementFormulae();

        // Decide what versions of formulae we're using... most complex state (oxides/carbonates), or pure elements
        let complexElems = periodicTableDB.getOnlyMostComplexStates(formulae);

        if(this._usePureElement)
        {
            // Exclude all the complex elements
            let pures: string[] = [];
            for(let formula of formulae)
            {
                if(formula.length <= 2)
                {
                    pures.push(formula);
                }
            }

            formulae = pures;
        }
        else
        {
            // Use only the complex forms (thereby excluding anything that's a pure-element of a carbonate/oxide that's quantified)
            formulae = complexElems;
        }

        // Finally, sort by atomic-number
        return periodicTableDB.getElementsInAtomicNumberOrder(formulae);
    }

    private orderRowsByWeightPct(rows: TableRow[]): void
    {
        rows.sort((a: TableRow, b: TableRow)=> 
        {
            if(a.values[0] < b.values[0])
            {
                return 1;
            }
            if(a.values[0] > b.values[0])
            {
                return -1;
            }
            return 0;
        });
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ROIPickerData(true, true, false, false, this._visibleROIs, true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs && visibleROIs.length > 0)
                {
                    this._visibleROIs = visibleROIs;

                    const reason = "rois-dialog";

                    this.saveState(reason);
                    this.updateTable(reason, null);
                }
            }
        );
    }

    onReferences(references): void
    {
        this._references = references;
        this.updateTable("references-changed", null);
    }


    get usePureElement(): boolean
    {
        return this._usePureElement;
    }

    togglePureElement(): void
    {
        this._usePureElement = !this._usePureElement;

        const reason = "pure-element";
        this.saveState(reason);
        this.updateTable(reason, null);
    }

    get orderByAbundance(): boolean
    {
        return this._orderByAbundance;
    }

    setOrderByAbundance(event): void
    {
        this._orderByAbundance = !this._orderByAbundance;

        const reason = "order-change";
        this.saveState(reason);
        this.updateTable(reason, null);
    }

    get showSettings(): boolean
    {
        return this._showSettings;
    }

    onShowSettings(): void
    {
        this._showSettings = true;
    }
}
