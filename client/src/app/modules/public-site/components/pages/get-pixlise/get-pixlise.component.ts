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

import { Component, OnInit } from "@angular/core";

import { NumberButtonParams, SignupPrefix } from "../../atoms/number-button/number-button.component";
import { DefaultLoggedInLink } from "../../navigation";
import { MetaTagService } from "../../../services/meta-tag.service";

class Tile {
  constructor(
    public label: string,
    public description: string,
    public buttonParams: NumberButtonParams
  ) {}
}

@Component({
  standalone: false,
  selector: "app-get-pixlise",
  templateUrl: "./get-pixlise.component.html",
  styleUrls: ["./get-pixlise.component.scss"],
})
export class GetPIXLISEComponent implements OnInit {
  repoURL = "https://www.github.com/pixlise";
  tiles: Tile[] = [
    new Tile(
      "Explore Our World!",
      "Try out the basic features of PIXLISE on public access datasets without the need for an account, one click away!",
      new NumberButtonParams("01", "Free Trial", "yellow", true, true, "/datasets")
    ),
    new Tile(
      "Sign Up for More...",
      "Are you a scientist looking to dig a bit deeper? Sign up to get access to advanced PIXLISE features and our community discussion board.",
      new NumberButtonParams("02", "Make an account", "yellow", true, true, SignupPrefix + DefaultLoggedInLink)
    ),
    new Tile(
      "Get PIXLISE!",
      "PIXLISE is free and open source, we'll help you choose the best fit for how to get your own personal version.",
      new NumberButtonParams("03", "Learn More", "red", true, true, "/public/get-started#links")
    ),
  ];

  getOptions = ["Personal Local Installation", "Self Hosted Deployment", "Full Cloud Hosted PIXLISE Service"];
  getActiveItem = this.getOptions[0];

  constructor(private _metaTagService: MetaTagService) {}

  ngOnInit(): void {
    this._metaTagService.setMeta(
      "How to get PIXLISE",
      "There are several options for how to start using PIXLISE, from joining our hosted instance, all the way to downloading the source code and running it yourself!",
      []
    );
  }

  onClickListItem(item: string) {
    this.getActiveItem = item;
  }
}
