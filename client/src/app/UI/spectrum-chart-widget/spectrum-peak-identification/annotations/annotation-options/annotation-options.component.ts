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
import { first } from "rxjs/operators";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { ROIService } from "src/app/services/roi.service";






export class AnnotationOptionsDlgConfig
{
    constructor(
        public editMode: boolean,
        public keV: number,
        public lineClicked: XRFLine = null,
        public annotationName: string = null,
        public annotationROI: string = null
    )
    {
    }
}
export class AnnotationOptionsDlgResult
{
    constructor(
        public keV: number,
        public annotationName: string,
        public annotationROI: string
    )
    {
    }
}

const ROINone = "None (Always Show)";

@Component({
    selector: "annotation-options",
    templateUrl: "./annotation-options.component.html",
    styleUrls: ["./annotation-options.component.scss"]
})
export class AnnotationOptionsComponent implements OnInit
{
    dlgTitle: string = "";
    dlgEditMode: boolean = false;

    annotationLocationChoice: string = "click";
    annotationEditkeV: string = "";
    annotationROI: string = "";
    roiChoices: ROISavedItem[] = [];

    annotationName: string = "";
    clickeV: number = 0;
    clickLineeV: number = 0;
    clickLocation: string = "";
    pileUpLocation: string = "";

    constructor(
        private _roiService: ROIService,
        public dialogRef: MatDialogRef<AnnotationOptionsComponent>,
        @Inject(MAT_DIALOG_DATA) public data: AnnotationOptionsDlgConfig
    )
    {
        this.dlgEditMode = data.editMode;

        // TODO: ensure ROI cannot be named this...
        this.roiChoices = [this.allPointsROI()];
        this._roiService.roi$.pipe(first()).subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this.roiChoices = [this.allPointsROI(), ...Array.from(rois.values())];
            },
            (err)=>
            {
                console.error("Failed to get ROIs in annotation options");
            }
        );

        if(this.dlgEditMode)
        {
            this.dlgTitle = "Edit Annotation";
        }
        else
        {
            this.dlgTitle = "Add Annotation";
        }

        this.annotationName = data.annotationName;
        if(!this.annotationName)
        {
            this.annotationName = "";
        }
        this.annotationROI = data.annotationROI;
        if(!this.annotationROI)
        {
            this.annotationROI = "";
        }

        this.annotationEditkeV = "";
        if(data.keV)
        {
            this.annotationEditkeV = data.keV.toFixed(3);
        }

        // NOTE: this used to present a list of options with radio buttons of where to add the annotation, as the user was able to click on the chart
        //       to initiate the add. So if the user clicked near an XRF line, the user could pick the XRF line's energy or an associated escape peak
        //       to add the annotation there. This has been removed temporarily while we're figuring out how to incorporate it into the new chart
        //       design, where chart clicks should be handled by a tool or UI element.

        /*        else
        {
            this.dlgTitle = 'Add Annotation';
            this.clickeV = data.eV;
            if(data.lineClicked)
            {
                let line: XRFLine = data.lineClicked;

                this.clickLineeV = line.eV;

                let lineName = line.elementSymbol+' '+line.siegbahn;
                let pileupName = '';
                if(line.lineType != XRFLineType.ANNOTATION && line.lineType != XRFLineType.ESCAPE)
                {
                    pileupName = 'Pile-up for '+lineName+' @ '+this.eVtoString(line.eV*2);
                }

                this.clickLocation = lineName + ' @ '+this.eVtoString(line.eV);
                this.pileUpLocation = pileupName;
            }
            else
            {
                this.clickLocation = this.eVtoString(data.eV);
            }
        }*/
    }
    /*
    private eVtoString(eV: number): string
    {
        return (eV/1000).toFixed(3)+' keV';
    }
*/
    private allPointsROI(): ROISavedItem
    {
        return new ROISavedItem(PredefinedROIID.AllPoints, ROINone, [], "", "", new Set<number>(), false, null);
    }

    ngOnInit()
    {
    }

    onChangeLocation(event): void
    {
        if(this.annotationName.length <= 0 && event.value == "pileup")
        {
            this.annotationName = this.pileUpLocation;
        }
    }

    onChangeROI(event): void
    {
    }

    onOk()
    {
        if(this.annotationName.length <= 0)
        {
            alert("Enter annotation text!");
            return;
        }

        if(!this.annotationROI || this.annotationROI.length <= 0)
        {
            //alert('You have no regions of interest defined yet. You need one to associate an annotation with.');
            alert("Select a region of interest to associate this annotation with!");
            return;
        }

        let roiSelected = this.annotationROI;

        let keV = 0;
        //        if(this.dlgEditMode)
        {
            keV = Number.parseFloat(this.annotationEditkeV);

            if(isNaN(keV) || keV <= 0)
            {
                alert("Please enter a positive keV value");
                return;
            }
        }
        /*        else
        {
            eV = this.clickeV;

            if(this.clickLineeV > 0)
            {
                eV = this.clickLineeV;
            }

            if(this.annotationLocationChoice == 'pileup')
            {
                eV = this.clickLineeV*2;
            }
        }
*/
        let result = new AnnotationOptionsDlgResult(keV, this.annotationName, roiSelected);
        //console.log('Closing annotation options dialog with result:');
        //console.log(result);
        this.dialogRef.close(result);
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }
}
