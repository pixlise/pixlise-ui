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

import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DetectorConfig } from "src/app/models/BasicTypes";
import { QuantModes } from "src/app/models/Quantifications";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataSetService } from "src/app/services/data-set.service";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { ROIService } from "src/app/services/roi.service";
import { isValidElementsString } from "src/app/utils/utils";
import { environment } from "src/environments/environment";


export class QuantificationStartOptionsParams
{
    constructor(
    // For UI to see
        public datasetID: string,
        // Settings which user may edit
        public elements: string,
        public parameters: string,
        public quantName: string,
        public detectorConfigs: string[]
    )
    {
    }
}

export class QuantificationStartOptions
{
    constructor(
        public roiID: string,
        public elements: string,
        public parameters: string,
        public runTime: string,
        public quantName: string,
        public detectorConfig: string,
        public quantMode: string,
        public roiIDs: string[], // for sum-then-quantify modes
        public includeDwells: boolean
    )
    {
    }
}

class QuantModeItem
{
    constructor(
        public id: string,
        public label: string
    )
    {
    }
}

@Component({
    selector: "app-quantification-start-options",
    templateUrl: "./quantification-start-options.component.html",
    styleUrls: ["./quantification-start-options.component.scss"]
})
export class QuantificationStartOptionsComponent implements OnInit
{
    private _subs = new Subscription();

    // Multi-select ROIs (scrollable list of checkboxes)
    private _selectedROIs: string[] = [];
    roisForMultiSelect: ROISavedItem[] = [];

    // Single-select ROIs (dropdown)
    selectedROI: string = "";
    rois: ROISavedItem[] = [];

    asCarbonates: boolean = false;
    selectedDetectorConfig: string = "";
    singleSelectROI: boolean = true;

    detectorSettingLabels: string[] = ["Detectors Combined", "Detectors Separate"];
    detectorSettingChoices: string[] = [QuantModes.quantModeCombined, QuantModes.quantModeAB];
    detectorSetting: string = QuantModes.quantModeCombined;

    quantModeId: string = "PMC";
    private static _quantModes: QuantModeItem[] = [
        new QuantModeItem("PMC", "Quantify Individual PMCs"),
        new QuantModeItem("Bulk", "Homogeneous ROI (total counts)"),
    ];

    includeDwells: boolean = true;

    private _xraySourceElement: string = "";

    constructor(
        private _roiService: ROIService,
        private _datasetService: DataSetService,
        private _envService: EnvConfigurationService,
        public dialogRef: MatDialogRef<QuantificationStartOptionsComponent>,
        @Inject(MAT_DIALOG_DATA) public data: QuantificationStartOptionsParams
    )
    {
        if(data.detectorConfigs.length > 0)
        {
            this.selectedDetectorConfig = data.detectorConfigs[data.detectorConfigs.length-1];
        }
    }

