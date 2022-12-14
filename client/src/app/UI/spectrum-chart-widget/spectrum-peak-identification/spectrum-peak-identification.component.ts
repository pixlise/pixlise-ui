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

import { Component, ComponentFactoryResolver, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { Subscription, timer } from "rxjs";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { TabSelectors } from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/tab-selectors";
import { BrowseOnChartComponent } from "./tabs/browse-on-chart.component";
import { ElementSetsComponent } from "./tabs/element-sets.component";
import { PeriodicTableTabComponent } from "./tabs/periodic-table-tab.component";


@Component({
    selector: ViewStateService.widgetSelectorSpectrumPeakID,
    templateUrl: "./spectrum-peak-identification.component.html",
    styleUrls: ["./spectrum-peak-identification.component.scss"]
})
export class SpectrumPeakIdentificationComponent implements OnInit, OnDestroy
{
    @ViewChild("peakTab", { read: ViewContainerRef }) tabAreaContainer;

    private _subs = new Subscription();

    private _tabComponent = null;
    private _tabSelector: string = "";

    constructor(
        private resolver: ComponentFactoryResolver,
        private _spectrumService: SpectrumChartService
    )
    {
    }

    ngOnInit()
    {
    }

    ngAfterViewInit()
    {
        // Run this after this function finished, else we get ExpressionChangedAfterItHasBeenCheckedError
        const source = timer(1);
        /*const sub =*/ source.subscribe(
            ()=>
            {
                this.onTabPeriodicTable();
            }
        );
    }

    ngOnDestroy()
    {
        this._spectrumService.mdl.xrfNearMouse.clear();
        this.clearTabArea();
        this._subs.unsubscribe();
    }

    onTabPeriodicTable()
    {
        this.setTab(TabSelectors.tabPeriodicTable);
    }

    onTabBrowseOnChart()
    {
        this.setTab(TabSelectors.tabBrowseOnChart);
    }

    onTabElementSets()
    {
        this.setTab(TabSelectors.tabElementSets);
    }

    get isPeriodicTableSelected(): boolean
    {
        return this._tabSelector == TabSelectors.tabPeriodicTable;
    }

    get isBrowseOnChartSelected(): boolean
    {
        return this._tabSelector == TabSelectors.tabBrowseOnChart;
    }

    get isElementSetsSelected(): boolean
    {
        return this._tabSelector == TabSelectors.tabElementSets;
    }

    protected setTab(selector: string)
    {
        this.tabAreaContainer.clear();
        this.clearTabArea();

        let factory = this.makeComponentFactory(selector);
        if(!factory)
        {
            return;
        }

        //console.log('createUnderContextImageComponent made factory for: '+selector);
        this._tabComponent = this.tabAreaContainer.createComponent(factory);
        this._tabSelector = selector;

        if(selector == TabSelectors.tabBrowseOnChart)
        { 
            // We've switched to the browse-by-chart tab, set the browseOnChart value to
            // be in the middle of the chart so user can start dragging it
            let middleX = this._spectrumService.mdl.transform.canvasParams.width/2;
            let browseOnChartEnergy = this._spectrumService.mdl.xAxis.canvasToValue(middleX);
            this._spectrumService.mdl.setEnergyAtMouse(browseOnChartEnergy);
        }
        else
        {
            this._spectrumService.mdl.xrfNearMouse.clear();
        }

        this._spectrumService.mdl.needsDraw$.next();
    }

    // NOTE: there are ways to go from selector string to ComponentFactory:
    //       eg. https://indepth.dev/posts/1400/components-by-selector-name-angular
    //       but we're only really doing this for 5 components, and don't actually want
    //       it to work for any number of components, so hard-coding here will suffice
    private getComponentClassForSelector(selector: string): any
    {
    // Widgets
        if(selector == TabSelectors.tabBrowseOnChart)
        {
            return BrowseOnChartComponent;
        }
        else if(selector == TabSelectors.tabPeriodicTable)
        {
            return PeriodicTableTabComponent;
        }
        else if(selector == TabSelectors.tabElementSets)
        {
            return ElementSetsComponent;
        }

        console.error("getComponentClassForSelector unknown selector: "+selector+". Substituting chord diagram");
        return PeriodicTableTabComponent;
    }

    private makeComponentFactory(selector: string): object
    {
        let klass = this.getComponentClassForSelector(selector);
        let factory = this.resolver.resolveComponentFactory(klass);
        return factory;
    }

    private clearTabArea(): void
    {
    // Under context image
        if(this._tabComponent != null)
        {
            this._tabComponent.destroy();
            this._tabComponent = null;
            this._tabSelector = TabSelectors.tabPeriodicTable;
        }
    }
}
