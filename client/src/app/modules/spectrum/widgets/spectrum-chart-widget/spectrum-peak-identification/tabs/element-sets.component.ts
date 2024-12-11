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

import { Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { ElementSetSummary } from "src/app/generated-protos/element-set";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { TabSelectors } from "../tab-selectors";
import { SPECIAL_QUANT_ID } from "./element-set-row/element-set-row.component";
import { SpectrumService } from "src/app/modules/spectrum/services/spectrum.service";
import { ISpectrumChartModel } from "../../spectrum-model-interface";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import {
  ElementSetDeleteReq,
  ElementSetDeleteResp,
  ElementSetGetReq,
  ElementSetGetResp,
  ElementSetListReq,
  ElementSetListResp,
} from "src/app/generated-protos/element-set-msgs";

@Component({
  selector: TabSelectors.tabElementSets,
  templateUrl: "./element-sets.component.html",
  styleUrls: ["./element-sets.component.scss"],
})
export class ElementSetsComponent implements OnInit, OnDestroy {
  @Output() onUse = new EventEmitter();

  private _subs = new Subscription();
  private _rawElementSetSummaries: Map<string, ElementSetSummary> = new Map<string, ElementSetSummary>();

  // The one used for display, updated when both quant & element sets update
  quantElementSet: ElementSetSummary | null = null;
  userElementSetSummaries: ElementSetSummary[] = [];
  sharedElementSetSummaries: ElementSetSummary[] = [];

  constructor(
    private _spectrumService: SpectrumService,
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService
    // private _widgetDataService: WidgetRegionDataService,
  ) // private _authService: AuthenticationService
  {}

  ngOnInit() {
    // We show a "special" synthetic element set for the elements in loaded quant(s)
    // this._subs.add(
    //   this._widgetDataService.quantificationLoaded$.subscribe((quant: QuantificationLayer) => {
    //     // New quant loaded, update our element sets
    //     this.updateElementSets();
    //   })
    // );
    this._subs.add(
      this._dataService.sendElementSetListRequest(ElementSetListReq.create()).subscribe((elemResp: ElementSetListResp) => {
        if (elemResp.elementSets) {
          this._rawElementSetSummaries.clear();
          for (const [key, item] of Object.entries(elemResp.elementSets)) {
            this._rawElementSetSummaries.set(key, item);
          }
        }
        this.updateElementSets();
      })
    );
  }

  ngOnDestroy() {
    // Ensure we get deleted
    this._subs.unsubscribe();
  }

  private get mdl(): ISpectrumChartModel {
    return this._spectrumService.mdl;
  }

  private updateElementSets(): void {
    this.quantElementSet = null;
    this.userElementSetSummaries = [];
    this.sharedElementSetSummaries = [];

    // Add a special element set which contains all elements we have quantifications for
    const formulae: string[] = [];
    // if (this._widgetDataService.quantificationLoaded) {
    //   formulae = this._widgetDataService.quantificationLoaded.getElementFormulae();
    // }

    const rawQuantElementAtomicNumbers = Array.from(periodicTableDB.getAtomicNumbersForSymbolList(formulae));

    if (rawQuantElementAtomicNumbers.length > 0) {
      this.quantElementSet = ElementSetSummary.create({
        id: SPECIAL_QUANT_ID,
        name: "All Quantified Elements",
        atomicNumbers: rawQuantElementAtomicNumbers,
      });
    }

    // And add all others
    for (const eset of this._rawElementSetSummaries.values()) {
      if (!eset.owner?.sharedWithOthers) {
        this.userElementSetSummaries.push(eset);
      } else {
        this.sharedElementSetSummaries.push(eset);
      }
    }
  }

  onUseElementSet(item: ElementSetSummary): void {
    if (!this.mdl.activeXRFDB) {
      return;
    }

    // If it's the "special" one we handle it separately
    if (item.id == SPECIAL_QUANT_ID) {
      const groups = [];
      for (const Z of item.atomicNumbers) {
        const group = XRFLineGroup.makeFromAtomicNumber(Z, this.mdl.activeXRFDB);
        groups.push(group);
      }

      this.applyElementSet(item.id, groups);
      return;
    }

    // Download the element set
    this._dataService.sendElementSetGetRequest(ElementSetGetReq.create({ id: item.id })).subscribe(
      (resp: ElementSetGetResp) => {
        if (resp.elementSet) {
          // Replace any lines in the annotation with the lines coming from this element set
          const groups: XRFLineGroup[] = [];
          for (const l of resp.elementSet.lines) {
            groups.push(XRFLineGroup.makeFromElementSetItem(l, this.mdl.activeXRFDB!));
          }

          this.applyElementSet(item.id, groups);
        } else {
          this._snackBarService.openError(`Failed to get element set ${item.name}`);
        }
      },
      err => {
        this._snackBarService.openError(`Failed to apply element set ${item.name}`, err);
      }
    );
  }

  private applyElementSet(id: string, lines: XRFLineGroup[]): void {
    // If something is listening, we just return it via the event... this is for cases like when we're OUTSIDE of the
    // quant dialog and have a listener configured. Otherwise we are just updating the spectrum model directly...
    if (this.onUse.observed) {
      this.onUse.emit({ id: id, lines: lines });
      return;
    }

    this.mdl.xrfLinesPicked = lines;
  }

  onDeleteElementSet(item: ElementSetSummary): void {
    if (confirm('Are you sure you want to delete element set: "' + item.name + '"?')) {
      // Delete it, and clear from our list if success
      this._dataService.sendElementSetDeleteRequest(ElementSetDeleteReq.create({ id: item.id })).subscribe({
        next: (resp: ElementSetDeleteResp) => {
          this._snackBarService.openSuccess(`Element set ${item.name} deleted successfully`);
          this._rawElementSetSummaries.delete(item.id);
          this.updateElementSets();
        },
        error: err => {
          this._snackBarService.openError(`Failed to delete element set ${item.name}`, err);
        },
      });
    }
  }

  canDelete(id: string, creator: ObjectCreator, shared: boolean): boolean {
    return true; //return id != SPECIAL_QUANT_ID && (!shared || creator.user_id == this._authService.getUserID());
  }
}
