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

import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import {
    CanvasExportItem,
    CSVExportItem,
    generatePlotImage,
    PlotExporterDialogComponent,
    PlotExporterDialogData,
    PlotExporterDialogOption
} from "src/app/UI/atoms/plot-exporter-dialog/plot-exporter-dialog.component";
import { DataSet } from "src/app/models/DataSet";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { CanvasDrawer } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";


export interface ExportPlotCaller
{
    transform: PanZoom;
    drawer: CanvasDrawer;
    keyItems: KeyItem[];
    exportPlotData(datasetID: string): string;
}

export function exportScatterPlot(dialogSvc: MatDialog, plotName: string, dataset: DataSet, scatterPlotCaller: ExportPlotCaller)
{
    let exportOptions = [
        new PlotExporterDialogOption("Color", true, true, { type: "switch", options: ["Dark Mode", "Light Mode"] }),
        new PlotExporterDialogOption("Visible Key", true, true),
        new PlotExporterDialogOption("Plot Image", true),
        new PlotExporterDialogOption("Large Plot Image", true),
        new PlotExporterDialogOption("Plot Data .csv", true),
    ];

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new PlotExporterDialogData(`${dataset.getId()} - ${plotName} Plot`, `Export ${plotName} Plot`, exportOptions);

    const dialogRef = dialogSvc.open(PlotExporterDialogComponent, dialogConfig);
    dialogRef.componentInstance.onConfirmOptions.subscribe(
        (options: PlotExporterDialogOption[])=>
        {
            let optionLabels = options.map(option => option.label);
            let canvases: CanvasExportItem[] = [];
            let csvs: CSVExportItem[] = [];

            let showKey = optionLabels.indexOf("Visible Key") > -1;
            let lightMode = optionLabels.indexOf("Color") > -1;

            if(optionLabels.indexOf("Plot Image") > -1)
            {
                canvases.push(new CanvasExportItem(
                    plotName+" Plot",
                    generatePlotImage(scatterPlotCaller.drawer, scatterPlotCaller.transform, scatterPlotCaller.keyItems, 1200, 800, showKey, lightMode)
                ));   
            }

            if(optionLabels.indexOf("Large Plot Image") > -1)
            {
                canvases.push(new CanvasExportItem(
                    plotName+" Plot - Large",
                    generatePlotImage(scatterPlotCaller.drawer, scatterPlotCaller.transform, scatterPlotCaller.keyItems, 4096, 2160, showKey, lightMode)
                ));
            }

            if(optionLabels.indexOf("Plot Data .csv") > -1)
            {
                // Export CSV
                // Loop through all sub-datasets of this one if there are any
                let subDatasetIDs = dataset.getSubDatasetIds();
                if(subDatasetIDs.length <= 0)
                {
                    // Specify a blank one
                    subDatasetIDs = [""];
                }

                for(let datasetId of subDatasetIDs)
                {
                    csvs.push(new CSVExportItem(
                        plotName+" Plot Data for dataset"+datasetId,
                        scatterPlotCaller.exportPlotData(datasetId)
                    ));
                }
            }

            dialogRef.componentInstance.onDownload(canvases, csvs);
        });

    return dialogRef.afterClosed();
}