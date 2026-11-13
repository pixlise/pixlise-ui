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
import { map, Observable, of } from "rxjs";
import { readTerms, SpectrumTermFetcherRemote } from "./SpectrumFetch";
import { SpectrumDataRemoteService } from "../../pixlisecore/services/spectrum-data-remote.service";

export class SpectrumValues {
  constructor(
    public values: Float32Array, // Counts (as float in case we're doing some weird log display stuff)
    public maxValue: number, // The max value that appears in values array
    public sourceDetectorID: string,
    public liveTimeSec: number, // Integration time
    public realTimeSec: number, // Integration time
    public offset: number, // Energy calibration
    public xPerChan: number // Energy calibration
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
    const result = new SpectrumValues(
      new Float32Array(firstSpectra.values),
      firstSpectra.maxValue,
      firstSpectra.sourceDetectorID,
      firstSpectra.liveTimeSec,
      firstSpectra.realTimeSec,
      firstSpectra.offset,
      firstSpectra.xPerChan
    );

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

    const result = new SpectrumValues(
      new Float32Array(spectra[0].values),
      spectra[0].maxValue,
      spectra[0].sourceDetectorID,
      spectra[0].liveTimeSec,
      spectra[0].realTimeSec,
      spectra[0].offset,
      spectra[0].xPerChan
    );

    let totalLiveTime = spectra[0].liveTimeSec;
    let totalOffset = spectra[0].offset;
    let totalXPerChan = spectra[0].xPerChan;

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
      totalOffset += spectra[c].offset;
      totalXPerChan += spectra[c].xPerChan;
    }

    // Work out average live time
    result.liveTimeSec = totalLiveTime / spectra.length;
    result.offset = totalOffset / spectra.length;
    result.xPerChan = totalXPerChan / spectra.length;

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

    const result = new SpectrumValues(
      new Float32Array(spectra[0].values),
      spectra[0].maxValue,
      spectra[0].sourceDetectorID,
      spectra[0].liveTimeSec,
      spectra[0].realTimeSec,
      spectra[0].offset,
      spectra[0].xPerChan
    );

    let totalLiveTime = spectra[0].liveTimeSec;
    let totalOffset = spectra[0].offset;
    let totalXPerChan = spectra[0].xPerChan;

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
      totalOffset += spectra[c].offset;
      totalXPerChan += spectra[c].xPerChan;
    }

    // Work out average live time
    result.liveTimeSec = totalLiveTime / spectra.length;
    result.offset = totalOffset / spectra.length;
    result.xPerChan = totalXPerChan / spectra.length;

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
      (A.liveTimeSec + B.liveTimeSec) / 2,
      (A.realTimeSec + B.realTimeSec) / 2,
      // TODO: Do we have anything better to do for the calibration??
      A.offset,
      A.xPerChan
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
      checkDetector.liveTimeSec, // Returns check detector livetime
      checkDetector.realTimeSec, // Returns check detector realtime
      // TODO: Do we have anything better to do for the calibration??
      checkDetector.offset,
      checkDetector.xPerChan
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
      sec, /*livetime by definition*/
      sec, /*realtime by definition*/
      this.offset, // Not affected by integration time
      this.xPerChan // Not affected by integration time
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

    const result = new SpectrumValues(
      new Float32Array(spectrum.values),
      spectrum.maxValue / denominator,
      spectrum.sourceDetectorID,
      spectrum.liveTimeSec,
      spectrum.realTimeSec,
      spectrum.offset,
      spectrum.xPerChan
    );

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
  getSpectrum(locationIndex: number, detectorId: string, readType: SpectrumType): Observable<SpectrumValues>;
  locationsWithNormalSpectra: number;
}

export class SpectrumExpressionParser {
  private _exprTerms: Map<string, SpectrumValues> = new Map<string, SpectrumValues>();

  constructor(
    private _scanId: string,
    private _locationIndexes: number[],
    private _readType: SpectrumType,
    private _countsPerMin: boolean,
    private _countsPerPMC: boolean,
    private _detectors: string[],
    private _allLines: string[],
    private _spectrumRemoteSvc: SpectrumDataRemoteService) {}

  getSpectrumValues(lineExpression: string, lineLabel: string): Observable<Map<string, SpectrumValues>> {
    // If we have pre-loaded terms, just process the expression now
    if (this._exprTerms.size > 0) {
      return of(this.processLineExpression(this._exprTerms, this._locationIndexes, lineExpression, lineLabel, this._countsPerMin, this._countsPerPMC));
    }

    return this.preLoadTerms().pipe(
      map(exprTerms => {
        this._exprTerms = exprTerms;
        return this.processLineExpression(this._exprTerms, this._locationIndexes, lineExpression, lineLabel, this._countsPerMin, this._countsPerPMC);
      })
    )
  }

  private preLoadTerms(): Observable<Map<string, SpectrumValues>> {
    const terms = readTerms(this._allLines, this._detectors);

    const fetcher = new SpectrumTermFetcherRemote(this._spectrumRemoteSvc);
    return fetcher.fetch(this._scanId, terms, this._readType, this._locationIndexes);
  }

  // Build it based on the expression... we're pretty tight in what we can interpret, this is not at the moment a general purpose expression evaluator!!
  // This can return multiple lines, depending on the expression
  private processLineExpression(
    exprTerms: Map<string, SpectrumValues>,
    locationIndexes: number[],
    lineExpression: string,
    lineLabel: string,
    countsPerMin: boolean,
    countsPerPMC: boolean) {
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
      // Here we aren't expecting any of the above complex functionality - we just should find the requested
      // spectrum in the expression terms we parsed already
      spectrum = exprTerms.get(lineExpression) || null;
      if (!spectrum) {
        throw new Error(`getSpectrumValues did not find spectrum: ${lineExpression}`);
      }

      if (countsPerMin) {
        spectrum = spectrum.getAsCountsPerMin();
      }
    }

    // Apply counts/PMC if needed
    if (spectrum && countsPerPMC) {
      spectrum = SpectrumValues.divideBy(spectrum, this.getCountPerPMCDenom(locationIndexes.length));
    }

    // The one we return should have the label that was specified to begin with!
    if (spectrum) {
      exprTerms.clear();
      exprTerms.set(lineLabel, spectrum);
    }
    return exprTerms;
  }

  //////////////////////////////////////////////////////////////////////////
  // Utility functions
  //////////////////////////////////////////////////////////////////////////

  // Simply here to check for 0 - that's a special case meaning use the bulk-sum PMC, in which case we find the number of PMCs
  // that had a normal (or dwell) spectrum
  private getCountPerPMCDenom(locationCount: number): number {
    if (locationCount == 0) {
      return this._spectrumRemoteSvc.getScanNormalSpectraCount(this._scanId);
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
}
