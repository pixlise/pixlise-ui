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
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DataSetService } from "src/app/services/data-set.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { ViewState, ViewStateCollectionItem, ViewStateCollectionWire, ViewStateService } from "src/app/services/view-state.service";
import { httpErrorToString } from "src/app/utils/utils";






class ViewStateCollection
{
    constructor(
        public id: string,
        public name: string,
        public modifiedUnixSec: number,
        public isOpen: boolean,
        public viewStateIDs: string[],
        public shared: boolean
    )
    {
    }
}

@Component({
    selector: "view-state-collections-view",
    templateUrl: "./view-state-collections.component.html",
    styleUrls: ["./view-state-collections.component.scss", "../../side-panel.component.scss"]
})
export class ViewStateCollectionsComponent implements OnInit
{
    private _subs = new Subscription();

    private _userCollections: ViewStateCollection[] = [];
    private _sharedCollections: ViewStateCollection[] = [];

    private _collectionsShown: ViewStateCollection[] = [];

    public activeCollectionId: string = "";

    public showShared: boolean = false;

    constructor(
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        public dialog: MatDialog,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._viewStateService.viewStateCollections$.subscribe(
            (collections: ViewStateCollectionItem[])=>
            {
                let userCollectionsView = [];
                let sharedCollectionsView = [];
                const sharedPrefix = "shared-";

                for(let item of collections)
                {
                    let shared = item.name.startsWith(sharedPrefix);

                    // If we already have data for this one, reuse it
                    let open = false;
                    let ids = null;

                    let collToSearch = shared ? this._sharedCollections : this._userCollections;

                    for(let existingItem of collToSearch)
                    {
                        if(item.name == existingItem.id)
                        {
                            open = existingItem.isOpen;
                            ids = existingItem.viewStateIDs;
                            break;
                        }
                    }

                    if(!shared)
                    {
                        userCollectionsView.push(new ViewStateCollection(item.name, item.name, item.modifiedUnixSec, open, ids, shared));
                    }
                    else
                    {
                        sharedCollectionsView.push(new ViewStateCollection(item.name, item.name.substring(sharedPrefix.length), item.modifiedUnixSec, open, ids, shared));
                    }
                }

                this._userCollections = userCollectionsView;
                this._sharedCollections = sharedCollectionsView;

                this.updateDisplayedList();
            },
            (err)=>
            {
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get collections(): ViewStateCollection[]
    {
        return this._collectionsShown;
    }
 
    onClickCollection(id: string): void
    {
        // User has clicked on this one, refresh it (and by setting it visible, we'll show what view states are in it)
        for(let col of this._collectionsShown)
        {
            if(col.id == id)
            {
                if(col.isOpen)
                { 
                    col.isOpen = false;
                }
                else
                {
                    col.isOpen = true;

                    this.refreshCollectionViewStates(col);
                }
            }
            else
            {
                col.isOpen = false;
            }
        }
    }

    private refreshCollectionViewStates(collection: ViewStateCollection): void
    {
        // Refresh its list!
        this._viewStateService.getCollection(collection.id).subscribe(
            (collectionResp: ViewStateCollectionWire)=>
            {
                collection.viewStateIDs = collectionResp.viewStateIDs;
            },
            (err)=>
            {
                console.error(err);
                alert(err);
                collection.isOpen = false;
            }
        );
    }

    onMoveViewState(collectionID: string, stateID: string, up: boolean, event): void
    {
        event.stopPropagation();

        let col = this.getCollection(collectionID);
        if(!col)
        {
            alert("Failed: collection not found");
            return;
        }

        let viewStates = Array.from(col.viewStateIDs);
        let idx = viewStates.indexOf(stateID);
        if(idx < 0)
        {
            alert("Workspace was not in collection");
            return;
        }

        // If it can't be moved, don't!
        if(
            up && idx == 0 ||
            !up && idx >= viewStates.length-1
        )
        {
            // Silently ignore
            return;
        }

        // Remove it
        viewStates.splice(idx, 1);

        // Now add it back at the requested position
        idx = up ? idx-1 : idx+1;
        viewStates.splice(idx, 0, stateID);

        this.saveCollection(collectionID, viewStates, false, col);
    }

    onDeleteCollectionViewState(collectionID: string, stateID: string, event): void
    {
        event.stopPropagation();

        if(!confirm("Are you sure you want to delete workspace \""+stateID+"\" from collection: \""+collectionID+"\"?"))
        {
            return;
        }

        let col = this.getCollection(collectionID);
        if(!col)
        {
            alert("Failed: collection not found");
            return;
        }

        let viewStates = Array.from(col.viewStateIDs);
        let idx = viewStates.indexOf(stateID);
        if(idx < 0)
        {
            alert("Workspace was not in collection");
            return;
        }

        // Remove it & save
        viewStates.splice(idx, 1);

        this.saveCollection(collectionID, viewStates, false, col);
        this.refreshCollectionViewStates(col);
    }

    onDeleteCollection(id: string, event): void
    {
        event.stopPropagation();

        if(!confirm("Are you sure you want to delete collection: \""+id+"\"?"))
        {
            return;
        }

        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        this._viewStateService.deleteViewStateCollection(this._datasetService.datasetIDLoaded, id).subscribe(
            ()=>
            {
                this._viewStateService.refreshCollections();
            },
            (err)=>
            {
                alert("Failed to delete collection: "+id);
                this._viewStateService.refreshCollections();
            }
        );
    }

    onShareCollection(id: string, event): void
    {
        event.stopPropagation();

        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        if(!confirm("Are you sure you want to share collection: \""+id+"\"?"))
        {
            return;
        }

        this._viewStateService.shareViewStateCollection(this._datasetService.datasetIDLoaded, id).subscribe(
            ()=>
            {
                this._viewStateService.refreshCollections();
            },
            (err)=>
            {
                alert("Failed to share collection: "+id);
            }
        );
    }
    /*
    onAddCurrentViewToCollection(collectionID: string): void
    {
        // If current view state is a named one that was loaded, we add it, otherwise notify that it needs to be...
        if(!this._viewStateService.viewStateLoaded)
        {
            alert('The current view state is not a saved, named view state. Save it, select it, then try again');
            return;
        }

        // Add this here
        let col = this.getCollection(collectionID);
        if(!col)
        {
            alert('Failed: collection not found');
            return;
        }

        // Add it to this one and save
        let viewStates = Array.from(col.viewStateIDs);
        viewStates.push(this._viewStateService.viewStateLoaded);

        this.saveCollection(collectionID, viewStates);
    }
*/
    protected getCollection(collectionID: string): ViewStateCollection
    {
        for(let col of this._collectionsShown)
        {
            if(col.id == collectionID)
            {
                return col;
            }
        }

        return null;
    }

    protected saveCollection(collectionID: string, viewStates: string[], refreshCollectionList: boolean, collectionToRefresh: ViewStateCollection): void
    {
        this._viewStateService.saveViewStateCollection(this._datasetService.datasetIDLoaded, collectionID, "", viewStates, refreshCollectionList).subscribe(
            ()=>
            {
                if(collectionToRefresh)
                {
                    this.refreshCollectionViewStates(collectionToRefresh);
                }
            },
            (err)=>
            {
                alert(httpErrorToString(err, "Failed to modify collection: "+collectionID));
            }
        );
    }

    onToggleShowShared(): void
    {
        this.showShared = !this.showShared;
        this.updateDisplayedList();
    }

    onPlay(collectionID: string, event): void
    {
        event.stopPropagation();

        let loadID = this._loadingSvc.add("Starting Presentation...");

        this._viewStateService.startPresentationOfViewStates(collectionID).subscribe(
            ()=>
            {
                this._loadingSvc.remove(loadID);
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                alert("Failed while preparing to presenting workspaces");
            }
        );
    }

    onClickWorkspace(id: string, event): void
    {
        if(!this._datasetService.datasetIDLoaded)
        {
            alert("Cannot get dataset ID");
            return;
        }

        // Show a waiting thingy
        let loadID = this._loadingSvc.add("Reconfiguring view to: \""+id+"\"...");

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

    isLoadedViewState(id: string): boolean
    {
        return id == this._viewStateService.viewStateLoaded;
    }

    private updateDisplayedList()
    {
        this._collectionsShown = this.showShared ? this._sharedCollections : this._userCollections;
    }
}
