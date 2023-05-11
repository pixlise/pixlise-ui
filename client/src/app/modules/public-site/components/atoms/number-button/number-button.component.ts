// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

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
