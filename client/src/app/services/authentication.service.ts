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
import { Router } from "@angular/router";
import createAuth0Client, { CacheLocation } from "@auth0/auth0-spa-js";
import Auth0Client from "@auth0/auth0-spa-js/dist/typings/Auth0Client";
import * as Sentry from "@sentry/browser";
import { BehaviorSubject, combineLatest, from, Observable, of, ReplaySubject, throwError } from "rxjs";
import { catchError, concatMap, shareReplay, tap } from "rxjs/operators";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";


@Injectable({
    providedIn: "root"
})
export class AuthenticationService
{
    // Individual permissions the user may have set
    public static readonly permissionCreateQuantification = "write:quantification";
    public static readonly permissionDownloadBulkSum = "download:bulksum";
    public static readonly permissionEditPiquantConfig = "write:piquant-config";
    public static readonly permissionViewUserRoles = "read:user-roles";
    public static readonly permissionViewPiquantJobs = "read:piquant-jobs";
    public static readonly permissionBlessQuantification = "write:bless-quant";
    public static readonly permissionPublishQuantification = "write:publish-quant";
    public static readonly permissionEditDataset = "write:dataset";
    public static readonly permissionEditDiffractionPeaks = "write:diffraction-peaks";
    public static readonly permissionExportMap = "export:map";

    public static readonly permissionNone = "no-permission";

    public static readonly permissionAccessStartsWith = "access:";

    public static readonly authPermissions = "permissions";

    public static hasPermissionSet(claims, permissionToCheck: string): boolean
    {
        if(!claims || !claims[EnvConfigurationInitService.appConfig.auth0_namespace] || !claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions])
        {
            // nothing to look in!
            return false;
        }

