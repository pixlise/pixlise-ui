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

import { BeamSelection } from "src/app/models/BeamSelection";
import { Rect } from "src/app/models/Geometry";
import { PixelSelection } from "src/app/models/PixelSelection";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { FootprintDrawer } from "src/app/UI/context-image-view-widget/drawers/footprint-drawer";
import { getSchemeColours, IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours, RGBA } from "src/app/utils/colours";
import { drawEmptyCircle, drawFilledCircle, drawPlusCoordinates } from "src/app/utils/drawing";



export enum ContextImageToolId
{
    DRAW_LINE,
    ZOOM,
    ROTATE,
    PAN,
    SELECT_LINE,
    SELECT_COLOUR,
    SELECT_LASSO,
    SELECT_POINT,
    PMC_INSPECTOR, // UNUSED as of redesign Sept 1 2020. TODO: remove this!
}

export interface IToolHost
{
    //springActivate(id: ContextImageToolId): void;
    setCursor(cursor: CursorId): void;
    notifyToolStateChanged(): void;
}

export class BaseContextImageTool implements CanvasInteractionHandler, CanvasDrawer
{
    constructor(
        protected _id: ContextImageToolId,
        protected _ctx: IContextImageModel,
        protected _host: IToolHost,
        public toolTip: string,
        public buttonIcon: string)
    {
    }

    activate(): void
    {
    }

    deactivate(): void
    {
    }

    get id(): ContextImageToolId
    {
        return this._id;
    }

