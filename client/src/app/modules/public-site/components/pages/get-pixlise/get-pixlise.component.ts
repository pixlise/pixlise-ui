import { Component, OnInit } from "@angular/core";
import { NumberButtonParams, LoginPrefix, SignupPrefix, DefaultLoggedInLink } from "../../atoms/number-button/number-button.component";


class Tile
{
    constructor(public label: string, public description: string, public buttonParams: NumberButtonParams)
    {
    }
}
@Component({
    selector: "app-get-pixlise",
    templateUrl: "./get-pixlise.component.html",
    styleUrls: ["./get-pixlise.component.scss"]
})
export class GetPIXLISEComponent implements OnInit
{
    tiles: Tile[] = [
        new Tile(
            "Explore Our World!",
            "Try out the basic features of PIXLISE on public access datasets without the need for an account, one click away!",
            new NumberButtonParams("01", "Free Trial", "yellow", true, true, "/datasets")
        ),
        new Tile("Sign Up for More...",
            "Are you a scientist looking to dig a bit deeper? Sign up to get access to advanced PIXLISE features and our community discussion board.",
            new NumberButtonParams("02", "Make an account", "yellow", true, true, SignupPrefix+DefaultLoggedInLink)
        ),
        new Tile("Get PIXLISE!",
            "PIXLISE is free and open source, we’ll help you choose the best fit for how to get your own personal version.",
            new NumberButtonParams("03", "Learn More", "red", true, true, "/public/get-started#links")
        ),
    ];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
