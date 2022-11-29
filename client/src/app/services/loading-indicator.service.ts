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

import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { FullScreenDisplayComponent, FullScreenDisplayData } from "src/app/UI/atoms/full-screen-display/full-screen-display.component";



// This service shows a loading indicator dialog if needed, and stacks lists of things that are loading
// while they are there. When all have finished loading it hides the dialog

@Injectable({
    providedIn: "root"
})
export class LoadingIndicatorService
{
    private _items: Map<number, string> = new Map<number, string>();
    private _nextID: number = 1;

    private _showingDialogRef: MatDialogRef<FullScreenDisplayComponent> = null;

    private _message: FullScreenDisplayData = new FullScreenDisplayData("", false, FullScreenDisplayData.iconProgress);

    constructor(
        public dialog: MatDialog
    )
    {
    }

    add(label: string): number
    {
        let id = this._nextID;

        // Don't forget to increment!
        this._nextID++;

        // Save the item for display
        this._items.set(id, label);

        this.updateDialog();
        return id;
    }

    update(id: number, label: string): void
    {
        let item = this._items.get(id);
        if(!item)
        {
            console.error("LoadingIndicatorService failed to update: "+id+" with text: "+label);
            return;
        }

        this._items.set(id, label);
        this.updateDialog();
    }

    remove(id: number): void
    {
        let item = this._items.get(id);
        if(!item)
        {
            console.error("LoadingIndicatorService failed to delete: "+id);
            return;
        }

        this._items.delete(id);
        this.updateDialog();
    }

    clear(): void
    {
        this._items.clear();
        this.updateDialog();
    }

    private updateDialog(): void
    {
        let labels = Array.from(this._items.values());

        // If we have the dialog already showing...
        if(this._showingDialogRef)
        {
            // If we don't need it, kill it
            if(this._items.size <= 0)
            {
                this._showingDialogRef.close();
                this._showingDialogRef = null;
            }
            else
            {
                // Update it
                this.setMessage(labels);
            }
        }
        else
        {
            if(this._items.size > 0)
            {
                // Show it
                this.setMessage(labels);
                this._showingDialogRef = this.showLoading();
            }
            // else not showing and don't need it showing: nothing to do
        }
    }

    private setMessage(labels: string[]): void
    {
        this._message.message = "Please wait:\n\n"+labels.join("\n");
    }

    private showLoading(): MatDialogRef<FullScreenDisplayComponent>
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = true;
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        dialogConfig.data = this._message;

        return this.dialog.open(FullScreenDisplayComponent, dialogConfig);
    }

}
