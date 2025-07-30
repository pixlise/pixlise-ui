import { APP_INITIALIZER, ErrorHandler, inject, NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from "@angular/core";
import { BrowserModule, Title } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { provideAnimations } from "@angular/platform-browser/animations";
import { HttpEvent, HttpRequest, provideHttpClient, withInterceptors, withInterceptorsFromDi } from "@angular/common/http";

import { AppRoutingModule } from "./app-routing-module";
import { AppComponent } from "./app.component";

import { PublicSiteModule } from "./modules/public-site/public-site.module";
import { HTTP_INTERCEPTORS, HttpBackend } from "@angular/common/http";
import { AppConfig, EnvConfigurationInitService } from "./services/env-configuration-init.service";
import { PIXLISECoreModule } from "./modules/pixlisecore/pixlisecore.module";

import * as Sentry from "@sentry/angular";
import { VERSION } from "src/environments/version";
import { MAT_DIALOG_DATA, MAT_DIALOG_DEFAULT_OPTIONS, MatDialogRef } from "@angular/material/dialog";
import { MaterialModule } from "./modules/material.module";
import { AuthModule, AuthClientConfig } from "@auth0/auth0-angular";
import { AnalysisModule } from "./modules/analysis/analysis.module";
import { NotFoundModule } from "./modules/not-found/not-found.module";
import { CodeEditorModule } from "./modules/code-editor/code-editor.module";
import { MapBrowserModule } from "./modules/map-browser/map-browser.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { FormsModule } from "@angular/forms";
import { ToolbarComponent } from "./components/toolbar/toolbar.component";
import { SettingsSidebarComponent } from "./components/settings-sidebar/settings-sidebar.component";
import { MarkdownModule } from "ngx-markdown";
import { CustomAuthHttpInterceptor } from "./services/custom-http-interceptor.service";
import { Observable } from "rxjs";
import { provideNgtRenderer } from "angular-three/dom";

const appInitializerFn = (configService: EnvConfigurationInitService, handler: HttpBackend, authConfig: AuthClientConfig) => {
  return () => {
    return configService.readAppConfig(handler, authConfig).then((config: AppConfig | null) => {
      // Init sentry now that we have the config
      if (config && config.sentry_dsn.length > 0) {
        Sentry.init({
          attachStacktrace: true,
          enabled: true,
          dsn: config.sentry_dsn,
          environment: config.name,
          // Added to stop all logs coming from instrument.js, see:
          // https://github.com/getsentry/sentry-react-native/issues/794
          // Updated for angular20 according to: https://docs.sentry.io/platforms/javascript/guides/angular/configuration/integrations/breadcrumbs/
          integrations: [
            Sentry.breadcrumbsIntegration({
              console: true,
              dom: true,
              fetch: true,
              history: true,
              xhr: true,
            }),
          ],
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          // The below came from: https://github.com/getsentry/sentry-javascript/issues/2292
          beforeSend(event, hint) {
            // Ignore errors that occur while the user is offline
            if (!navigator.onLine) {
              return null;
            }

            // Note: issue with double entries during http exceptions: https://github.com/getsentry/sentry-javascript/issues/2169
            // Note: issue with a second entry not being set correctly (as a non-error): https://github.com/getsentry/sentry-javascript/issues/2292#issuecomment-554932519
            const isNonErrorException = event?.exception?.values?.[0]?.value?.startsWith?.("Non-Error exception captured");
            if (isNonErrorException) {
              const serializedExtra: any = event?.extra?.["__serialized__"];
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
          beforeBreadcrumb(breadcrumb, hint) {
            if (hint && breadcrumb.category === "ui.click") {
              let target = undefined;
              if (hint["event"]) {
                target = hint["event"]["target"];
              }

              let ariaLabel = "";
              const descriptors = [];
              let parentsVisited = 0;

              // Loop up the chain of parents until we find either an arialabel. We record inner text along the way
              while (target && parentsVisited < 10) {
                if (target.ariaLabel) {
                  // We put aria-label on some HTML elements that are key to identifying what the interaction is
                  ariaLabel = target.ariaLabel;
                  break;
                }

                // Otherwise, look at the node name. If it contains something recognised, save it
                if (target.localName && (target.localName == "a" || target.localName.indexOf("button") > -1)) {
                  // Collect inner text, to try to identify the button
                  descriptors.push(target.localName);
                  if (target.innerText) {
                    descriptors.push(`"${target.innerText}"`);
                  }
                }

                if (target.localName.indexOf("panel") > -1 || (target.localName.indexOf("dialog") > -1 && target.localName != "mat-dialog-container")) {
                  descriptors.unshift(target.localName);
                }

                if (target.localName == "input") {
                  descriptors.push(target.localName);
                  if (target?.placeholder?.length > 0) {
                    descriptors.push(`"${target.placeholder}"`);
                  }
                  if (target?.accept?.length > 0) {
                    descriptors.push(`"${target.accept}"`);
                  }
                }

                if (target?.attributes["mattooltip"]?.nodeValue && target.attributes["mattooltip"].nodeValue.length > 0) {
                  descriptors.push(`"${target.attributes["mattooltip"].nodeValue}"`);
                }
                if (target?.attributes["ng-reflect-message"]?.nodeValue && target.attributes["ng-reflect-message"].nodeValue.length > 0) {
                  descriptors.push(`"${target.attributes["ng-reflect-message"].nodeValue}"`);
                }
                if (target?.title?.length > 0) {
                  descriptors.push(`"${target.title}"`);
                }

                target = target.parentNode;
                parentsVisited++;
              }

              if (ariaLabel.length > 0 || descriptors.length > 0) {
                breadcrumb.message = ariaLabel + "[" + descriptors.join(",") + "], origmsg=" + breadcrumb.message;
              }
            }
            //console.log("BREADCRUMB: " + breadcrumb.message);
            return breadcrumb;
          },
        });

        const version = (VERSION as any)["raw"];
        console.log("Sentry Initialised, adding version tag: " + version);
        Sentry.setTag("pixlise_version", version);
      } else {
        console.log("No Sentry DNS, Sentry error reporting disabled");
      }
    });
  };
};

// Wrote our own authHttpInterceptorFn based on:
// https://github.com/auth0/auth0-angular/blob/6ac4ab1/projects/auth0-angular/src/lib/functional.ts#L32
// Where we inject our own customised version of auth0's AuthHttpInterceptor
export const authHttpInterceptorCustomFn = (
  req: HttpRequest<any>,
  handle: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>
) => inject(CustomAuthHttpInterceptor).intercept(req, { handle });

@NgModule({
  declarations: [AppComponent],
  imports: [
    PIXLISECoreModule,
    ToolbarComponent,
    SettingsSidebarComponent,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MarkdownModule.forRoot(),
    AppRoutingModule,
    MaterialModule,
    PublicSiteModule,
    AnalysisModule,
    NotFoundModule,
    CodeEditorModule,
    MapBrowserModule,
    SettingsModule,
    AuthModule.forRoot(),
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideNgtRenderer(),
   // provideHttpClient(withInterceptorsFromDi()),
   provideHttpClient(withInterceptors([authHttpInterceptorCustomFn])),
    /* We used to define our own HttpInterceptorService but switched to use Auth0's built in one. The "extra" things ours did were:
        - Show snack saying "You are not online" if !window.navigator.onLine
        - If getAccessTokenSilently() returned an error that contains "Login required": snackService.openError(
                "Auto-login failed, please use Chrome without ad blocking",
                "Maybe your browser/ad-blocker is preventing PIXLISE from logging in")
        - If getAccessTokenSilently() returned another error, just show the error text in the snack
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true,
    },*/

    // The below is the Auth0 interceptor, but we have to wrap it in our own to allow "magic link" login to work
    { provide: HTTP_INTERCEPTORS, useClass: CustomAuthHttpInterceptor, multi: true },
    CustomAuthHttpInterceptor,
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
      useValue: { hasBackdrop: true },
    },
    {
      provide: MAT_DIALOG_DATA,
      useValue: {},
    },
    {
      provide: MatDialogRef,
      useValue: {},
    },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: false, // Decided to turn off the dialog because we got it for situations
        // that didnt require it. Expecting our snack service to inform users
        // when needed
      }),
    },
  ],
  bootstrap: [AppComponent],
  exports: [ToolbarComponent],
})
export class AppModule {}
