import { Component, OnInit } from "@angular/core";
import { SectionImageListTextInputs } from "../../layouts/section-image-list-text/section-image-list-text.component";


@Component({
    selector: "app-investigation-page",
    templateUrl: "./investigation-page.component.html",
    styleUrls: ["./investigation-page.component.scss"]
})
export class InvestigationPageComponent implements OnInit
{
    suiteParams = new SectionImageListTextInputs(
        "01", "Sample Investigation", "",
        ["A comprehensive ", "suite", " of interactive visualization tools to quickly explore an unknown sample."],
        "Chord Diagram:",
        ["Maps spatial correlations of elements to give you a near immediate summary of your sample at a glance. Blue lines indicate positive correlations and yellow lines indicate negative correlations. Circle diameter indicates relative abundance of each element. "],
        "Investigate",
        ["Context Image", "Spectral Point Selection", "Binary + Ternary Plot", "Spectrtum Chart", "Quantified Element Maps", "Chord Diagram", "Quantified Element Table", "Histogram"],
        "assets/images/investigation/chord.png",
        "",
        false
    );

    expressionParams = new SectionImageListTextInputs(
        "02", "Scripted Geochemical Definitions", "",
        ["Define bespoke mineral and crystalline definitions with self-composed and shareable ", "expressions."],
        "User-defined scripting deepens geochemical investigation.",
        [
            "Describe any value derived from spectra or quantified element weight percentages, and see it immediately reflected in a map-based representation. ",
            "Combine elements",
            " in user-defined stoichiometric ratios to estimate mineral abundances at each scan point. ",
            "Share",
            " any custom expression with your lab to streamline science workflow."
        ],
        "Demonstrate",
        ["Element Definition", "Auto-Completion", "Variables and Operations", "Mineral Definition", "Complex Operations"],
        "assets/images/investigation/expression.png",
        "",
        false
    );
    
    diffractionParams  = new SectionImageListTextInputs(
        "03", "Anomaly Detection", "",
        ["Intelligent diffraction peak detection for all your quantification and analysis needs."],
        "Specialized features designed for instruments with multiple detectors.",
        [
            "Ensure maximum data accuracy and ",
            "infer crystalline alignment",
            " with PIXLISE's anomoly detection features. With ",
            "automated diffraction detection",
            " and ",
            "custom-scripting removal",
            " features, visualize, identify, and resolve diffraction issues swiftly."
        ],
        "Demonstrate",
        ["Assess patterns across a sample", "Inspect individual detected peaks", "Localize areas of surface roughness", "Remove anomolies with expressions"],
        "assets/images/investigation/diffraction.png",
        "",
        false
    );

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
