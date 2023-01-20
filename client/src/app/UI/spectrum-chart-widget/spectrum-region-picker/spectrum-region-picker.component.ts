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
import { ObjectCreator } from "src/app/models/BasicTypes";
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
    mistSources: SpectrumSource[] = [];

    isFiltering: boolean = false;

    filteredUserSources: SpectrumSource[] = [];
    filteredSharedSources: SpectrumSource[] = [];
    filteredMISTSources: SpectrumSource[] = [];

    filteredTagIDs: string[] = [];
    
    private _filterText: string = "";
    
    authors: ObjectCreator[] = [];
    private _filteredAuthors: string[] = [];

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
                this.mistSources = [];

                for(let source of this._spectrumService.mdl.spectrumSources)
                {
                    if(source.shared)
                    {
                        if(source.isMIST)
                        {
                            this.mistSources.push(source);
                        }
                        else
                        {
                            this.sharedSources.push(source);
                        }
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
                this.mistSources.sort((a: SpectrumSource, b: SpectrumSource)=>(a.roiName.localeCompare(b.roiName)));

                let enabledUserSources = this.userSources.filter((source) => source.lineChoices.some((choice) => choice.enabled));
                let enabledSharedSources = this.sharedSources.filter((source) => source.lineChoices.some((choice) => choice.enabled));
                let enabledMistSources = this.mistSources.filter((source) => source.lineChoices.some((choice) => choice.enabled));

                let disabledUserSources = this.userSources.filter((source) => !source.lineChoices.some((choice) => choice.enabled));
                let disabledSharedSources = this.sharedSources.filter((source) => !source.lineChoices.some((choice) => choice.enabled));
                let disabledMISTSources = this.mistSources.filter((source) => !source.lineChoices.some((choice) => choice.enabled));

                // Move enabled sources to the top of the list
                this.userSources = enabledUserSources.concat(disabledUserSources);
                this.sharedSources = enabledSharedSources.concat(disabledSharedSources);
                this.mistSources = enabledMistSources.concat(disabledMISTSources);

                this.filterROIs();
                this.extractAuthors(this._spectrumService.mdl.spectrumSources);
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

    extractAuthors(rois: SpectrumSource[])
    {
        let authorIDs = new Set<string>();
        let authors: ObjectCreator[] = [];
        rois.forEach((roi) =>
        {
            if(roi?.creator && !authorIDs.has(roi.creator.user_id))
            {
                authors.push(roi.creator);
                authorIDs.add(roi.creator.user_id);
            }
        });

        this.authors = authors;
    }


    filterROI(roi: SpectrumSource): boolean
    {
        let matchesText = true;
        let matchesTags = true;
        let matchesAuthors = true;

        let filterText = this._filterText?.toLowerCase();
        if(filterText.length > 0)
        {
            matchesText = roi.roiName?.toLowerCase().includes(filterText);
        }
        if(this.filteredTagIDs.length > 0)
        {
            matchesTags = this.filteredTagIDs.some((tagID) => roi.tags.includes(tagID));
        }
        if(this.filteredAuthors.length > 0)
        {
            matchesAuthors = this.filteredAuthors.some((author) => roi.creator.user_id === author);
        }

        return matchesText && matchesTags && matchesAuthors;
    }

    toggleFilters(): void
    {
        this.isFiltering = !this.isFiltering;
        this.filterROIs();
    }

    filterROIs(): void
    {
        if(this.isFiltering)
        {
            this.filteredUserSources = this.userSources.filter((roi) => this.filterROI(roi));
            this.filteredSharedSources = this.sharedSources.filter((roi) => this.filterROI(roi));
            this.filteredMISTSources = this.mistSources.filter((roi) => this.filterROI(roi));
        }
        else
        {
            this.filteredUserSources = [...this.userSources];
            this.filteredSharedSources = [...this.sharedSources];
            this.filteredMISTSources = [...this.mistSources];
        }
    }

    get authorsTooltip(): string
    {
        let authorNames = this.authors.filter((author) => this._filteredAuthors.includes(author.user_id)).map((author) => author.name);
        return this._filteredAuthors.length > 0 ? `Authors:\n${authorNames.join("\n")}` : "No Authors Selected";
    }


    get filteredAuthors(): string[]
    {
        return this._filteredAuthors;
    }

    set filteredAuthors(authors: string[])
    {
        this._filteredAuthors = authors;
        this.filterROIs();
    }

    onTagFilterChanged(tagIDs: string[]): void
    {
        this.filteredTagIDs = tagIDs;
        this.filterROIs();
    }

    onFilterText(filterText: string): void
    {
        this._filterText = filterText || "";
        this.filterROIs();
    }
}
