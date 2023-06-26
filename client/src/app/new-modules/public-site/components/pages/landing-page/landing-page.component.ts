import { Component } from '@angular/core';
import { Router } from "@angular/router";

// Import the AuthService type from the SDK
import { AuthService } from '@auth0/auth0-angular';

import { VersionService } from "../../../services/version.service";
import { environment } from "src/environments/environment";


@Component({
    selector: 'app-landing-page',
    templateUrl: './landing-page.component.html',
    styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent
{
    versionInfo = "Loading...";

    constructor(
        private _router: Router,
        public authService: AuthService,
        public versionSvc: VersionService
        )
    {
    }

    ngOnInit()
    {
        this.versionSvc.version$.subscribe(
            (versions)=>
            {
                this.versionInfo = "[";
                for(let v of versions)
                {
                    if(this.versionInfo.length > 1)
                    {
                        this.versionInfo += ", ";
                    }
                    this.versionInfo += v.component+"="+v.version;
                }
                this.versionInfo += "]";
            }
        );
    }

    onLogin()
    {
        this.authService.loginWithRedirect({appState: { target: environment.authTarget}});
    }

    onSignup()
    {
        this.authService.loginWithRedirect({authorizationParams: {screen_hint: "signup"}});
    }

    onViewDatasets()
    {
        this._router.navigateByUrl("datasets");
    }

    onLogout()
    {
        this.authService.logout();
    }
}
