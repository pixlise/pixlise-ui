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

import { SectionImageTilesInputs, SectionImageTileContent } from "../../layouts/section-image-tiles-text/section-image-tiles-text.component";
import { NumberButtonParams } from "../../atoms/number-button/number-button.component";
import { MetaTagService } from "../../../services/meta-tag.service";

@Component({
  selector: "app-quantification-page",
  templateUrl: "./quantification-page.component.html",
  styleUrls: ["./quantification-page.component.scss"],
})
export class QuantificationPageComponent implements OnInit {
  description = "PIXLISE runs on PIQUANT, an ultra-fast data quantification engine that never compromises accuracy and precision.";
  quoteParts = [
    "Without PIXLISE and PIQUANT, PIXL would still be a great instrument, but nobody would know because ",
    "we'd still be processing our first dataset.",
  ];

  industryParams = new SectionImageTilesInputs(
    new NumberButtonParams("01", "Quantification", "red", false, false, ""),
    ["Industry-leading accuracy and speed in elemental quantification. Seamlessly integrated into the PIXLISE interface."],
    [
      new SectionImageTileContent(
        "Elemental Identification",
        "Easily build an element set with interactive indicators that assist you to locate distinct peaks in spectra.",
        "assets/images/quantification/checkbox.svg",
        "assets/images/quantification/piquant.jpg"
      ),
      new SectionImageTileContent(
        "Quantified Element Maps",
        "Visualize the spatial distribution of elements in your scan with fully quantified data.",
        "assets/images/quantification/map.svg",
        "assets/images/quantification/maps.jpg"
      ),
      new SectionImageTileContent(
        "Multi-Quantification",
        "A feature found only in PIXLISE, craft individual quantifications for regions of your dataset and combine them into one.",
        "assets/images/quantification/mouse.svg",
        "assets/images/quantification/multiquant.jpg"
      ),
      new SectionImageTileContent(
        "Quantified Element Table",
        "Display quantified weight percentages for every element of your dataset in a table.",
        "assets/images/quantification/table.svg",
        "assets/images/quantification/quant-table.jpg"
      ),
    ]
  );

  constructor(private _metaTagService: MetaTagService) {}

  ngOnInit(): void {
    this._metaTagService.setMeta("Quantification", this.description, []);
  }
}
