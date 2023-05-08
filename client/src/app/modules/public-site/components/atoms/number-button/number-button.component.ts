import { Component, OnInit, Input } from "@angular/core";
import { Router } from "@angular/router";

import { AuthenticationService } from "src/app/services/authentication.service";


const LoginPrefix = "login:";
const SignupPrefix = "signup:";

@Component({
    selector: "number-button",
    templateUrl: "./number-button.component.html",
    styleUrls: ["./number-button.component.scss"]
})
export class NumberButtonComponent implements OnInit
{
    // red or yellow
    @Input() colourStyle: string = "yellow";

    // If we don"t want the first label+separator, specify ""
    @Input() theNumber: string;

    // The label
    @Input() theLabel: string;

    // Are we showing a chevron on right?
    @Input() showArrow: boolean;

    // Showing a separator before the right arrow?
    @Input() showArrowSeparator: boolean;

    // The link to go to if clicked. If this is blank, we don't act like a clickable element.
    // If this is prepended with login: we perform a login and the user is redirected to this link afterwards.
    // If this is prepended with signup: we perform the signup workflow, and the user is redirected to this link afterwards
    // Otherwise we navigate to ths this link via Angular router
    @Input() link: string;

    constructor(
        private _authService: AuthenticationService,
        private _router: Router
        )
    {
    }

    ngOnInit(): void
    {
    }

    get styles(): string[]
    {
        let styles = [this.colourStyle];
        if(this.link)
        {
            styles.push("clickable");
        }
        return styles;
    }

    onClick()
    {
        if(this.link)
        {
            // If caller wants a callback, provide here
            if(this.link.startsWith(LoginPrefix))
            {
                let redir = this.link.substring(LoginPrefix.length);
                this._authService.login(redir, false);
            }
            else if(this.link.startsWith(SignupPrefix))
            {
                let redir = this.link.substring(SignupPrefix.length);
                this._authService.login(redir, false);
            }
            else
            {
                // Simple link opening, we can handle it
                this._router.navigate([this.link]);
            }
        }
    }
}
