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


export class QuantificationStartOptionsParams
{
    constructor(
        public defaultCommand: string,
        public atomicNumbers: Set<number>
    )
    {
    }
}

// The resulting quantification parameters, these are the ones directly passed to the API
// for creating a quant, so this has to match the API struct!
export class QuantCreateParameters
{
    constructor(
        public name: string,
        public pmcs: number[],
        public elements: string[],
        public parameters: string,
        public detectorConfig: string,
        public runTimeSec: number,
        public roiID: string,
        public elementSetID: string,
        public quantMode: string,
        public roiIDs: string[],
        public includeDwells: boolean,
        public command: string,
        //public comments: string
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
    private _selectedROIs: string[] = []; // These are the multiple ROIs chosen by check boxes
    // NOTE: we display the same list of ROIs as with single selection

    // Single-select ROIs (dropdown)
    selectedROI: string = "";
    rois: ROISavedItem[] = [];

    // The raw ROIs that came in (so we can look up by name)
    private _rawROIs: Map<string, ROISavedItem> = null;

    asCarbonates: boolean = false;
    ignoreArgon: boolean = true;
    includeDwells: boolean = true;
    ironProportion: number = 1.0;
    selectedDetectorConfig: string = "";
    singleSelectROI: boolean = true;
    parameters: string = "";
    quantName: string = "";
    elements: string = "";
    configVersions: string[] = [];

    detectorSettingLabels: string[] = ["Detectors Combined", "Detectors Separate"];
    detectorSettingChoices: string[] = [QuantModes.quantModeCombined, QuantModes.quantModeAB];
    detectorSetting: string = QuantModes.quantModeCombined;

    quantModeId: string = "PMC";
    private static _quantModes: QuantModeItem[] = [
        new QuantModeItem("PMC", "Quantify Individual PMCs"),
        new QuantModeItem("Bulk", "Homogeneous ROI (total counts)"),
        //new QuantModeItem("Bulk", "Heterogeneous ROI (counts/ms)"),
        new QuantModeItem("Fit", "Spectral Fit"),
    ];

    private _xraySourceElement: string = "";

    constructor(
        private _roiService: ROIService,
        private _datasetService: DataSetService,
        private _envService: EnvConfigurationService,
        public dialogRef: MatDialogRef<QuantificationStartOptionsComponent>,
        @Inject(MAT_DIALOG_DATA) public data: QuantificationStartOptionsParams
    )
    {
        if(this.data.defaultCommand)
        {
            this.quantModeId = this.data.defaultCommand;
        }
    }

    ngOnInit()
    {
        let elemSymbols = periodicTableDB.getElementSymbolsForAtomicNumbers(this.data.atomicNumbers);
        this.elements = elemSymbols.join(",");

        this.checkSingleSelectROIMode();

        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._rawROIs = rois;
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
            },
            (err)=>
            {
                console.error(err);
            }
        ));

        this._subs.add(this._envService.detectorConfig$.subscribe(
            (cfg: DetectorConfig)=>
            {
                this.parameters = cfg.defaultParams;
                if(cfg.tubeElement)
                {
                    let elem = periodicTableDB.getElementByAtomicNumber(cfg.tubeElement);
                    this._xraySourceElement = elem.symbol;
                }

                let detectorConfig = this._datasetService.datasetLoaded.experiment.getDetectorConfig();

                let configVersions: string[] = this._envService.detectorConfig.piquantConfigVersions;
                if(configVersions.length <= 0)
                {
                    alert("Failed to determine PIQUANT config versions, quantification will fail.");
                    return;
                }
                else
                {
                    // Set these to be valid strings of config + version
                    let formattedVersions: string[] = [];
                    for(let ver of configVersions)
                    {
                        ver = detectorConfig+"/"+ver;
                        formattedVersions.push(ver);
                    }
                    configVersions = formattedVersions;
                }

                if(configVersions.length > 0)
                {
                    this.selectedDetectorConfig = configVersions[configVersions.length-1];
                }

                this.configVersions = configVersions;
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

    get loading(): boolean
    {
        // Return true if we're still loading up our values
        return this._rawROIs == null || this.configVersions.length <= 0;
    }

    get quantModes(): QuantModeItem[]
    {
        return QuantificationStartOptionsComponent._quantModes;
    }

    onOk()
    {
        // If no quant name, don't continue
        if(this.canSetName)
        {
            if(this.quantName.length <= 0)
            {
                alert("Please enter a name for the quantification you are creating");
                return;
            }
        }
        else
        {
            // Make sure there is no name set
            this.quantName = "";
        }

        // API checks for this too but better if we don't even send it in!
        let elements = this.elements;
        if(!isValidElementsString(elements))
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

        if(this.ignoreArgon)
        {
            elements = "Ar_I,"+elements;
        }

        let parameters = this.parameters;
        if(this.ironProportion !== null && !isNaN(this.ironProportion))
        {
            parameters += "-Fe,"+this.ironProportion;
        }

        // Take our multiple inputs and form a quant mode
        let quantMode = this.detectorSetting;
        if(this.quantModeId == "Bulk")
        {
            quantMode += this.quantModeId;
        }

        let roiID = this.selectedROI;
        if(roiID == PredefinedROIID.AllPoints)
        {
            roiID = "";
        }
        let pmcs = this.makePMCList(roiID);

        let result: QuantCreateParameters = new QuantCreateParameters(
            this.quantName,
            pmcs,
            elements.split(","),
            parameters,
            this.selectedDetectorConfig,
            60, // We want it done fast... so say 60 seconds, that should trigger max nodes to run PIQUANT on
            roiID,
            "", // no element set ID yet
            quantMode,
            this._selectedROIs, // useful for quantMode==*Bulk, where we need to sum PMCs in an ROI before quantifying them
            this.includeDwells,
            this.quantModeId == "Fit" ? "quant" : "map",
        );

        this.dialogRef.close(result);
    }

    private makePMCList(roiID: string): number[]
    {
        const dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return [];
        }

        let pmcs: number[] = [];

        let roi = this._rawROIs.get(roiID);
        if(roi)
        {
            pmcs = Array.from(dataset.getPMCsForLocationIndexes(roi.locationIndexes, true).values());
        }
        else
        {
            // Otherwise send ALL pmcs that have spectra

            // NOTE: this is kind of weird with the multi-selection of ROIs, but in that case we end up passing in
            //       all the PMCs as something in the pipeline requires them to be there... or maybe this can be
            //       taken out in future, don't know, not a priority for now.

            for(let loc of dataset.locationPointCache)
            {
                if(loc.hasNormalSpectra || loc.hasDwellSpectra)
                {
                    pmcs.push(loc.PMC);
                }
            }
        }

        return pmcs;
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

    onToggleIgnoreArgon(): void
    {
        this.ignoreArgon = !this.ignoreArgon;
    }

    onQuantModeChanged(event): void
    {
        this.checkSingleSelectROIMode();
    }

    get canSetName(): boolean
    {
        return this.quantModeId != "Fit";
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
