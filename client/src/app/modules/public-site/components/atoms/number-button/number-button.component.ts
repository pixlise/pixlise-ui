import { Component, OnInit, Input } from "@angular/core";
import { Router } from "@angular/router";

import { AuthenticationService } from "src/app/services/authentication.service";


const LoginPrefix = "login:";
const SignupPrefix = "signup:";


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
                // Simple link opening, we can handle it
                this._router.navigate([this.params.link]);
            }
        }
    }
}
