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

import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { DataExpression } from "src/app/generated-protos/expressions";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";
import { DOIPublishData, DOIPublishDialog } from "../doi-publish-dialog/doi-publish-dialog.component";
import { DOIMetadata } from "src/app/generated-protos/doi";
import { SemanticVersion, VersionField } from "src/app/generated-protos/version";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";

export class ModuleReleaseDialogData {
  constructor(
    public id: string,
    public title: string,
    public currentVersion: SemanticVersion,
    public sourceCode: string,
    public tags: string[],
    public moduleVersion: DataModuleVersion,
    public moduleAsExpression: DataExpression
  ) {}
}

export type ModuleReleaseDialogResponse = {
  module?: DataModule;
};

@Component({
  selector: "app-module-release-dialog",
  templateUrl: "./module-release-dialog.component.html",
  styleUrls: ["./module-release-dialog.component.scss"],
})
export class ModuleReleaseDialogComponent {
  isMinorRelease: boolean = true;
  releaseNotes: string = "";
  shouldUpdateDOI: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ModuleReleaseDialogData,
    public dialogRef: MatDialogRef<ModuleReleaseDialogComponent, ModuleReleaseDialogResponse>,
    public dialog: MatDialog,
    private _expressionsService: ExpressionsService,
    private _snackbarService: SnackbarService
  ) {
    this.releaseNotes = data?.moduleVersion?.comments || "";
  }
  onCancel(): void {
    this.dialogRef.close({});
  }

  openDOIFormDialog() {
    this.shouldUpdateDOI = true;

    const dialogConfig = new MatDialogConfig();
    dialogConfig.panelClass = "panel";
    dialogConfig.disableClose = true;

    dialogConfig.data = new DOIPublishData(this.data.moduleAsExpression, true, this.newVersion);
    const dialogRef = this.dialog.open(DOIPublishDialog, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: (metadata: DOIMetadata) => {
        if (metadata) {
          // this.data.moduleAsExpression.doiMetadata = metadata;
        }
      },
      error: err => {
        console.error(err);
      },
    });
  }

  onRelease(): void {
    let versionType = this.isMinorRelease ? VersionField.MV_MINOR : VersionField.MV_MAJOR;
    this.data.moduleVersion.comments = this.releaseNotes;
    this._expressionsService.writeModuleVersionAsync(this.data.id, this.data.moduleVersion, versionType).subscribe({
      next: module => {
        this._snackbarService.openSuccess("Module saved successfully");
        this.dialogRef.close({ module });
      },
      error: err => {
        this._snackbarService.openError("Failed to save module", err);
        this.dialogRef.close({});
      },
    });
    // let versionToFetch = this.data.moduleVersion.version;
    // if (this.data.currentVersion) {
    //   let [major, minor] = this.newVersion.split(".");
    //   versionToFetch = SemanticVersion.create({ major: parseInt(major), minor: parseInt(minor), patch: 0 });
    // }

    // if (!versionToFetch) {
    //   versionToFetch = SemanticVersion.create({ major: 0, minor: 0, patch: 1 });
    // }
    // this.dialogRef.close(versionToFetch);

    // let doiMetadata = this.shouldUpdateDOI && this.data?.moduleAsExpression?.doiMetadata ? this.data.moduleAsExpression.doiMetadata : null;
    // if(this.isMinorRelease)
    // {
    //     this._moduleService.releaseMinorVersion(this.data.id, this.data.sourceCode, this.releaseNotes, this.data.tags, doiMetadata).subscribe(
    //         (result) =>
    //         {
    //             let module = this._moduleService.readSpecificVersionModule(result);
    //             this.dialogRef.close(module);
    //         },
    //         (error) =>
    //         {
    //             alert("Failed to release minor version");
    //             console.error("Failed to release minor version", this.data.id, error);
    //         }
    //     );
    // }
    // else
    // {
    //     this._moduleService.releaseMajorVersion(this.data.id, this.data.sourceCode, this.releaseNotes, this.data.tags, doiMetadata).subscribe(
    //         (result) =>
    //         {
    //             let module = this._moduleService.readSpecificVersionModule(result);
    //             this.dialogRef.close(module);
    //         },
    //         (error) =>
    //         {
    //             alert("Failed to release major version");
    //             console.error("Failed to release major version", this.data.id, error);
    //         }
    //     );
    // }
  }

  onToggleUpdateDOI(): void {
    this.shouldUpdateDOI = !this.shouldUpdateDOI;
    if (this.shouldUpdateDOI) {
      this.openDOIFormDialog();
    }
  }

  get newVersion(): string {
    if (!this.data?.currentVersion) {
      return "N/A";
    }

    let { major, minor } = this.data.currentVersion;
    if (this.isMinorRelease) {
      minor++;
    } else {
      major++;
      minor = 0;
    }

    return `${major}.${minor}`;
  }
}
