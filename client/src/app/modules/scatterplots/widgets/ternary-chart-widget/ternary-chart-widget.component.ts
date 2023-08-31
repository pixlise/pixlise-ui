import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { TernaryChartDrawer } from "./drawer";
import {
  CanvasDrawNotifier,
  CanvasDrawer,
  CanvasInteractionHandler,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { TernaryChartModel } from "./model";

@Component({
  selector: "ternary-chart-widget",
  templateUrl: "./ternary-chart-widget.component.html",
  styleUrls: ["./ternary-chart-widget.component.scss"]
})
export class TernaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new TernaryChartModel();
  drawer: CanvasDrawer;

  private _subs = new Subscription();

  constructor(public dialog: MatDialog) {
    super();
    this.drawer = new TernaryChartDrawer(this.mdl.drawModel);
    
    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "refs",
          type: "button",
          title: "Refs",
          tooltip: "Choose reference areas to display",
          onClick: () => this.onReferences(),
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export",
          onClick: () => this.onExport(),
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
      ]
    };
  }

  ngOnInit() {
    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
  
  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get transform() {
    return this.mdl.transform;
  }

  get interactionHandler() {
    return this.mdl.toolhost;
  }

  onExport() {}
  onSoloView() {}
  onRegions() {}
  onReferences() {}

  get showMmol(): boolean {
    return this.mdl.showMmol;
  }

  setShowMmol() {
    this.mdl.showMmol = !this.mdl.showMmol;
  }

  get selectModeExcludeROI(): boolean {
    return this.mdl.selectModeExcludeROI;
  }

  onToggleSelectModeExcludeROI() {
    this.mdl.selectModeExcludeROI = !this.mdl.selectModeExcludeROI;
  }
}
