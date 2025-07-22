import { AuthGuard } from "@auth0/auth0-angular";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router } from "@angular/router";
import { map, Observable } from "rxjs";

import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";


@Injectable({
  providedIn: "root",
})
export class CustomAuthGuard extends AuthGuard {
  constructor(
    auth: AuthService,
    public router: Router
  ) {
    super(auth);
  }

  override canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    return super.canActivate(route, this.router.routerState.snapshot).pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          const reviewerToken = sessionStorage.getItem("reviewer_access_token");
          if (reviewerToken) {
            // If a reviewer token is present and has the correct permissions, allow access to the route
            if (this.checkUserPermissions(reviewerToken)) {
              return true;
            }
          }
        }

        // Default to isAuthenticated
        return isAuthenticated;
      })
    );
  }

  private checkUserPermissions(token: string | null): boolean {
    if (!token) {
      return false;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));

    const currentTime = Math.floor(new Date().getTime() / 1000);
    if (payload.exp <= currentTime) {
      return false;
    }

    // Make sure it's a semi-well-formed token
    return payload?.["permissions"]?.includes("read:data-analysis") || false;
  }
}
