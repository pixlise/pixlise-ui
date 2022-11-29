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


// Client-side export generation helpers:
// API has export capability where it zips files up and returns them in HTTP response
// but we also want to be able to export things that only "live" in the client, for
// example renderings of element maps, charts, etc which completely happens in client

import * as JSZip from "jszip";
import { combineLatest, Observable } from "rxjs";
import { DiffractionPeakQuerierSource } from "src/app/expression-language/data-sources";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getQuantifiedDataWithExpression } from "src/app/expression-language/expression-language";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { RGBMixConfigService } from "src/app/services/rgbmix-config.service";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasDrawer, CanvasParams, CanvasWorldTransform, InteractiveCanvasComponent } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { ExportGenerator } from "./export-models";
import { SentryHelper } from "src/app/utils/utils";


export class CanvasExportParameters
{
    constructor(
        public fileName: string,
        public webResWidth: number,
        public webResHeight: number,
        public webDPI: number,
        public printResWidth: number,
        public printResHeight: number,
        public printDPI: number
    )
    {
    }
}

export class ExportedFileData
{
    constructor(
        public name: string,
        public blob: Blob
    )
    {
    }
}

export class ClientSideExportGenerator implements ExportGenerator
{
    // Context-image specific export options
    public static readonly exportWebResolution = "exportWebResolution";
    public static readonly exportPrintResolution = "exportPrintResolution";

    public static readonly exportDrawBackgroundBlack = "exportDrawBackgroundBlack";
    public static readonly exportDrawBackgroundWhite = "exportDrawBackgroundWhite";

    public static readonly exportContextImage = "exportContextImage";

    public static readonly exportContextImageColourScale = "exportContextImageColourScale";
    public static readonly exportContextImagePhysicalScale = "exportContextImagePhysicalScale";

    public static readonly exportContextImageFootprint = "exportContextImageFootprint";
    public static readonly exportContextImageScanPoints = "exportContextImageScanPoints";

    public static readonly exportContextImageROIs = "exportContextImageROIs";
    //public static readonly exportContextImageROIKey = 'exportContextImageROIKey';

    public static readonly exportContextImageElementMap = "exportContextImageElementMaps";
    public static readonly exportExpressionValues = "exportExpressionValues";
    public static readonly exportROIExpressionValues = "exportROIExpressionValues";

    public static readonly exportExpressionPrefix = "exportExpression:";
    public static readonly exportROIPrefix = "exportROI:";

    public static getExportExpressionID(exportItemIDs: string[]): string
    {
        if(exportItemIDs)
        {
            for(let id of exportItemIDs)
            {
                if(id.startsWith(ClientSideExportGenerator.exportExpressionPrefix))
                {
                    return id.substring(ClientSideExportGenerator.exportExpressionPrefix.length);
                }
            }
        }
        return "";
    }

    public static getExportROIIDs(exportItemIDs: string[]): string[]
    {
        let result = [];
        if(exportItemIDs)
        {
            for(let id of exportItemIDs)
            {
                if(id.startsWith(ClientSideExportGenerator.exportROIPrefix))
                {
                    result.push(id.substring(ClientSideExportGenerator.exportROIPrefix.length));
                }
            }
        }
        return result;
    }

    constructor(
        protected _dataset: DataSet,
        protected _widgetDataService: WidgetRegionDataService,
        protected _drawer: CanvasDrawer,
        protected _transform: CanvasWorldTransform,
        protected _params: CanvasExportParameters,
        protected _rgbMixService: RGBMixConfigService,
        protected _exprService: DataExpressionService,
        private _diffractionSource: DiffractionPeakQuerierSource,
    )
    {
    }

