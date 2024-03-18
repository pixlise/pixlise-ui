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

import { SpectrumType } from "src/app/generated-protos/spectrum";

export class SpectrumValues {
  constructor(
    public values: Float32Array,
    public maxValue: number,
    public sourceDetectorID: string,
    public liveTimeSec: number
  ) {}

  // Returns the sum of all spectra passed in
  // Live time is the sum of all live times
  // If detectors don't match, result has ""
  public static bulkSum(spectra: (SpectrumValues | undefined)[] | undefined): SpectrumValues | null {
    if (!spectra || spectra.length <= 0) {
      return null;
    }

    const firstSpectra = spectra[0] as SpectrumValues;
    if (!firstSpectra) {
      return null;
    }
    const result = new SpectrumValues(new Float32Array(firstSpectra.values), firstSpectra.maxValue, firstSpectra.sourceDetectorID, firstSpectra.liveTimeSec);
    for (let c = 1; c < spectra.length; c++) {
      const spectraPoints = spectra[c];
      if (!spectraPoints) {
        continue;
      }
      for (let i = 0; i < spectraPoints.values.length; i++) {
        result.values[i] += spectraPoints.values[i];
        if (result.values[i] > result.maxValue) {
          result.maxValue = result.values[i];
        }
      }

      if (spectraPoints.sourceDetectorID != result.sourceDetectorID) {
        result.sourceDetectorID = ""; // TODO: use Combined in this case?
      }

      result.liveTimeSec += spectraPoints.liveTimeSec;
    }
    return result;
  }

  // Returns the min spectrum for all spectra passed in
  // Live time is returned as the average between all spectra
  // If detectors don't match, result has ""
  public static minValue(spectra: SpectrumValues[]): SpectrumValues | null {
    if (spectra.length <= 0) {
      return null;
    }

    const result = new SpectrumValues(new Float32Array(spectra[0].values), spectra[0].maxValue, spectra[0].sourceDetectorID, spectra[0].liveTimeSec);
    let totalLiveTime = spectra[0].liveTimeSec;

    for (let c = 1; c < spectra.length; c++) {
      for (let i = 0; i < spectra[c].values.length; i++) {
        if (spectra[c].values[i] < result.values[i]) {
          result.values[i] = spectra[c].values[i];
        }
      }

      if (spectra[c].sourceDetectorID != result.sourceDetectorID) {
        result.sourceDetectorID = ""; // TODO: use Combined in this case?
      }

      totalLiveTime += spectra[c].liveTimeSec;
    }

    // Work out average live time
    result.liveTimeSec = totalLiveTime / spectra.length;

    // Now that we have all the values decided, we can find the max value again
    result.maxValue = result.values[0];
    for (const val of result.values) {
      if (val > result.maxValue) {
        result.maxValue = val;
      }
    }
    return result;
  }

  // Returns the max spectrum for all spectra passed in
  // Live time is returned as the average between all spectra
  // If detectors don't match, result has ""
  public static maxValue(spectra: SpectrumValues[]): SpectrumValues | null {
    if (spectra.length <= 0) {
      return null;
    }

    const result = new SpectrumValues(new Float32Array(spectra[0].values), spectra[0].maxValue, spectra[0].sourceDetectorID, spectra[0].liveTimeSec);
    let totalLiveTime = spectra[0].liveTimeSec;

    for (let c = 1; c < spectra.length; c++) {
      for (let i = 0; i < spectra[c].values.length; i++) {
        if (spectra[c].values[i] > result.values[i]) {
          result.values[i] = spectra[c].values[i];
        }
      }

      // Max values - we can just look at the max values per spectrum
      if (spectra[c].maxValue > result.maxValue) {
        result.maxValue = spectra[c].maxValue;
      }

      if (spectra[c].sourceDetectorID != result.sourceDetectorID) {
        result.sourceDetectorID = ""; // TODO: use Combined in this case?
      }

      totalLiveTime += spectra[c].liveTimeSec;
    }

    // Work out average live time
    result.liveTimeSec = totalLiveTime / spectra.length;

    return result;
  }

