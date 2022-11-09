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

import { Component, Input, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Point, Rect } from "src/app/models/Geometry";
import { ContextImageService } from "src/app/services/context-image.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasExportItem, generatePlotImage, PlotExporterDialogComponent, PlotExporterDialogData, PlotExporterDialogOption } from "../../atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { KeyItem } from "../../atoms/widget-key-display/widget-key-display.component";
import { ClientSideExportGenerator } from "../../export-data-dialog/client-side-export";
import { ExportDrawer } from "../drawers/export-drawer";
import { MapColourScale } from "../ui-elements/map-colour-scale";






@Component({
    selector: "app-context-image-toolbar",
    templateUrl: "./context-image-toolbar.component.html",
    styleUrls: ["./context-image-toolbar.component.scss"]
})
export class ContextImageToolbarComponent implements OnInit
{
    @Input() showPanZoomButtons: boolean = true;

    constructor(
        private _contextImageService: ContextImageService,
        private _viewStateService: ViewStateService,
        private router: Router,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit()
    {
    }

    zoomIn(): void
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let newScale = this._contextImageService.mdl.transform.scale.x*(1+4/100);
        this._contextImageService.mdl.transform.setScaleRelativeTo(
            new Point(newScale, newScale),
            this._contextImageService.mdl.transform.calcViewportCentreInWorldspace(),
            true
        );
    }

