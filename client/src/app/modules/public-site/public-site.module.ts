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
import { CommonModule } from "@angular/common";

import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { LandingPageComponent, LandingRouteName } from "./components/pages/landing-page/landing-page.component";
import { WorkflowPageComponent } from "./components/pages/workflow-page/workflow-page.component";
import { QuantificationPageComponent } from "./components/pages/quantification-page/quantification-page.component";
import { InvestigationPageComponent } from "./components/pages/investigation-page/investigation-page.component";
import { PublicPageComponent } from "./components/pages/public-page/public-page.component";

import { SectionImageListTextComponent } from "./components/layouts/section-image-list-text/section-image-list-text.component";
import { SectionImageTilesTextComponent } from "./components/layouts/section-image-tiles-text/section-image-tiles-text.component";

import { FooterComponent } from "./components/atoms/footer/footer.component";
import { BrandingComponent } from "./components/atoms/branding/branding.component";
import { JoinTheCommunityComponent } from "./components/atoms/join-the-community/join-the-community.component";
import { NumberButtonComponent } from "./components/atoms/number-button/number-button.component";
import { ButtonNavDownComponent } from "./components/atoms/button-nav-down/button-nav-down.component";
import { QuoteViewerComponent } from "./components/atoms/quote-viewer/quote-viewer.component";
import { TextWithHighlightsComponent } from "./components/atoms/text-with-highlights/text-with-highlights.component";
import { NavTopMenuComponent } from "./components/atoms/nav-top-menu/nav-top-menu.component";
import { NavSectionSwitchComponent } from "./components/atoms/nav-section-switch/nav-section-switch.component";
import { AboutUsPageComponent, AboutUsRouteName } from "./components/pages/about-us-page/about-us-page.component";
import { GetPIXLISEComponent } from "./components/pages/get-pixlise/get-pixlise.component";
import { NavMenuComponent } from "./components/atoms/nav-top-menu/nav-menu/nav-menu.component";
import { VersionDisplayComponent } from "./components/atoms/version-display/version-display.component";
import { TeamListComponent } from "./components/atoms/team-list/team-list.component";

const APP_ROUTES: Routes = [
  {
    path: "public",
    component: PublicPageComponent,
    children: [
      { path: "", redirectTo: LandingRouteName, pathMatch: "full" },
      { path: LandingRouteName, component: LandingPageComponent },
      { path: "workflow", component: WorkflowPageComponent },
      { path: "investigation", component: InvestigationPageComponent },
      { path: "quantification", component: QuantificationPageComponent },
      { path: AboutUsRouteName, component: AboutUsPageComponent },
      { path: "get-started", component: GetPIXLISEComponent },
    ],
  },
  { path: "", redirectTo: "public/pixlise", pathMatch: "full" },
];

@NgModule({
  declarations: [
    LandingPageComponent,
    WorkflowPageComponent,
    QuantificationPageComponent,
    InvestigationPageComponent,
    PublicPageComponent,
    FooterComponent,
    NumberButtonComponent,
    BrandingComponent,
    JoinTheCommunityComponent,
    SectionImageListTextComponent,
    ButtonNavDownComponent,
    QuoteViewerComponent,
    TextWithHighlightsComponent,
    SectionImageTilesTextComponent,
    NavTopMenuComponent,
    NavSectionSwitchComponent,
    AboutUsPageComponent,
    GetPIXLISEComponent,
    NavMenuComponent,
    VersionDisplayComponent,
    TeamListComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES)],
})
export class PublicSiteModule {}
