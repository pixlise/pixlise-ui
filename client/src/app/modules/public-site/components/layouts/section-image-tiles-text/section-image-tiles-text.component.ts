import { Component, OnInit, Input } from "@angular/core";

import { NumberButtonParams } from "../../atoms/number-button/number-button.component";


export class SectionImageTileContent
{
    constructor(
        public label: string,
        public description: string,
        public iconImageLink: string,
        public displayImageLink: string
    )
    {
    }
}

export class SectionImageTilesInputs
{
    constructor(
        public navButtonParams: NumberButtonParams,
        public headingParts: string[],
        public tileItems: SectionImageTileContent[],
    )
    {
    }
}

@Component({
    selector: "section-image-tiles-text",
    templateUrl: "./section-image-tiles-text.component.html",
    styleUrls: ["./section-image-tiles-text.component.scss"]
})
export class SectionImageTilesTextComponent implements OnInit
{
    @Input() params: SectionImageTilesInputs;
    activeTile: SectionImageTileContent;

    constructor()
    {
    }

    ngOnInit(): void
    {
        if(this.params?.tileItems?.length > 0)
        {
            this.activeTile = this.params.tileItems[0];
        }
    }

    onClickTile(item: SectionImageTileContent)
    {
        this.activeTile = item;
    }
}
