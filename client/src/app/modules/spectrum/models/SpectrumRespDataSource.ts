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

import { SpectrumType, Spectrum, spectrumTypeToJSON } from "src/app/generated-protos/spectrum";
import { SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { SpectrumExpressionDataSource, SpectrumValues } from "./Spectrum";

export class SpectrumExpressionDataSourceImpl implements SpectrumExpressionDataSource {
  constructor(private _spectraResp: SpectrumResp) {}

  getSpectrum(locationIndex: number, detectorId: string, readType: SpectrumType): SpectrumValues {
    if (locationIndex < 0) {
      // Must be bulk or max
      if (readType != SpectrumType.SPECTRUM_BULK && readType != SpectrumType.SPECTRUM_MAX) {
        throw new Error("getSpectrum readType must be BulkSum or MaxValue if no locationIndex specified");
      }

      const readList: Spectrum[] = readType == SpectrumType.SPECTRUM_BULK ? this._spectraResp.bulkSpectra : this._spectraResp.maxSpectra;
      for (const spectrum of readList) {
        if (spectrum.detector == detectorId) {
          return this.convertSpectrum(spectrum);
        }
      }
    } else {
      // Must be bulk or max
      if (readType != SpectrumType.SPECTRUM_NORMAL && readType != SpectrumType.SPECTRUM_DWELL) {
        throw new Error("getSpectrum readType must be Normal or Dwell if locationIndex is specified");
      }

      if (this._spectraResp.spectraPerLocation[locationIndex]) {
        for (const spectrum of this._spectraResp.spectraPerLocation[locationIndex].spectra) {
          if (spectrum.detector == detectorId && spectrum.type == readType) {
            return this.convertSpectrum(spectrum);
          }
        }
      } else {
        console.warn("No spectra found for location idx: " + locationIndex + ", so no spectrum line will be contributed to display for this location.");
      }
    }

    throw new Error(`No ${spectrumTypeToJSON(readType)} spectrum found for detector: ${detectorId} and location ${locationIndex}`);
  }

  private convertSpectrum(s: Spectrum): SpectrumValues {
    const vals = new Float32Array(s.counts);

    // Get the live time
    let liveTime = 0;
    let found = false;

    const liveTimeValue = s.meta[this._spectraResp.liveTimeMetaIndex];
    if (liveTimeValue !== undefined) {
      if (liveTimeValue.fvalue !== undefined) {
        liveTime = liveTimeValue.fvalue;
        found = true;
      } else if (liveTimeValue.ivalue !== undefined) {
        liveTime = liveTimeValue.ivalue;
        found = true;
      }
    }

    if (!found) {
      throw new Error("Failed to get live time for spectrum");
    }

    return new SpectrumValues(vals, s.maxCount, s.detector, liveTime);
  }

  get locationsWithNormalSpectra(): number {
    return this._spectraResp.normalSpectraForScan;
  }
}
