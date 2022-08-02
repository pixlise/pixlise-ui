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


export interface UserPromptDialogItem
{
    name: string;
    inputType: string;

    validator: (any)=>boolean;
    //initialValue: string;
}

export class UserPromptDialogStringItem implements UserPromptDialogItem
{
    constructor(
        public name: string,
        public validator: (any)=>boolean,
        public initialValue: string = ""
    )
    {
    }

    get inputType(): string
    {
        return "string";
    }
}

export class UserPromptDialogDropdownItem implements UserPromptDialogItem
{
    constructor(
        public name: string,
        public validator: (any)=>boolean,
        public itemNames: string[],
        public itemValues: string[],
        public initialValue: string = ""
    )
    {
    }

    get inputType(): string
    {
        return "dropdown";
    }
}

export class UserPromptDialogParams
{
    constructor(
        public title: string,
        public okButtonLabel: string,
        public cancelButtonLabel: string,
        public items: UserPromptDialogItem[]
    )
    {
    }
}

export class UserPromptDialogResult
{
    constructor(public enteredValues: Map<string, string>)
    {
    }
}
/*
To replace:
QuantificationUploadDialogComponent (harder, has drop zone)
AddToCollectionDialogComponent (has dropdown, optional name if specific item picked on dropdown)
DataCollectionDialogComponent (has formatted paragraphs)
*/

@Component({
    selector: "user-prompt-dialog",
    templateUrl: "./user-prompt-dialog.component.html",
    styleUrls: ["./user-prompt-dialog.component.scss"]
})
export class UserPromptDialogComponent implements OnInit
{
    names: string[] = [];
    inputTypes: string[] = [];
    values: string[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: UserPromptDialogParams,
        public dialogRef: MatDialogRef<UserPromptDialogComponent>,
    )
    {
    }

    ngOnInit(): void
    {
        // Read in the parameters
        for(let item of this.data.items)
        {
            this.names.push(item.name);
            this.inputTypes.push(item.inputType);
            this.values.push(item["initialValue"]);
        }
    }

    onOK(): void
    {
        // Validate them all
        let result = new Map<string, string>();

        for(let c = 0; c < this.names.length; c++)
        {
            let item = this.data.items[c];
            let val = this.values[c];

            if(!item.validator(val))
            {
                alert("Please enter a value for "+item.name);
                return;
            }

            result.set(item.name, val);
        }

        this.dialogRef.close(new UserPromptDialogResult(result));
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
    }
}
