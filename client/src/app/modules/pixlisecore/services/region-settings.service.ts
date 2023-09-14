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

import { Injectable } from "@angular/core";
import { Observable, of, map } from "rxjs";
import { ROIItem } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { APIDataService } from "./apidata.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { PointDrawer } from "src/app/utils/drawing";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export class RegionSettings {
  constructor(
    public region: ROIItem,
    public colour: RGBA,
    public shape: string
  ) {}
}

@Injectable({
  providedIn: "root",
})
export class RegionSettingsService {
  private _roiMap = new Map<string, RegionSettings>();
  private _nextDrawConfigIdx: number = 0;

  constructor(private _dataService: APIDataService) {
    // Add defaults for predefined ROIs
    this._roiMap.set(
      PredefinedROIID.AllPoints,
      new RegionSettings(
        ROIItem.create({
          id: PredefinedROIID.AllPoints,
          scanId: "",
          name: "All Points",
          description: "All Points",
          scanEntryIndexesEncoded: [],
          imageName: "",
          pixelIndexesEncoded: [],
          tags: [],
          modifiedUnixSec: 0,
          //owner: null
        }),
        Colours.GRAY_10,
        PointDrawer.ShapeCircle
      )
    );

    this._roiMap.set(
      PredefinedROIID.SelectedPoints,
      new RegionSettings(
        ROIItem.create({
          id: PredefinedROIID.SelectedPoints,
          scanId: "",
          name: "Selected Points",
          description: "Selected Points",
          scanEntryIndexesEncoded: [],
          imageName: "",
          pixelIndexesEncoded: [],
          tags: [],
          modifiedUnixSec: 0,
          //owner: null
        }),
        Colours.CONTEXT_BLUE,
        PointDrawer.ShapeCircle
      )
    );

    this._roiMap.set(
      PredefinedROIID.RemainingPoints,
      new RegionSettings(
        ROIItem.create({
          id: PredefinedROIID.RemainingPoints,
          scanId: "",
          name: "Remaining Points",
          description: "Remaining Points",
          scanEntryIndexesEncoded: [],
          imageName: "",
          pixelIndexesEncoded: [],
          tags: [],
          modifiedUnixSec: 0,
          //owner: null
        }),
        Colours.CONTEXT_GREEN,
        PointDrawer.ShapeCircle
      )
    );
  }

  getRegionSettings(roiId: string): Observable<RegionSettings> {
    const existing = this._roiMap.get(roiId);
    if (existing !== undefined) {
      return of(existing);
    }

    // Get the region itself
    return this._dataService.sendRegionOfInterestGetRequest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
      map((roiResp: RegionOfInterestGetResp) => {
        if (roiResp.regionOfInterest === undefined) {
          throw new Error("regionOfInterest data not returned for " + roiId);
        }

        const roi = new RegionSettings(roiResp.regionOfInterest, Colours.WHITE, PointDrawer.ShapeCircle);
        this.applyNewDrawConfig(roi);

        return roi;
      })
    );
  }

  private applyNewDrawConfig(item: RegionSettings) {
    // Return the next "free" one
    const shapes = [PointDrawer.ShapeCircle, PointDrawer.ShapeCross, PointDrawer.ShapeTriangle, PointDrawer.ShapeSquare];
    const colours = [
      // Colour-blind safe
      Colours.ORANGE,
      Colours.HOPBUSH,
      Colours.YELLOW,
      Colours.PURPLE,
      // "Other"
      Colours.ROI_TEAL,
      Colours.ROI_GREEN,
      Colours.ROI_BROWN,
      Colours.ROI_MAROON,
      Colours.ROI_RED,
      Colours.ROI_PINK,
      Colours.ROI_BLUE,
    ];

    const shapeIdx = Math.floor(this._nextDrawConfigIdx / colours.length);
    const colourIdx = this._nextDrawConfigIdx % colours.length;

    item.shape = shapes[shapeIdx];
    item.colour = colours[colourIdx];

    this._nextDrawConfigIdx++;
  }
}
