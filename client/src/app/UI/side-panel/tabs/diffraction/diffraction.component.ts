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

import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { BeamSelection } from "src/app/models/BeamSelection";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { PredefinedROIID } from "src/app/models/roi";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeak, DiffractionPeakService, UserDiffractionPeak } from "src/app/services/diffraction-peak.service";
import { SelectionService } from "src/app/services/selection.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasDrawer, CanvasDrawParameters } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { UserPromptDialogComponent, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "src/app/UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { LayerManager } from "src/app/UI/context-image-view-widget/layer-manager";
import { HistogramDrawer } from "src/app/UI/side-panel/tabs/diffraction/drawer";
import { HistogramInteraction } from "src/app/UI/side-panel/tabs/diffraction/interaction";
import { DiffractionHistogramModel, HistogramBar, HistogramData, HistogramSelectionOwner } from "src/app/UI/side-panel/tabs/diffraction/model";
import { EnergyCalibrationManager } from "src/app/UI/spectrum-chart-widget/energy-calibration-manager";
import { Colours } from "src/app/utils/colours";
import { httpErrorToString } from "src/app/utils/utils";
import { EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";


@Component({
    selector: "app-diffraction",
    templateUrl: "./diffraction.component.html",
    styleUrls: ["./diffraction.component.scss"]
})
export class DiffractionComponent implements OnInit, CanvasDrawer, HistogramSelectionOwner
{
    public static readonly tableRowLimit = 100;
    private _subs = new Subscription();

    @ViewChild("periodicTableButton") periodicTableButton: ElementRef;

    peaks: DiffractionPeak[] = [];
    userPeaks: DiffractionPeak[] = [];

    private _allPeaks: DiffractionPeak[] = [];
    private _allPeakskeVRange: MinMax = new MinMax();
    private _pagablePeaks: DiffractionPeak[] = [];
    private _visiblePeakId: string = "";
    private _barSelected: boolean[] = [];
    private _barSelectedCount: number = 0;

    sortModeEffectSize = "Effect Size";
    sortModekeV = "Energy keV";
    sortModePMC = "PMC";

    private _sortCriteria: string = this.sortModeEffectSize;
    private _sortAscending: boolean = false;

    private _tablePage: number = 0;

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: HistogramInteraction = null;
    drawer: CanvasDrawer = null;

    private _histogramMdl: DiffractionHistogramModel = null;

    private _diffractionMapLayer: LocationDataLayerProperties = null;

    userPeaksListOpen: boolean = true;
    detectPeaksListOpen: boolean = false;

    userPeakEditing: boolean = false;

    constructor(
        private _contextImageService: ContextImageService,
        private _spectrumService: SpectrumChartService,
        private _datasetService: DataSetService,
        private _selectionService: SelectionService,
        private _diffractionService: DiffractionPeakService,
        private _exprService: DataExpressionService,
        private _authService: AuthenticationService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._diffractionService.allPeaks$.subscribe(
            (allPeaks: DiffractionPeak[])=>
            {
                this._allPeaks = allPeaks;

                // We can now work out how many bars to show on histogram
                this._allPeakskeVRange = new MinMax();
                for(let peak of this._allPeaks)
                {
                    this._allPeakskeVRange.expand(peak.keV);
                }

                // At this point, if our count differs, we reset the selection because we have new data somehow
                let barCount = Math.ceil(this._allPeakskeVRange.max/DiffractionHistogramModel.keVBinWidth*1.1);
                if(this._barSelected.length != barCount)
                {
                    this._barSelected = Array(barCount).fill(false);
                }

                this.onResetBarSelection();
                this.updateDisplayList();
            }
        ));

        this._subs.add(this._diffractionService.userPeaks$.subscribe(
            (userPeaks: Map<string, UserDiffractionPeak>)=>
            {
                // Run through user peaks, ones with non-negative keV are diffraction so store those
                this.userPeaks = [];

                for(let [id, peak] of userPeaks.entries())
                {
                    this.userPeaks.push(
                        new DiffractionPeak(peak.pmc, 0, 0, peak.keV, peak.keV-0.1, peak.keV+0.1, "", DiffractionPeak.statusUnspecified, id)
                    );
                }

                this.updateShownMapIfNeeded();
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this.getLayerManager().locationDataLayers$.subscribe(
            ()=>
            {
                this.refreshLayerInfo();
            }
        ));

        this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                if(claims)
                {
                    // If the user is set to have no permissions, we show that error and don't bother requesting
                    this.userPeakEditing = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionEditDiffractionPeaks);
                }
            }
        );
        
        this._diffractionService.refreshPeakStatuses(this._datasetService.datasetIDLoaded);
        this._diffractionService.refreshUserPeaks(this._datasetService.datasetIDLoaded);
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();

        // clear any diffraction stuff from chart
        if(this._spectrumService.mdl)
        {
            this._spectrumService.mdl.showDiffractionPeaks([]);
        }
    }

    onToggleDetectPeaksListOpen(event)
    {
        this.detectPeaksListOpen = !this.detectPeaksListOpen;
    }

    onToggleUserPeaksListOpen(event)
    {
        this.userPeaksListOpen = !this.userPeaksListOpen;
    }

    get cursorShown(): string
    {
        if(!this._histogramMdl)
        {
            return CursorId.defaultPointer;
        }
        return this._histogramMdl.cursorShown;
    }

    get tableRowLimit(): number
    {
        return DiffractionComponent.tableRowLimit;
    }

    private getLayerManager(): LayerManager
    {
        return this._contextImageService.mdl.layerManager;
    }

    private refreshLayerInfo(): void
    {
        let layerMan = this.getLayerManager();
        if(layerMan)
        {
            this._diffractionMapLayer = layerMan.getLayerProperties(DataExpressionId.predefinedDiffractionCountDataExpression);
        }
    }

    get isMapShown(): boolean
    {
        if(!this._diffractionMapLayer)
        {
            return false;
        }
        return this._diffractionMapLayer.visible;
    }

    onShowMap()
    {
        const layerMan = this.getLayerManager();

        // Found that for some reason we can end up without a roughness layer here
        if(!this._diffractionMapLayer)
        {
            this.refreshLayerInfo();
            if(!this._diffractionMapLayer)
            {
                // At this point we can't do anything, we don't have a diffraction map. Likely cause: no context image shown
                alert("Failed to show diffraction map. Please ensure a context image widget is available!");
                return;
            }
        }

        if(!this._diffractionMapLayer.visible)
        {
            // We're making it visible now... Hide the roughness expression otherwise it looks
            // like showing the map failed because users dont see the layers concept in this view
            // (roughness would be "on top" and can't see our map)
            layerMan.setLayerVisibility(DataExpressionId.predefinedRoughnessDataExpression, 1, false, []);
        }

        layerMan.setLayerVisibility(DataExpressionId.predefinedDiffractionCountDataExpression, this._diffractionMapLayer.opacity, !this._diffractionMapLayer.visible, []);
        
        this.refreshLayerInfo();
    }

    private updateShownMapIfNeeded(): void
    {
        const layerMan = this.getLayerManager();

        if(!this._diffractionMapLayer || !this._diffractionMapLayer.visible)
        {
            // Doesn't exist or not visible, do nothing
            return;
        }

        // Force it to hide then show, this will recalculate it
        layerMan.setLayerVisibility(DataExpressionId.predefinedDiffractionCountDataExpression, this._diffractionMapLayer.opacity, false, []);
        layerMan.setLayerVisibility(DataExpressionId.predefinedDiffractionCountDataExpression, this._diffractionMapLayer.opacity, true, []);

        //this.refreshLayerInfo();
    }

    /*
    onPickElement()
    {
    }

    onElementClicked(event)
    {
        alert('Not implemented yet!');
    }
*/
    get sortElementZ(): Set<number>
    {
        return new Set<number>();
    }

    get visiblePeakId(): string
    {
        return this._visiblePeakId;
    }

    get sort(): string
    {
        return this._sortCriteria;
    }

    set sort(criteria: string)
    {
        if(criteria == this._sortCriteria)
        {
            // Same column, user is just changing sort order
            this._sortAscending = !this._sortAscending;
        }
        else
        {
            this._sortCriteria = criteria;
            this._sortAscending = true;
        }

        this.updateDisplayList();
    }

    onDeleteDetectedPeak(peak: DiffractionPeak)
    {
        if(!confirm("Are you sure you want to delete this diffraction peak for PMC "+peak.pmc+"?"))
        {
            return;
        }

        this._diffractionService.setPeakStatus(
            peak.id,
            DiffractionPeak.statusNotAnomaly,
            this._datasetService.datasetIDLoaded).subscribe(
            ()=>
            {
                this.updateShownMapIfNeeded();
            },
            (err)=>
            {
                alert("Failed to delete diffraction peak: "+peak.id);
            }
        );
    }

    onTogglePeakVisible(peak: DiffractionPeak)
    {
        // If already visible, turn off
        if(this._visiblePeakId == peak.id)
        {
            this._visiblePeakId = "";

            // NOTE: We don't clear the selection here...

            // But we do clear the band drawn
            if(this._spectrumService.mdl)
            {
                this._spectrumService.mdl.showDiffractionPeaks([]);
            }
            return;
        }

        this._visiblePeakId = peak.id;

        // Select this PMC, this way the spectrum chart will show the A/B lines
        let locIdx = this._datasetService.datasetLoaded.pmcToLocationIndex.get(peak.pmc);
        if(locIdx != undefined)
        {
            // Select
            this._selectionService.setSelection(this._datasetService.datasetLoaded, new BeamSelection(this._datasetService.datasetLoaded, new Set([locIdx])), null);

            // Also set the hover point to this, so purple spot is more visible on other widgets
            this._selectionService.setHoverPMC(peak.pmc);
        }

        if(this._spectrumService.mdl)
        {
            if(!this._spectrumService.mdl.xAxisEnergyScale)
            {
                alert("Please calibrate spectrum x-axis energy so peak can be shown on chart.");
            }
            else
            {
                // Tell spectrum what keV bands to show
                this._spectrumService.mdl.showDiffractionPeaks([peak]);

                // Also zoom to it!
                this._spectrumService.mdl.zoomToPeak(peak.kevStart, peak.kevEnd);
            }
        }
    }

    onSaveAsExpressionMap()
    {
        let exprData = this.formExpressionForSelection();
        if(exprData.length != 3)
        {
            let err = "Failed to generate expression for selected diffraction peak ranges";
            if(exprData.length == 1)
            {
                err = exprData[0];
            }

            alert(err);
            return;
        }

        this._exprService.add(
            exprData[0],
            exprData[1],
            EXPR_LANGUAGE_PIXLANG,
            exprData[2]
        ).subscribe(
            ()=>
            {
                alert("Created expression: "+exprData[0]);
            },
            (err)=>
            {
                alert(httpErrorToString(err, "Failed to create expression for diffraction peak selection"));
            }
        );
    }

    // If success, returns 3 strings: First item is the name, then expression, then description
    // If fail, returns 1 string, which is the error
    private formExpressionForSelection(): string[]
    {
        // Take the selected keV values and form an expression map
        if(this._barSelectedCount <= 0)
        {
            return ["No keV ranges selected on diffraction peak histogram!"];
        }

        let calMan: EnergyCalibrationManager = null;
        if(this._spectrumService.mdl)
        {
            calMan = this._spectrumService.mdl.energyCalibrationManager;
        }
        if(!calMan || calMan.eVCalibrationA.isEmpty())
        {
            return ["Failed to get spectrum chart calibration - is it set to show channels?"];
            return;
        }

        let expr = "";
        let rangeText = "";
        let rangeMinMax = new MinMax();

        for(let c = 0; c < this._barSelected.length; c++)
        {
            if(!this._barSelected[c])
            {
                continue;
            }

            let range = new MinMax(c*DiffractionHistogramModel.keVBinWidth, (c+1)*DiffractionHistogramModel.keVBinWidth);

            if(expr.length > 0)
            {
                expr += "+";
                rangeText += ", ";
            }

            // Here we convert the keV range to channels using the spectrum charts calibration
            

            expr += "diffractionPeaks("+calMan.keVToChannel(range.min, "A")+","+calMan.keVToChannel(range.max, "A")+")";

            rangeMinMax.expand(range.min);
            rangeMinMax.expand(range.max);

            rangeText += range.min+"-"+range.max;
        }

        let name = "Diffraction peaks ("+rangeMinMax.min+"-"+rangeMinMax.max+" keV in "+this._barSelectedCount+" ranges)";

        return [name, expr, "Diffraction peaks in ranges: "+rangeText];
    }

    onAddPeak()
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        const pmcLabel = "PMC (between "+dataset.pmcMinMax.min+" and "+dataset.pmcMinMax.max+")";
        const energyLabel = "Energy in keV";

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new UserPromptDialogParams(
            "Indicate a PMC that has roughness",
            "Add",
            "Cancel",
            [
                new UserPromptDialogStringItem(
                    pmcLabel,
                    (val: string)=>
                    {
                        let pmcI = Number.parseInt(val);
                        return !isNaN(pmcI) && pmcI >= dataset.pmcMinMax.min && pmcI <= dataset.pmcMinMax.max;
                    }
                ),
                new UserPromptDialogStringItem(
                    energyLabel,
                    (val: string)=>
                    {
                        let keVF = Number.parseFloat(val);
                        return !isNaN(keVF) && keVF > 0;
                    }
                ),
            ]
        );

        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: UserPromptDialogResult)=>
            {
                // Might've cancelled!
                if(result)
                {
                    // Create a new diffraction peak value
                    let pmc = Number.parseInt(result.enteredValues.get(pmcLabel));
                    let keV = Number.parseFloat(result.enteredValues.get(energyLabel));

                    this._diffractionService.addDiffractionPeak(pmc, keV, this._datasetService.datasetIDLoaded).subscribe(
                        (result: Map<string, UserDiffractionPeak>)=>
                        {
                        },
                        (err)=>
                        {
                            alert("Failed to add diffraction peak: "+err.error);
                        }
                    );
                }
            }
        );
    }

    onClickPeakItem(peak: DiffractionPeak)
    {
        this.onTogglePeakVisible(peak);
    }

    onDeleteUserPeak(peak: DiffractionPeak)
    {
        if(confirm("Are you sure you want to delete this user-entered diffraction peak?"))
        {
            this._diffractionService.deleteDiffractionPeak(peak.id, this._datasetService.datasetIDLoaded).subscribe(
                (result: Map<string, UserDiffractionPeak>)=>
                {
                },
                (err)=>
                {
                    alert("Failed to delete user-entered diffraction peak: "+err.error);
                }
            );
        }
    }

    onResetBarSelection()
    {
        for(let c = 0; c < this._barSelected.length; c++)
        {
            this._barSelected[c] = true;
        }
        this._barSelectedCount = this._barSelected.length;

        this.updateDisplayList();

        this._exprService.setDiffractionCountExpression("diffractionPeaks(0,4096)", "All Diffracton Peaks");

        // Something was selected, show the list
        this.detectPeaksListOpen = true;
    }

    onTablePage(next: boolean): void
    {
        this._tablePage = this._tablePage + (next ? 1 : -1);

        const maxPages = this.numPages;
        if(this._tablePage < 0)
        {
            this._tablePage = 0;
        }

        if(this._tablePage >= maxPages)
        {
            this._tablePage = maxPages-1;
        }

        this.updatePagedDisplayList();
    }

    private updateDisplayList()
    {
        this._pagablePeaks = [];

        // Range limit the page
        if(this._tablePage < 0)
        {
            this._tablePage = 0;
        }
        else if(this._tablePage*DiffractionComponent.tableRowLimit >= this._allPeaks.length)
        {
            this._tablePage = Math.floor(this._allPeaks.length / DiffractionComponent.tableRowLimit);
        }

        this._allPeaks.sort((a: DiffractionPeak, b: DiffractionPeak)=>
        {
            let aValue = a.channel;
            let bValue = b.channel;

            if(this._sortCriteria == this.sortModeEffectSize)
            {
                aValue = a.effectSize;
                bValue = b.effectSize;
            }
            else if(this._sortCriteria == this.sortModePMC)
            {
                aValue = a.pmc;
                bValue = b.pmc;
            }

            if(aValue < bValue) 
            {
                return 1;
            }
            if(aValue > bValue) 
            {
                return -1;
            }

            return 0;
        });

        if(this._sortAscending)
        {
            this._allPeaks.reverse();
        }

        for(let peak of this._allPeaks)
        {
            if(peak.status != DiffractionPeak.statusNotAnomaly && this.iskeVRangeSelected(peak.keV))
            {
                // We ignore ones that have been set to not-anomaly, these have been "deleted" by users
                this._pagablePeaks.push(peak);
            }
        }

        this.updatePagedDisplayList();
        this.updateHistogram();
    }

    private updatePagedDisplayList()
    {
        this.peaks = [];
        let end = Math.min((this._tablePage+1)*DiffractionComponent.tableRowLimit, this._pagablePeaks.length);
        for(let c = this._tablePage*DiffractionComponent.tableRowLimit; c < end; c++)
        {
            this.peaks.push(this._pagablePeaks[c]);
        }
    }

    get tablePageLabel(): string
    {
        return (this._tablePage+1)+"/"+this.numPages;
    }

    get numPages(): number
    {
        let maxPage = Math.ceil(this._pagablePeaks.length/DiffractionComponent.tableRowLimit);
        return maxPage;
    }

    get hasMultiPages(): boolean
    {
        return this._pagablePeaks.length >= DiffractionComponent.tableRowLimit;
    }

    private updateHistogram()
    {   
        let err = "";
        if(this._allPeakskeVRange.min == this._allPeakskeVRange.max && this._allPeakskeVRange.min == 0)
        {
            // We didn't get keV values because there is no spectrum calibration available. Complain at this point
            err = "Failed to get calibration from spectrum";
        }

        let binnedBykeV: number[] = [];
        let bars: HistogramBar[] = [];
        let countRange = new MinMax();

        if(!err)
        {
            binnedBykeV = Array(Math.ceil(this._allPeakskeVRange.max/DiffractionHistogramModel.keVBinWidth*1.1)).fill(0);

            for(let peak of this._allPeaks)
            {
                if(peak.status != DiffractionPeak.statusNotAnomaly)
                {
                    let binIdx = Math.floor(peak.keV / DiffractionHistogramModel.keVBinWidth);
                    binnedBykeV[binIdx]++;
                }
            }

            for(let c = 0; c < binnedBykeV.length; c++)
            {
                let keVStart = c*DiffractionHistogramModel.keVBinWidth;
                let colour = Colours.GRAY_70;
                /*            if(this.iskeVRangeSelected(keVStart+DiffractionHistogramModel.keVBinWidth/2))
                {
                    colour = Colours.YELLOW;
                }*/

                bars.push(new HistogramBar(colour, binnedBykeV[c], keVStart));
                countRange.expand(binnedBykeV[c]);
            }
        }

        this._histogramMdl = new DiffractionHistogramModel(this);

        // Make raw data structure
        this._histogramMdl.raw = new HistogramData(bars, countRange, err);

        // Set up the rest
        this.drawer = new HistogramDrawer(this._histogramMdl);
        this.interaction = new HistogramInteraction(this._histogramMdl);

        this.needsDraw$.next();
    }

    private getBarIdx(keV: number)
    {
        return Math.floor(keV / DiffractionHistogramModel.keVBinWidth);
    }

    onSelectPMCsWithDiffraction(): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            alert("No dataset to select from");
            return;
        }

        // Formulate an expression to describe our data
        let exprData = this.formExpressionForSelection();
        if(exprData.length != 3)
        {
            alert("Failed to find PMCs to select");
            return;
        }

        // Get the map data
        let query: DataSourceParams[] = [new DataSourceParams(DataExpressionId.predefinedDiffractionCountDataExpression, PredefinedROIID.AllPoints, "")];
        this._widgetDataService.getData(query, false).subscribe(
            (queryData: RegionDataResults)=>
            {
                // If we have valid data, we select all PMCs where value >= 1
                if(queryData.error)
                {
                    alert("Error while querying diffraction peaks: "+queryData.error);
                    return;
                }

                if(queryData.hasQueryErrors() || queryData.queryResults.length != 1)
                {
                    alert("Error encountered while querying diffraction peaks");
                    return;
                }

                let selectedLocIdxs = new Set<number>();
                for(let item of queryData.queryResults[0].values.values)
                {
                    if(item.value >= 1)
                    {
                        // Look up the location index
                        let idx = dataset.pmcToLocationIndex.get(item.pmc);
                        if(idx != undefined)
                        {
                            selectedLocIdxs.add(idx);
                        }
                    }
                }

                // Select them!
                this._selectionService.setSelection(dataset, new BeamSelection(dataset, selectedLocIdxs), null, true);
            }
        );
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

    // HistogramSelectionOwner
    setkeVRangeSelected(keVRange: MinMax, selected: boolean, complete: boolean)
    {
        // If they're ALL selected, unselect them first because the user is doing something specific here
        if(this._barSelectedCount == this._barSelected.length)
        {
            for(let c = 0; c < this._barSelected.length; c++)
            {
                this._barSelected[c] = false;
            }
            this._barSelectedCount = 0;
            selected = true; // we're forcing it to select this one!
        }


        // If we've just unselected the last bar...
        if(this._barSelectedCount <= 1)
        {
            selected = true; // Force this one to select
        }

        let mid = (keVRange.min+keVRange.max)/2;
        let idx = this.getBarIdx(mid);

        if(idx <= this._barSelected.length)
        {
            this._barSelected[idx] = selected;
        }

        // Don't force it to rebuild everything as the user is interacting/dragging, only do this when we are told it's complete!
        if(complete)
        {
            // Count how many are selected (controls if we have svae as expression map button enabled)
            this._barSelectedCount = 0;
            for(let sel of this._barSelected)
            {
                if(sel)
                {
                    this._barSelectedCount++;
                }
            }

            this.updateDisplayList();

            // Also tell the expression service so diffraction count map is up to date with user selection
            let exprData = this.formExpressionForSelection();
            if(exprData.length == 3)
            {
                this._exprService.setDiffractionCountExpression(exprData[1], exprData[0]);
            }
        }

        if(selected)
        {
            // Something was selected, show the list
            this.detectPeaksListOpen = true;
        }
    }

    iskeVRangeSelected(keVMidpoint: number): boolean
    {
        // check flags
        let idx = this.getBarIdx(keVMidpoint);
        if(idx < this._barSelected.length)
        {
            return this._barSelected[idx];
        }
        return false;
    }

    selectedRangeCount(): number
    {
        return this._barSelectedCount;
    }
}