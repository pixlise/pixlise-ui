import { Component, Input } from "@angular/core";

export type ROIShape = "circle" | "triangle" | "cross" | "square";
export const DEFAULT_ROI_SHAPE: ROIShape = "circle";
export const ROI_SHAPES: ROIShape[] = ["circle", "triangle", "cross", "square"];

@Component({
  selector: "roi-shape",
  templateUrl: "./roi-shape.component.html",
  styleUrls: ["./roi-shape.component.scss"],
})
export class ROIShapeComponent {
  @Input() shape: string | ROIShape = "circle";
  @Input() color: string = "#000000";
  @Input() scale: number = 1;
  @Input() borderColor: string = "";

  constructor() {}
}
