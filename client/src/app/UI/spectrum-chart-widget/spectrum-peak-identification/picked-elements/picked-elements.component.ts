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

import { Component, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ElementSetService } from "src/app/services/element-set.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { QuantCreateParameters } from "src/app/UI/quantification-start-options/quantification-start-options.component";
import { httpErrorToString } from "src/app/utils/utils";


@Component({
    selector: "peak-id-picked-elements",
    templateUrl: "./picked-elements.component.html",
    styleUrls: ["./picked-elements.component.scss", "../spectrum-peak-identification.component.scss"]
})
export class PickedElementsComponent implements OnInit
{
    private _subs = new Subscription();

    pickedLines: XRFLineGroup[] = [];
    quantificationEnabled: boolean = false;
    isPublicUser: boolean = true;

    constructor(
        private _elementSetService: ElementSetService,
        private _spectrumService: SpectrumChartService,
        private _quantService: QuantificationService,
        private _authService: AuthenticationService
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._spectrumService.mdl.xrfLinesChanged$.subscribe(
            ()=>
            {
                this.pickedLines = this._spectrumService.mdl.xrfLinesPicked;
            }
        ));

        this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                this.quantificationEnabled = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionCreateQuantification);
            }
        );

        this._subs.add(this._authService.isPublicUser$.subscribe(
            (isPublicUser)=>
            {
                this.isPublicUser = isPublicUser;
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onSaveElementSet()
    {
        // Get a name for it
        let name = prompt("Enter name for Element Set");
        if(name)
        {
            // Save it
            this._elementSetService.add(name, this.pickedLines).subscribe((result)=>
            {
                console.log("Saved new element set: "+name);
            },
            (err)=>
            {
                console.error("Failed to save element set: "+name);
            });
        }
    }

    onToggleVisibilityPickedElement(atomicNumber: number)
    {
        let all = Array.from(this.pickedLines);

        // Find the group & switch its visibility
        for(let c = 0; c < all.length; c++)
        {
            if(all[c].atomicNumber == atomicNumber)
            {
                all[c].visible = !all[c].visible;
                break;
            }
        }

        // Notify the service
        this._spectrumService.mdl.xrfLinesPicked = all;
    }

    onDeletePickedElement(atomicNumber: number)
    {
        this._spectrumService.mdl.unpickXRFLine(atomicNumber);
    }

    onClearPickedList()
    {
        this._spectrumService.mdl.xrfLinesPicked = [];
    }

    onQuantify()
    {
        // Get the list of elements
        let atomicNumbers: Set<number> = new Set<number>();
        for(let group of this.pickedLines)
        {
            atomicNumbers.add(group.atomicNumber);
        }

        this._quantService.showQuantificationDialog("", atomicNumbers).subscribe(
            (params: QuantCreateParameters)=>
            {
                if(params)
                {
                    this._quantService.createQuantification(params).subscribe(
                        (jobID: string)=>
                        {
                            console.log("Job ID: "+jobID);
                        },
                        (err)=>
                        {
                            let msg = httpErrorToString(err, "Failed to start map quantification with PIQUANT. See logs. Error");
                            alert(msg);
                        }
                    );
                }
            }
        );
    }
}
