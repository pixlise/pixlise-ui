import { Injectable } from "@angular/core";
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from "@angular/common/http";

import { Observable, throwError } from "rxjs";
import { catchError, mergeMap, tap } from "rxjs/operators";

import { AuthService } from "@auth0/auth0-angular";
import { environment } from "src/environments/environment";
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
      /*if(!this._commsErrorDlg)
            {
                this._commsErrorDlg = this.showNoInternetDialog("You are not online!");
            }*/
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
        if (err.message === "Login required") {
          this._snackService.openError(err);
        }
        return throwError(() => new Error(err));
      })
    );
  }
}
