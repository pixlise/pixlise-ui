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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { SpectrumService } from "src/app/modules/spectrum/services/spectrum.service";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { httpErrorToString } from "src/app/utils/utils";
import { ISpectrumChartModel } from "../../spectrum-model-interface";

@Component({
  selector: "peak-id-picked-elements",
  templateUrl: "./picked-elements.component.html",
  styleUrls: ["./picked-elements.component.scss", "../spectrum-peak-identification.component.scss"],
})
export class PickedElementsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  pickedLines: XRFLineGroup[] = [];
  quantificationEnabled: boolean = false;
  isPublicUser: boolean = true;

  constructor(
    // private _elementSetService: ElementSetService,
    private _spectrumService: SpectrumService,
    // private _quantService: QuantificationService,
    // private _authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this.mdl.xrfLinesChanged$.subscribe(() => {
        this.pickedLines = this.mdl.xrfLinesPicked;
      })
    );

    // this._authService.getIdTokenClaims$().subscribe(claims => {
    //   this.quantificationEnabled = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionCreateQuantification);
    // });

    // this._subs.add(
    //   this._authService.isPublicUser$.subscribe(isPublicUser => {
    //     this.isPublicUser = isPublicUser;
    //   })
    // );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private get mdl(): ISpectrumChartModel {
    return this._spectrumService.mdl;
  }

  onSaveElementSet() {
    // Get a name for it
    const name = prompt("Enter name for Element Set");
    if (name) {
      // Save it
    //   this._elementSetService.add(name, this.pickedLines).subscribe(
    //     result => {
    //       console.log("Saved new element set: " + name);
    //     },
    //     err => {
    //       console.error("Failed to save element set: " + name);
    //     }
    //   );
    }
  }

  onToggleVisibilityPickedElement(atomicNumber: number) {
    const all = Array.from(this.pickedLines);

    // Find the group & switch its visibility
    for (let c = 0; c < all.length; c++) {
      if (all[c].atomicNumber == atomicNumber) {
        all[c].visible = !all[c].visible;
        break;
      }
    }

    // Notify the service
    this.mdl.xrfLinesPicked = all;
  }

  onDeletePickedElement(atomicNumber: number) {
    this.mdl.unpickXRFLine(atomicNumber);
  }

  onClearPickedList() {
    this.mdl.xrfLinesPicked = [];
  }

  onQuantify() {
    // Get the list of elements
    const atomicNumbers: Set<number> = new Set<number>();
    for (const group of this.pickedLines) {
      atomicNumbers.add(group.atomicNumber);
    }

    // this._quantService.showQuantificationDialog("", atomicNumbers).subscribe((params: QuantCreateParameters) => {
    //   if (params) {
    //     this._quantService.createQuantification(params).subscribe(
    //       (jobID: string) => {
    //         console.log("Job ID: " + jobID);
    //       },
    //       err => {
    //         let msg = httpErrorToString(err, "Failed to start map quantification with PIQUANT. See logs. Error");
    //         alert(msg);
    //       }
    //     );
    //   }
    // });
  }
}
