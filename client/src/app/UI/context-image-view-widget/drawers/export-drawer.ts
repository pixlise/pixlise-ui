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

import { CanvasDrawParameters } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { MainContextImageLayeredDrawer } from "src/app/UI/context-image-view-widget/drawers/main-drawer";
import { FootprintDrawer } from "src/app/UI/context-image-view-widget/drawers/footprint-drawer";
import {getSchemeColours, IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { ContextImageToolHost } from "src/app/UI/context-image-view-widget/tools/tool-host";
import { ClientSideExportGenerator } from "src/app/UI/atoms/export-data-dialog/client-side-export";


// Special drawer used for generating export images, this is told what to draw in the constructor so when the draw call
// happens it just relies on that

export class ExportDrawer extends MainContextImageLayeredDrawer
{
    // What to draw...
    protected _backgroundColour: string = ""; // empty=not drawn!

    protected _drawContextImage: boolean = false;
    protected _drawPhysicalScale: boolean = false;

    protected _drawLayerID: string = "";
    protected _drawElementMap: boolean = false;
    protected _drawColourScale: boolean = false;

    protected _drawROI: boolean = false;
    protected _drawROIVisibleFlagOverrides: string[] = [];

    protected _drawFootprint: boolean = false;
    protected _drawPoints: boolean = false;

    private _footprintDrawer: FootprintDrawer = null;

    constructor(
        ctx: IContextImageModel,
        toolHost: ContextImageToolHost,
    )
    {
        super(ctx, toolHost);

        this._footprintDrawer = new FootprintDrawer(ctx);
    }

    protected parseChoices(drawParams: CanvasDrawParameters): void
    {
        if(drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportDrawBackgroundBlack) >= 0)
        {
            this._backgroundColour = "#000000";
        }
        else if(drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportDrawBackgroundWhite) >= 0)
        {
            this._backgroundColour = "#ffffff";
        }
        else
        {
            this._backgroundColour = "";
        }
        
        this._drawContextImage = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImage) >= 0;

        this._drawElementMap = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImageElementMap) >= 0;

        this._drawPhysicalScale = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImagePhysicalScale) >= 0;
        this._drawColourScale = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImageColourScale) >= 0;

        this._drawROI = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImageROIs) >= 0;

        this._drawFootprint = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImageFootprint) >= 0;
        this._drawPoints = drawParams.exportItemIDs.indexOf(ClientSideExportGenerator.exportContextImageScanPoints) >= 0;

        // Find if we have anything with the expression prefix, if so, we read that as our drawLayerID
        this._drawLayerID = ClientSideExportGenerator.getExportExpressionID(drawParams.exportItemIDs);
        this._drawROIVisibleFlagOverrides = ClientSideExportGenerator.getExportROIIDs(drawParams.exportItemIDs);
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        this.parseChoices(drawParams);

        if(this._backgroundColour.length > 0)
        {
            screenContext.save();
            screenContext.fillStyle = this._backgroundColour;
            screenContext.setTransform(drawParams.drawViewport.dpi, 0, 0, drawParams.drawViewport.dpi, 0, 0);
            screenContext.fillRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
            screenContext.restore();
        }

        if(this._drawContextImage)
        {
            this.drawContextImage(screenContext, !this._drawLayerID ? 0 : 1);
        }

        if(this._drawLayerID)
        {
            let dataset = this._ctx.dataset;
            let layer = this._ctx.layerManager.getLayerById(this._drawLayerID);
            if(layer && this._drawElementMap)
            {
                // Layer may not be visible in UI, and hence may not have any data. Ensure this is not the case
                let prevOpacity = layer.opacity;
                let prevVis = layer.visible;

                let prevWasVisible = layer.isVisible();
                if(!prevWasVisible)
                {
                    this._ctx.layerManager.setLayerVisibility(this._drawLayerID, 1, true, []);
                }
                
                // Now draw, should work!
                layer.drawLocationData(screenContext, dataset.locationDisplayPointRadius, dataset.experimentAngleRadiansOnContextImage, dataset);

                if(!prevWasVisible)
                {
                    // Restore prev state
                    this._ctx.layerManager.setLayerVisibility(this._drawLayerID, prevOpacity, prevVis, []);
                }
            }
        }

        if(this._drawROI)
        {
            // Force region polygon generation to ensure there is one there to draw
            this._ctx.regionManager.forcePolygonGeneration(this._drawROIVisibleFlagOverrides);

            this.drawRegions(screenContext, drawParams.worldTransform, this._ctx.dataset, this._ctx.regionManager, this._drawROIVisibleFlagOverrides);
        }

        if(this._drawFootprint)
        {
            const colorScheme = getSchemeColours(this._ctx.pointBBoxColourScheme);
            const innerColor = colorScheme[0].asString();
            this._footprintDrawer.drawFootprint(screenContext, 0, null, innerColor);
        }

        if(this._drawPoints)
        {
            for(let drawer of this._toolHost.getDrawers())
            {
                drawer.drawWorldSpace(screenContext, drawParams);
            }
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        this.parseChoices(drawParams);

        if(this._drawColourScale)
        {
            let drawer = this._toolHost.getMapColourScaleDrawer();
            if(drawer)
            {
                drawer.drawScreenSpace(screenContext, drawParams);
            }
            else 
            {
                console.error("Tried drawing colour scale, but none available");
            }
        }

        if(this._drawPhysicalScale)
        {
            let drawer = this._toolHost.getPhysicalScaleDrawer();
            drawer.drawScreenSpace(screenContext, drawParams);
        }
    }
}
