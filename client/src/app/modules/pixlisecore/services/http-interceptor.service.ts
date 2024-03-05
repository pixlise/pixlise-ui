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
            "Maybe your browser/ad-blocker is preventing PIXLISE to auto-login",
            "",
            600000 // 10 minute rate limit
          );
        } else {
          this._snackService.openError(err);
        }
        return throwError(() => new Error(err));
      })
    );
  }
}