  // returns A - B
  // Live time is averaged into result
  public static subtract(A: SpectrumValues | null | undefined, B: SpectrumValues | null | undefined): SpectrumValues | null {
    if (A === null || A === undefined || B === null || B === undefined) {
      return null;
    }
    const result = new SpectrumValues(
      new Float32Array(A.values.length),
      0,
      A.sourceDetectorID == B.sourceDetectorID ? A.sourceDetectorID : "", // TODO: use Combined in this case?
      (A.liveTimeSec + B.liveTimeSec) / 2
    );

    for (let c = 0; c < B.values.length; c++) {
      result.values[c] = A.values[c] - B.values[c];

      if (result.values[c] > result.maxValue) {
        result.maxValue = result.values[c];
      }
    }

    return result;
  }

  // Separated diffraction returns points where there is a difference between A and B
  public static removeDiffraction(checkDetector: SpectrumValues, otherDetector: SpectrumValues): SpectrumValues {
    const A = 2;
    const n = 2;

    const result = new SpectrumValues(
      new Float32Array(checkDetector.values.length),
      0,
      checkDetector.sourceDetectorID, // Return check detector
      checkDetector.liveTimeSec // Returns check detector livetime
    );

    for (let c = 0; c < checkDetector.values.length; c++) {
      const minOfDetectors = Math.min(checkDetector.values[c], otherDetector.values[c]);

      // Calculate threshold
      const T = A * Math.sqrt(minOfDetectors + n);

      if (Math.abs(checkDetector.values[c] - otherDetector.values[c]) > T) {
        // Use minimum
        result.values[c] = minOfDetectors;
      } else {
        result.values[c] = checkDetector.values[c];
      }

      if (result.values[c] > result.maxValue) {
        result.maxValue = result.values[c];
      }
    }
    return result;
  }

  // Returns the normalized (to 1sec) spectrum
  // Live time is 1ms by definition
  public getAsCountsPerMin(): SpectrumValues {
    const sec = 60;
    // Divide each value by liveTime
    const result = new SpectrumValues(
      new Float32Array(this.values),
      Math.floor((sec * this.maxValue) / this.liveTimeSec),
      this.sourceDetectorID,
      sec /*by definition*/
    );

    for (let c = 0; c < result.values.length; c++) {
      result.values[c] = (sec * result.values[c]) / this.liveTimeSec;
    }

    return result;
  }

  // Dividing the spectrum counts by a value. Does not affect livetime, this is purely for implementing normalise-by-PMCs
  // for bulk sums
  public static divideBy(spectrum: SpectrumValues, denominator: number): SpectrumValues {
    if (denominator <= 0) {
      console.error("SpectrumValues.divideBy called with denominator of: " + denominator + ". Skipped divide operation.");
      return spectrum;
    }

    const result = new SpectrumValues(new Float32Array(spectrum.values), spectrum.maxValue / denominator, spectrum.sourceDetectorID, spectrum.liveTimeSec);

    // Divide each count
    for (let c = 0; c < result.values.length; c++) {
      result.values[c] /= denominator;
    }

    return result;
  }
}

export interface SpectrumExpressionDataSource {
  // If locationIndex is negative, assume it's an aggregation, so look at readType to determine
  // if it's bulk or max. Anything else should fail in this case.
  // If locationIndex is >= 0 then we assume it's just requesting a specific spectrum, in which case
  // readType should be normal or dwell, anything else should fail
  getSpectrum(locationIndex: number, detectorId: string, readType: SpectrumType): SpectrumValues;
  locationsWithNormalSpectra: number;
}

