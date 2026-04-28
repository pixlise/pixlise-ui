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
import { take, firstValueFrom, BehaviorSubject } from "rxjs";
import { AuthClientConfig, AuthConfig } from "@auth0/auth0-angular";

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

  expectedDataCollectionAgreementVersion: string = ""; // Eg "1.0"

  unassignedNewUserRoleId: string = ""; // Auth0 role ID for unassigned new user

  maxUsersPerOwnershipItem: number = 5; // Max number of users that can be assigned as an editor or user for an ownership item

  hidePIXLDevices: boolean = false; // Show PIXL-EM, JPL and Stonybrook breadboard as import option formats

  // Public site settings
  publicSiteConfig: PublicSiteConfig = {
    imagePrefix: "",
    aboutTopSection: "pixl",
    landingTopText: "",
    appLogo: "pixlise-white-logo.svg",
    landingTopLogos: [
      { "image": "logo_nasa_trio_colour.png", "link": "https://www.jpl.nasa.gov" }
    ],
    headingParts: ["Finally, a tool as ", "smart", " as the modern geoscientist."],
    computeParts: [
      "PIQUANT is a ",
      "fundamental parameters",
      "-based quantification engine, optimized for ",
      "cloud parallelization",
      ", yielding accurate quantification of ",
      "thousands of scan points in minutes",
      ". Craft compound quantifications with different element sets or matrix assumptions for ",
      "multiple regions",
      " of a single dataset. Rapidly visualize fully ",
      "quantified maps",
      " of every element in your quantification. And don't forget to ",
      "share",
      " them all with your lab."
    ],
    workflowDetailParts: [
      "PIXLISE is an interface informed by ",
      "thousands of hours of collaboration",
      " between geoscientists and visualization designers. With intricately-connected features, ",
      "colorblind-safe palettes",
      ", and customizable plot panels, PIXLISE's ",
      "flexible user interface",
      " empowers the modern scientist with an ",
      "innovative workflow"
    ],
    showPIQUANT: true,
    showImageCredits: true,
    showTeam: true,
    showPartners: true,
    showImpact: false,
    footerTagline: "Experience the future of spectroscopy visualisation and analysis.",
    footerTaglineLink: "",
    clientNameForVersion: "",
    joinSectionName: "discussion",
    joinSectionDescription: "As a geoscientist, you can request an account that will give you access to more PIXLISE features, as well as a global community of researchers. We want to hear from you!",
    menus: {
      "Features": {
        link: "/public/get-started",
        items: {
          "Workflow": "/public/workflow",
          "Quantification": "/public/quantification",
          "Investigation": "/public/investigation"
        }
      },
      "Get Started": {
        link: "",
        items: {
          "PIXLISE Options": "/public/get-started#top",
          "Get PIXLISE": "/public/get-started#get",
          "Links and Docs": "/public/get-started#links"
        }
      },
      "About Us": {
        link: "/public/about-us",
        items: {
          "PIXL + MARS 2020": "/public/about-us#mars2020",
          "Impact": "/public/about-us#impact",
          "Our Team": "/public/about-us#team"
        }
      }
    }
  };
}

// To control the public site and allow white-labelling

export type PublicSiteMenu = {
  link: string;
  items: Record<string, string>;
};

export type ImageLink = {
  link: string;
  image: string;
};

export type PublicSiteConfig = {
  imagePrefix: string;
  aboutTopSection: string;
  landingTopText: string;
  landingTopLogos: ImageLink[];
  appLogo: string;
  headingParts: string[];
  computeParts: string[];
  workflowDetailParts: string[];
  showPIQUANT: boolean;
  showImageCredits: boolean;
  showTeam: boolean;
  showPartners: boolean;
  showImpact: boolean;
  footerTagline: string;
  footerTaglineLink: string;
  clientNameForVersion: string;
  joinSectionName: string;
  joinSectionDescription: string;
  menus: Record<string, PublicSiteMenu>;
};

@Injectable({
  providedIn: "root",
})
export class EnvConfigurationInitService {
  // This is static because some code will want to reference this without having
  // an instance of the env service. Reasons are historical, because this used to
  // simply be fields from the environment file, so code could always reach out
  // and say environment.something
  // Since the app config is loaded on module init, the config should always be
  // valid by the time it's accessed... should...
  static getConfig$: BehaviorSubject<AppConfig | null> = new BehaviorSubject<AppConfig | null>(null);

