import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-quantification-page",
    templateUrl: "./quantification-page.component.html",
    styleUrls: ["./quantification-page.component.scss"]
})
export class QuantificationPageComponent implements OnInit
{
    quoteParts = ["This tool allows me to make new and different types of analyses ", "which I had never imagined were possible."];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
