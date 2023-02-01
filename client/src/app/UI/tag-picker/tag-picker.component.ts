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
import { ItemTag } from "src/app/models/tags";
import { AuthenticationService } from "src/app/services/authentication.service";
import { TaggingService } from "src/app/services/tagging.service";

export interface AuthorTags
{
    author: string;
    tags: ItemTag[];
}

@Component({
    selector: "tag-picker",
    templateUrl: "./tag-picker.component.html",
    styleUrls: ["./tag-picker.component.scss"]
})
export class TagPickerComponent implements OnInit
{
    private _subs = new Subscription();

    private _tagSelectionChanged: boolean = false;

    user: any = null; // Auth0 User Object
    currentAuthor: string = null;
    authors: string[] = [];
    
    _tagSearchValue: string = "";
    filteredTags: ItemTag[] = [];
    tagsByAuthor: AuthorTags[] = [];
    
    @Input() showCurrentTagsSection: boolean = false;

    @Input() placeholderText: string = "Search Tags ...";
    @Input() type: string = "layer";
    @Input() editable: boolean = true;
    @Input() selectedTagIDs: string[] = [];
    @Input() tags: ItemTag[] = [];
    @Input() filterToTagType: boolean = true;
    @Input() additionalVisibleTagType: string[] = ["layer"];

    @Output() onTagSelectionChanged = new EventEmitter<string[]>();
    

    constructor(
        private _taggingService: TaggingService,
        private _authService: AuthenticationService
    )
    {
    }

    ngOnInit()
    {
        this._authService.userProfile$.subscribe(
            (user)=>
            {
                this.user = user;
                this.currentAuthor = this.user.name;
            }
        );

        this._taggingService.refreshTagList();

        this._taggingService.tags$.subscribe((tags) =>
        {
            // Only show tags that are of the same type as the current item if filterToTagType or are of the additional visible type
            this.tags = Array.from(tags.values()).filter((tag) => 
                !this.filterToTagType
                || tag.type === this.type
                || this.additionalVisibleTagType.includes(tag.type)
            );

            this.groupTags();
        });

        this.groupTags();
        this.focusOnInput();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get tagCount(): number
    {
        return this.selectedTags.length;
    }

    get selectedTagsTooltip(): string
    {
        return this.selectedTags.length > 0 ? `Tags:\n${this.selectedTags.map(tag => tag.name).join("\n")}` : "No tags selected";
    }

    get tagSearchValue(): string
    {
        return this._tagSearchValue;
    }

    set tagSearchValue(value: string)
    {
        this._tagSearchValue = value.slice(0, 50);
        this.groupTags();
    }

    onTagEnter(): void
    {
        if(!this.editable)
        {
            return;
        }

        if(this.filteredTags.length === 0)
        {
            this.onCreateNewTag(true);
        }
        else if(this.filteredTags.length > 0)
        {
            this.onToggleTag(this.filteredTags[0].id);
            this.tagSearchValue = "";
        }
    }

    delayedFocusOnInput(): void
    {
        setTimeout(() => this.focusOnInput(), 200);
    }

    focusOnInput(): void
    {
        let tagInput = document.querySelector(".tag-search-container input") as any;
        if(tagInput && tagInput.focus)
        {
            tagInput.focus({focusVisible: true});
        }
    }

    onCreateNewTag(selected: boolean = false): void
    {
        if(!this.editable)
        {
            return;
        }

        this._taggingService.createNewTag(this._tagSearchValue.trim(), this.type).subscribe(({ id }) =>
        {
            this._taggingService.refreshTagList();
            if(selected)
            {
                this.selectedTagIDs.push(id);
                this.onTagSelectionChanged.emit(this.selectedTagIDs);
                this.focusOnInput();
            }

        });
        this.tagSearchValue = "";
    }

    onDeleteTag(tagID: string): void
    {
        if(!this.editable)
        {
            return;
        }

        let filteredTagIDs = this.validSelectedTagIDs.filter(id => id !== tagID);

        // If the tag is selected, unselect it before deleting
        if(this.selectedTagIDs.includes(tagID))
        {
            this.onTagSelectionChanged.emit(filteredTagIDs);
        }

        this.selectedTagIDs = filteredTagIDs;
        this._taggingService.delete(tagID).subscribe(() =>
        {
            this._taggingService.refreshTagList();
            this.focusOnInput();
        });
    }

    get selectedTags(): ItemTag[]
    {
        return this.tags.filter(tag => this.selectedTagIDs.includes(tag.id));
    }

    get validSelectedTagIDs(): string[]
    {
        return this.selectedTags.map(tag => tag.id);
    }

    groupTags(): void
    {
        this.filteredTags = this.tags.filter((tag: ItemTag) => tag.name.toLowerCase().includes(this.tagSearchValue.trim().toLowerCase()));

        let creators: Record<string, string> = {};
        creators[this.currentAuthor] = this.currentAuthor;

        let creatorMap = {};
        if(this.filteredTags.length === 0)
        {
            creatorMap[this.currentAuthor] = [];
        }

        this.filteredTags.forEach(tag =>
        {
            let userID = tag.creator.email === this.user.email ? this.currentAuthor : tag.creator.user_id;
            if(!creatorMap[userID])
            {
                creatorMap[userID] = [];
                creators[userID] = tag.creator.name;
            }

            creatorMap[userID].push(tag);
        });

        this.tagsByAuthor = Object.entries(creatorMap).map(([creator_id, tags]) => ({ "author": creators[creator_id], tags } as AuthorTags)).sort((a, b) => (a.author > b.author && a.author !== this.currentAuthor) ? 1 : -1);
    }

    checkTagActive(tagID: string): boolean
    {
        return this.selectedTagIDs.includes(tagID);
    }

    onToggleTag(tagID: string): void
    {
        if(!this.editable)
        {
            return;
        }

        let newTags = this.selectedTagIDs.slice();
        if(this.selectedTagIDs.includes(tagID))
        {
            newTags = newTags.filter(id => id !== tagID);
        }
        else
        {
            newTags.push(tagID);
        }

        this._tagSelectionChanged = true;
        this.selectedTagIDs = newTags;

        if(!this.showCurrentTagsSection)
        {
            // Prune non-existing tags on edit
            this.onTagSelectionChanged.emit(this.validSelectedTagIDs);
        }

        this.focusOnInput();
    }

    onClose(): void
    {
        if(this._tagSelectionChanged)
        {
            // Prune non-existing tags on edit
            this.onTagSelectionChanged.emit(this.validSelectedTagIDs);
            this._tagSelectionChanged = false;
        }
    }
}
