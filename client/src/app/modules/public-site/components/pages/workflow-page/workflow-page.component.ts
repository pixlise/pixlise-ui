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
                "assets/images/workflow/excel.png",
                ""
            ),
            new SectionImageItemContent(
                "Regions of Interest",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/excel.png",
                ""
            ),
            new SectionImageItemContent(
                "Plots",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/excel.png",
                ""
            ),
            new SectionImageItemContent(
                "Images",
                this.analysisSubHeading,
                this.analysisContent,
                "assets/images/workflow/excel.png",
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
