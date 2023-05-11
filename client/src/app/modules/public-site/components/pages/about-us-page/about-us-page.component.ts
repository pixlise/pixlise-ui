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
        public publication: string,
        public issue: string,
        public summary: string,
        public attribution: string,
        public date: string,
        public sortUnixDate: number,
        public imageLink: string,
        public articleLink: string
    )
    {
    }
}

class Contributor
{
    constructor(public name: string, public role: string)
    {
    }
}

class ContributorGroup
{
    constructor(public group: string, public contributors: Contributor[])
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
    contributors: ContributorGroup[] = [
        new ContributorGroup("PIXL PROJECT LEADERSHIP", [
            new Contributor("Abigail Allwood", "PIXL Principal Investigator"),
            new Contributor("Joel Hurowitz", "PIXL Deputy Principal Investigator"),
            new Contributor("Morgan Cable", "PIXL Deputy Principal Investigator")
        ]),
        new ContributorGroup("PIXLISE DEVELOPMENT TEAM", [
            new Contributor("Scott Davidoff", "Project Lead"),
            new Contributor("Peter Nemere", "QUT Lead Programmer"),
            new Contributor("Tom Barber", "JPL Lead Programmer"),
            new Contributor("Michael Fedell", "JPL Programmer"),
            new Contributor("Ryan Stonebraker", "JPL Programmer"),
            new Contributor("Adrian Galvin", "Design Lead"),
            new Contributor("Austin Wright", "Data Scientist"),
        ]),
        new ContributorGroup("PIXLISE SCIENCE TEAM", [
            new Contributor("Mike Tice", "JPL Science Liaison"),
            new Contributor("Yang Liu", "JPL Science Liaison"),
            new Contributor("David Flannery", "QUT Science Liaison"),
            new Contributor("Tim Elam", "Chief Spectroscopist"),
            new Contributor("Chris Heirwegh", "Spectroscopist"),
        ]),
        new ContributorGroup("PIXLISE INCUBATION TEAM ALUMNI", [
            new Contributor("David Flannery", "Principal Investigator"),
            new Contributor("Abigail Allwood", "Co-Investigator"),
            new Contributor("Yang Liu", "Co-Investigator"),
            new Contributor("David Schurman", "Lead Developer"),
            new Contributor("Pooja Nair", "Designer"),
            new Contributor("Adrian Galvin", "Designer"),
            new Contributor("Scott Davidoff", "Mentor"),
            new Contributor("Maggie Hendrie", "Mentor"),
            new Contributor("Santiago Lombeyda", "Mentor"),
            new Contributor("Hillary Mushkin", "Mentor"),
        ]),
        new ContributorGroup("PIXLISE ALUMNI", [
            new Contributor("Henry Jiao", "Intern Programmer"),
        ]),
    ];

    scienceTiles: MissionTile[] = [
        new MissionTile("Revolutionary", "We make cutting-edge  visualization and analysis tools for next generation, groundbreaking science."),
        new MissionTile("Collaborative", "Just like how PIXLISE came to be, we believe tools should foster collaboration between everyone in the lab."),
        new MissionTile("Cross-Disciplinary", "Designed for a breadth of science expertise, PIXLISE tools support geoscientific workflows at large."),
        new MissionTile("Accessible", "Science is for everyone. PIXLISE is open-source, free, and accessible on the web.")
    ];

    publications: Publication[] = [];

