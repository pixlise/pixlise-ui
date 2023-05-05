import { Component, OnInit, Input } from "@angular/core";

@Component({
    selector: "text-with-highlights",
    templateUrl: "./text-with-highlights.component.html",
    styleUrls: ["./text-with-highlights.component.scss"]
})
export class TextWithHighlightsComponent implements OnInit
{
    @Input() parts: string[];
    @Input() styleMain: string;
    @Input() styleAlternate: string;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
