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

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DetectorConfig } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { AnnotationItem, AnnotationService } from "src/app/services/annotation.service";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { SnackService } from "src/app/services/snack.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasDrawer } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { SpectrumChartDrawer } from "src/app/UI/spectrum-chart-widget/drawer";
import { SpectrumChartModel } from "src/app/UI/spectrum-chart-widget/model";
import { SpectrumEnergyCalibrationComponent, SpectrumEnergyCalibrationResult } from "src/app/UI/spectrum-chart-widget/spectrum-energy-calibration/spectrum-energy-calibration.component";
import { SpectrumPeakLabelPickerComponent, SpectrumPeakLabelsVisible } from "src/app/UI/spectrum-chart-widget/spectrum-peak-label-picker/spectrum-peak-label-picker.component";
import { ZoomMap } from "src/app/UI/spectrum-chart-widget/ui-elements/zoom-map";


@Component({
    selector: "spectrum-chart-widget",
    templateUrl: "./spectrum-chart-widget.component.html",
    styleUrls: ["./spectrum-chart-widget.component.scss"],
    providers: [
        SnackService
    ]
})
export class SpectrumChartWidgetComponent implements OnInit, OnDestroy
{
    @Input() widgetPosition: string = "";

    private _subs = new Subscription();

    private _quantLoaded = false;
    private _viewInited: boolean = false;

    // Public so html can access it
    mdl: SpectrumChartModel = null;
    drawer: CanvasDrawer = null;
    cursorShown: string;

    keyTop: string = (ZoomMap.maxHeight+ZoomMap.margin+8+36)+"px"; // now also includes toolbar height

    constructor(
        private _datasetService: DataSetService,
        private _snackService: SnackService,
        private _exprService: DataExpressionService,
        private _viewStateService: ViewStateService,
        private _annotationService: AnnotationService,
        private _envService: EnvConfigurationService,
        private _spectrumService: SpectrumChartService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit()
    {
        this.mdl = new SpectrumChartModel(
            this._datasetService, this._viewStateService, this._snackService, this._exprService, this._envService, this.widgetPosition
        );
        this._spectrumService.setModel(this.mdl);
        this.drawer = new SpectrumChartDrawer(this.mdl, this.mdl.toolHost);

        // Subscriptions
        this._subs.add(this._envService.detectorConfig$.subscribe(
            (cfg: DetectorConfig)=>
            {
                // Pass the XRF lower/upper bounds to our model, so next draw call will shade the lines correctly
                this.mdl.xrfeVLowerBound = cfg.xrfeVLowerBound;
                this.mdl.xrfeVUpperBound = cfg.xrfeVUpperBound;
            }
        ));

        this._subs.add(this.mdl.toolHost.toolStateChanged$.subscribe(
            ()=>
            {
                // Something changed, refresh our tools
                this.reDraw();
            }
        ));

        this._subs.add(this.mdl.toolHost.activeCursor$.subscribe(
            (cursor: string)=>
            {
                // Something changed, refresh our tools
                this.cursorShown = cursor;
            }
        ));

        // TODO: move into mdl?
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                this.mdl.setDataset(dataset);
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
                    console.log("Restoring spectrum chart view...");

                    let loadedState = this._widgetDataService.viewState.spectrums.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this.mdl.setViewState(loadedState);
                    }

                    this._viewInited = true;
                }

                this.mdl.updateSpectrumSources(this._widgetDataService);

