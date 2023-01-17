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
import { ROIItem } from "src/app/models/roi";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { RegionChangeInfo, RegionLayerInfo, RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { Colours } from "src/app/utils/colours";
import { httpErrorToString } from "src/app/utils/utils";
import { MistRoiConvertComponent, MistROIConvertData } from "./mist-roi-convert/mist-roi-convert.component";
import { MistRoiUploadComponent, MistROIUploadData } from "./mist-roi-upload/mist-roi-upload.component";


@Component({
    selector: "app-mist-roi",
    templateUrl: "./mist-roi.component.html",
    styleUrls: ["./mist-roi.component.scss", "../../side-panel.component.scss"]
})
export class MistROIComponent implements OnInit
{
    private _subs = new Subscription();

    private _selectedROIs: RegionLayerInfo[] = [];

    mistROIs: RegionLayerInfo[] = [];

    allPointsColour = Colours.GRAY_10.asString();

    public expandedIndices: number[] = [];

    private _selectionEmpty: boolean = true;
    roiSearchString: string = "";

    constructor(
        private _contextImageService: ContextImageService,
        private _datasetService: DataSetService,
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.onGotModel();
            }
        ));
        this._subs.add(this._selectionService.selection$.subscribe(
            (sel: SelectionHistoryItem)=>
            {
                this._selectionEmpty = sel.beamSelection.getSelectedPMCs().size <= 0 && sel.pixelSelection.selectedPixels.size <= 0;
            }
        ));
    }


    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private getRegionManager(): RegionManager
    {
        return this._contextImageService.mdl.regionManager;
    }


    onGotModel(): void
    {
        // Listen to what layers exist...
        this._subs.add(this.getRegionManager().regions$.subscribe(
            (change: RegionChangeInfo)=>
            {
                let regions = this.getRegionManager().getDisplayedRegions(change.regions);
                let roiIDs: Set<string> = new Set<string>();
                for(let region of regions)
                {
                    if(region.roi?.mistROIItem) 
                    {
                        this.setROI(region);
                        roiIDs.add(region.roi.id);
                    }
                }

                // Delete any that we didn't see in the new update
                this.mistROIs = this.mistROIs.filter((region) => roiIDs.has(region.roi.id));
            },
            () => null
        ));
    }

    private setROI(roi: RegionLayerInfo): void
    {
        // If it exists, we just update it, so we don't reset the whole UI for this
        let regionIndex = this.mistROIs.findIndex((region) => region.roi.id === roi.roi.id);
        if(regionIndex >= 0)
        {
            this.mistROIs[regionIndex].roi = roi.roi;
            this.mistROIs[regionIndex].visible = roi.visible;
            this.mistROIs[regionIndex].opacity = roi.opacity;
            return;
        }

        this.mistROIs.push(roi);
    }

    get fullyIdentifiedMistROIs(): RegionLayerInfo[]
    {
        return this.mistROIs.filter(region => region.roi.mistROIItem?.ID_Depth >= 5);
    }

    get groupIdentifiedMistROIs(): RegionLayerInfo[]
    {
        return this.mistROIs.filter(region => region.roi.mistROIItem?.ID_Depth < 5).sort((roiA, roiB) => roiB.roi.mistROIItem.ID_Depth - roiA.roi.mistROIItem.ID_Depth);
    }

    onUploadROIs(event): void
    {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.data = new MistROIUploadData();
        const dialogRef = this.dialog.open(MistRoiUploadComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (response: {mistROIs: ROIItem[]; deleteExisting: boolean; overwrite: boolean; skipDuplicates: boolean;})=>
            {
                if(!response || !response?.mistROIs)
                {
                    return;
                }
                this._roiService.bulkAdd(response.mistROIs, response.overwrite, response.skipDuplicates, response.deleteExisting, true).subscribe(
                    ()=>
                    {
                        this._selectionService.clearSelection();
                    },
                    (err)=>
                    {
                        alert(httpErrorToString(err, ""));
                    }
                );
                this.expandedIndices = Array.from(new Set([...this.expandedIndices, 0]));
            }
        );
    }

    onConvertSelected(): void
    {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.data = new MistROIConvertData(this._selectedROIs);
        const dialogRef = this.dialog.open(MistRoiConvertComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (response: {shareROIs: boolean;})=>
            {
                let roiItems: ROIItem[] = this._selectedROIs.map((region) =>
                {
                    let roiItem = region.roi.convertToROIItem();
                    roiItem.name = roiItem.name.replace("mist__roi.", "");
                    roiItem.mistROIItem = null;
                    
                    return roiItem;
                });

                this._roiService.bulkAdd(roiItems, false, false, false, response.shareROIs).subscribe(
                    ()=>
                    {
                        this._selectionService.clearSelection();
                    },
                    (err)=>
                    {
                        alert(httpErrorToString(err, ""));
                    }
                );
            }
        );
    }

    onToggleExpand(index: number)
    {
        if(this.expandedIndices.includes(index))
        {
            this.expandedIndices = this.expandedIndices.filter(i => i !== index);
        }
        else
        {
            this.expandedIndices.push(index);
        }
    }

    get selectionEmpty(): boolean
    {
        return this._selectionEmpty;
    }

    get isAllFullyIdentifiedMistROIsChecked(): boolean
    {
        let isEmpty = this.fullyIdentifiedMistROIs.length === 0;
        return !isEmpty && this.fullyIdentifiedMistROIs.filter(roi => this.checkSelected(roi)).length === this.fullyIdentifiedMistROIs.length;
    }

    get roiSelectionEmpty(): boolean
    {
        return this._selectedROIs.length === 0;
    }

    toggleFullyIdentifiedMistROIs(event)
    {
        if(this.isAllFullyIdentifiedMistROIsChecked) 
        {
            this._selectedROIs = this._selectedROIs.filter(roi => roi.roi.mistROIItem.ID_Depth < 5);
        }
        else 
        {
            let allFullMistROIs = this.mistROIs.filter(roi => roi.roi.mistROIItem.ID_Depth >= 5 && this._selectedROIs.findIndex(selected => selected.roi.id === roi.roi.id) < 0);
            this._selectedROIs = [...this._selectedROIs, ...allFullMistROIs];
        }
    }

    get isAllGroupIdentifiedMistROIsChecked(): boolean
    {
        let isEmpty = this.groupIdentifiedMistROIs.length === 0;
        return !isEmpty && this.groupIdentifiedMistROIs.filter(roi => this.checkSelected(roi)).length === this.groupIdentifiedMistROIs.length;
    }

    toggleGroupIdentifiedMistROIs(event)
    {
        if(this.isAllGroupIdentifiedMistROIsChecked) 
        {
            this._selectedROIs = this._selectedROIs.filter(roi => roi.roi.mistROIItem.ID_Depth >= 5);
        }
        else 
        {
            let allPartialMistROIs = this.mistROIs.filter(roi => roi.roi.mistROIItem.ID_Depth < 5 && this._selectedROIs.findIndex(selected => selected.roi.id === roi.roi.id) < 0);
            this._selectedROIs = [...this._selectedROIs, ...allPartialMistROIs];
        }
    }

    checkSelected(region: RegionLayerInfo): boolean
    {
        return this._selectedROIs.findIndex(roi => roi.roi.id === region.roi.id) >= 0;
    }

    onROISelectToggle(region: RegionLayerInfo)
    {
        let existingIndex = this._selectedROIs.findIndex(roi => roi.roi.id === region.roi.id);
        if(existingIndex >= 0) 
        {
            this._selectedROIs = this._selectedROIs.filter((roi, i) => i !== existingIndex);
        }
        else 
        {
            this._selectedROIs = [...this._selectedROIs, region];
        }
    }

    onDeleteSelected()
    {
        if(confirm(`Are you sure you want to delete ${this._selectedROIs.length} ROIs?`)) 
        {
            let roiIDs = this.mistROIs.filter((roi) => this._selectedROIs.findIndex(selected => selected.roi.id === roi.roi.id) >= 0).map(roi => roi.roi.id);
            this._roiService.bulkDelete(roiIDs).subscribe(
                ()=>
                {
                    this._selectionService.clearSelection();
                },
                (err)=>
                {
                    alert(httpErrorToString(err, ""));
                }
            );

            this.mistROIs = this.mistROIs.filter((roi) => this._selectedROIs.findIndex(selected => selected.roi.id === roi.roi.id) < 0);
            this._selectedROIs = [];
        }
    }
}
