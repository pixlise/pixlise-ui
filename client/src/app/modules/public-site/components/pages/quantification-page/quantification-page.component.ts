import { Component, OnInit } from "@angular/core";

import { SectionImageTilesInputs, SectionImageTileContent } from "../../layouts/section-image-tiles-text/section-image-tiles-text.component";
import { NumberButtonParams } from "../../atoms/number-button/number-button.component";


@Component({
    selector: "app-quantification-page",
    templateUrl: "./quantification-page.component.html",
    styleUrls: ["./quantification-page.component.scss"]
})
export class QuantificationPageComponent implements OnInit
{
    quoteParts = ["Without PIXLISE and PIQUANT, PIXL would still be a great instrument, but nobody would know because ", "we'd still be processing our first dataset."];

    industryParams = new SectionImageTilesInputs(
        new NumberButtonParams("01", "Quantification", "red", false, false, ""),
        ["Industry-leading accuracy and speed in elemental quantification. Seamlessly integrated into the PIXLISE interface."],
        [
            new SectionImageTileContent(
                "Elemental Identification",
                "Easily build an element set with interactive indicators that assist you to locate distinct peaks in spectra.",
                "assets/images/quantification/checkbox.svg",
                "assets/images/quantification/piquant.jpg"
            ),
            new SectionImageTileContent(
                "Quantified Element Maps",
                "Visualize the spatial distribution of elements in your scan with fully quantified data.",
                "assets/images/quantification/map.svg",
                "assets/images/quantification/maps.jpg"
            ),
            new SectionImageTileContent(
                "Multi-Quantification",
                "A feature found only in PIXLISE, craft individual quantifications for regions of your dataset and combine them into one.",
                "assets/images/quantification/mouse.svg",
                "assets/images/quantification/multiquant.jpg"
            ),
            new SectionImageTileContent(
                "Quantified Element Table",
                "Display quantified weight percentages for every element of your dataset in a table.",
                "assets/images/quantification/table.svg",
                "assets/images/quantification/quant-table.jpg"
            ),
        ]
    );
    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
