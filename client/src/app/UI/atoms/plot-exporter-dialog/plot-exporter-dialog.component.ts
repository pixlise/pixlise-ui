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

import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import * as JSZip from "jszip";
import { Point } from "src/app/models/Geometry";
import { Colours, RGBA } from "src/app/utils/colours";
import { PointDrawer } from "src/app/utils/drawing";
import { CanvasParams, InteractiveCanvasComponent } from "../interactive-canvas/interactive-canvas.component";
import { KeyItem } from "../widget-key-display/widget-key-display.component";

export class CanvasExportItem
{
    constructor(public name: string, public canvas: HTMLCanvasElement) {}
}

export class CSVExportItem
{
    constructor(public name: string, public data: string) {}
}

export class PlotExporterDialogOption
{
    constructor(
        public label: string,
        public enabled: boolean,
        public isModifier: boolean = false,
        public type: string = "checkbox",
    )
    {
    }
}

export class PlotExporterDialogData
{
    constructor(
        public zipFileNamePlaceholder: string,
        public title: string,
        public options: PlotExporterDialogOption[],
    )
    {
    }
}

export const drawStaticLegend = (screenContext: CanvasRenderingContext2D, keyItems: KeyItem[], viewport: CanvasParams): void =>
{
    if(keyItems.length === 0)
    {
        return;
    }

    let legendWidth = 200;
    let legendHeight = 30 + keyItems.length * 20;
    let legendX = viewport.width - legendWidth - 10;
    let legendY = 10;

    screenContext.save();

    screenContext.strokeStyle = Colours.WHITE.asString();
    screenContext.lineWidth = 1;
    screenContext.strokeRect(legendX, legendY, legendWidth, legendHeight);

    screenContext.font = "12px Arial";
    screenContext.fillStyle = Colours.WHITE.asString();
    screenContext.textAlign = "left";
    screenContext.textBaseline = "middle";

    let legendTextX = legendX + 15;
    let legendTextY = legendY + 15;

    screenContext.fillText("Key", legendTextX - 5, legendTextY);
    legendTextY += 20;

    keyItems.forEach(keyItem =>
    {
        let drawer = new PointDrawer(
            screenContext,
            5,
            RGBA.fromString(keyItem.colour),
            null,
            keyItem.shape
        );
        drawer.drawPoints([new Point(legendTextX, legendTextY)], 1);

        screenContext.fillStyle = Colours.WHITE.asString();
        screenContext.fillText(keyItem.label, legendTextX + 15, legendTextY);

        legendTextY += 20;
    });
};

export const generatePlotImage = (drawer, transform, keyItems, width, height, showKey): HTMLCanvasElement =>
{
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    
    let context = canvas.getContext("2d");

    let viewport = new CanvasParams(width, height, 1);

    drawer.showSwapButton = false;

    InteractiveCanvasComponent.drawFrame(context, viewport, transform, drawer, []);

    if(showKey)
    {
        drawStaticLegend(context, keyItems, viewport);
    }

    // Reset the drawer
    drawer.showSwapButton = true;

    return canvas;
};

@Component({
    selector: "plot-exporter-dialog",
    templateUrl: "./plot-exporter-dialog.component.html",
    styleUrls: ["./plot-exporter-dialog.component.scss"]
})
export class PlotExporterDialogComponent
{
    state: string = "download";
    prompt: string = "";
    options: PlotExporterDialogOption[] = [];
    fileName: string = "";
    zipFileNamePlaceholder: string = "Enter a zip file name";

    @Output() onConfirmOptions = new EventEmitter();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PlotExporterDialogData,
        public dialogRef: MatDialogRef<PlotExporterDialogComponent>
    )
    {
        if(data)
        {
            this.options = data.options ? data.options : [];
            this.zipFileNamePlaceholder = data.zipFileNamePlaceholder ? data.zipFileNamePlaceholder : this.zipFileNamePlaceholder;
        }
    }

    onToggleOption(option: PlotExporterDialogOption)
    {
        option.enabled = !option.enabled;
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
    }

    get enabledOptions(): string[]
    {
        return this.options.filter(option => option.enabled).map(option => option.label);
    }

    get isDownloadable(): boolean
    {
        return this.options.filter(option => option.enabled && !option.isModifier).length > 0;
    }

    onExport(): void
    {
        this.onConfirmOptions.emit(this.enabledOptions);
    }

    onDownload(canvasItems: CanvasExportItem[], csvItems: CSVExportItem[]): void
    {
        let zip = new JSZip();

        csvItems.forEach(item => zip.folder("csvs").file(`${item.name}.csv`, item.data));
        canvasItems.forEach(item =>
        {
            zip.folder("plots").file(`${item.name}.png`, item.canvas.toDataURL("image/png").split(",")[1], {base64: true});
        });
        this.state = "loading";
        this.prompt = "Generating zip file...";
        zip.generateAsync({type:"blob"}).then((content) =>
        {
            let fileName = this.fileName ? this.fileName : this.zipFileNamePlaceholder;
            saveAs(content, `${fileName}.zip`);
            this.state = "download";
            this.prompt = "";
        }).catch((err) =>
        {
            console.error(err);
            this.prompt = `Failed to generate zip file: "${err}"`;
            this.state = "error";
        });

        this.dialogRef.close(null);
    }
}
