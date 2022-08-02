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
import { PiquantVersionConfig } from "src/app/models/BasicTypes";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";



@Component({
    selector: "app-piquant-version",
    templateUrl: "./piquant-version.component.html",
    styleUrls: ["./piquant-version.component.scss"]
})
export class PiquantVersionComponent implements OnInit
{
    private _currVersion: PiquantVersionConfig = null;
    loading: boolean = false;

    constructor(
        private envService: EnvConfigurationService
    )
    {
    }

    ngOnInit(): void
    {
        this.refresh();
    }

    private refresh(): void
    {
        this.loading = true;
        this.envService.getPiquantVersion().subscribe(
            (version: PiquantVersionConfig)=>
            {
                this._currVersion = version;
                this.loading = false;
            },
            (err)=>
            {
                this.loading = false;
                alert("Failed to get current version information");
            }
        );
    }

    get currentVersion(): string
    {
        if(this._currVersion)
        {
            return this._currVersion.version;
        }

        return "Not Set";
    }

    get currentVersionTimestamp(): number
    {
        if(this._currVersion)
        {
            return this._currVersion.changedUnixTimeSec;
        }

        return 0;
    }

    get currentVersionSetter(): string
    {
        if(this._currVersion)
        {
            return this._currVersion.creator.name+" ("+this._currVersion.creator.user_id+")";
        }

        return "";
    }

    onChangeVersion(): void
    {
        let newVersion = prompt("Enter docker registry tag");
        if(newVersion && newVersion.length > 0)
        {
            // Set it!
            this.envService.setPiquantVersion(newVersion).subscribe(
                ()=>
                {
                    alert("PIQUANT version set to: \""+newVersion+"\".\nThe next quantification will use this version!");
                    this.refresh();
                },
                (err)=>
                {
                    alert("FAILED to set PIQUANT version to: "+newVersion);
                    this.refresh();
                }
            );
        }
    }
}
