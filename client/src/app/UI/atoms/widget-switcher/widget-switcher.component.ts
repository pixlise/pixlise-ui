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

import { Component, Input, OnInit } from "@angular/core";
import { ViewStateService } from "src/app/services/view-state.service";



class SelectableWidget
{
    constructor(public selector, public label)
    {
    }
}

@Component({
    selector: "widget-switcher",
    templateUrl: "./widget-switcher.component.html",
    styleUrls: ["./widget-switcher.component.scss"]
})
export class WidgetSwitcherComponent implements OnInit
{
    @Input() activeSelector: string = "";
    @Input() widgetPosition: string = "";

    selectableOptions: SelectableWidget[] = [
        new SelectableWidget(ViewStateService.widgetSelectorBinaryPlot, "Binary"),
        new SelectableWidget(ViewStateService.widgetSelectorChordDiagram, "Chord"),
        new SelectableWidget(ViewStateService.widgetSelectorContextImage, "Context Image"),
        new SelectableWidget(ViewStateService.widgetSelectorHistogram, "Histogram"),
        new SelectableWidget(ViewStateService.widgetSelectorParallelCoordinates, "Parallel Coords"),
        new SelectableWidget(ViewStateService.widgetSelectorRGBUViewer, "RGBU Images"),
        new SelectableWidget(ViewStateService.widgetSelectorRGBUPlot, "RGBU Plot"),
        new SelectableWidget(ViewStateService.widgetSelectorSingleAxisRGBU, "Single Axis RGBU"),
        new SelectableWidget(ViewStateService.widgetSelectorROIQuantCompareTable, "ROI Quant Table"),
        new SelectableWidget(ViewStateService.widgetSelectorSpectrum, "Spectrum"),
        new SelectableWidget(ViewStateService.widgetSelectorQuantificationTable, "Table"),
        new SelectableWidget(ViewStateService.widgetSelectorTernaryPlot, "Ternary"),
        new SelectableWidget(ViewStateService.widgetSelectorVariogram, "Variogram"),
    ];
    selectedOption: string = "";
    private _selectedOptionMap: Map<string, string> = new Map<string, string>();

    constructor(private _viewStateService: ViewStateService)
    {
        for(let opt of this.selectableOptions)
        {
            this._selectedOptionMap.set(opt.selector, opt.label);
        }
    }

    ngOnInit(): void
    {
        this.selectedOption = this.activeSelector;
    }

    onSwitchWidget(event): void
    {
        // Notify the layout service of this change
        this._viewStateService.setAnalysisViewSelector(this.widgetPosition, event.value);
    }

    get selectedOptionLabel(): string
    {
        return this._selectedOptionMap.get(this.selectedOption);
    }
}
