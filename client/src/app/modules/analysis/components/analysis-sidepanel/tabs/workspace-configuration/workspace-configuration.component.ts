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

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { map, Subscription, switchMap } from "rxjs";
import { ActivatedRoute } from "@angular/router";
import { ScreenConfiguration } from "../../../../../../generated-protos/screen-configuration";
import { getScanIdFromWorkspaceId } from "../../../../../../utils/utils";
import { ObjectType } from "../../../../../../generated-protos/ownership-access";
import { SnackbarService } from "../../../../../pixlisecore/pixlisecore.module";

@Component({
  selector: "workspace-configuration",
  templateUrl: "./workspace-configuration.component.html",
  styleUrls: ["./workspace-configuration.component.scss"],
})
export class WorkspaceConfigurationTabComponent implements OnInit, OnDestroy {
  @ViewChild("descriptionEditMode") descriptionEditMode!: ElementRef;

  private _subs: Subscription = new Subscription();

  public objectType: ObjectType = ObjectType.OT_SCREEN_CONFIG;

  public placeholderName: string = "Workspace Name";
  public workspaceName: string = "";
  public workspaceDescription: string = "";
  public workspaceTags: string[] = [];

  public descriptionModes: string[] = ["Edit", "View"];
  public descriptionMode: string = "View";

  private _tagsChanged: boolean = false;

  public screenConfig: ScreenConfiguration | null = null;

  constructor(
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackbarService: SnackbarService
  ) {}

  get hasWorkspaceChanged(): boolean {
    return this.workspaceName !== this.screenConfig?.name || this.workspaceDescription !== this.screenConfig?.description || this._tagsChanged;
  }

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$
        .pipe(
          switchMap(screenConfig => {
            this.screenConfig = screenConfig;
            this.workspaceName = screenConfig.name;
            this.workspaceDescription = screenConfig.description;
            this.workspaceTags = [...screenConfig.tags];

            return this._analysisLayoutService.availableScans$.pipe(
              map(scans => {
                let scanIdFromWorkspace = this.screenConfig?.id || "";
                let scanId = getScanIdFromWorkspaceId(scanIdFromWorkspace);

                if (scanId) {
                  let scan = scans.find(s => s.id === scanId);
                  if (scan) {
                    let sol = scan?.meta?.["Sol"] || "N/A";
                    this.placeholderName = `SOL-${sol}: ${scan?.title || "N/A"}`;
                  }
                }
              })
            );
          })
        )
        .subscribe()
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  switchToEditMode(): void {
    this.descriptionMode = "Edit";
    setTimeout(() => this.setCursorToEnd(), 0);
  }

  setCursorToEnd() {
    if (this.descriptionEditMode && this.descriptionEditMode.nativeElement) {
      const textarea = this.descriptionEditMode.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }

  onTagChange(tags: string[]): void {
    this._tagsChanged = this.workspaceTags.length !== tags.length || this.workspaceTags.some((tag, i) => tag !== tags[i]);
    this.workspaceTags = tags;
  }

  onReset(): void {
    if (this.screenConfig) {
      this.workspaceName = this.screenConfig.name;
      this.workspaceDescription = this.screenConfig.description;
      this.workspaceTags = this.screenConfig.tags;
    }
  }

  onSave(): void {
    if (this.screenConfig) {
      this.screenConfig.name = this.workspaceName || this.placeholderName;
      this.screenConfig.description = this.workspaceDescription;
      this.screenConfig.tags = this.workspaceTags;
      this._tagsChanged = false;

      this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);
      this.descriptionMode = "View";
      this._snackbarService.openSuccess("Workspace configuration saved!");
    }
  }
}