        // Look for the permission item
        let permissions = claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions];
        return permissions.indexOf(permissionToCheck) != -1;
    }

    public static permissionCount(claims): number
    {
        if(!claims || !claims[EnvConfigurationInitService.appConfig.auth0_namespace] || !claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions])
        {
            // nothing to look in!
            return -1;
        }

        // Look for the permission item
        let permissions = claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions];
        return permissions.length;
    }

    public static getGroupsPermissionAllows(claims): string[]
    {
        let result = [];

        if(claims && claims[EnvConfigurationInitService.appConfig.auth0_namespace] && claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions])
        {
            let permissions = claims[EnvConfigurationInitService.appConfig.auth0_namespace][AuthenticationService.authPermissions];
            for(let perm of permissions)
            {
                if(perm.startsWith(AuthenticationService.permissionAccessStartsWith))
                {
                    let justGroup = perm.substring(AuthenticationService.permissionAccessStartsWith.length);
                    result.push(justGroup);
                }
            }
        }

        return result;
    }

    // See: https://auth0.com/docs/architecture-scenarios/spa-api/part-3#implement-the-spa
    private auth0Client$: Observable<Auth0Client>;

    // Define observables for SDK methods that return promises by default
    // For each Auth0 SDK method, first ensure the client instance is ready
    // concatMap: Using the client instance, call SDK method; SDK returns a promise
    // from: Convert that resulting promise into an observable
    isAuthenticated$: Observable<boolean>;
    handleRedirectCallback$: any;// Observable<RedirectLoginResult<TAppState>>;//OperatorFunction<Auth0Client, RedirectLoginResult>;//ObservedValueOf<O> | R>;//Observable<RedirectLoginResult>;//Observable<string>;

    // Local property for login status
    loggedIn: boolean = null;

    // Create subject and public observable of user profile data
    private userProfileSubject$ = new BehaviorSubject<any>(null);
    userProfile$ = this.userProfileSubject$.asObservable();

    authErrors$ = new ReplaySubject<string>();

    constructor(
        private router: Router,
        private _envConfigSvc: EnvConfigurationInitService,
    )
    {
        this._envConfigSvc.gotConfig$.subscribe(
            ()=>
            {
                this.initClient();

                // On initial load, check authentication state with authorization server
                // Set up local auth streams if user is already authenticated
                this.localAuthSetup();
                // Handle redirect from Auth0 login
                let errStr = this.handleAuthCallback();
                if(errStr && errStr.length > 0)
                {
                    this.authErrors$.next(errStr);
                }
            }
        );
    }

    private initClient(): void
    {
        this.auth0Client$ = (from(
            createAuth0Client({
                domain: EnvConfigurationInitService.appConfig.auth0_domain,
                client_id: EnvConfigurationInitService.appConfig.auth0_client,
                redirect_uri: `${window.location.origin}/authenticate`,
                audience: EnvConfigurationInitService.appConfig.auth0_audience,
                scope: "",
                responseType: "token id_token",
                cacheLocation: this.getCacheLocation(),
                leeway: 120 // TODO: what should we set this to?
            })
        ) as Observable<Auth0Client>).pipe(
            shareReplay(1), // Every subscription receives the same shared value
            catchError(
                (err)=>
                {
                    if(err && err.error == "unauthorized")
                    {
                        let errStr = err.error;
                        if(err.error_description != undefined)
                        {
                            errStr = err.error_description;
                        }
    
                        this.authErrors$.next(errStr);
                        this.router.navigate(["/authenticate"]);
                        return;
                    }
                    console.error(err);
                    return throwError(err);
                }
            )
        );
    
        // Define observables for SDK methods that return promises by default
        // For each Auth0 SDK method, first ensure the client instance is ready
        // concatMap: Using the client instance, call SDK method; SDK returns a promise
        // from: Convert that resulting promise into an observable
        this.isAuthenticated$ = this.auth0Client$.pipe(
            concatMap((client: Auth0Client) => from(client.isAuthenticated())),
            tap(res => this.loggedIn = res)
        );

        this.handleRedirectCallback$ = this.auth0Client$.pipe(
            concatMap((client: Auth0Client) => from(client.handleRedirectCallback()))
        );
    }

    // When calling, options can be passed if desired
    // https://auth0.github.io/auth0-spa-js/classes/auth0client.html#getuser
    getUser$(options?): Observable<any>
    {
        return this.auth0Client$.pipe(
            concatMap((client: Auth0Client) => from(client.getUser(options))),
            tap(user => this.userProfileSubject$.next(user)),
            tap(user => this.setSentryUser(user))
        );
    }

    getIdTokenClaims$(): Observable<any>
    {
        return this.auth0Client$.pipe(
            concatMap((client: Auth0Client) => from(client.getIdTokenClaims()))
        );
    }

    getCacheLocation(): CacheLocation
    {
        if(window.hasOwnProperty("Cypress")) 
        {
            console.log("Cypress detected, setting localstorage");
            return "localstorage";
        }
        console.log("Cypress not detected, setting memory");
        return "memory";
    }

    getUserID(): string
    {
        let profile = this.userProfileSubject$.value;
        if(!profile)
        {
            return null;
        }

        let id = profile.sub;

        // Snip off the starting crap
        let pipePos = id.indexOf("|");
        if(pipePos >= 0)
        {
            id = id.slice(pipePos+1);
        }

        return id;
    }

    private setSentryUser(user): void
    {
        let profile = this.userProfileSubject$.value;
        if(!profile)
        {
            return;
        }

        Sentry.setUser({
            id: this.getUserID(),
            username: user.name,
            email: user.email
        });
    }

    private localAuthSetup()
    {
        // This should only be called on app initialization
        // Set up local authentication streams
        const checkAuth$ = this.isAuthenticated$.pipe(
            concatMap((loggedIn: boolean) => 
            {
                if(loggedIn)
                {
                    // If authenticated, get user and set in app
                    // NOTE: you could pass options here if needed
                    return this.getUser$();
                }
                // If not authenticated, return stream that emits 'false'
                return of(loggedIn);
            })
        );

        checkAuth$.subscribe();
    }

    login(redirectPath: string, signUp: boolean)
    {
        // We need to extract query params so they can be encoded in appState and reconstructed after login
        let queryParams = {};
        let [basePath, queryString] = redirectPath.split("?");
        if(queryString && queryString.length > 0) 
        {
            queryString.split("&").forEach((param) => 
            {
                let [queryParam, queryValue] = param.split("=");
                queryParams[queryParam] = queryValue;
            });
        }
        // A desired redirect path can be passed to login method
        // (e.g., from a route guard)
        // Ensure Auth0 client instance exists
        this.auth0Client$.subscribe((client: Auth0Client) => 
        {
            // Call method to log in and pass queryParams into appState for encoding
            let opts = {
                redirect_uri: `${window.location.origin}/authenticate`,
                appState: { target: basePath, queryParams: queryParams }
            };

            if(signUp)
            {
                opts["mode"] = "signUp";
            }

            client.loginWithRedirect(opts);
        });
    }

    private handleAuthCallback(): string
    {
        // Call when app reloads after user logs in with Auth0
        const queryString = window.location.search;
        
        // Pass original query params back to redirect URL
        let appQueryParams: Record<string, string> = {};

        if(queryString.includes("code=") && queryString.includes("state="))
        {
            //console.log('AUTH SERVICE: handleAuthCallback - found code & state');
            let targetRoute: string; // Path to redirect to after login processsed
            const authComplete$ = this.handleRedirectCallback$.pipe(
                // Have client, now call method to handle auth callback redirect
                tap(cbRes => 
                {
                    let appState = cbRes["appState"];//cbRes.appState;

                    // Get and set target redirect route from callback results
                    targetRoute = appState && appState.target ? appState.target : "/";
                    appQueryParams = appState.queryParams;
                }),
                concatMap(() => 
                {
                    // Redirect callback complete; get user and login status
                    return combineLatest([
                        this.getUser$(),
                        this.isAuthenticated$
                    ]);
                })
            );

            // Subscribe to authentication completion observable
            // Response will be an array of user and login status
            authComplete$.subscribe(([user, loggedIn]) =>
            {
                //console.log('AUTH SERVICE: handleAuthCallback - Navigate to: '+targetRoute);
                // Redirect to target route after callback processing
                this.router.navigate([targetRoute], { queryParams: appQueryParams });
            });

            return "";
        }

        // Otherwise maybe there was an error - return that!
        if(queryString.includes("error="))
        {
            let parsedParams = new URLSearchParams(queryString);
            let errorStr = parsedParams.get("error");

            if(queryString.includes("error_description="))
            {
                errorStr = parsedParams.get("error_description");
            }

            return errorStr;
        }

        return "";
    }

    logout()
    {
        // Ensure Auth0 client instance exists
        this.auth0Client$.subscribe((client: Auth0Client) => 
        {
            // Call method to log out
            client.logout({
                client_id: EnvConfigurationInitService.appConfig.auth0_client,
                returnTo: `${window.location.origin}`
            });
        });
    }

    getTokenSilently$(options?): Observable<string>
    {
        return this.auth0Client$.pipe(
            concatMap((client: Auth0Client) => from(client.getTokenSilently(options)))
        );
    }
}
