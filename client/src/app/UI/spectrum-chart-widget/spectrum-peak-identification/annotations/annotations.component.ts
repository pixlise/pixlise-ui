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
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { AnnotationItem, AnnotationService } from "src/app/services/annotation.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionService } from "src/app/services/selection.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { ViewStateService } from "src/app/services/view-state.service";
import {
    AnnotationOptionsComponent,
    AnnotationOptionsDlgConfig,
    AnnotationOptionsDlgResult
} from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/annotations/annotation-options/annotation-options.component";








@Component({
    selector: ViewStateService.widgetSelectorSpectrumAnnotations,
    templateUrl: "./annotations.component.html",
    styleUrls: ["./annotations.component.scss"]
})
export class AnnotationsComponent implements OnInit
{
    private _subs = new Subscription();
    private _roiNameLookup: Map<string, string> = new Map<string, string>();

    userAnnotations: AnnotationItem[] = [];
    sharedAnnotations: AnnotationItem[] = [];

    constructor(
        private _spectrumService: SpectrumChartService,
        private _annotationService: AnnotationService,
        private _selectionService: SelectionService,
        private _authService: AuthenticationService,
        private _roiService: ROIService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._roiNameLookup.clear();
                for(let roi of rois.values())
                {
                    this._roiNameLookup.set(roi.id, roi.name);
                }
            }
        ));

        this._subs.add(this._annotationService.annotations$.subscribe(
            (annotations: AnnotationItem[]) =>
            {
                this.userAnnotations = [];
                this.sharedAnnotations = [];

                for(let annotation of annotations)
                {
                    if(!annotation.shared)
                    {
                        this.userAnnotations.push(annotation);
                    }
                    else
                    {
                        this.sharedAnnotations.push(annotation);
                    }
                }

                // Order them by keV
                let sorterFunc = (a: AnnotationItem, b: AnnotationItem)=> 
                {
                    if(a.eV < b.eV)
                    {
                        return -1;
                    }
                    if(a.eV > b.eV)
                    {
                        return 1;
                    }

                    return 0;
                };

                this.userAnnotations.sort(sorterFunc);
                this.sharedAnnotations.sort(sorterFunc);
            }
        ));
    }

    ngOnDestroy()
    {
        // Ensure we get deleted
        this._subs.unsubscribe();
    }

    onAddAnnotation(): void
    {
        //let kevStartingValue = this._spectrumService.mdl.xAxis.canvasToValue(this._spectrumService.mdl.chartArea.center().x)/1000;
        let kevStartingValue = 0;

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new AnnotationOptionsDlgConfig(false, kevStartingValue, null, "", PredefinedROIID.AllPoints);
        const dialogRef = this.dialog.open(AnnotationOptionsComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: AnnotationOptionsDlgResult)=>
            {
                if(result)
                {
                    // User added, save!
                    this._annotationService.createAnnotation(result.keV*1000, result.annotationName, result.annotationROI).subscribe(
                        (result)=>
                        {
                        },
                        (err)=>
                        {
                            alert("Failed to add annotation");
                        }
                    );
                }
            }
        );
    }

    onEditAnnotation(item: AnnotationItem): void
    {
        // Show the options dialog, configured for edit mode
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        // Set up for edit mode
        dialogConfig.data = new AnnotationOptionsDlgConfig(true, item.eV/1000, null, item.name, item.roiID);

        const dialogRef = this.dialog.open(AnnotationOptionsComponent, dialogConfig);

        dialogRef.afterClosed().subscribe((result: AnnotationOptionsDlgResult)=>
        {
            if(result)
            {
                // Here we can overwrite
                this._annotationService.editAnnotation(item.id, result.keV*1000, result.annotationName, result.annotationROI).subscribe((resp)=>
                {
                },
                (err)=>
                {
                    console.error("Failed to save edited annotation: "+result.annotationName);
                }
                );
            }
        }
        );
    }

    onShareAnnotation(item: AnnotationItem): void
    {
        if(confirm("Are you sure you want to share a copy of annotation \""+item.name+"\" with other users?"))
        {
            this._annotationService.share(item.id).subscribe((sharedId: string)=>
            {
                // Don't need to do anything, this would force a listing...
            },
            (err)=>
            {
                alert("Failed to share annotation: "+item.name);
            }
            );
        }
    }

    onDeleteAnnotation(item: AnnotationItem): void
    {
        if(confirm("Are you sure you want to delete annotation: \""+item.name+"\"?"))
        {
            this._annotationService.deleteAnnotation(item.id).subscribe((resp)=>
            {
            },
            (err)=>
            {
                console.error("Failed to delete annotation: "+item.name);
            }
            );
        }
    }

    getAnnotationText(item: AnnotationItem): string
    {
        return item.name;
    }

    getAnnotationDetail(item: AnnotationItem): string
    {
        let txt = (item.eV/1000).toFixed(3)+" keV";
        let roi = this.getROIName(item.roiID);
        if(roi.length > 0)
        {
            txt += ", ROI: "+roi;
        }
        return txt;
    }

    private getROIName(roiID: string): string
    {
        if(roiID == PredefinedROIID.AllPoints)
        {
            return "";
        }

        let name = this._roiNameLookup.get(roiID);
        if(name == undefined)
        {
            return "Unknown";
        }

        return name;
    }

    canEdit(item: AnnotationItem): boolean
    {
        return !item.shared || item.creator.user_id == this._authService.getUserID();
    }

    canDelete(item: AnnotationItem): boolean
    {
        return !item.shared || item.creator.user_id == this._authService.getUserID();
    }
}
