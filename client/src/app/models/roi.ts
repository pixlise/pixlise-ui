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

import { ObjectCreator } from "src/app/models/BasicTypes";
import { arraysEqual } from "src/app/utils/utils";

export class MistROIItem
{
    constructor(
        public species: string,
        public mineralGroupID: string,
        public ID_Depth: number,
        public ClassificationTrail: string,
        public formula: string
    )
    {
    }
}

export class ROISavedItem
{
    constructor(
        public id: string,
        public name: string,
        public locationIndexes: number[],
        public description: string,
        public imageName: string,
        public pixelIndexes: Set<number>,
        public shared: boolean,
        public creator: ObjectCreator,
        public mistROIItem: MistROIItem = null,
        public visible: boolean = false,
        public dateAdded: number = null
    )
    {
    }

    public static equals(a: ROISavedItem, b: ROISavedItem): boolean
    {
        return a.id == b.id &&
            a.name == b.name &&
            arraysEqual(a.locationIndexes, b.locationIndexes) &&
            a.description == b.description &&
            a.shared == b.shared &&
            ( (!a.creator && !b.creator) || a.creator.user_id == b.creator.user_id);
    }
}

export class ROIItem
{
    constructor(
        public name: string,
        public locationIndexes: number[],
        public description: string,
        public imageName: string,
        public pixelIndexes: number[],
        public mistROIItem: MistROIItem = null,
    )
    {
    }
}

export class PredefinedROIID
{
    public static readonly AllPoints = "AllPoints";
    public static readonly SelectedPoints = "SelectedPoints";
    public static readonly RemainingPoints = "RemainingPoints";

    public static isPredefined(roiID: string): boolean
    {
        return (
            roiID == PredefinedROIID.AllPoints ||
            roiID == PredefinedROIID.SelectedPoints ||
            roiID == PredefinedROIID.RemainingPoints
        );
    }

    public static readonly defaultROIs: string[] = [PredefinedROIID.AllPoints, PredefinedROIID.SelectedPoints];
}

export function orderVisibleROIs(rois: string[]): string[]
{
    // Run through, make sure AllPoints is first, SelectedPoints is last (if they exist)
    let result = [];

    let hasAllPoints = false;
    let hasSelected = false;
    let hasRemaining = false;
    for(let roi of rois)
    {
        if(roi == PredefinedROIID.SelectedPoints)
        {
            hasSelected = true;
        }
        else if(roi == PredefinedROIID.AllPoints)
        {
            hasAllPoints = true;
        }
        else if(roi == PredefinedROIID.RemainingPoints)
        {
            hasRemaining = true;
        }
        else
        {
            result.push(roi);
        }
    }

    // Now add the all points/selected ones
    if(hasSelected)
    {
        result.push(PredefinedROIID.SelectedPoints);
    }
    if(hasAllPoints)
    {
        result.unshift(PredefinedROIID.AllPoints);
    }
    if(hasRemaining)
    {
        result.unshift(PredefinedROIID.RemainingPoints);
    }
    return result;
}