                this.reDraw();
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                // Set quant loaded flag for button states to be up to date
                this._quantLoaded = quant != null;
            }
        ));

        this._subs.add(this._annotationService.annotations$.subscribe(
            (annotations: AnnotationItem[]) =>
            {
                this.mdl.annotations = annotations;
            }
        ));

        this._subs.add(this.mdl.transform.transformChangeComplete$.subscribe(
            (complete: boolean)=>
            {
                this.reDraw();

                if(complete)
                {
                    this.mdl.saveState("transformChangeComplete$");
                }
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this.mdl.energyCalibrationManager.calibrationChanged$.subscribe(
            ()=>
            {
                this.mdl.recalcSpectrumLines();
                this.mdl.clearDisplayData();
            },
            (err)=>
            {
            }
        ));
    }

    ngOnDestroy()
    {
        //console.warn('ContextImageViewWidgetComponent ['+this.id+'] ngOnDestroy');
        this._subs.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorSpectrum;
    }

    reDraw()
    {
        this.mdl.needsDraw$.next();
    }

    get xAxisCalibratedeV(): boolean
    {
        return this._spectrumService.mdl.xAxisEnergyScale;
    }

    get quantLoaded(): boolean
    {
        return this._quantLoaded;
    }

    onPeakLabels(): void
    {
        const dialogConfig = new MatDialogConfig();
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        let elems = new Set<string>();
        for(let line of this.mdl.shownElementPeakLabels)
        {
            elems.add(line.elementSymbol);
        }

        dialogConfig.data = new SpectrumPeakLabelsVisible(Array.from(elems));

        const dialogRef = this.dialog.open(SpectrumPeakLabelPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: string[])=>
            {
                if(!result)
                {
                    console.log("User cancelled peak labels dialog");
                    return;
                }

                // Convert these to XRFLines for display
                let showXRFLines: XRFLine[] = [];

                for(let elem of result)
                {
                    let item = periodicTableDB.getElementBySymbol(elem);
                    if(item)
                    {
                        for(let xrfLine of item.lines)
                        {
                            if(xrfLine.tags.indexOf("maxK") > -1 || xrfLine.tags.indexOf("maxL") > -1)
                            {
                                let toSave = XRFLine.makeXRFLineFromPeriodicTableItem(item.symbol, item.Z, xrfLine);
                                if(toSave)
                                {
                                    showXRFLines.push(toSave);
                                }
                            }
                        }
                    }
                }

                this.mdl.shownElementPeakLabels = showXRFLines;
                this.reDraw();
            }
        );
    }

    get showPeakIdentification(): boolean
    {
        return this._viewStateService.showPeakIdentification;
    }

    onToggleShowPeakIdentification(event): void
    {
        // Can't do anything if X axis isn't calibrated, so complain if this is the case
        if(!this._viewStateService.showPeakIdentification && !this._spectrumService.mdl.xAxisEnergyScale)
        {
            alert("X axis needs to be energy-calibrated for this to show");
            return;
        }

        this._viewStateService.showPeakIdentification = !this._viewStateService.showPeakIdentification;
    }

    onCalibration(): void
    {
        const dialogConfig = new MatDialogConfig();
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        //dialogConfig.data = new 

        const dialogRef = this.dialog.open(SpectrumEnergyCalibrationComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: SpectrumEnergyCalibrationResult)=>
            {
                if(result)
                {
                    let energyCalManager = this._spectrumService.mdl.energyCalibrationManager;

                    if(result.A && result.B)
                    {
                        energyCalManager.setXAxisEnergyCalibration("energy-calib-dlg", result.A, result.B);
                    }

                    // Is the axis calibrated... ie, do we have anything other than None selected for source?
                    this._spectrumService.mdl.xAxisEnergyScale = result.useCalibration;
                }
            }
        );
    }

    get showAnnotations(): boolean
    {
        return this._viewStateService.showAnnotations;
    }

    onToggleShowAnnotations(event): void
    {
        // Can't do anything if X axis isn't calibrated, so complain if this is the case
        if(!this._viewStateService.showAnnotations && !this._spectrumService.mdl.xAxisEnergyScale)
        {
            alert("X axis needs to be energy-calibrated for this to show");
            return;
        }

        this._viewStateService.showAnnotations = !this._viewStateService.showAnnotations;
    }

    get showSpectrumRegionPicker(): boolean
    {
        return this._viewStateService.showSpectrumRegionPicker;
    }

    onToggleShowSpectrumRegionPicker(event): void
    {
        this._viewStateService.showSpectrumRegionPicker = !this._viewStateService.showSpectrumRegionPicker;
    }

    get showSpectrumFit(): boolean
    {
        return this._viewStateService.showSpectrumFit;
    }

    onToggleShowSpectrumFit(event): void
    {
        this._viewStateService.showSpectrumFit = !this._viewStateService.showSpectrumFit;
    }

    get keyItems(): KeyItem[]
    {
        if(!this.mdl)
        {
            return [];
        }

        return this.mdl.keyItems;
    }
}
