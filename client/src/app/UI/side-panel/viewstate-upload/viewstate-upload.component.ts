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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import * as JSZip from "jszip";
import { Subscription } from "rxjs";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";

export class ViewStateUploadData
{
    constructor()
    {
    }
}


@Component({
    selector: "viewstate-upload",
    templateUrl: "./viewstate-upload.component.html",
    styleUrls: ["./viewstate-upload.component.scss"]
})
export class ViewStateUploadComponent implements OnInit 
{
    public jsonFile: File;
    public viewStateJSON: any = {};

    public currentViewState: any = {};

    private _subs = new Subscription();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ViewStateUploadData,
        public dialogRef: MatDialogRef<ViewStateUploadComponent>,
        public dialog: MatDialog,
        public viewStateService: ViewStateService
    )
    {
    }

    ngOnInit(): void 
    {
        this._subs.add(this.viewStateService.viewState$.subscribe(
            (viewState)=>
            {
                let viewStateWireObj = this.viewStateService.makeWireViewState(viewState);
                this.currentViewState = viewStateWireObj;
            }
        ));
    }

    onBrowse(file): void
    {
        this.jsonFile = file.target.files[0];
        let fileReader = new FileReader();
        fileReader.onload = (evt) => 
        {
            this.viewStateJSON = this.readInViewState(fileReader.result as string);
        };
        fileReader.readAsText(this.jsonFile);
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
    }

    readInViewState(rawJSON: string): ViewState
    {
        let viewState = JSON.parse(rawJSON);
        return this.viewStateService.readWireViewState(viewState);
    }

    get isValidViewStateFile(): boolean 
    {
        return this.viewStateJSON && Object.keys(this.viewStateJSON).length > 0;
    }

    onUpload(): void
    {
        if(this.isValidViewStateFile)
        {
            this.viewStateService.applyViewState(this.viewStateJSON, false, false, true);
            this.dialogRef.close();
        }
    }

    downloadViewState(): void
    {
        let currentDateSeconds = Math.floor(Date.now() / 1000);
        let fileName = `viewstate-${currentDateSeconds}`;

        let content = JSON.stringify(this.currentViewState);

        let zip = new JSZip();

        zip.file(`${fileName}.json`, content);
        zip.generateAsync({ type: "blob" }).then((content) =>
        {
            saveAs(content, `${fileName}.zip`);
        }).catch((err) =>
        {
            console.error(err);
        });
    }
}
