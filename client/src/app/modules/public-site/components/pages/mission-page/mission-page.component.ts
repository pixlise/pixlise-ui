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
    selector: "app-mission-page",
    templateUrl: "./mission-page.component.html",
    styleUrls: ["./mission-page.component.scss"]
})
export class MissionPageComponent implements OnInit
{
    scienceTiles: MissionTile[] = [
        new MissionTile("Revolutionary", "We make cutting-edge  visualization and analysis tools for next generation, groundbreaking science."),
        new MissionTile("Collaborative", "Just like how PIXLISE came to be, we believe tools should foster collaboration between everyone in the lab."),
        new MissionTile("Cross-Disciplinary", "Designed for a breadth of science expertise, PIXLISE tools support geoscientific workflows at large."),
        new MissionTile("Accessible", "Science is for everyone. PIXLISE is open-source, free, and accessible on the web.")
    ];

    publications: Publication[] = [
        new Publication("Science Advances", "Volume 8, Issue 47", "Alteration history of Séítah formation rocks inferred by PIXL x-ray fluorescence, x-ray diffraction, and multispectral imaging on Mars", "23 Nov 2022", "assets/images/mission/publications/science_nov2023.jpg", "https://www.science.org/doi/10.1126/sciadv.abp9084"),
        new Publication("Annual Review", "Volume 151, Issue 8", "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis adipiscing donec mattis morbida egestas convallis egestas.", "Bob Smith, 2022", "", ""),
        new Publication("Science Today", "Volume 151, Issue 8", "", "Bob Smith, 2022", "", ""),
        new Publication("Science Journal", "Volume 151, Issue 8", "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis adipiscing donec mattis morbida egestas convallis egestas.", "Bob Smith, 2022", "", ""),
        new Publication("Nature Geoscience ", "Volume 151, Issue 8", "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis adipiscing donec mattis morbida egestas convallis egestas.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis adipiscing donec mattis morbida egestas convallis egestas.", "Bob Smith, 2022", "", ""),
        new Publication("Earth System", "Volume 151, Issue 8", "", "Bob Smith, 2022", "", ""),
        new Publication("The Martian", "Volume 151, Issue 8", "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", "Bob Smith, 2022", "", ""),
        new Publication("Times", "Volume 151, Issue 8", "", "Bob Smith, 2022", "", ""),
    ];
    
    constructor(private _router: Router)
    {
    }
 
    ngOnInit(): void
    {
    }
}
