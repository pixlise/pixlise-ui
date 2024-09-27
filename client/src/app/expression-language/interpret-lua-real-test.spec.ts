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

import { LuaDataQuerier } from "src/app/expression-language/interpret-lua";
//import { InterpreterDataSource } from "./interpreter-data-source";
import { PMCDataValues, PMCDataValue } from "src/app/expression-language/data-values";
import { decompressZeroRunLengthEncoding } from "../utils/utils";
import { Diffraction, Diffraction_Location } from "src/app/generated-protos/files/diffraction";
import { Experiment, Experiment_Location_MetaDataItem, Experiment_MetaDataType } from "src/app/generated-protos/files/experiment";
import { Quantification } from "src/app/generated-protos/quantification";
import { InterpreterDataSource } from "./interpreter-data-source";
import { periodicTableDB } from "../periodic-table/periodic-table-db";
import { ExpressionDataSource } from "../modules/pixlisecore/models/expression-data-source";
import { DetectedDiffractionPerLocation, DetectedDiffractionPerLocation_DetectedDiffractionPeak } from "../generated-protos/diffraction-data";
import { DetectedDiffractionPeaksResp } from "../generated-protos/diffraction-detected-peak-msgs";
import { DiffractionPeak, RoughnessItem } from "../modules/pixlisecore/models/diffraction";
import { SpectrumEnergyCalibration } from "../models/BasicTypes";

