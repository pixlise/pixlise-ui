// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, HostListener, ViewChild, ViewContainerRef } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";

@Component({
  selector: "code-editor",
  templateUrl: "./code-editor-page.component.html",
  styleUrls: ["./code-editor-page.component.scss"],
})
export class CodeEditorPageComponent {
  @ViewChild("preview", { read: ViewContainerRef }) previewContainer: any;

  private _subs = new Subscription();
  private _keyPresses: Set<string> = new Set<string>();

  isSidebarOpen: boolean = true;
  isSplitScreen: boolean = false;

  textHighlighted: string = "";

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    public dialog: MatDialog
  ) {}

  runExpression() {}

  runHighlightedExpression() {}

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this._analysisLayoutService.delayNotifyCanvasResize(500);
  }

  onToggleSplitScreen() {
    this.isSplitScreen = !this.isSplitScreen;
  }

  addExpressions() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.data = {};
    dialogConfig.data.selectedIds = [];

    const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ExpressionPickerResponse) => {
      if (result && result.selectedExpressions?.length > 0) {
        console.log(result);
      }
    });
  }

  onSave() {}

  onClose() {}

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    let cmdOrCtrl = this._analysisLayoutService.isWindows ? "Control" : "Meta";
    let bOrAltB = this._analysisLayoutService.isFirefox ? "∫" : "b";

    this._keyPresses.add(event.key);
    if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("Enter")) {
      this.runExpression();
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("Enter");
      }
      this._keyPresses.delete(event.key);
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("s")) {
      this.onSave();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("s");
      }
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has(bOrAltB)) {
      this.onToggleSidebar();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete(bOrAltB);
      }
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("\\")) {
      this.onToggleSplitScreen();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("\\");
      }
    }
  }

  @HostListener("window:keyup", ["$event"])
  onKeyup(event: KeyboardEvent): void {
    this._keyPresses.delete(event.key);
  }
}
