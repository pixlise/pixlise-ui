// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

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
                "assets/images/investigation/context-image.jpg",
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
                "assets/images/investigation/anim-binary-ternary.gif",
                ""
            ),
            new SectionImageItemContent(
                "Spectrtum Chart",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "assets/images/investigation/anim-spectrum.gif",
                ""
            ),
            new SectionImageItemContent(
                "Quantified Element Maps",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "assets/images/investigation/anim-map-drawing.gif",
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
                "assets/images/investigation/quant-table.jpg",
                ""
            ),
            new SectionImageItemContent(
                "Histogram",
                ["Insert ", "Heading", " Here"],
                ["Insert ", "Description", " Here."],
                "assets/images/investigation/histogram.jpg",
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
                "assets/images/investigation/anim-diffraction.gif",
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
