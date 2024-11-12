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
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { combineLatest, map, of, Subscription, switchMap } from "rxjs";
import { FullScreenLayout, ScreenConfiguration } from "../../../../../../generated-protos/screen-configuration";
import { getScanIdFromWorkspaceId } from "../../../../../../utils/utils";
import { ObjectType, OwnershipSummary, UserGroupList } from "../../../../../../generated-protos/ownership-access";
import { APIDataService, SnackbarService } from "../../../../../pixlisecore/pixlisecore.module";
import { NavigationTab } from "../../../../services/analysis-layout.service";
import { TabLinks } from "../../../../../../models/TabLinks";
import { ActivatedRoute } from "@angular/router";
import {
  ShareDialogComponent,
  ShareDialogData,
  ShareDialogResponse,
  SharingSubItem,
} from "../../../../../pixlisecore/components/atoms/share-ownership-item/share-dialog/share-dialog.component";
import { GetOwnershipReq, GetOwnershipResp, ObjectEditAccessReq } from "../../../../../../generated-protos/ownership-access-msgs";
import { APICachedDataService } from "../../../../../pixlisecore/services/apicacheddata.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../../../../generated-protos/roi-msgs";
import { ExpressionGetReq, ExpressionGetResp } from "../../../../../../generated-protos/expression-msgs";
import { QuantGetReq, QuantGetResp } from "../../../../../../generated-protos/quantification-retrieval-msgs";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { ExpressionGroupGetResp } from "../../../../../../generated-protos/expression-group-msgs";
import { WorkspaceService } from "../../../../services/workspaces.service";

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

  public descriptionModes: string[] = ["View", "Edit"];
  public descriptionMode: string = "View";

  private _tagsChanged: boolean = false;

  public screenConfig: ScreenConfiguration | null = null;
  public snapshots: ScreenConfiguration[] = [];
  public reviewerSnapshots: ScreenConfiguration[] = [];

  public openTabs: NavigationTab[] = [];
  public newTabName: string = "";
  public editingTabIndex: number | null = null;

  queryParam: Record<string, string> = {};

  public activeConfigurationTab: "workspace" | "snapshots" | "review" = "workspace";

  public builtInTabs: NavigationTab[] = [
    { icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: TabLinks.browse },
    { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: TabLinks.codeEditor },
    { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: TabLinks.maps },
  ];

  constructor(
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _workspaceService: WorkspaceService,
    private _snackbarService: SnackbarService,
    private _route: ActivatedRoute,
    private _apiDataService: APIDataService,
    private _apiCachedDataService: APICachedDataService
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

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$
        .pipe(
          switchMap(screenConfig => {
            return this._workspaceService.fetchWorkspaceSnapshots(screenConfig.id);
          })
        )
        .subscribe(snapshots => {
          this.snapshots = snapshots;
          this.reviewerSnapshots = snapshots.filter(snapshot => !!snapshot.reviewerId);
        })
    );

    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.queryParam = { ...params };
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfigurationTabs$.subscribe(tabs => {
        this.openTabs = tabs;
        this.newTabName = "";
        this.editingTabIndex = null;

        this.openTabs.forEach(tab => {
          if (tab.url === TabLinks.analysis && tab.params && Object.keys(tab.params).length > 0) {
            tab.active = Object.keys(tab.params).every(key => this.queryParam[key] == tab?.params?.[key]);
          }
        });
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  switchToEditMode(): void {
    this.descriptionMode = "Edit";
    setTimeout(() => this.setCursorToEnd(), 0);
  }

  canDeleteTab(tab: NavigationTab): boolean {
    let canDeleteTab = ![TabLinks.browse, TabLinks.codeEditor, TabLinks.maps].includes(tab?.url) && this.canEditScreenConfig;
    if (!canDeleteTab) {
      return false;
    }

    return this._analysisLayoutService.activeScreenConfigurationTabs$.value.filter(tab => tab.url === TabLinks.analysis).length > 1;
  }

  get canEditScreenConfig(): boolean {
    return Boolean(this._analysisLayoutService.activeScreenConfiguration$.value.owner?.canEdit);
  }

  onEditTab(tab: NavigationTab, index: number): void {
    if (!this.canEditTab(tab) || this.editingTabIndex === index || index < 0) {
      return;
    }

    this.editingTabIndex = index;
    this.newTabName = tab.label || "";
  }

  onDuplicateTab(tab: NavigationTab, index: number): void {
    if (!this.canEditTab(tab) || index < 0 || !this.screenConfig) {
      return;
    }

    let newTab = { ...tab };
    newTab.label = `${newTab.label} (Copy)`;
    let screenLayout = this.getLayoutFromTab(tab);
    if (screenLayout) {
      let newScreenLayout = { ...screenLayout };
      newScreenLayout.tabName = newTab.label;

      // Insert the new layout after the current layout
      let tabIndex = this.screenConfig.layouts.indexOf(screenLayout);
      this.screenConfig.layouts.splice(tabIndex + 1, 0, newScreenLayout);
      this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);
    }
  }

  saveTabName(tab: NavigationTab, index: number): void {
    if (this.editingTabIndex !== index || !this.newTabName || !this.screenConfig) {
      return;
    }

    tab.label = this.newTabName;

    let screenLayout = this.getLayoutFromTab(tab);
    if (screenLayout) {
      screenLayout.tabName = this.newTabName;
      this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);
    }

    this.editingTabIndex = null;
    this.newTabName = "";
  }

  cancelEditTabName(): void {
    this.editingTabIndex = null;
    this.newTabName = "";
  }

  canEditTab(tab: NavigationTab): boolean {
    return ![TabLinks.browse, TabLinks.codeEditor, TabLinks.maps].includes(tab?.url) && this.canEditScreenConfig;
  }

  getLayoutFromTab(tab: NavigationTab): FullScreenLayout | null {
    return this._analysisLayoutService.getLayoutFromTab(tab);
  }

  checkIsTabHidden(tab: NavigationTab): boolean {
    if (tab.url !== TabLinks.analysis) {
      let visibilityMap = {
        [TabLinks.browse]: this.screenConfig?.browseTabHidden,
        [TabLinks.codeEditor]: this.screenConfig?.codeEditorTabHidden,
        [TabLinks.maps]: this.screenConfig?.elementMapsTabHidden,
      };

      return visibilityMap[tab.url] || false;
    }

    return this.getLayoutFromTab(tab)?.hidden || false;
  }

  onToggleTabVisibility(tab: NavigationTab) {
    if (!this.screenConfig) {
      return;
    }

    if (tab.url !== TabLinks.analysis) {
      this.screenConfig.browseTabHidden = tab.url === TabLinks.browse ? !this.screenConfig.browseTabHidden : this.screenConfig.browseTabHidden;
      this.screenConfig.codeEditorTabHidden = tab.url === TabLinks.codeEditor ? !this.screenConfig.codeEditorTabHidden : this.screenConfig.codeEditorTabHidden;
      this.screenConfig.elementMapsTabHidden = tab.url === TabLinks.maps ? !this.screenConfig.elementMapsTabHidden : this.screenConfig.elementMapsTabHidden;

      this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);
      return;
    }

    let tabIndex = tab?.params?.["tab"];
    if (tabIndex !== undefined) {
      let index = parseInt(tabIndex);
      let screenLayout = this.screenConfig?.layouts[index];
      if (screenLayout) {
        screenLayout.hidden = !screenLayout.hidden;

        this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);
      }
    }
  }

  onCloseTab(tab: NavigationTab) {
    if (!this.screenConfig) {
      return;
    }

    let currentTab = this.queryParam["tab"];
    let tabIndex = tab?.params?.["tab"];

    if (tabIndex !== undefined) {
      let index = parseInt(tabIndex);
      this.screenConfig.layouts.splice(index, 1);

      this._analysisLayoutService.writeScreenConfiguration(this.screenConfig);

      if (currentTab !== undefined) {
        let currentTabIndex = parseInt(currentTab);
        if (currentTabIndex > index) {
          this._analysisLayoutService.setActiveScreenConfigurationTabIndex(Math.max(currentTabIndex - 1, 0));
        }
      }
    }
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

  onDeleteSnapshot(snapshot: ScreenConfiguration): void {
    if (!snapshot?.id) {
      return;
    }

    this._analysisLayoutService.deleteScreenConfiguration(snapshot.id, () => {
      this._workspaceService.fetchWorkspaceSnapshots(this.screenConfig!.id).subscribe(snapshots => {
        this.snapshots = snapshots;
        this.reviewerSnapshots = snapshots.filter(snapshot => !!snapshot.reviewerId);
      });
    });
  }

  private updateSnapshotPermissions(id: string, sharingChangeResponse: ShareDialogResponse, workspaceOwnershipResp: GetOwnershipResp): void {
    // We need to share the new workspace snapshot with the same permissions as the original workspace
    let editors: UserGroupList = sharingChangeResponse.addEditors;
    let viewers: UserGroupList = sharingChangeResponse.addViewers;

    // Add back the original editors/viewers as long as they're not in the delete list
    if (sharingChangeResponse.deleteEditors) {
      workspaceOwnershipResp.ownership?.editors?.groupIds.forEach(groupId => {
        if (!sharingChangeResponse.deleteEditors?.groupIds.includes(groupId)) {
          editors.groupIds.push(groupId);
        }
      });

      workspaceOwnershipResp.ownership?.editors?.userIds.forEach(userId => {
        if (!sharingChangeResponse.deleteEditors?.userIds.includes(userId)) {
          editors.userIds.push(userId);
        }
      });

      workspaceOwnershipResp.ownership?.viewers?.groupIds.forEach(groupId => {
        if (!sharingChangeResponse.deleteViewers?.groupIds.includes(groupId)) {
          viewers.groupIds.push(groupId);
        }
      });

      workspaceOwnershipResp.ownership?.viewers?.userIds.forEach(userId => {
        if (!sharingChangeResponse.deleteViewers?.userIds.includes(userId)) {
          viewers.userIds.push(userId);
        }
      });
    }

    this._apiDataService
      .sendObjectEditAccessRequest(
        ObjectEditAccessReq.create({
          objectId: id,
          objectType: this.objectType,
          addEditors: editors,
          addViewers: viewers,
          deleteEditors: UserGroupList.create({}),
          deleteViewers: UserGroupList.create({}),
        })
      )
      .pipe(editResp => {
        return this._workspaceService.fetchWorkspaceSnapshots(this.screenConfig!.id);
      })
      .subscribe(snapshots => {
        this.snapshots = snapshots;
        this.reviewerSnapshots = snapshots.filter(snapshot => !!snapshot.reviewerId);
      });
  }

  onShareSnapshot(existingSnapshot: ScreenConfiguration | null = null, isReviewerSnapshot: boolean = false): void {
    let objectId = existingSnapshot?.id || this.screenConfig?.id;
    let ownershipSummary = existingSnapshot?.owner || this.screenConfig?.owner;

    this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId, objectType: this.objectType })).subscribe(workspaceOwnershipResp => {
      if (!workspaceOwnershipResp || !workspaceOwnershipResp.ownership || !objectId || !ownershipSummary) {
        this._snackbarService.openError(`Could not find ownership information for item (${this.screenConfig?.id}, ${this.objectType}).`);
        return;
      }

      let workspaceId = this.screenConfig?.id || "";
      let roiIds = this._analysisLayoutService.getLoadedROIIDsFromActiveScreenConfiguration();
      let expressionIds = this._analysisLayoutService.getLoadedExpressionIDsFromActiveScreenConfiguration();
      let expressionGroupIds = this._analysisLayoutService.getLoadedExpressionGroupIDsFromActiveScreenConfiguration();
      let quantIds = this._analysisLayoutService.getLoadedQuantificationIDsFromActiveScreenConfiguration();

      let workspaceSubItem: SharingSubItem = {
        id: workspaceId,
        type: ObjectType.OT_SCREEN_CONFIG,
        typeName: "Workspace",
        name: this.workspaceName || this.placeholderName || "",
        ownershipSummary: ownershipSummary,
        ownershipItem: workspaceOwnershipResp.ownership,
      };

      let roiRequests = roiIds.map(roiId => {
        let ownershipReq = this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId: roiId, objectType: ObjectType.OT_ROI }));
        let itemReq = this._apiCachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId }));
        return ownershipReq.pipe(switchMap(ownershipRes => itemReq.pipe(map(itemRes => ({ ownership: ownershipRes.ownership, item: itemRes })))));
      });

      let expressionRequests = expressionIds.map(expressionId => {
        let ownershipReq = this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId: expressionId, objectType: ObjectType.OT_EXPRESSION }));
        let itemReq = this._apiCachedDataService.getExpression(ExpressionGetReq.create({ id: expressionId }));
        return ownershipReq.pipe(switchMap(ownershipRes => itemReq.pipe(map(itemRes => ({ ownership: ownershipRes.ownership, item: itemRes })))));
      });

      let expressionGroupRequests = expressionGroupIds.map(expressionGroupId => {
        let ownershipReq = this._apiDataService.sendGetOwnershipRequest(
          GetOwnershipReq.create({ objectId: expressionGroupId, objectType: ObjectType.OT_EXPRESSION_GROUP })
        );
        let itemReq = this._apiCachedDataService.getExpressionGroup(ExpressionGetReq.create({ id: expressionGroupId }));
        return ownershipReq.pipe(switchMap(ownershipRes => itemReq.pipe(map(itemRes => ({ ownership: ownershipRes.ownership, item: itemRes })))));
      });

      let quantRequests = quantIds.map(quantId => {
        let ownershipReq = this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId: quantId, objectType: ObjectType.OT_QUANTIFICATION }));
        let itemReq = this._apiCachedDataService.getQuant(QuantGetReq.create({ quantId }));
        return ownershipReq.pipe(switchMap(ownershipRes => itemReq.pipe(map(itemRes => ({ ownership: ownershipRes.ownership, item: itemRes })))));
      });

      let requests = [...roiRequests, ...expressionRequests, ...expressionGroupRequests, ...quantRequests];
      combineLatest(requests).subscribe(res => {
        let subItems: SharingSubItem[] = res.map(({ ownership, item }, i) => {
          if (!ownership || !item) {
            return {
              id: "",
              type: ObjectType.OT_SCREEN_CONFIG,
              typeName: "Workspace",
              name: "",
              ownershipSummary: OwnershipSummary.create({}),
            } as SharingSubItem;
          }

          if (i < roiRequests.length) {
            let roiResp = item as RegionOfInterestGetResp;
            return {
              id: roiResp.regionOfInterest?.id || "",
              type: ObjectType.OT_ROI,
              typeName: "Region of Interest",
              name: roiResp.regionOfInterest?.name || "",
              ownershipSummary: roiResp.regionOfInterest?.owner,
              ownershipItem: ownership,
            } as SharingSubItem;
          } else if (i < roiRequests.length + expressionGroupRequests.length) {
            let expressionGroupResp = item as ExpressionGroupGetResp;
            return {
              id: expressionGroupResp.group?.id || "",
              type: ObjectType.OT_EXPRESSION_GROUP,
              typeName: "Expression Group",
              name: expressionGroupResp.group?.name || "",
              ownershipSummary: expressionGroupResp.group?.owner,
              ownershipItem: ownership,
            } as SharingSubItem;
          } else if (i < roiRequests.length + expressionGroupRequests.length + expressionRequests.length) {
            let expressionResp = item as ExpressionGetResp;
            return {
              id: expressionResp.expression?.id || "",
              type: ObjectType.OT_EXPRESSION,
              typeName: "Expression",
              name: expressionResp.expression?.name || "",
              ownershipSummary: expressionResp.expression?.owner,
              ownershipItem: ownership,
            } as SharingSubItem;
          } else {
            let quantResp = item as QuantGetResp;
            return {
              id: quantResp.summary?.id || "",
              type: ObjectType.OT_QUANTIFICATION,
              typeName: "Quantification",
              name: quantResp.summary?.params?.userParams?.name || quantResp.summary?.id || "",
              ownershipSummary: quantResp.summary?.owner,
              ownershipItem: ownership,
            } as SharingSubItem;
          }
        });

        subItems = subItems.filter(item => item?.id) as SharingSubItem[];

        if (!workspaceOwnershipResp?.ownership) {
          return;
        }

        const dialogConfig = new MatDialogConfig<ShareDialogData>();
        dialogConfig.data = {
          ownershipSummary: ownershipSummary || null,
          ownershipItem: workspaceOwnershipResp.ownership,
          typeName: "Workspace Snapshot",
          title: isReviewerSnapshot ? "Create reviewer snapshot" : existingSnapshot ? `Edit Snapshot (${existingSnapshot.name})` : undefined,
          subItems: [workspaceSubItem, ...subItems],
          excludeSubIds: [objectId || ""],
          preventSelfAssignment: true,
          restrictSubItemSharingToViewer: true,
          isReviewerSnapshot: isReviewerSnapshot,
          description: isReviewerSnapshot
            ? "Create a snapshot with a permanent link for reviewers. Anyone with the link will be able to access tabs, datasets, ROIs, and expressions currently used in the workspace. Future changes won’t be shared."
            : "",
        };

        const dialogRef = this.dialog.open(ShareDialogComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((sharingChangeResponse: ShareDialogResponse) => {
          if (!sharingChangeResponse) {
            return;
          }

          // At this point, we've shared all sub-items, now we need to create the new workspace snapshot and share it
          if (existingSnapshot) {
            this.updateSnapshotPermissions(objectId, sharingChangeResponse, workspaceOwnershipResp);
          } else {
            // Create a new snapshot
            let newScreenConfig = ScreenConfiguration.create(this.screenConfig!);
            newScreenConfig.snapshotParentId = this.screenConfig!.id;
            newScreenConfig.name = this.workspaceName || this.placeholderName || "";
            newScreenConfig.id = "";
            if (isReviewerSnapshot) {
              newScreenConfig.reviewerId = sharingChangeResponse.reviewerId || "";
            }
            this._analysisLayoutService.writeScreenConfiguration(newScreenConfig, "", false, (newScreenConfig: ScreenConfiguration) => {
              if (!newScreenConfig.id) {
                return;
              }

              this.updateSnapshotPermissions(newScreenConfig.id, sharingChangeResponse, workspaceOwnershipResp);
            });
          }
        });
      });
    });
  }

  onCopy(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      this._snackbarService.openSuccess("Link copied to clipboard!");
    });
  }

  dropTab(event: CdkDragDrop<NavigationTab>) {
    let moveFromIndex = event.previousIndex;
    let moveToIndex = event.currentIndex;

    moveItemInArray(this.openTabs, moveFromIndex, moveToIndex);

    let layouts = this._analysisLayoutService.activeScreenConfiguration$.value.layouts;
    // If current open tab is moveFromLayoutIndex, then move it to moveToLayoutIndex
    let currentTab = parseInt(this.queryParam["tab"] || "0");
    moveItemInArray(layouts, moveFromIndex, moveToIndex);
    this._analysisLayoutService.activeScreenConfiguration$.value.layouts = layouts;
    this._analysisLayoutService.writeScreenConfiguration(this._analysisLayoutService.activeScreenConfiguration$.value, undefined, false, () => {
      if (currentTab === moveFromIndex) {
        this._analysisLayoutService.setActiveScreenConfigurationTabIndex(moveToIndex);
      }

      this._analysisLayoutService.loadActiveLayoutAnalysisTabs();
    });
  }
}
