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
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";


@Component({
    selector: "app-about",
    templateUrl: "./about.component.html",
    styleUrls: ["./about.component.scss"]
})
export class AboutComponent implements OnInit
{
    notProdRedirectFrom: string = null;

    constructor(
        private _authService: AuthenticationService,
        private _router: Router,
    )
    {
    }

    ngOnInit()
    {
        if(EnvConfigurationInitService.appConfig.name != "prod")
        {
            this.notProdRedirectFrom = EnvConfigurationInitService.appConfig.name+"."+EnvConfigurationInitService.appConfig.appDomain;
        }
    }

    get isLoggedIn(): boolean
    {
        return this._authService.loggedIn;
    }

    get appDomain(): string
    {
        return EnvConfigurationInitService.appConfig.appDomain;
    }

    get appSubDomain(): string
    {
        return EnvConfigurationInitService.appConfig.name == "prod" ? "www" : EnvConfigurationInitService.appConfig.name;
    }

    onSignUp(): void
    {
        this._authService.login("/about", true);
    }

    onLogin(): void
    {
        this._authService.login("/about", false);
    }

    onQuickStart(): void
    {
        this._router.navigate(["help"], { fragment: "quickstart" });

        // Previously this was a part of our documentation pages
        //window.open('https://pixlise.gitlab.io/documentation/docs/quick-start', "_blank");
    }

    onDiscussionBoard(): void
    {
        window.open("https://discuss."+EnvConfigurationInitService.appConfig.appDomain, "_blank");
    }

    onDocumentation(): void
    {
        window.open("https://pixlise.gitlab.io/documentation", "_blank");
    }

    onDatasets(): void
    {
        this._router.navigateByUrl("/datasets");
    }
}
