import { Component, OnInit } from "@angular/core";

@Component({
    selector: "branding-logos",
    templateUrl: "./branding.component.html",
    styleUrls: ["./branding.component.scss"]
})
export class BrandingComponent implements OnInit
{
    logos: string[][] = [
        ["/assets/images/footer/gray-nasa-tribrand-logo.svg", "https://www.jpl.nasa.gov", "NASA Jet Propultion Lab"],
        ["assets/images/footer/gray-qut-logo.svg", "https://www.qut.edu.au", "Queensland University of Technology"],
        ["assets/images/footer/gray-dtu-logo.svg", "https://www.dtu.dk", "Technical University of Denmark"],
        ["assets/images/footer/gray-uw-logo.svg", "https://www.washington.edu", "University of Washington"],
        ["assets/images/footer/gray-texas-am-logo.svg", "https://www.tamu.edu", "Texas A&M University"],
        ["assets/images/footer/gray-stonybrook-logo.svg", "https://www.stonybrook.edu", "Stony Brook University"],
    ];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