fdescribe("LuaDataQuerier runQuery() for real expression", () => {
  const scanId = "371196417";
  let datasetBin: Experiment;
  let diffractionBin: Diffraction;
  let quantBin: Quantification;
  let exprSiO2prime: string = "";
  let expectedOutput: object = {};
  const modules = new Map<string, string>();
  let spectrumEnergyCalibration: SpectrumEnergyCalibration[] = [];

  let diffractionInfoRead: {
    allPeaks: DiffractionPeak[];
    roughnessItems: RoughnessItem[];
  } = { allPeaks: [], roughnessItems: [] };

  beforeEach(done => {
    //waitForAsync(() => {
    Promise.all([
      // NOTE: These are only served by karma if they're mentioned in karma.conf.js
      readTestFile(`scan/${scanId}/dataset.bin`),
      readTestFile(`scan/${scanId}/diffraction-db.bin`),
      readTestFile(`quant/${scanId}/quant-616i0uwwtns0yfbt.bin`),
      readTestFile("expressions/m1jronthh7qkdx6q.lua"),
      readTestFile("modules/Locations0.3.0.lua"),
      readTestFile("modules/Estimate0.29.0.lua"),
      readTestFile("modules/GeoAndDiffCorrection2.9.0.lua"),
      readTestFile("expected-output/m1jronthh7qkdx6q.json"),
    ]).then((results: [ArrayBuffer, ArrayBuffer, ArrayBuffer, ArrayBuffer, ArrayBuffer, ArrayBuffer, ArrayBuffer, ArrayBuffer]) => {
      datasetBin = Experiment.decode(new Uint8Array(results[0], 0, results[0].byteLength));
      diffractionBin = Diffraction.decode(new Uint8Array(results[1], 0, results[1].byteLength));
      quantBin = Quantification.decode(new Uint8Array(results[2], 0, results[2].byteLength));
      exprSiO2prime = new TextDecoder().decode(results[3]);
      modules.set("Locations", new TextDecoder().decode(results[4]));
      modules.set("Estimate", new TextDecoder().decode(results[5]));
      modules.set("GeoAndDiffCorrection", new TextDecoder().decode(results[6]));
      expectedOutput = JSON.parse(new TextDecoder().decode(results[7]));

      spectrumEnergyCalibration = readBulkSpectrumCalibration(datasetBin);
      const diffPerLoc: DetectedDiffractionPerLocation[] = readDiffraction(datasetBin, diffractionBin);

      // We now have the "API request" done, do the UI-side of this
      diffractionInfoRead = ExpressionDataSource.readDiffractionPeaks(
        DetectedDiffractionPeaksResp.create({ peaksPerLocation: diffPerLoc }),
        scanId,
        {},
        spectrumEnergyCalibration
      );

      done();
    });
  });

  // Also attempt to test:
  // Diffraction Map (B) from 10/19/2023

  it("should run complex expression", done => {
    const lua = new LuaDataQuerier(false);
    const ds = makeDataSource(scanId, datasetBin, diffractionInfoRead.allPeaks, quantBin);

    lua.runQuery(exprSiO2prime, modules, ds, true, false, false, 600000, null).subscribe({
      // Result
      next: value => {
        console.log(`Test Query took: ${value.runtimeMs.toLocaleString()}ms`);

        const expDataRequired = [
          "spectrum",
          "diffraction",
          "expr-data-livetime(A)",
          "expr-data-livetime(B)",
          "expr-elem-SiO2-%-as-mmol(A)",
          "expr-elem-SiO2-err(A)",
          "expr-elem-SiO2-%-as-mmol(B)",
          "expr-elem-SiO2-err(B)",
          "expr-elem-CaO-%-as-mmol(A)",
          "expr-elem-CaO-err(A)",
          "expr-elem-CaO-%-as-mmol(B)",
          "expr-elem-CaO-err(B)",
          "expr-elem-Na2O-%-as-mmol(A)",
          "expr-elem-Na2O-err(A)",
          "expr-elem-Na2O-%-as-mmol(B)",
          "expr-elem-Na2O-err(B)",
          "expr-elem-K2O-%-as-mmol(A)",
          "expr-elem-K2O-err(A)",
          "expr-elem-K2O-%-as-mmol(B)",
          "expr-elem-K2O-err(B)",
          "expr-elem-MgO-%-as-mmol(A)",
          "expr-elem-MgO-err(A)",
          "expr-elem-MgO-%-as-mmol(B)",
          "expr-elem-MgO-err(B)",
          "expr-elem-FeO-T-%-as-mmol(A)",
          "expr-elem-FeO-T-err(A)",
          "expr-elem-FeO-T-%-as-mmol(B)",
          "expr-elem-FeO-T-err(B)",
          "expr-elem-MnO-%-as-mmol(A)",
          "expr-elem-MnO-err(A)",
          "expr-elem-MnO-%-as-mmol(B)",
          "expr-elem-MnO-err(B)",
        ];

        expect(value.dataRequired).toEqual(expDataRequired);

        // Form a comparable result
        const expectedOutputValues: PMCDataValue[] = [];
        for (const v of Object.values(expectedOutput)) {
          expectedOutputValues.push(new PMCDataValue(v["pmc"], v["value"]));
        }

        let valuesEqual = 0;
        let diff = "";
        for (let c = 0; c < expectedOutputValues.length; c++) {
          expect(`${value.resultValues.values[c].pmc}`).toEqual(`${expectedOutputValues[c].pmc}`);
          if (value.resultValues.values[c].value === expectedOutputValues[c].value) {
            valuesEqual++;
          } else {
            diff += `${value.resultValues.values[c].pmc} = ${Math.round(value.resultValues.values[c].value * 10000) / 10000} vs ${
              Math.round(expectedOutputValues[c].value * 10000) / 10000
            }\n`;
          }

          // expect(`${value.resultValues.values[c].pmc}=${Math.round(value.resultValues.values[c].value * 10000) / 10000}`).toEqual(
          //   `${expectedOutputValues[c].pmc}=${Math.round(expectedOutputValues[c].value * 10000) / 10000}`
          // );
        }

        expect(valuesEqual).toEqual(expectedOutputValues.length);
        if (valuesEqual != expectedOutputValues.length) {
          console.log(
            `${expectedOutputValues.length - valuesEqual}/${expectedOutputValues.length} (${
              Math.round(((expectedOutputValues.length - valuesEqual) / expectedOutputValues.length) * 10000) / 100
            }%) Differences in expression output\nPMC = calculated vs expected\n` + diff
          );
        }

        //  expect(value.resultValues.values).toEqual(PMCDataValues.makeWithValues(expectedOutputValues));
        //const exp = new DataQueryResult(1, true, ["expr-elem-Ca-%(B)"], value.runtimeMs, "", "", new Map<string, PMCDataValues>(), "");
        //expect(value).toEqual(exp);
      },
      // Error handler
      error: err => {
        throw new Error(err);
      },
      // Finalizer
      complete: done,
    });
  });
});

