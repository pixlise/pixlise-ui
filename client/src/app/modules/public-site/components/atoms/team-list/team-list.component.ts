import { Component, OnInit } from "@angular/core";


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
    selector: "team-list",
    templateUrl: "./team-list.component.html",
    styleUrls: ["./team-list.component.scss"]
})
export class TeamListComponent implements OnInit
{
    contributors: ContributorGroup[][] = [
        [
            new ContributorGroup("PIXL Instrument Leadership", [
                new Contributor("Abigail Allwood", "PIXL Principal Investigator"),
                new Contributor("Joel Hurowitz", "PIXL Deputy Principal Investigator"),
                new Contributor("Morgan Cable", "PIXL Deputy Principal Investigator")
            ]),
            new ContributorGroup("PIXLISE Science Team", [
                new Contributor("Mike Tice", "JPL Science Liaison"),
                new Contributor("Yang Liu", "JPL Science Liaison"),
                new Contributor("David Flannery", "QUT Science Liaison"),
                new Contributor("Tim Elam", "Chief Spectroscopist"),
                new Contributor("Chris Heirwegh", "Science Operations Lead"),
            ])
        ],
        [
            new ContributorGroup("PIXLISE Development Team", [
                new Contributor("Scott Davidoff", "Project Lead"),
                new Contributor("Peter Nemere", "QUT Lead Developer"),
                new Contributor("Tom Barber", "JPL Infrastructure Developer"),
                new Contributor("Michael Fedell", "JPL Infrastructure Developer"),
                new Contributor("Ryan Stonebraker", "JPL Interface Developer"),
                new Contributor("Adrian Galvin", "Visualization + Design Lead"),
                new Contributor("Austin Wright", "Data Science + Machine Learning Lead"),
            ])
        ],
        [
            new ContributorGroup("PIXLISE Incubation Team + Alumni", [
                new Contributor("David Flannery", "Principal Investigator"),
                new Contributor("Abigail Allwood", "PIXL Principal Investigator"),
                new Contributor("Yang Liu", "Co-Investigator"),
                new Contributor("David Schurman", "Lead Developer"),
                new Contributor("Pooja Nair", "UI + Visualization Designer"),
                new Contributor("Adrian Galvin", "UI + Visualization Designer"),
                new Contributor("Scott Davidoff", "JPL Mentor"),
                new Contributor("Maggie Hendrie", "UI/UX Mentor (Art Center)"),
                new Contributor("Santiyago Lombeyda", "Development Mentor (CalTech)"),
                new Contributor("Hillary Mushkin", "Creative Process Mentor (CalTech)"),
                new Contributor("Henry Jiao", "Intern Programmer"),
            ])
        ],
    ];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
