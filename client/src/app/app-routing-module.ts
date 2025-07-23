
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
