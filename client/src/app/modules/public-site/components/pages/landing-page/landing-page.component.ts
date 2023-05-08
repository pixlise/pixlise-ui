import { Component, OnInit } from "@angular/core";
import { SectionImageListTextInputs, SectionImageItemContent } from "../../layouts/section-image-list-text/section-image-list-text.component";
import { NumberButtonParams } from "../../atoms/number-button/number-button.component";


export const LandingRouteName = "pixlise";

@Component({
    selector: "app-landing-page",
    templateUrl: "./landing-page.component.html",
    styleUrls: ["./landing-page.component.scss"]
})
export class LandingPageComponent implements OnInit
{
    headingParts = [
        "Finally, a tool as ",
        "smart",
        " as the modern geoscientist."
    ];

    collaborationParts = [
        "Unlock real-time collaboration in your lab with open-source ",
        "web access",
        " to geoscience investigation."
    ];

    piquantParts = [
        "PIQUANT is a ",
        "fundamental parameters",
        "-based quantification engine, optimized for ",
        "cloud parallelization",
        ", yielding accurate quantification of ",
        "thousands of scan points in minutes",
        ". Craft compound quantifications with different element sets or matrix assumptions for ",
        "multiple regions",
        " of a single dataset. Rapidly visualize fully ",
        "quantified maps",
        " of every element in your quantification. And don't forget to ",
        "share",
        " them all with your lab."
    ];

    workspaceParams = new SectionImageListTextInputs(
        new NumberButtonParams("01", "Workflow", "yellow", true, true, "public/workflow"),
        ["Scientific investigation at the speed of thought."],
        true,
        "", // If no label we don't show the list
        [
            // The only items info will be shown
            new SectionImageItemContent(
                "", // No list item to show...
                ["Fast, Flexible, and Lab-optimized."],
                [
                    "PIXLISE is an interface informed by ",
                    "thousands of hours of collaboration",
                    " between geoscientists and visualization designers. With intricately-connected features, ",
                    "colorblind-safe palettes",
                    ", and customizable plot panels, PIXLISE's ",
                    "flexible user interface",
                    " empowers the modern scientist with an ",
                    "innovative workflow",
                    "."
                ],
                "assets/images/landing/anim-flexibility.gif",
                ""
            ),
        ]
    );

    investigationParams = new SectionImageListTextInputs(
        new NumberButtonParams("03", "Investigation", "yellow", true, true, "public/investigation"),
        ["Next-level mineral and elemental identification."],
        true,
        "", // If no label we don't show the list
        [
            // The only items info will be shown
            new SectionImageItemContent(
                "", // No list item to show...
                ["Comprehensive tools equipped to help you rapidly explore an unknown sample."],
                [
                    "Examine geo-chemical composition with responsive binary, ternary, and spectral diagrams. ",
                    "Identify elemental distribution",
                    " with the chord diagram and fully quantified maps. ",
                    "Select and save subsets of scanpoints",
                    " of any amount based on chemical, mineral, or spatial relationships as regions of interest."
                ],
                "assets/images/landing/anim-maps-drawing.gif",
                "assets/images/landing/investigation-angled-screenshot.png",
            )
        ]
    );

    quoteParts = ["This tool allows me to make new and different types of analyses ", "which I had never imagined were possible."];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
