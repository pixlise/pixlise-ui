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
import { DataSetService } from "src/app/services/data-set.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { NotificationService } from "src/app/services/notification.service";
import { ViewState, ViewStateCollectionItem, ViewStateReferencedIDs, ViewStateService, SavedViewStateSummary } from "src/app/services/view-state.service";
import { AddToCollectionDialogComponent, AddToCollectionDialogParams, AddToCollectionDialogResult } from "src/app/UI/side-panel/tabs/workspaces/add-to-collection-dialog/add-to-collection-dialog.component";
import { httpErrorToString } from "src/app/utils/utils";


@Component({
    selector: "workspaces-view",
    templateUrl: "./workspaces.component.html",
    styleUrls: ["./workspaces.component.scss", "../../side-panel.component.scss"]
})
export class WorkspacesComponent implements OnInit
{
    private _subs = new Subscription();

    private _userViewStates: SavedViewStateSummary[] = [];
    private _sharedViewStates: SavedViewStateSummary[] = [];

    private _viewStatesShown: SavedViewStateSummary[] = [];

    private _selectedViewStateIDs: string[] = [];

    public showShared: boolean = false;
    private sharedPrefix = "shared-";

    constructor(
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _notificationService: NotificationService,
        public dialog: MatDialog,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
    }

