import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpRequest } from "@angular/common/http";

import { Observable, throwError } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";

import { AuthService } from "@auth0/auth0-angular";
import { APIPaths } from "src/app/utils/api-helpers";
import { SnackbarService } from "./snackbar.service";

@Injectable({
  providedIn: "root",
})
export class HttpInterceptorService {
  constructor(
    private _authService: AuthService,
    private _snackService: SnackbarService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // If the browser online is false, show the warning dialog straight away
    if (!window.navigator.onLine) {
      console.error("Browser marked as not onLine");
      this._snackService.openWarning("You are not online!");
    }

    // If it's a request to:
    // - Something starting with ./
    // - NOT a request to our API
    // Then we don't inject anything into the request!
    if (
      req.url.startsWith("./") ||
      req.url.endsWith("/version-binary") ||
      req.url.endsWith("/version-json") ||
      req.url.endsWith("/agreement-version.json") ||
      !req.url.startsWith(APIPaths.apiURL) ||
      !this._authService.isAuthenticated$
    ) {
      return next.handle(req);
    }

    // Otherwise, we do:
    return this._authService.getAccessTokenSilently().pipe(
      mergeMap(token => {
        const tokenReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });

        return next.handle(tokenReq);
      }),
      catchError(err => {
        const errorStr = `${err}`;
        if (errorStr.indexOf("Login required") >= 0) {
          this._snackService.openError(
            "Auto-login failed, please use Chrome without ad blocking",
            "Maybe your browser/ad-blocker is preventing PIXLISE from logging in",
            "",
            600000 // 10 minute rate limit
          );
        } else {
          // When the connection goes down, or we fail to reconnect, we get spammed here by:
          // {
          //  message: "Http failure response for http://localhost:8080/ws-connect: 0 Unknown Error"
          //  ok: false,
          //  name: "HttpErrorResponse"
          //  status: 0,
          //  statusText: "Unknown Error"
          // }
          // We don't want to spam the user with these, because we've most likely already shown a disconnection error (see APICommService closeObserver)
          // so we filter these out. Other errors may be of interest, or we may have to add more exclusion clauses here...
          if (err?.status !== 0) {
            this._snackService.openError(err);
          }
        }
        return throwError(() => {
          return err;
        });
      })
    );
  }
}
