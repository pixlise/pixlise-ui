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



export class AddToCollectionDialogParams
{
    constructor(public collections: string[])
    {
    }
}

export class AddToCollectionDialogResult
{
    constructor(public collectionID: string, public isNew: boolean)
    {
    }
}

const newCollectionLabel = "Create New Collection";


@Component({
    selector: "app-add-to-collection-dialog",
    templateUrl: "./add-to-collection-dialog.component.html",
    styleUrls: ["./add-to-collection-dialog.component.scss"]
})
export class AddToCollectionDialogComponent implements OnInit 
{
    collectionSelected: string = "";
    collectionNameEntered: string = "";

    collections: string[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: AddToCollectionDialogParams,
        public dialogRef: MatDialogRef<AddToCollectionDialogComponent>,
    )
    {
    }

    ngOnInit(): void
    {
        this.collections = [newCollectionLabel, ...this.data.collections];
    }

    onOK()
    {
        let name: string = "";
        let isNew: boolean = false;

        if(this.collectionSelected == newCollectionLabel)
        {
            // Make sure a valid name was typed
            if(this.collectionNameEntered.length <= 0)
            {
                alert("Please enter a name for the new collection to create");
                return;
            }

            name = this.collectionNameEntered;
            isNew = true;
        }
        else
        {
            // Ensure it's valid
            if(this.collections.indexOf(this.collectionSelected) < 0)
            {
                alert("Please select a collection to add to, or create a new one");
                return;
            }

            name = this.collectionSelected;
        }

        this.dialogRef.close(new AddToCollectionDialogResult(name, isNew));
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }

    get isNew(): boolean
    {
        return this.collectionSelected == newCollectionLabel;
    }
}
