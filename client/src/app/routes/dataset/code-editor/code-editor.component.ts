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

import { Component, ComponentFactoryResolver, HostListener, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { Subscription, timer } from "rxjs";
import { ContextImageService } from "src/app/services/context-image.service";
import { LayoutService } from "src/app/services/layout.service";
import { analysisLayoutState, ViewStateService } from "src/app/services/view-state.service";
import { BinaryPlotWidgetComponent } from "src/app/UI/binary-plot-widget/binary-plot-widget.component";
// Components we can create dynamically
import { ChordViewWidgetComponent } from "src/app/UI/chord-view-widget/chord-view-widget.component";
import { ContextImageViewWidgetComponent } from "src/app/UI/context-image-view-widget/context-image-view-widget.component";
import { ImageOptionsComponent } from "src/app/UI/context-image-view-widget/image-options/image-options.component";
import { LayerControlComponent } from "src/app/UI/context-image-view-widget/layer-control/layer-control.component";
import { HistogramViewComponent } from "src/app/UI/histogram-view/histogram-view.component";
import { ParallelCoordinatesPlotWidgetComponent } from "src/app/UI/parallel-coordinates-plot-widget/parallel-coordinates-plot-widget.component";
import { QuantificationTableComponent } from "src/app/UI/quantification-table/quantification-table.component";
import { RGBUPlotComponent } from "src/app/UI/rgbuplot/rgbuplot.component";
import { SingleAxisRGBUComponent } from "src/app/UI/single-axis-rgbu/single-axis-rgbu.component";
import { RGBUViewerComponent } from "src/app/UI/rgbuviewer/rgbuviewer.component";
import { ROIQuantCompareTableComponent } from "src/app/UI/roiquant-compare-table/roiquant-compare-table.component";
import { SpectrumChartWidgetComponent } from "src/app/UI/spectrum-chart-widget/spectrum-chart-widget.component";
import { AnnotationsComponent } from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/annotations/annotations.component";
import { SpectrumPeakIdentificationComponent } from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/spectrum-peak-identification.component";
import { SpectrumRegionPickerComponent } from "src/app/UI/spectrum-chart-widget/spectrum-region-picker/spectrum-region-picker.component";
import { TernaryPlotWidgetComponent } from "src/app/UI/ternary-plot-widget/ternary-plot-widget.component";
import { VariogramWidgetComponent } from "src/app/UI/variogram-widget/variogram-widget.component";
import { SpectrumFitContainerComponent } from "src/app/UI/spectrum-chart-widget/spectrum-fit-container/spectrum-fit-container.component";
import { DataExpression, DataExpressionService } from "src/app/services/data-expression.service";

@Component({
    selector: "code-editor",
    templateUrl: "./code-editor.component.html",
    styleUrls: ["./code-editor.component.scss"],
    providers: [ContextImageService],
})
export class CodeEditorComponent implements OnInit, OnDestroy
{
    @ViewChild("preview", { read: ViewContainerRef }) previewContainer;

    private _subs = new Subscription();

    private _previewComponent = null;
    private _datasetID: string;
    private _expressionID: string;

    private _editable = true;
    private _useAutocomplete = false;

    public expression: DataExpression;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _layoutService: LayoutService,
        private _viewStateService: ViewStateService,
        private resolver: ComponentFactoryResolver,
        public dialog: MatDialog,
        private _expressionService: DataExpressionService,
    )
    {
    }


    ngOnInit()
    {
        this._datasetID = this._route.snapshot.params["dataset_id"];
        this._expressionID = this._route.snapshot.params["expression_id"];
        this._expressionService.expressionsUpdated$.subscribe(() =>
        {
            let expression = this._expressionService.getExpression(this._expressionID);
            this.expression = new DataExpression(
                expression.id,
                expression.name,
                expression.expression,
                expression.type,
                expression.comments,
                expression.shared,
                expression.creator,
                expression.createUnixTimeSec,
                expression.modUnixTimeSec,
                expression.tags
            );
        });
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this.clearPreviewReplaceable();
    }

    ngAfterViewInit()
    {
        this._layoutService.notifyNgAfterViewInit();

        this._subs.add(this._viewStateService.analysisViewSelectors$.subscribe(
            (selectors: analysisLayoutState)=>
            {
                if(selectors)
                {
                    // Run these after this function finished, else we get ExpressionChangedAfterItHasBeenCheckedError
                    // See: https://stackoverflow.com/questions/43917940/angular-dynamic-component-loading-expressionchangedafterithasbeencheckederror
                    // Suggestion is we shouldn't be doing this in ngAfterViewInit, but if we do it in ngOnInit we don't yet have the view child
                    // refs available
                    const source = timer(1);
                    /*const sub =*/ source.subscribe(
                        ()=>
                        {
                            this.createTopRowComponents(selectors.topWidgetSelectors);
                        }
                    );
                }
                else
                {
                    this.previewContainer.clear();
                    this.clearPreviewReplaceable();
                }
            },
            (err)=>
            {
            }
        ));
    }

    private clearPreviewReplaceable(): void
    {
        if(this._previewComponent != null)
        {
            this._previewComponent.destroy();
            this._previewComponent = null;
        }
    }

    private createTopRowComponents(selectors: string[])
    {
        let factory = this.makeComponentFactory(selectors[0]);

        // Set this one
        this.previewContainer.clear();
        this.clearPreviewReplaceable();

        factory = this.makeComponentFactory(selectors[1]);
        if(factory)
        {
            let comp = this.previewContainer.createComponent(factory);
            comp.instance.widgetPosition = "preview";

            this._previewComponent = comp;
        }
    }

    onToggleAutocomplete(): void
    {
        this._useAutocomplete = !this._useAutocomplete;
    }

    onClose(): void
    {
        this._router.navigate([`/dataset/${this._datasetID}/analysis`]);
    }
    
    get editable(): boolean
    {
        return this._editable;
    }

    get editExpression(): string
    {
        return this.expression?.expression || "";
    }

    set editExpression(val: string)
    {
        if(this.expression)
        {
            this.expression.expression = val;
        }
    }

    get selectedTagIDs(): string[]
    {
        return this.expression?.tags || [];
    }

    set selectedTagIDs(tags: string[])
    {
        if(this.expression)
        {
            this.expression.tags = tags;
        }
    }

    get expressionName(): string
    {
        return this.expression?.name || "";
    }

    set expressionName(name: string)
    {
        if(this.expression)
        {
            this.expression.name = name;
        }
    }

    onExpressionTextChanged(text: string): void
    {
        this.editExpression = text;
    }

    onTagSelectionChanged(tags): void
    {
        this.selectedTagIDs = tags;
    }

    // NOTE: there are ways to go from selector string to ComponentFactory:
    //       eg. https://indepth.dev/posts/1400/components-by-selector-name-angular
    //       but we're only really doing this for 5 components, and don't actually want
    //       it to work for any number of components, so hard-coding here will suffice
    private getComponentClassForSelector(selector: string): any
    {
    // Widgets
        if(selector == ViewStateService.widgetSelectorChordDiagram)
        {
            return ChordViewWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorBinaryPlot)
        {
            return BinaryPlotWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorTernaryPlot)
        {
            return TernaryPlotWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorQuantificationTable)
        {
            return QuantificationTableComponent;
        }
        else if(selector == ViewStateService.widgetSelectorHistogram)
        {
            return HistogramViewComponent;
        }
        else if(selector == ViewStateService.widgetSelectorVariogram)
        {
            return VariogramWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorRGBUPlot)
        {
            return RGBUPlotComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSingleAxisRGBU)
        {
            return SingleAxisRGBUComponent;
        }
        else if(selector == ViewStateService.widgetSelectorRGBUViewer)
        {
            return RGBUViewerComponent;
        }
        else if(selector == ViewStateService.widgetSelectorParallelCoordinates)
        {
            return ParallelCoordinatesPlotWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSpectrum)
        {
            return SpectrumChartWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorContextImage)
        {
            return ContextImageViewWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorROIQuantCompareTable)
        {
            return ROIQuantCompareTableComponent;
        }
        // Context image drop-downs
        else if(selector == ViewStateService.widgetSelectorContextImageLayers)
        {
            return LayerControlComponent;
        }
        else if(selector == ViewStateService.widgetSelectorContextImageOptions)
        {
            return ImageOptionsComponent;
        }
        // Spectrum drop-downs
        else if(selector == ViewStateService.widgetSelectorSpectrumPeakID)
        {
            return SpectrumPeakIdentificationComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSpectrumRegions)
        {
            return SpectrumRegionPickerComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSpectrumFit)
        {
            return SpectrumFitContainerComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSpectrumAnnotations)
        {
            return AnnotationsComponent;
        }

        console.error("getComponentClassForSelector unknown selector: "+selector+". Substituting chord diagram");
        return ChordViewWidgetComponent;
    }

    private makeComponentFactory(selector: string): object
    {
        let klass = this.getComponentClassForSelector(selector);
        let factory = this.resolver.resolveComponentFactory(klass);
        return factory;
    }

    @HostListener("window:resize", ["$event"])
    onResize(event)
    {
        // Window resized, notify all canvases
        this._layoutService.notifyWindowResize();
    }
}