export class SpectrumExpressionParser {
  getSpectrumValues(
    spectrumSource: SpectrumExpressionDataSource,
    locationIndexes: number[],
    lineExpression: string,
    lineLabel: string,
    readType: SpectrumType,
    countsPerMin: boolean,
    countsPerPMC: boolean
  ): Map<string, SpectrumValues> {
    // Build it based on the expression... we're pretty tight in what we can interpret, this is not at the moment a general purpose expression evaluator!!
    // This can return multiple lines, depending on the expression
    const exprTerms: Map<string, SpectrumValues> = new Map<string, SpectrumValues>();

    for (const exprTerm of this.getTerms(lineExpression)) {
      if (exprTerm.startsWith("max(")) {
        const spectrum = this.getMaxTerm(spectrumSource, locationIndexes, lineExpression, exprTerm, readType);
        if (spectrum) {
          exprTerms.set(exprTerm, spectrum);
        }
      } else if (exprTerm.startsWith("bulk(")) {
        const spectrum = this.getBulkTerm(spectrumSource, locationIndexes, lineExpression, exprTerm, readType);
        if (spectrum) {
          exprTerms.set(exprTerm, spectrum);
        }
      }
      // No need for an error case, getTerms is a hack :) If this becomes a real general purpose parser this will have to change...
    }

    // Getting back nothing is an error...
    if (exprTerms.size == 0) {
      return exprTerms;
    }

    let spectrum: SpectrumValues | null = null;

    // Work out how to combine the expressions
    if (
      lineExpression.startsWith("diff(") ||
      lineExpression.startsWith("minOf(") ||
      lineExpression.startsWith("maxOf(") ||
      lineExpression.startsWith("sum(") ||
      lineExpression.startsWith("removeDiffraction(")
    ) {
      spectrum = this.combineSpectraWithExpression(lineExpression, exprTerms);

      if (spectrum && lineExpression.startsWith("sum(") && countsPerMin) {
        spectrum = spectrum.getAsCountsPerMin();
      }
    } else {
      // Here we expect a single spectrum to have come back, because no outer "combining" functions were found
      // Fail if this is not the case
      if (exprTerms.size != 1) {
        throw new Error("getSpectrumValues ended up with multiple spectra to return");
      }

      // The expression must just be pretty basic, eg "bulk(A)" so just return what we have in the terms
      spectrum = Array.from(exprTerms.values())[0];

      if (countsPerMin) {
        spectrum = spectrum.getAsCountsPerMin();
      }
    }

    // Apply counts/PMC if needed
    if (spectrum && countsPerPMC) {
      spectrum = SpectrumValues.divideBy(spectrum, this.getCountPerPMCDenom(locationIndexes.length, spectrumSource));
    }

    // The one we return should have the label that was specified to begin with!
    if (spectrum) {
      exprTerms.clear();
      exprTerms.set(lineLabel, spectrum);
    }
    return exprTerms;
  }

  // Simply here to check for 0 - that's a special case meaning use the bulk-sum PMC, in which case we find the number of PMCs
  // that had a normal (or dwell) spectrum
  private getCountPerPMCDenom(locationCount: number, spectrumSource: SpectrumExpressionDataSource): number {
    if (locationCount == 0) {
      return spectrumSource.locationsWithNormalSpectra;
    }
    return locationCount;
  }

  private combineSpectraWithExpression(lineExpression: string, exprTerms: Map<string, SpectrumValues>): SpectrumValues | null {
    // Check the combining function
    const funcEndIdx = lineExpression.indexOf("(");
    if (funcEndIdx == -1) {
      throw new Error("Failed to read combining func in expression: " + lineExpression);
    }

    const func = lineExpression.substring(0, funcEndIdx);

    // Split up the parameters
    const paramsStr = lineExpression.substring(funcEndIdx + 1, lineExpression.length - 1);
    const params = paramsStr.split(",");

    // There should be 2 params, and both should exist in our terms
    if (params.length != 2 || !exprTerms.has(params[0]) || !exprTerms.has(params[1])) {
      throw new Error("Failed to parse params in expression: " + lineExpression);
    }

    if (func == "diff") {
      return SpectrumValues.subtract(exprTerms.get(params[0]), exprTerms.get(params[1]));
    } else if (func == "sum") {
      return SpectrumValues.bulkSum([exprTerms.get(params[0]), exprTerms.get(params[1])]);
    } else if (func == "minOf") {
      const firstParam = exprTerms.get(params[0]);
      const secondParam = exprTerms.get(params[1]);
      if (!firstParam || !secondParam) {
        return null;
      }
      return SpectrumValues.minValue([firstParam, secondParam]);
    } else if (func == "maxOf") {
      const firstParam = exprTerms.get(params[0]);
      const secondParam = exprTerms.get(params[1]);
      if (!firstParam || !secondParam) {
        return null;
      }
      return SpectrumValues.maxValue([firstParam, secondParam]);
    } else if (func == "removeDiffraction") {
      const firstParam = exprTerms.get(params[0]);
      const secondParam = exprTerms.get(params[1]);
      if (!firstParam || !secondParam) {
        return null;
      }
      return SpectrumValues.removeDiffraction(firstParam, secondParam);
    }

    console.warn('Unknown combine func: "' + func + '" in expression: ' + lineExpression);
    return null;
  }

