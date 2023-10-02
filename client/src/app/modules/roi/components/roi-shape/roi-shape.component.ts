import { Component, Input } from "@angular/core";

export type ROIShape = "circle" | "triangle" | "cross" | "square";
export const SHAPES: ROIShape[] = ["circle", "triangle", "cross", "square"];

@Component({
  selector: "roi-shape",
  templateUrl: "./roi-shape.component.html",
  styleUrls: ["./roi-shape.component.scss"],
})
export class ROIShapeComponent {
  @Input() shape: ROIShape = "circle";
  @Input() color: string = "#000000";
  @Input() scale: number = 1;

  constructor() {}
}
