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

import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { LocationDataLayer } from "src/app/models/LocationData2D";
import { ContextImageService } from "src/app/services/context-image.service";
import { LayoutService } from "src/app/services/layout.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { LayerChangeInfo } from "src/app/UI/context-image-view-widget/layer-manager";





class WidgetInfo
{
    constructor(public title, public exprID)
    {
    }
}

@Component({
    selector: "dataset-map-browser",
    templateUrl: "./map-browser.component.html",
    styleUrls: ["./map-browser.component.scss"],
    providers: [ContextImageService],
})
export class MapBrowserComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    // Public so html can access
    mapWidgets: WidgetInfo[] = [];

    constructor(
        private _layoutService: LayoutService,
        private _quantService: QuantificationService,
        private _contextImageService: ContextImageService,
        private _viewStateService: ViewStateService,
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                // Subscribe to changes with layers, so we know what layers to draw
                this._subs.add(this._contextImageService.mdl.layerManager.locationDataLayers$.subscribe(
                    (change: LayerChangeInfo)=>
                    {
                        this.generateMapViews(change.layers);
                    },
                    (err)=>
                    {
                        console.error(err);
                    }
                ));
            }
        ));
    }

    generateMapViews(layers: LocationDataLayer[]): void
    {
        this.mapWidgets = [];

        for(let layer of layers)
        {
            if(layer.isVisible())
            {
                let layerID = layer.id;
                let title = layer.name;

                this.mapWidgets.push(new WidgetInfo(title, layerID));
            }
        }
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    @HostListener("window:resize", ["$event"])
    onResize(event)
    {
        // Window resized, notify all canvases
        this._layoutService.notifyWindowResize();
    }

    get showMapColourScale(): boolean
    {
        return this._viewStateService.showColourScaleOnMaps;
    }

    onToggleMapColourScale(): void
    {
        this._viewStateService.showColourScaleOnMaps = !this._viewStateService.showColourScaleOnMaps;

        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.needsDraw$.next();
        }
    }
}
