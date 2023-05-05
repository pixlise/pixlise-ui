import { Component, OnInit, Input } from "@angular/core";

@Component({
    selector: "quote-viewer",
    templateUrl: "./quote-viewer.component.html",
    styleUrls: ["./quote-viewer.component.scss"]
})
export class QuoteViewerComponent implements OnInit
{
    @Input() quoteParts: string[];
    @Input() quotePerson: string;
    @Input() quotePersonTitle: string;
    @Input() linkLabel: string;
    @Input() link: string;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
