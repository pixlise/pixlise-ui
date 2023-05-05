import { Component, OnInit, Input } from "@angular/core";
import { Router } from "@angular/router";

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

    // The link to go to if clicked. If this is blank, we don"t act like a clickable element
    @Input() link: string;

    constructor(private _router: Router)
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
            this._router.navigate([this.link]);
        }
    }
}
