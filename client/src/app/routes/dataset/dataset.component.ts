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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { DataSet } from "src/app/models/DataSet";
import { DataSetService } from "src/app/services/data-set.service";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";






@Component({
    selector: "app-dataset",
    templateUrl: "./dataset.component.html",
    styleUrls: ["./dataset.component.scss"]
})
export class DatasetComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();
    private _subsViewState = new Subscription();

    datasetLoaded: boolean = false;

    constructor(
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
    )
    {
    }

    ngOnInit()
    {
        // We listen for dataset clear to indicate we're loading, dataset progress for updates, and viewState to know
        // we can show our view
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(dataset)
                {
                    this._subsViewState.add(this._viewStateService.viewState$.subscribe(
                        (viewState: ViewState)=>
                        {
                            this.datasetLoaded = true;
                        },
                        (err)=>
                        {
                            this.datasetLoaded = false;
                        }
                    ));
                }
                else
                {
                    this.datasetLoaded = false;

                    this._subsViewState.unsubscribe();
                    this._subsViewState = new Subscription();
                }
            },
            (err)=>
            {
                this.datasetLoaded = false;
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this._subsViewState.unsubscribe();
    }
}