    zoomOut(): void
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let newScale = this._contextImageService.mdl.transform.scale.x*(1-4/100);
        this._contextImageService.mdl.transform.setScaleRelativeTo(
            new Point(newScale, newScale),
            this._contextImageService.mdl.transform.calcViewportCentreInWorldspace(),
            true
        );
    }

    resetViewToWholeImage(): void
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let dims: Point = null;
        if(this._contextImageService.mdl.contextImageItemShowingDisplay)
        {
            dims = new Point(this._contextImageService.mdl.contextImageItemShowingDisplay.width, this._contextImageService.mdl.contextImageItemShowingDisplay.height);
        }
        else
        {
            dims = new Point(this._contextImageService.mdl.dataset.locationPointBBox.w, this._contextImageService.mdl.dataset.locationPointBBox.h);
        }

        this._contextImageService.mdl.transform.resetViewToRect(
            new Rect(
                0,
                0,
                dims.x,
                dims.y
            ),
            true
        );
    }

    resetViewToExperiment(): void
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }

        let dataset = this._contextImageService.mdl.dataset;
        if(dataset)
        {
            this._contextImageService.mdl.transform.resetViewToRect(
                dataset.locationPointBBox,
                true
            );
        }
    }

    get showPoints(): boolean
    {
        if(!this._contextImageService.mdl)
        {
            return false;
        }

        return this._contextImageService.mdl.showPoints;
    }

    toggleShowPoints(): void
    {
        if(!this._contextImageService.mdl)
        {
            return;
        }
        this._contextImageService.mdl.showPoints = !this._contextImageService.mdl.showPoints;
    }

    get zoomOutState(): IconButtonState
    {
        // If we're zoomed out as far as we can go, disable zoom-out button
        if(this._contextImageService.mdl && this._contextImageService.mdl.transform.isZoomXAtMinLimit())
        {
            return IconButtonState.DISABLED;
        }
        return null;
    }

    get isRGBU(): boolean
    {
        return this._contextImageService.mdl && this._contextImageService.mdl.dataset && this._contextImageService.mdl.dataset.rgbuImages.length > 0;
    }

    get isCroppable(): boolean
    {
        let selection = this._contextImageService.mdl.selectionService.getCurrentSelection();
        return selection && selection.pixelSelection && selection.pixelSelection.selectedPixels.size > 0 || this.isCropped;
    }

    get isCropped(): boolean
    {
        let selection = this._contextImageService.mdl.selectionService.getCurrentSelection();
        return selection && selection.cropSelection && selection.cropSelection.selectedPixels.size > 0;
    }

    onCrop(): void
    {
        if(this.isCroppable)
        {
            this._contextImageService.mdl.selectionService.toggleCropSelection();
        }
    }


    get isSolo(): IconButtonState
    {
        if(!this._contextImageService.mdl)
        {
            return IconButtonState.OFF;
        }

        return this._viewStateService.isSoloView(ViewStateService.widgetSelectorContextImage, this._contextImageService.mdl.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        if(this._contextImageService.mdl)
        {
            this._viewStateService.toggleSoloView(ViewStateService.widgetSelectorContextImage, this._contextImageService.mdl.widgetPosition);
        }
    }

    onExport()
    {
        if(this._contextImageService && this._contextImageService.mdl)
        {
            let visibleROIs = this._contextImageService.mdl.regionManager.getRegionsForDraw().filter(roi => roi.isVisible());
            let colourScale = this._contextImageService.mdl.toolHost.getMapColourScaleDrawer() as MapColourScale;
            let activeColourScale = colourScale && colourScale.channelScales.length > 0;
            let exportOptions = [
                new PlotExporterDialogOption("Visible Scale", true, true),
                new PlotExporterDialogOption("Visible Key", true, true, { type: "checkbox", disabled: visibleROIs.length === 0 }),
                new PlotExporterDialogOption("Visible Colour Scale", true, true, { type: "checkbox", disabled: !activeColourScale }),
                new PlotExporterDialogOption("Standard Size Image", true),
                new PlotExporterDialogOption("Large Image", true),
            ];

            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = new PlotExporterDialogData(`${this._contextImageService.mdl.dataset.getId()} - Context Image`, "Export Context Image", exportOptions);

            const dialogRef = this.dialog.open(PlotExporterDialogComponent, dialogConfig);
            dialogRef.componentInstance.onConfirmOptions.subscribe(
                (options: string[])=>
                {
                    let canvases: CanvasExportItem[] = [];

                    let showKey = options.indexOf("Visible Key") > -1;
                    let showColourScale = options.indexOf("Visible Colour Scale") > -1;
                    let showScale = options.indexOf("Visible Scale") > -1;
 
                    let keyItems = this._contextImageService.mdl.regionManager.getRegionsForDraw().filter(roi => roi.isVisible()).map(roi => new KeyItem(roi.roi.id, roi.roi.name, roi.roi.colour));

                    let drawer = new ExportDrawer(this._contextImageService.mdl, this._contextImageService.mdl.toolHost);
                    let exportIDs = [
                        ClientSideExportGenerator.exportContextImage,
                        ClientSideExportGenerator.exportContextImageFootprint,
                        ClientSideExportGenerator.exportContextImageROIs,
                        ClientSideExportGenerator.exportContextImageScanPoints,
                        ClientSideExportGenerator.exportDrawBackgroundBlack
                    ];

                    if(showColourScale)
                    {
                        exportIDs.push(ClientSideExportGenerator.exportContextImageColourScale);
                    }
                    if(showScale)
                    {
                        exportIDs.push(ClientSideExportGenerator.exportContextImagePhysicalScale);
                    }

                    if(options.indexOf("Standard Size Image") > -1)
                    {
                        exportIDs.push(ClientSideExportGenerator.exportWebResolution);
                        canvases.push(new CanvasExportItem(
                            "Context Image",
                            generatePlotImage(drawer, this._contextImageService.mdl.transform, keyItems, 1200, 800, showKey, false, exportIDs)
                        ));
                    }

                    if(options.indexOf("Large Image") > -1)
                    {
                        exportIDs.push(ClientSideExportGenerator.exportPrintResolution);
                        canvases.push(new CanvasExportItem(
                            "Context Image - Large",
                            generatePlotImage(drawer, this._contextImageService.mdl.transform, keyItems, 4096, 2160, showKey, false, exportIDs)
                        ));
                    }

                    dialogRef.componentInstance.onDownload(canvases, []);
                });

            return dialogRef.afterClosed();
        }
    }

}
