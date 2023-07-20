import { APP_INITIALIZER, ErrorHandler, Injectable, NgModule } from "@angular/core";
import { BrowserModule, Title } from "@angular/platform-browser";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

import { PublicSiteModule } from "./modules/public-site/public-site.module";
import { HTTP_INTERCEPTORS, HttpBackend, HttpClientModule, HttpErrorResponse } from "@angular/common/http";
import { AppConfig, EnvConfigurationInitService } from "./services/env-configuration-init.service";
import { HttpInterceptorService } from "./services/http-interceptor.service";

import * as Sentry from "@sentry/angular-ivy";
import { VERSION } from "src/environments/version";
import { SentryHelper } from "src/app/utils/utils";
import { MAT_DIALOG_DATA, MAT_DIALOG_DEFAULT_OPTIONS, MatDialogRef } from "@angular/material/dialog";
import { MaterialModule } from "./modules/material.module";
import { AuthModule, AuthClientConfig } from '@auth0/auth0-angular';
import { AnalysisModule } from "./modules/analysis/analysis.module";
import { NotFoundModule } from "./modules/not-found/not-found.module";
import { CodeEditorModule } from "./modules/code-editor/code-editor.module";
import { MapBrowserModule } from "./modules/map-browser/map-browser.module";
import { QuantificationsModule } from "./modules/quantifications/quantifications.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { FormsModule } from "@angular/forms";
import { ToolbarComponent } from "./components/toolbar/toolbar.component";
import { SettingsSidebarComponent } from './components/settings-sidebar/settings-sidebar.component';

const appInitializerFn = (configService: EnvConfigurationInitService, handler: HttpBackend, authConfig: AuthClientConfig) => {
  return () => {
    return configService.readAppConfig(handler, authConfig).then((config: AppConfig | null) => {
      // Init sentry now that we have the config
      if (config && config.sentry_dsn.length > 0) {
        Sentry.init({
          dsn: config.sentry_dsn,
          environment: config.name,
          // Added to stop all logs coming from instrument.js, see:
          // https://github.com/getsentry/sentry-react-native/issues/794
          integrations: [
            new Sentry.Integrations.Breadcrumbs({
              console: false
            }),
            new Sentry.Replay(),
          ],
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          // The below came from: https://github.com/getsentry/sentry-javascript/issues/2292
          beforeSend(event, hint) {
            // Note: issue with double entries during http exceptions: https://github.com/getsentry/sentry-javascript/issues/2169
            // Note: issue with a second entry not being set correctly (as a non-error): https://github.com/getsentry/sentry-javascript/issues/2292#issuecomment-554932519
            const isNonErrorException = event?.exception?.values?.[0]?.value?.startsWith?.("Non-Error exception captured");
            if (isNonErrorException) {

              let serializedExtra: any = event?.extra?.["__serialized__"];
              if (!serializedExtra) {
                return null;
              }
              let realErrMsg = serializedExtra?.["error"] ? serializedExtra?.["error"].message : null;
              realErrMsg = realErrMsg || serializedExtra?.["message"];
              // this is a useless error message that masks the actual error.  Lets try to set it properly
              if (event?.exception?.values?.[0]) {
                event.exception.values[0].value = realErrMsg;
              }
              event.message = realErrMsg;
            }
            return event;
          },
        });

        const version = (VERSION as any)["raw"];
        console.log("Sentry Initialised, adding version tag: " + version);
        Sentry.setTag("version", version);
      }
      else {
        console.log("No Sentry DNS, Sentry error reporting disabled");
      }
    });
  };
};


@NgModule({
  declarations: [AppComponent],
  imports: [
    ToolbarComponent,
    SettingsSidebarComponent,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    MaterialModule,
    PublicSiteModule,
    AnalysisModule,
    NotFoundModule,
    CodeEditorModule,
    MapBrowserModule,
    QuantificationsModule,
    AdminModule,
    SettingsModule,
    AuthModule.forRoot()
  ],
  providers: [
    EnvConfigurationInitService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFn,
      deps: [EnvConfigurationInitService, HttpBackend, AuthClientConfig],
      multi: true,
    },
    Title,
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { hasBackdrop: true }
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true
    },
    {
      provide: MAT_DIALOG_DATA,
      useValue: {}
    },
    {
      provide: MatDialogRef,
      useValue: {}
    },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: true,
      }),
    }
  ],
  bootstrap: [AppComponent],
  exports: [ToolbarComponent]
})
export class AppModule { }
