import { Injectable } from "@angular/core";
import { AuthService, GetTokenSilentlyOptions, AppState, RedirectLoginOptions } from "@auth0/auth0-angular";
import { Observable, of } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CustomAuthService extends AuthService {
  override getAccessTokenSilently(options?: GetTokenSilentlyOptions): Observable<string>;
  override getAccessTokenSilently(options: GetTokenSilentlyOptions & { detailedResponse: true }): Observable<any>;
  override getAccessTokenSilently(options?: GetTokenSilentlyOptions & { detailedResponse?: boolean }): Observable<string | any> {
    const reviewerToken = sessionStorage.getItem("reviewer_access_token");
    if (reviewerToken) {
      const isValid = this.isTokenValid(reviewerToken);
      if (isValid) {
        if (options?.detailedResponse) {
          return of({
            access_token: reviewerToken,
            id_token: sessionStorage.getItem("reviewer_id_token") || "",
            expires_in: this.getTokenExpiration(reviewerToken),
            scope: options?.authorizationParams?.scope || "",
          });
        }
        return of(reviewerToken);
      }
    }

    // Fallback to the default implementation
    return super.getAccessTokenSilently(options);
  }

  override loginWithRedirect(options?: RedirectLoginOptions<AppState> | undefined): Observable<void> {
    // If reviewerToken is present and valid, just return and dont redirect
    const reviewerToken = sessionStorage.getItem("reviewer_access_token");
    if (reviewerToken) {
      const isValid = this.isTokenValid(reviewerToken);
      if (isValid) {
        // decode reviewer token and override user$ and isAuthenticated$ observables
        const payload = JSON.parse(atob(reviewerToken.split(".")[1]));
        (this as any).user$ = of(payload);
        (this as any).isAuthenticated$ = of(true);
        (this as any).appState$ = of(options?.appState || {});

        return of();
      }
    }

    // Fallback to the default implementation
    return super.loginWithRedirect(options);
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(new Date().getTime() / 1000);
      return payload.exp > currentTime;
    } catch (e) {
      console.error("Invalid token format:", e);
      return false;
    }
  }

  private getTokenExpiration(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp - Math.floor(new Date().getTime() / 1000);
    } catch (e) {
      console.error("Invalid token format for expiration:", e);
      return 0;
    }
  }
}
