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
import { Subscription } from "rxjs";
import { BuiltInTags, TagType } from "../../models/tag.model";
import { TagService } from "../../services/tag.service";
import { Tag } from "src/app/generated-protos/tags";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { UserDetails } from "src/app/generated-protos/user";

export interface AuthorTags {
  author: string;
  tags: Tag[];
}

@Component({
  selector: "tag-picker",
  templateUrl: "./tag-picker.component.html",
  styleUrls: ["./tag-picker.component.scss"],
})
export class TagPickerComponent implements OnInit {
  private _subs = new Subscription();

  private _tagSelectionChanged: boolean = false;

  authors: string[] = [];

  _tagSearchValue: string = "";
  private _newTagSelected: boolean = false;

  filteredTags: Tag[] = [];
  tagsByAuthor: AuthorTags[] = [];

  @Input() showCurrentTagsSection: boolean = false;
  @Input() buttonStyle: "button" | "icon" = "icon";

  @Input() placeholderText: string = "Search Tags ...";
  @Input() type: TagType = "layer";
  @Input() editable: boolean = true;
  @Input() selectedTagIDs: string[] = [];
  @Input() tags: Tag[] = [];
  @Input() filterToTagType: boolean = true;
  @Input() allowAdminBuiltin: boolean = false;
  @Input() additionalVisibleTagType: string[] = ["layer"];
  @Input() triggerOpen: boolean = false;

  @Output() onTagSelectionChanged = new EventEmitter<string[]>();

  constructor(
    private _taggingService: TagService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit() {
    this._taggingService.fetchAllTags();

    this._subs.add(
      this._taggingService.tags$.subscribe(async tags => {
        // Only show tags that are of the same type as the current item if filterToTagType or are of the additional visible type
        this.tags = Array.from(tags.values()).filter(
          tag =>
            !this.filterToTagType ||
            tag.type === this.type ||
            this.additionalVisibleTagType.includes(tag.type) ||
            ((this.isAdmin || this.allowAdminBuiltin) && tag.type === BuiltInTags.type)
        );

        if (this._newTagSelected) {
          let selectedTag = this.tags.find(tag => tag.name === this._tagSearchValue.trim());
          if (selectedTag) {
            this.selectedTagIDs.push(selectedTag.id);
            this.onTagSelectionChanged.emit(this.selectedTagIDs);
            this.focusOnInput();

            this._newTagSelected = false;
            this._tagSearchValue = "";
          }
        }

        this.groupTags();
      })
    );

    this.groupTags();
    this.focusOnInput();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get user(): UserDetails {
    return this._userOptionsService.userDetails;
  }

  get currentAuthorName(): string {
    return this.user.info?.name || "No Author";
  }

  get isAdmin(): boolean {
    return this._userOptionsService.hasFeatureAccess("admin");
  }

  get tagCount(): number {
    return this.selectedTags.length;
  }

  get selectedTagsTooltip(): string {
    return this.selectedTags.length > 0 ? `Tags:\n${this.selectedTags.map(tag => tag.name).join("\n")}` : "No tags selected";
  }

  get tagSearchValue(): string {
    return this._tagSearchValue;
  }

  set tagSearchValue(value: string) {
    this._tagSearchValue = value.slice(0, 50);
    this.groupTags();
  }

  onTagEnter(): void {
    if (!this.editable) {
      return;
    }

    if (this.filteredTags.length === 0) {
      this.onCreateNewTag(true);
    } else if (this.filteredTags.length > 0) {
      this.onToggleTag(this.filteredTags[0].id);
      this.tagSearchValue = "";
    }
  }

  delayedFocusOnInput(): void {
    setTimeout(() => this.focusOnInput(), 200);
  }

  focusOnInput(): void {
    let tagInput = document.querySelector(".tag-search-container input") as any;
    if (tagInput && tagInput.focus) {
      tagInput.focus({ focusVisible: true });
    }
  }

  onCreateNewTag(selected: boolean = false): void {
    if (!this.editable) {
      return;
    }

    this._newTagSelected = selected;
    this._taggingService.createTag(this._tagSearchValue.trim(), this.type);
  }

  onDeleteTag(tagID: string): void {
    if (!this.editable) {
      return;
    }

    let filteredTagIDs = this.validSelectedTagIDs.filter(id => id !== tagID);

    // If the tag is selected, unselect it before deleting
    if (this.selectedTagIDs.includes(tagID)) {
      this.onTagSelectionChanged.emit(filteredTagIDs);
    }

    this.selectedTagIDs = filteredTagIDs;
    this._taggingService.deleteTag(tagID);
  }

  get selectedTags(): Tag[] {
    return this.tags.filter(tag => this.selectedTagIDs.includes(tag.id));
  }

  get validSelectedTagIDs(): string[] {
    return this.selectedTags.map(tag => tag.id);
  }

  groupTags(): void {
    this.filteredTags = this.tags.filter((tag: Tag) => tag.name.toLowerCase().includes(this.tagSearchValue.trim().toLowerCase()));

    let creators: Record<string, string> = {};
    creators[this.currentAuthorName] = this.currentAuthorName;

    let creatorMap: Record<string, Tag[]> = {};
    if (this.filteredTags.length === 0) {
      creatorMap[this.currentAuthorName] = [];
    }

    this.filteredTags.forEach(tag => {
      let userID = tag.owner?.email === this.user.info?.email ? this.currentAuthorName : tag.owner?.id;
      if (userID && tag.owner && !creatorMap[userID]) {
        creatorMap[userID] = [];
        creators[userID] = tag.owner.name || tag.owner.id;
      }

      if (userID) {
        creatorMap[userID].push(tag);
      }
    });

    this.tagsByAuthor = Object.entries(creatorMap)
      .map(([creator_id, tags]) => ({ author: creators[creator_id], tags }) as AuthorTags)
      .sort((a, b) => (a.author > b.author && a.author !== this.currentAuthorName ? 1 : -1));
  }

  checkTagActive(tagID: string): boolean {
    return this.selectedTagIDs.includes(tagID);
  }

  onToggleTag(tagID: string): void {
    if (!this.editable) {
      return;
    }

    let newTags = this.selectedTagIDs.slice();
    if (this.selectedTagIDs.includes(tagID)) {
      newTags = newTags.filter(id => id !== tagID);
    } else {
      newTags.push(tagID);
    }

    this._tagSelectionChanged = true;
    this.selectedTagIDs = newTags;

    if (!this.showCurrentTagsSection) {
      // Prune non-existing tags on edit
      this.onTagSelectionChanged.emit(this.validSelectedTagIDs);
    }

    this.focusOnInput();
  }

  onClose(): void {
    if (this._tagSelectionChanged) {
      // Prune non-existing tags on edit
      this.onTagSelectionChanged.emit(this.validSelectedTagIDs);
      this._tagSelectionChanged = false;
    }
  }
}
