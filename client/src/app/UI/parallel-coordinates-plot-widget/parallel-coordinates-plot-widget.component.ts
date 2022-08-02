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

import { Component, HostListener, Input, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { ViewStateService } from "src/app/services/view-state.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { RGBUImage } from "src/app/models/RGBUImage";
import { DataSet } from "src/app/models/DataSet";

import "parcoord-es/dist/parcoords.css";
import ParCoords from "parcoord-es";

import * as d3 from "d3";
import { PixelSelection } from "src/app/models/PixelSelection";

export type RGBUPoint = {
    r: number;
    g: number;
    b: number;
    u: number;
    rg: number;
    rb: number;
    ru: number;
    gb: number;
    gu: number;
    bu: number;
}

export type Dimension = {
    title: string;
    type?: string;
    color?: string;
    visible?: boolean;
}

export type PCPAxis = {
    key: string;
    title: string;
    visible: boolean;
}


@Component({
    selector: "app-parallel-coordinates-plot-widget",
    templateUrl: "./parallel-coordinates-plot-widget.component.html",
    styleUrls: ["./parallel-coordinates-plot-widget.component.scss"],
})
export class ParallelCoordinatesPlotWidgetComponent implements OnInit, OnDestroy
{
    @Input() widgetPosition: string = "";

    private _subs = new Subscription();

    private _rgbuLoaded: RGBUImage = null;
    public activeSelectionCount: number = 0;
    public isSelectionLoaded: boolean = false;
    private _autoLoadLimit: number = 100000;
    private _data: RGBUPoint[] = [];
    private _parCoords: ParCoords = null;
    public dimensions: Record<keyof RGBUPoint, Dimension> = null;
    public axes: PCPAxis[] = [];

    constructor(
        private _contextImageService: ContextImageService,
        private _datasetService: DataSetService,
        private _selectionService: SelectionService,
    )
    {
    }

    ngOnInit(): void
    {
        this._initAxes();

        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this._subs.add(this._contextImageService.mdl.contextImageItemShowing$.subscribe(
                    (contextImageItemShowing)=>
                    {
                        this._rgbuLoaded = contextImageItemShowing.rgbuSourceImage;

                        if(!this._rgbuLoaded) 
                        {
                            this._data = [];
                            this._resetPlot();
                            this._drawParallelCoordsPlot();
                            return;
                        }
    
                        // Load the plot if there's an active selection that's less than the auto load limit
                        this.activeSelectionCount = this.getActiveSelectionCount();
                        if(this.activeSelectionCount > 0 && this.activeSelectionCount < this._autoLoadLimit) 
                        {
                            this.isSelectionLoaded = true;
                            this._resetPlot();
                            this._prepareData("context-image-loaded");
                            this._drawParallelCoordsPlot();
                        }
                        else 
                        {
                            this.isSelectionLoaded = false;
                            this._data = [];
                            this._resetPlot();
                            this._drawParallelCoordsPlot();
                        }
                    }
                ));
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            (selection)=>
            {
                // Load the plot if the current selection is less than the auto load limit and not 0 (meaning no selection)
                this.activeSelectionCount = this.getActiveSelectionCount(selection);
                if(this.activeSelectionCount > 0 && this.activeSelectionCount < this._autoLoadLimit) 
                {
                    this.isSelectionLoaded = true;
                    this._resetPlot();
                    this._prepareData("selection-changed");
                    this._drawParallelCoordsPlot();
                }
                else 
                {
                    this.isSelectionLoaded = false;
                    this._data = [];
                    this._resetPlot();
                    this._drawParallelCoordsPlot();
                }
            }
        ));
    }

    private getActiveSelectionCount(selection: SelectionHistoryItem = null): number
    {
        let currentSelection = null;
        if(selection)
        {
            currentSelection = selection;
        }
        else if(this._selectionService)
        {
            currentSelection = this._selectionService.getCurrentSelection();
        }
        let selectedPixelCount = currentSelection ? currentSelection.pixelSelection.selectedPixels.size : 0;
        let croppedPixelCount = currentSelection && currentSelection.cropSelection ? currentSelection.cropSelection.selectedPixels.size : 0;
        
        return selectedPixelCount > 0 ? selectedPixelCount : croppedPixelCount;
    }

    ngAfterViewInit()
    {
        // Do another check for selection after the view has been initialized and check if selection is cropped
        this.activeSelectionCount = this.getActiveSelectionCount();
        if(this.activeSelectionCount > 0 && this.activeSelectionCount < this._autoLoadLimit)
        {
            this.isSelectionLoaded = true;
            this._prepareData("init");
        }
        // If it hasn't loaded yet, draw an empty plot
        if(!this._parCoords)
        {
            this._drawParallelCoordsPlot();
        }
    }

    ngOnDestroy(): void
    {
        this._resetPlot();
        this._subs.unsubscribe();
    }


    get selectionCountText(): string
    {
        return this.activeSelectionCount ? `${this.activeSelectionCount}` : "All";
    }

    private _initAxes(): void
    {
        this.axes = [
            {key: "r", title: "Red", visible: true},
            {key: "g", title: "Green", visible: true},
            {key: "b", title: "Blue", visible: true},
            {key: "u", title: "Ultraviolet", visible: true},
            {key: "rg", title: "Red/Green", visible: true},
            {key: "rb", title: "Red/Blue", visible: true},
            {key: "ru", title: "Red/Ultraviolet", visible: true},
            {key: "gb", title: "Green/Blue", visible: true},
            {key: "gu", title: "Green/Ultraviolet", visible: true},
            {key: "bu", title: "Blue/Ultraviolet", visible: true},
        ];

        let dimensions = {};
        this.axes.forEach(axis => 
        {
            dimensions[axis.key] = {
                title: axis.title,
                type: "number",
            };
        });

        this.dimensions = dimensions as Record<keyof RGBUPoint, Dimension>;
    }

    get highlightedCount(): number
    {
        if(this._parCoords && this._parCoords.state.brushed && this._parCoords.state.brushed.length < this._parCoords.state.data.length)
        {
            return this._parCoords.state.brushed.length;
        }

        return 0;
    }
    get isHighlighted(): boolean
    {
        if(this._parCoords && this._parCoords.state.brushed)
        {
            return this._parCoords.state.brushed.length > 0 && this._parCoords.state.brushed.length < this._parCoords.state.data.length;
        }

        return false;
    }

    toggleAxis(axisKey: string): void
    {
        this.axes.find(axis => axis.key === axisKey).visible = !this.axes.find(axis => axis.key === axisKey).visible;

        let hiddenAxes = ["color", "index", ...this.axes.filter((axis) => !axis.visible).map((axis) => axis.key)];
        this._parCoords.dimensions(this.dimensions).hideAxis(hiddenAxes).render().updateAxes();

        d3.selectAll("g.axis > text").style("fill", "currentColor");
    }

    loadPoints(): void
    {
        this.isSelectionLoaded = true;
        this._resetPlot();
        this._prepareData("user-triggered-load");
        this._drawParallelCoordsPlot();
    }

    convertToSelection(): void
    {
        if(this._parCoords && this._parCoords.state.brushed && this._parCoords.state.brushed.length < this._parCoords.state.data.length)
        {
            let currentSelection = this._selectionService.getCurrentSelection();
            let width = 0;
            let height = 0;

            if(this._contextImageService.mdl.contextImageItemShowing.rgbuSourceImage) 
            {
                width = this._contextImageService.mdl.contextImageItemShowing.rgbuSourceImage.r.width;
                height = this._contextImageService.mdl.contextImageItemShowing.rgbuSourceImage.r.height;
            }
            else if(this._contextImageService.mdl.contextImageItemShowing.rgbSourceImage) 
            {
                width = this._contextImageService.mdl.contextImageItemShowing.rgbSourceImage.width;
                height = this._contextImageService.mdl.contextImageItemShowing.rgbSourceImage.height;
            }

            this._selectionService.setSelection(
                this._datasetService.datasetLoaded,
                null,
                new PixelSelection(
                    this._datasetService.datasetLoaded,
                    new Set(this._parCoords.state.brushed.map(point => point.index)),
                    width,
                    height,
                    currentSelection.pixelSelection.imageName
                )
            );

            this._resetPlot();
            this._prepareData("selection-changed");
            this._drawParallelCoordsPlot();
        }
    }

    private _getPixelColor = (channelAcronyms: string[], index: number): string =>
    {
        let color: string = null;

        // Verify this is a 2 channel ratio image, calculate ratio at pixel, and retrieve color from layer
        if(channelAcronyms.length === 2)
        {
            if(!this._contextImageService || !this._contextImageService.mdl || !this._contextImageService.mdl.rgbuImageLayerForScale)
            {
                return "255,255,255";
            }
            let layer = this._contextImageService.mdl.rgbuImageLayerForScale;
            let ratioValue = this._rgbuLoaded[channelAcronyms[0]].values[index] / this._rgbuLoaded[channelAcronyms[1]].values[index];
            let drawParams = layer.getDrawParamsForRawValue(0, ratioValue, layer.getDisplayValueRange(0));
            color = `${drawParams.colour.r},${drawParams.colour.g},${drawParams.colour.b}`;
        }
        else 
        {
            // Default to using RGB colors from the RGBU image
            color = `${this._rgbuLoaded.r.values[index]},${this._rgbuLoaded.g.values[index]},${this._rgbuLoaded.b.values[index]}`;
        }
        return color;   
    };

    private _formLineData(i: number, channelAcronyms: string[]): RGBUPoint
    {
        let lineData = {r: 0, g: 0, b: 0, u: 0, rg: 0, rb: 0, ru: 0, gb: 0, gu: 0, bu: 0, color: "#000", index: 0};
        if(i < 0 || !this._rgbuLoaded || !this._rgbuLoaded.r || !this._rgbuLoaded.r.values || i >= this._rgbuLoaded.r.values.length) 
        {
            return lineData;
        }

        let color: string = this._getPixelColor(channelAcronyms, i);
        let [red, green, blue, uv] = [this._rgbuLoaded.r.values[i], this._rgbuLoaded.g.values[i], this._rgbuLoaded.b.values[i], this._rgbuLoaded.u.values[i]];
        lineData.r = red;
        lineData.g = green;
        lineData.b = blue;
        lineData.u = uv;
        lineData.color = color;
        lineData.index = i;

        // Ensure data is not null and no divide by zero errors occur
        if(green && green > 0) 
        {
            lineData.rg = red / green;
        }
        if(blue && blue > 0) 
        {
            lineData.rb = red / blue;
            lineData.gb = green / blue;
        }
        if(uv && uv > 0) 
        {
            lineData.ru = red / uv;
            lineData.gu = green / uv;
            lineData.bu = blue / uv;
        }

        return lineData;
    }

    private _prepareData(reason: string): void
    {
        console.log(`Parallel Coordinates Plot prepareData reason: ${reason}`);
        if(!this._rgbuLoaded)
        {
            console.error("PCP plot: No RGBU image loaded. Skipping...");
            return;
        }

        // Make sure we're starting with a clean slate
        this._data = [];

        // Get active channels if this is a ratio image
        let channelAcronyms: string[] = [];
        if(this._contextImageService && this._contextImageService.mdl && this._contextImageService.mdl.displayedChannels)
        {
            channelAcronyms = this._contextImageService.mdl.displayedChannels.toLowerCase().split("/").filter(acronym => ["r", "g", "b", "u"].includes(acronym));
        }
        let selectedPixels = new Set<number>();
        let croppedPixels = new Set<number>();
        if(this._selectionService && this._selectionService.getCurrentSelection())
        {
            let currentSelection = this._selectionService.getCurrentSelection();
            selectedPixels = currentSelection.pixelSelection.selectedPixels;
            croppedPixels = currentSelection.cropSelection ? currentSelection.cropSelection.selectedPixels : null;
            this.activeSelectionCount = selectedPixels.size > 0 ? selectedPixels.size : croppedPixels.size;
        }

        // If there is a selection, only use the selected pixels as the base data otherwise default to all pixels
        if(selectedPixels.size > 0)
        {
            selectedPixels.forEach((_, i) => 
            {
                this._data.push(this._formLineData(i, channelAcronyms));
            });
        }
        else if(croppedPixels.size > 0)
        {
            croppedPixels.forEach((_, i) => 
            {
                this._data.push(this._formLineData(i, channelAcronyms));
            });   
        }
        else 
        {
            this._rgbuLoaded.r.values.forEach((_, i) => 
            {
                this._data.push(this._formLineData(i, channelAcronyms));
            });
        }
    }

    get plotID(): string
    {
        return `#parallel-coords-${this.widgetPosition}`;
    }

    private _resetPlot(): void
    {
        let plot = d3.select(this.plotID);
        if(plot && plot.node())
        {
            plot.selectAll("canvas").remove();
            plot.selectAll("svg").remove();
            this._parCoords = ParCoords()(this.plotID);
        }
    }

    private _getHiddenAxes(): string[]
    {
        let hiddenAxes = ["color", "index", ...this.axes.filter((axis) => !axis.visible).map((axis) => axis.key)];

        return hiddenAxes;
    }

    private _drawParallelCoordsPlot(): void 
    {
        let plot: any = d3.select(this.plotID);
        if(!plot || !plot.node() || !this.dimensions || Object.keys(this.dimensions).length <= 0)
        {
            return;
        }
        let boundingRect = plot.node().getBoundingClientRect();
        if(!boundingRect || !boundingRect.width || !boundingRect.height)
        {
            return;
        }

        if(!this._parCoords)
        {
            this._parCoords = ParCoords()(this.plotID);
        }

        let hiddenAxes = this._getHiddenAxes();
        this._parCoords
            .data(this._data.length > 0 ? this._data : [this._formLineData(-1, [])])
            .width(boundingRect.width)
            .height(boundingRect.height)
            .dimensions(this.dimensions)
            .hideAxis(hiddenAxes)
            .color((line) => `rgba(${line.color},0.1)`)
            .margin({ top: 20, left: 0, bottom: 12, right: 0 })
            .mode("queue")
            .brushedColor((line) => `rgba(${line.color},1)`)
            .render()
            .createAxes()
            .reorderable()
            .interactive()
            .brushMode("1D-axes");

        d3.selectAll("g.axis > text").style("fill", "currentColor");
    }

    @HostListener("window:resize", ["$event"])
    onResize()
    {
        // Window resized, get new bounds and update plot
        let plot: any = d3.select(this.plotID);
        if(!this._data || !plot || !plot.node())
        {
            return;
        }
        let boundingRect = plot.node().getBoundingClientRect();
        if(!boundingRect || !boundingRect.width || !boundingRect.height)
        {
            return;
        }
        this._parCoords.render().width(boundingRect.width).height(boundingRect.height).brushMode("1D-axes").updateAxes();

        // When axes are updated, the fill color gets reset so have to hack it back in
        d3.selectAll("g.axis > text").style("fill", "currentColor");
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorParallelCoordinates;
    }
}