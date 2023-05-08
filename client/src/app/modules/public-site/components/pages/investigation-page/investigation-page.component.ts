import { Component, OnInit } from "@angular/core";
import { SectionImageListTextInputs, SectionImageItemContent } from "../../layouts/section-image-list-text/section-image-list-text.component";
import { NumberButtonParams } from "../../atoms/number-button/number-button.component";


@Component({
    selector: "app-investigation-page",
    templateUrl: "./investigation-page.component.html",
    styleUrls: ["./investigation-page.component.scss"]
})
export class InvestigationPageComponent implements OnInit
{
    suiteParams = new SectionImageListTextInputs(
        new NumberButtonParams("01", "Sample Investigation", "red", false, false, ""),
        ["A comprehensive ", "suite", " of interactive visualization tools to quickly explore an unknown sample."],
        false,
        "Investigate:",
        [
            new SectionImageItemContent(
                "Context Image",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Spectral Point Selection",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Binary + Ternary Plot",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Spectrtum Chart",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Quantified Element Maps",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Chord Diagram",
                ["Chord Diagram:"],
                ["Maps spatial correlations of elements to give you a near immediate summary of your sample at a glance. Blue lines indicate positive correlations and yellow lines indicate negative correlations. Circle diameter indicates relative abundance of each element. "],
                "assets/images/investigation/chord.png",
                ""
            ),
            new SectionImageItemContent(
                "Quantified Element Table",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Histogram",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
        ]
    );

    expressionParams = new SectionImageListTextInputs(
        new NumberButtonParams("02", "Scripted Geochemical Definitions", "red", false, false, ""),
        ["Define bespoke mineral and crystalline definitions with self-composed and shareable ", "expressions."],
        false,
        "Demonstrate",
        [
            new SectionImageItemContent(
                "Element Definition",
                [ "User-defined scripting deepens geochemical investigation."],
                [
                    "Describe any value derived from spectra or quantified element weight percentages, and see it immediately reflected in a map-based representation. ",
                    "Combine elements",
                    " in user-defined stoichiometric ratios to estimate mineral abundances at each scan point. ",
                    "Share",
                    " any custom expression with your lab to streamline science workflow."
                ],
                "assets/images/investigation/expression.png",
                ""
            ),
            new SectionImageItemContent(
                "Auto-Completion",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Variables and Operations",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Mineral Definition",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Complex Operations",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
        ]
    );
    
    diffractionParams  = new SectionImageListTextInputs(
        new NumberButtonParams("03", "Anomaly Detection", "red", false, false, ""),
        ["Intelligent diffraction peak detection for all your quantification and analysis needs."],
        false,
        "Demonstrate",
        [
            new SectionImageItemContent(
                "Assess patterns across a sample",
                ["Specialized features designed for instruments with multiple detectors."],
                [
                    "Ensure maximum data accuracy and ",
                    "infer crystalline alignment",
                    " with PIXLISE's anomoly detection features. With ",
                    "automated diffraction detection",
                    " and ",
                    "custom-scripting removal",
                    " features, visualize, identify, and resolve diffraction issues swiftly."
                ],
                "assets/images/investigation/diffraction.png",
                ""
            ),
            new SectionImageItemContent(
                "Inspect individual detected peaks",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Localize areas of surface roughness",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
            ),
            new SectionImageItemContent(
                "Remove anomolies with expressions",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "",
                ""
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
