import { Component, OnInit } from "@angular/core";
import { SectionImageListTextInputs } from "../../layouts/section-image-list-text/section-image-list-text.component";


@Component({
    selector: "app-workflow-page",
    templateUrl: "./workflow-page.component.html",
    styleUrls: ["./workflow-page.component.scss"]
})
export class WorkflowPageComponent implements OnInit
{
    analysisParams = new SectionImageListTextInputs(
        "01", "Workflow", "workflow",
        ["Take PIXLISE work anywhere, at anytime."],
        "File format export options that are universally translatable.",
        [
            "We know you have your favorite analysis tools. Exporting allows seamless transition in your workflow to the resources that will help you do your work the best. Export custom-defined subsets of data and expressions, including raw spectral counts. Generate publication-quality graphics, including geologic images, quantified element maps, or custom expression maps with the push of the button."
        ],
        "Export",
        ["Quantified Data", "Regions of Interest", "Plots", "Images"],
        "assets/images/workflow/excel.png",
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
