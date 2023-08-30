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

import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Route, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
// import { AuthenticationService } from "src/app/services/authentication.service";
// import { ContextImageService } from "src/app/services/context-image.service";
// import { ROIService } from "src/app/services/roi.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
// import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
// import { RegionChangeInfo, RegionLayerInfo, RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { Colours } from "src/app/utils/colours";
import { httpErrorToString } from "src/app/utils/utils";

@Component({
  selector: "roi-tab",
  templateUrl: "./roi-tab.component.html",
  styleUrls: ["./roi-tab.component.scss"],
})
export class ROITabComponent implements OnInit {
  private _subs = new Subscription();

  @ViewChild("newROIButton") newROIButton!: ElementRef;

  // private _userROIs: RegionLayerInfo[] = [];
  // private _sharedROIs: RegionLayerInfo[] = [];

  // private _filteredUserROIs: RegionLayerInfo[] = [];
  // private _filteredSharedROIs: RegionLayerInfo[] = [];

  // All the ROIs that are relevant, and we search within these to produce this.ROIs
  // private _allROIsForDisplay: RegionLayerInfo[] = [];

  // ROIs: RegionLayerInfo[] = [];
  allPointsColour = Colours.GRAY_10.asString();

  // These are set directly from SidePanelComponent, not used as inputs
  public showShared: boolean = false;
  public showSearch: boolean = false;

  private _selectionEmpty: boolean = false;

  roiSearchString: string = "";
  // isPublicUser: boolean = false;

  private _authors: ObjectCreator[] = [];
  private _filteredAuthors: string[] = [];

  filteredTagIDs: string[] = [];

  newROIName: string = "";
  newROIDescription: string = "";
  newROITags: string[] = [];

  constructor(
    // private _contextImageService: ContextImageService,
    private _roiService: ROIService,
    private _route: ActivatedRoute,
    // private _authService: AuthenticationService,
    // private _selectionService: SelectionService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // this._subs.add(this._contextImageService.mdl$.subscribe(
    //   () => {
    //     this.onGotModel();
    //   }
    // ));
    // this._subs.add(this._selectionService.selection$.subscribe(
    //   (sel: SelectionHistoryItem) => {
    //     this._selectionEmpty = sel.beamSelection.getSelectedPMCs().size <= 0 && sel.pixelSelection.selectedPixels.size <= 0;
    //   }
    // ));
    // this._subs.add(this._authService.isPublicUser$.subscribe(
    // (isPublicUser) => {
    // this.isPublicUser = isPublicUser;
    //   }
    // ));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get roiSummaries(): Record<string, ROIItemSummary> {
    return this._roiService.roiSummaries;
  }

  get roiSummaryList(): ROIItemSummary[] {
    return Object.values(this._roiService.roiSummaries);
  }

  get canCreateROIs(): boolean {
    return true;
  }

  // checkVisibleRegion(region: RegionLayerInfo) {
  //   return !region?.roi?.mistROIItem || region.roi.mistROIItem.ClassificationTrail === "";
  // }

  onGotModel(): void {
    // Listen to what layers exist...
    // this._subs.add(this.getRegionManager().regions$.subscribe(
    //   (change: RegionChangeInfo) => {
    //     let regions = this.getRegionManager().getDisplayedRegions(change.regions);
    //     let roiIDs: Set<string> = new Set<string>();
    //     regions.forEach(region => {
    //       if (this.checkVisibleRegion(region)) {
    //         this.setROI(region);
    //         roiIDs.add(region.roi.id);
    //       }
    //     });
    //     // Delete any that we didn't see in the new update
    //     this.deleteROIsNotInList(roiIDs);
    //     // Show the list we're interested in
    //     if (this.showShared) {
    //       this._allROIsForDisplay = this._sharedROIs;
    //     }
    //     else {
    //       this._allROIsForDisplay = this._userROIs;
    //     }
    //     this.filterROIsForDisplay();
    //     this.extractAuthors();
    //   },
    //   (err) => {
    //   }
    // ));
  }

  extractAuthors() {
    let authorIDs = new Set<string>();
    let authors: ObjectCreator[] = [];
    // this._allROIsForDisplay.forEach((roi) => {
    //   if (!authorIDs.has(roi.roi.creator.user_id)) {
    //     authors.push(roi.roi.creator);
    //     authorIDs.add(roi.roi.creator.user_id);
    //   }
    // });

    this.authors = authors;
  }

