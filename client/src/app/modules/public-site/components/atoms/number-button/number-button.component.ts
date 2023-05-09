import { Component, OnInit, Input } from "@angular/core";
import { Router, NavigationExtras } from "@angular/router";

import { AuthenticationService } from "src/app/services/authentication.service";


export const LoginPrefix = "login:";
export const SignupPrefix = "signup:";
export const DefaultLoggedInLink = "/about";

export class NumberButtonParams
{
    constructor(
        // If we don't want the first label+separator, specify ""
        public labelPrefix: string,
        
        // The label shown at the middle of the button
        public label: string,
        
        // The CSS style name to apply
        public colourStyle: string,

        // Are we showing a chevron on right?
        public showArrow: boolean,

        // Showing a separator before the right arrow?
        public showArrowSeparator: boolean,

        // The link to go to if clicked. If this is blank, we don't act like a clickable element.
        // If this is prepended with login: we perform a login and the user is redirected to this link afterwards.
        // If this is prepended with signup: we perform the signup workflow, and the user is redirected to this link afterwards
        // If this is a full link starting with http, it opens in a new tab
        // Otherwise we navigate to ths this link via Angular router
        public link: string,
    )
    {
    }
}

@Component({
    selector: "number-button",
    templateUrl: "./number-button.component.html",
    styleUrls: ["./number-button.component.scss"]
})
export class NumberButtonComponent implements OnInit
{
    // Can be initialised by providing the structure directly
    @Input() params: NumberButtonParams;

    // OR for convenience/simpler cases, can provide separate fields. These simply populate
    // the struct anyway
    @Input() theNumber: string;
    @Input() theLabel: string;
    @Input() link: string;
    @Input() colourStyle: string = "yellow";
    @Input() showArrow: boolean;
    @Input() showArrowSeparator: boolean;

    constructor(
        private _authService: AuthenticationService,
        private _router: Router
        )
    {
    }

    ngOnInit(): void
    {
        if(!this.params)
        {
            this.params = new NumberButtonParams(
                this.theNumber,
                this.theLabel,
                this.colourStyle,
                this.showArrow,
                this.showArrowSeparator,
                this.link
            );
        }
    }

    get styles(): string[]
    {
        let styles = [this.params.colourStyle];
        if(this.params.link)
        {
            styles.push("clickable");
        }
        return styles;
    }

    onClick()
    {
        if(this.params.link)
        {
            // If caller wants a callback, provide here
            if(this.params.link.startsWith(LoginPrefix))
            {
                let redir = this.params.link.substring(LoginPrefix.length);
                this._authService.login(redir, false);
            }
            else if(this.params.link.startsWith(SignupPrefix))
            {
                let redir = this.params.link.substring(SignupPrefix.length);
                this._authService.login(redir, false);
            }
            else
            {
                // Simple link opening, we can handle it. If it's a whole URL we open it
                // with window.open in a new tab, otherwise let angular router deal with it
                if(this.params.link.startsWith("http"))
                {
                    window.open(this.params.link, "_blank");
                }
                else
                {
                    // Handle fragments...
                    let extras: NavigationExtras = {};

                    let url = this.params.link;
                    let parts = url.split("#");
                    if(parts.length == 2)
                    {
                        url = parts[0];
                        extras.fragment = parts[1];
                    }

                    this._router.navigate([url], extras);
                }
            }
        }
    }
}
