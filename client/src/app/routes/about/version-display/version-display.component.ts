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
import { ComponentVersion, ComponentVersions } from "src/app/models/BasicTypes";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { VERSION } from "src/environments/version";




@Component({
    selector: "version-display",
    templateUrl: "./version-display.component.html",
    styleUrls: ["./version-display.component.scss", "../about.component.scss"]
})
export class VersionDisplayComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    versions: ComponentVersions = null;
    error: boolean = false;

    constructor(
        public envConfigService: EnvConfigurationService
    )
    {
    }

    ngOnInit()
    {
        this.versions = null;
        this.error = false;
        const verstr = VERSION["version"]+"-"+VERSION["hash"];

        this._subs.add(this.envConfigService.getComponentVersions().subscribe((versions)=>
        {
            this.versions = versions;
            // Add our own one at the start
            this.versions.components.unshift(new ComponentVersion("PIXLISE UI", verstr, null));
        },
        (err)=>
        {
            // Just show our own version
            this.versions = new ComponentVersions([]);
            this.versions.components.push(new ComponentVersion("PIXLISE UI", verstr, null));
            this.error = true;
        }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }
}
