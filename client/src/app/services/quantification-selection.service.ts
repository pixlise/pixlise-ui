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

import { Injectable } from "@angular/core";
import { Subject } from "rxjs";



// HACK:
// TODO: this should probably built a better way, but for the moment I don't see a better way
// Quantification selector is a dialog shown as a ComponentPortal, and therefore we can't get a reference
// to it to subscribe to user clicks or something (see PanelFoldoutButtonComponent). After some reading
// it seems the "right" way (as often is the case) is to talk through a service. This is that service.
// Any code that cares about users clicking on a quantification can listen to this, and then act on it.
// At time of writing this is the top toolbar quant dropdown (which provides no ROI ID with selection)
// and the multi-quant side-bar quant pickers which will provide an ROI that the selected quant was clicked
// for

export class QuantificationSelectionInfo
{
    constructor(public roiID: string, public quantificationID: string, public quantificationName: string)
    {
    }
}


@Injectable({
    providedIn: "root"
})
export class QuantificationSelectionService
{
    private _quantificationsSelected$ = new Subject<QuantificationSelectionInfo>();

    constructor()
    {
    }

    get quantificationsSelected$(): Subject<QuantificationSelectionInfo>
    {
        return this._quantificationsSelected$;
    }

    notifyQuantificationSelected(roiID: string, quantificationID: string, quantName: string): void
    {
        this._quantificationsSelected$.next(new QuantificationSelectionInfo(roiID, quantificationID, quantName));
    }
}
