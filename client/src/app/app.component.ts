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

import { Component, inject, OnDestroy } from "@angular/core";
import { MonacoEditorService } from "./modules/code-editor/services/monaco-editor.service";
import { Router } from "@angular/router";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { GenericError } from "@auth0/auth0-angular";
import { takeUntil, filter, Subject, tap } from "rxjs";
import { SnackbarService } from "./modules/pixlisecore/pixlisecore.module";

//import { PIXLISECoreModule } from "src/app/modules/pixlisecore/pixlisecore.module";


@Component({
  standalone: false,
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnDestroy {
  // From: https://developer.auth0.com/resources/guides/spa/angular/basic-authentication#render-components-conditionally
  private _auth = inject(AuthService);
  isAuth0Loading$ = this._auth.isLoading$;

  private _destroy$ = new Subject<void>();

  constructor(
    private _monacoService: MonacoEditorService,
    private _router: Router,
    private _snackService: SnackbarService
  ) {
    // We trigger loading the service once, here, right on startup. This will end up creating a monaco object tied
    // to the window, which our child components can listen for being ready and create code editor views as needed
    try {
      this._monacoService.load();
    } catch (err) {
      console.error("Failed to load Monaco editor", err);
      setTimeout(() => {
        this._monacoService.load();
      }, 1000);
    }

    // Taken from: https://community.auth0.com/t/unknown-or-invalid-refresh-token-error/112975/5
    // Trying to make PIXLISE go back to the main page and log out when token is dead
    // this._auth.error$.pipe(
    //   takeUntil(this._destroy$),
    //   filter((e) => e instanceof GenericError && (e['error'] === 'login_required' || e['error'] === 'invalid_grant')),
    //   mergeMap(() => {
    //     this._snackService.open("You have been logged out", "Your session has expired, log in again to continue using PIXLISE");
    //     const returnTo = location.protocol + "//" + location.host;
    //     return this._auth.logout({ logoutParams: { returnTo: returnTo } });
    //   })
    // ).subscribe();

    // This version is simpler, it just shows a notification saying you're logged out
    this._auth.error$.pipe(
      takeUntil(this._destroy$),
      filter(err => err instanceof GenericError && (err["error"] === "login_required" || err["error"] === "invalid_grant")),
      tap(() => {
        this._snackService.open(
          "You have been logged out",
          "Your session has expired, log in again to continue using PIXLISE",
          undefined,
          30000
        );
      })
    ).subscribe();
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  get isPublicPage(): boolean {
    return this._router.url == "/" || this._router.url == "/authenticate" || this._router.url.includes("/public/") || this._router.url.includes("/magiclink");
  }
}
