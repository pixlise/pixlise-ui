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
import { SectionImageTilesInputs, SectionImageTileContent } from "../../layouts/section-image-tiles-text/section-image-tiles-text.component";

import { NumberButtonParams } from "../../atoms/number-button/number-button.component";


@Component({
    selector: "app-workflow-page",
    templateUrl: "./workflow-page.component.html",
    styleUrls: ["./workflow-page.component.scss"]
})
export class WorkflowPageComponent implements OnInit
{
    analysisSubHeading = ["File format export options that are universally translatable."];
    analysisContent = ["We know you have your favorite analysis tools. Exporting allows seamless transition in your workflow to the resources that will help you do your work the best. Export custom-defined subsets of data and expressions, including raw spectral counts. Generate publication-quality graphics, including geologic images, quantified element maps, or custom expression maps with the push of the button."];

    analysisParams = new SectionImageListTextInputs(
        new NumberButtonParams("03", "Workflow", "red", false, false, ""),
        ["Take PIXLISE work anywhere, at anytime."],
        false,
        "Export",
        [
            new SectionImageItemContent(
                "Quantified Data",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/quants.png",
                ""
            ),
            new SectionImageItemContent(
                "Regions of Interest",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/roi.png",
                ""
            ),
            new SectionImageItemContent(
                "Plots",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/plots.png",
                ""
            ),
            new SectionImageItemContent(
                "Images",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/images.png",
                ""
            ),
        ]
    );

    solutionParams = new SectionImageTilesInputs(
        new NumberButtonParams("01", "The Solution", "red", false, false, ""),
        ["Revolutionary data-viz capabilities that enable scientific investigation at the ", "speed of thought."],
        [
            new SectionImageTileContent(
                "Interconnected Panels",
                "Interactive plots instantaneously reflect your every input across the entire workspace.",
                "assets/images/workflow/interconnected.svg",
                "assets/images/workflow/anim-linking.gif"
            ),
            new SectionImageTileContent(
                "User Interface Flexibility",
                "Customize your workspace by assigning any visualization to each panel with intuitive dropdown menus.",
                "assets/images/workflow/flexible.svg",
                "assets/images/workflow/anim-flexibility.gif"
            ),
            new SectionImageTileContent(
                "Accessible UI Components",
                "All PIXLISE components are contrast-compliant and color-blind accessible.",
                "assets/images/workflow/visible.svg",
                "assets/images/workflow/accessibility.jpg"
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
