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
//import { Router } from "@angular/router";
import { first, pipe, Subscription } from "rxjs";
// import { AuthenticationService } from "src/app/services/authentication.service";
// import { AuthService } from "@auth0/auth0-angular";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { AnalysisLayoutService } from "../../../../analysis/analysis.module";
import { ActivatedRoute, Router } from "@angular/router";
import { httpErrorToString } from "src/app/utils/utils";

// The purpose of this page is to process the auth0 code/state that comes in. This is why we have an auth service
// injected here - if the application is brought to this page and it has the code/state the auth service will see
// it and treat us as logged in

// Example error situation
// http://localhost:4200/authenticate?
// error=access_denied&
// error_description=Please%20verify%20your%20email%20by%20clicking%20the%20verify%20link%20that%20was%20emailed%20to%20you%20before%20logging%20in.&
// state=dnpfeC1Gc1ZVWi1PYmw2ODE4dE5qZkxIR190Sl82dElRaHIyUGxwSlJHNQ%3D%3D

@Component({
  selector: "app-authenticate",
  templateUrl: "./authenticate.component.html",
  styleUrls: ["./authenticate.component.scss"],
})
export class AuthenticateComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  errorString: string = "";

  constructor(
    private _router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this._subs.add(
      this.authService.error$.subscribe((err: Error) => {
        console.error(err);

        // We get some weird effects here - if it's a missing_refresh_token, this seems to happen
        // due to a non-verified email account (for new users), or it might be a legit missing_refresh_token
        // but at this point Auth0 should show the linking screen.

        // We also get a "missing_transaction" Invalid State message on every login. Not sure what's
        // causing this but we probably can skip displaying it
        // Try display it
        let prefix = "";
        if (err["error"] != undefined) {
          if (typeof err["error"] === "string") { 
            prefix = err["error"];
          }
        }

        if (prefix == "missing_transaction" && err.message == "Invalid state") {
          this.errorString = "Login in progress...";
        } else if (prefix == "missing_refresh_token") {
          this.errorString = "Please click the verification link you were emailed and follow prompts to link your account to PIXLISE"
        } else {
          this.errorString = `${prefix} ${err.message}\n`;
        }
      })
    );

    this._subs.add(
      this.authService.isLoading$.subscribe((loading: boolean) => {
        if (!loading) {
          this.authService.isAuthenticated$.pipe(first()).subscribe((isAuthenticated: boolean)=> {
            if (isAuthenticated) {
              this._router.navigate(["/datasets"]);
            }
          });
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onHome() {
    this.authService.logout();
  }
}
