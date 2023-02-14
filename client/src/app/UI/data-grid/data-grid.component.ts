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
import { Subscription } from "rxjs";
import { ContextImageService } from "src/app/services/context-image.service";

@Component({
    selector: "data-grid",
    templateUrl: "./data-grid.component.html",
    styleUrls: ["./data-grid.component.scss"],
    providers: [ContextImageService],
})
export class DataGridComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    @Input() title: string = "Data Grid";
    @Input() data: any[] = [];
    @Input() columnCount: number = 0;

    constructor(
    )
    {
    }

    get rowCount(): number
    {
        return this.columnCount > 0 ? Math.floor(this.data.length / this.columnCount) : 0;
    }

    get minDataValue(): number
    {
        let minValue = null;
        this.data.forEach((point) =>
        {
            if(typeof point === "number" && (minValue === null || point < minValue))
            {
                minValue = point;
            }
        });

        return minValue || 0;
    }

    get maxDataValue(): number
    {
        let maxValue = null;
        this.data.forEach((point) =>
        {
            if(typeof point === "number" && (maxValue === null || point > maxValue))
            {
                maxValue = point;
            }
        });

        return maxValue || 0;
    }

    get avgDataValue(): number
    {
        let avgValue = null;
        let validPointCount = 0;
        this.data.forEach((point) =>
        {
            if(typeof point === "number")
            {
                avgValue += point;
                validPointCount++;
            }
        });

        return avgValue !== null && validPointCount > 0 ? avgValue / validPointCount : 0;
    }


    ngOnInit()
    {
        
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }
}
