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


// Store some info about headers, so they can display visibility counts/buttons, etc
export class ExpressionListHeaderInfo
{
    constructor(
        public label: string,
        public totalCount: number, // how many items in total (we may not be showing them all due to filter/closed header)
        public visibleCount: number, // how many visible (again may not be showing them)
        public firstVisibleIdx: number, // index of first visible item, relative to the start of the list (outside this group)
        public childCount: number // how many items we have included in here
    )
    {
    }
}

@Component({
    selector: "context-visibility-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss", "./layer-settings.component.scss"]
})
export class VisibilitySettingsHeaderComponent implements OnInit
{
    @Input() content: ExpressionListHeaderInfo;
    @Input() simpleMode: boolean = false;
    @Input() isOpen: boolean = false;
    @Input() headerName: string = null;

    @Output() onToggleOpen = new EventEmitter();
    @Output() onScrollToItem = new EventEmitter();

    constructor()
    {
    }

    ngOnInit()
    {
    }

    get label(): string
    {
        if(!this.headerName && (!this.content || !this.content.label))
        {
            return "";
        }
        return this.headerName || this.content.label;
    }

    get totalCount(): number
    {
        if(!this.content || !this.content.label)
        {
            return 0;
        }
        return this.content.totalCount;
    }

    get visibleCount(): number
    {
        if(!this.content || !this.content.label)
        {
            return 0;
        }
        return this.content.visibleCount;
    }

    onToggleOpenClicked(vis: boolean): void
    {
        this.isOpen = vis;

        // Tell anyone listening
        this.onToggleOpen.emit(vis);
    }

    visibleCountClicked()
    {
        this.onScrollToItem.emit(this.content.firstVisibleIdx);
    }
}
