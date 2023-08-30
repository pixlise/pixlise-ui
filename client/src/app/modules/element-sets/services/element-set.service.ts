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

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, ReplaySubject, Subject } from "rxjs";
import { tap } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";

export class ElementSetSummaryWire {
  name: string = "";
  atomicNumbers: number[] = [];
  shared: boolean = false;
  creator: ObjectCreator = new ObjectCreator("", "");
}

export class ElementSetSummary {
  constructor(
    public id: string,
    public name: string,
    public atomicNumbers: number[],
    public shared: boolean,
    public creator: ObjectCreator,
    public create_unix_time_sec: number,
    public mod_unix_time_sec: number
  ) {}
}

export class ElementSetItemLines {
  constructor(
    public Z: number,
    public K: boolean,
    public L: boolean,
    public M: boolean,
    public Esc: boolean
  ) {}
}

export class ElementSetItem {
  constructor(
    public name: string,
    public lines: ElementSetItemLines[],
    public shared: boolean,
    public creator: ObjectCreator,
    public create_unix_time_sec: number,
    public mod_unix_time_sec: number
  ) {}
}

export class ElementSetItemPost {
  constructor(
    public name: string,
    public lines: ElementSetItemLines[]
  ) {}
}

@Injectable({
  providedIn: "root",
})
export class ElementSetService {
  private _elementSets$ = new ReplaySubject<ElementSetSummary[]>(1);

  constructor(private http: HttpClient) {
    this.refresh();
  }

  get elementSets$(): Subject<ElementSetSummary[]> {
    return this._elementSets$;
  }

  private makeURL(id: string | null): string {
    let apiURL = APIPaths.getWithHost(APIPaths.api_element_set);
    if (id != null) {
      apiURL += "/" + id;
    }
    return apiURL;
  }

  refresh() {
    let apiURL = this.makeURL(null);
    this.http.get<Map<string, ElementSetSummaryWire>>(apiURL, makeHeaders()).subscribe(
      (resp: Map<string, ElementSetSummaryWire>) => {
        let summaries: ElementSetSummary[] = [];
        //for(let [key, value] of resp)
        for (let key of Object.keys(resp)) {
          let value: any = resp.get(key);
          summaries.push(
            new ElementSetSummary(
              key,
              value.name,
              value.atomicNumbers,
              value.shared,
              value.creator,
              value.create_unix_time_sec,
              value.mod_unix_time_sec
            )
          );
        }
        this._elementSets$.next(summaries);
      },
      err => {
        console.error("Failed to refresh element sets!");
      }
    );
  }

  get(id: string): Observable<ElementSetItem> {
    let apiURL = this.makeURL(id);
    return this.http.get<ElementSetItem>(apiURL, makeHeaders());
  }

  add(name: string, items: XRFLineGroup[]): Observable<void> {
    let saveLines: ElementSetItemLines[] = [];

    // Fill it with our items
    for (let item of items) {
      saveLines.push(new ElementSetItemLines(item.atomicNumber, item.k, item.l, item.m, item.esc));
    }

    let toSave = new ElementSetItemPost(name, saveLines);

    let apiURL = this.makeURL(null);
    return this.http.post<void>(apiURL, toSave, makeHeaders()).pipe(
      tap(ev => {
        this.refresh();
      })
    );
  }

  del(id: string): Observable<void> {
    let apiURL = this.makeURL(id);
    return this.http.delete<void>(apiURL, makeHeaders()).pipe(
      tap(ev => {
        this.refresh();
      })
    );
  }

  share(id: string): Observable<string> {
    let apiURL = APIPaths.getWithHost(APIPaths.api_share + "/" + APIPaths.api_element_set + "/" + id);
    return this.http.post<string>(apiURL, "", makeHeaders()).pipe(
      tap(ev => {
        this.refresh();
      })
    );
  }
}
