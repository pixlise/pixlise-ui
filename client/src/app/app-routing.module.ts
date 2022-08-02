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
import { Routes, RouterModule } from "@angular/router";

import { environment } from "src/environments/environment";

import { AboutComponent } from "./routes/about/about.component";
import { DatasetsComponent } from "./routes/datasets/datasets.component";
import { PageNotFoundComponent } from "./routes/page-not-found/page-not-found.component";
import { AuthenticateComponent } from "./routes/authenticate/authenticate.component";
import { DatasetComponent } from "./routes/dataset/dataset.component";
import { DatasetCustomisationComponent } from "./routes/dataset-customisation/dataset-customisation.component";

import { AnalysisComponent } from "./routes/dataset/analysis/analysis.component";
import { QuantificationsComponent } from "./routes/dataset/quantifications/quantifications.component";
import { MapBrowserComponent } from "./routes/dataset/map-browser/map-browser.component";
import { EngineeringComponent } from "./routes/dataset/engineering/engineering.component";
import { PiquantComponent } from "./routes/piquant/piquant.component";
import { PiquantConfigComponent } from "./routes/piquant/piquant-config/piquant-config.component";
import { PiquantVersionComponent } from "./routes/piquant/piquant-version/piquant-version.component";
import { PiquantDownloadsComponent } from "./routes/piquant/piquant-downloads/piquant-downloads.component";
import { AdminComponent } from "./routes/admin/admin.component";

//import { QuantResultListComponent } from './routes/dataset/quantifications/quant-result-list/quant-result-list.component';
import { QuantificationLogViewComponent } from "./routes/dataset/quantifications/quantification-log-view/quantification-log-view.component";
import { SelectedQuantificationViewComponent } from "./routes/dataset/quantifications/selected-quantification-view/selected-quantification-view.component";
import { UsersComponent } from "./routes/admin/users/users.component";
import { RolesComponent } from "./routes/admin/roles/roles.component";
import { TestUtilitiesComponent } from "./routes/admin/test-utilities/test-utilities.component";
import { GlobalNotificationsComponent } from "./routes/admin/global-notifications/global-notifications.component";

import { AuthenticatedGuard } from "./guards/authenticated.guard";


function getRoutes(): Routes
{
    let routes: Routes = [
        // Public pages
        { path: "authenticate", component: AuthenticateComponent },
        { path: "about", component: AboutComponent },

        { path: "", redirectTo: "/about", pathMatch: "full" },

        // Authenticated pages
        {
            path: "",
            canActivate: [AuthenticatedGuard],
            children: [
                { path: "datasets", component: DatasetsComponent },
                {
                    path: "dataset/:dataset_id",
                    component: DatasetComponent,
                    children: [
                        { path: "", redirectTo: "analysis", pathMatch: "full" },
                        { path: "analysis", component: AnalysisComponent },
                        { path: "maps", component: MapBrowserComponent },
                        {
                            path: "quant-logs",
                            component: QuantificationsComponent,
                            children: [
                                //{ path: '', component: QuantResultListComponent },
                                { path: ":job_id/log/:log_name", component: QuantificationLogViewComponent },
                                { path: ":job_id", component: SelectedQuantificationViewComponent },
                            ]
                        },
                    ]
                },
                { path: "dataset-edit/:dataset_id_for_edit", component: DatasetCustomisationComponent },
                {
                    path: "admin",
                    component: AdminComponent,
                    children: [
                        { path: "", redirectTo: "users", pathMatch: "full" },
                        { path: "users", component: UsersComponent },
                        { path: "roles", component: RolesComponent },
                        { path: "test-utils", component: TestUtilitiesComponent },
                        { path: "global-notifications", component: GlobalNotificationsComponent },
                        {
                            path: "quant-jobs",
                            component: QuantificationsComponent,
                            children: [
                                { path: ":job_id/log/:log_name", component: QuantificationLogViewComponent },
                                { path: ":job_id", component: SelectedQuantificationViewComponent },
                            ]
                        },
                    ]
                },
                {
                    path: "piquant",
                    component: PiquantComponent,
                    children: [
                        { path: "", redirectTo: "config", pathMatch: "full" },
                        { path: "config", component: PiquantConfigComponent },
                        { path: "version", component: PiquantVersionComponent },
                        { path: "downloads", component: PiquantDownloadsComponent },
                    ]
                },
            ]
        },

        { path: "**", component: PageNotFoundComponent }
    ];

    if(environment.engineeringTabEnabled)
    {
        routes[3].children.push({ path: "engineering", component: EngineeringComponent });
    }

    return routes;
}

@NgModule({
    imports: [
        RouterModule.forRoot(
            getRoutes(),
            { enableTracing: environment.route_dbg } // <-- debugging purposes only
        )
    ],
    exports: [RouterModule]
})
export class AppRoutingModule
{
}
