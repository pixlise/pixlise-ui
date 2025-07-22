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

import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";

export type SearchableListItem = {
  id: string;
  name: string;
  icon?: string;
  rightIcon?: string;
  rightText?: string;
  color?: string;
  default?: boolean;
};

@Component({
  standalone: false,
  selector: "searchable-list",
  templateUrl: "./searchable-list.component.html",
  styleUrls: ["./searchable-list.component.scss"],
})
export class SearchableListComponent implements OnInit {
  private _searchText: string = "";

  @Input() placeholder: string = "Search...";
  @Input() disabledValues: string[] = [];
  private _items: SearchableListItem[] = [];
  @Output() onSelect = new EventEmitter<any>();

  private _defaultValue: string = "";
  private _value: string = "";
  selectedItem: SearchableListItem | null = null;

  addItemList: SearchableListItem[] = [];

  constructor() {}

  ngOnInit(): void {
    this.onSearchList(this._searchText);
  }

  get items(): SearchableListItem[] {
    return this._items;
  }

  @Input() set items(items: SearchableListItem[]) {
    this._items = items;
    this.value = this._value;
    this.onSearchList(this._searchText);
  }

  get defaultValue(): string {
    return this._defaultValue;
  }

  @Input() set defaultValue(value: string) {
    this._defaultValue = value;
    if (!this._value) {
      this._value = value;
      this.selectedItem = this.items.find(item => item.id === value) || null;
    }
  }

  get isNonDefaultSelected(): boolean {
    return this._value !== this._defaultValue;
  }

  get value(): string {
    return this._value;
  }

  @Input() set value(value: string) {
    this._value = value;
    if (!value && this._defaultValue) {
      this._value = this._defaultValue;
    }

    this.selectedItem = this.items.find(item => item.id === this._value) || null;
  }

  onInternalSelect(value: any): void {
    this.onSelect.emit(value);
    this.selectedItem = value;
  }

  get searchText(): string {
    return this._searchText;
  }

  set searchText(value: string) {
    this._searchText = value;
    this.onSearchList(value);
  }

  onSearchList(text: string) {
    this.addItemList = this.items.filter(item => item.name.toLowerCase().includes(text.toLowerCase()));
    this.onItemSearchMenu();
  }

  onAddItemSearchClick(evt: any) {
    evt.stopPropagation();
  }

  onItemSearchMenu() {
    const searchBox = document.getElementsByClassName("item-search");
    if (searchBox.length > 0) {
      (searchBox[0] as any).focus();
    }
  }
}
