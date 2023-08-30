import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpRequest } from "@angular/common/http";

import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { AuthService } from "@auth0/auth0-angular";
import { APIPaths } from "../utils/api-helpers";

@Injectable({
  providedIn: "root",
})
export class HttpInterceptorService {
  constructor(private _authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!window.navigator.onLine) {
      console.error("Browser marked as not online");
    }

    // If it's a request to:
    // - Something starting with ./
    // - NOT a request to our API
    // Then we don't inject anything into the request!
    // NOTE: this is bypassed for the appConfig request as this has to load before Auth0 is dynamically configured
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
      })
    );
  }
}