    // Generates exports on client side, using same interface as server version
    generateExport(datasetID: string, quantID: string, choiceIds: string[], selectedROIs: string[], selectedExpressionIDs: string[], selectedExpressionNames: string[], outFileName: string): Observable<Blob>
    {
        // Loop through the resolutions and generate each image in the various forms we want it
        let widths: number[] = [];
        let heights: number[] = [];
        let dpis: number[] = [];
        let resName: string[] = [];

        if(choiceIds.indexOf(ClientSideExportGenerator.exportWebResolution) >= 0)
        {
            widths.push(this._params.webResWidth);
            heights.push(this._params.webResHeight);
            dpis.push(this._params.webDPI);
            resName.push("web");
        }
        if(choiceIds.indexOf(ClientSideExportGenerator.exportPrintResolution) >= 0)
        {
            widths.push(this._params.printResWidth);
            heights.push(this._params.printResHeight);
            dpis.push(this._params.printDPI);
            resName.push("print");
        }

        let backgroundChoiceId: string[] = [];
        if(choiceIds.indexOf(ClientSideExportGenerator.exportDrawBackgroundBlack) >= 0)
        {
            backgroundChoiceId.push(ClientSideExportGenerator.exportDrawBackgroundBlack);
        }
        else if(choiceIds.indexOf(ClientSideExportGenerator.exportDrawBackgroundWhite) >= 0)
        {
            backgroundChoiceId.push(ClientSideExportGenerator.exportDrawBackgroundWhite);
        }

        if(choiceIds.indexOf(ClientSideExportGenerator.exportContextImageFootprint) >= 0)
        {
            backgroundChoiceId.push(ClientSideExportGenerator.exportContextImageFootprint);
        }

        if(choiceIds.indexOf(ClientSideExportGenerator.exportContextImageScanPoints) >= 0)
        {
            backgroundChoiceId.push(ClientSideExportGenerator.exportContextImageScanPoints);
        }

        // What expressions we're generating maps from
        let expressionIDs = selectedExpressionIDs;
        let expressionNames = selectedExpressionNames;

        //let transform = this._transform;

        // Save the generators whose Observables we're waiting for
        let generators = [];

        for(let resPass in widths)
        {
            let viewport = new CanvasParams(widths[resPass]/dpis[resPass], heights[resPass]/dpis[resPass], dpis[resPass]);

            //let transform = new PanZoom();

            // Set the existing transform
            let transform = this._transform.clone() as PanZoom;

            transform.setCanvasParams(viewport);

            /*
            // Set this transform to show the experiment area "zoomed in"
            if(this._dataset)
            {
                transform.resetViewToRect(
                    this._dataset.locationPointBBox,
                    true
                );
            }
*/
            for(let expressionIdx in expressionIDs)
            {
                let expressionID = ClientSideExportGenerator.exportExpressionPrefix+expressionIDs[expressionIdx];
                let expressionName = expressionNames[expressionIdx];

                // Export a combined image with all elements
                generators.push(
                    this.generateExportImage(
                        "Images/"+resName[resPass]+"-"+expressionName+"-combined.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            ...backgroundChoiceId,
                            ClientSideExportGenerator.exportContextImageColourScale,
                            ClientSideExportGenerator.exportContextImagePhysicalScale,
                            // Command drawing of element maps:
                            ClientSideExportGenerator.exportContextImageElementMap,
                            // And which one
                            expressionID
                        ]
                    )
                );

                // Export just the element map
                generators.push(
                    this.generateExportImage(
                        "Images/"+resName[resPass]+"-"+expressionName+"-map.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            //...backgroundChoiceId, <-- don't provide background, the point of this is so it can be composited!
                            // Command drawing of element maps:
                            ClientSideExportGenerator.exportContextImageElementMap,
                            // And which one
                            expressionID
                        ]
                    )
                );

                // Export just the scales
                generators.push(
                    this.generateExportImage(
                        "Images/"+resName[resPass]+"-"+expressionName+"-colour-scale.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            //...backgroundChoiceId, <-- don't provide background, the point of this is so it can be composited!
                            // We ask for colour scale
                            ClientSideExportGenerator.exportContextImageColourScale,
                            // And specify which layer it's for but we are NOT commanding the drawing of element maps...
                            expressionID
                        ]
                    )
                );
            }


            if(choiceIds.indexOf(ClientSideExportGenerator.exportContextImage) >= 0)
            {
                generators.push(
                    this.generateExportImage(
                        "Context/"+resName[resPass]+"-context-image-with-scales.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            ...backgroundChoiceId,
                            ClientSideExportGenerator.exportContextImage,
                            ClientSideExportGenerator.exportContextImagePhysicalScale,
                            ClientSideExportGenerator.exportContextImageColourScale,
                        ]
                    )
                );

                // Export just the context image
                generators.push(
                    this.generateExportImage(
                        "Context/"+resName[resPass]+"-context-image.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            ...backgroundChoiceId,
                            ClientSideExportGenerator.exportContextImage,
                        ]
                    )
                );
            }

            // Just the physical scale
            generators.push(
                this.generateExportImage(
                    "Context/"+resName[resPass]+"-physical-scale.png",
                    widths[resPass], heights[resPass],
                    viewport,
                    this._drawer, transform,
                    [
                        //...backgroundChoiceId, <-- don't provide background, the point of this is so it can be composited!
                        ClientSideExportGenerator.exportContextImagePhysicalScale,
                    ]
                )
            );

            // Just the colour scale
            generators.push(
                this.generateExportImage(
                    "Context/"+resName[resPass]+"-colour-scale.png",
                    widths[resPass], heights[resPass],
                    viewport,
                    this._drawer, transform,
                    [
                        //...backgroundChoiceId, <-- don't provide background, the point of this is so it can be composited!
                        ClientSideExportGenerator.exportContextImageColourScale,
                    ]
                )
            );

            // Combined ROI image
            if(choiceIds.indexOf(ClientSideExportGenerator.exportContextImageROIs) >= 0)
            {
                // Set the ROIs where we are overriding the "visible" flag when drawing
                let roiIDs = [];
                for(let id of selectedROIs)
                {
                    roiIDs.push(ClientSideExportGenerator.exportROIPrefix+id);
                }

                generators.push(
                    this.generateExportImage(
                        "ROI/"+resName[resPass]+"-roi-with-physical-scale.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            ...backgroundChoiceId,
                            ...roiIDs,
                            ClientSideExportGenerator.exportContextImagePhysicalScale,
                            ClientSideExportGenerator.exportContextImageROIs,
                            //ClientSideExportGenerator.exportContextImageROIKey,
                        ]
                    )
                );
                
                // Export just the combined ROI image without scale
                generators.push(
                    this.generateExportImage(
                        "ROI/"+resName[resPass]+"-roi.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            ...backgroundChoiceId,
                            ...roiIDs,
                            ClientSideExportGenerator.exportContextImageROIs,
                        ]
                    )
                );

                // Exporting ROIs only
                generators.push(
                    this.generateExportImage(
                        "ROI/"+resName[resPass]+"-just-rois.png",
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            //...backgroundChoiceId, <-- don't provide background, the point of this is so it can be composited!
                            ...roiIDs,
                            ClientSideExportGenerator.exportContextImageROIs,
                        ]
                    )
                );
                /*
                // Exporting ROI key only
                generators.push(
                    this.generateExportImage(
                        widths[resPass], heights[resPass],
                        viewport,
                        this._drawer, transform,
                        [
                            new ExportDataChoice(ClientSideExportGenerator.exportContextImageROIKey, ClientSideExportGenerator.exportContextImageROIKey, true),
                        ]
                    )
                );
*/
            }
        }

        // If we're exporting values (CSV) do that too.
        // NOTE: this only applies to expression output, we don't export weight % because we want to encourage users to use the
        // "global" export button in the top toolbar (via API)
        if(choiceIds.indexOf(ClientSideExportGenerator.exportExpressionValues) >= 0)
        {
            for(let expressionIdx in expressionIDs)
            {
                let expressionID = expressionIDs[expressionIdx];
                let expressionName = expressionNames[expressionIdx];

                // Export a csv
                generators.push(this.generateExportCSV(`CSV/${expressionName}.csv`, expressionID, PredefinedROIID.AllPoints));
            }
        }

        // Export a separate CSV file for each ROI if exportROIExpressionValues is selected
        if(choiceIds.indexOf(ClientSideExportGenerator.exportROIExpressionValues) >= 0)
        {
            for(let expressionIdx in expressionIDs)
            {
                let expressionID = expressionIDs[expressionIdx];
                let expressionName = expressionNames[expressionIdx];

                selectedROIs.forEach((roi) =>
                {
                    let region = this._widgetDataService.regions.get(roi);
                    let roiName = region.name.replace(/[^a-z0-9]/gi, "_");
                    generators.push(this.generateExportCSV(`CSV/${roiName}-${expressionName}.csv`, expressionID, roi));
                });
            }
        }

        return new Observable<Blob>(
            (observer)=>
            {
                // If we're not waiting on anything to be generated, stop here
                if(generators.length <= 0)
                {
                    observer.error("There was nothing selected for export. Did you forget to pick an image resolution?");
                    return;
                }

                let all$ = combineLatest(generators);
                all$.subscribe(
                    (images: unknown[])=>
                    {
                        // Take each blob and build a zip file, which we then allow the user to save as...
                        let zip = new JSZip();
                        /*
                        zip.file("Hello.txt", "Hello World\n");

                        var img = zip.folder("images");
                        img.file("smile.gif", imgData, {base64: true});
*/

                        // First we sort them based on file name, so we can scan through them and create directories as needed
                        let sortedImages: ExportedFileData[] = [];

                        for(let item of images)
                        {
                            let image = item as ExportedFileData;
                            sortedImages.push(image);
                        }

                        sortedImages.sort(
                            (a: ExportedFileData, b: ExportedFileData)=>
                            {
                                if(a.name < b.name) { return -1; }
                                if(a.name > b.name) { return 1; }
                                return 0;
                            }
                        );

                        let currZipFolder = null;
                        let currZipFolderName: string = "";

                        for(let image of sortedImages)
                        {
                            let nameBits = image.name.split("/");
                            if(nameBits.length > 1)
                            {
                                // Create a folder if doesn't already exist
                                if(nameBits[0] != currZipFolderName)
                                {
                                    currZipFolderName = nameBits[0];
                                    currZipFolder = zip.folder(currZipFolderName);
                                }

                                // And add this file to it
                                currZipFolder.file(nameBits[1], image.blob, {base64: true});
                            }
                            else
                            {
                                // It's just a file at the root
                                zip.file(image.name, image.blob, {base64: true});
                            }
                        }

                        zip.generateAsync({type:"blob"}).then(function(content) 
                        {
                            observer.next(content);
                            observer.complete();
                        });
                    },
                    (err)=>
                    {
                        console.error(err);
                        observer.error(err);
                    }
                );
            }
        );
    }

    // Generates one image using the given drawer, and passing in the choiceId. This is a string that is specific to the drawer
    // so for example widgets can choose to respond to predefined strings in different ways, like interpreting the string as
    // an ROI ID or something
    protected generateExportImage(name: string, width: number, height: number, viewport: CanvasParams, drawer: CanvasDrawer, transform: CanvasWorldTransform, exportItemIDs: string[]): Observable<ExportedFileData>
    {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        let context = canvas.getContext("2d");

        InteractiveCanvasComponent.drawFrame(context, viewport, transform, drawer, exportItemIDs);

        // draw to canvas...
        return new Observable(
            (observer)=>
            {
                canvas.toBlob(
                    (result)=>
                    {
                        observer.next(new ExportedFileData(name, result));
                        observer.complete();
                    }//, type, quality
                );
            }
        );
    }

    protected generateExportCSV(name: string, expressionID: string, roiID: string): Observable<ExportedFileData>
    {
        return new Observable(
            (observer)=>
            {
                // Special case is RGB expressions. This is currently a "special" thing that the context image layers
                // panel does and WidgetRegionDataService does not understand this. It would seem easier to move it
                // into there, but the context image requires not just a PMCDataValues with a value for each PMC
                // but it actually needs all values from R, G and B, and allows users to control the min/max levels
                // on each channel.
                // When we came to supporting RGB CSV output, it seemed to make sense to also have this as a "special"
                // export feature here... Maybe in future this can move into WidgetRegionDataService if other widgets
                // end up needing RGB mix data.
                let csv = "";

                try
                {

                    if(RGBMixConfigService.isRGBMixID(expressionID))
                    {
                        csv = this.generateExportCSVForRGBMix(expressionID);
                    }
                    else
                    {
                        csv = this.generateExportCSVForExpression(expressionID, roiID);
                    }
                }
                catch (error)
                {
                    SentryHelper.logException(error, "generateExportCSV");
                    return error;
                }

                observer.next(new ExportedFileData(name, new Blob([csv])));
                observer.complete();
            }
        );
    }

    generateExportCSVForExpression(expressionID: string, roiID: string): string
    {
        // Run the expression
        let query: DataSourceParams[] = [];
        /*
        // Check ROI exists?
        if(roiID != PredefinedROIID.AllPoints)
        {
            let region = this._widgetDataService.regions.get(roiId);
            if(!region)
            {
                console.warn('region: '+roiId+' not found, cannot add to table');
                continue;
            }
        }
*/
        query.push(new DataSourceParams(expressionID, roiID));
        let queryData: RegionDataResults = this._widgetDataService.getData(query, false);

        if(queryData.error)
        {
            throw new Error("Failed to query CSV data for expression: "+expressionID+". "+queryData.error);
        }

        // Form a CSV string
        let csv: string = "PMC, Value\n";
        for(let val of queryData.queryResults[0].values.values)
        {
            csv += val.pmc+", ";

            if(val.isUndefined)
            {
                // We simply don't write a value if it's undefined. This seems to be the most
                // compatible with other software, as there is no "standard" way to represent
                // NULLs in CSV
                csv += "\n";
            }
            else
            {
                csv += val.value+"\n";
            }
        }

        return csv;
    }

    protected generateExportCSVForRGBMix(rgbMixID: string): string
    {
        let quantLayer: QuantificationLayer = this._widgetDataService.quantificationLoaded;

        let rgbMixes = this._rgbMixService.getRGBMixes();
        let rgbMix = rgbMixes.get(rgbMixID);

        if(!rgbMix)
        {
            throw new Error("RGB mix info not found for: "+rgbMixID);
        }

        let csv = "PMC, "+
            this._exprService.getExpressionShortDisplayName(rgbMix.red.expressionID, 15).name+", "+
            this._exprService.getExpressionShortDisplayName(rgbMix.green.expressionID, 15).name+", "+
            this._exprService.getExpressionShortDisplayName(rgbMix.blue.expressionID, 15).name+"\n";

        let exprIds = [rgbMix.red.expressionID, rgbMix.green.expressionID, rgbMix.blue.expressionID];

        let perElemData: PMCDataValues[] = [];
        let ch = 0;
        for(let exprId of exprIds)
        {
            let expr = this._exprService.getExpression(exprId);

            if(!expr)
            {
                throw new Error("Failed to find expression: "+exprId+" for channel: "+RGBUImage.channels[ch]);
            }

            let data = getQuantifiedDataWithExpression(expr.expression, quantLayer, this._dataset, this._dataset, this._dataset, this._diffractionSource, this._dataset);
            perElemData.push(data);
            //layer.generatePoints(ch, data, this._dataset);
            ch++;
        }

        let perElemAndPMCData = PMCDataValues.filterToCommonPMCsOnly(perElemData);

        // If we didn't get 3 channels, stop here
        if(perElemAndPMCData.length != 3)
        {
            throw new Error("Failed to generate RGB columns for RGB expression: "+rgbMixID);
        }

        // Run through and extract the R, G and B into our CSV
        for(let c = 0; c < perElemAndPMCData[0].values.length; c++)
        {
            if( perElemAndPMCData[0].values[c].pmc != perElemAndPMCData[1].values[c].pmc ||
                perElemAndPMCData[0].values[c].pmc != perElemAndPMCData[2].values[c].pmc )
            {
                throw new Error("Failed to generate RGB CSV for rgb mix ID: "+rgbMixID+", mismatched PMC returned for item: "+c);
            }

            csv += perElemAndPMCData[0].values[c].pmc+", "+perElemAndPMCData[0].values[c].value+", "+perElemAndPMCData[1].values[c].value+", "+perElemAndPMCData[2].values[c].value+"\n";
        }

        return csv;
    }
}
