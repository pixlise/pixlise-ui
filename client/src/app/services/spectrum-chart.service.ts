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

import { Injectable } from "@angular/core";
import { ReplaySubject, Subscription } from "rxjs";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { SpectrumChartModel } from "src/app/UI/spectrum-chart-widget/model";
import { DataSetService } from "./data-set.service";
import { SelectionService } from "./selection.service";


@Injectable({
    providedIn: "root"
})
export class SpectrumChartService
{
// Proper cleanup
    private _subs = new Subscription();

    private _mdl: SpectrumChartModel = null;
    private _mdl$ = new ReplaySubject<void>(1);

    constructor(
        private _widgetDataService: WidgetRegionDataService,
        private _diffractionService: DiffractionPeakService,
    )
    {
        this.resubscribeQuantLayers();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    //getId(): string { return this.id }

    private resubscribeQuantLayers()
    {
        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                // WARNING: we used to listen to widgetData$ and here we had an ugly stack overflow because
                // it triggers a chain reaction where this + diffraction peaks panel fire off change
                // events which then triggers widget region data service to rebuild, etc etc.
                if(this._mdl)
                {
                    this.updateCalibrationFromQuant();
                }
            },
            (err)=>
            {
            },
            ()=>
            {
                this.resubscribeQuantLayers();
            }
        ));
    }

    setModel(mdl: SpectrumChartModel): void
    {
        this._mdl = mdl;

        // Spectrum model needs quant for energy calibration "from quant" values
        this.updateCalibrationFromQuant();

        // Tell the diffraction service there's a new calibration manager
        this._diffractionService.setEnergyCalibrationManager(this._mdl.energyCalibrationManager);

        this._mdl$.next();
    }

    private updateCalibrationFromQuant(): void
    {
        let quant = this._widgetDataService.quantificationLoaded;
        if(quant)
        {
            let calib$ = quant.getAverageEnergyCalibration();
            calib$.subscribe(
                (calib)=>
                {
                    this._mdl.setQuantificationeVCalibration(calib);
                }
            );
        }
    }

    get mdl(): SpectrumChartModel
    {
        return this._mdl;
    }

    get mdl$(): ReplaySubject<void>
    {
        return this._mdl$;
    }
}
