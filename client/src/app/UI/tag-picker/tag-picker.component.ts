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

import { Component, Input, OnInit } from "@angular/core";
import { Subscription } from "rxjs";

export class ItemTag
{
    constructor(
        public id: string,
        public name: string,
        public author: string,
        public dateCreated: string,
        public type: string,
    ) {}
}

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

    currentAuthor: string = "Author 2";
    authors: string[] = [];
    
    
    _tagSearchValue: string = "";
    filteredTags: ItemTag[] = [];
    tagsByAuthor: AuthorTags[] = [];
    
    @Input() showCurrentTagsSection: boolean = false;

    @Input() selectedTagIDs: string[] = [];
    @Input() tags: ItemTag[] = [];
    @Input() onTagSelectionChanged: (tagIDs: string[]) => void = () => null;
    

    constructor()
    {}

    ngOnInit()
    {
        this.groupTags();
        this.focusOnInput();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get tagCount(): number
    {
        return this.selectedTagIDs.length;
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

    onCreateNewTag(selected: boolean = false): ItemTag
    {
        let currentDate = new Date().toLocaleDateString();
        let tagID = `${this.currentAuthor.replace(/\s/g, "-")}-${this.tags.length}`;

        let newTag = new ItemTag(tagID, this._tagSearchValue.trim(), this.currentAuthor, currentDate, "layer");
        this.tags.push(newTag);
        this.tagSearchValue = "";
        if(selected)
        {
            this.selectedTagIDs.push(tagID);
            this.onTagSelectionChanged(this.selectedTagIDs);
            this.focusOnInput();
        }

        return newTag;
    }

    get selectedTags(): ItemTag[]
    {
        return this.tags.filter(tag => this.selectedTagIDs.includes(tag.id));
    }

    groupTags(): void
    {
        this.filteredTags = this.tags.filter((tag: ItemTag) => tag.name.toLowerCase().includes(this.tagSearchValue.trim().toLowerCase()));

        let authorMap = {};
        if(this.filteredTags.length === 0)
        {
            authorMap[this.currentAuthor] = [];
        }

        this.filteredTags.forEach(tag =>
        {
            if(!authorMap[tag.author])
            {
                authorMap[tag.author] = [];
            }

            authorMap[tag.author].push(tag);
        });

        this.tagsByAuthor = Object.entries(authorMap).map(([author, tags]) => ({ author, tags } as AuthorTags)).sort((a, b) => (a.author > b.author && a.author !== this.currentAuthor) ? 1 : -1);
    }

    checkTagActive(tagID: string): boolean
    {
        return this.selectedTagIDs.includes(tagID);
    }

    onToggleTag(tagID: string): void
    {
        if(this.selectedTagIDs.includes(tagID))
        {
            this.selectedTagIDs = this.selectedTagIDs.filter(id => id !== tagID);
        }
        else
        {
            this.selectedTagIDs.push(tagID);
        }

        this.onTagSelectionChanged(this.selectedTagIDs);

        this.focusOnInput();   
    }
}