    ngOnInit()
    {
        this.checkSingleSelectROIMode();

        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                const allLocations = new ROISavedItem(PredefinedROIID.AllPoints, "All Locations", [], "", "", new Set<number>(), false, null);

                // Separate out user and shared ones, each group alphabetically sorted
                let userROIs: ROISavedItem[] = [];
                let sharedROIs: ROISavedItem[] = [];

                for(let roi of rois.values())
                {
                    if(roi.shared)
                    {
                        sharedROIs.push(roi);
                    }
                    else
                    {
                        userROIs.push(roi);
                    }
                }

                // Sort the lists
                userROIs.sort((a, b) => (a.name.localeCompare(b.name)));
                sharedROIs.sort((a, b) => (a.name.localeCompare(b.name)));

                // Now add them to the list to display
                this.rois = [allLocations];
                this.rois.push(...userROIs);
                this.rois.push(...sharedROIs);

                // Also add to the list of pickable multiselect ROIs
                this.roisForMultiSelect = [allLocations];
                this.roisForMultiSelect.push(...userROIs);
                this.roisForMultiSelect.push(...sharedROIs);
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._envService.detectorConfig$.subscribe(
            (cfg: DetectorConfig)=>
            {
                if(cfg.tubeElement)
                {
                    let elem = periodicTableDB.getElementByAtomicNumber(cfg.tubeElement);
                    this._xraySourceElement = elem.symbol;
                }
            },
            (err)=>
            {
                console.error(err);
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get quantModes(): QuantModeItem[]
    {
        return QuantificationStartOptionsComponent._quantModes;
    }

    onOk()
    {
        // If no quant name, don't continue
        if(this.data.quantName.length <= 0)
        {
            alert("Please enter a name for the quantification you are creating");
            return;
        }

        // API checks for this too but better if we don't even send it in!
        if(!isValidElementsString(this.data.elements))
        {
            alert("Elements string is empty or invalid. Must be composed comma-separated symbols only.");
            return;
        }

        // If we're in sum then quantify, user is selecting a range of ROIs so we don't care if the single field is not set
        if(this._selectedROIs.length <= 0 && this.selectedROI.length <= 0)
        {
            alert("Please select a region of interest (ROI)");
            return;
        }

        let elements = this.data.elements;

        // If the element list contains the xray source element, this will almost definitely come up with a weird quantification, so we bring
        // up a warning
        if(
            elements.indexOf(this._xraySourceElement) > -1 &&
            !confirm("You have included \""+this._xraySourceElement+"\" in the quantification.\n\nThis will generate errors in PIQUANT because this element is used in construction of the instrument X-ray tube source. Either exclude the element or supply the required parameters to PIQUANT to make it work.")
        )
        {
            console.log("User cancelled due to element list containing xray source element");
            return;
        }

        // To tell PIQUANT to use carbonates when quantifying, we have to give it "CO3," at the start of the element list
        if(this.asCarbonates)
        {
            elements = "CO3,"+elements;
        }

        // Take our multiple inputs and form a quant mode
        let quantMode = this.detectorSetting;
        if(this.quantModeId == "Bulk")
        {
            quantMode += this.quantModeId;
        }

        let result = new QuantificationStartOptions(
            this.selectedROI,
            elements,
            this.data.parameters,
            "60", // We want it done fast... so say 60 seconds, that should trigger max nodes to run PIQUANT on
            this.data.quantName,
            this.selectedDetectorConfig,
            quantMode,
            this._selectedROIs,
            this.includeDwells
        );

        this.dialogRef.close(result);
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }

    getROIDisplayName(roi: ROISavedItem): string
    {
        let count = roi.locationIndexes.length;
        if(roi.id == PredefinedROIID.AllPoints)
        {
            let dataset = this._datasetService.datasetLoaded;
            if(dataset)
            {
                count = dataset.locationPointCache.length;
            }
        }

        let sharer = "";
        if(roi.shared)
        {
            sharer = ", shared by: "+roi.creator.name;
        }

        return roi.name + " ("+count+" points"+sharer+")";
    }

    onToggleAsCarbonates(): void
    {
        this.asCarbonates = !this.asCarbonates;
    }

    onQuantModeChanged(event): void
    {
        this.checkSingleSelectROIMode();
    }

    private checkSingleSelectROIMode(): void
    {
        this.singleSelectROI = this.quantModeId != "Bulk";
    }

    isActiveROI(roiID: string): boolean
    {
        return this._selectedROIs.indexOf(roiID) > -1;
    }

    onToggleROI(roiID: string)
    {
        let idx = this._selectedROIs.indexOf(roiID);
        if(idx == -1)
        {
            this._selectedROIs.push(roiID);
        }
        else
        {
            this._selectedROIs.splice(idx, 1);
        }
    }

    onChangeDetectorSetting(event): void
    {
        this.detectorSetting = event;
    }

    onToggleIncludeDwells()
    {
        this.includeDwells = !this.includeDwells;
    }
}
