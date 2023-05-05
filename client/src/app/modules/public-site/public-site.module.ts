import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { CommonModule } from "@angular/common";

import { LandingPageComponent } from "./components/pages/landing-page/landing-page.component";
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


const APP_ROUTES: Routes = [
    { path: "public", component: PublicPageComponent,
        children: [
            { path: "pixlise", component: LandingPageComponent },
            { path: "workflow", component: WorkflowPageComponent },
            { path: "investigation", component: InvestigationPageComponent },
            { path: "quantification", component: QuantificationPageComponent },
        ]
    },
    { path: "", redirectTo: "public/pixlise", pathMatch: "full" },
    { path: "public", redirectTo: "public/pixlise", pathMatch: "full" },
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
        NavSectionSwitchComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES)
    ]
})
export class PublicSiteModule
{
}
