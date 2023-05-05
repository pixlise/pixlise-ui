import { Component, OnInit, Input } from "@angular/core";


export class SectionImageListTextInputs
{
    constructor(
        public navButtonNumber: string,
        public navButtonLabel: string,
        public navButtonLink: string,
        public headingParts: string[],
        public subHeading: string,
        public descriptionParts: string[],
        public listTitle: string,
        public listItems: string[],
        public imageLinkForeground: string,
        public imageLinkBackground: string,
        public headingLarge: boolean
    )
    {
    }
}

@Component({
    selector: "section-image-list-text",
    templateUrl: "./section-image-list-text.component.html",
    styleUrls: ["./section-image-list-text.component.scss"]
})
export class SectionImageListTextComponent implements OnInit
{
    @Input() params: SectionImageListTextInputs;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
