import { Component, OnInit, Input } from "@angular/core";


@Component({
    selector: "footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit
{
    @Input() showLogos: boolean;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
