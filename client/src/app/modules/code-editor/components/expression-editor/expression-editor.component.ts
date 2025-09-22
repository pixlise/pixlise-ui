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

import { Component, Inject, OnDestroy } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
// import { DataExpression } from "src/app/models/Expression";
// import { DataSetService } from "src/app/services/data-set.service";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";
// import { DataExpressionService } from "src/app/services/data-expression.service";

export class ExpressionEditorConfig {
  constructor(
    public expr: DataExpression,
    public allowEdit: boolean,
    public applyNow: boolean = false,
    public isImmediatelyAppliable: boolean = true,
    public showSoloEditorButton: boolean = true,
    public isPublicUser: boolean = false
  ) {}
}

export class MarkPosition {
  constructor(
    public line: number,
    public idxStart: number,
    public idxEnd: number
  ) {}
}

@Component({
  standalone: false,
  selector: "app-expression-editor",
  templateUrl: "./expression-editor.component.html",
  styleUrls: ["./expression-editor.component.scss"],
})
export class ExpressionEditorComponent implements OnDestroy {
  private _subs = new Subscription();
  expression: DataExpression | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ExpressionEditorConfig,
    private _router: Router,
    private _analysisLayoutService: AnalysisLayoutService,
    // private _datasetService: DataSetService,
    // private _expressionService: DataExpressionService,
    public dialogRef: MatDialogRef<ExpressionEditorComponent>
  ) {
    // Make a copy of incoming expression, so we don't edit what's there!
    // this.expression = new DataExpression(
    //     data.expr.id,
    //     data.expr.name,
    //     data.expr.sourceCode,
    //     data.expr.sourceLanguage,
    //     data.expr.comments,
    //     data.expr.shared,
    //     data.expr.creator,
    //     data.expr.createUnixTimeSec,
    //     data.expr.modUnixTimeSec,
    //     data.expr.tags,
    //     data.expr.moduleReferences,
    //     data.expr.recentExecStats
    // );
    this.expression = DataExpression.create(data.expr);
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get isLua(): boolean {
    return this.expression?.sourceLanguage == EXPR_LANGUAGE_LUA;
  }

  get expressionName(): string {
    return this.expression?.name || "";
  }

  set expressionName(val: string) {
    if (this.isEditable && this.expression) {
      this.expression.name = val;
    }
  }

  get editExpression(): string {
    return this.expression?.sourceCode || "";
  }

  set editExpression(val: string) {
    if (this.isEditable && this.expression) {
      this.expression.sourceCode = val;
    }
  }

  get expressionComments(): string {
    return this.expression?.comments || "";
  }

  set expressionComments(val: string) {
    if (this.isEditable && this.expression) {
      this.expression.comments = val;
    }
  }

  get isEditable(): boolean {
    return this.data.allowEdit;
  }

  onExpressionTextChanged(expressionText: string) {
    if (this.expression) {
      this.expression.sourceCode = expressionText;
    }
  }

  navigateToExpression(id: string, scanId: string = this._analysisLayoutService.defaultScanId): void {
    this._router.navigate(["dataset", scanId, "code-editor", id]);
  }

  forceNavigateToCodeEditor(id: string): void {
    this._router.navigateByUrl("/", { skipLocationChange: true }).then(() => this.navigateToExpression(id));
  }

  onOpenSoloEditorView(): void {
    if (this.expression) {
      this.forceNavigateToCodeEditor(this.expression.id);
      this.dialogRef.close(null);
    }
  }

  onCopyToNewExpression() {
    // TODO: Create new expression
    // this._expressionService
    //   .add(
    //     this.expressionName + " (copy)",
    //     this.editExpression,
    //     this.expression.sourceLanguage,
    //     this.expressionComments,
    //     this.expression.tags,
    //     this.expression.moduleReferences
    //   )
    //   .subscribe(expression => {
    //     this.forceNavigateToCodeEditor(expression.id);
    //     this.dialogRef.close(null);
    //   });
  }

  onOK() {
    // Make sure both have data
    if (this.expression == null || this.expression.name.length <= 0 || this.expression.sourceCode.length <= 0) {
      alert("Please enter a name and expression");
      return;
    }

    this.dialogRef.close(new ExpressionEditorConfig(this.expression, this.data.allowEdit));
  }

  onApplyToChart() {
    // Make sure both have data
    if (this.expression == null || this.expression.name.length <= 0 || this.expression.sourceCode.length <= 0) {
      alert("Please enter a name and expression");
      return;
    }

    this.dialogRef.close(new ExpressionEditorConfig(this.expression, this.data.allowEdit, true));
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  get selectedTagIDs(): string[] {
    return this.expression?.tags || [];
  }

  onTagSelectionChanged(tags: string[]): void {
    if (this.expression) {
      this.expression.tags = tags;
    }
  }
}
