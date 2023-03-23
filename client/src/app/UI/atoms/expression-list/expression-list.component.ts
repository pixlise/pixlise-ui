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

import { Component, Input, OnInit, Output, EventEmitter, ViewChild } from "@angular/core";
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { iif, timer } from "rxjs";

import { DataExpressionService } from "src/app/services/data-expression.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";

import { RGBChannelsEvent } from "src/app/UI/atoms/expression-list/rgbmix-selector/rgbmix-selector.component";
import { LayerVisibilityChange, LayerColourChange } from "src/app/UI/atoms/expression-list/layer-settings/layer-settings.component";
import { ExpressionListGroupNames, ExpressionListItems, LayerViewItem } from "src/app/models/ExpressionList";


export class ExpressionListHeaderToggleEvent
{
    constructor(public itemType: string, public open: boolean)
    {
    }
}

@Component({
    selector: "expression-list",
    templateUrl: "./expression-list.component.html",
    styleUrls: ["./expression-list.component.scss"]
})
export class ExpressionListComponent extends ExpressionListGroupNames implements OnInit
{
    @ViewChild(CdkVirtualScrollViewport) cdkVirtualScrollViewport: CdkVirtualScrollViewport;

    @Input() headerSectionsOpen: Set<string> = new Set<string>();
    @Input() items: ExpressionListItems = null;
    @Input() itemSize: number = 60;
    @Input() showOpacitySliders: boolean = true;
    @Input() showColourOptions: boolean = true;
    @Input() showPureSwitchOnElements: boolean;
    @Input() initialScrollToIdx: number = -1;
    @Input() downloadable: boolean = true;
    @Input() isSelectable: boolean = true;
    
    @Input() isPreviewMode: boolean = false;
    @Input() isSidePanel: boolean = false;


    @Input() selectedIcon: string = "assets/button-icons/check-on.svg";
    @Input() unselectedIcon: string = "assets/button-icons/check-off.svg";

    @Output() headerSectionToggle = new EventEmitter();
    @Output() visibilityChange = new EventEmitter();
    @Output() onLayerImmediateSelection = new EventEmitter();
    @Output() colourChange = new EventEmitter();
    @Output() openSplitScreen = new EventEmitter();

    stickyItemHeaderName: string = "";
    stickyItem: LayerViewItem = null;

    constructor(
        private _exprService: DataExpressionService,
        private _rgbMixService: RGBMixConfigService
    )
    {
        super();
    }

    ngOnInit(): void
    {
    }

    ngAfterViewInit()
    {
        // Called here because choiceItem may not have been created earlier
        // Scroll the (first) active item into view

        // Timer added because for some unknown reason we saw the view init, scroll to right area
        // then it looked like it re-inited and was scrolled to the top again
        if(this.initialScrollToIdx > 0)
        {
            const source = timer(100);
            const abc = source.subscribe(
                ()=>
                {
                    this.cdkVirtualScrollViewport.scrollToIndex(this.initialScrollToIdx);
                }
            );
        }
    }

    get detectors(): string[]
    {
        return this._exprService.validDetectors;
    }

    // Header section opening/closing
    isSectionOpen(itemType: string): boolean
    {
        return this.headerSectionsOpen.has(itemType);
    }

    onToggleLayerSectionOpen(itemType: string, event): void
    {
        if(Array.from(this.headerSectionsOpen).filter((headerName) => headerName !== itemType).length === 0)
        {
            this.stickyItem = null;
        }
        this.headerSectionToggle.emit(new ExpressionListHeaderToggleEvent(itemType, event));
    }

