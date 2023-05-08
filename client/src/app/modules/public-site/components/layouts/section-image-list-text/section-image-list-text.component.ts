import { Component, OnInit, Input } from "@angular/core";

import { NumberButtonParams } from "../../atoms/number-button/number-button.component";

export class SectionImageItemContent
{
    constructor(
        public listLabel: string,
        public headingParts: string[],
        public descriptionParts: string[],
        public imageLinkForeground: string,
        public imageLinkBackground: string
    )
    {
    }
}

export class SectionImageListTextInputs
{
    constructor(
        public navButtonParams: NumberButtonParams,
        public headingParts: string[],
        public headingLarge: boolean,
        public listTitle: string,
        public listItems: SectionImageItemContent[],
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
    activeItem: SectionImageItemContent;

    constructor()
    {
    }

    ngOnInit(): void
    {
        if(this.params?.listItems?.length > 0)
        {
            this.activeItem = this.params.listItems[0];
        }
    }

    onClickListItem(item: SectionImageItemContent)
    {
        this.activeItem = item;
    }
}
