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

import { PMCDataValues } from "src/app/expression-language/data-values";

// Query data sources (interfaces)
export interface QuantifiedDataQuerierSource {
  getQuantId(): string;
  getScanId(): string;
  getInstrument(): string;
  getElevAngle(): number;
  getQuantifiedDataForDetector(detectorId: string, dataLabel: string): Promise<PMCDataValues>;
  getElementList(): Promise<string[]>;
  getPMCList(): Promise<number[]>;
  getDetectors(): Promise<string[]>;
  columnExists(col: string): Promise<boolean>;
}

export interface PseudoIntensityDataQuerierSource {
  getPseudoIntensityData(name: string): Promise<PMCDataValues>;
  getPseudoIntensityElementsList(): Promise<string[]>;
}

export interface SpectrumDataQuerierSource {
  getMaxSpectrumChannel(): number;
  getSpectrumRangeMapData(channelStart: number, channelEnd: number, detectorExpr: string): Promise<PMCDataValues>;
  // If sumOrMax==true, returns sum of differences between A and B otherwise max difference seen between A and B
  getSpectrumDifferences(channelStart: number, channelEnd: number, sumOrMax: boolean): Promise<PMCDataValues>;
}

export interface DiffractionPeakQuerierSource {
  getDiffractionPeakEffectData(channelStart: number, channelEnd: number): Promise<PMCDataValues>;
  getRoughnessData(): Promise<PMCDataValues>;
}

export interface HousekeepingDataQuerierSource {
  getHousekeepingData(name: string): Promise<PMCDataValues>;
  getPositionData(axis: string): Promise<PMCDataValues>;
  hasHousekeepingData(name: string): Promise<boolean>;
}
