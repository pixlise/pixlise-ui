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

import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { BeamSelection } from "src/app/models/BeamSelection";
import { ROIItem, ROISavedItem } from "src/app/models/roi";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionService } from "src/app/services/selection.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { PickerDialogComponent, PickerDialogData } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { UserPromptDialogComponent, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "src/app/UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { WidgetSettingsMenuComponent } from "src/app/UI/atoms/widget-settings-menu/widget-settings-menu.component";
import { RegionLayerInfo, RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { SelectionTabModel } from "../../selection/model";
import { RGBA } from "src/app/utils/colours";
import { ContextImageItem } from "src/app/models/DataSet";
import { PixelSelection } from "src/app/models/PixelSelection";


@Component({
    selector: "roi-item",
    templateUrl: "./roiitem.component.html",
    styleUrls: ["./roiitem.component.scss", "../../../side-panel.component.scss"]
})
export class ROIItemComponent implements OnInit
{
    private _subs = new Subscription();
    private _subsHover = new Subscription();

    @ViewChild("settingsButton") settingsButton: ElementRef;

    @Input() regionLayer: RegionLayerInfo;

    // Settings used for MIST ROIs
    @Input() isSelectable: boolean = false;
    @Input() selected: boolean = false;
    @Input() colorChangeOnly: boolean = false;

    @Output() onROISelect = new EventEmitter();

    private _sharedBy: string = null;
    private _isSharedByOtherUser: boolean = false;
    private _colourRGB: string = "";

    private _showDetails: boolean = false;
    private _showMoreDetails: boolean = false;

    private _pmcPageIdx: number = 0;
    private _pmcPageSize: number = 100;

    private _summaryLabel: string = "";

    hoverPMC: number = -1;
    pmcs: number[] = [];

    constructor(
        private _authService: AuthenticationService,
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _contextImageService: ContextImageService,
        public dialog: MatDialog,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._roiService.roi$.subscribe(
            ()=>
            {
                this.refreshFromROI();
            }
        ));

        this.refreshFromROI();
    }

    ngOnDestroy(): void
    {
        this.closeSettingsMenu();
        this._subs.unsubscribe();
        this._subsHover.unsubscribe();
    }

    private refreshFromROI(): void
    {
        if(this.roiSavedItem.shared && this.roiSavedItem.creator != null)
        {
            this._sharedBy = this.roiSavedItem.creator.name;
            this._isSharedByOtherUser = this._sharedBy != null && this.roiSavedItem.creator.user_id != this._authService.getUserID();
        }
        else
        {
            this._sharedBy = null;
            this._isSharedByOtherUser = false;
        }

        if(!this.regionLayer.roi.colour)
        {
            this._colourRGB = "";
        }
        else
        {
            this._colourRGB = RGBA.fromWithA(this.regionLayer.roi.colour, 1).asString();
        }

        this._summaryLabel = this.makeSummaryLabel();

        this.updatePMCsDisplayed();
    }

    private makeSummaryLabel(): string
    {
        let label = "";
        if(this.totalPMCs > 0)
        {
            // Get percentage of selected PMCs with normal spectra out of all PMCs with normal spectra
            let selectedPMCsWithNormalSpectra = this._datasetService.datasetLoaded.locationPointCache.filter(point =>
            {
                return (point.hasNormalSpectra || point.hasDwellSpectra) && this.regionLayer.roi.pmcs.has(point.PMC);
            });
            let percentSelected = Math.round(selectedPMCsWithNormalSpectra.length / this._datasetService.datasetLoaded.locationsWithNormalSpectra * 10000) / 100;

            label += `${this.totalPMCs.toLocaleString()} PMCs (${percentSelected}%)`;
        }

        if(this.totalPixels > 0)
        {
            if(label.length > 0)
            {
                label += ", ";
            }

            label += this.totalPixels+" pixels";
        }

        return label;
    }

    private updatePMCsDisplayed(): void
    {
        // Read a page worth into our array
        let last = this._pmcPageIdx+this._pmcPageSize;

        this.pmcs = [];

        let allPMCS = Array.from(this.regionLayer.roi.pmcs).sort((a, b) => (a > b) ? 1 : -1);
        if(last > allPMCS.length)
        {
            last = allPMCS.length;
        }

        for(let c = this._pmcPageIdx; c < last; c++)
        {
            this.pmcs.push(allPMCS[c]);
        }
    }

    onPMCPagePrev(): void
    {
        this.pmcChangePage(-this._pmcPageSize);
    }

    onPMCPageNext(): void
    {
        this.pmcChangePage(this._pmcPageSize);
    }

    private pmcChangePage(count: number): void
    {
        // Don't go past the beginning or end
        let newIdx = this._pmcPageIdx+count;
        if(newIdx < 0 || newIdx >= this.regionLayer.roi.pmcs.size)
        {
            return;
        }

        this._pmcPageIdx += count;
        this.updatePMCsDisplayed();
    }

    get pmcPagePosition(): string
    {
        let lastIdx = Math.min(this.regionLayer.roi.pmcs.size, this._pmcPageIdx+this._pmcPageSize);
        return (this._pmcPageIdx+1)+"-"+lastIdx+" of "+this.regionLayer.roi.pmcs.size+" PMCs";
    }

    get totalPMCs(): number
    {
        return this.regionLayer.roi.pmcs.size;
    }

    get totalPixels(): number
    {
        return this.regionLayer.roi.pixelIndexes.size;
    }

    get summaryLabel(): string
    {
        return this._summaryLabel;
    }

    get imageName(): string
    {
        return this.regionLayer.roi.imageName;
    }

    private subscribePMCHover(): void
    {
        this._subsHover.unsubscribe();
        this._subsHover = new Subscription();

        this._subsHover.add(this._selectionService.hoverChangedReplaySubject$.subscribe(
            ()=>
            {
                this.hoverPMC = this._selectionService.hoverPMC;
            }
        ));
    }

    get labelToShow(): string
    {
        return this.regionLayer.roi.name;
    }

    get sharedBy(): string
    {
        return this._sharedBy;
    }

    get isSharedByOtherUser(): boolean
    {
        return this._isSharedByOtherUser;
    }

    get colour(): string
    {
        return this._colourRGB;
    }

    get opacity(): number
    {
        return this.regionLayer.opacity;
    }

    get visible(): boolean
    {
        return this.regionLayer.visible;
    }

    private get roiSavedItem(): ROISavedItem
    {
        return this.regionLayer.roi;
    }

    get description(): string
    {
        return this.regionLayer.roi.description;
    }

    set description(val: string)
    {
    }

    get hasRGBUContextImageItemShowing(): boolean
    {
        let contextImage = this.getRGBUContextImageItemShowing();
        return !!contextImage;
    }

    onEditROI(): void
    {
        let existingROI = this.roiSavedItem;

        // Show the ROI saving dialog with only name and description editable
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new UserPromptDialogParams(
            "Edit ROI",
            "Save",
            "Cancel",
            [
                new UserPromptDialogStringItem(
                    "Name",
                    (val: string)=>{return val.length > 0;},
                    existingROI.name
                ),
                new UserPromptDialogStringItem(
                    "Description",
                    (val: string)=>{return true;},
                    existingROI.description
                ),
            ]
        );
        existingROI.id, existingROI.name, existingROI.description;
        const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: UserPromptDialogResult)=>
            {
                if(result) // user may cancel...
                {
                    // Expecting the ROI name and description to be whatever the user wants to save
                    let roiName = result.enteredValues.get("Name");
                    let roiDescription = result.enteredValues.get("Description");

                    this._roiService.update(existingROI.id,
                        new ROIItem(
                            roiName,
                            existingROI.locationIndexes,
                            roiDescription,
                            "",
                            []
                        )
                    ).subscribe(
                        ()=>
                        {
                            this._roiService.refreshROIList();
                        },
                        (err)=>
                        {
                            alert("Error while editing ROI: "+existingROI.name);
                            this._roiService.refreshROIList();
                        }
                    );
                }
            }
        );
    }

    onToggleDetails(): void
    {
        this._showDetails = !this._showDetails;
    }

    get showDetails(): boolean
    {
        return this._showDetails;
    }

    onTogglePMCs(): void
    {
        this._showMoreDetails = !this._showMoreDetails;
        if(this._showMoreDetails)
        {
            this.subscribePMCHover();
        }
    }

    get showMoreDetails(): boolean
    {
        // Can only show PMCs if details already showing
        return !this._showDetails ? false : this._showMoreDetails;
    }

    onSelect(): void
    {
        // Get the ROI's selected points
        let locationIndices = new Set<number>(this.roiSavedItem.locationIndexes);
        this.setSelection(locationIndices, this.roiSavedItem.pixelIndexes, this.roiSavedItem.imageName);
    }

    private getRegionManager(): RegionManager
    {
        return this._contextImageService.mdl.regionManager;
    }

    private setSelection(selLocIdxs: Set<number>, pixelIndices: Set<number> = null, imageName: string = ""): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let pixelSelection = null;
        if(pixelIndices)
        {

            let contextImage = this.getRGBUContextImageItemShowing();
            if(contextImage && contextImage.rgbuSourceImage)
            {
                let width = contextImage.rgbuSourceImage.r.width;
                let height = contextImage.rgbuSourceImage.r.height;
                pixelSelection = new PixelSelection(dataset, pixelIndices, width, height, imageName);
            }
        }
        // Remember what we've selected
        // This is used to clear the ROI dropdown if the selection changes to something else
        //this.selectionWeLastSet = selLocIdxs;
        if(selLocIdxs)
        {
            this._selectionService.setSelection(dataset, new BeamSelection(dataset, selLocIdxs), pixelSelection);
        }
    }

    onChangeOpacity(val: SliderValue): void
    {
        this.getRegionManager().setRegionVisibility(this.roiSavedItem.id, val.value, true);
    }

    onVisibility(val: boolean): void
    {
        // If this has no colour assigned to it yet, try to pick one automatically at this point
        if(!this.regionLayer.roi.colour)
        {
            let usedColours = this._viewStateService.getInUseROIColours();
            let pickableColours = PickerDialogData.getStandardColourChoices(usedColours);

            let useColour: string = null;

            for(let item of pickableColours)
            {
                if(item.id && item.enabled)
                {
                    useColour = item.id;
                    break;
                }
            }

            // If we have a colour to use, apply it
            if(useColour)
            {
                this._viewStateService.setROIColour(this.roiSavedItem.id, useColour);
                this._colourRGB = useColour;
            }
        }

        if(!this.getRegionManager().setRegionVisibility(this.roiSavedItem.id, this.regionLayer.opacity, val))
        {
            alert("Please set a colour before turning on region visibility");
        }
        else
        {
            this._roiService.setROIVisibility(this.roiSavedItem.id, val);
        }
    }

    onDeletePMC(pmc: number): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let existingROI = this.roiSavedItem;

        let locExcluded = Array.from(existingROI.locationIndexes);
        let locIdx = dataset.pmcToLocationIndex.get(pmc);

        if(!locIdx)
        {
            alert("Failed to remove PMC "+pmc+" from ROI: "+existingROI.name);
            return;
        }

        let locPos = locExcluded.indexOf(locIdx);
        if(locPos < 0)
        {
            alert("PMC "+pmc+" was not in ROI: "+existingROI.name);
            return;
        }

        locExcluded.splice(locPos, 1);

        let loadID = this._loadingSvc.add("Deleting PMC "+pmc+" from ROI: "+existingROI.name);

        // Replace without this PMC
        this._roiService.update(existingROI.id,
            new ROIItem(
                existingROI.name,
                locExcluded,
                existingROI.description,
                "",
                []
            )
        ).subscribe(
            ()=>
            {
                this._loadingSvc.remove(loadID);
                this._roiService.refreshROIList();
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                alert("Error while removing PMC "+pmc+" from ROI: "+existingROI.name);
                this._roiService.refreshROIList();
            }
        );
    }

    onDelete(): void
    {
        this.closeSettingsMenu();

        let roiName = this.roiSavedItem.name;

        if(confirm("Are you sure you want to delete: "+roiName+"?"))
        {
            this._roiService.del(this.roiSavedItem.id).subscribe((result)=>
            {
                console.log("Deleted ROI: "+roiName);
                this._roiService.refreshROIList();
            },
            (err)=>
            {
                console.error("Failed to delete ROI: "+roiName+", reason: "+err);
                alert("Failed to delete ROI: "+roiName);
                this._roiService.refreshROIList();
            }
            );
        }
    }

    onShare(): void
    {
        this.closeSettingsMenu();

        let roiName = this.roiSavedItem.name;

        if(confirm("Are you sure you want to share a copy of ROI \""+roiName+"\" with other users?"))
        {
            this._roiService.share(this.roiSavedItem.id).subscribe((sharedId: string)=>
            {
                // Don't need to do anything, this would force a listing...
                console.log("Shared ROI: "+roiName);
                this._roiService.refreshROIList();
            },
            (err)=>
            {
                console.error("Failed to share ROI: "+roiName+", reason: "+err);
                alert("Failed to share ROI: "+roiName);
                this._roiService.refreshROIList();
            }
            );
        }
    }

    onSaveSelectionToROI(): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let pmcSel = this._selectionService.getCurrentSelection().beamSelection;
        let pixSel = this._selectionService.getCurrentSelection().pixelSelection;

        // If selection is empty, complain!
        if(pmcSel.locationIndexes.size <= 0 && pixSel.selectedPixels.size <= 0)
        {
            alert("Cannot save an empty ROI. Please select something!");
            return;
        }

        let toSave = new ROIItem(this.regionLayer.roi.name, Array.from(pmcSel.locationIndexes), this.regionLayer.roi.description, pixSel.imageName, Array.from(pixSel.selectedPixels));

        // We're overwriting an ROI
        let loadID = this._loadingSvc.add("Saving selected PMCs to ROI: "+this.regionLayer.roi.name);
        this._roiService.update(this.regionLayer.roi.id, toSave).subscribe(
            ()=>
            {
                console.log("Replaced PMCs in ROI: "+this.regionLayer.roi.id);
                this._loadingSvc.remove(loadID);

                this._roiService.refreshROIList();
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                alert("Failed to set ROI PMCs to current selection: "+err);

                this._roiService.refreshROIList();
            }
        );
    }

    getRGBUContextImageItemShowing(): ContextImageItem
    {
        // Make sure there's a valid context image before proceeding
        if(!this._contextImageService || !this._contextImageService.mdl || !this._contextImageService.mdl.contextImageItemShowing)
        {
            return null;
        }

        let contextImage = this._contextImageService.mdl.contextImageItemShowing;

        // Verify there's a valid RGBU Source Image
        if(!contextImage.rgbuSourceImage || contextImage.rgbuSourceImage.r.values.length <= 0)
        {
            return null;
        }

        return contextImage;
    }

    onAddRGBUPixelsToROI(): void
    {
        let dataset = this._datasetService.datasetLoaded;
        let contextImage = this.getRGBUContextImageItemShowing();

        if(!dataset || !contextImage) 
        {
            return;
        }

        let currentSelection = this._selectionService.getCurrentSelection();

        // This deals with a specific edge case where a user can select an ROI, deselect everything, select PMCs without pixels, and then
        // click to add RGBU Pixels to the ROI. In this case, we want to preserve the ROI and only update it with the new selection, not overwrite
        this.roiSavedItem.locationIndexes.forEach(existingPMC => 
        {
            currentSelection.beamSelection.locationIndexes.add(existingPMC);   
        });

        let pixelSelection = SelectionTabModel.getJoinedNearbyPixelSelection(dataset, contextImage, currentSelection);

        // Make sure all existing ROI pixels are selected before updating selection
        this.roiSavedItem.pixelIndexes.forEach((existingPixel) => 
        {
            pixelSelection.selectedPixels.add(existingPixel);  
        });

        let beamSelection = currentSelection.beamSelection;
        this._selectionService.setSelection(dataset, beamSelection, pixelSelection);
    }

    onColours(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";
        //dialogConfig.panelClass = "panel";
        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let usedColours = this._viewStateService.getInUseROIColours();
        let items = PickerDialogData.getStandardColourChoices(usedColours);

        // Find the colour we're currently set to
        let curr: string[] = [];

        if(this._colourRGB && this._colourRGB.length > 0)
        {
            curr.push(this._colourRGB);
        }

        dialogConfig.data = new PickerDialogData(false, true, false, false, items, curr, "This hue is applied to a different ROI", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (colourRGBs: string[])=>
            {
                let colourRGB = "";
                if(colourRGBs.length > 0)
                {
                    colourRGB = colourRGBs[0];
                }

                // This is a little confusing. We set this on the view state service so it gets saved here, and this is what
                // the other RegionPicker dialog does but we're more complicated - we have a region manager that needs to know
                // of the change too, so we set it there as well
                if(!this._viewStateService.setROIColour(this.roiSavedItem.id, colourRGB))
                {
                    alert("Failed to save colour setting \""+colourRGB+"\" for ROI: \""+this.roiSavedItem.id+"\"");
                }
                else
                {
                    this._colourRGB = this._viewStateService.getROIColour(this.roiSavedItem.id);
                }

                // Close the settings menu that this button was on.
                // HACK NOTE: This is a work-around, if that remains and our colour picker dialog appears on top, if the user selects something
                // on the colour picker dialog, the settings menu is somehow orphaned and stuck there until page refersh.
                this.closeSettingsMenu();
            }
        );

        /* Doesn't seem to work
        dialogRef.afterClosed().subscribe(()=>
        {
            this.closeSettingsMenu();
        });
*/
    }

    private closeSettingsMenu(): void
    {
        if(this.settingsButton && this.settingsButton instanceof WidgetSettingsMenuComponent)
        {
            (this.settingsButton as WidgetSettingsMenuComponent).close();
        }
    }

    onPMCEnter(pmc: number)
    {
        // Show this PMC as the "hovered" one, which will highlight it in views
        this._selectionService.setHoverPMC(pmc);
    }

    onPMCLeave(pmc: number)
    {
        this._selectionService.setHoverPMC(-1);
    }

    onCheckboxClick(event: any): void
    {
        if(this.onROISelect)
        {
            this.onROISelect.emit();
        }
    }

    get levelIterator(): boolean[]
    {
        return new Array(5).fill(0).map((_, i) => i < this.level);
    }

    get level(): number
    {
        return this.regionLayer.roi.mistROIItem?.ID_Depth || null;
    }

    get dateAdded(): string
    {
        return this.regionLayer.roi?.dateAdded;
    }
}
