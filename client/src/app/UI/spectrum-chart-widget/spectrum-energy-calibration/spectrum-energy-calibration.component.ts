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
import { MatDialogRef } from "@angular/material/dialog";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { EnergyCalibrationManager } from "src/app/UI/spectrum-chart-widget/energy-calibration-manager";




export class SpectrumEnergyCalibrationResult
{
    constructor(
        public A: SpectrumEnergyCalibration,
        public B: SpectrumEnergyCalibration,
        public useCalibration: boolean
    )
    {
    }
}

class CalibrationSource
{
    constructor(public name: string, public enabled: boolean)
    {
    }
}

const sourceDataset = "Dataset File";
const sourceNone = "None";
const sourceCustom = "Custom";
const sourceQuant = "Current Quantification";

@Component({
    selector: "spectrum-energy-calibration",
    templateUrl: "./spectrum-energy-calibration.component.html",
    styleUrls: ["./spectrum-energy-calibration.component.scss"]
})
export class SpectrumEnergyCalibrationComponent implements OnInit
{
    eVStartA: string = null;
    eVPerChannelA: string = null;

    eVStartB: string = null;
    eVPerChannelB: string = null;

    sources: CalibrationSource[] = [];
    selectedSource: string = "";

    constructor(
        private _spectrumService: SpectrumChartService,
        public dialogRef: MatDialogRef<SpectrumEnergyCalibrationComponent>
    )
    {
    }

    ngOnInit()
    {
        let energyCal = this.getEnergyCalibration();

        this.sources = [];
        this.sources.push(new CalibrationSource(sourceNone, true));
        this.sources.push(new CalibrationSource(sourceDataset, this.isLoadFromDatasetAllowed()));
        this.sources.push(new CalibrationSource(sourceQuant, this.isLoadFromQuantAllowed()));
        this.sources.push(new CalibrationSource(sourceCustom, true));

        if(!this._spectrumService.mdl.xAxisEnergyScale)
        {
            this.selectedSource = sourceNone;
        }
        else
        {
            this.eVStartA = energyCal.eVCalibrationA.eVstart.toFixed(3);
            this.eVPerChannelA = energyCal.eVCalibrationA.eVperChannel.toFixed(3);

            this.eVStartB = energyCal.eVCalibrationB.eVstart.toFixed(3);
            this.eVPerChannelB = energyCal.eVCalibrationB.eVperChannel.toFixed(3);

            // Guess where it's from based on it matching other values
            if(
                energyCal.eVCalibrationA.equals(energyCal.eVCalibrationFromDatasetBulkA) &&
                energyCal.eVCalibrationB.equals(energyCal.eVCalibrationFromDatasetBulkB)
            )
            {
                this.selectedSource = sourceDataset;
            }
            else if(
                energyCal.eVCalibrationA.equals(energyCal.eVCalibrationFromQuantA) &&
                energyCal.eVCalibrationB.equals(energyCal.eVCalibrationFromQuantB)
            )
            {
                this.selectedSource = sourceQuant;
            }
            else
            {
                // We don't know where the value came from at this point so just show custom...
                this.selectedSource = sourceCustom;
            }
        }
    }

    get calibrationIcon(): string
    {
        if(this.selectedSource == sourceNone)
        {
            return "assets/button-icons/disabled-gray.svg";
        }

        return "assets/button-icons/yellow-tick.svg";
    }

    get editDisabled(): boolean
    {
        return this.selectedSource != sourceCustom;
    }

    onSwitchSource(event/*: MatSelectChange*/): void
    {
        this.selectedSource = event.value;

        if(event.value == sourceDataset)
        {
            this.resetToDataset();
        }
        else if(event.value == sourceQuant)
        {
            this.resetToQuant();
        }
        else if(event.value == sourceCustom)
        {
            this.eVStartA = "";
            this.eVPerChannelA = "";

            this.eVStartB = "";
            this.eVPerChannelB = "";
        }
        else if(event.value == sourceNone)
        {
            this.eVStartA = "";
            this.eVPerChannelA = "";

            this.eVStartB = "";
            this.eVPerChannelB = "";
        }
    }

