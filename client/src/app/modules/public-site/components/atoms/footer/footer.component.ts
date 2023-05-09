import { Component, OnInit, Input } from "@angular/core";

import { AuthenticationService } from "src/app/services/authentication.service";
import { Navigation } from "../../navigation";

@Component({
    selector: "footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit
{
    @Input() showLogos: boolean;

    navigation: Navigation = new Navigation();

    constructor(
        private _authService: AuthenticationService,
        )
    {
    }

    ngOnInit(): void
    {
    }

    onLogin()
    {
        this._authService.login("/about", false);
    }
}
