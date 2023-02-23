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

import { ExpressionTextEditorComponent, MarkPosition } from "./expression-text-editor.component";

/*
describe('ExpressionTextEditorComponent', () => {
  let component: ExpressionTextEditorComponent;
  let fixture: ComponentFixture<ExpressionTextEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExpressionTextEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpressionTextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/

describe("findMatchedBracketPositions (single-line)", () =>
{
    it("works for empty string", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("", {line:0,ch:0})).toEqual([]);
    });

    it("works for invalid cursor pos", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("Ca = element(\"Ca\", \"%\", \"Combined\")\nmax(Ca, 2)", {line:0,ch:200})).toEqual([]);
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("Ca = element(\"Ca\", \"%\", \"Combined\")\nmax(Ca, 2)", {line:3,ch:2})).toEqual([]);
    });

    it("nothing found if cursor before open", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"](" element(\"Fe\", \"%\")", {line:0,ch:2})).toEqual([]);
    });

    it("nothing found if cursor after close", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"](" element(\"Fe\", \"%\") + 2", {line:0,ch:22})).toEqual([]);
    });

    it("works no nesting", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"](" element(\"Fe\", \"%\") + 2", {line:0,ch:15})).toEqual([new MarkPosition(0, 8, 9), new MarkPosition(0, 18, 19)]);
    });

    it("works, no close", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(element(\"Fe\", \"%\") + 2, ", {line:0,ch:23})).toEqual([new MarkPosition(0, 3, 4)]);
    });

    it("works, no open", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min element(\"Fe\", \"%\") + 2, element(\"Ca\", \"%\")), ", {line:0,ch:5})).toEqual([new MarkPosition(0, 46, 47)]);
    });

    it("works with nesting finding outer start", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(element(\"Fe\", \"%\") + 2, element(\"Ca\", \"%\")), ", {line:0,ch:9})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 46, 47)]);
    });

    it("works with nesting finding inner", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(element(\"Fe\", \"%\") + 2, element(\"Ca\", \"%\")), ", {line:0,ch:17})).toEqual([new MarkPosition(0, 11, 12), new MarkPosition(0, 21, 22)]);
    });

    it("works nesting finding outer end", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(element(\"Fe\", \"%\") + 2, element(\"Ca\", \"%\")+3), ", {line:0,ch:47})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 48, 49)]);
    });
});

describe("findMatchedBracketPositions (single-line)", () =>
{
    it("nothing found with cursor ^ (", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:2})).toEqual([]);
    });

    it("works with cursor ^(", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:3})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 7, 8)]);
    });

    it("works with cursor (^", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:4})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 7, 8)]);
    });

    it("works with cursor ( ^ )", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:5})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 7, 8)]);
    });

    it("works with cursor ^)", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:7})).toEqual([new MarkPosition(0, 3, 4), new MarkPosition(0, 7, 8)]);
    });

    it("nothing found with cursor )^", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:8})).toEqual([]);
    });

    it("nothing found with cursor ) ^", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("min(1,2)+2", {line:0,ch:9})).toEqual([]);
    });
});

describe("findMatchedBracketPositions (multi-line)", () =>
{
    it("works with nesting finding outer end", () => 
    {
        expect(ExpressionTextEditorComponent["findMatchedBracketPositions"]("//comment\nmin(\nelement(\"Fe\", \"%\") + 2,\nelement(\"Ca\", \"%\")+3), ", {line:2,ch:19})).toEqual([new MarkPosition(1, 3, 4), new MarkPosition(3, 20, 21)]);
    });
});