  private filterROIsForDisplay(): void {
    // let filteredROIs: RegionLayerInfo[] = [];
    // let searchString = this.roiSearchString.toLowerCase();
    // for (let roi of this._allROIsForDisplay) {
    //   let roiNameLower = roi.roi.name.toLowerCase();
    //   if (
    //     (searchString.length <= 0 || roiNameLower.indexOf(searchString) >= 0)
    //     && (this.filteredTagIDs.length <= 0 || this.filteredTagIDs.some((tagID) => roi.roi.tags.includes(tagID)))
    //     && (this.filteredAuthors.length <= 0 || this.filteredAuthors.some((author) => roi.roi.creator.user_id === author))
    //   ) {
    //     filteredROIs.push(roi);
    //   }
    // }
    // this.ROIs = filteredROIs;
  }

  // private setROI(roi: RegionLayerInfo): void {
  //   let regions = roi.roi.shared ? this._sharedROIs : this._userROIs;

  //   // If it exists, we just update it, so we don't reset the whole UI for this
  //   let regionIndex = regions.findIndex((region) => region.roi.id === roi.roi.id);
  //   if (regionIndex >= 0) {
  //     regions[regionIndex].roi = roi.roi;
  //     regions[regionIndex].visible = roi.visible;
  //     regions[regionIndex].opacity = roi.opacity;
  //     return;
  //   }

  //   if (roi.roi.shared) {
  //     this._sharedROIs.push(roi);
  //   }
  //   else {
  //     this._userROIs.push(roi);
  //   }
  // }

  // private deleteROIsNotInList(roiIDs: Set<string>): void {
  //   let keepROIs: RegionLayerInfo[] = [];

  //   for (let region of this._userROIs) {
  //     if (roiIDs.has(region.roi.id)) {
  //       // Save it in the keep list
  //       keepROIs.push(region);
  //     }
  //   }

  //   this._userROIs = Array.from(keepROIs);

  //   // Now do shared
  //   keepROIs = [];

  //   for (let region of this._sharedROIs) {
  //     if (roiIDs.has(region.roi.id)) {
  //       // Save it in the keep list
  //       keepROIs.push(region);
  //     }
  //   }

  //   this._sharedROIs = Array.from(keepROIs);
  // }

  // private getRegionManager(): RegionManager {
  //   return this._contextImageService.mdl.regionManager;
  // }

  get selectionEmpty(): boolean {
    return this._selectionEmpty;
  }

  onNewROI() {
    // this._roiService.makeROI(
    //   this._selectionService.getCurrentSelection().beamSelection.locationIndexes,
    //   this._selectionService.getCurrentSelection().pixelSelection.selectedPixels,
    //   this._selectionService.getCurrentSelection().pixelSelection.imageName,
    //   this.dialog
    // ).subscribe(
    //   (created: boolean) => {
    //     if (created) {
    //       this._selectionService.clearSelection();
    //     }
    //   },
    //   (err) => {
    //     alert(httpErrorToString(err, ""));
    //   }
    // );
  }

  onCancelCreateROI() {
    this.closeCreateROIMenu();
  }

  onSaveNewROI() {
    let newROI = ROIItem.create();
    newROI.name = this.newROIName;
    newROI.description = this.newROIDescription;
    newROI.tags = this.newROITags;
    newROI.scanId = this._route.snapshot.queryParams["scan_id"];

    // TODO: Get the actual values from the selection
    newROI.pixelIndexesEncoded = [1, 2, 3, 4];
    newROI.scanEntryIndexesEncoded = [12, 213, 15415, 15, 15, 6];
    newROI.imageName = "some_image";

    this._roiService.createROI(newROI);
    this.closeCreateROIMenu();
  }

  private closeCreateROIMenu(): void {
    if (this.newROIButton && this.newROIButton instanceof PushButtonComponent) {
      (this.newROIButton as PushButtonComponent).closeDialog();

      this.newROIName = "";
      this.newROIDescription = "";
      this.newROITags = [];
    }
  }

  get authors(): ObjectCreator[] {
    return this._authors;
  }

  set authors(authors: ObjectCreator[]) {
    this._authors = authors;
  }

  get authorsTooltip(): string {
    let authorNames = this._authors.filter(author => this._filteredAuthors.includes(author.user_id)).map(author => author.name);
    return this._filteredAuthors.length > 0 ? `Authors:\n${authorNames.join("\n")}` : "No Authors Selected";
  }

  get filteredAuthors(): string[] {
    return this._filteredAuthors;
  }

  set filteredAuthors(authors: string[]) {
    this._filteredAuthors = authors;
    this.filterROIsForDisplay();
  }

  onTagFilterChanged(tagIDs: string[]): void {
    this.filteredTagIDs = tagIDs;
    this.filterROIsForDisplay();
  }

  onFilterText(filterText: string): void {
    this.roiSearchString = filterText || "";
    this.filterROIsForDisplay();
  }
}