    onValueChanged(): void
    {
        if(this.eVChanged())
        {
            // We no longer do this - if it's not on custom, the text boxes are disabled
            //this.selectedSource = sourceCustom;
        }
    }

    private getEnergyCalibration(): EnergyCalibrationManager
    {
        return this._spectrumService.mdl.energyCalibrationManager;
    }

    private resetToQuant(): void
    {
        let energyCal = this.getEnergyCalibration();
        this.eVStartA = energyCal.eVCalibrationFromQuantA.eVstart.toFixed(3);
        this.eVPerChannelA = energyCal.eVCalibrationFromQuantA.eVperChannel.toFixed(3);

        this.eVStartB = energyCal.eVCalibrationFromQuantB.eVstart.toFixed(3);
        this.eVPerChannelB = energyCal.eVCalibrationFromQuantB.eVperChannel.toFixed(3);
    }

    private resetToDataset(): void
    {
        let energyCal = this.getEnergyCalibration();
        this.eVStartA = energyCal.eVCalibrationFromDatasetBulkA.eVstart.toFixed(3);
        this.eVPerChannelA = energyCal.eVCalibrationFromDatasetBulkA.eVperChannel.toFixed(3);

        this.eVStartB = energyCal.eVCalibrationFromDatasetBulkB.eVstart.toFixed(3);
        this.eVPerChannelB = energyCal.eVCalibrationFromDatasetBulkB.eVperChannel.toFixed(3);
    }

    private isLoadFromQuantAllowed(): boolean
    {
        let energyCal = this.getEnergyCalibration();

        // We only allow loading from quant if:

        // We have non-empty values in the quant to apply
        if(energyCal.eVCalibrationFromQuantA.isEmpty() && energyCal.eVCalibrationFromQuantB.isEmpty())
        {
            return false;
        }

        return true;
    }

    private isLoadFromDatasetAllowed(): boolean
    {
        let energyCal = this.getEnergyCalibration();

        // We only allow loading from dataset if:

        // We have non-empty values in the dataset to apply
        if(energyCal.eVCalibrationFromDatasetBulkA.isEmpty() && energyCal.eVCalibrationFromDatasetBulkB.isEmpty())
        {
            return false;
        }

        return true;
    }

    private eVChanged(): boolean
    {
        let energyCal = this.getEnergyCalibration();

        if( this.eVStartA == energyCal.eVCalibrationA.eVstart.toFixed(3) &&
            this.eVPerChannelA == energyCal.eVCalibrationA.eVperChannel.toFixed(3) &&
            this.eVStartB == energyCal.eVCalibrationB.eVstart.toFixed(3) &&
            this.eVPerChannelB == energyCal.eVCalibrationB.eVperChannel.toFixed(3)
        )
        {
            return false;
        }
        return true;
    }

    onApply(): void
    {
        let result = new SpectrumEnergyCalibrationResult(null, null, this.selectedSource != sourceNone);

        if(this.selectedSource != sourceNone)
        {
            // Make sure they are valid strings
            let eVStartNumA = Number.parseFloat(this.eVStartA);
            let eVPerChannelNumA = Number.parseFloat(this.eVPerChannelA);

            let eVStartNumB = Number.parseFloat(this.eVStartB);
            let eVPerChannelNumB = Number.parseFloat(this.eVPerChannelB);

            if(isNaN(eVStartNumA) || isNaN(eVPerChannelNumA) || isNaN(eVStartNumB) || isNaN(eVPerChannelNumB))
            {
                alert("Please enter a number for eV Start and eV per channel for each detector.");
                return;
            }

            if(eVPerChannelNumA <= 0 || eVPerChannelNumB <= 0)
            {
                alert("eV per channel values must be greater than 0");
                return;
            }

            result.A = new SpectrumEnergyCalibration(eVStartNumA, eVPerChannelNumA, "A");
            result.B = new SpectrumEnergyCalibration(eVStartNumB, eVPerChannelNumB, "B");
        }

        this.dialogRef.close(result);
    }
}
