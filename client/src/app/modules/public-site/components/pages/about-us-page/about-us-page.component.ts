import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";


class MissionTile
{
    constructor(
        public title: string,
        public description: string
    )
    {
    }
}

class Publication
{
    constructor(
        public title: string,
        public subheading: string,
        public summary: string,
        public attribution: string,
        public imageLink: string,
        public articleLink: string
    )
    {
    }
}
@Component({
    selector: "app-about-us-page",
    templateUrl: "./about-us-page.component.html",
    styleUrls: ["./about-us-page.component.scss"]
})
export class AboutUsPageComponent implements OnInit
{
    scienceTiles: MissionTile[] = [
        new MissionTile("Revolutionary", "We make cutting-edge  visualization and analysis tools for next generation, groundbreaking science."),
        new MissionTile("Collaborative", "Just like how PIXLISE came to be, we believe tools should foster collaboration between everyone in the lab."),
        new MissionTile("Cross-Disciplinary", "Designed for a breadth of science expertise, PIXLISE tools support geoscientific workflows at large."),
        new MissionTile("Accessible", "Science is for everyone. PIXLISE is open-source, free, and accessible on the web.")
    ];

    publications: Publication[] = [
        new Publication("Science", "Volume 377, Issue 6614", "An olivine cumulate outcrop on the floor of Jezero crater, Mars", "25 Aug 2022", "assets/images/aboutus/publications/Science-Vol377-Issue6614.jpg", "https://www.science.org/doi/10.1126/science.abo2756"),
        new Publication("Science", "Volume 377, Issue 6614", "Aqueously altered igneous rocks sampled on the floor of Jezero crater, Mars", "25 Aug 2022", "assets/images/aboutus/publications/Science-Vol377-Issue6614.jpg", "https://www.science.org/doi/10.1126/science.abo2196"),
        new Publication("ACM DL", "IUI '23", "Lessons from the Development of an Anomaly Detection Interface on the Mars Perseverance Rover using the ISHMAP Framework", "27 March 2023", "", "https://dl.acm.org/doi/10.1145/3581641.3584036"),
        new Publication("IDJ", "Volume 27, Issue 1", "Towards a collaborative methodology for interactive scientific data visualization", "01 Mar 2022", "", "https://www.jbe-platform.com/content/journals/10.1075/idj.22009.hen"),
        new Publication("Science Advances", "Volume 8, Issue 47", "Alteration history of Séítah formation rocks inferred by PIXL x-ray fluorescence, x-ray diffraction, and multispectral imaging on Mars", "23 Nov 2022", "assets/images/aboutus/publications/ScienceAdvances-Vol8-Issue47.jpg", "https://www.science.org/doi/10.1126/sciadv.abp9084"),
        new Publication("Cornell University", "", "PIXLISE-C: Exploring The Data Analysis Needs of NASA Scientists for Mineral Identification", "01 Mar 2022", "", "https://arxiv.org/abs/2103.16060"),
    ];
    
    constructor(private _router: Router)
    {
    }
 
    ngOnInit(): void
    {
    }
}
