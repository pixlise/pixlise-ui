import { Component, Input } from "@angular/core";
import { MinMax } from "src/app/models/BasicTypes";

export class ScatterPlotAxisInfo {
  constructor(
    public label: string,
    public vertical: boolean,
    public errorMsgShort: string,
    public errorMsgLong: string,
    public valueRange: MinMax,
    public modulesOutOfDate: boolean = false
  ) {}
}

@Component({
  selector: "scatter-plot-axis-switcher",
  templateUrl: "./scatter-plot-axis-switcher.component.html",
  styleUrls: ["./scatter-plot-axis-switcher.component.scss"]
})
export class ScatterPlotAxisSwitcherComponent {
  @Input() info: ScatterPlotAxisInfo | null = null;
}
