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

import { Component, Input, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";

// Primarily exists so we can remove the use of these services from the main toolbar, and they are only used when the toolbar
// needs these items shown. For example, this way we don't instantiate a view state service before loading a dataset
@Component({
  selector: "screen-capture-button",
  templateUrl: "./screen-capture-button.component.html",
  styleUrls: ["./screen-capture-button.component.scss"],
})
export class ScreenCaptureButtonComponent implements OnDestroy {
  private _subs = new Subscription();

  @Input() datasetID: string = "";

  isPublicUser: boolean = false;

  constructor(
    // private _viewStateService: ViewStateService,
    // private _notificationService: NotificationService,
    // private _authService: AuthenticationService,
    private dialog: MatDialog
  ) {}
/*
  ngOnInit(): void {
    this._subs.add(
      this._authService.isPublicUser$.subscribe(isPublicUser => {
        this.isPublicUser = isPublicUser;
      })
    );
  }
*/
  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onScreenCapture(): void {
    if (this.isPublicUser) {
      return;
    }

    // User wants to save the current view state. We ask for a name and optionally a collection to add it to
    if (!this.datasetID) {
      alert("Cannot get dataset ID");
      return;
    }
/*
    this._viewStateService.viewStateCollections$.pipe(first()).subscribe(
      (collections: ViewStateCollectionItem[]) => {
        let collectionNames: string[] = [];
        for (let collection of collections) {
          collectionNames.push(collection.name);
        }

        // We have a list of collecitons to show, now create the dialog
        const colName = "Save to Collection (optional)";
        const dialogConfig = new MatDialogConfig();

        let params = new UserPromptDialogParams("Save Workspace", "Save", "Cancel", [
          new UserPromptDialogStringItem("Name", (val: string) => {
            return val.length > 0;
          }),
        ]);

        if (collectionNames.length > 0) {
          let filteredNames = collectionNames.filter((name: string) => !name.startsWith("shared-"));
          params.items.push(new UserPromptDialogDropdownItem(colName, () => true, filteredNames, filteredNames));
        }

        dialogConfig.data = params;

        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

        const handleSaveOK = (name: string, collection: string) => {
          // If user also wanted to save it into a collection...
          if (collection) {
            // Save to the named one
            this._viewStateService.addViewStateToCollection(this.datasetID, [name], collection).subscribe(
              () => {
                this._notificationService.addNotification("Workspace saved: " + name + " and added to collection: " + collection);
              },
              err => {
                alert("Saved workspace, but failed to add to collection: " + collection);
              }
            );
          } else {
            // We're done, alert here
            this._notificationService.addNotification("Workspace saved: " + name);
          }
        };

        dialogRef.afterClosed().subscribe((result: UserPromptDialogResult) => {
          // Might've cancelled!
          if (result) {
            // Save it
            let name = result.enteredValues.get("Name");
            let collection = result.enteredValues.get(colName);

            this._viewStateService.saveViewState(this.datasetID, name, false).subscribe(
              () => {
                handleSaveOK(name, collection);
              },
              err => {
                // It may have failed because there is already one with this name. Here we allow the user
                // to force-overwrite
                if (err["status"] == 409) {
                  // 409=Conflict
                  if (confirm("A workspace named " + name + " already exists. Are you sure you want to overwrite it?")) {
                    this._viewStateService.saveViewState(this.datasetID, name, true).subscribe(
                      () => {
                        handleSaveOK(name, collection);
                      },
                      err => {
                        alert("Failed to save workspace: " + name);
                      }
                    );
                  }
                } else {
                  alert("Failed to save workspace: " + name);
                }
              }
            );
          }
        });
      },
      err => {
        alert("Failed to query collections");
      }
    );*/
  }
}
