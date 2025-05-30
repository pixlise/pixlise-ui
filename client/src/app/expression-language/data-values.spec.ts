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

import { MinMax } from "../models/BasicTypes";
import { DataQueryResult, PMCDataValue, PMCDataValues } from "./data-values";

describe("PMCDataValues makeWithValues() call", () => {
  const expResult = new PMCDataValues();
  expResult.values = [
    new PMCDataValue(10, 3, false),
    new PMCDataValue(11, 0, true),
    new PMCDataValue(12, 8, false),
    new PMCDataValue(13, 0, true), // NOTE: undefined flag causes this to be 0
    new PMCDataValue(14, 2, false),
  ];
  expResult.isBinary = false;
  expResult["_valueRange"] = new MinMax(2, 8);

  it("should ignore undefined", () => {
    const n = PMCDataValues.makeWithValues([
      new PMCDataValue(10, 3, false),
      new PMCDataValue(11, 0, true),
      new PMCDataValue(12, 8, false),
      new PMCDataValue(13, 9, true),
      new PMCDataValue(14, 2, false),
    ]);

    expect(n).toEqual(expResult);
  });

  const expBinResult = new PMCDataValues();
  expBinResult.values = [
    new PMCDataValue(10, 1, false),
    new PMCDataValue(11, 0, true),
    new PMCDataValue(12, 0, false),
    new PMCDataValue(13, 0, true), // NOTE: undefined flag causes this to be 0
  ];
  expBinResult.isBinary = true;
  expBinResult["_valueRange"] = new MinMax(0, 1);
  it("should set binary flag", () => {
    const n = PMCDataValues.makeWithValues([
      new PMCDataValue(10, 1, false),
      new PMCDataValue(11, 0, true),
      new PMCDataValue(12, 0, false),
      new PMCDataValue(13, 9, true),
    ]);

    expect(n).toEqual(expBinResult);
  });
});

describe("PMCDataValues filterToCommonPMCsOnly() call", () => {
  const data1 = PMCDataValues.makeWithValues([
    new PMCDataValue(10, 3, false),
    new PMCDataValue(11, 0, false),
    new PMCDataValue(13, 8, false),
    new PMCDataValue(14, 0, true),
    new PMCDataValue(15, 2, false),
  ]);

  const data2 = PMCDataValues.makeWithValues([
    new PMCDataValue(10, 4, false),
    new PMCDataValue(9, 0, false),
    new PMCDataValue(13, 5, false),
    new PMCDataValue(19, 0, true),
    new PMCDataValue(23, 2, false),
  ]);

  const data3 = PMCDataValues.makeWithValues([
    new PMCDataValue(12, 3, false),
    new PMCDataValue(13, 2, false),
    new PMCDataValue(14, 8, false),
    new PMCDataValue(15, 0, true),
    new PMCDataValue(16, 2, false),
  ]);

  const expFiltered = [
    PMCDataValues.makeWithValues([new PMCDataValue(13, 8, false)]),
    PMCDataValues.makeWithValues([new PMCDataValue(13, 5, false)]),
    PMCDataValues.makeWithValues([new PMCDataValue(13, 2, false)]),
  ];

  it("should filter for 3 columns", () => {
    const filtered = PMCDataValues.filterToCommonPMCsOnly([data1, data2, data3]);

    expect(filtered).toEqual(expFiltered);
  });
});

describe("DataTypeSavedMap", () => {
  it("getDataTypeSavedMap should work", () => {
    expect(DataQueryResult.getDataTypeSavedMap("thename")).toEqual("savedMap(thename)");
  });
  it("isDataTypeSavedMap should return false if name is not savedMap", () => {
    expect(DataQueryResult.isDataTypeSavedMap("thename")).toEqual(false);
  });
  it("isDataTypeSavedMap should return true if name is savedMap", () => {
    expect(DataQueryResult.isDataTypeSavedMap("savedMap(thename)")).toEqual(true);
  });
  it("getDataTypeSavedMapName should return empty string if name is not savedMap", () => {
    expect(DataQueryResult.getDataTypeSavedMapName("thename")).toEqual("");
  });
  it("getDataTypeSavedMapName should return the name of the saved map", () => {
    expect(DataQueryResult.getDataTypeSavedMapName("savedMap(thename)")).toEqual("thename");
  });
  it("getClientMapNameFromMemoId should return the name of the client", () => {
    expect(DataQueryResult.getClientMapNameFromMemoId("client-map-blah")).toEqual("blah");
  });
});
