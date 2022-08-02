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

import { ContextImageItemTransform, DataSet } from "src/app/models/DataSet";
import { LocationDataLayer } from "src/app/models/LocationData2D";
import { CanvasDrawer, CanvasDrawParameters, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { RegionManager } from "src/app/UI/context-image-view-widget/region-manager";
import { ContextImageToolHost } from "src/app/UI/context-image-view-widget/tools/tool-host";
import { Colours } from "src/app/utils/colours";


export class MainContextImageLayeredDrawer implements CanvasDrawer
{
    protected _ctx: IContextImageModel;
    protected _toolHost: ContextImageToolHost;

    constructor(ctx: IContextImageModel, toolHost: ContextImageToolHost)
    {
        this._ctx = ctx;
        this._toolHost = toolHost;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        let visibleLayers = this._ctx.layerManager.getLocationDataLayersForDraw();

        // If we want to draw the base image pixelated:
        this.drawContextImage(screenContext, visibleLayers.length);

        // TODO: decide what we're doing here:
        // - should this only draw regions if region tab showing?
        // - should it only draw layers when layers tab showing?
        // - should it only draw "all" regions when quant tab showing? Should it only draw the regions that have quants?

        // Draw regions first (?)
        this.drawRegions(screenContext, drawParams.worldTransform, this._ctx.dataset, this._ctx.regionManager, []);

        // Draw the element map layers on top
        this.drawVisibleLayers(screenContext, this._ctx.dataset, visibleLayers);

        // Draw tool UI on top
        this.drawWorldSpaceToolUIs(screenContext, drawParams);
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        this.drawScreenSpaceToolUIs(screenContext, drawParams);
    }

    protected drawContextImage(screenContext: CanvasRenderingContext2D, visibleLayerCount: number): void
    {
        screenContext.imageSmoothingEnabled = this._ctx.smoothing;

        let backgroundImage = this._ctx.contextImageItemShowingDisplay;
        if(this._ctx.contextImageItemShowing != null && backgroundImage)
        {
            MainContextImageLayeredDrawer.drawImageOrMaskWithOptionalTransform(screenContext, backgroundImage, this._ctx.contextImageItemShowing.imageDrawTransform);
        }
        else
        {
            // If we have NOTHING to draw at all, draw something saying no context image
            // This used to be just an else case, but if someone wants a PNG of what's on screen (layers, points, ROIs)
            // with no background, we allow them to do that in this scenario
            if(visibleLayerCount > 0)
            {
                return;
            }

            for(let region of this._ctx.regionManager.getRegionsForDraw())
            {
                if(region.isVisible())
                {
                    return;
                }
            }

            screenContext.save();

            // Draw something saying we have no context image. Give it a background that's bigger than our footprint
            let bbox = this._ctx.dataset.locationPointBBox.copy();
            bbox.inflate(bbox.w/4, bbox.h/4);

            screenContext.fillStyle = Colours.GRAY_90.asString();
            screenContext.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

            let center = bbox.center();
            screenContext.fillStyle = Colours.GRAY_70.asString();
            screenContext.textAlign = "center";
            screenContext.textBaseline = "middle";
            screenContext.font = (bbox.h/15)+"px Roboto";
            screenContext.fillText("No Context Image", center.x, center.y);

            screenContext.restore();
        }
    }

    static drawImageOrMaskWithOptionalTransform(screenContext: CanvasRenderingContext2D, img: HTMLImageElement, transform: ContextImageItemTransform)
    {
        let imgW = img.width;
        let imgH = img.height;

        let imgX = 0;
        let imgY = 0;

        if(transform)
        {
            // We need to take the offset/scale and transform so the position the image is drawn at shows the matched area (with aligned image)
            // in the same spot as when viewing the aligned image.

            // We calculate the offset and scale it (matched image area is likely higher res so we store a scale and apply it here)
            imgX = transform.calcXPos();
            imgY = transform.calcYPos();

            // Also scale the matched image to have the matched area at the same width/height as the aligned image
            imgW = transform.calcWidth(imgW);
            imgH = transform.calcHeight(imgH);
        }

        screenContext.drawImage(
            img,
            imgX, imgY,
            imgW, imgH
        );
    }

    protected drawWorldSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        //screenContext.save();
        for(let drawer of this._toolHost.getDrawers())
        {
            drawer.drawWorldSpace(screenContext, drawParams);
        }
        //screenContext.restore();
    }

    protected drawScreenSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        //screenContext.save();
        for(let drawer of this._toolHost.getDrawers())
        {
            drawer.drawScreenSpace(screenContext, drawParams);
        }
        //screenContext.restore();
    }

    protected drawVisibleLayers(screenContext: CanvasRenderingContext2D, dataset: DataSet, layersToDraw: LocationDataLayer[]): void
    {
    // Draw any layers we have turned on
        // NOTE: we have to draw them in reverse order, so the UI makes sense (ones
        // at top of the list overdraw the ones further down the list)

        let startIdx = layersToDraw.length-1;
        /*
        if(startIdx > 4)
        {
        // NOTE2: we only draw a few, in case someone turned them all on
            startIdx = 4;
        }
*/

        for(let c = startIdx; c >= 0; c--)
        {
            let layer = layersToDraw[c];
            layer.drawLocationData(screenContext, dataset.locationDisplayPointRadius, dataset.experimentAngleRadiansOnContextImage, dataset);
        }
    }

    protected drawRegions(screenContext: CanvasRenderingContext2D, worldTransform: CanvasWorldTransform, dataset: DataSet, manager: RegionManager, overrideRegionVisibleIDs: string[]): void
    {
        for(let region of manager.getRegionsForDraw())
        {
            // If the region ID is in the list of IDs whose visible flag we are overriding, we always draw
            // otherwise only draw if visible
            if(overrideRegionVisibleIDs.indexOf(region.roi.id) >= 0 || region.isVisible())
            {
                // Draw pixel masks first because they might be larger!
                if(region.pixelMask)
                {
                    MainContextImageLayeredDrawer.drawImageOrMaskWithOptionalTransform(screenContext, region.pixelMask, this._ctx.contextImageItemShowing.imageDrawTransform);
                }

                // Polygons only draw in PMC area
                region.drawPolygons(screenContext, worldTransform, false, null);
            }
        }
    }
}
