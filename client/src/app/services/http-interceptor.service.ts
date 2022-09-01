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

import {
    HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { Observable, throwError } from "rxjs";
import { catchError, mergeMap, tap } from "rxjs/operators";
import { FullScreenDisplayComponent, FullScreenDisplayData } from "src/app/UI/atoms/full-screen-display/full-screen-display.component";
import { APIPaths } from "src/app/utils/api-helpers";
import { AuthenticationService } from "./authentication.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { Router } from "@angular/router";


// HttpInterceptorService is vital in communications with the PIXLISE API. It serves several purposes:
// - Adds Bearer token to message headers (for all API calls except /version which is public!)
// - Monitors the onLine flag, if browser is marked as not being online, shows blocking dialog until this is fixed
// - When an error response comes in, it shows appropriate blocking dialogs as needed, until they are resolved
// - When an 503 error comes in, shows PIXLISE API is upgrading, as that's what cloudfront should give us if API
//   hosts are down
// - When a successful response arrives and we're showing one of the above blocking dialogs, it clears it.
// NOTE: The above feature 100% relies on something in the background still reaching out to poll the server. At time
//       of writing, this is the alerts polling, done by the nav bar, which should be visible

@Injectable({
    providedIn: "root"
})
export class HttpInterceptorService implements HttpInterceptor
{
    private _commsErrorDlg: MatDialogRef<FullScreenDisplayComponent> = null;
    private _showingLoginExpired: boolean = false;

    constructor(
        private _authService: AuthenticationService,
        public dialog: MatDialog,
        private router: Router,
    )
    {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
        // The one thing we don't want to be intercepted is the versions query:
        let versionsURL = APIPaths.getWithHost(APIPaths.api_componentVersions);

        // If the browser online is false, show the warning dialog straight away
        if(!window.navigator.onLine)
        {
            console.error("Browser marked as not onLine");
            if(!this._commsErrorDlg)
            {
                this._commsErrorDlg = this.showNoInternetDialog("You are not online!");
            }
        }

        // If it's a request to:
        // - Something starting with ./
        // - The versions URL
        // - NOT a request to our API
        // Then we don't inject anything into the request!
        if( req.url.startsWith("./") ||
            !req.url.startsWith(EnvConfigurationInitService.appConfig.apiUrl) ||
            req.url == versionsURL ||
            !this._authService.isAuthenticated$
        )
        {
            return next.handle(req);
        }

        // Otherwise, we do:
        return this._authService.getTokenSilently$().pipe(
            mergeMap(token => 
            {
                const tokenReq = req.clone({
                    setHeaders: { Authorization: `Bearer ${token}` }
                });

                return next.handle(tokenReq);
            }),
            tap(
                (evt)=>
                {
                    if(evt instanceof HttpResponse)
                    {
                        // If we've had a success, and are still showing the error dialog, remove it as the API
                        // may have recovered
                        if(this._commsErrorDlg)
                        {
                            console.log("Auto-closing comms issue dialog due to success response arriving!");
                            this._commsErrorDlg.close(null);
                        }
                    }
                }
            ),
            catchError(
                (error: HttpErrorResponse)=>
                {
                    if(error.error instanceof ErrorEvent)
                    {
                        // client-side error
                        console.error(`Client Error: ${error.error.message}`);
                    }
                    else
                    {
                        // If no internet...
                        if(error.status === 0)
                        {
                            console.error("Cannot communicate with API");
                            if(!this._commsErrorDlg)
                            {
                                this._commsErrorDlg = this.showNoInternetDialog("Cannot communicate with PIXLISE server!");
                            }
                        }
                        // server-side error
                        else if(error.status === 503)
                        {
                            // assume API is being upgraded
                            if(!this._commsErrorDlg)
                            {
                                this._commsErrorDlg = this.showCommsErrorDialog(
                                    "PIXLISE server is in the process of an upgrade.\n\nPlease wait, this may take a few minutes...",
                                    false,
                                    FullScreenDisplayData.iconProgress
                                );
                            }
                        }
                        else if(error.error === "login_required" && !["/", "/about"].includes(this.router.url))
                        {
                            console.error("Login required", error);

                            if(!this._showingLoginExpired)
                            {
                                if(this._commsErrorDlg)
                                {
                                    // Hide all other dialogs, this is more important!
                                    this._commsErrorDlg.close(null);
                                }

                                this._commsErrorDlg = this.showCommsErrorDialog(
                                    "Your login session has expired.\n\nPlease reload the page and PIXLISE will resume operating.",
                                    false,
                                    FullScreenDisplayData.iconTriangle
                                );
                                this._showingLoginExpired = true;
                            }
                        }
                        else if(error.status === 500)
                        {
                            // API had an internal error... log this too (?)
                            console.log(`Error Code: ${error.status}\nMessage: ${error.message}`);
                        }
                    }

                    return throwError(error);
                }
            )
        );
    }

    private showNoInternetDialog(msg: string): MatDialogRef<FullScreenDisplayComponent>
    {
        return this.showCommsErrorDialog(
            msg+"\n\nPlease check your internet connection and PIXLISE will resume operating.",
            true,
            FullScreenDisplayData.iconTriangle
        );
    }

    private showCommsErrorDialog(msg: string, showClose: boolean, icon: string): MatDialogRef<FullScreenDisplayComponent>
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = true;
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        dialogConfig.data = new FullScreenDisplayData(msg, showClose, icon);

        let ref = this.dialog.open(FullScreenDisplayComponent, dialogConfig);
        ref.afterClosed().subscribe(
            (obs)=>
            {
                this._commsErrorDlg = null;
            }
        );

        return ref;
    }
}
