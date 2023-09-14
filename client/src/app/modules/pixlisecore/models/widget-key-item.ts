import { Colours, RGBA } from "src/app/utils/colours";

export class WidgetKeyItem {
  colour: string;

  constructor(
    public id: string,
    public label: string,
    colourRGB: RGBA | string,
    public dashPattern: number[] = [],
    public shape: string = ""
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
