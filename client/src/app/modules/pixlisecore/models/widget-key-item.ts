import { Colours, RGBA } from "src/app/utils/colours";

export class WidgetKeyItem {
  colour: string;

  public layerOrder: number = -1;

  constructor(
    public id: string,
    public label: string,
    colourRGB: RGBA | string,
    public dashPattern: number[] | null = null,
    public shape: string = "",
    public group: string = "",
    public isVisible: boolean = true,
    public canBeReordered: boolean = true,
    public isToggleable: boolean = true
  ) {
    let colourRGBA: RGBA = Colours.WHITE;

    if (typeof colourRGB == "string") {
      colourRGBA = RGBA.fromString(colourRGB);
    } else {
      colourRGBA = colourRGB;
    }

    if (colourRGBA == null) {
      this.colour = "";
    } else {
      this.colour = new RGBA(colourRGBA.r, colourRGBA.g, colourRGBA.b, 255).asString();
    }

    if (!this.id) {
      this.id = "";
    }
  }
}
