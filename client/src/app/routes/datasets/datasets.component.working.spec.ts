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

/*import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DatasetsComponent } from './datasets.component';

import { ToolbarComponent } from '../../UI/toolbar/toolbar.component';


describe('DatasetsComponent', () => {
  let component: DatasetsComponent;
  let fixture: ComponentFixture<DatasetsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, RouterTestingModule, HttpClientTestingModule ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
      declarations: [ DatasetsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/
import { DatasetFilter } from "./dataset-filter";


describe("DatasetFilter.makeSendableSearchString() call", () =>
{
    it("should work", () => 
    {
        expect(DatasetFilter.makeSendableSearchString("sol=10")).toEqual("sol=10");
        expect(DatasetFilter.makeSendableSearchString("sol>10")).toEqual("sol=gt|10");
        expect(DatasetFilter.makeSendableSearchString("sol<10")).toEqual("sol=lt|10");
        expect(DatasetFilter.makeSendableSearchString("sol=10 rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10  rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10,rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10;rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10, rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10; rtt=123")).toEqual("sol=10&rtt=123");
        expect(DatasetFilter.makeSendableSearchString("sol=10; rtt=123 drive=441")).toEqual("sol=10&rtt=123&drive=441");
        expect(DatasetFilter.makeSendableSearchString("sol=10 rtt=123,drive=442")).toEqual("sol=10&rtt=123&drive=442");
        expect(DatasetFilter.makeSendableSearchString("sol=10; rtt=123;drive=443")).toEqual("sol=10&rtt=123&drive=443");
        expect(DatasetFilter.makeSendableSearchString("sol=10, rtt=123, drive=444")).toEqual("sol=10&rtt=123&drive=444");
        expect(DatasetFilter.makeSendableSearchString("sol=10; rtt=123; drive=445")).toEqual("sol=10&rtt=123&drive=445");
        expect(DatasetFilter.makeSendableSearchString("sol=10; rtt<123; drive>445")).toEqual("sol=10&rtt=lt|123&drive=gt|445");
    });
});

describe("DatasetFilter", () =>
{
    it("should return valid search string", () => 
    {
        let filter = new DatasetFilter(null, "10", null, "123", null, "PIXL-FM", false, false, true, "12", "23");
        expect(filter.toSearchString()).toEqual("sol=lt|10&site_id=123&detector_config=PIXL-FM&normal_spectra=gt|0&location_count=bw|12|23");
    });
    it("should return valid search string sol greater-than", () => 
    {
        let filter = new DatasetFilter("34", null, null, null, null, null, false, false, false, null, null);
        expect(filter.toSearchString()).toEqual("sol=gt|34");
    });
});
