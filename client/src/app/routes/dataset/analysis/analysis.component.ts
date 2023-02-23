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

import {
    Component, ComponentFactoryResolver, HostListener, OnDestroy, OnInit, Renderer2, ViewChild,
    ViewContainerRef
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription, timer } from "rxjs";
import { ContextImageService } from "src/app/services/context-image.service";
import { LayoutService } from "src/app/services/layout.service";
import { SelectionService } from "src/app/services/selection.service";
import { analysisLayoutState, ViewStateService } from "src/app/services/view-state.service";
import { DataSetService } from "src/app/services/data-set.service";
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
import { parseNumberRangeString} from "src/app/utils/utils";
import { BeamSelection } from "src/app/models/BeamSelection";
import { SpectrumFitContainerComponent } from "src/app/UI/spectrum-chart-widget/spectrum-fit-container/spectrum-fit-container.component";


@Component({
    selector: "dataset-analysis",
    templateUrl: "./analysis.component.html",
    styleUrls: ["./analysis.component.scss"],
    providers: [ContextImageService],
})
export class AnalysisComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    // What % of space the top and left widget division is at (the borders of the context image)
    private _topRatio = 62;

    @ViewChild("underContextImage", { read: ViewContainerRef }) underContextImageContainer;
    private _underContextImageComponent = null;

    @ViewChild("topLeft", { read: ViewContainerRef }) topLeftContainer;
    private _topLeftComponent = null;

    @ViewChild("topRight", { read: ViewContainerRef }) topRightContainer;
    private _topRightComponent = null;

    @ViewChild("underSpectrum", { read: ViewContainerRef }) underSpectrumContainer;
    private _underSpectrumComponents = [];

    //@ViewChild("soloView", { read: ViewContainerRef }) soloViewContainer;
    //private _soloViewComponent = null;
    private _soloDialogRef = null;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _layoutService: LayoutService,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private resolver: ComponentFactoryResolver,
        public dialog: MatDialog,
        private renderer2: Renderer2
    )
    {
    }


    ngOnInit()
    {
        this._route.queryParams
            .subscribe(params => 
            {
                if(params.pmc && params.pmc.length > 0) 
                {
                    let malformedPMCs: Set<number> = new Set<number>();
                    let dataset = this._datasetService.datasetLoaded;
                    let pmcs = new Set<number>(Array.from(parseNumberRangeString(params.pmc)).filter(pmc => 
                    {
                        // Record the PMC as malformed so the user can be notified in bulk and then continue
                        if(isNaN(pmc) || typeof dataset.pmcToLocationIndex.get(pmc) !== "number") 
                        {
                            malformedPMCs.add(pmc);
                            return false;
                        }
                        else 
                        {
                            return true;
                        }
                    }).map(pmc => dataset.pmcToLocationIndex.get(pmc)));
                    if(malformedPMCs.size > 0)
                    {
                        alert(`Invalid PMCs: [${[...malformedPMCs].join(",")}] specified in URL.`);
                    }
                    this._selectionService.setSelection(dataset, new BeamSelection(dataset, pmcs), null);
                    this._router.navigate([], 
                        {
                            queryParams: {
                                "pmc": null
                            },
                            queryParamsHandling: "merge"
                        });
                }
            });
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this.clearUnderContextImageReplaceable();
        this.clearTopLeftReplaceable();
        this.clearTopRightReplaceable();
        this.clearUnderSpectrumReplaceables();
        this.clearSoloView();
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
                            this.createUnderContextImageComponent(selectors.bottomWidgetSelectors[0]);
                            this.createUnderSpectrumComponents(selectors.bottomWidgetSelectors.slice(1));
                        }
                    );
                }
                else
                {
                    // Clear now
                    this.topLeftContainer.clear();
                    this.clearTopLeftReplaceable();

                    this.topRightContainer.clear();
                    this.clearTopRightReplaceable();

                    this.underContextImageContainer.clear();
                    this.clearUnderContextImageReplaceable();

                    this.underSpectrumContainer.clear();
                    this.clearUnderSpectrumReplaceables();
                }
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._viewStateService.viewSolo$.subscribe(
            ()=>
            {
                // Clear whatever is there already
                this.clearSoloView();

                if(this._viewStateService.soloViewSelector.length > 0)
                {
                    // Set the solo view state
                    let factory = this.makeComponentFactory(this._viewStateService.soloViewSelector);

                    if(factory)
                    {
                        //console.log('Making solo view: '+this._viewStateService.soloViewSelector+', source pos='+this._viewStateService.soloViewSourcePosition);
                        /*                        this._soloViewComponent = this.soloViewContainer.createComponent(factory);
                        this._soloViewComponent.instance.widgetPosition = this._viewStateService.soloViewSourcePosition;
*/
                        let klass = this.getComponentClassForSelector(this._viewStateService.soloViewSelector);
                        this.showSoloView(klass);
                    }
                }
            },
            (err)=>
            {
            }
        ));
    }

    private showSoloView(klass: any): void
    {
        const dialogConfig = new MatDialogConfig();

        const topH = 45;
        const w = 50;
        dialogConfig.width = w+"vw";
        dialogConfig.height = (document.activeElement.clientHeight-topH)+"px";
        dialogConfig.position = { left: (100-w)+"vw", top: topH+"px"};
        dialogConfig.panelClass = null;
        //dialogConfig.backdropClass = "solo-widget-background";
        dialogConfig.data = null;

        this._soloDialogRef = this.dialog.open(klass, dialogConfig);
        this._soloDialogRef.componentInstance.widgetPosition = this._viewStateService.soloViewSourcePosition;

        if(this._soloDialogRef.componentInstance.soloView != undefined)
        {
            this._soloDialogRef.componentInstance.soloView = true;
        }

        this._soloDialogRef.afterClosed().subscribe(
            ()=>
            {
                this._soloDialogRef = null;

                // Make sure state is set right
                this._viewStateService.toggleSoloView("", "");
            }
        );
    }

    private clearUnderSpectrumReplaceables(): void
    {
    // Under spectrum (array)
        for(let comp of this._underSpectrumComponents)
        {
            comp.destroy();
        }
        this._underSpectrumComponents = [];
    }

    private clearUnderContextImageReplaceable(): void
    {
    // Under context image
        if(this._underContextImageComponent != null)
        {
            this._underContextImageComponent.destroy();
            this._underContextImageComponent = null;
        }
    }

    private clearTopLeftReplaceable(): void
    {
        if(this._topLeftComponent != null)
        {
            this._topLeftComponent.destroy();
            this._topLeftComponent = null;
        }
    }

    private clearTopRightReplaceable(): void
    {
        if(this._topRightComponent != null)
        {
            this._topRightComponent.destroy();
            this._topRightComponent = null;
        }
    }

    private clearSoloView(): void
    {
        /*        if(this._soloViewComponent != null)
        {
            this._soloViewComponent.destroy();
            this._soloViewComponent = null;
        }*/
        if(this._soloDialogRef)
        {
            this.dialog.closeAll();
            this._soloDialogRef = null;
        }
    }

    private createUnderContextImageComponent(selector: string)
    {
        this.underContextImageContainer.clear();
        this.clearUnderContextImageReplaceable();

        let factory = this.makeComponentFactory(selector);
        if(factory)
        {
            this._underContextImageComponent = this.underContextImageContainer.createComponent(factory);
            this._underContextImageComponent.instance.widgetPosition = "undercontext";
        }
    }

    private createTopRowComponents(selectors: string[])
    {
        // Should be 2 components... if not, show the default 2
        if(selectors.length < 2)
        {
            selectors = [ViewStateService.widgetSelectorContextImage, ViewStateService.widgetSelectorSpectrum];
        }
        else if(selectors.length > 2)
        {
            selectors = selectors.slice(0, 2);
        }
        
        // Set this one
        this.topLeftContainer.clear();
        this.clearTopLeftReplaceable();

        let factory = this.makeComponentFactory(selectors[0]);
        if(factory)
        {
            let comp = this.topLeftContainer.createComponent(factory);
            comp.instance.widgetPosition = "top0";

            //this.renderer2.addClass(comp.location.nativeElement, 'flex-fill');

            this._topLeftComponent = comp;
        }

        // Set this one
        this.topRightContainer.clear();
        this.clearTopRightReplaceable();

        factory = this.makeComponentFactory(selectors[1]);
        if(factory)
        {
            let comp = this.topRightContainer.createComponent(factory);
            comp.instance.widgetPosition = "top1";

            //this.renderer2.addClass(comp.location.nativeElement, 'flex-fill');

            this._topRightComponent = comp;
        }
    }

    private createUnderSpectrumComponents(selectors: string[])
    {
        this.underSpectrumContainer.clear();
        this.clearUnderSpectrumReplaceables();

        for(let idx = 0; idx < selectors.length; idx++)
        {
            const selector = selectors[idx];

            let factory = this.makeComponentFactory(selector);
            if(factory)
            {
                let comp = this.underSpectrumContainer.createComponent(factory);
                comp.instance.widgetPosition = "underspectrum"+idx;

                // Add this so widgets stretch out horizontally under spectrum chart
                this.renderer2.addClass(comp.location.nativeElement, "flex-fill");

                this._underSpectrumComponents.push(comp);
            }
        }
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

    get topRatio(): string
    {
        return this._topRatio+"%";
    }

    get bottomRatio(): string
    {
        return (100-this._topRatio)+"%";
    }

    get leftRatio(): string
    {
        return (this._viewStateService.showSidePanel ? 25 : 35)+"%";
    }

    get rightRatio(): string
    {
        return (this._viewStateService.showSidePanel ? "" : "65%");
    }

    @HostListener("window:resize", ["$event"])
    onResize(event)
    {
        // Window resized, notify all canvases
        this._layoutService.notifyWindowResize();
    }
}