    // CanvasInteractionHandler
    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        return CanvasInteractionResult.neither;
    }

    keyEvent(event: CanvasKeyEvent): CanvasInteractionResult
    {
        return CanvasInteractionResult.neither;
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Default is do nothing...
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Default is do nothing...
    }

    // Internal drawing helpers
    private defaultLineWidth = 1;
    private defaultPointSize = 1;

    protected getDrawLineWidth(scaleFactor: number = 2): number
    {
        return this.defaultLineWidth*scaleFactor/this._ctx.transform.scale.x;
    }

    // Assumption: The result of this will be used in "worldspace" drawing, so will be multiplied by zoom factor...
    protected drawPointRadius(scaleFactor: number = 1): number
    {
        return this._ctx.dataset.mmToContextImageSpacePixelSize(this._ctx.mmBeamRadius);
    }

    protected getAddModeColour(): string
    {
        return Colours.CONTEXT_PURPLE.asString();
    }

    protected getModeColour(): string
    {
        if(this._ctx.selectionModeAdd)
        {
            return this.getAddModeColour();
        }
        return Colours.ORANGE.asString();
    }

    protected getToolColour(): string
    {
        return this.getToolColourRaw().asString();
    }

    protected getToolColourRaw(): RGBA
    {
        return this.getPrimaryColour();
    }

    protected getPrimaryColour(): RGBA
    {
        return getSchemeColours(this._ctx.pointColourScheme)[0];
    }

    protected getSecondaryColour(): RGBA
    {
        return getSchemeColours(this._ctx.pointColourScheme)[1];
    }

    protected drawRoundedRect(screenContext: CanvasRenderingContext2D, rect: Rect, cornerRadius: number): void
    {
        screenContext.beginPath();
        screenContext.moveTo(rect.x+cornerRadius, rect.y);

        screenContext.arcTo(rect.maxX(), rect.y, rect.maxX(), rect.maxY(), cornerRadius);
        screenContext.arcTo(rect.maxX(), rect.maxY(), rect.x, rect.maxY(), cornerRadius);
        screenContext.arcTo(rect.x, rect.maxY(), rect.x, rect.y, cornerRadius);
        screenContext.arcTo(rect.x, rect.y, rect.maxX(), rect.y, cornerRadius);
        screenContext.stroke();
    }

    protected drawFootprint(screenContext: CanvasRenderingContext2D): void
    {
        let dataset = this._ctx.dataset;

        let clrs = getSchemeColours(this._ctx.pointBBoxColourScheme);
        const clrInner = clrs[0].asString();
        const clrOuter = clrs[1].asString();

        const lineWidth = 2 / this._ctx.transform.scale.x;

        const innerInflate = 0;
        const outerInflate = lineWidth;

        screenContext.lineWidth = lineWidth;

        let center = this._ctx.dataset.locationPointBBox.center();

        let footprintDrawer = new FootprintDrawer(this._ctx);

        footprintDrawer.drawFootprint(screenContext, innerInflate, null, clrInner);
        footprintDrawer.drawFootprint(screenContext, outerInflate, null, clrOuter);
    }

    // The actual selectable locations, small circles (currently blue)
    // We draw these a little faded out to not interfere too much
    protected drawSelectableLocations(
        screenContext: CanvasRenderingContext2D,
        excludeIdx: number,
        drawBBox: boolean,
        drawUnselectedPts: boolean,
        drawSelectedPts: boolean): void
    {
        if(drawBBox)
        {
            this.drawFootprint(screenContext);
        }

        let dataset = this._ctx.dataset;

        let sel = this._ctx.selectionService.getCurrentSelection();
        let radius = this.drawPointRadius();
        /*        if(radius < 3)
        {
            radius = 3;
        }*/

        // We're drawing them as small lines, use the default line width
        screenContext.lineWidth = this.getDrawLineWidth();

        // Get colours - we have a transparent version for drawing the filled transparent (unselected) circles
        let clrDataPoint = this.getSecondaryColour();
        let clrMissingDataStr = Colours.BLACK.asStringWithA(0.7);

        let lastSetColour: RGBA = null;

        // Draw the unselected points as transparent beam sized circle with a solid small circle in the middle
        if(drawUnselectedPts)
        {
            // Make a list of unselected location indexes
            let unselectedLocationIndexes: number[] = [];

            // If we encounter anything with missing data, we draw it differently here...
            screenContext.strokeStyle = clrMissingDataStr;
            screenContext.lineWidth = this.getDrawLineWidth()*1.5;

            for(let idx = 0; idx < dataset.locationPointCache.length; idx++)
            {
                let loc = dataset.locationPointCache[idx];
                if(idx != excludeIdx && loc && loc.coord)
                {
                    if(loc.hasMissingData)
                    {
                        // Just draw it here as an empty point
                        drawEmptyCircle(screenContext, loc.coord, radius);
                    }
                    else if(!sel.beamSelection.locationIndexes.has(idx))
                    {
                        unselectedLocationIndexes.push(idx);
                    }
                }
            }

            screenContext.lineWidth = this.getDrawLineWidth();

            // First the transparent backgrounds...
            for(let unselIdx of unselectedLocationIndexes)
            {
                let loc = dataset.locationPointCache[unselIdx];

                lastSetColour = this.setPointColour(screenContext, loc.PMC, clrDataPoint, true, lastSetColour);
                drawFilledCircle(screenContext, loc.coord, radius);
            }

            // Now solid inner shapes
            let innerRadius = radius/3;
            lastSetColour = null;

            for(let unselIdx of unselectedLocationIndexes)
            {
                let loc = dataset.locationPointCache[unselIdx];

                lastSetColour = this.setPointColour(screenContext, loc.PMC, clrDataPoint, false, lastSetColour);

                if(loc.hasDwellSpectra)
                {
                    screenContext.beginPath();
                    drawPlusCoordinates(screenContext, loc.coord, radius*2);
                    screenContext.fill();
                }
                else
                {
                    drawFilledCircle(screenContext, loc.coord, innerRadius);
                }
            }
        }

        // Now draw selected indexes (using the list of location indexes in selection). These are solid empty circles
        if(drawSelectedPts)
        {
            lastSetColour = null;

            for(let selIdx of sel.beamSelection.locationIndexes)
            {
                let loc = dataset.locationPointCache[selIdx];
                if(selIdx != excludeIdx && loc && loc.coord)
                {
                    lastSetColour = this.setPointColour(screenContext, loc.PMC, clrDataPoint, false, lastSetColour);
                    if(loc.hasDwellSpectra)
                    {
                        screenContext.beginPath();
                        drawPlusCoordinates(screenContext, loc.coord, radius*2);
                        screenContext.stroke();
                    }
                    else
                    {
                        drawEmptyCircle(screenContext, loc.coord, radius);
                    }
                }
            }
        }
    }

    protected setPointColour(screenContext: CanvasRenderingContext2D, pmc: number, defaultColour: RGBA, makeTransparent: boolean, lastColour: RGBA): RGBA
    {
        let clr: RGBA = defaultColour;

        let clrForPMC = this._ctx.drawPointColours.get(pmc);
        if(clrForPMC != undefined)
        {
            clr = clrForPMC;
        }

        // At this point we can early-out
        if(lastColour != null && clr.equals(lastColour))
        {
            return lastColour;
        }

        let clrStr: string = "";

        // If we need to make it transparent, do so
        if(makeTransparent)
        {
            clrStr = clr.asStringWithA(0.15);
        }
        else
        {
            clrStr = clr.asString();
        }

        screenContext.fillStyle = clrStr;
        screenContext.strokeStyle = clrStr;

        return clr;
    }

    // Applies the selectedIdxs to the applyToSelectedIdxs depending on the mode (add or subtract)
    // Normally if applyToSelectedIdxs is left as NULL it will use the existing points in the selection
    // but this provides the ability to override that and apply selection to a previous snapshot of
    // selected idxs.
    protected applyToSelection(
        selectedLocationIdxs: Set<number>,
        applyToSelectedLocationIdxs: Set<number> = null,
        forceAdd: boolean = false,
        pixels: Set<number> = new Set<number>()
    ): void
    {
        let selSvc = this._ctx.selectionService;

        // Handle PMC selection
        let toSet = new Set<number>();

        if(applyToSelectedLocationIdxs == null)
        {
            applyToSelectedLocationIdxs = selSvc.getCurrentSelection().beamSelection.locationIndexes;
        }

        // If in add mode, we need to see what's already selected and combine it with what we're selecting
        if(forceAdd || this._ctx.selectionModeAdd)
        {
            if(applyToSelectedLocationIdxs)
            {
                // Combine existing with what we're adding
                toSet = new Set<number>([...applyToSelectedLocationIdxs, ...selectedLocationIdxs]);
            }
            else
            {
                // Nothing selected yet, so just use ours directly
                toSet = selectedLocationIdxs;
            }
        }
        // If in subtract mode, we need to remove our selection from the existing points (if any)
        else if(applyToSelectedLocationIdxs)
        {
            for(let idx of applyToSelectedLocationIdxs)
            {
                // If this selected idx is in our list, don't add it to the new one
                if(!selectedLocationIdxs.has(idx))
                {
                    toSet.add(idx);
                }
            }
        }

        // Handle pixel selection
        let pixelSel = PixelSelection.makeEmptySelection();
        if(this._ctx.contextImageItemShowing && this._ctx.contextImageItemShowing.rgbuSourceImage)
        {
            const imgWidth = this._ctx.contextImageItemShowing.rgbuSourceImage.r.width;
            const imgHeight = this._ctx.contextImageItemShowing.rgbuSourceImage.r.height;

            let currSel = selSvc.getCurrentSelection();
            let currSelPixels = currSel.pixelSelection.selectedPixels;

            // If we're doing additive selection, add otherwise subtract
            if(this._ctx.selectionModeAdd)
            {
                // Add all the existing pixels in selection
                for(let p of currSelPixels)
                {
                    pixels.add(p);
                }
            }
            else
            {
                // Make these subtract from all pixels
                let difference = new Set(
                    [...currSelPixels].filter(x => !pixels.has(x))
                );

                pixels = difference;
            }

            pixelSel = new PixelSelection(this._ctx.dataset, pixels, imgWidth, imgHeight, this._ctx.contextImageItemShowing.rgbuSourceImage.path);
        }

        selSvc.setSelection(
            this._ctx.dataset,
            new BeamSelection(this._ctx.dataset, toSet),
            pixelSel
        );
    }
}
