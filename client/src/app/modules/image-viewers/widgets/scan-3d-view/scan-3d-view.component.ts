import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";

@Component({
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;

  cursorShown: string = "";

  constructor(public dialog: MatDialog) {
    super();

    this.mdl = new Scan3DViewModel();

    this._widgetControlConfiguration = {
      // topToolbar: [],
      // bottomToolbar: [],
    };
  }

  ngOnInit() {
    
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
