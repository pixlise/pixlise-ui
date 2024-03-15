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

import { DetectorConfig } from "../generated-protos/detector-config";
import { PeriodicTableDB, periodicTableDB } from "./periodic-table-db";
import { ElementLine, XRFLineDatabase } from "./xrf-line-database";

describe("combineCloseXRFLines()", () => {
  const p = periodicTableDB;
  const CaLines = [
    new ElementLine("K-L1", "Ka3", 3600.1, 0.000214641, [], 0),
    new ElementLine("K-L2", "Ka2", 3688.8, 0.294399, [], 0),
    new ElementLine("K-L3", "Ka1", 3692.3, 0.586452, ["maxK"], 0),

    new ElementLine("K-M2", "Kb3", 4013.1, 0.0405853, [], 0),
    new ElementLine("K-M3", "Kb1", 4013.1, 0.0783499, [], 0),

    new ElementLine("L1-M2", "Lb4", 413, 0.413833, [], 0),
    new ElementLine("L1-M3", "Lb3", 413, 0.586166, [], 0),

    new ElementLine("L2-M1", "Ln", 305.4, 1, ["maxL"], 0),
    new ElementLine("L3-M1", "Ll", 301.9, 1, [], 0),
  ];

  const cfg = DetectorConfig.create({
    minElement: 11,
    maxElement: 90,
    xrfeVLowerBound: 800,
    xrfeVUpperBound: 20000,
    xrfeVResolution: 230,
    windowElement: 14,
    tubeElement: 14,
    defaultParams: "",
    mmBeamRadius: 0.123
  });

  it("should combine Ca lines", () => {
    const combinedCaLines = XRFLineDatabase["combineCloseElementLines"](cfg, CaLines, false);

    const expectedCombinedCaLines = [
      new ElementLine("L1-M2 + L1-M3 + L3-M1 + L2-M1", "Lb4,Lb3,Ll,Ln", 401.3175333717741, 2.5196540218996946, ["maxL"], 184.54908529442193),
      new ElementLine("K-M3 + K-M2", "Kb1,3", 4013.1, 0.11893519999999999, [], 155),
      new ElementLine("K-L1 + K-L3 + K-L2", "Ka1,2,3", 3690.871165477402, 0.8808780520330636, ["maxK"], 155.03300830325836),
    ];
    expect(combinedCaLines).toEqual(expectedCombinedCaLines);
  });
});

describe("splitSiegbahn()", () => {
  const p = XRFLineDatabase;
  it("should split Ka2", () => {
    const r = (p as any).splitSiegbahn("Ka2");
    expect(r).toEqual(["Ka", "2"]);
  });
  it("should split Lg1", () => {
    const r = (p as any).splitSiegbahn("Lg1");
    expect(r).toEqual(["Lg", "1"]);
  });
  it("should split Lb1,3", () => {
    const r = (p as any).splitSiegbahn("Lb1,3");
    expect(r).toEqual(["Lb", "1", "3"]);
  });
  it("should split Lb3,1", () => {
    const r = (p as any).splitSiegbahn("Lb3,1");
    expect(r).toEqual(["Lb", "3", "1"]);
  });
  it("should split Kb2,15", () => {
    const r = (p as any).splitSiegbahn("Kb2,15");
    expect(r).toEqual(["Kb", "2", "15"]);
  });
  it("should bail on Ka", () => {
    const r = (p as any).splitSiegbahn("Ka");
    expect(r).toEqual([]);
  });
  it("should bail on Kba2", () => {
    const r = (p as any).splitSiegbahn("Kba2");
    expect(r).toEqual([]);
  });
  it("should bail on Lollypop", () => {
    const r = (p as any).splitSiegbahn("Lollypop");
    expect(r).toEqual([]);
  });
});

describe("makeCombinedSiegbahn()", () => {
  const p = XRFLineDatabase;
  it("should combine Ka2, Ka1", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka2", "Ka1");
    expect(r).toEqual("Ka1,2");
  });
  it("should combine Ka1, Ka2", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka1", "Ka2");
    expect(r).toEqual("Ka1,2");
  });
  it("should combine Ka3, Ka1,2", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka3", "Ka1,2");
    expect(r).toEqual("Ka1,2,3");
  });
  it("should combine Ka2, Ka3,1", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka2", "Ka3,1");
    expect(r).toEqual("Ka1,2,3");
  });
  it("should combine Ka1,2, Ka3", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka1,2", "Ka3");
    expect(r).toEqual("Ka1,2,3");
  });
  it("should combine Ka3,1, Ka2", () => {
    const r = (p as any).makeCombinedSiegbahn("Ka3,1", "Ka2");
    expect(r).toEqual("Ka1,2,3");
  });
  it("should just add Kb2, Ka1", () => {
    const r = (p as any).makeCombinedSiegbahn("Kb2", "Ka1");
    expect(r).toEqual("Kb2,Ka1");
  });
  it("should just add Kb1, Ka2", () => {
    const r = (p as any).makeCombinedSiegbahn("Kb1", "Ka2");
    expect(r).toEqual("Kb1,Ka2");
  });
});

