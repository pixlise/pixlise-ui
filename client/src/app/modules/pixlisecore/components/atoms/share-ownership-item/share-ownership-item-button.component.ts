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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ShareDialogComponent, ShareDialogData, ShareDialogResponse } from "./share-dialog/share-dialog.component";
import { ObjectType, OwnershipSummary, objectTypeToJSON } from "src/app/generated-protos/ownership-access";
import { APIDataService, SnackbarService } from "../../../pixlisecore.module";
import { GetOwnershipReq, ObjectEditAccessReq } from "src/app/generated-protos/ownership-access-msgs";

@Component({
  selector: "share-ownership-item-button",
  templateUrl: "./share-ownership-item-button.component.html",
  styleUrls: ["./share-ownership-item-button.component.scss"],
})
export class ShareOwnershipItemButtonComponent implements OnInit {
  @Input() id: string = "";
  @Input() type: ObjectType = ObjectType.OT_EXPRESSION;
  @Input() ownershipSummary: OwnershipSummary | null = null;

  @Output() onEmitOpenState: EventEmitter<boolean> = new EventEmitter<boolean>();

  isSharedWithOthers: boolean = false;

  constructor(
    private _apiDataService: APIDataService,
    private _snackbarService: SnackbarService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.isSharedWithOthers = this.ownershipSummary?.sharedWithOthers || false;
  }

  @Input() set triggerOpen(open: boolean) {
    if (open) {
      this.onOpenShareDialog();

      setTimeout(() => {
        this.onEmitOpenState.emit(false);
      }, 100);
    }
  }

  get sharingTooltip(): string {
    let tooltip = "";

    if (this.isSharedWithOthers) {
      let counts = [
        `${this.ownershipSummary?.editorGroupCount || 0} group editors`,
        `${this.ownershipSummary?.viewerGroupCount || 0} group viewers`,
        `${this.ownershipSummary?.editorUserCount || 0} user editors`,
        `${this.ownershipSummary?.viewerUserCount || 0} user viewers`,
      ];

      tooltip = `Shared With:\n${counts.join("\n")}`;
    } else {
      tooltip = "This item is not shared with others.";
    }

    return tooltip;
  }

  onOpenShareDialog(): void {
    this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId: this.id, objectType: this.type })).subscribe(res => {
      if (!res || !res.ownership) {
        this._snackbarService.openError(`Could not find ownership information for item (${this.id}, ${this.type}).`);
        return;
      }

      // Convert the object type to a human-readable string
      let typeName = objectTypeToJSON(this.type).replace("OT_", "");
      if (typeName.length > 0) {
        typeName = typeName
          .split("_")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
      }

      const dialogConfig = new MatDialogConfig<ShareDialogData>();
      dialogConfig.data = {
        ownershipItem: res.ownership,
        typeName,
      };

      let dialogRef = this.dialog.open(ShareDialogComponent, dialogConfig);
      dialogRef.afterClosed().subscribe((sharingChangeResponse: ShareDialogResponse) => {
        if (!sharingChangeResponse) {
          return;
        }

        this._apiDataService
          .sendObjectEditAccessRequest(
            ObjectEditAccessReq.create({
              objectId: this.id,
              objectType: this.type,
              addEditors: sharingChangeResponse.addEditors,
              addViewers: sharingChangeResponse.addViewers,
              deleteEditors: sharingChangeResponse.deleteEditors,
              deleteViewers: sharingChangeResponse.deleteViewers,
            })
          )
          .subscribe({
            next: res => {
              let shareCount = 0;
              if (res.ownership?.editors) {
                shareCount += res.ownership.editors.groupIds.length + res.ownership.editors.userIds.length;
              }

              if (res.ownership?.viewers) {
                shareCount += res.ownership.viewers.groupIds.length + res.ownership.viewers.userIds.length;
              }

              this.isSharedWithOthers = shareCount > 1;

              this._snackbarService.openSuccess(`Item shared successfully!`);
            },
            error: err => {
              this._snackbarService.openError(`Could not share item (${this.id}, ${this.type})`, err);
            },
          });
      });
    });
  }
}
