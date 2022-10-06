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

import { Component, ElementRef, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DataSetService } from "src/app/services/data-set.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { IconButtonState } from "../atoms/buttons/icon-button/icon-button.component";
import { PickerDialogComponent, PickerDialogData } from "../atoms/picker-dialog/picker-dialog.component";
import { AnnotationToolOption, FullScreenAnnotationItem } from "./annotation-display/annotation-display.component";


export class AnnotationTool
{
    constructor(public tool: AnnotationToolOption, public colour: string, public fontSize: number)
    {}
}

export class AnnotationEditorData
{
    constructor(public tool: AnnotationTool)
    {}
}

@Component({
    selector: "app-annotation-editor",
    templateUrl: "./annotation-editor.component.html",
    styleUrls: ["./annotation-editor.component.scss"]
})
export class AnnotationEditorComponent implements OnInit
{
    private _subs = new Subscription();
    private _fontSize: number = 12;

    selectedColour: string = "white";
    selectedTool: AnnotationToolOption = null;

    activeAnnotation: FullScreenAnnotationItem = null;

    @Output() onActiveTool = new EventEmitter();
    @Output() onBulkAction = new EventEmitter();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: AnnotationEditorData,
        public dialogRef: MatDialogRef<AnnotationEditorComponent>,
        public dialog: MatDialog,
    )
    {
        if(data && data.tool)
        {
            this.selectedTool = data.tool.tool;
            this.selectedColour = data.tool.colour;
            this.fontSize = data.tool.fontSize;
        }
    }

    ngOnInit(): void
    {
    }

    ngAfterViewInit()
    {
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get fontSize(): number
    {
        return this._fontSize;
    }

    set fontSize(size: number)
    {
        if(!isNaN(size) && size > 0)
        {
            this._fontSize = size;

            this.onActiveTool.emit(this.activeAnnotationTool);
        }
    }

    get arrowToolState(): IconButtonState
    {
        return this.selectedTool === "arrow" ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    get textToolState(): IconButtonState
    {
        return this.selectedTool === "text" ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    get freeformToolState(): IconButtonState
    {
        return this.selectedTool === "freeform" ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    get activeAnnotationTool(): AnnotationTool
    {
        return new AnnotationTool(this.selectedTool, this.selectedColour, this.fontSize);
    }

    onToolSelect(tool: AnnotationToolOption)
    {
        // Double click clears tool selection
        this.selectedTool = this.selectedTool === tool ? null : tool;

        this.onActiveTool.emit(this.activeAnnotationTool);
    }

    onSelectColourPicker(event)
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        let standardColours = PickerDialogData.getStandardColourChoices([]);
        dialogConfig.data = new PickerDialogData(false, true, false, false, standardColours, [this.selectedColour], null, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (colourRGBs: string[])=>
            {
                this.selectedColour = colourRGBs.length > 0 ? colourRGBs[0] : "white";

                this.onActiveTool.emit(this.activeAnnotationTool);
            }
        );
    }

    onSave()
    {
        this.dialogRef.close();
    }

    onClear()
    {
        this.onBulkAction.emit("clear");
    }

    onClose()
    {
        this.dialogRef.close(null);
    }
}