describe("getFormulaToElementConversionFactor()", () => {
  const p = periodicTableDB;
  it("calc conversion from CaO to Ca", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Ca", "CaO");
    expect(r).toEqual(0.714700941878836);
  });

  it("calc conversion from CaCO3 to Ca", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Ca", "CaCO3");
    expect(r).toEqual(0.400442805017924);
  });

  it("calc conversion from FeCO3 to Fe", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Fe", "FeCO3");
    expect(r).toEqual(0.4820372150994077);
  });

  it("calc conversion from TiO2 to Ti", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Ti", "TiO2");
    expect(r).toEqual(0.5994081032764639);
  });

  it("calc conversion from Cr2O3 to Cr", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Cr", "Cr2O3");
    expect(r).toEqual(0.6842020077610267);
  });

  it("calc conversion from FeO-T to Fe", () => {
    const r = (p as any).getFormulaToElementConversionFactor("Fe", "FeO-T");
    expect(r).toEqual(0.7773110413326207);
  });
});

describe("getFirstElement()", () => {
  const p = periodicTableDB;
  it("getFirstElement of O", () => {
    const r = (p as any).getFirstElement("O");
    expect(r).toEqual("O");
  });
  it("getFirstElement of TiO2", () => {
    const r = (p as any).getFirstElement("TiO2");
    expect(r).toEqual("Ti");
  });
  it("getFirstElement of CaO3", () => {
    const r = (p as any).getFirstElement("CaO3");
    expect(r).toEqual("Ca");
  });
  it("getFirstElement of CO", () => {
    const r = (p as any).getFirstElement("CO");
    expect(r).toEqual("C");
  });
  it("getFirstElement of FeO-T", () => {
    const r = (p as any).getFirstElement("FeO-T");
    expect(r).toEqual("Fe");
  });
});

describe("getMultiplier()", () => {
  const p = periodicTableDB;
  it("getMultiplier of K", () => {
    const r = PeriodicTableDB["getMultiplier"]("K");
    expect(r).toEqual(0);
  });
  it("getMultiplier of -T", () => {
    const r = PeriodicTableDB["getMultiplier"]("-T");
    expect(r).toEqual(0);
  });
  it("getMultiplier of 3", () => {
    const r = PeriodicTableDB["getMultiplier"]("3");
    expect(r).toEqual(3);
  });
  it("getMultiplier of 3K", () => {
    const r = PeriodicTableDB["getMultiplier"]("3K");
    expect(r).toEqual(3);
  });
  it("getMultiplier of 36", () => {
    const r = PeriodicTableDB["getMultiplier"]("36");
    expect(r).toEqual(36);
  });
  it("getMultiplier of Cr203", () => {
    const r = PeriodicTableDB["getMultiplier"]("Cr2O3");
    expect(r).toEqual(0);
  });
});

describe("getElementIndex()", () => {
  const p = periodicTableDB;
  it("getElementIndex of O", () => {
    const r = (p as any).getElementIndex("O");
    expect(r).toEqual(7);
  });
  it("getElementIndex of TiO2", () => {
    const r = (p as any).getElementIndex("TiO2");
    expect(r).toEqual(21);
  });
  it("getElementIndex of CaO3", () => {
    const r = (p as any).getElementIndex("CaO3");
    expect(r).toEqual(19);
  });
  it("getElementIndex of FeO-T", () => {
    const r = (p as any).getElementIndex("FeO-T");
    expect(r).toEqual(25);
  });
});

describe("getMolecularMass()", () => {
  const p = periodicTableDB;

  it("mass of O", () => {
    const r = (p as any).getMolecularMass("O");
    expect(r).toEqual(15.9994);
  });

  it("mass of Ca", () => {
    const r = (p as any).getMolecularMass("Ca");
    expect(r).toEqual(40.08);
  });

  it("mass of CaO", () => {
    const r = (p as any).getMolecularMass("CaO");
    expect(r).toEqual(40.08 + 15.9994);
  });

  it("mass of TiO2", () => {
    const r = (p as any).getMolecularMass("TiO2");
    expect(r).toEqual(47.88 + 15.9994 * 2);
  });

  it("mass of CaCO3", () => {
    const r = (p as any).getMolecularMass("CaCO3");
    expect(r).toEqual(40.08 + 12.011 + 15.9994 * 3);
  });

  it("mass of Cr2O3", () => {
    const r = (p as any).getMolecularMass("Cr2O3");
    expect(r).toEqual(51.996 * 2 + 15.9994 * 3);
  });

  // Special case
  it("mass of FeO-T", () => {
    const r = (p as any).getMolecularMass("FeO-T");
    expect(r).toEqual(55.847 + 15.9994);
  });

  // Failures
  it("empty string", () => {
    const r = (p as any).getMolecularMass("");
    expect(r).toEqual(0);
  });

  it("just a number", () => {
    const r = (p as any).getMolecularMass("4");
    expect(r).toEqual(0);
  });

  it("bad element", () => {
    const r = (p as any).getMolecularMass("Dx");
    expect(r).toEqual(0);
  });

  it("bad first elem", () => {
    const r = (p as any).getMolecularMass("Cz2O3");
    expect(r).toEqual(0);
  });

  it("bad second elem", () => {
    const r = (p as any).getMolecularMass("Ca2D3");
    expect(r).toEqual(0);
  });

  it("0 multiplier", () => {
    const r = (p as any).getMolecularMass("Ca0");
    expect(r).toEqual(0);
  });

  it("negative multiplier", () => {
    const r = (p as any).getMolecularMass("Ca-3");
    expect(r).toEqual(0);
  });

  it("punctuation", () => {
    const r = (p as any).getMolecularMass("Ca,Fe");
    expect(r).toEqual(0);
  });
});
