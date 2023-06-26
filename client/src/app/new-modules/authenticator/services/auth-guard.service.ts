import { Injectable, inject } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, CanActivateFn } from "@angular/router";
import { Observable } from "rxjs";

import { AuthService } from '@auth0/auth0-angular';


// CanActivate was deprecated since old code written, following this:
// https://stackoverflow.com/questions/75564717/angular-canactivate-is-deprecated-how-to-replace-it

@Injectable({
    providedIn: 'root'
})
export class AuthGuardService
{
    constructor(
        private _authService: AuthService,
        private router: Router
        )
    {
    }
  
    canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean>
    {
        return this._authService.isAuthenticated$;
    }
}
