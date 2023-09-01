import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { BinaryChartDrawer } from "./drawer";
import {
  CanvasDrawNotifier,
  CanvasDrawer,
  CanvasInteractionHandler,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BinaryChartModel } from "./model";

@Component({
  selector: "binary-chart-widget",
  templateUrl: "./binary-chart-widget.component.html",
  styleUrls: ["./binary-chart-widget.component.scss"],
})
export class BinaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new BinaryChartModel();
  drawer: CanvasDrawer;

  private _subs = new Subscription();
  constructor(
    private _snackService: SnackbarService,
    public dialog: MatDialog
  ) {
    super();
    this.drawer = new BinaryChartDrawer(this.mdl);

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
    // this.drawer = new BinaryChartDrawer(this.mdl, this.mdl?.toolHost);
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
