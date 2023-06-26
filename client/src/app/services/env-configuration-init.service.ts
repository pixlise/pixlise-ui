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

import { HttpBackend, HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { APIPaths } from "src/app/utils/api-helpers";
import { environment } from "src/environments/environment";
import { ReplaySubject, take, firstValueFrom } from "rxjs";
import { AuthClientConfig } from "@auth0/auth0-angular";

// App config is retrieved from a json file that is injected into the built container. We ONLY use the
// environment.ts config file to find the name of the config file to load. This is so we can
// do local testing, whereas in production it uses a different name.
// This solution follows the example here:
// https://indepth.dev/posts/1338/build-your-angular-app-once-deploy-anywhere

export class AppConfig {
  production: boolean = false;
  route_dbg: boolean = false;
  name: string = "";

  auth0_domain: string = "";
  auth0_client: string = "";
  // auth0_secret <-- not needed! Client should never have this
  auth0_audience: string = "";
  auth0_namespace: string = "";

  sentry_dsn: string = "";

  appDomain: string = ""; // Sometimes forms discuss.pixlise.org, or www.pixlise.org
  apiUrl: string = ""; // For running API locally. Must end in /

  alertPollInterval_ms: number = 10000;
  versionPollInterval_ms: number = 300000;
  versionPollUrl: string = "";
  dataCollectionAgreementVersionUrl: string = "";

  allowDifferentMapSizesInExpressions: boolean = true;

  expectedDataCollectionAgreementVersion: string = ""; // Eg "1.0"

  unassignedNewUserRoleId: string = ""; // Auth0 role ID for unassigned new user
}

@Injectable({
  providedIn: "root",
})
export class EnvConfigurationInitService {
  private static _appConfig?: AppConfig;
  private _gotConfig$: ReplaySubject<void> = new ReplaySubject<void>();

  constructor() { }

  readAppConfig(handler: HttpBackend, authConfig?: AuthClientConfig): Promise<AppConfig | null> {
    const request$ = new HttpClient(handler).get<AppConfig>(`./${environment.configName}`).pipe(take(1));
    return firstValueFrom(request$).then(
      (config) => {
        if (!config) {
          console.error("Failed to load application config");
          return null;
        }

        if (authConfig) {
          authConfig.set({
            domain: config.auth0_domain,
            clientId: config.auth0_client,
            authorizationParams: {
              audience: config.auth0_audience,
              redirect_uri: `${window.location.origin}/authenticate`,
            }
          });
        }

        EnvConfigurationInitService._appConfig = config;

        // We want a default here as this file is now fixed in the UI repo
        if (config && !config?.dataCollectionAgreementVersionUrl) {
          config.dataCollectionAgreementVersionUrl =
            "/agreement-version.json";
        }
        this._gotConfig$.next();
        console.log("Loaded application config...");

        // Set the API URL in the paths helper (static var)
        if (config?.apiUrl) {
          APIPaths.setAPIUrl(config.apiUrl);
        }

        return config;
      } /*,
                (err)=>
                {
                    console.error("Failed to load application config: "+err);
                }*/
    ).catch(err => {
      console.error("Failed to load application config: ", err);
      return null;
    });
  }

  // This is static because some code will want to reference this without having
  // an instance of the env service. Reasons are historical, because this used to
  // simply be fields from the environment file, so code could always reach out
  // and say environment.something
  // Since the app config is loaded on module init, the config should always be
  // valid by the time it's accessed... should...
  public static get appConfig(): AppConfig {
    return EnvConfigurationInitService._appConfig!;
  }

  get gotConfig$(): ReplaySubject<void> {
    return this._gotConfig$;
  }
}