    ngOnInit(): void
    {
        // Get set up to receive saved view state list updates
        this._subs.add(this._viewStateService.savedViewStates$.subscribe(
            (items: SavedViewStateSummary[])=>
            {
                // We filter to only show shared or not shared here
                this._userViewStates = [];
                this._sharedViewStates = [];

                for(let item of items)
                {
                    if(item.shared)
                    {
                        this._sharedViewStates.push(item);
                    }
                    else
                    {
                        this._userViewStates.push(item);
                    }
                }

                this.updateDisplayedList();
            },
            (err)=>
            {
            }
        ));
        /*
        // Also if we can, get the current dataset ID & force a refresh in case someone just opened the panel after saving
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                // We now have the loaded dataset ID, refresh the list of view states for this
                
            }
        ));
*/      
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get viewStatesShown(): SavedViewStateSummary[]
    {
        return this._viewStatesShown;
    }

    onClickWorkspace(id: string, event): void
    {
        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        // Show a waiting thingy
        let loadID = this._loadingSvc.add(id);

        this._viewStateService.loadViewState(id).subscribe(
            (state: ViewState)=>
            {
                // Apply this view state!
                // This will notify all widgets through ViewStateService.viewState$
                this._viewStateService.applyViewState(state, this._datasetService.datasetLoaded.isRGBUDataset(), false, true);
                this._loadingSvc.remove(loadID);
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                alert("Failed to load workspace: "+id);
            }
        );
    }

    onToggleWorkspaceCheckbox(id: string, event): void
    {
        // Don't want it to register as a click on the row (which is used to load and display a view state!)
        event.stopPropagation();

        // Add this to the selection if it's not there already
        let idx = this._selectedViewStateIDs.indexOf(id);
        if(idx >= 0)
        {
            // Remove
            this._selectedViewStateIDs.splice(idx, 1);
        }
        else
        {
            // Add
            this._selectedViewStateIDs.push(id);
        }
    }

    isSelected(id: string): boolean
    {
        let idx = this._selectedViewStateIDs.indexOf(id);
        return idx >= 0;
    }

    get hasSelectedWorkspaces(): boolean
    {
        return this._selectedViewStateIDs.length > 0;
    }

    onShareWorkspace(id: string, event): void
    {
        event.stopPropagation();

        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        // First check if this view state references anything that is not shared. Query API for this because it will decide
        // at the end when sharing if it accepts this...
        this._viewStateService.getReferencedIDs(id).subscribe(
            (ids: ViewStateReferencedIDs)=>
            {
                let autoShareFlag = false;

                let confirmMsg = "Are you sure you want to share workspace: \""+id+"\"?";
                if(ids.nonSharedCount > 0)
                {
                    let nonSharedROIs = [];
                    let nonSharedExpressions = [];
                    let nonSharedRGBMixes = [];
                    for(let item of ids.ROIs)
                    {
                        if(!item.id.startsWith(this.sharedPrefix))
                        {
                            nonSharedROIs.push(item.name ? item.name : item.id);
                        }
                    }
                    for(let item of ids.expressions)
                    {
                        if(!item.id.startsWith(this.sharedPrefix))
                        {
                            nonSharedExpressions.push(item.name ? item.name : item.id);
                        }
                    }
                    for(let item of ids.rgbMixes)
                    {
                        if(!item.id.startsWith(this.sharedPrefix))
                        {
                            nonSharedRGBMixes.push(item.name ? item.name : item.id);
                        }
                    }

                    if(nonSharedROIs.length > 0 || nonSharedExpressions.length > 0 || ids.quant.id.startsWith(this.sharedPrefix))
                    {
                        // Ask user to confirm they are happy to share these, if any
                        confirmMsg += "\n\nNOTE: This will also share the following items that the workspace references:\n\n";

                        if(nonSharedROIs.length > 0)
                        {
                            confirmMsg += "REGIONS OF INTEREST:\n";
                            confirmMsg += nonSharedROIs.join("\n");
                        }
                        if(nonSharedExpressions.length > 0)
                        {
                            confirmMsg += "\n\nEXPRESSIONS:\n";
                            confirmMsg += nonSharedExpressions.join("\n");
                        }
                        if(nonSharedRGBMixes.length > 0)
                        {
                            confirmMsg += "\n\nRGB MIXES:\n";
                            confirmMsg += nonSharedRGBMixes.join("\n");
                        }

                        if(ids.quant.id.startsWith(this.sharedPrefix))
                        {
                            confirmMsg += "\n\nQUANTIFICATION:\n"+(ids.quant.name ? ids.quant.name: ids.quant.id)+"\n";
                        }

                        // User just said share whatever...
                        autoShareFlag = true;
                    }
                }

                if(!confirm(confirmMsg))
                {
                    return;
                }

                this._viewStateService.shareViewState(this._datasetService.datasetIDLoaded, id, autoShareFlag).subscribe(
                    ()=>
                    {
                    },
                    (err)=>
                    {
                        alert("Failed to share workspace: "+id);
                    }
                );
            },
            (err)=>
            {
                alert(httpErrorToString("Failed to determine if any referenced IDs need to be shared", err));
            }
        );
    }

    onDeleteWorkspace(id: string, event): void
    {
        event.stopPropagation();

        if(!confirm("Are you sure you want to delete workspace: \""+id+"\"?"))
        {
            return;
        }

        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        this._viewStateService.deleteViewState(this._datasetService.datasetIDLoaded, id).subscribe(
            ()=>
            {
                this._viewStateService.refreshSavedStates();
            },
            (err)=>
            {
                alert("Failed to delete workspace: "+id);
                this._viewStateService.refreshSavedStates();
            }
        );
    }

    isLoadedViewState(id: string): boolean
    {
        return id == this._viewStateService.viewStateLoaded;
    }

    onAddToCollection(): void
    {
        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        // Ask user what they want to do... add to existing vs create a collection

        this._viewStateService.viewStateCollections$.pipe(first()).subscribe(
            (collections: ViewStateCollectionItem[])=>
            {
                let collectionNames: string[] = [];
                for(let collection of collections)
                {
                    collectionNames.push(collection.name);
                }

                const dialogConfig = new MatDialogConfig();
                dialogConfig.data = new AddToCollectionDialogParams(collectionNames);
                //dialogConfig.backdropClass = 'empty-overlay-backdrop';

                const dialogRef = this.dialog.open(AddToCollectionDialogComponent, dialogConfig);

                dialogRef.afterClosed().subscribe(
                    (result: AddToCollectionDialogResult)=>
                    {
                        // Might've cancelled!
                        if(result)
                        {
                            if(result.isNew)
                            {
                                this.saveNewCollection(this._datasetService.datasetIDLoaded, Array.from(this._selectedViewStateIDs), result.collectionID);
                            }
                            else
                            {
                                this.addToCollection(this._datasetService.datasetIDLoaded, Array.from(this._selectedViewStateIDs), result.collectionID);
                            }
                        }
                    }
                );
            },
            (err)=>
            {
                alert("Failed to query collections");
            }
        );
    }

    private saveNewCollection(datasetID: string, viewStateIDs: string[], collectionID: string): void
    {
        this._viewStateService.saveViewStateCollection(datasetID, collectionID, "", viewStateIDs, true).subscribe(
            ()=>
            {
                this._notificationService.addNotification("Created new collection: \""+collectionID+"\"");
            },
            (err)=>
            {
                alert("Failed to create collection: "+collectionID);
            }
        );
    }

    private addToCollection(datasetID: string, viewStateIDs: string[], collectionID: string): void
    {
        // Get the existing view states from collection
        this._viewStateService.addViewStateToCollection(datasetID, viewStateIDs, collectionID).subscribe(
            ()=>
            {
                //alert("Collection updated: "+name);
            },
            (err)=>
            {
                alert("Failed to create collection: "+collectionID);
            }
        );
    }

    /*
    onDeleteSelectedWorkspaces(): void
    {
        if(!confirm('Are you sure you want to delete the selected workspaces?'))
        {
            return;
        }

        if(!this._datasetService.datasetIDLoaded)
        {
            alert('Cannot get dataset ID');
            return;
        }

        // Get the selection
        let ids = Array.from(this._selectedViewStateIDs);

         // Clear it
        this._selectedViewStateIDs = [];

        // Delete each one
        let deleteResults = [];

        for(let id of ids)
        {
            deleteResults.push(this._viewStateService.deleteViewState(this._datasetService.datasetIDLoaded, id));
        }

        // Wait for all deletes to complete
        let all$ = combineLatest(deleteResults);
        all$.subscribe(
            (data)=>
            {
                this._viewStateService.refreshSavedStates();
            },
            (err)=>
            {
                alert('Failed to delete one or more selected view states');
                this._viewStateService.refreshSavedStates();
            }
        );
    }
*/
/*
    onRenameWorkspace(id: string, event): void
    {
        event.stopPropagation();

        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        let newId = prompt("Enter new name for workspace");

        if(!newId)
        {
            // user cancelled
            return;
        }

        this._viewStateService.renameViewState(this._datasetService.datasetIDLoaded, id, newId).subscribe(
            ()=>
            {
            },
            (err)=>
            {
            }
        );
    }
*/
    onToggleShowShared(): void
    {
        this.showShared = !this.showShared;
        this.updateDisplayedList();
    }

    private updateDisplayedList()
    {
        if(this.showShared)
        {
            this._viewStatesShown = Array.from(this._sharedViewStates);
        }
        else
        {
            this._viewStatesShown = Array.from(this._userViewStates);
        }
    }
}
