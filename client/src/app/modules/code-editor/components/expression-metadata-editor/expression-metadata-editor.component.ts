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
// import { DataExpression } from "src/app/models/Expression";
// import { DataModuleService, DataModuleVersion } from "src/app/services/data-module.service";
// import { PushButtonStyle } from "../atoms/buttons/push-button/push-button.component";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { DOIMetadata, DOIPublishData, DOIPublishDialog } from "../doi-publish-dialog/doi-publish-dialog.component";
import { DataModuleVersion } from "src/app/generated-protos/modules";
import { PushButtonStyle } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { DataExpression } from "src/app/generated-protos/expressions";
import { TagType } from "src/app/modules/tags/models/tag.model";
import { AnalysisLayoutService } from "../../../analysis/analysis.module";
import { SnackbarService } from "../../../pixlisecore/pixlisecore.module";

type MajorGroupedRelease = {
  majorVersion: DataModuleVersion | null;
  majorVersionGroup: string;
  minorVersions: DataModuleVersion[];
};

export type DiffVersions = {
  id: string;
  oldVersion: DataModuleVersion | null;
  newVersion: DataModuleVersion | null;
};

@Component({
  selector: "expression-metadata-editor",
  templateUrl: "./expression-metadata-editor.component.html",
  styleUrls: ["./expression-metadata-editor.component.scss"],
})
export class ExpressionMetadataEditorComponent implements OnInit {
  @Input() title: string = "Metadata";
  @Input() buttonStyle: PushButtonStyle = "normal";

  @Input() expression: DataExpression = DataExpression.create({});
  @Input() isModule: boolean = false;
  @Input() isSharedByOtherUser: boolean = false;

  private _currentVersion: DataModuleVersion = DataModuleVersion.create();
  @Input() versions: DataModuleVersion[] = [];

  @Input() showDiff: boolean = false;
  @Input() isShowingDifference: boolean = false;

  @Output() changeName: EventEmitter<string> = new EventEmitter<string>();
  @Output() changeDescription: EventEmitter<string> = new EventEmitter<string>();
  @Output() changeTags: EventEmitter<string[]> = new EventEmitter<string[]>();

  @Output() updateMetadata: EventEmitter<void> = new EventEmitter<void>();
  @Output() onShowDiff: EventEmitter<DiffVersions> = new EventEmitter<DiffVersions>();
  @Output() publishDOI: EventEmitter<DOIMetadata> = new EventEmitter<DOIMetadata>();

  private _fetched: boolean = false;
  private _releaseNotes: MajorGroupedRelease[] = [];

  public latestRelease: DataModuleVersion = DataModuleVersion.create();

  constructor(
    // private _moduleService: DataModuleService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _dialog: MatDialog
  ) {
    this.groupReleaseNotes();
  }

  ngOnInit(): void {
    this.groupReleaseNotes();
    // this._moduleService.modulesUpdated$.subscribe(() => {
    //   this.groupReleaseNotes();
    // });
  }

  @Input() set currentVersion(version: DataModuleVersion | null) {
    this._currentVersion = version ? version : DataModuleVersion.create();
    this.groupReleaseNotes();
  }

  get currentVersion(): DataModuleVersion {
    return this._currentVersion;
  }

  onClose(): void {
    this.updateMetadata.emit();
  }

  showDiffClicked(): void {
    if (this.isShowingDifference) {
      this.onShowDiff.emit({
        id: this.expression.id,
        oldVersion: this.currentVersion,
        newVersion: null,
      });
    } else {
      this.onShowDiff.emit({
        id: this.expression.id,
        oldVersion: this.currentVersion,
        newVersion: this.latestRelease,
      });
    }
  }

  get tagType(): TagType {
    return (this.isModule ? "module" : "expression") as TagType;
  }

  get doiBadge(): string {
    return "";
    // if (this.isModule) {
    //   return this.currentVersion?.doiMetadata?.doiBadge || "";
    // } else {
    //   return this.expression?.doiMetadata?.doiBadge || "";
    // }
  }

  get doiLink(): string {
    return "";
    // if (this.isModule) {
    //   return this.currentVersion?.doiMetadata?.doiLink || "";
    // } else {
    //   return this.expression?.doiMetadata?.doiLink || "";
    // }
  }

  get doi(): string {
    return "";
    // if (this.isModule) {
    //   return this.currentVersion?.doiMetadata?.doi || "";
    // } else {
    //   return this.expression?.doiMetadata?.doi || "";
    // }
  }

  get isEditable(): boolean {
    return this.expression?.owner?.canEdit || false;
  }

