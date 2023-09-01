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
//   Laboratory, nor the names of its contributors may be used to endorse orDataExpressionId.
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

import { TestBed } from "@angular/core/testing";
import { DataExpressionId } from "./expression-id";

describe("DataExpressionId", () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it("DataExpressionId.getPredefinedPseudoIntensityExpressionElement should work", () => {
    expect(DataExpressionId.getPredefinedPseudoIntensityExpressionElement("someid123")).toEqual("");
    expect(DataExpressionId.getPredefinedPseudoIntensityExpressionElement("expr-elem-Ca-%")).toEqual("");
    expect(DataExpressionId.getPredefinedPseudoIntensityExpressionElement("expr-elem-Ca-%-as-mmol")).toEqual("");
    expect(DataExpressionId.getPredefinedPseudoIntensityExpressionElement("expr-pseudo-Ca")).toEqual("Ca");
  });

  it("DataExpressionId.getPredefinedQuantExpressionElement should work", () => {
    expect(DataExpressionId.getPredefinedQuantExpressionElement("someid123")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-Ca-%")).toEqual("Ca");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-Ca-%-as-mmol")).toEqual("Ca");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-CaO-%-as-mmol")).toEqual("CaO");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-FeO-T-%")).toEqual("FeO-T");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-FeO-T-%-as-mmol")).toEqual("FeO-T");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-pseudo-Ca")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-FeO-T-%(A)")).toEqual("FeO-T");
    expect(DataExpressionId.getPredefinedQuantExpressionElement("expr-elem-FeO-T-%-as-mmol(Combined)")).toEqual("FeO-T");
  });

  it("DataExpressionId.getPredefinedQuantExpressionElementColumn should work", () => {
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("someid123")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-Ca-%")).toEqual("%");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-Ca-%-as-mmol")).toEqual("%-as-mmol");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-FeO-T-%")).toEqual("%");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-FeO-T-%-as-mmol")).toEqual("%-as-mmol");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-pseudo-Ca")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-FeO-T-%(A)")).toEqual("%");
    expect(DataExpressionId.getPredefinedQuantExpressionElementColumn("expr-elem-FeO-T-%-as-mmol(Combined)")).toEqual("%-as-mmol");
  });

  it("DataExpressionId.getPredefinedQuantExpressionDetector should work", () => {
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("someid123")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-Ca-%")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-Ca-%-as-mmol")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-Fe-%(A)")).toEqual("A");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-Fe-%-as-mmol(B)")).toEqual("B");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-pseudo-Ca")).toEqual("");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-FeO-T-%(Combined)")).toEqual("Combined");
    expect(DataExpressionId.getPredefinedQuantExpressionDetector("expr-elem-FeO-T-%-as-mmol(Combined)")).toEqual("Combined");
  });
});
