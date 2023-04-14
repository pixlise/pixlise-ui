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

import { Injectable, OnDestroy } from "@angular/core";
import { ReplaySubject } from "rxjs";
import { ContextImageModel } from "src/app/UI/context-image-view-widget/model";
import { randomString } from "src/app/utils/utils";



// Exists mainly as a conduit to link other components to the context image view and its model/operation
// Also allows sharing state between multiple context image views, such as on the map view screen

@Injectable({
    providedIn: "root"
})
export class ContextImageService implements OnDestroy
{
    private _mdl: ContextImageModel = null;
    private _mdl$ = new ReplaySubject<void>(1);

    private _lastSubLayerOwners: Set<string> = new Set<string>();

    constructor()
    {
        //console.warn('ContextImageService ['+this._id+'] constructor');
    }

    ngOnDestroy()
    {
        //console.warn('ContextImageService ['+this._id+'] ngOnDestroy');
    }

    //getId(): string { return this._id; }

    setModel(mdl: ContextImageModel): void
    {
        //console.warn('ContextImageService ['+this._id+'] got model:');
        //console.log(mdl);
        this._mdl = mdl;
        this._mdl$.next();
    }

    get mdl(): ContextImageModel
    {
        return this._mdl;
    }

    get mdl$(): ReplaySubject<void>
    {
        return this._mdl$;
    }

    // This is a bit of a hack - API view state only stores info about what layers are visible
    // but we have a quirk in the UI where the user can switch between "pure" elements and the
    // carbonate/oxide of the element. This all works fine, but when the user switches to the
    // "pure" element, then sets visible=false, the code was previously picking the first
    // quantified column (usually carbonate/oxide %), so if the user then hit the visibility
    // toggle again, it showed the carbonate, and they may be wanting to switch the "pure" element
    // on and off. So here we store what was last shown in the layer list (under context image)
    // so if this situation arises, it will not just pick the first column, but the one that was
    // last visible. Only the layer config dialog should be using this, and only for the generation
    // of its layers
    setLastSubLayerOwners(lastSubLayerOwners: Set<string>)
    {
        this._lastSubLayerOwners = lastSubLayerOwners;
    }

    get lastSubLayerOwners(): Set<string>
    {
        return this._lastSubLayerOwners;
    }
}
