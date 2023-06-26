import { Component } from '@angular/core';

// Import the AuthService type from the SDK
import { AuthService } from '@auth0/auth0-angular';


@Component({
    selector: 'app-auth-result-page',
    templateUrl: './auth-result-page.component.html',
    styleUrls: ['./auth-result-page.component.scss']
})
export class AuthResultPageComponent
{
    constructor(private _authService: AuthService)
    {
        /*
        this._authService.appState$.subscribe((appState) => {
            console.log(appState);
            this._authService.appState$.
        });*/

        //this._authService.logout();
        /*
        this._subs.add(this.authService.authErrors$.subscribe(
            (errStr: string)=>
            {
                this.errorString = errStr;
            }
      ));*/
    }
}
