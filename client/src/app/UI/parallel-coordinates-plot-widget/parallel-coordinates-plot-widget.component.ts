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

import { Component, HostListener, Input, OnInit, OnDestroy, ElementRef } from "@angular/core";
import { Subscription } from "rxjs";
import { parallelogramWidgetState, ViewStateService } from "src/app/services/view-state.service";
import { SelectionService } from "src/app/services/selection.service";
import { ContextImageService } from "src/app/services/context-image.service";
import { RGBUImage } from "src/app/models/RGBUImage";

import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ROIPickerComponent, ROIPickerData } from "../roipicker/roipicker.component";
import { orderVisibleROIs } from "src/app/models/roi";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { LayoutService } from "src/app/services/layout.service";
import { KeyItem } from "../atoms/widget-key-display/widget-key-display.component";
import { IconButtonState } from "../atoms/buttons/icon-button/icon-button.component";
import { CSVExportItem, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { DataSetService } from "src/app/services/data-set.service";

export class PCPLine
{
    constructor(
        public xStart: number | string = 0,
        public yStart: number | string = 0,
        public xEnd: number | string = 0,
        public yEnd: number | string = 0,
    ){}
}


export class RGBUPoint
{
    lines: PCPLine[] = [];

    _tooltipText: string = "";

    constructor(
        public r: number = 0,
        public g: number = 0,
        public b: number = 0,
        public u: number = 0,
        public rg: number = 0,
        public rb: number = 0,
        public ru: number = 0,
        public gb: number = 0,
        public gu: number = 0,
        public bu: number = 0,
        public color: string = "255,255,255",
        public name: string = "",
    )
    {}

    get tooltipText(): string
    {
        return this._tooltipText;
    }

    calculateLinesForAxes(axes: PCPAxis[], element: ElementRef, plotID: string): void
    {
        let plotContainer = element?.nativeElement?.querySelector(`.${plotID}`);
        let domAxes = plotContainer?.querySelectorAll(".axes .axis-container");
        if(!domAxes || !plotContainer || domAxes.length != axes.length)
        {
            // Something isn't loaded right, don't continue drawing
            return;
        }

        let axesXLocations = Array.from(domAxes).map((axis: any) =>
        {
            let clientRect = axis.getBoundingClientRect();
            return clientRect.x + clientRect.width/2;
        });

        let relativeX = plotContainer.getBoundingClientRect().x;

        this.lines = [];
        for(let i = 0; i < axes.length-1; i++)
        {
            let currentAxisValue = axes[i].getValueAsPercentage(this[axes[i].key]);
            let nextAxisValue = axes[i + 1].getValueAsPercentage(this[axes[i + 1].key]);
            
            let xStart = `${Math.round((axesXLocations[i] - relativeX) * 100)/100}`;
            let xEnd = `${Math.round((axesXLocations[i+1] - relativeX) * 100)/100}`;
            let yStart = `${currentAxisValue * 100}%`;
            let yEnd = `${nextAxisValue * 100}%`;

            let line = new PCPLine(xStart, yStart, xEnd, yEnd);
            this.lines.push(line);
        }

        let tooltipText = `${this.name} Averages:\n`;
        axes.forEach(axis =>
        {
            tooltipText += `${axis.title}: ${this[axis.key].toFixed(2)}\n`;
        });
        this._tooltipText = tooltipText;
    }
}

export type Dimension = {
    title: string;
    type?: string;
    color?: string;
    visible?: boolean;
}

export class PCPAxis
{
    minSelection: number = 0;
    maxSelection: number = 0;
    activeSelection: boolean = false;

    constructor(
        public key: string = "",
        public title: string = "",
        public visible: boolean = true,
        public min: number = 0,
        public max: number = 0,
    ){}

    public getSelectionRange(): number[]
    {
        return [this.minSelection, this.maxSelection];
    }

    public setSelectionRange(min: number, max: number): void
    {
        this.minSelection = min;
        this.maxSelection = max;
        this.activeSelection = true;
    }

    public clearSelection(): void
    {
        this.minSelection = 0;
        this.maxSelection = 0;
        this.activeSelection = false;
    }

    public getValueAsPercentage(value: number): number
    {
        if(this.min === this.max)
        {
            return 0.5;
        }
        else
        {
            return 1 - (value - this.min) / (this.max - this.min);
        }
    }

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

    private _visibleROIs: string[] = [];
    private _data: RGBUPoint[] = [];

    public dimensions: Record<keyof RGBUPoint, Dimension> = null;
    public axes: PCPAxis[] = [];
    public showLines: boolean = true;
    public showLabels: boolean = true;

    public keyShowing: boolean = false;
    public keyItems: KeyItem[] = [];

    constructor(
        private _elementRef: ElementRef,
        private _contextImageService: ContextImageService,
        private _selectionService: SelectionService,
        private _widgetDataService: WidgetRegionDataService,
        private _viewStateService: ViewStateService,
        private _datasetService: DataSetService,
        private _layoutService: LayoutService,
        public dialog: MatDialog
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
                            this.recalculateLines();
                            return;
                        }

                        this._prepareData("context-image-loaded");
                        this.recalculateLines();
                    }
                ));
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            ()=>
            {
                this._prepareData("selection-changed");
                this.recalculateLines();
            }
        ));

        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            ()=>
            {
                let loadedState = this._widgetDataService.viewState.parallelograms.get(this.widgetPosition);
                if(loadedState)
                {
                    this._visibleROIs = loadedState.regions;
                    this.axes.forEach(axis => axis.visible = loadedState.channels.includes(axis.key));
                }
                this._prepareData("regions changed");
                this.recalculateLines();
            }
        ));

        // Recalculate lines if side panel is opened/closed
        this._subs.add(this._layoutService.resizeCanvas$.subscribe(()=>
        {
            this.recalculateLines();
        }));
    }

    ngAfterViewInit()
    {
        this._prepareData("init");
        setTimeout(() => this.recalculateLines(), 50);
    }

    ngOnDestroy(): void
    {
        this._subs.unsubscribe();
    }

    getFormattedValueAsPercentage(point: RGBUPoint, axis: PCPAxis): string
    {
        let percentage = axis.getValueAsPercentage(point[axis.key]);
        return `${Math.round(percentage * 100)}%`;
    }

    private _initAxes(): void
    {
        this.axes = [
            new PCPAxis("r", "Red", true),
            new PCPAxis("g", "Green", true),
            new PCPAxis("b", "Blue", true),
            new PCPAxis("u", "Ultraviolet", true),
            new PCPAxis("rg", "Red/Green", false),
            new PCPAxis("rb", "Red/Blue", false),
            new PCPAxis("ru", "Red/Ultraviolet", false),
            new PCPAxis("gb", "Green/Blue", false),
            new PCPAxis("gu", "Green/Ultraviolet", false),
            new PCPAxis("bu", "Blue/Ultraviolet", false),
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

    toggleAxis(axisKey: string): void
    {
        this.axes.find(axis => axis.key === axisKey).visible = !this.axes.find(axis => axis.key === axisKey).visible;
        setTimeout(() => this.recalculateLines(), 50);
        this.saveState("axis-toggle");
    }

    toggleAll(visible: boolean): void
    {
        this.axes.forEach((axis) => axis.visible = visible);
        setTimeout(() => this.recalculateLines(), 50);
        this.saveState("all-axis-toggle");
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new ROIPickerData(true, true, true, false, this._visibleROIs, false, true, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs)
                {
                    this._visibleROIs = orderVisibleROIs(visibleROIs);

                    let reason = "roi-dialog";
                    this.saveState(reason);
                    this._prepareData(reason);
                    this.recalculateLines();
                }
            }
        );
    }

    private saveState(reason: string): void
    {
        console.log("Parallel Coordinates Plot saveState called due to: "+reason);
        this._viewStateService.setParallelogramState(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): parallelogramWidgetState
    {
        let toSave = new parallelogramWidgetState(
            this._visibleROIs,
            this.axes.filter(axis => axis.visible).map(axis => axis.key)
        );

        return toSave;
    }

    private getROIAveragePoint(points: Set<number>, color: string, name: string, fullDataset: boolean = false): RGBUPoint
    {
        let avgData = new RGBUPoint();
        avgData.name = name;
        avgData.color = color;

        let datasetLength = fullDataset ? this._rgbuLoaded.r.values.length : points.size;

        if((!fullDataset && (!points || points.size <= 0)) || !this._rgbuLoaded || !this._rgbuLoaded.r || !this._rgbuLoaded.r.values)
        {
            return avgData;
        }

        if(fullDataset)
        {
            this._rgbuLoaded.r.values.forEach((red, i) => 
            {
                let [green, blue, uv] = [this._rgbuLoaded.g.values[i], this._rgbuLoaded.b.values[i], this._rgbuLoaded.u.values[i]];
                avgData.r += red;
                avgData.g += green;
                avgData.b += blue;
                avgData.u += uv;
            });
        }
        else
        {
            points.forEach(i => 
            {
                let [red, green, blue, uv] = [this._rgbuLoaded.r.values[i], this._rgbuLoaded.g.values[i], this._rgbuLoaded.b.values[i], this._rgbuLoaded.u.values[i]];
                avgData.r += red;
                avgData.g += green;
                avgData.b += blue;
                avgData.u += uv;
            });
        }

        avgData.r = avgData.r / datasetLength;
        avgData.g = avgData.g / datasetLength;
        avgData.b = avgData.b / datasetLength;
        avgData.u = avgData.u / datasetLength;

        if(avgData.g > 0)
        {
            avgData.rg = avgData.r / avgData.g;
        }
        if(avgData.b > 0)
        {
            avgData.rb = avgData.r / avgData.b;
            avgData.gb = avgData.g / avgData.b;
        }
        if(avgData.u > 0)
        {
            avgData.ru = avgData.r / avgData.u;
            avgData.gu = avgData.g / avgData.u;
            avgData.bu = avgData.b / avgData.u;
        }

        return avgData;
    }

    private _getMinPoint(pointA: RGBUPoint, pointB: RGBUPoint): RGBUPoint
    {
        let minPoint = new RGBUPoint();
        minPoint.r = Math.min(pointA.r, pointB.r);
        minPoint.g = Math.min(pointA.g, pointB.g);
        minPoint.b = Math.min(pointA.b, pointB.b);
        minPoint.u = Math.min(pointA.u, pointB.u);
        minPoint.rg = Math.min(pointA.rg, pointB.rg);
        minPoint.rb = Math.min(pointA.rb, pointB.rb);
        minPoint.ru = Math.min(pointA.ru, pointB.ru);
        minPoint.gb = Math.min(pointA.gb, pointB.gb);
        minPoint.gu = Math.min(pointA.gu, pointB.gu);
        minPoint.bu = Math.min(pointA.bu, pointB.bu);
        return minPoint;
    }

    private _getMaxPoint(pointA: RGBUPoint, pointB: RGBUPoint): RGBUPoint
    {
        let maxPoint = new RGBUPoint();
        maxPoint.r = Math.max(pointA.r, pointB.r);
        maxPoint.g = Math.max(pointA.g, pointB.g);
        maxPoint.b = Math.max(pointA.b, pointB.b);
        maxPoint.u = Math.max(pointA.u, pointB.u);
        maxPoint.rg = Math.max(pointA.rg, pointB.rg);
        maxPoint.rb = Math.max(pointA.rb, pointB.rb);
        maxPoint.ru = Math.max(pointA.ru, pointB.ru);
        maxPoint.gb = Math.max(pointA.gb, pointB.gb);
        maxPoint.gu = Math.max(pointA.gu, pointB.gu);
        maxPoint.bu = Math.max(pointA.bu, pointB.bu);
        return maxPoint;
    }

    get data(): RGBUPoint[]
    {
        return this._data;
    }

    toggleKey(): void
    {
        this.keyShowing = !this.keyShowing;
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
        let selectedPixels = new Set<number>();
        if(this._selectionService && this._selectionService.getCurrentSelection())
        {
            let currentSelection = this._selectionService.getCurrentSelection();
            selectedPixels = currentSelection.pixelSelection.selectedPixels;
        }

        this.keyItems = [];

        // Get averages for all selected pixels
        if(selectedPixels.size > 0)
        {
            let selectionColor = "110,239,255";
            let averageSelection = this.getROIAveragePoint(selectedPixels, selectionColor, "Selection");
            averageSelection.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
            this.keyItems.push(new KeyItem("SelectedPoints", "Selection", `rgba(${selectionColor},255)`));
            this._data.push(averageSelection);
        }

        // Get averages for all ROIs
        this._visibleROIs.forEach((roiID) =>
        {
            if(roiID === "SelectedPoints")
            {
                return;
            }
            let roi = this._widgetDataService.regions.get(roiID);
            let color = roi.colour;
            let colorStr = `${color.r},${color.g},${color.b}`;
            this.keyItems.push(new KeyItem(roiID, roi.name, color));
            let averagePoint = this.getROIAveragePoint(roi.pixelIndexes, colorStr, roi.name, roiID === "AllPoints");
            averagePoint.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
            this._data.push(averagePoint);
        });

        let minPoint = new RGBUPoint();
        let maxPoint = new RGBUPoint();
        if(this._data.length > 0)
        {
            minPoint = this._data[0];
            maxPoint = this._data[0];
        }

        this._data.forEach(point =>
        {
            minPoint = this._getMinPoint(minPoint, point);
            maxPoint = this._getMaxPoint(maxPoint, point);
        });

        this.axes.forEach(axis =>
        {
            axis.min = minPoint[axis.key];
            axis.max = maxPoint[axis.key];
        });
    }

    get isUnderSpectrum(): boolean
    {
        return this.widgetPosition.includes("under");
    }

    get miniMode(): boolean
    {
        return this.visibleAxes.length > 6 && this.isUnderSpectrum;
    }

    get plotID(): string
    {
        return `parallel-coords-${this.widgetPosition}`;
    }

    get visibleAxes(): PCPAxis[]
    {
        return this.axes.filter((axis) => axis.visible);
    }

    toggleLineVisibility(): void
    {
        this.showLines = !this.showLines;
        if(this.showLines)
        {
            this.recalculateLines();
        }
    }

    toggleLabelVisibility(): void
    {
        this.showLabels = !this.showLabels;
    }

    private recalculateLines(): void
    {
        if(this.showLines)
        {
            this._data.forEach(point =>
            {
                point.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
            });
        }
    }

    exportPlotData(): string
    {
        let axisNames = this.visibleAxes.map((axis) => `"${axis.title.replace(/"/g, "'")}"`);
        let axisKeys = this.visibleAxes.map((axis) => axis.key);
        let data = `"ROI",${axisNames.join(",")}\n`;
        this._data.forEach((rgbuPoint) =>
        {
            let row = [rgbuPoint.name, axisKeys.map((key) => rgbuPoint[key])];
            data += `${row.join(",")}\n`;
        });

        return data;
    }

    onExport()
    {
        if(this._data)
        {
            let exportOptions = [
                new PlotExporterDialogOption("Plot Data .csv", true),
            ];

            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = new PlotExporterDialogData(`${this._datasetService.datasetLoaded.getId()} - Parallel Coords Plot`, "Export Parallel Coordinates Plot", exportOptions);

            const dialogRef = this.dialog.open(PlotExporterDialogComponent, dialogConfig);
            dialogRef.componentInstance.onConfirmOptions.subscribe(
                (options: PlotExporterDialogOption[])=>
                {
                    let optionLabels = options.map(option => option.label);
                    let csvs: CSVExportItem[] = [];

                    if(optionLabels.indexOf("Plot Data .csv") > -1)
                    {
                        csvs.push(new CSVExportItem(
                            "Parallel Coords Plot Data",
                            this.exportPlotData()
                        ));
                    }

                    dialogRef.componentInstance.onDownload([], csvs);
                });

            return dialogRef.afterClosed();
        }
    }


    @HostListener("window:resize", ["$event"])
    onResize()
    {
        this.recalculateLines();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorParallelCoordinates;
    }
}