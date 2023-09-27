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
import { Observable, of, map, shareReplay } from "rxjs";
import { ROIItem } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { APICachedDataService } from "./apicacheddata.service";
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
  private _shapes = [PointDrawer.ShapeCircle, PointDrawer.ShapeTriangle, PointDrawer.ShapeSquare, PointDrawer.ShapeCross];
  private _colours = [
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

  private _scanShapeMap = new Map<string, string>();
  private _nextScanShapeIdx: number = 0;
  private _roiMap = new Map<string, Observable<RegionSettings>>();
  private _nextColourIdx: number = 0;

  constructor(private _cachedDataService: APICachedDataService) {}

  getRegionSettings(scanId: string, roiId: string): Observable<RegionSettings> {
    // If we have not encountered this scan before, create the default ROIs for it
    let scanShape = this._scanShapeMap.get(scanId);
    if (!scanShape) {
      scanShape = this.nextScanShape();
      this._scanShapeMap.set(scanId, scanShape);
      this.createDefaultROIs(scanId, scanShape);
    }

    // Now we check if we can service locally from our  map
    let result = this._roiMap.get(scanId + "_" + roiId);
    if (result === undefined) {
      // Nothing stored, so get the ROI because we're combining that with the colour/shape we generate
      result = this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
        map((roiResp: RegionOfInterestGetResp) => {
          if (roiResp.regionOfInterest === undefined) {
            throw new Error("regionOfInterest data not returned for " + roiId);
          }

          const roi = new RegionSettings(roiResp.regionOfInterest, Colours.WHITE, PointDrawer.ShapeCircle);

          // Work out the shape (there should be one in our map by now)
          const scanShape = this._scanShapeMap.get(scanId);
          if (scanShape) {
            roi.shape = scanShape;
          }

          // Work out a colour for this ROI
          roi.colour = this.nextColour();

          return roi;
        }),
        shareReplay()
      );

      // Add it to the map too so a subsequent request will get this
      this._roiMap.set(roiId, result);
    }

    return result;
  }

  private createDefaultROIs(scanId: string, scanShape: string) {
    // Add defaults for predefined ROIs
    this._roiMap.set(
      scanId + "_" + PredefinedROIID.AllPoints,
      of(
        new RegionSettings(
          ROIItem.create({
            id: PredefinedROIID.AllPoints,
            scanId: scanId,
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
          scanShape
        )
      )
    );

    this._roiMap.set(
      scanId + "_" + PredefinedROIID.SelectedPoints,
      of(
        new RegionSettings(
          ROIItem.create({
            id: PredefinedROIID.SelectedPoints,
            scanId: scanId,
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
          scanShape
        )
      )
    );

    this._roiMap.set(
      scanId + "_" + PredefinedROIID.RemainingPoints,
      of(
        new RegionSettings(
          ROIItem.create({
            id: PredefinedROIID.RemainingPoints,
            scanId: scanId,
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
          scanShape
        )
      )
    );
  }

  private nextScanShape(): string {
    const shape = this._shapes[this._nextScanShapeIdx];
    this._nextScanShapeIdx = (this._nextScanShapeIdx + 1) % this._shapes.length;
    return shape;
  }

  private nextColour(): RGBA {
    const colour = this._colours[this._nextColourIdx];
    this._nextColourIdx = (this._nextColourIdx + 1) % this._colours.length;
    return colour;
  }
}