  get name(): string {
    return this.expression.name;
  }

  set name(value: string) {
    this.expression.name = value;
    this.changeName.emit(this.expression.name);
  }

  get description(): string {
    return this.expression.comments;
  }

  set description(value: string) {
    this.expression.comments = value;
    this.changeDescription.emit(this.expression.comments);
  }

  get tags(): string[] {
    return this.expression.tags;
  }

  set tags(value: string[]) {
    this.expression.tags = value;
  }

  openDOIFormDialog(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.panelClass = "panel";
    dialogConfig.disableClose = true;

    let { major, minor, patch } = this.currentVersion?.version || {};
    let versionString = `${major}.${minor}.${patch}`;

    dialogConfig.data = new DOIPublishData(this.expression, this.isModule, versionString);
    const dialogRef = this._dialog.open(DOIPublishDialog, dialogConfig);

    dialogRef.afterClosed().subscribe(
      (metadata: DOIMetadata) => {
        if (metadata) {
          this.publishDOI.emit(metadata);
        }
      },
      err => {
        console.error(err);
      }
    );
  }

  onTagSelectionChanged(tags: string[]): void {
    this.tags = tags;
    this.changeTags.emit(this.tags);
  }

  get releaseNotes(): MajorGroupedRelease[] {
    if (!this._fetched && this.isModule && this.versions.length > 0) {
      this._fetched = true;
      this.groupReleaseNotes();
    }
    return this._releaseNotes;
  }

  set releaseNotes(value: MajorGroupedRelease[]) {
    this._releaseNotes = value;
  }

  groupReleaseNotes(): void {
    let majorRelease: Record<string, MajorGroupedRelease> = {};
    this.versions.forEach(specificVersion => {
      //   let versionParts = specificVersion.version.split(".");
      //   let majorVersion = versionParts[0];
      //   let minorVersion = versionParts[1];
      let { major, minor, patch } = specificVersion?.version || {};

      let isMinorRelease = patch === 0;
      let isMajorRelease = isMinorRelease && minor === 0;

      let majorVersionGroup = !isMajorRelease ? major || 0 : `${Number(major || 0) - 1}`;

      if (isMajorRelease) {
        majorRelease[majorVersionGroup] = {
          majorVersion: specificVersion,
          majorVersionGroup: `${majorVersionGroup}`,
          minorVersions: majorRelease[majorVersionGroup]?.minorVersions || [],
        };
      } else if (isMinorRelease && majorRelease[majorVersionGroup]) {
        majorRelease[majorVersionGroup].minorVersions.push(specificVersion);
      } else if (isMinorRelease) {
        majorRelease[majorVersionGroup] = {
          majorVersion: null,
          majorVersionGroup: `${majorVersionGroup}`,
          minorVersions: [specificVersion],
        };
      }
    });

    Object.entries(majorRelease).forEach(([majorVersionGroup, majorRelease]) => {
      majorRelease.minorVersions = majorRelease.minorVersions.sort((a, b) => {
        // let aMinorVersion = a.version.split(".")[1];
        // let bMinorVersion = b.version.split(".")[1];
        return Number(b.version?.minor) - Number(a.version?.minor);
      });
    });

    this.releaseNotes = Object.values(majorRelease).sort((a, b) => {
      let aMajorVersion = a.majorVersionGroup;
      let bMajorVersion = b.majorVersionGroup;
      return Number(bMajorVersion) - Number(aMajorVersion);
    });

    if (this.releaseNotes.length > 0) {
      if (this.releaseNotes[0].majorVersion) {
        this.latestRelease = this.releaseNotes[0].majorVersion;
      } else {
        this.latestRelease = this.releaseNotes[0].minorVersions[0];
      }
    }
  }

  getVersionDisplayName(version: DataModuleVersion): string {
    // let versionParts = version.version.split(".");
    // let majorVersion = versionParts[0];
    // let minorVersion = versionParts[1];

    return `${version.version?.major}.${version.version?.minor}`;
  }

  getVersionReleaseDate(version: DataModuleVersion): string {
    let unixTimeSec = version.timeStampUnixSec || 0;

    return new Date(unixTimeSec * 1000).toLocaleDateString();
  }

  clearCacheForSelectedExpression(): void {
    if (!this.expression?.id) {
      return;
    }

    this._analysisLayoutService.clearExpressionFromCache(this.expression.id).subscribe(count => {
      console.log(`Cleared ${count} cached items for expression ${this.expression.id}`);
      this._snackService.openSuccess("Cleared cache for selected expression", `Cleared ${count} cached items for expression ${this.expression?.id}`);
    });
  }
}
