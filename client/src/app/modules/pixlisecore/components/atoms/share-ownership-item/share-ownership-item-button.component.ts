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

import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ShareDialogComponent, ShareDialogData, ShareDialogResponse, SharingSubItem } from "./share-dialog/share-dialog.component";
import { ObjectType, OwnershipSummary, objectTypeToJSON } from "src/app/generated-protos/ownership-access";
import { APIDataService, SnackbarService } from "../../../pixlisecore.module";
import { GetOwnershipReq, ObjectEditAccessReq } from "src/app/generated-protos/ownership-access-msgs";
import { catchError, combineLatest, map, Observable, of, switchMap } from "rxjs";
import { ExpressionGroupGetReq } from "../../../../../generated-protos/expression-group-msgs";
import { APICachedDataService } from "../../../services/apicacheddata.service";
import { ExpressionGetReq, ExpressionGetResp } from "../../../../../generated-protos/expression-msgs";
import { DataExpression } from "../../../../../generated-protos/expressions";
import { DataExpressionId } from "../../../../../expression-language/expression-id";

@Component({
  selector: "share-ownership-item-button",
  templateUrl: "./share-ownership-item-button.component.html",
  styleUrls: ["./share-ownership-item-button.component.scss"],
})
export class ShareOwnershipItemButtonComponent implements OnInit {
  @Input() id: string = "";
  @Input() type: ObjectType = ObjectType.OT_EXPRESSION;
  private _ownershipSummary: OwnershipSummary | null = null;

  @Output() onEmitOpenState: EventEmitter<boolean> = new EventEmitter<boolean>();

  isSharedWithOthers: boolean = false;

  constructor(
    private _apiDataService: APIDataService,
    private _snackbarService: SnackbarService,
    private _apiCachedDataService: APICachedDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.isSharedWithOthers = this.ownershipSummary?.sharedWithOthers || false;
  }

  fetchExpressionGroupSubExpressions(): Observable<DataExpression[]> {
    if (!this.id || this.type !== ObjectType.OT_EXPRESSION_GROUP) {
      return of([]);
    }

    return this._apiCachedDataService.getExpressionGroup(ExpressionGroupGetReq.create({ id: this.id })).pipe(
      switchMap(group => {
        let expressionRequests: Observable<ExpressionGetResp>[] = [];
        if (group?.group?.groupItems && group.group?.groupItems.length > 0) {
          group.group.groupItems.forEach(item => {
            if (!DataExpressionId.isPredefinedExpression(item.expressionId)) {
              expressionRequests.push(this._apiCachedDataService.getExpression(ExpressionGetReq.create({ id: item.expressionId })));
            }
          });

          if (expressionRequests.length === 0) {
            return of([]);
          }

          return combineLatest(expressionRequests).pipe(
            map(expressions => {
              return expressions.map(expression => expression.expression).filter(expression => expression !== undefined);
            })
          );
        } else {
          return of([]);
        }
      })
    );
  }

  @Input() set triggerOpen(open: boolean) {
    if (open) {
      this.onOpenShareDialog();

      setTimeout(() => {
        this.onEmitOpenState.emit(false);
      }, 100);
    }
  }

  get ownershipSummary(): OwnershipSummary | null {
    return this._ownershipSummary;
  }

  @Input() set ownershipSummary(summary: OwnershipSummary | null) {
    this._ownershipSummary = summary;
    this.isSharedWithOthers = this.ownershipSummary?.sharedWithOthers || false;
  }

  get sharingTooltip(): string {
    let tooltip = "";

    if (this.isSharedWithOthers) {
      let counts = [
        this.ownershipSummary?.editorGroupCount && `${this.ownershipSummary?.editorGroupCount} group editors`,
        this.ownershipSummary?.viewerGroupCount && `${this.ownershipSummary?.viewerGroupCount} group viewers`,
        this.ownershipSummary?.editorUserCount && `${this.ownershipSummary?.editorUserCount} user editors`,
        this.ownershipSummary?.viewerUserCount && `${this.ownershipSummary?.viewerUserCount} user viewers`,
      ];

      tooltip = `Shared With:\n${counts.filter(count => count).join("\n")}`;
    } else {
      tooltip = "This item is not shared with others.";
    }

    return tooltip;
  }

  getItemTypeName(): string {
    let typeName = objectTypeToJSON(this.type).replace("OT_", "");
    if (typeName.length > 0) {
      typeName = typeName
        .split("_")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }

    return typeName || "Item";
  }

  onOpenShareDialog(): void {
    this._apiDataService
      .sendGetOwnershipRequest(GetOwnershipReq.create({ objectId: this.id, objectType: this.type }))
      .pipe(
        catchError(error => {
          this._snackbarService.openError(`Could not find ownership information for item (${this.id}, ${this.type}).`);
          return of(null);
        }),
        switchMap(res => {
          return this.fetchExpressionGroupSubExpressions().pipe(
            switchMap(subExpressions => {
              if (!res || !res.ownership) {
                return of(null);
              }

              let subItems: SharingSubItem[] = [];
              if (subExpressions.length > 0) {
                subExpressions.forEach(expression => {
                  if (!expression.owner) {
                    return;
                  }

                  subItems.push({
                    id: expression.id,
                    name: expression.name,
                    type: ObjectType.OT_EXPRESSION,
                    typeName: "Expression",
                    ownershipSummary: expression.owner,
                  });
                });
              }

              const dialogConfig = new MatDialogConfig<ShareDialogData>();
              dialogConfig.data = {
                ownershipSummary: this.ownershipSummary,
                ownershipItem: res.ownership,
                typeName: this.getItemTypeName(),
                subItems,
              };

              const dialogRef = this.dialog.open(ShareDialogComponent, dialogConfig);
              return dialogRef.afterClosed();
            })
          );
        }),
        switchMap((sharingChangeResponse: ShareDialogResponse) => {
          if (!sharingChangeResponse) {
            return of(null);
          }

          return this._apiDataService.sendObjectEditAccessRequest(
            ObjectEditAccessReq.create({
              objectId: this.id,
              objectType: this.type,
              addEditors: sharingChangeResponse.addEditors,
              addViewers: sharingChangeResponse.addViewers,
              deleteEditors: sharingChangeResponse.deleteEditors,
              deleteViewers: sharingChangeResponse.deleteViewers,
            })
          );
        }),
        catchError(error => {
          this._snackbarService.openError(`Could not share item (${this.id}, ${this.type})`, error);
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) {
          return;
        }

        let shareCount = 0;
        if (res.ownership?.editors) {
          shareCount += res.ownership.editors.groupIds.length + res.ownership.editors.userIds.length;
        }

        if (res.ownership?.viewers) {
          shareCount += res.ownership.viewers.groupIds.length + res.ownership.viewers.userIds.length;
        }

        this.isSharedWithOthers = shareCount > 1;

        let typeName = this.getItemTypeName();
        this._snackbarService.openSuccess(`${typeName} shared successfully!`);
      });
  }
}
