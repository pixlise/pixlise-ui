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

import { Component, OnInit, Input } from "@angular/core";

import { NumberButtonParams } from "../../atoms/number-button/number-button.component";

export class SectionImageItemContent {
  constructor(
    public listLabel: string,
    public headingParts: string[],
    public descriptionParts: string[],
    public imageLinkForeground: string,
    public imageLinkBackground: string
  ) {}
}

export class SectionImageListTextInputs {
  constructor(
    public navButtonParams: NumberButtonParams,
    public headingParts: string[],
    public headingLarge: boolean,
    public listTitle: string,
    public listItems: SectionImageItemContent[]
  ) {}
}

@Component({
  standalone: false,
  selector: "section-image-list-text",
  templateUrl: "./section-image-list-text.component.html",
  styleUrls: ["./section-image-list-text.component.scss"],
})
export class SectionImageListTextComponent implements OnInit {
  @Input() params: SectionImageListTextInputs;
  activeItem: SectionImageItemContent;

  constructor() {}

  ngOnInit(): void {
    if (this.params?.listItems?.length > 0) {
      this.activeItem = this.params.listItems[0];
    }
  }

  onClickListItem(item: SectionImageItemContent) {
    this.activeItem = item;
  }

  get hasList(): boolean {
    return this.params.listTitle && this.params.listItems.length > 1;
  }
}
