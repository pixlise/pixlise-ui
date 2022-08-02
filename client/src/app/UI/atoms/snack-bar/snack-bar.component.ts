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
import { SnackEvent, SnackParams, SnackService } from "src/app/services/snack.service";



@Component({
    selector: "app-snack-bar",
    templateUrl: "./snack-bar.component.html",
    styleUrls: ["./snack-bar.component.scss"]
})
export class SnackBarComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();
    private _snacks: SnackParams[] = [];

    constructor(private snackService: SnackService)
    {
    }

    ngOnInit()
    {
        this._subs.add(this.snackService.snacks$.subscribe(
            (snacks: SnackParams[])=>
            {
                this._snacks = snacks;
            },
            (err)=>
            {
            }
        ));
    }

    get snacks(): SnackParams[]
    {
        return this._snacks;
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    actionClicked(event: SnackEvent): void
    {
        this.snackService.remove(event.id, event.action);
    }
}
