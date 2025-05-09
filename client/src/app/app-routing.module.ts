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

import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { PublicSiteModule } from "./modules/public-site/public-site.module";
import { AuthenticateComponent } from "./modules/pixlisecore/components/pages/authenticate/authenticate.component";
import { environment } from "src/environments/environment";
import { MagicLinkComponent } from "./modules/pixlisecore/components/pages/magiclink/magiclink.component";
import { CustomAuthGuard } from "./services/custom-auth-guard.service";

const APP_ROUTES: Routes = [
  // Public pages
  { path: "authenticate", component: AuthenticateComponent },
  { path: "magiclink", component: MagicLinkComponent },
  {
    path: "",
    loadChildren: () => import("./modules/public-site/public-site.module").then(m => m.PublicSiteModule),
  },

  // Redirect the old about page here, lots of browsers are likely to have this saved/bookmarked
  { path: "about", redirectTo: "public/about-us", pathMatch: "full" },

  // Authenticated pages
  {
    path: "",
    canActivate: [CustomAuthGuard],
    children: [
      {
        path: "datasets",
        loadChildren: () => import("./modules/datasets/datasets.module").then(m => m.DatasetsModule),
      },
      {
        path: "import",
        loadChildren: () => import("./modules/import/import.module").then(m => m.ImportModule),
      },
    ],
  },
  {
    path: "",
    canActivate: [CustomAuthGuard],
    children: [
      {
        path: "settings",
        loadChildren: () => import("./modules/settings/settings.module").then(m => m.SettingsModule),
      },
    ],
  },
  {
    path: "**",
    loadChildren: () => import("./modules/not-found/not-found.module").then(m => m.NotFoundModule),
  },
];

@NgModule({
  imports: [
    PublicSiteModule,
    RouterModule.forRoot(APP_ROUTES, {
      enableTracing: environment.route_dbg, // <-- debugging purposes only
      anchorScrolling: "enabled",
      scrollPositionRestoration: "enabled",
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