  private getBulkTerm(
    spectrumSource: SpectrumExpressionDataSource,
    locationIndexes: number[],
    lineExpression: string,
    exprTerm: string,
    readType: SpectrumType
  ): SpectrumValues | null {
    return this.getTermSpectra(spectrumSource, locationIndexes, lineExpression, exprTerm, readType, false);
  }

  private getMaxTerm(
    spectrumSource: SpectrumExpressionDataSource,
    locationIndexes: number[],
    lineExpression: string,
    exprTerm: string,
    readType: SpectrumType
  ): SpectrumValues | null {
    return this.getTermSpectra(spectrumSource, locationIndexes, lineExpression, exprTerm, readType, true);
  }

  // Scans lineExpression for terms which are then combined by outer functions. The only possible terms
  // are the ones in getTerms, basically bulk() and max() of A or B
  // These are returned in a map containing items: term->spectrum
  private getTermSpectra(
    spectrumSource: SpectrumExpressionDataSource,
    locationIndexes: number[],
    lineExpression: string,
    exprTerm: string,
    readType: SpectrumType,
    countsPerMinWhenReading: boolean
  ): SpectrumValues | null {
    let detector = "";
    if (exprTerm.indexOf("(A)") >= 0) {
      detector = "A";
    } else if (exprTerm.indexOf("(B)") >= 0) {
      detector = "B";
    } else {
      throw new Error('getExpressionTerms: bad term: "' + exprTerm + '" in expression: ' + lineExpression);
    }

    // Retrieve the spectrum this refers to. Note that if locationIndexes is empty, it's a special case where
    // we're asking for the whole dataset. In this case, we look for the spectrums with expression type BulkSum or MaxValue
    // instead of processing up all spectra ourselves. This is not only faster, but more accurate, as the sum/max was computed
    // by PIQUANT in the GDS pipeline
    // There may be datasets where this is not available, so as a fallback measure we can still calculate bulk sum
    // for all location indexes
    const spectra: SpectrumValues[] = [];

    if (locationIndexes.length <= 0) {
      let datasetSpectrumReadType = SpectrumType.SPECTRUM_UNKNOWN;
      if (exprTerm.startsWith("bulk(")) {
        datasetSpectrumReadType = SpectrumType.SPECTRUM_BULK;
      } else if (exprTerm.startsWith("max(")) {
        datasetSpectrumReadType = SpectrumType.SPECTRUM_MAX;
      } else {
        throw new Error('getExpressionTerms: unknown function in term: "' + exprTerm + '" in expression: ' + lineExpression);
      }

      let spectrum = spectrumSource.getSpectrum(-1, detector, datasetSpectrumReadType);
      if (spectrum) {
        if (countsPerMinWhenReading) {
          spectrum = spectrum.getAsCountsPerMin();
        }
        spectra.push(spectrum);
      }
    } else {
      for (const idx of locationIndexes) {
        let spectrum: SpectrumValues | null = null;
        try {
          spectrum = spectrumSource.getSpectrum(idx, detector, readType);
        } catch (e) {
          // If we fail to read a spectrum, just skip it and continue
          console.error(e);
          continue;
        }
        if (spectrum) {
          if (countsPerMinWhenReading) {
            spectrum = spectrum.getAsCountsPerMin();
          }
          spectra.push(spectrum);
        } else {
          // It's possible the PMC didn't have a normal spectrum, or A/B, don't fail the whole thing just because of this
          console.warn("Location index: " + idx + " no spectrum found for detector: " + detector + ", readtype: " + readType);
        }
      }
    }

    // depending on if we're max or bulk, combine the spectra we just read
    let spectrumToStore: SpectrumValues | null = null;
    if (exprTerm.startsWith("max(")) {
      // With max we normalise BEFORE (see countsPerMinWhenReading)
      spectrumToStore = SpectrumValues.maxValue(spectra);
    } else if (exprTerm.startsWith("bulk(")) {
      spectrumToStore = SpectrumValues.bulkSum(spectra);

      // With bulk sum we normalise AFTER
    }

    return spectrumToStore;
  }

  private getTerms(lineExpression: string): string[] {
    const result = [];

    const toCheck = ["bulk(A)", "bulk(B)", "max(A)", "max(B)"];
    for (const check of toCheck) {
      const idx = lineExpression.indexOf(check);
      if (idx >= 0) {
        result.push(check);
      }
    }

    return result;
  }
}