  private static readonly defaultPublicSiteConfig = {
      "imagePrefix": "",
      "aboutTopSection": "pixl",
      "landingTopText": "PIXLISE is a geoscience visualization and analysis tool compatible with micro-XRF and reflectance spectroscopy instruments. Redefine your data quantification and investigative workflow with a comprehensive suite of tools validated by thousands of hours of close partnership-testing with NASA scientists.",
      "appLogo": "pixlise-white-logo.svg",
      "landingTopLogos": [
          { "image": "logo_nasa_trio_colour.png", "link": "https://www.jpl.nasa.gov" }
      ],
      "headingParts": ["Finally, a tool as ", "smart", " as the modern geoscientist."],
      "computeParts": [
          "PIQUANT is a ",
          "fundamental parameters",
          "-based quantification engine, optimized for ",
          "cloud parallelization",
          ", yielding accurate quantification of ",
          "thousands of scan points in minutes",
          ". Craft compound quantifications with different element sets or matrix assumptions for ",
          "multiple regions",
          " of a single dataset. Rapidly visualize fully ",
          "quantified maps",
          " of every element in your quantification. And don't forget to ",
          "share",
          " them all with your lab."
      ],
      "workflowDetailParts": [
          "PIXLISE is an interface informed by ",
          "thousands of hours of collaboration",
          " between geoscientists and visualization designers. With intricately-connected features, ",
          "colorblind-safe palettes",
          ", and customizable plot panels, PIXLISE's ",
          "flexible user interface",
          " empowers the modern scientist with an ",
          "innovative workflow",
          "."
      ],
      "showPIQUANT": true,
      "showImageCredits": true,
      "showTeam": true,
      "showPartners": true,
      "showImpact": false,
      "footerTagline": "Experience the future of spectroscopy visualisation and analysis.",
      "footerTaglineLink": "",
      "clientNameForVersion": "PIXLISE",
      "joinSectionName": "discussion",
      "joinSectionDescription": "As a geoscientist, you can request an account that will give you access to more PIXLISE features, as well as a global community of researchers. We want to hear from you!",
      "menus": {
          "Features": {
              "link": "/public/get-started",
              "items": {
                  "Workflow": "/public/workflow",
                  "Quantification": "/public/quantification",
                  "Investigation": "/public/investigation"
              }
          },
          "Get Started": {
              "link": "",
              "items": {
                  "PIXLISE Options": "/public/get-started#top",
                  "Get PIXLISE": "/public/get-started#get",
                  "Links and Docs": "/public/get-started#links"
              }
          },
          "About Us": {
              "link": "/public/about-us",
              "items": {
                  "PIXL + MARS 2020": "/public/about-us#mars2020",
                  "Impact": "/public/about-us#impact",
                  "Our Team": "/public/about-us#team"
              }
          }
      }
  };

  readAppConfig(handler: HttpBackend, authConfig?: AuthClientConfig): Promise<AppConfig | null> {
    const request$ = new HttpClient(handler).get<AppConfig>(`./${environment.configName}`).pipe(take(1));
    return firstValueFrom(request$)
      .then(
        config => {
          if (!config) {
            console.error("Failed to load application config");
            return null;
          }

          // Set the API URL in the paths helper (static var)
          if (config?.apiUrl) {
            APIPaths.setAPIUrl(config.apiUrl);
          }

          if (authConfig) {
            const authCfg: AuthConfig = {
              domain: config.auth0_domain,
              clientId: config.auth0_client,
              cacheLocation: "localstorage", // https://auth0.com/docs/libraries/auth0-single-page-app-sdk#use-rotating-refresh-tokens
              useRefreshTokens: true, // https://auth0.com/docs/libraries/auth0-single-page-app-sdk#use-rotating-refresh-tokens
              authorizationParams: {
                audience: config.auth0_audience,
                redirect_uri: `${window.location.origin}/authenticate`,
              },
              errorPath: "/authenticate",
              httpInterceptor: {
                // We don't want to attach auth tokens to these:
                // "./", "/version-binary", "/version-json", "/agreement-version.json"
                // That's what our http interceptor used to do. But with auth0's implementation
                // we have to specify which requests to attach to, so:
                allowedList: [
                  APIPaths.getWithHost(APIPaths.api_websocket),
                  APIPaths.getWithHost(APIPaths.api_scan),
                  APIPaths.getWithHost(APIPaths.api_images),
                  APIPaths.getWithHost(APIPaths.api_images + "/*"),
                  APIPaths.getWithHost(APIPaths.api_memoise),
                ],
              },
              //skipRedirectCallback: true,
            };

            authConfig.set(authCfg);
          }

          // We want a default here as this file is now fixed in the UI repo
          if (config && !config?.dataCollectionAgreementVersionUrl) {
            config.dataCollectionAgreementVersionUrl = "/agreement-version.json";
          }

          // For now, while we're still using the "old" deployment methods for prod/dev, we check if the
          // public site config has been set, and if not we substitute one here
          if (!config.publicSiteConfig) {
            config.publicSiteConfig = EnvConfigurationInitService.defaultPublicSiteConfig;
          }

          EnvConfigurationInitService.getConfig$.next(config);
          console.log("Loaded application config...");

          return config;
        } /*,
                (err)=>
                {
                    console.error("Failed to load application config: "+err);
                }*/
      )
      .catch(err => {
        console.error("Failed to load application config: ", err);
        return null;
      });
  }
}
