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

import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { Subscription } from "rxjs";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { RGBUImage } from "src/app/models/RGBUImage"; // for channel names, probably shouldn't be linking this though :(
import { AuthenticationService } from "src/app/services/authentication.service";
import { RGBMixConfigService, RGBMix } from "src/app/services/rgbmix-config.service";
import { httpErrorToString } from "src/app/utils/utils";
import { LayerVisibilityChange } from "./layer-settings.component";


export class RGBLayerInfo
{
    constructor(
        public layer: LocationDataLayerProperties,
        public redExpressionName: string, public greenExpressionName: string, public blueExpressionName: string
    )
    {
    }
}

@Component({
    selector: "rgbmix-layer-settings",
    templateUrl: "./rgbmix-layer-settings.component.html",
    styleUrls: ["./layer-settings.component.scss"]
})
export class RGBMixLayerSettingsComponent implements OnInit
{
    private _subs = new Subscription();

    @Input() layerInfo: RGBLayerInfo;
    @Input() showShare: boolean = true;
    @Input() showDelete: boolean = true;
    @Input() showEdit: boolean = true;
    @Input() activeIcon: string;
    @Input() inactiveIcon: string;

    @Output() visibilityChange = new EventEmitter();

    editMode: boolean = false;

    // For edit mode, we have a name string
    nameForSave: string = "";

    // tooltip, generated on init
    tooltip: string = "";

    constructor(
        private _rgbMixService: RGBMixConfigService,
        private _authService: AuthenticationService,
    )
    {
    }

    ngOnInit(): void
    {
        this.makeTooltip();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get label(): string
    {
        if(this.layerInfo.layer.source)
        {
            return this.layerInfo.layer.source.name;
        }
        return "";
    }

    private makeTooltip(): void
    {
        let expressionNames = [
            this.layerInfo.redExpressionName,
            this.layerInfo.greenExpressionName,
            this.layerInfo.blueExpressionName
        ];

        let tooltip = "";
        for(let c = 0; c < expressionNames.length; c++)
        {
            if(c > 0)
            {
                tooltip += "\n";
            }

            tooltip += RGBUImage.channels[c]+": ";
            if(expressionNames[c])
            {
                tooltip += expressionNames[c];
            }
            else
            {
                tooltip += "?";
            }
        }

        this.tooltip = tooltip;
    }

    get sharedBy(): string
    {
        if(!this.layerInfo.layer.source.shared)
        {
            return null;
        }
        return this.layerInfo.layer.source.creator.name;
    }

    get isSharedByOtherUser(): boolean
    {
        if(!this.layerInfo.layer.source.shared)
        {
            return false;
        }
        return this.sharedBy != null && this.layerInfo.layer.source.creator.user_id != this._authService.getUserID();
    }

    get incompatibleWithQuant(): boolean
    {
        if(!this.layerInfo.layer.source)
        {
            return false;
        }
         
        return !this.layerInfo.layer.source.isCompatibleWithQuantification;
    }

    get rgbMix(): RGBMix
    {
        if(this.layerInfo.layer.source)
        {
            // Cast it
            let rgbMix = this.layerInfo.layer.source as RGBMix;
            return rgbMix;
        }

        return null;
    }

    onShare(): void
    {
        if(confirm("Are you sure you want to share this RGB mix?"))
        {
            this._rgbMixService.shareRGBMix(this.layerInfo.layer.id).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to share RGB mix"));
                }
            );
        }
    }

    onDelete(): void
    {
        if(confirm("Are you sure you want to delete this RGB mix?"))
        {
            this._rgbMixService.deleteRGBMix(this.layerInfo.layer.id).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to delete RGB mix"));
                }
            );
        }
    }

    onEdit(): void
    {
        this.nameForSave = this.layerInfo.layer.source.name;
        this.editMode = true;
    }

    onSaveRGBMixEvent(event): void
    {
        if(event)
        {
            if(this.nameForSave.length <= 0)
            {
                alert("Name cannot be empty");
                return;
            }

            // Save it
            event.name = this.nameForSave;
            this._rgbMixService.editRGBMix(this.layerInfo.layer.id, event).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to edit RGB mix: "+this.nameForSave));
                }
            );
        }

        // no longer in edit mode
        this.editMode = false;
    }

    onVisibility(val: boolean): void
    {
        this.visibilityChange.emit(new LayerVisibilityChange(this.layerInfo.layer.id, val, this.layerInfo.layer.opacity, []));
    }

    get visible(): boolean
    {
        if(!this.layerInfo.layer)
        {
            return false;
        }
        return this.layerInfo.layer.visible;
    }
}