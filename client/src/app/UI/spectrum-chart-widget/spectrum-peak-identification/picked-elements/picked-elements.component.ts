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
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { first } from "rxjs/operators";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataSetService } from "src/app/services/data-set.service";
import { ElementSetService } from "src/app/services/element-set.service";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { NotificationService } from "src/app/services/notification.service";
import { QuantCreateParameters, QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionService } from "src/app/services/selection.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { QuantificationStartOptions, QuantificationStartOptionsComponent, QuantificationStartOptionsParams } from "src/app/UI/quantification-start-options/quantification-start-options.component";
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

    constructor(
        private _elementSetService: ElementSetService,
        private _spectrumService: SpectrumChartService,
        private _quantService: QuantificationService,
        private _selectionService: SelectionService,
        private _roiService: ROIService,
        private _datasetService: DataSetService,
        private _envService: EnvConfigurationService,
        private _notificationService: NotificationService,
        private _authService: AuthenticationService,
        public dialog: MatDialog
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

        let dataset = this._datasetService.datasetLoaded;

        let elemSymbols = periodicTableDB.getElementSymbolsForAtomicNumbers(atomicNumbers);
        let detectorConfig = dataset.experiment.getDetectorConfig();
        let parameters = "";
        let configVersions: string[] = [];
        if(this._envService.detectorConfig != null)
        {
            parameters = this._envService.detectorConfig.defaultParams;
            configVersions = this._envService.detectorConfig.piquantConfigVersions;
        }

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

        let elemList = elemSymbols.join(",");

        // Show the confirmation dialog
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        dialogConfig.data = new QuantificationStartOptionsParams(
            this._datasetService.datasetIDLoaded,
            elemList,
            parameters,
            "",
            configVersions
        );

        const dialogRef = this.dialog.open(QuantificationStartOptionsComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: QuantificationStartOptions)=>
            {
                // Result should be a list of element symbol strings
                if(result)
                {
                    // Using the selected ROI ID, get the list of PMCs
                    this._roiService.roi$.pipe(first()).subscribe(
                        (rois: Map<string, ROISavedItem>)=>
                        {
                            let pmcs: number[] = [];

                            let roiID = result.roiID;
                            if(roiID == PredefinedROIID.AllPoints)
                            {
                                roiID = "";
                            }

                            let roi = rois.get(roiID);
                            if(roi)
                            {
                                pmcs = Array.from(dataset.getPMCsForLocationIndexes(roi.locationIndexes, true).values());
                            }
                            else
                            {
                                // Otherwise send ALL pmcs that have spectra
                                for(let loc of dataset.locationPointCache)
                                {
                                    if(loc.hasNormalSpectra || loc.hasDwellSpectra)
                                    {
                                        pmcs.push(loc.PMC);
                                    }
                                }
                            }

                            // Call the actual quantification creation API
                            let params: QuantCreateParameters = new QuantCreateParameters(
                                result.quantName,
                                pmcs,
                                result.elements.split(","),
                                result.parameters,
                                result.detectorConfig,
                                Number(result.runTime),
                                roiID,
                                "", // no element set ID yet
                                result.quantMode,
                                result.roiIDs, // useful for quantMode==*Bulk, where we need to sum PMCs in an ROI before quantifying them
                                result.includeDwells
                            );

                            this._quantService.createQuantification(params).subscribe(
                                (jobId: string)=>
                                {
                                    console.log("Job started, id: "+jobId);
                                    /*                                    let msg = 'Started Quantification: "'+result.quantName+'" (id: '+jobId+'). Click on Quant Logs tab to follow progress.';
                                    //alert(msg);
                                    this._notificationService.addNotification(msg);*/
                                },
                                (err)=>
                                {
                                    let msg = httpErrorToString(err, "Quantification Not Run");
                                    alert(msg);
                                }
                            );
                        }
                    ); // roi query
                }
            }
        ); // afterClosed
    }
}
