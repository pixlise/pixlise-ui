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

import { MinMax } from "src/app/models/BasicTypes";
import { RGBA } from "src/app/utils/colours";

export type VariogramExportRawPoint = {
  currentPMC: number;
  comparingPMC: number;
  expressions: string;
  comparisonAlgorithms: string;
  firstExpressionComparisonValue: number;
  secondExpressionComparisonValue: number;
  combinedValue: number;
  distance: number;
  binIdx: number;
};

export type VariogramExportPoint = {
  roiId: string;
  roiName: string;
  comparisonAlgorithm: string;
  title: string;
  distance: number;
  sum: number;
  count: number;
  meanValue: number | null;
};

export class VariogramPoint {
  constructor(
    public distance: number,
    public sum: number,
    public count: number,
    public meanValue: number | null
  ) {}
}

export class VariogramPointGroup {
  constructor(
    public colour: RGBA,
    public shape: string,
    public points: VariogramPoint[],
    public valueRange: MinMax,
    public roiId: string
  ) {}
}

export class VariogramData {
  constructor(
    public title: string,
    public pointGroups: VariogramPointGroup[],
    public valueRange: MinMax,
    public errorMsg: string
  ) {}
}

export class VariogramScanMetadata {
  constructor(
    public minXYDistance_mm: number,
    public locationPointXSize: number,
    public locationPointYSize: number,
    public beamUnitsInMeters: boolean,
    public locationCount: number
  ) {}
}
