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
import { ActivatedRoute } from "@angular/router";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";

import { catchError, combineLatest, map, Observable, of, Subscription, switchMap } from "rxjs";

import { FullScreenLayout, ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { ObjectType, OwnershipItem, OwnershipSummary, UserGroupList } from "src/app/generated-protos/ownership-access";
import { GetOwnershipDescriptionReq, GetOwnershipDescriptionResp, GetOwnershipReq, GetOwnershipResp, ObjectEditAccessReq } from "src/app/generated-protos/ownership-access-msgs";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { ExpressionGetReq, ExpressionGetResp } from "src/app/generated-protos/expression-msgs";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ExpressionGroupGetResp } from "src/app/generated-protos/expression-group-msgs";

import {
  NavigationTab,
  AnalysisLayoutService,
  APIDataService,
  APICachedDataService,
  SnackbarService,
  ShareDialogComponent,
  ShareDialogData,
  ShareDialogResponse,
  SharingSubItem,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { LayoutConfiguratorComponent, LayoutConfiguratorData } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/workspace-configuration/layout-configurator/layout-configurator.component";

import { WorkspaceService } from "src/app/modules/analysis/services/workspaces.service";

import { encodeUrlSafeBase64, getScanIdFromWorkspaceId } from "src/app/utils/utils";
import { TabLinks } from "src/app/models/TabLinks";
import { UserInfo } from "src/app/generated-protos/user";

class OwnershipInfo {
  constructor(
    public id: string,
    public objectType: ObjectType,
    public ownership: OwnershipItem | undefined,
    public item: RegionOfInterestGetResp | ExpressionGetResp | ExpressionGroupGetResp | QuantGetResp | undefined,
    public error: any = undefined,
    public name: string = "",
    public creatorUser?: UserInfo,
  ) {}
}

@Component({
  standalone: false,
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
  public reviewerSnapshots: { snapshot: ScreenConfiguration; link: string }[] = [];

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
                    this.placeholderName = `Sol ${sol}: ${scan?.title || "N/A"}`;
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
          this.snapshots = snapshots.filter(snapshot => !snapshot.reviewerId);
          this.reviewerSnapshots = snapshots
            .filter(snapshot => !!snapshot.reviewerId)
            .map(snapshot => {
              return {
                snapshot: snapshot,
                link: this.generateLinkFromId(snapshot.id),
              };
            });
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

      // Replace ids with new ones, we want this to be a copy but not linked to the original.
      // NOTE: This fixes a bug where if a tab was copied, and say the original tab had a context image on it, the new tab looked the same
      //       but when a user changed either context image, they both changed! Users found this to be unexpected behaviour so we now ensure
      //       all ids are unique to the new copied tab
      newScreenLayout.tabId = ""
      for (let widget of newScreenLayout.widgets) {
        widget.id = "";
      }

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

  onLayoutEdit(tab: NavigationTab, index: number): void {
    if (!this.canEditTab(tab) || index < 0 || !this.screenConfig) {
      return;
    }

    let screenLayout = this.getLayoutFromTab(tab);
    if (!screenLayout) {
      return;
    }

    const dialogConfig = new MatDialogConfig<LayoutConfiguratorData>();
    dialogConfig.data = {
      layout: screenLayout,
      tabName: tab.label || "",
    };
    dialogConfig.maxWidth = "900px";
    dialogConfig.width = "90vw";

    const dialogRef = this.dialog.open(LayoutConfiguratorComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((response) => {
      if (response && response.layout) {
        let tabIndex = tab?.params?.["tab"];
        if (tabIndex !== undefined) {
          let layoutIndex = parseInt(tabIndex);
          if (this.screenConfig && this.screenConfig.layouts[layoutIndex]) {
            this.screenConfig.layouts[layoutIndex] = response.layout;
            if (response.layout.tabName && tab) {
              tab.label = response.layout.tabName;
            }
            this._analysisLayoutService.writeScreenConfiguration(this.screenConfig, "", false, () => {
              this._analysisLayoutService.delayNotifyCanvasResize(100);
            });
          }
        }
      }
    });
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

  generateLinkFromId(id: string): string {
    return `${window.location.protocol}//${window.location.host}/magiclink?ml=${encodeUrlSafeBase64(id)}`;
  }

  onDeleteSnapshot(snapshot: ScreenConfiguration): void {
    if (!snapshot?.id) {
      return;
    }

    this._analysisLayoutService.deleteScreenConfiguration(snapshot.id, () => {
      this._workspaceService.fetchWorkspaceSnapshots(this.screenConfig!.id).subscribe(snapshots => {
        this.snapshots = snapshots.filter(snapshot => !snapshot.reviewerId);
        this.reviewerSnapshots = snapshots
          .filter(snapshot => !!snapshot.reviewerId)
          .map(snapshot => {
            return {
              snapshot: snapshot,
              link: this.generateLinkFromId(snapshot.id),
            };
          });
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
        if (!this.screenConfig) {
          return of([]);
        }

        return this._workspaceService.fetchWorkspaceSnapshots(this.screenConfig.id);
      })
      .subscribe(snapshots => {
        this.snapshots = snapshots.filter(snapshot => !snapshot.reviewerId);
        this.reviewerSnapshots = snapshots
          .filter(snapshot => !!snapshot.reviewerId)
          .map(snapshot => {
            return {
              snapshot: snapshot,
              link: this.generateLinkFromId(snapshot.id),
            };
          });

        if (this.activeConfigurationTab === "review") {
          // Copy to clipboard
          this.onCopy(this.generateLinkFromId(id));
        }
      });
  }

  onShareSnapshot(existingSnapshot: ScreenConfiguration | null = null, isReviewerSnapshot: boolean = false): void {
    const objectId = existingSnapshot?.id || this.screenConfig?.id;
    const ownershipSummary = existingSnapshot?.owner || this.screenConfig?.owner;

    this._apiDataService.sendGetOwnershipRequest(GetOwnershipReq.create({ objectId, objectType: this.objectType })).subscribe(workspaceOwnershipResp => {
      if (!workspaceOwnershipResp || !workspaceOwnershipResp.ownership || !objectId || !ownershipSummary) {
        this._snackbarService.openError(`Could not find ownership information for item (${this.screenConfig?.id}, ${this.objectType}).`);
        return;
      }

      const roiIds = this._analysisLayoutService.getLoadedROIIDsFromActiveScreenConfiguration();
      const expressionIds = this._analysisLayoutService.getLoadedExpressionIDsFromActiveScreenConfiguration();
      const expressionGroupIds = this._analysisLayoutService.getLoadedExpressionGroupIDsFromActiveScreenConfiguration();
      const quantIds = this._analysisLayoutService.getLoadedQuantificationIDsFromActiveScreenConfiguration();

      const roiRequests: Observable<OwnershipInfo>[] = this.makeOwnershipItem(roiIds, ObjectType.OT_ROI, (id) => this._apiCachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id })));
      const expressionRequests: Observable<OwnershipInfo>[] = this.makeOwnershipItem(expressionIds, ObjectType.OT_EXPRESSION, (id) => this._apiCachedDataService.getExpression(ExpressionGetReq.create({ id })));
      const expressionGroupRequests: Observable<OwnershipInfo>[] = this.makeOwnershipItem(expressionGroupIds, ObjectType.OT_EXPRESSION_GROUP, (id) => this._apiCachedDataService.getExpressionGroup(ExpressionGetReq.create({ id })));
      const quantRequests: Observable<OwnershipInfo>[] = this.makeOwnershipItem(quantIds, ObjectType.OT_QUANTIFICATION, (id) => this._apiCachedDataService.getQuant(QuantGetReq.create({ quantId: id })));

      const requests = [...roiRequests, ...expressionRequests, ...expressionGroupRequests, ...quantRequests];

      if (requests.length == 0) {
        // Nothing to request, simple share of a workspace without user created data yet... we didn't have this condition before and were skipping this case!
        this.shareSnapshot(objectId, existingSnapshot, isReviewerSnapshot, ownershipSummary, workspaceOwnershipResp, []);
      } else {
        // Wait for all the bits!
        combineLatest(requests).subscribe(res => {
          this.shareSnapshot(objectId, existingSnapshot, isReviewerSnapshot, ownershipSummary, workspaceOwnershipResp, res);
        });
      }
    });
  }

  private makeOwnershipItem(ids: string[], objType: ObjectType, makeReqFunc: (id: string) => Observable<any>): Observable<OwnershipInfo>[] {
      return  ids.map(id => {
        const ownershipReq = this._apiDataService.sendGetOwnershipRequest(
          GetOwnershipReq.create({ objectId: id, objectType: objType })
        );
        return ownershipReq.pipe(
          switchMap(ownershipRes => makeReqFunc(id).pipe(map(itemRes => new OwnershipInfo(id, objType, ownershipRes.ownership, itemRes)))),
          catchError(err => {
            return this._apiDataService.sendGetOwnershipDescriptionRequest(GetOwnershipDescriptionReq.create({objectId: id, objectType: objType})).pipe(
              map(desc => {
                return new OwnershipInfo(id, objType, undefined, undefined, err, desc.name, desc.creatorUser);
              }),
              catchError(() => {
                return of(new OwnershipInfo(id, objType, undefined, undefined, err, `${objType.toString()} (${id})`));
              })
            );
          })
        );
      });
  }

  private shareSnapshot(
    objectId: string,
    existingSnapshot: ScreenConfiguration | null,
    isReviewerSnapshot: boolean,
    ownershipSummary: OwnershipSummary,
    workspaceOwnershipResp: GetOwnershipResp,
    ownerships: OwnershipInfo[]
    ) {
    if (!workspaceOwnershipResp?.ownership) {
      this._snackbarService.openError("Failed to get ownership information for workspace");
      return;
    }

    const workspaceId = this.screenConfig?.id || "";

    const workspaceSubItem: SharingSubItem = {
      id: workspaceId,
      type: ObjectType.OT_SCREEN_CONFIG,
      typeName: "Workspace",
      name: this.workspaceName || this.placeholderName || "",
      ownershipSummary: ownershipSummary,
      ownershipItem: workspaceOwnershipResp.ownership,
      queryError: ""
    };

    let subItems: SharingSubItem[] = [];

    for (let ownershipItem of ownerships) {
      let objTypeName = ownershipItem.objectType.toString();
      switch(ownershipItem.objectType) {
        case ObjectType.OT_ROI:
          objTypeName = "Region of Interest";
          break;
        case ObjectType.OT_EXPRESSION:
          objTypeName = "Expression";
          break;
        case ObjectType.OT_EXPRESSION_GROUP:
          objTypeName = "Expression Group";
          break;
        case ObjectType.OT_QUANTIFICATION:
          objTypeName = "Quantification";
          break;
      }

      if (ownershipItem.error || !ownershipItem.ownership || !ownershipItem.item) {
        // We somehow failed to retrieve the object or don't have permissions for
        // it, so display it as an error that can be fixed
        subItems.push({
          id: ownershipItem.id,
          type: ownershipItem.objectType,
          typeName: objTypeName,
          name: ownershipItem.name,
          ownershipSummary: OwnershipSummary.create({creatorUser: ownershipItem?.creatorUser}),
          ownershipItem: ownershipItem.ownership,
          queryError: ownershipItem.error ? ownershipItem.error : "Lookup failed"
        } as SharingSubItem);
      } else if (ownershipItem.ownership && ownershipItem.item) {
        switch (ownershipItem.objectType) {
          case ObjectType.OT_ROI:
            const roiResp = ownershipItem.item as RegionOfInterestGetResp;
            subItems.push({
              id: roiResp.regionOfInterest?.id || "",
              type: ownershipItem.objectType,
              typeName: objTypeName,
              name: roiResp.regionOfInterest?.name || "",
              ownershipSummary: roiResp.regionOfInterest?.owner,
              ownershipItem: ownershipItem.ownership,
              queryError: "",
            } as SharingSubItem);
            break;
          case ObjectType.OT_EXPRESSION:
            const expressionResp = ownershipItem.item as ExpressionGetResp;
            subItems.push({
              id: expressionResp.expression?.id || "",
              type: ownershipItem.objectType,
              typeName: objTypeName,
              name: expressionResp.expression?.name || "",
              ownershipSummary: expressionResp.expression?.owner,
              ownershipItem: ownershipItem.ownership,
              queryError: "",
            } as SharingSubItem);
            break;
          case ObjectType.OT_EXPRESSION_GROUP:
            const expressionGroupResp = ownershipItem.item as ExpressionGroupGetResp;
            subItems.push({
              id: expressionGroupResp.group?.id || "",
              type: ownershipItem.objectType,
              typeName: objTypeName,
              name: expressionGroupResp.group?.name || "",
              ownershipSummary: expressionGroupResp.group?.owner,
              ownershipItem: ownershipItem.ownership,
              queryError: "",
            } as SharingSubItem);
            break;
          case ObjectType.OT_QUANTIFICATION:
            const quantResp = ownershipItem.item as QuantGetResp;
            subItems.push({
              id: quantResp.summary?.id || "",
              type: ownershipItem.objectType,
              typeName: objTypeName,
              name: quantResp.summary?.params?.userParams?.name || quantResp.summary?.id || "",
              ownershipSummary: quantResp.summary?.owner,
              ownershipItem: ownershipItem.ownership,
              queryError: "",
            } as SharingSubItem);
            break;
          default:
            throw new Error(`Unexpected type: ${ownershipItem.objectType}`);
        }
      }
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
        const newScreenConfig = ScreenConfiguration.create(this.screenConfig!);
        newScreenConfig.snapshotParentId = this.screenConfig!.id;
        newScreenConfig.name = this.workspaceName || this.placeholderName || "";
        newScreenConfig.id = "";
        if (isReviewerSnapshot) {
          newScreenConfig.reviewerId = sharingChangeResponse.reviewerId || "";
          if (sharingChangeResponse.reviewerAccessTime) {
            // Actual expiration time for auth purposes is calculated in the API,
            // but this is a "close enough" approximation for displaying in the UI without making another API call
            const currentTimeMS = new Date().getTime();
            newScreenConfig.reviewerExpirationDateUnixSec = Math.round(sharingChangeResponse.reviewerAccessTime + currentTimeMS / 1000);
          }
        }
        this._analysisLayoutService.writeScreenConfiguration(newScreenConfig, "", false, (newScreenConfig: ScreenConfiguration) => {
          if (!newScreenConfig.id) {
            return;
          }

          this.updateSnapshotPermissions(newScreenConfig.id, sharingChangeResponse, workspaceOwnershipResp);
        });
      }
    });
  }

  onCopy(link: string): void {
    navigator.clipboard.writeText(link).then(() => {
      this._snackbarService.openSuccess("Link copied to clipboard!");
    });
  }

  dropTab(event: CdkDragDrop<NavigationTab>) {
    const moveFromIndex = event.previousIndex;
    const moveToIndex = event.currentIndex;

    moveItemInArray(this.openTabs, moveFromIndex, moveToIndex);

    const layouts = this._analysisLayoutService.activeScreenConfiguration$.value.layouts;
    // If current open tab is moveFromLayoutIndex, then move it to moveToLayoutIndex
    const currentTab = parseInt(this.queryParam["tab"] || "0");
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
