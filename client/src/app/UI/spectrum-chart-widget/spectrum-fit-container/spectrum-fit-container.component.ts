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

import { saveAs } from "file-saver";
import { ViewStateService } from "src/app/services/view-state.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { QuantCreateParameters } from "src/app/UI/quantification-start-options/quantification-start-options.component";
import { httpErrorToString } from "src/app/utils/utils";


const NoFitYetMessage = "Citizen has yet to generate a fit. Please do this from Run PIQUANT tab via the Spectral Fit mode.";

@Component({
    selector:ViewStateService.widgetSelectorSpectrumFit,
    templateUrl: "./spectrum-fit-container.component.html",
    styleUrls: ["./spectrum-fit-container.component.scss"]
})
export class SpectrumFitContainerComponent implements OnInit
{
    private _subs = new Subscription();
    message: string = NoFitYetMessage;
    quantificationEnabled: boolean = false;

    constructor(
        private _spectrumService: SpectrumChartService,
        private _loadingSvc: LoadingIndicatorService,
        private _quantService: QuantificationService,
        private _authService: AuthenticationService
    )
    {
    }

    ngOnInit(): void
    {
        // When we're shown, we set the chart to fit mode
        this._subs.add(this._spectrumService.mdl$.subscribe(
            ()=>
            {
                this.gotModel();
            },
            (err)=>
            {
                console.error(err);
            }
        ));

        this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                this.quantificationEnabled = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionCreateQuantification);
            }
        );
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        if(this._spectrumService.mdl)
        {
            this._spectrumService.mdl.setFitLineMode(false);
        }
    }

    gotModel(): void
    {
        // Try load the last fit if there isn't one
        if(!this._spectrumService.mdl.fitRawCSV)
        {
            this._quantService.getPiquantLastCommandOutput("quant", "output").subscribe(
                (csv: string)=>
                {
                    if(csv)
                    {
                        this._spectrumService.mdl.setFitLineData(csv);
                        this._spectrumService.mdl.recalcSpectrumLines();
                    }
                },
                (err)=>
                {
                    console.log(httpErrorToString(err, "Failed to retrieve last fit CSV, maybe there wasn't one"));
                }
            );
        }

        this._subs.add(this._spectrumService.mdl.fitLineSources$.subscribe(
            ()=>
            {
                if(this._spectrumService.mdl.fitLineSources.length <= 0)
                {
                    this.message = NoFitYetMessage;
                }
                else
                {
                    this.message = "";
                }

                this._spectrumService.mdl.setFitLineMode(!this.message);
            },
            (err)=>
            {
            }
        ));
    }

    get hasFitData(): boolean
    {
        // If we have no error msg, we have fit data... so we use this for now
        return this.message.length <= 0;
    }

    onViewLogs(): void
    {
        this._quantService.getPiquantLastCommandOutput("quant", "log").subscribe(
            (log: string)=>
            {
                let blob = new Blob(
                    [log],
                    {
                        type: "text/csv"
                    }
                );
        
                saveAs(blob, "SpectrumFit.log");
            },
            (err)=>
            {
                let msg = httpErrorToString(err, "Failed to retrieve log");
                alert(msg);
            }
        );
    }

    onExport(): void
    {
        if(!this._spectrumService.mdl || !this._spectrumService.mdl.fitRawCSV)
        {
            alert("No data to export");
            return;
        }

        let blob = new Blob(
            [this._spectrumService.mdl.fitRawCSV],
            {
                type: "text/csv"
            }
        );

        saveAs(blob, "SpectrumFit.csv");
    }

    onReQuantify(): void
    {
        // Warn if there is an existing fit already
        if(this._spectrumService.mdl && this._spectrumService.mdl.fitLineSources.length > 0)
        {
            if(!confirm("This will replace the existing fit. Are you sure you want to continue?"))
            {
                return;
            }
        }

        // Get the list of elements
        let atomicNumbers: Set<number> = new Set<number>(this._spectrumService.mdl.fitSelectedElementZs);

        this._quantService.showQuantificationDialog("Fit", atomicNumbers).subscribe(
            (params: QuantCreateParameters)=>
            {
                if(params)
                {
                    // We've got the params, now pass to PIQUANT
                    let loadID = this._loadingSvc.add("Generating fit with PIQUANT quant command... (may take 1-2 minutes)");

                    this._quantService.createQuantification(params).subscribe(
                        (csv: string)=>
                        {
                            this._loadingSvc.remove(loadID);

                            // The returned data is a CSV, so don't print it!
                            console.log("PIQUANT returned "+csv.length+" bytes");

                            if(this._spectrumService.mdl)
                            {
                                this._spectrumService.mdl.setFitLineData(csv);
                                this._spectrumService.mdl.recalcSpectrumLines();
                            }
                        },
                        (err)=>
                        {
                            this._loadingSvc.remove(loadID);

                            let msg = httpErrorToString(err, "Failed to generate fit lines with PIQUANT. See logs. Error");
                            alert(msg);
                        }
                    );
                }
            }
        );
    }
}
