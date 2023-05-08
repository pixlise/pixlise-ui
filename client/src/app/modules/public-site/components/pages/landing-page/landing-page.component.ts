import { Component, OnInit } from "@angular/core";
import { SectionImageListTextInputs } from "../../layouts/section-image-list-text/section-image-list-text.component";


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
        "01", "Workflow", "public/workflow",
        ["Scientific investigation at the speed of thought."],
        "Fast, Flexible, and Lab-optimized.",
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
        "",
        [],
        "assets/images/landing/anim-flexibility.gif",
        "",
        true
    );

    investigationParams = new SectionImageListTextInputs(
        "03", "Investigation", "public/investigation",
        ["Next-level mineral and elemental identification."],
        "Fast, Flexible, and Lab-optimized.",
        [
            "Examine geo-chemical composition with responsive binary, ternary, and spectral diagrams. ",
            "Identify elemental distribution",
            " with the chord diagram and fully quantified maps. ",
            "Select and save subsets of scanpoints",
            " of any amount based on chemical, mineral, or spatial relationships as regions of interest."
        ],
        "",
        [],
        "assets/images/landing/anim-maps-drawing.gif",
        "assets/images/landing/investigation-angled-screenshot.png",
        true
    );

    quoteParts = ["Without PIXLISE and PIQUANT, PIXL would still be a great instrument, but nobody would know because ", "we'd still be processing our first dataset."];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
