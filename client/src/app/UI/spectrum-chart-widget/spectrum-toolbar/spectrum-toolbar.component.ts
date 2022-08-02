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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { Point, Rect } from "src/app/models/Geometry";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { LayoutService } from "src/app/services/layout.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { SpectrumToolId } from "src/app/UI/spectrum-chart-widget/tools/base-tool";
import { ToolButtonState } from "src/app/UI/spectrum-chart-widget/tools/tool-host";




@Component({
    selector: "spectrum-toolbar",
    templateUrl: "./spectrum-toolbar.component.html",
    styleUrls: ["./spectrum-toolbar.component.scss"]
})
export class SpectrumToolbarComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    toolButtons: ToolButtonState[];

    constructor(
        private _spectrumService: SpectrumChartService,
        private _layoutService: LayoutService,
        private _envService: EnvConfigurationService,
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._spectrumService.mdl$.subscribe(
            ()=>
            {
                // We now have the model, subscribe to what's needed
                this._subs.add(this._spectrumService.mdl.toolHost.toolStateChanged$.subscribe(
                    ()=>
                    {
                        // Something changed, refresh our tools
                        this.toolButtons = this._spectrumService.mdl.toolHost.getToolButtons();
                        //console.log('toolStateChanged$');
                        //console.log(this.toolButtons);
                    }
                ));

                this.toolButtons = this._spectrumService.mdl.toolHost.getToolButtons();
                //console.log(this.toolButtons);
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onSelectTool(id: SpectrumToolId): void
    {
        this._spectrumService.mdl.toolHost.setTool(id);
    }

    zoomIn(): void
    {
        let newScale = new Point(
            this._spectrumService.mdl.transform.scale.x*(1+4/100),
            this._spectrumService.mdl.transform.scale.y*(1+4/100)
        );
        this._spectrumService.mdl.transform.setScaleRelativeTo(
            newScale,
            this._spectrumService.mdl.transform.calcViewportCentreInWorldspace(),
            true
        );
    }

    zoomOut(): void
    {
        let newScale = new Point(
            this._spectrumService.mdl.transform.scale.x*(1-4/100),
            this._spectrumService.mdl.transform.scale.y*(1-4/100)
        );
        this._spectrumService.mdl.transform.setScaleRelativeTo(
            newScale,
            this._spectrumService.mdl.transform.calcViewportCentreInWorldspace(),
            true
        );
    }

    zoomAll(): void
    {
        this._spectrumService.mdl.transform.resetViewToRect(
            new Rect(
                0,
                0,
                this._spectrumService.mdl.transform.canvasParams.width,
                this._spectrumService.mdl.transform.canvasParams.height
            ),
            false
        );
    }

    get yAxislogScale(): boolean
    {
        return this._spectrumService.mdl.yAxislogScale;
    }

    onToggleYAxislogScale(): void
    {
        return this._spectrumService.mdl.setYAxisLogScale(!this._spectrumService.mdl.yAxislogScale);
    }

    toggleXrayTubeElement(): void
    {
        // Can't do anything if X axis isn't calibrated, so complain if this is the case
        if(!this._spectrumService.mdl.xAxisEnergyScale)
        {
            alert("X axis needs to be energy-calibrated for this to show");
            return;
        }

        let tubeZ = this.getXrayTubeElement();
        if(tubeZ <= 0)
        {
            alert("Failed, x-ray tube element unknown");
            return;
        }

        if(this.xrayTubeXRFLineState == IconButtonState.OFF)
        {
            // Add it to the picked list
            this._spectrumService.mdl.pickXRFLine(tubeZ);
            return;
        }

        // Remove from picked list
        this._spectrumService.mdl.unpickXRFLine(tubeZ);
    }

    get xrayTubeXRFLineState(): IconButtonState
    {
        let tubeZ = this.getXrayTubeElement();

        // Check if it's in the picked element list
        if(tubeZ > 0)
        {
            for(let group of this._spectrumService.mdl.xrfLinesPicked)
            {
                if(group.atomicNumber == tubeZ)
                {
                    return IconButtonState.ACTIVE;
                }
            }
        }

        return IconButtonState.OFF;
    }

    private getXrayTubeElement(): number
    {
        if(this._envService.detectorConfig)
        {
            return this._envService.detectorConfig.tubeElement;
        }
        return 0;
    }

    get resizeSpectraY(): boolean
    {
        return this._spectrumService.mdl.chartYResize;
    }

    onToggleResizeSpectraY(): void
    {
        this._spectrumService.mdl.chartYResize = !this._spectrumService.mdl.chartYResize;
    }

    get xAxisEnergyScale(): boolean
    {
        return this._spectrumService.mdl.xAxisEnergyScale;
    }

    get zoomOutState(): IconButtonState
    {
        // If we're zoomed out as far as we can go, disable zoom-out button
        if(this._spectrumService.mdl.transform.isZoomXAtMinLimit() && this._spectrumService.mdl.transform.isZoomYAtMinLimit())
        {
            return IconButtonState.DISABLED;
        }
        return null;
    }

    get countsPerMin(): boolean
    {
        return this._spectrumService.mdl.yAxisCountsPerMin;
    }

    onToggleCountsPerMin(): void
    {
        this._spectrumService.mdl.yAxisCountsPerMin = !this._spectrumService.mdl.yAxisCountsPerMin;
    }

    get countsPerPMC(): boolean
    {
        return this._spectrumService.mdl.yAxisCountsPerPMC;
    }

    onToggleCountsPerPMC(): void
    {
        this._spectrumService.mdl.yAxisCountsPerPMC = !this._spectrumService.mdl.yAxisCountsPerPMC;
    }
}
