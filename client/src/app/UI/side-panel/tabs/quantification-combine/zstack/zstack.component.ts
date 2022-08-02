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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { PredefinedROIID } from "src/app/models/roi";
import { ZStackItemForDisplay } from "./zstack-item/zstack-item.component";



@Component({
    selector: "quant-combine-zstack",
    templateUrl: "./zstack.component.html",
    styleUrls: ["./zstack.component.scss","../quantification-combine.component.scss", "../../../side-panel.component.scss"]
})
export class ZStackComponent implements OnInit
{
    @Input() items: ZStackItemForDisplay[] = [];
    @Output() onZStackChanged = new EventEmitter();

    remainingPointsROI: string = PredefinedROIID.RemainingPoints;

    constructor()
    {
    }

    ngOnInit(): void
    {
        
    }

    get lastROIIdx(): number
    {
        let result = this.items.length-1;
        // If the last one is the remaining points ROI, we hop back 1
        if(result >= 0 && this.items[result].zStackItem.roiID == PredefinedROIID.RemainingPoints)
        {
            result--;
        }
        return result;
    }

    onDeleteZItem(roiID: string): void
    {
        for(let c = 0; c < this.items.length; c++)
        {
            if(this.items[c].zStackItem.roiID == roiID)
            {
                this.items.splice(c, 1);
                this.onZStackChanged.emit();
                return;
            }
        }
    }

    onChangeZOrder(roiID: string, moveUp: boolean): void
    {
        for(let c = 0; c < this.items.length; c++)
        {
            let item = this.items[c];

            if(item.zStackItem.roiID == roiID)
            {
                // Insert it where it wants to go
                if(moveUp && c > 0)
                {
                    // Remove it
                    this.items.splice(c, 1);
                    this.items.splice(c-1, 0, item);
                }
                else if(!moveUp)
                {
                    if(c < this.items.length-1)
                    {
                        // Remove it
                        this.items.splice(c, 1);
                        this.items.splice(c+1, 0, item);
                    }
                    else if(c == this.items.length-1)
                    {
                        // Remove it
                        this.items.splice(c, 1);
                        this.items.push(item);
                    }
                }

                this.onZStackChanged.emit();
                return;
            }
        }
    }
}