    // RGB mix and exploratory handling
    onSaveRGBMixEvent(event): void
    {
        if(event)
        {
            // Get a name
            let name = prompt("Enter a name to save with", "");
            if(!name)
            {
                // user cancelled
                return;
            }

            if(name.length <= 0)
            {
                alert("Name must be entered");
                return;
            }

            // Save it
            event.name = name;
            this._rgbMixService.addRGBMix(event).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert("Failed to create RGB mix: "+name+". Error: "+err.error);
                }
            );
        }
        else
        {
            // User clicked X. Clear the exploratory RGB display
            console.log("Cleared exporatory RGB mix");
            this._rgbMixService.setExploratoryRGBMix("", "", "", false);
        }
    }

    onExploratoryRGBChanged(event: RGBChannelsEvent): void
    {
        // User changed the experimental ones, set the channels if we can
        if(event.red.length > 0 && event.green.length > 0 && event.blue.length > 0)
        {
            this._rgbMixService.setExploratoryRGBMix(event.red, event.green, event.blue, event.visible);
        }
    }

    // Shortcut to select and propogate an immediate "apply" event up to parent for current layer
    onLayerImmediateSelectionEvent(event: LayerVisibilityChange): void
    {
        this.onLayerImmediateSelection.emit(event);
    }

    // Layer visibility, we pass this through to our owner, as it may need to be processed a certain way
    onLayerVisibilityChange(event: LayerVisibilityChange): void
    {
        this.visibilityChange.emit(event);
    }

    // Layer colour, we pass this through to our owner, as it may need to be processed a certain way
    onLayerColourChange(event: LayerColourChange): void
    {
        this.colourChange.emit(event);
    }

    onOpenSplitScreen(event): void
    {
        this.openSplitScreen.emit(event);
    }

    // Scroll to item, triggered by clicking on a badge on a group header
    onScrollToItem(itemType: string, event): void
    {
        if(event < 0)
        {
            // Ignore if < 0, we dont even have a valid index at this point!
            return;
        }

        // Check if the section is open already
        if(!this.isSectionOpen(itemType))
        {
            // NOT ideal, but at this point if the group is closed, we don't have the items in the list to scroll to, so
            // here we force the list to open. We can't then scroll because we have to wait for it to all be rendered first
            // and because there's no obvious way to "hook" into that, we just scroll on a timer in this case

            // TODO: come up with a better solution
            this.headerSectionToggle.emit(new ExpressionListHeaderToggleEvent(itemType, true));
        }

        const source = timer(100);
        const abc = source.subscribe(
            ()=>
            {
                // Scroll to event-1 so it's visible (was getting obscured by floating header)
                this.cdkVirtualScrollViewport.scrollToIndex(event-1);
            }
        );
    }

    findActiveHeader(currentScrollPosition: number, checkShared: boolean = false): LayerViewItem | null
    {
        let lastHeaderIndex = 0;
        let activeHeader: LayerViewItem = null;
        let activeHeaderIndex = 0;
        if(currentScrollPosition < this.itemSize)
        {
            // If we're at the top, don't show a sticky header
            return null;
        }

        this.items.items.forEach((item, i) =>
        {
            if(item.itemType.includes("-header") || (item.itemType.includes("shared-") && checkShared) || i === this.items.items.length - 1)
            {
                let startPosition = lastHeaderIndex * this.itemSize;
                let endPosition = i * this.itemSize;

                // If the last header is open and the current scroll position is within it's start/end, set it as the active header
                if(endPosition - startPosition > this.itemSize && currentScrollPosition >= startPosition && currentScrollPosition < endPosition)
                {
                    activeHeader = this.items.items[lastHeaderIndex];
                    activeHeaderIndex = lastHeaderIndex;
                }
                lastHeaderIndex = i;
            }
        });

        if(activeHeader?.itemType?.includes("shared-") && checkShared && activeHeaderIndex + 1 < this.items.items.length)
        {
            let totalSharedCount = 0;
            let totalVisibleSharedCount = 0;

            let activeItemType = this.items.items[activeHeaderIndex + 1].itemType;

            // Update count of shared items
            this.items.items.forEach((item) =>
            {
                if(item.itemType === activeItemType && item.shared)
                {
                    totalSharedCount++;
                    if(item?.content?.layer?.visible)
                    {
                        totalVisibleSharedCount++;
                    }
                }
            });

            activeHeader.content.totalCount = totalSharedCount;
            activeHeader.content.visibleCount = totalVisibleSharedCount;
        }

        return activeHeader;
    }

    onScroll(event): void
    {
        let activeHeader = this.findActiveHeader(this.cdkVirtualScrollViewport.measureScrollOffset("top"));
        let activeHeaderWithShared = this.findActiveHeader(this.cdkVirtualScrollViewport.measureScrollOffset("top"), true);

        // This if statement is probably unnecessary, but is an extra verification that the header is open 
        if(activeHeader !== null && this.headerSectionsOpen.has(activeHeader.itemType))
        {
            let isSharedSectionOpen = activeHeaderWithShared.itemType.includes("shared-");
            this.stickyItem = isSharedSectionOpen ? activeHeaderWithShared : activeHeader;
            this.stickyItemHeaderName = isSharedSectionOpen ? activeHeaderWithShared.content.label : activeHeader.content.label;
        }
        else
        {
            this.stickyItem = null;
            this.stickyItemHeaderName = null;
        }
    }
}