function readBulkSpectrumCalibration(datasetBin: Experiment): SpectrumEnergyCalibration[] {
  const result: SpectrumEnergyCalibration[] = [];

  let eVStartMetaIdx = -1;
  let eVperChannelMetaIdx = -1;
  let readTypeMetaIdx = -1;
  let detectorMetaIdx = -1;

  for (let c = 0; c < datasetBin.metaLabels.length; c++) {
    const label = datasetBin.metaLabels[c];
    if (label == "OFFSET") {
      eVStartMetaIdx = c;
    } else if (label == "XPERCHAN") {
      eVperChannelMetaIdx = c;
    } else if (label == "READTYPE") {
      readTypeMetaIdx = c;
    } else if (label == "DETECTOR_ID") {
      detectorMetaIdx = c;
    }

    if (eVStartMetaIdx >= 0 && eVperChannelMetaIdx >= 0 && readTypeMetaIdx >= 0 && detectorMetaIdx >= 0) {
      break;
    }
  }

  for (let idx = 0; idx < datasetBin.locations.length; idx++) {
    const loc = datasetBin.locations[idx];

    for (const det of loc.detectors) {
      if (getMetaValue(readTypeMetaIdx, det.meta)?.svalue == "BulkSum") {
        let eVstart = 0;
        let eVperChannel = 1;

        let m = getMetaValue(eVStartMetaIdx, det.meta);
        if (m) {
          if (m.fvalue !== undefined) {
            eVstart = m.fvalue;
          } else if (m.ivalue !== undefined) {
            eVstart = m.ivalue;
          }
        }

        m = getMetaValue(eVperChannelMetaIdx, det.meta);
        if (m) {
          if (m.fvalue !== undefined) {
            eVperChannel = m.fvalue;
          } else if (m.ivalue !== undefined) {
            eVperChannel = m.ivalue;
          }
        }

        m = getMetaValue(detectorMetaIdx, det.meta);
        if (m) {
          result.push(new SpectrumEnergyCalibration(eVstart, eVperChannel, m.svalue));
        }
      }
    }
  }

  return result;
}

function getMetaValue(idx: number, from: Experiment_Location_MetaDataItem[]): Experiment_Location_MetaDataItem | undefined {
  for (const item of from) {
    if (item.labelIdx == idx) {
      return item;
    }
  }

  return undefined;
}

function readDiffraction(datasetBin: Experiment, diffractionBin: Diffraction): DetectedDiffractionPerLocation[] {
  // Read diffraction bin data as API would. Also read spectrum calibration while we're at it!
  const diffLookup = new Map<number, Diffraction_Location>();
  for (const loc of diffractionBin.locations) {
    diffLookup.set(parseInt(loc.id), loc);
  }

  const diffPerLoc: DetectedDiffractionPerLocation[] = [];
  for (let idx = 0; idx < datasetBin.locations.length; idx++) {
    const loc = datasetBin.locations[idx];
    const pmc = parseInt(loc.id);

    const diffLoc = diffLookup.get(pmc);
    if (diffLoc) {
      const peaks: DetectedDiffractionPerLocation_DetectedDiffractionPeak[] = [];

      for (const peak of diffLoc.peaks) {
        peaks.push(peak);
      }

      diffPerLoc.push(DetectedDiffractionPerLocation.create({ id: diffLoc.id, peaks: peaks }));
    }
  }

  return diffPerLoc;
}

async function readTestFile(relativePath: string): Promise<ArrayBuffer> {
  const fullPath = "base/src/app/expression-language/test-data/" + relativePath;

  const response = await fetch(fullPath);
  const blob = await response.blob();
  return blob.arrayBuffer();
}

