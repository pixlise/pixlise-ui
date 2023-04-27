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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription } from "rxjs";
import { LayerViewItem } from "src/app/models/ExpressionList";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpressionId } from "src/app/models/Expression";
import { ChannelConfigWire, RGBMixInput } from "src/app/services/rgbmix-config.service";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";


export class RGBChannelsEvent
{
    constructor(
        public red: string,
        public green: string,
        public blue: string,
        public visible: boolean
    )
    {
    }
}

@Component({
    selector: "rgb-mix-selector",
    templateUrl: "./rgbmix-selector.component.html",
    styleUrls: ["./rgbmix-selector.component.scss"]
})
export class RGBMixSelectorComponent implements OnInit
{
    private _subs = new Subscription();

    @Output() saveEvent = new EventEmitter();
    @Output() channelsChanged = new EventEmitter();

    @Input() showVisibilityToggle: boolean = false;

    @Input() redChannelExpressionID: string = "";
    @Input() greenChannelExpressionID: string = "";
    @Input() blueChannelExpressionID: string = "";

    @Input() visible: boolean = true;

    redChannelChoice: string = "";
    greenChannelChoice: string = "";
    blueChannelChoice: string = "";

    redChannelTooltip: string = "";
    greenChannelTooltip: string = "";
    blueChannelTooltip: string = "";

    constructor(
        private _exprService: DataExpressionService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this.updateDisplayedChoices();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private updateDisplayedChoices(): void
    {
        let names = this._exprService.getExpressionShortDisplayName(this.redChannelExpressionID, 10);
        this.redChannelChoice = names.shortName;
        this.redChannelTooltip = "Red: "+names.name;
        if(!this.redChannelChoice)
        {
            this.redChannelChoice = "Empty";
            this.redChannelTooltip = "";
        }

        names = this._exprService.getExpressionShortDisplayName(this.greenChannelExpressionID, 10);
        this.greenChannelChoice = names.shortName;
        this.greenChannelTooltip = "Green: "+names.name;
        if(!this.greenChannelChoice)
        {
            this.greenChannelChoice = "Empty";
            this.greenChannelTooltip = "";
        }

        names = this._exprService.getExpressionShortDisplayName(this.blueChannelExpressionID, 10);
        this.blueChannelChoice = names.shortName;
        this.blueChannelTooltip = "Blue: "+names.name;
        if(!this.blueChannelChoice)
        {
            this.blueChannelChoice = "Empty";
            this.blueChannelTooltip = "";
        }
    }

    onChangeRedChannel(event): void
    {
        this.showExpressionPicker("Red", this.redChannelExpressionID).subscribe(
            (displayIds: string[])=>
            {
                if(displayIds)
                {
                    let sel = displayIds.length > 0 ? displayIds[0] : "";
                    this.redChannelExpressionID = sel;

                    this.updateDisplayedChoices();
                    this.notifyListeners(true);
                }
            }
        );
    }

    onChangeGreenChannel(event): void
    {
        this.showExpressionPicker("Green", this.greenChannelExpressionID).subscribe(
            (displayIds: string[])=>
            {
                if(displayIds)
                {
                    let sel = displayIds.length > 0 ? displayIds[0] : "";
                    this.greenChannelExpressionID = sel;

                    this.updateDisplayedChoices();
                    this.notifyListeners(true);
                }
            }
        );
    }

    onChangeBlueChannel(event): void
    {
        this.showExpressionPicker("Blue", this.blueChannelExpressionID).subscribe(
            (displayIds: string[])=>
            {
                if(displayIds)
                {
                    let sel = displayIds.length > 0 ? displayIds[0] : "";
                    this.blueChannelExpressionID = sel;

                    this.updateDisplayedChoices();
                    this.notifyListeners(true);
                }
            }
        );
    }

    private showExpressionPicker(channel: string, selectedId: string): Observable<any>
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ExpressionPickerData(channel+" Expression", selectedId.length > 0 ? [selectedId] : [], true, false, false, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        return dialogRef.afterClosed();
    }

    private notifyListeners(channelPicked: boolean): void
    {
        // If we came here because all 3 channels were just picked, set to visible
        if(this.redChannelExpressionID.length > 0 && this.greenChannelExpressionID.length > 0 && this.blueChannelExpressionID.length > 0)
        {
            if(channelPicked) 
            {
                this.visible = true;
            }
        }
        else 
        {
            this.visible = false;
        }
        this.channelsChanged.emit(new RGBChannelsEvent(this.redChannelExpressionID, this.greenChannelExpressionID, this.blueChannelExpressionID, this.visible));
    }

    onSave(): void
    {
        this.saveEvent.emit(
            new RGBMixInput(
                "",
                new ChannelConfigWire(this.redChannelExpressionID, 0, 0),
                new ChannelConfigWire(this.greenChannelExpressionID, 0, 0),
                new ChannelConfigWire(this.blueChannelExpressionID, 0, 0)
            )
        );
    }

    onCancel(): void
    {
        // Clear each channel value too
        this.redChannelExpressionID = "";
        this.greenChannelExpressionID = "";
        this.blueChannelExpressionID = "";

        this.updateDisplayedChoices();

        // Make it clear we're not saving!
        this.saveEvent.emit(null);
    }

    get showVisible(): boolean
    {
        return this.showVisibilityToggle && this.redChannelExpressionID.length > 0 && this.greenChannelExpressionID.length > 0 && this.blueChannelExpressionID.length > 0;
    }

    onVisibility(event)
    {
        this.visible = !this.visible;
        this.notifyListeners(false);
    }
}