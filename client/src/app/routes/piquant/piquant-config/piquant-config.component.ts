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
import { DetectorConfigList, PiquantConfig } from "src/app/models/BasicTypes";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { ElementTileState } from "src/app/UI/periodic-table/element-tile/element-tile.component";



class ConfigItem
{
    constructor(
        public label: string,
        public value: string
    )
    {
    }
}

@Component({
    selector: "app-piquant-config",
    templateUrl: "./piquant-config.component.html",
    styleUrls: ["./piquant-config.component.scss"]
})
export class PiquantConfigComponent implements OnInit
{
    public configList: string[] = [];
    public versionList: string[] = [];

    protected _selectedConfigName: string = "";

    public selectedConfigPixliseItems: ConfigItem[] = null;
    public selectedConfigPixliseWindowElementZ: number = 0;
    public selectedConfigPixliseTubeElementZ: number = 0;
    public selectedConfigPiquantItems: ConfigItem[] = null;
    public loadingConfig: boolean = false;
    public itemMsg: string = "";
    public elementState: ElementTileState = ElementTileState.NONE;

    constructor(
        private envService: EnvConfigurationService
    )
    {
    }

    ngOnInit()
    {
        this.configList = null;
        this.envService.listConfigs().subscribe(
            (configs: DetectorConfigList)=>
            {
                this.configList = configs.configNames;
            },
            (err)=>
            {
                this.configList = [];
            }
        );

        this.clearChoice();
    }

    onClickConfig(configName: string)
    {
        this._selectedConfigName = configName;
        this.clearChoice();

        // Re-populate the version list
        this.updateVersions();
    }

    protected updateVersions(): void
    {
        this.versionList = null;

        this.envService.getPiquantConfigVersions(this._selectedConfigName).subscribe(
            (versions: string[])=>
            {
                this.versionList = versions;
            },
            (err)=>
            {
            }
        );
    }

    protected clearChoice(): void
    {
        this.loadingConfig = false;
        this.selectedConfigPixliseItems = null;
        this.selectedConfigPixliseWindowElementZ = 0;
        this.selectedConfigPixliseTubeElementZ = 0;
        this.selectedConfigPiquantItems = null;
        this.itemMsg = "Select a configuration name and version to view";
    }

    onClickConfigVersion(version: string)
    {
        this.loadingConfig = true;
        this.envService.getPiquantConfig(this._selectedConfigName, version).subscribe(
            (resp: PiquantConfig)=>
            {
                this.itemMsg = null;
                this.loadingConfig = false;

                // Set the values we're showing
                let params = resp.pixliseConfig.defaultParams;
                if(params.length <= 0)
                {
                    params = "(Empty)";
                }
                this.selectedConfigPixliseItems = [
                    new ConfigItem("Selectable Atomic Number Range", resp.pixliseConfig.minElement+"-"+resp.pixliseConfig.maxElement),
                    new ConfigItem("XRF Lines Grayed", "Below "+resp.pixliseConfig.xrfeVLowerBound+"eV, Above "+resp.pixliseConfig.xrfeVUpperBound),
                    new ConfigItem("PIQUANT Default Parameters", params),
                ];

                this.selectedConfigPixliseWindowElementZ = resp.pixliseConfig.windowElement;
                this.selectedConfigPixliseTubeElementZ = resp.pixliseConfig.tubeElement;

                this.selectedConfigPiquantItems = [
                    new ConfigItem("Description", resp.quantConfig.description),
                    new ConfigItem("Configuration File", resp.quantConfig.configFile),
                    new ConfigItem("Calibration File", resp.quantConfig.calibrationFile),
                    new ConfigItem("Optic Efficiency File", resp.quantConfig.opticEfficiencyFile),
                    new ConfigItem("Standards File", resp.quantConfig.standardsFile),
                ];
            },
            (err)=>
            {
                this.clearChoice();
                this.itemMsg = err.message;
            }
        );
    }
}