function compareWithCSV(fileName: string, values: PMCDataValue[]) {
  // Read the input file and compare with what we've generated
  readTestFile("input-data/" + fileName).then((val: ArrayBuffer) => {
    // Got it as an array buffer, read as csv
    const csv = new TextDecoder().decode(val);
    let c = 0;
    for (const line of csv.split("\n")) {
      const v = values[c];
      if (!v) {
        console.warn("Skipped reading value: " + c + " for comparison with: " + fileName);
      } else {
        // Compare!
        const ourLine = `${v.pmc},${v.value}`;
        if (line != ourLine) {
          throw new Error(`Input file mismatch: ${fileName} (${c}): "${line}" != "${ourLine}"`);
        }
      }
      c++;
    }
  });
}

async function readCSV(fileName: string): Promise<PMCDataValues> {
  const f = await readTestFile(fileName);

  const result: PMCDataValue[] = [];

  // Got it as an array buffer, read as csv
  const csv = new TextDecoder().decode(f);
  for (const line of csv.split("\n")) {
    const parts = line.split(",");

    if (parts.length == 2) {
      const pmc = parseInt(parts[0]);
      const value = parseFloat(parts[1]);

      result.push(new PMCDataValue(pmc, value));
    }
  }

  return PMCDataValues.makeWithValues(result);
}

function readQuant(scanId: string, dataLabel: string, detectorId: string, quantBin: Quantification): PMCDataValues {
  const elemLookup = ExpressionDataSource.buildPureElementLookup(quantBin.labels);
  const quantCol = ExpressionDataSource.getQuantColIndex(dataLabel, quantBin.labels, elemLookup.pureElementColumnLookup);

  if (quantCol.idx < 0) {
    throw new Error(`Quantification does not contain column: "${dataLabel}". Please select (or create) a quantification with the relevant element.`);
  }

  //console.log('getQuantifiedDataForDetector detector='+detectorId+', dataLabel='+dataLabel+', idx='+idx+', factor='+toElemConvert);

  const data = ExpressionDataSource.getQuantifiedDataValues(scanId, quantBin, detectorId, quantCol.idx, quantCol.toElemConvert, dataLabel.endsWith("_%"));
  return PMCDataValues.makeWithValues(data);
}

