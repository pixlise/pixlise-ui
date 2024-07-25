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
import { WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";

export interface WidgetKeyDisplayData {
  items: WidgetKeyItem[];
  showKey: boolean;
}

export class WidgetKeyGroup {
  private _title: string = "";
  private _items: WidgetKeyItem[] = [];
  private _isOpen: boolean = false;
  private _isVisible: boolean = true;
  public colour: string = "#fff";

  constructor(title: string, items: WidgetKeyItem[], isOpen: boolean) {
    this._title = title;
    this._items = items;
    this._isOpen = isOpen;

    this._isVisible = items.every(item => item.isVisible);
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  get items(): WidgetKeyItem[] {
    return this._items;
  }

  set items(value: WidgetKeyItem[]) {
    this._items = value;
    this._isVisible = value.every(item => item.isVisible);
  }

  toggleItemVisibility(item: WidgetKeyItem): void {
    item.isVisible = !item.isVisible;
    this._isVisible = this.items.every(item => item.isVisible);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
  }

  get isVisible(): boolean {
    return this._isVisible;
  }

  set isVisible(value: boolean) {
    this.items.forEach(item => (item.isVisible = value));
    this._isVisible = value;
  }
}

@Component({
  selector: "widget-key-display",
  templateUrl: "./widget-key-display.component.html",
  styleUrls: ["./widget-key-display.component.scss"],
})
export class WidgetKeyDisplayComponent implements OnInit {
  // items: KeyItem[] = [];
  @Input() items: WidgetKeyItem[] = [];
  // @Output() keyClick = new EventEmitter();
  // @Output() onToggleKey = new EventEmitter();
  public groupedItems: WidgetKeyGroup[] = [];

  previewItems: WidgetKeyItem[] = [];

  public keyShowing: boolean = false;

  public maxKey: boolean = false;

  @Output() onUpdateItems = new EventEmitter<WidgetKeyItem[]>();

  constructor() {} // public dialogRef: MatDialogRef<WidgetKeyDisplayComponent> // @Inject(MAT_DIALOG_DATA) public data: WidgetKeyDisplayData,

  ngOnInit(): void {
    // if (this.data) {
    //   this.items = this.data?.items || [];
    //   this.keyShowing = this.data.showKey;
    // }
  }

  ngOnChanges(changes: any): void {
    if (changes.items) {
      this.previewItems = this.items.slice(0, 3);
      this.groupedItems = this.groupItems(this.items);
    }
  }

  sendItemToTop(item: WidgetKeyItem): void {
    if (!item.canBeReordered) {
      return;
    }

    let currentPosition = item.layerOrder;
    let topItem = this.items.find(i => i.layerOrder === 0);
    if (!topItem) {
      this.groupItems(this.items);
      topItem = this.items.find(i => i.layerOrder === 0);
      if (!topItem) {
        // Something went wrong, just return
        return;
      }
    }
    item.layerOrder = 0;
    topItem!.layerOrder = currentPosition;

    this.onUpdateItems.emit(this.items);
  }

  getItemsFromGroups(): WidgetKeyItem[] {
    let newItems = this.groupedItems.reduce((acc, group) => {
      return acc.concat(group.items);
    }, [] as WidgetKeyItem[]);

    return newItems;
  }

  onToggleItemVisibility(item: WidgetKeyItem, group: WidgetKeyGroup | null, event: MouseEvent): void {
    if (event.altKey) {
      let isOnlyItemVisible = this.items.every(existingItem => existingItem.isVisible === false || existingItem.id === item.id);
      if (isOnlyItemVisible) {
        this.makeAllVisible();
      } else {
        this.soloItem(item);
      }
    } else {
      if (group) {
        group.toggleItemVisibility(item);
      } else {
        item.isVisible = !item.isVisible;
      }

      let newItems = this.getItemsFromGroups();
      this.onUpdateItems.emit(newItems);
    }
  }

  onToggleGroupVisibility(group: WidgetKeyGroup): void {
    group.isVisible = !group.isVisible;

    let newItems = this.getItemsFromGroups();
    this.onUpdateItems.emit(newItems);
  }

  soloItem(item: WidgetKeyItem): void {
    this.groupedItems.forEach(group => {
      group.isVisible = false;
    });

    item.isVisible = true;

    let newItems = this.items.map(existingItem => {
      existingItem.isVisible = existingItem.id === item.id;
      return existingItem;
    });

    this.onUpdateItems.emit(newItems);
  }

  makeAllVisible(): void {
    this.groupedItems.forEach(group => {
      group.isVisible = true;
    });

    let newItems = this.items.map(existingItem => {
      existingItem.isVisible = true;
      return existingItem;
    });

    this.onUpdateItems.emit(newItems);
  }

  onToggleMaxKey(): void {
    this.maxKey = !this.maxKey;
  }

  isItemOnTop(item: WidgetKeyItem): boolean {
    return item.canBeReordered && item.layerOrder === 0;
  }

  groupItems(items: WidgetKeyItem[]): WidgetKeyGroup[] {
    let isOrdered = items.every(item => item.layerOrder > -1);

    let groups = new Map<string, WidgetKeyItem[]>();
    items.forEach((item, i) => {
      let groupLabel = item.group || "";
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }
      groups.get(groupLabel)!.push(item);
      if (!isOrdered) {
        item.layerOrder = i;
      }
    });

    let groupArray: WidgetKeyGroup[] = [];
    groups.forEach((items, key) => {
      let currentOpenStatus = this.groupedItems.find(group => group.title === key)?.isOpen ?? groups.size < 2;
      let newGroup = new WidgetKeyGroup(key, items, currentOpenStatus);
      let isAllSameColour = items.every(item => item.colour && item.colour === items[0].colour);
      if (isAllSameColour) {
        newGroup.colour = items[0].colour;
      }
      groupArray.push(newGroup);
    });

    return groupArray;
  }

  onToggleShowKey(): void {
    this.keyShowing = !this.keyShowing;
    // this.onToggleKey.emit(this.keyShowing);
  }

  onClickLabel(item: WidgetKeyItem, event: MouseEvent): void {
    if (event.altKey) {
      let isOnlyItemVisible = this.items.every(existingItem => existingItem.isVisible === false || existingItem.id === item.id);
      if (isOnlyItemVisible) {
        this.makeAllVisible();
      } else {
        this.soloItem(item);
      }
    } else {
      if (item?.id && item.id.length > 0) {
        this.sendItemToTop(item);
        // this.keyClick.emit(id);
      }
    }
  }

  getLabel(item: WidgetKeyItem): string {
    return item.label.replace("mist__roi.", "");
  }

  getTruncatedLabel(item: WidgetKeyItem): string {
    let maxLength = 15;
    let label = this.getLabel(item);
    if (label.length > maxLength) {
      label = label.slice(0, maxLength) + "...";
    }

    return label;
  }
}
