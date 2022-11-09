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
import { NotificationService } from "src/app/services/notification.service";
import { SavedViewStateSummary, ViewStateService } from "src/app/services/view-state.service";
import { IconButtonState } from "../atoms/buttons/icon-button/icon-button.component";
import { PickerDialogComponent, PickerDialogData } from "../atoms/picker-dialog/picker-dialog.component";
import { UserPromptDialogComponent, UserPromptDialogDropdownItem, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "../atoms/user-prompt-dialog/user-prompt-dialog.component";
import { AnnotationToolOption, FullScreenAnnotationItem } from "./annotation-display/annotation-display.component";


export class AnnotationTool
{
    constructor(public tool: AnnotationToolOption, public colour: string, public fontSize: number)
    {}
}

export class AnnotationEditorData
{
    constructor(public datasetID: string)
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

    private _isNewWorkspace: boolean = false;
    private _userViewStates: SavedViewStateSummary[] = [];

    selectedColour: string = "white";
    selectedTool: AnnotationToolOption = null;

    activeAnnotation: FullScreenAnnotationItem = null;

    @Output() onActiveTool = new EventEmitter();
    @Output() onBulkAction = new EventEmitter();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: AnnotationEditorData,
        public dialogRef: MatDialogRef<AnnotationEditorComponent>,
        public saveWorkspaceDialogRef: MatDialogRef<UserPromptDialogComponent>,
        public dialog: MatDialog,
        private _viewStateService: ViewStateService,
        private _notificationService: NotificationService
    )
    {}

    ngOnInit(): void
    {
        this._subs.add(this._viewStateService.savedViewStates$.subscribe(
            (items: SavedViewStateSummary[])=>
            {
                // We filter to only show not shared here
                this._userViewStates = items.filter(item => !item.shared);
            },
            (err)=>
            {
                console.error(`Error fetching user workspaces ${err}`);
            }
        ));
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
        this.onBulkAction.emit("save-workspace");
    }

    createNewWorkspace(name: string)
    {
        this._viewStateService.saveViewState(this.data.datasetID, name).subscribe(
            ()=>
            {
                // We're done, alert here
                this._notificationService.addNotification(`Workspace saved: ${name}`);
            },
            (err)=>
            {
                alert(`Failed to save workspace: ${name}`);
                console.error(`Failed to save workspace: ${name}`, err);
            }
        );
    }

    saveWorkspace(name: string)
    {
        this._viewStateService.saveViewState(this.data.datasetID, name, true).subscribe(
            ()=>
            {
                // We're done, alert here
                this._notificationService.addNotification(`Workspace updated: ${name}`);
            },
            (err)=>
            {
                alert(`Failed to update workspace: ${name}`);
                console.error(`Failed to update workspace: ${name}`, err);
            }
        );
    }

    openSaveWorkspaceDialog(savedAnnotations: FullScreenAnnotationItem[])
    {
        let selectWorkspaceLabel = "Select Workspace";
        let textWorkspaceLabel = "Name Your Workspace";
        let workspaceNames = this._userViewStates.map((viewState) => viewState.name);

        const dialogConfig = new MatDialogConfig();

        let params = new UserPromptDialogParams(
            "Save Workspace",
            "Save",
            "Cancel",
            [
                new UserPromptDialogDropdownItem(
                    selectWorkspaceLabel,
                    ()=>{ return true;},
                    workspaceNames,
                    workspaceNames
                )
            ],
            !this._isNewWorkspace,
            "Create New Workspace",
            () =>
            {
                this._isNewWorkspace = true;
                this.saveWorkspaceDialogRef.componentInstance.data.middleButton = false;
                this.saveWorkspaceDialogRef.componentInstance.data.items = [
                    new UserPromptDialogStringItem(
                        textWorkspaceLabel,
                        (val: string)=>{return val.length > 0;}
                    )
                ];
                this.saveWorkspaceDialogRef.componentInstance.refreshItemState();
            }
        );

        dialogConfig.data = params;

        this.saveWorkspaceDialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

        this.saveWorkspaceDialogRef.afterClosed().subscribe(
            (result: UserPromptDialogResult)=>
            {
                // If user didnt cancel and selected create new workspace, create one and close
                if(result && this._isNewWorkspace)
                {
                    this.createNewWorkspace(result.enteredValues.get(textWorkspaceLabel));
                }

                // If user canceled from creating a new workspace, reset back to workspace selection
                else if(!result && this._isNewWorkspace)
                {
                    this._isNewWorkspace = false;
                    this.openSaveWorkspaceDialog(savedAnnotations);
                }

                // If user selected a workspace, save it
                else if(result && !this._isNewWorkspace)
                {
                    this.saveWorkspace(result.enteredValues.get(selectWorkspaceLabel));
                }
            }
        );
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