    constructor(private _router: Router)
    {
        // Randomise the articles
        let articles = [
            new Publication(
                "Science",
                "Volume 377, Issue 6614",
                "An olivine cumulate outcrop on the floor of Jezero crater, Mars",
                "Y. Liu, M. M. Tice, M. E. Schmidt, A. H. Treiman, T. V. Kizovski, J. A. Hurowitz, A. C. Allwood, J. Henneke, D. A. K. Pedersen, S. J. Vanbommel, M. W. M. Jones, A. L. Knight, B. J. Orenstein, B. C. Clark, W. T. Elam, C. M. Heirwegh, T. Barber, L. W. Beegle, K. Benzerara, S. Bernard, O. Beyssac, T. Bosak, A. J. Brown, E. L. Cardarelli, D. C. Catling, J. R. Christian, E. A. Cloutis, B. A. Cohen, S. Davidoff, A. G. Fairén, K. A. Farley, D. T. Flannery, A. Galvin, J. P. Grotzinger, S. Gupta, J. Hall, C. D. K. Herd, K. Hickman-lewis, R. P. Hodyss, B. H. N. Horgan, J. R. Johnson, J. L. Jørgensen, L. C. Kah, J. N. Maki, L. Mandon, N. Mangold, F. M. Mccubbin, S. M. Mclennan, K. Moore, M. Nachon, P. Nemere, L. D. Nothdurft, J. I. Núñez, L. O’neil, C. M. Quantin-nataf, V. Sautter, D. L. Shuster, K. L. Siebach, J. I. Simon, K. P. Sinclair, K. M. Stack, A. Steele, J. D. Tarnas, N. J. Tosca, K. Uckert, A. Udry, L. A. Wade, B. P. Weiss, R. C. Wiens, K. H. Williford, And M. P. Zorzano",
                "25 Aug 2022",
                1661389200,
                "assets/images/aboutus/publications/Science-Vol377-Issue6614.jpg",
                "https://www.science.org/doi/10.1126/science.abo2756"
            ),
            new Publication(
                "Science",
                "Volume 377, Issue 6614",
                "Aqueously altered igneous rocks sampled on the floor of Jezero crater, Mars",
                "K. A. Farley, K. M. Stack, D. L. Shuster, B. H. N. Horgan, J. A. Hurowitz, J. D. Tarnas, J. I. Simon, V. Z. Sun, E. L. Scheller, K. R. Moore, S. M. Mclennan, P. M. Vasconcelos, R. C. Wiens, A. H. Treiman, L. E. Mayhew, O. Beyssac, T. V. Kizovski, N. J. Tosca, K. H. Williford, L. S. Crumpler, L. W. Beegle, J. F. Bell Iii, B. L. Ehlmann, Y. Liu, J. N. Maki, M. E. Schmidt, A. C. Allwood, H. E. F. Amundsen, R. Bhartia, T. Bosak, A. J. Brown, B. C. Clark, A. Cousin, O. Forni, T. S. J. Gabriel, Y. Goreva, S. Gupta, S.-e. Hamran, C. D. K. Herd, K. Hickman-lewis, J. R. Johnson, L. C. Kah, P. B. Kelemen, K. B. Kinch, L. Mandon, N. Mangold, C. Quantin-nataf, M. S. Rice, P. S. Russell, S. Sharma, S. Siljeström, A. Steele, R. Sullivan, M. Wadhwa, B. P. Weiss, A. J. Williams, B. V. Wogsland, P. A. Willis, T. A. Acosta-maeda, P. Beck, K. Benzerara, S. Bernard, A. S. Burton, E. L. Cardarelli, B. Chide, E. Clavé, E. A. Cloutis, B. A. Cohen, A. D. Czaja, V. Debaille, E. Dehouck, A. G. Fairén, D. T. Flannery, S. Z. Fleron, T. Fouchet, J. Frydenvang, B. J. Garczynski, E. F. Gibbons, E. M. Hausrath, A. G. Hayes, J. Henneke, J. L. Jørgensen, E. M. Kelly, J. Lasue, S. Le Mouélic, J. M. Madariaga, S. Maurice, M. Merusi, P.-y. Meslin, S. M. Milkovich, C. C. Million, R. C. Moeller, J. I. Núñez, A. M. Ollila, G. Paar, D. A. Paige, D. A. K. Pedersen, P. Pilleri, C. Pilorget, P. C. Pinet, J. W. Rice Jr., C. Royer, V. Sautter, M. Schulte, M. A. Sephton, S. K. Sharma, S. F. Sholes, N. Spanovich, M. St. Clair, C. D. Tate, K. Uckert, S. J. Vanbommel, A. G. Yanchilina, And M. P. Zorzano",
                "25 Aug 2022",
                1661389200,
                "assets/images/aboutus/publications/Science-Vol377-Issue6614.jpg",
                "https://www.science.org/doi/10.1126/science.abo2196"
            ),
            new Publication(
                "ACM DL",
                "IUI '23",
                "Lessons from the Development of an Anomaly Detection Interface on the Mars Perseverance Rover using the ISHMAP Framework",
                "Austin P Wright, Peter Nemere, Adrian Galvin, Duen Horng Chau, Scott Davidoff",
                "27 March 2023",
                1679878800,
                "assets/images/aboutus/publications/iui2023.png",
                "https://dl.acm.org/doi/10.1145/3581641.3584036"
            ),
            new Publication(
                "IDJ",
                "Volume 27, Issue 1",
                "Towards a collaborative methodology for interactive scientific data visualization",
                "Maggie Hendrie, Hillary Mushkin, Santiago Lombeyda, Scott Davidoff",
                "01 Mar 2022",
                1646096400,
                "assets/images/aboutus/publications/IDJ-27-1.png",
                "https://www.jbe-platform.com/content/journals/10.1075/idj.22009.hen"
            ),
            new Publication(
                "Science Advances",
                "Volume 8, Issue 47",
                "Alteration history of Séítah formation rocks inferred by PIXL x-ray fluorescence, x-ray diffraction, and multispectral imaging on Mars",
                "M. M. Tice, J. A. Hurowitz, A. C. Allwood, M. W. M. Jones, B. J. Orenstein, S. Davidoff, A. P. Wright, D. A.k. Pedersen, J. Henneke, N. J. Tosca, K. R. Moore, B. C. Clark, S. M. Mclennan, D. T. Flannery, A. Steele, A. J. Brown, M. Zorzano, K. Hickman-Lewis, Y. Liu, S. J. Vanbommel, M. E. Schmidt, T. V. Kizovski, A. H. Treiman, L. O'neil, A. G. Fairén, D. L. Shuster, S. Gupta, and The Pixl Team",
                "23 Nov 2022",
                1669165200,
                "assets/images/aboutus/publications/ScienceAdvances-Vol8-Issue47.jpg",
                "https://www.science.org/doi/10.1126/sciadv.abp9084"
            ),
            new Publication(
                "SPACE CHI 2021",
                "2021 ACM Conference",
                "PIXLISE-C: Exploring The Data Analysis Needs of NASA Scientists for Mineral Identification",
                "Ye, C., Hermann, L., Yildirim, N., Bhat, S., Moritz, D. & Davidoff, S",
                "01 Mar 2022",
                1646096400,
                "assets/images/aboutus/publications/spacechi2021.jpg",
                "https://arxiv.org/abs/2103.16060"
            ),
            new Publication(
                "54th LPSC 2023",
                "",
                "PIXL on Perseverance as a Complete X-Ray Spectroscopic Instrument: Analyzing X-Ray Fluorescence, Scattering, and Diffraction in Martian Rocks",
                "M. M. Tice, L. P. O'Neil, B. C. Clark, B. P. Ganly, M. W. M. Jones, B. J. Orenstein, D. A. Flannery, S. J. VanBommel, M. E. Schmidt, P. Nemere, S. Davidoff, A. Galvin, C. Heirwegh, W. T. Elam, A. C. Allwood, and J. A. Hurowitz",
                "13-17 Mar 2023",
                1678669200,
                "assets/images/aboutus/publications/LPSC54.jpg",
                "https://www.hou.usra.edu/meetings/lpsc2023/pdf/2659.pdf"
            ),
            new Publication(
                "Radiation Physics and Chemistry",
                "Volume 63, Issue 2",
                "A new atomic database for X-ray spectroscopic calculations",
                "W. T. Elam, B. D. Ravel, and J.R. Sieber",
                "Feb 2002",
                1012525200,
                "assets/images/aboutus/publications/RadPhysChem.gif",
                "https://doi.org/10.1016/S0969-806X(01)00227-4"
            ),
            new Publication(
                "Spectrochimica Acta Part B: Atomic Spectroscopy",
                "Volume 196",
                "The Focused Beam X-ray Fluorescence Elemental Quantification Software Package PIQUANT",
                "C.M. Heirwegh, W.T. Elam, L.P. O'Neil, K.P. Sinclair, A. Das",
                "Oct 2022",
                1664586000,
                "assets/images/aboutus/publications/Spectrochimica.gif",
                "https://doi.org/10.1016/j.sab.2022.106520"
            ),
            new Publication(
                "52nd LPSC 2021",
                "",
                "Calibrating the PIXL Instrument for Elemental Analysis of Mars",
                "C. M. Heirwegh, Y. Liu, B. C. Clark, W. T. Elam, L. P. O'Neil, K. P. Sinclair, M. Tice, J. A. Hurowitz, A. C. Allwood",
                "15-19 Mar 2021",
                1615770000,
                "assets/images/aboutus/publications/LPSC52.jpg",
                "https://www.hou.usra.edu/meetings/lpsc2021/pdf/1260.pdf"
            ),
            new Publication(
                "43rd COSPAR Scientific Assembly",
                "",
                "Increasing Efficiency of Mars 2020 Rover Operations via Novel Data Analysis Software for the Planetary Instrument for X-ray Lithochemistry (PIXL)",
                "David Flannery, Scott Davidoff, Michael M. Tice, Abigail C. Allwood, William Timothy Elam, Christopher M. Heirwegh, Joel A. Hurowitz, Yang Liu, and Peter Nemere",
                "Jan 2021",
                1609462800,
                "assets/images/aboutus/publications/cospar2021.jpg",
                "https://ui.adsabs.harvard.edu/abs/2021cosp...43E.152F/abstract"
            ),
            new Publication(
                "Space Science Reviews",
                "Volume 216, Issue 8",
                "PIXL: Planetary Instrument for X-Ray Lithochemistry",
                "Allwood, A.C. et al.",
                "19 Nov 2020",
                1605747600,
                "assets/images/aboutus/publications/SpaceScienceReviews.jpg",
                "https://doi.org/10.1007/s11214-020-00767-7"
            ),
        ];

        //this.shuffleArray(articles);
        articles.sort((a: Publication, b: Publication)=>{return a.sortUnixDate-b.sortUnixDate; });
        this.publications = articles;
    }

    // Source: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    private shuffleArray(array)
    {
        for(let i = array.length - 1; i > 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    ngOnInit(): void
    {
    }
}
