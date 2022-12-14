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

import { Component, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/roi";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { SpectrumSource } from "src/app/UI/spectrum-chart-widget/model";



@Component({
    selector: ViewStateService.widgetSelectorSpectrumRegions,
    templateUrl: "./spectrum-region-picker.component.html",
    styleUrls: ["./spectrum-region-picker.component.scss"]
})
export class SpectrumRegionPickerComponent implements OnInit
{
    private _subs = new Subscription();

    predefinedSources: SpectrumSource[] = [];
    userSources: SpectrumSource[] = [];
    sharedSources: SpectrumSource[] = [];

    constructor(
        private _spectrumService: SpectrumChartService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._spectrumService.mdl$.subscribe(
            ()=>
            {
                this.onGotModel();
            }
        ));
    }

    onGotModel(): void
    {
        // Listen to what layers exist...
        this._subs.add(this._spectrumService.mdl.spectrumSources$.subscribe(
            ()=>
            {
                this.predefinedSources = [];
                this.userSources = [];
                this.sharedSources = [];

                for(let source of this._spectrumService.mdl.spectrumSources)
                {
                    if(source.shared)
                    {
                        this.sharedSources.push(source);
                    }
                    else
                    {
                        if(PredefinedROIID.isPredefined(source.roiID))
                        {
                            this.predefinedSources.push(source);
                        }
                        else
                        {
                            this.userSources.push(source);
                        }
                    }
                }

                this.userSources.sort((a: SpectrumSource, b: SpectrumSource)=>(a.roiName.localeCompare(b.roiName)));
                this.sharedSources.sort((a: SpectrumSource, b: SpectrumSource)=>(a.roiName.localeCompare(b.roiName)));

                let enabledUserSources = this.userSources.filter((source) => source.lineChoices.some((choice) => choice.enabled));
                let enabledSharedSources = this.sharedSources.filter((source) => source.lineChoices.some((choice) => choice.enabled));

                let disabledUserSources = this.userSources.filter((source) => !source.lineChoices.some((choice) => choice.enabled));
                let disabledSharedSources = this.sharedSources.filter((source) => !source.lineChoices.some((choice) => choice.enabled));

                // Move enabled sources to the top of the list
                this.userSources = enabledUserSources.concat(disabledUserSources);
                this.sharedSources = enabledSharedSources.concat(disabledSharedSources);
            },
            (err)=>
            {
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onClear(sources: SpectrumSource[]): void
    {
        sources.forEach((source) => 
        {
            source.lineChoices.forEach(choice =>
            {
                choice.enabled = false;
                this._spectrumService.mdl.removeSpectrumLine(source.roiID, choice.lineExpression);
            });
        });
    }
}