function makeDataSource(scanId: string, datasetBin: Experiment, allDiffractionPeaks: DiffractionPeak[], quantBin: Quantification): InterpreterDataSource {
  const ds = jasmine.createSpyObj(
    "InterpreterDataSource",
    [
      "readElement",
      "readElementSum",
      "readMap",
      "readSpectrum",
      "readSpectrumDifferences",
      "readDiffractionData",
      "readRoughnessData",
      "readPosition",
      "makeMap",

      "atomicMass",

      "readPseudoIntensity",
      "readHousekeepingData",
      "exists",

      "getMemoised",
      "memoise",
    ],
    []
  );

  ds.readElement.and.callFake((args: any[]) => {
    const elem = args[0] as string;
    const column = args[1] as string;
    const detectorId = args[2] as string;

    let col = column;
    let asMmol = false;

    if (col == "%-as-mmol") {
      col = "%";
      asMmol = true;
    }

    const dataLabel = elem + "_" + col;

    const result = readQuant(scanId, dataLabel, detectorId, quantBin);

    if (!asMmol) {
      compareWithCSV(`element(${elem},${column},${detectorId}).csv`, result.values);
      return Promise.resolve(result);
    }

    const resultMmol = InterpreterDataSource.convertToMmol(elem, result);
    compareWithCSV(`element(${elem},${column},${detectorId}).csv`, resultMmol.values);
    return Promise.resolve(resultMmol);
  });

  ds.readElementSum.and.callFake((args: any[]) => {
    return Promise.reject("readElementSum not implemented");
  });

  ds.readMap.and.callFake((args: any[]) => {
    const dataLabel = args[0] as string;
    const detectorId = args[1] as string;

    const q = readQuant(scanId, dataLabel, detectorId, quantBin);
    compareWithCSV(`data(${dataLabel}, ${detectorId}).csv`, q.values);
    return Promise.resolve(q);
  });

  ds.readSpectrum.and.callFake((args: any[]) => {
    const startChannel = args[0] as number;
    let endChannel = args[1] as number;
    const detector = args[2] as string;

    if (endChannel > 4096) {
      endChannel = 4096;
    }

    const pmcValues: PMCDataValue[] = [];

    let detectorIdIdx = -1;
    for (let c = 0; c < datasetBin.metaLabels.length; c++) {
      if (datasetBin.metaLabels[c] === "DETECTOR_ID") {
        detectorIdIdx = c;
        break;
      }
    }

    if (detectorIdIdx < 0) {
      return Promise.reject("Failed to find DETECTOR_ID for dataset");
    }

    let readTypeIdx = -1;
    for (let c = 0; c < datasetBin.metaLabels.length; c++) {
      if (datasetBin.metaLabels[c] === "READTYPE") {
        readTypeIdx = c;
        break;
      }
    }

    if (readTypeIdx < 0) {
      return Promise.reject("Failed to find READTYPE for dataset");
    }

    for (const loc of datasetBin.locations) {
      const pmc = parseInt(loc.id);

      for (const det of loc.detectors) {
        let detOK = false;
        let readTypeOK = false;

        for (const m of det.meta) {
          if (m.labelIdx === detectorIdIdx && m.svalue === detector) {
            detOK = true;
          }
          if (m.labelIdx === readTypeIdx && m.svalue === "Normal") {
            readTypeOK = true;
          }

          if (readTypeOK && detOK) {
            break;
          }
        }

        if (readTypeOK && detOK) {
          const spectrum = decompressZeroRunLengthEncoding(det.spectrum, 4096);
          let total = 0;
          for (let idx = startChannel; idx < endChannel; idx++) {
            total += spectrum[idx];
          }

          pmcValues.push(new PMCDataValue(pmc, total));
          break;
        }
      }
    }

    compareWithCSV(`spectrum(${startChannel},${args[1]},${detector}).csv`, pmcValues);
    return Promise.resolve(PMCDataValues.makeWithValues(pmcValues));
  });

  ds.readSpectrumDifferences.and.callFake((args: any[]) => {
    return Promise.reject("readSpectrumDifferences not implemented");
  });

  ds.readDiffractionData.and.callFake((args: any[]) => {
    const channelStart = args[0] as number;
    const channelEnd = args[1] as number;

    const pmcDiffractionCount = new Map<number, number>();
    for (let idx = 0; idx < datasetBin.locations.length; idx++) {
      const loc = datasetBin.locations[idx];
      const pmc = parseInt(loc.id);

      if (loc.pseudoIntensities.length > 0) {
        pmcDiffractionCount.set(pmc, 0);
      }
    }

    for (const peak of allDiffractionPeaks) {
      const withinChannelRange = (channelStart === -1 || peak.channel >= channelStart) && (channelEnd === -1 || peak.channel < channelEnd);
      if (peak.status != DiffractionPeak.statusNotAnomaly && withinChannelRange) {
        let prev = pmcDiffractionCount.get(peak.pmc);
        if (!prev) {
          prev = 0;
        }
        pmcDiffractionCount.set(peak.pmc, prev + 1);
      }
    }

    // NOTE: WE SKIP the part about reading user peaks - they're not commonly used and our test data will be selected so there aren't any
    //       in the calculation of the "expected" values

    // Now turn these into data values
    const result: PMCDataValue[] = [];
    for (const [pmc, sum] of pmcDiffractionCount.entries()) {
      result.push(new PMCDataValue(pmc, sum));
    }

    compareWithCSV(`diffractionPeaks(${channelStart},${channelEnd}).csv`, result);
    return Promise.resolve(PMCDataValues.makeWithValues(result));

    // Read the input file and compare with what we've generated
    //return readCSV(`input-data/diffractionPeaks(${channelStart},${channelEnd}).csv`);
  });

  ds.readRoughnessData.and.callFake(() => {
    return Promise.reject("readRoughnessData not implemented");
  });

  ds.readPosition.and.callFake((args: any[]) => {
    const axis = args[0] as string;

    if (axis !== "x" && axis !== "y" && axis !== "z") {
      return Promise.reject("Bad axis: " + axis);
    }

    const pmcValues: PMCDataValue[] = [];

    for (const loc of datasetBin.locations) {
      if (loc.beam) {
        const pmc = parseInt(loc.id);
        if (axis === "x") {
          pmcValues.push(new PMCDataValue(pmc, loc.beam.x));
        } else if (axis === "y") {
          pmcValues.push(new PMCDataValue(pmc, loc.beam.y));
        } else {
          pmcValues.push(new PMCDataValue(pmc, loc.beam.z));
        }
      }
    }

    return Promise.resolve(PMCDataValues.makeWithValues(pmcValues));
  });

  ds.makeMap.and.callFake((args: any[]) => {
    const value = args[0] as number;
    const result: PMCDataValue[] = [];

    for (const locSet of quantBin.locationSet) {
      for (const loc of locSet.location) {
        result.push(new PMCDataValue(loc.pmc, value));
      }

      break; // Only do this for 1 set of PMCs, we may have a 2nd detector...
    }

    compareWithCSV(`makeMap(${value}).csv`, result);
    return Promise.resolve(PMCDataValues.makeWithValues(result));
  });

  ds.atomicMass.and.callFake((symbol: string) => {
    return Promise.resolve(periodicTableDB.getMolecularMass(symbol));
  });

  ds.readPseudoIntensity.and.callFake((args: any[]) => {
    const elem = args[0] as string;
    const pmcValues: PMCDataValue[] = [];

    let pseudoIdx = -1;
    for (let c = 0; c < datasetBin.pseudoIntensityRanges.length; c++) {
      if (datasetBin.pseudoIntensityRanges[c].name === elem) {
        pseudoIdx = c;
        break;
      }
    }

    if (pseudoIdx < 0) {
      return Promise.reject("Failed to find pseudo-intensity: " + elem);
    }

    for (const loc of datasetBin.locations) {
      const pmc = parseInt(loc.id);

      if (loc.pseudoIntensities.length > 0) {
        pmcValues.push(new PMCDataValue(pmc, loc.pseudoIntensities[0].elementIntensities[pseudoIdx]));
      }
    }
    return Promise.resolve(PMCDataValues.makeWithValues(pmcValues));
  });

  ds.readHousekeepingData.and.callFake((args: any[]) => {
    const hkData = args[0] as string;
    const pmcValues: PMCDataValue[] = [];

    let housekeepingIdx = -1;
    for (let c = 0; c < datasetBin.metaLabels.length; c++) {
      if (datasetBin.metaLabels[c] === hkData) {
        housekeepingIdx = c;
        break;
      }
    }

    if (housekeepingIdx < 0) {
      return Promise.reject("Failed to find housekeeping data: " + hkData);
    }

    if (datasetBin.metaTypes[housekeepingIdx] !== Experiment_MetaDataType.MT_FLOAT && datasetBin.metaTypes[housekeepingIdx] !== Experiment_MetaDataType.MT_INT) {
      return Promise.reject("Bad type for housekeeping data: " + hkData);
    }

    for (const loc of datasetBin.locations) {
      const pmc = parseInt(loc.id);

      if (housekeepingIdx < loc.meta.length) {
        if (datasetBin.metaTypes[housekeepingIdx] === Experiment_MetaDataType.MT_FLOAT) {
          pmcValues.push(new PMCDataValue(pmc, loc.meta[housekeepingIdx].fvalue));
        } else {
          pmcValues.push(new PMCDataValue(pmc, loc.meta[housekeepingIdx].ivalue));
        }
      }
    }
    return Promise.resolve(PMCDataValues.makeWithValues(pmcValues));
  });

  ds.exists.and.callFake((dataType: string, column: string) => {
    if (dataType === "element") {
      for (const elem of quantBin.labels) {
        if (elem.startsWith(column)) {
          return Promise.resolve(true);
        }
      }
    }

    return Promise.resolve(false);
  });

  ds.getMemoised.and.callFake((args: any[]) => {
    return Promise.reject("getMemoised not implemented");
  });

  ds.memoise.and.callFake((args: any[]) => {
    return Promise.reject("memoise not implemented");
  });

  return ds as InterpreterDataSource;
}
