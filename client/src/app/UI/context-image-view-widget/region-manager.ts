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

import { ReplaySubject } from "rxjs";
import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { Point, Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/roi";
import { roiLayerVisibility } from "src/app/services/view-state.service";
import { RegionData, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { RGBA } from "src/app/utils/colours";
import { alphaBytesToImage } from "src/app/utils/drawing";




//import Delaunator from 'delaunator';


export class RegionChangeInfo
{
    constructor(
        public needSave: boolean,
        public reason: string,
        public regions: RegionLayerInfo[]
    )
    {
    }
}

export class RegionDisplayPolygon
{
    private _polygonBBox: Rect;
    private _holeBBoxes: Rect[] = [];

    constructor(
        public boundaryPoints: Point[],
        public holePolygons: Point[][]
    )
    {
        this.updateBBoxes();
    }

    get polygonBBox(): Rect
    {
        return this._polygonBBox;
    }

    get holeBBoxes(): Rect[]
    {
        return this._holeBBoxes;
    }

    updateBBoxes(): void
    {
        this._holeBBoxes = [];

        if(this.boundaryPoints.length <= 0)
        {
            this._polygonBBox = new Rect(0, 0, 0, 0);
            return;
        }

        // Generate from the points we have
        this._polygonBBox = new Rect(this.boundaryPoints[0].x, this.boundaryPoints[0].y, 0, 0);
        this._polygonBBox.expandToFitPoints(this.boundaryPoints);

        for(let hole of this.holePolygons)
        {
            let holeBBox: Rect = new Rect(0, 0, 0, 0);
            if(hole.length > 0)
            {
                holeBBox = new Rect(hole[0].x, hole[0].y, 0, 0);
                holeBBox.expandToFitPoints(hole);
            }
            this._holeBBoxes.push(holeBBox);
        }
    }
}

export class RegionLayerInfo
{
    constructor(
        public roi: RegionData,
        public visible: boolean,
        public opacity: number,
        public polygons: RegionDisplayPolygon[],
        public pixelMask: HTMLImageElement
    )
    {
    }

    isVisible(): boolean
    {
        return this.visible && this.opacity > 0.05;
    }

    drawPolygons(screenContext: CanvasRenderingContext2D, worldTransform: CanvasWorldTransform, drawOutline: boolean, colourOverride: RGBA): void
    {
        if(!this.roi.colour)
        {
            return;
        }

        let drawColour = colourOverride;
        if(!drawColour)
        {
            drawColour = RGBA.fromWithA(this.roi.colour, 0.8);
        }
        //drawOutline = true;
        let opacityMult = 1;
        if(drawOutline)
        {
            opacityMult = 0.6;
            screenContext.strokeStyle = drawColour.asStringWithA(this.opacity);
            screenContext.lineWidth = 2/worldTransform.getScale().x;
        }
        screenContext.fillStyle = drawColour.asStringWithA(this.opacity*opacityMult);

        for(let poly of this.polygons)
        {
            this.drawPolygon(screenContext, poly);

            screenContext.fill();

            if(drawOutline)
            {
                screenContext.stroke();
            }
        }
    }

    private drawPolygon(ctx: CanvasRenderingContext2D, polygon: RegionDisplayPolygon): void
    {
        ctx.beginPath();

        // Draw the polygon
        ctx.moveTo(polygon.boundaryPoints[0].x, polygon.boundaryPoints[0].y);

        for(let c = 1; c < polygon.boundaryPoints.length; c++)
        {
            ctx.lineTo(polygon.boundaryPoints[c].x, polygon.boundaryPoints[c].y);
        }

        ctx.closePath();

        // Draw holes inside the polygon

        for(let hole of polygon.holePolygons)
        {
            ctx.moveTo(hole[0].x, hole[0].y);

            for(let c = 1; c < hole.length; c++)
            {
                ctx.lineTo(hole[c].x, hole[c].y);
            }

            ctx.closePath();
        }
    }
}


export class RegionManager
{
    private _dataset: DataSet = null;
    private _regions: RegionLayerInfo[] = [];
    private _regions$ = new ReplaySubject<RegionChangeInfo>(1);

    private _lastViewStateROIs: roiLayerVisibility[] = [];
    private _lastContextImageName: string = "";
    private _lastContextWidth: number = 0;
    private _lastContextHeight: number = 0;

    constructor(
        private _widgetDataService: WidgetRegionDataService
    )
    {
    }

    setDataset(dataset: DataSet): void
    {
        this._dataset = dataset;
        this.regenerate();
    }

    get regions$(): ReplaySubject<RegionChangeInfo>
    {
        return this._regions$;
    }

    getDisplayedRegions(regions: RegionLayerInfo[]): RegionLayerInfo[]
    {
        let result: RegionLayerInfo[] = [];

        for(let region of regions)
        {
            if(!PredefinedROIID.isPredefined(region.roi.id))
            {
                result.push(region);
            }
        }

        // Sort regions alphabetically
        result.sort((a, b) => (a.roi.name.localeCompare(b.roi.name)));
        return result;
    }

    widgetDataUpdated(updReason: WidgetDataUpdateReason): void
    {
        this.regenerate();
    }

    notifyContextImageSwitched(contextImgShowing: ContextImageItem): void
    {
        if(contextImgShowing && contextImgShowing.rgbuSourceImage)
        {
            this._lastContextImageName = contextImgShowing.path;
            this._lastContextWidth = contextImgShowing.rgbuSourceImage.r.width;
            this._lastContextHeight = contextImgShowing.rgbuSourceImage.r.height;
        }
        else
        {
            this._lastContextImageName = "";
            this._lastContextWidth = 0;
            this._lastContextHeight = 0;
        }

        this.regenerate();
    }

    viewStateLoaded(rois: roiLayerVisibility[]): void
    {
        this._lastViewStateROIs = [];
        if(rois)
        {
            this._lastViewStateROIs = Array.from(rois);
        }
        this.regenerate();
    }

    getRegionsAsROILayerVisibilityToSave(): roiLayerVisibility[]
    {
        let result: roiLayerVisibility[] = [];
        for(let region of this._regions)
        {
            result.push(new roiLayerVisibility(region.roi.id, region.opacity, region.visible));
        }

        // Save here as the last known view state of ROIs, as this is what will be saved in view state API
        this._lastViewStateROIs = Array.from(result);

        return result;
    }

    setRegionVisibility(roiID: string, opacity: number, visible: boolean): boolean
    {
        // Set the changes in the layer & notify out...
        let idx = this.getRegionIdx(roiID);
        if(idx == -1)
        {
            console.warn("setRegionVisibility called with unknown region id: "+roiID);
            return false;
        }

        let region = this._regions[idx];
        if(opacity > 0.05 && visible && !region.roi.colour)
        {
            console.warn("setRegionVisibility can't set region: "+roiID+" visible because no colour is assigned");
            return false;
        }

        region.opacity = opacity;
        region.visible = visible;

        // We only used to generate if visible, then quantification view on context image required all to be drawable
        // but we've removed that feature now! Re-enabled this check here, might regret it
        if(region.isVisible())
        {
            region.polygons = this.makeRegionPolygons(region.roi.locationIndexes, roiID);
            if(region.isVisible())
            {
                region.pixelMask = this.makePixelMask(region.roi.pixelIndexes, roiID, region.roi.colour);
            }
        }

        this.publishChange(true, "setRegionVisibility");
        return true;
    }
    /*
    setRegionColour(roiID: string, colourRGB: RGBA): void
    {
        let idx = this.getRegionIdx(roiID);
        if(idx == -1)
        {
            console.warn('setRegionColour called with unknown region id: '+roiID);
            return;
        }

        this._regions[idx].roi.colour = colourRGB;

        // No need to save this, it's saved in view state separately (and we're probably called by that!)
        this.publishChange(false, 'setRegionColour');
    }
*/
    getRegionsForDraw(): RegionLayerInfo[]
    {
        return this._regions;
    }

    bringToFront(roiID: string): void
    {
        // Remove it & add at the end of the list (so it's drawn last)
        let idx = this.getRegionIdx(roiID);
        if(idx >= 0)
        {
            let region = this._regions[idx];
            this._regions.splice(idx, 1);
            this._regions.push(region);

            this.publishChange(true, "bringToFront");
        }
    }

    protected publishChange(needSave: boolean, reason: string): void
    {
        this._regions$.next(new RegionChangeInfo(needSave, reason, this._regions));
    }

    private getRegionIdx(roiID: string): number
    {
        for(let c = 0; c < this._regions.length; c++)
        {
            if(roiID == this._regions[c].roi.id)
            {
                return c;
            }
        }
        return -1;
    }

    private regenerate(): void
    {
        let t0 = performance.now();

        // First, lets find what states we'll need to preserve. The view state is the original source
        // but if we already have that region stored, use that state
        let storedOpacity: Map<string, number> = new Map<string, number>();
        let storedVisibility: Map<string, boolean> = new Map<string, boolean>();

        for(let viewROI of this._lastViewStateROIs)
        {
            storedOpacity.set(viewROI.roiID, viewROI.opacity);
            storedVisibility.set(viewROI.roiID, viewROI.visible);
        }

        // Overwrite with any existing state in regions
        for(let region of this._regions)
        {
            storedOpacity.set(region.roi.id, region.opacity);
            storedVisibility.set(region.roi.id, region.visible);
        }

        this._regions = [];

        // Run through all ROIs, and generate a layer info for each, add view state if we have it
        for(let [roiID, region] of this._widgetDataService.regions)
        {
            let opacity = storedOpacity.get(roiID);
            if(opacity == undefined)
            {
                opacity = 1;
            }
            let visible = storedVisibility.get(roiID);
            if(visible == undefined)
            {
                visible = false;
            }

            let newRegion = new RegionLayerInfo(region, visible, opacity, [], null);

            if(newRegion.isVisible())
            {
                // If region has PMCs, generate a polygon to draw
                if(region.locationIndexes.length > 0)
                {
                    newRegion.polygons = this.makeRegionPolygons(region.locationIndexes, roiID);
                }

                // If region has pixels, generate an image mask
                if(region.pixelIndexes.size > 0 && region.imageName == this._lastContextImageName)
                {
                    newRegion.pixelMask = this.makePixelMask(region.pixelIndexes, roiID, region.colour);
                }
            }

            this._regions.push(newRegion);
        }

        let t1 = performance.now();
        console.log("Context RegionManager regenerate took: "+(t1-t0).toLocaleString()+"ms");

        this.publishChange(false, "regenerate");
    }

    private makeRegionPolygons(locationIndexes: number[], printableROIID: string): RegionDisplayPolygon[]
    {
        let polys = [];

        if(!this._dataset)
        {
            return polys;
        }

        let t0 = performance.now();

        // Make all the polys
        polys = this.getPolygonsForLocations(locationIndexes);
        //polys = this.makePolysForCoords(locationIndexes);

        let t1 = performance.now();
        console.log("  makePolysForCoords generated for "+printableROIID+", "+polys.length+" polygons, took "+(t1-t0).toLocaleString()+"ms");

        return polys;
    }

    private makePixelMask(pixelIndexes: Set<number>, printableROIID: string, roiColour: RGBA): HTMLImageElement
    {
        // If we have been informed of a context images dimensions, we can generate a mask image
        if(this._lastContextWidth <= 0 || this._lastContextHeight <= 0)
        {
            return null;
        }

        const pixelCount = this._lastContextWidth*this._lastContextHeight;
        let maskBytes = new Uint8Array(pixelCount);

        for(let idx of pixelIndexes)
        {
            maskBytes[idx] = 192;
        }

        return alphaBytesToImage(maskBytes, this._lastContextWidth, this._lastContextHeight, roiColour);
    }

    private getPolygonsForLocations(locationIndexes: number[]): RegionDisplayPolygon[]
    {
        let result: RegionDisplayPolygon[] = [];

        for(let locIdx of locationIndexes)
        {
            if(this._dataset.locationPointCache[locIdx] && this._dataset.locationPointCache[locIdx].polygon.length > 0)
            {
                result.push(new RegionDisplayPolygon(this._dataset.locationPointCache[locIdx].polygon, []));
            }
        }

        return result;
    }
    /*
    private makePolysForCoords(locationIndexes: number[]): RegionDisplayPolygon[]
    {
        let result: RegionDisplayPolygon[] = [];

//let t0 = performance.now();

        // Prepare points for triangulation
        const locShapeSize = this._dataset.locationDisplayPointRadius*0.2;
        let pts: number[][] = [];

        for(let idx of locationIndexes)
        {
            let loc = this._dataset.locationPointCache[idx];
            if(loc && loc.coord)
            {
                pts.push(...this.makePointsForPMC(loc.coord, locShapeSize));
            }
        }

//let t1 = performance.now();
//console.log('prepare took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;

        // Triangulate
        const delaunay = Delaunator.from(pts);
        let triIdxs: number[] = Array.from(delaunay.triangles);
        let halfEdges: number[] = Array.from(delaunay.halfedges);

//console.log(pts);

//console.log('raw triangulation');
//console.log(triIdxs);
//console.log(halfEdges);

//t1 = performance.now();
//console.log('triangulate took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;

        this.removePointSpanningTriangles(pts, triIdxs, halfEdges);

//t1 = performance.now();
//console.log('remove spanning tris took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;

//console.log(triIdxs);
//console.log(halfEdges);

//console.log('building outer edge lookup');
        // Find outer edges and store that loop of points (using half-edge structure)
        let outerEdges = this.buildOuterEdgeLookup(triIdxs, halfEdges);

//t1 = performance.now();
//console.log('outer edge lookup took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;

//console.log(outerEdges);
//console.log('building poly idxs');

        let hulls: Point[][] = this.buildConcaveHullsForTriangles(outerEdges, pts);

//t1 = performance.now();
//console.log('concave hulls took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;
//console.log(JSON.stringify(hulls));
        // Run through each polygon and see if any others are holes within it. Add holes to this poly and store, otherwise just leave it in place
        for(let c = 0; c < hulls.length; c++)
        {
            let holeIdxs = this.findHolesFor(c, hulls);
//console.log('hull '+c+', found holes: '+JSON.stringify(holeIdxs));
            if(holeIdxs.length > 0)
            {
                let regionPoly = new RegionDisplayPolygon(hulls[c], []);

                for(let i = 0; i < holeIdxs.length; i++)
                {
                    let holeIdx = holeIdxs[i];
                    regionPoly.holePolygons.push(hulls[holeIdx]);
                    hulls[holeIdx] = null; // no need to look at this again in hulls...
                }

                regionPoly.updateBBoxes();
                result.push(regionPoly);
                hulls[c] = null;
            }
        }

        // Add any remaining polygons just as polys without holes
        for(let hull of hulls)
        {
            if(hull != null)
            {
                result.push(new RegionDisplayPolygon(hull, []));
            }
        }

//t1 = performance.now();
//console.log('build result took '+(t1 - t0).toLocaleString() + 'ms');
//t0 = t1;
//console.log(result);
        return result;
    }

    private findHolesFor(idx: number, hulls: Point[][]): number[]
    {
        let holeIdxs: number[] = [];

        if(hulls[idx] != null)
        {
            for(let c = 0; c < hulls.length; c++)
            {
                if(c != idx && hulls[c] != null)
                {
                    // Check if a point in hulls[c] is within poly[idx] - if so, we found a hole for poly[idx]
                    if(ptWithinPolygon(hulls[c][0], hulls[idx], null))
                    {
                        holeIdxs.push(c);
                    }
                }
            }
        }

        return holeIdxs;
    }

    // Adds a small shape of points for each PMC, so if we get lines, they have thickness and still get triangulated
    private makePointsForPMC(pmcPos: Point, locShapeSize: number): number[][]
    {
        let result: number[][] = [];

        const locShapeSmallSize = locShapeSize/2.5;

        // Just adding the raw point
        //result.push([pmcPos.x, pmcPos.y]);
/*
        // Rect
        result.push([pmcPos.x-locShapeSize, pmcPos.y-locShapeSize]);
        result.push([pmcPos.x+locShapeSize, pmcPos.y-locShapeSize]);
        result.push([pmcPos.x+locShapeSize, pmcPos.y+locShapeSize]);
        result.push([pmcPos.x-locShapeSize, pmcPos.y+locShapeSize]);
* /
        // Octagon
        result.push([pmcPos.x-locShapeSize, pmcPos.y-locShapeSmallSize]);
        result.push([pmcPos.x-locShapeSize, pmcPos.y+locShapeSmallSize]);

        result.push([pmcPos.x+locShapeSize, pmcPos.y-locShapeSmallSize]);
        result.push([pmcPos.x+locShapeSize, pmcPos.y+locShapeSmallSize]);

        result.push([pmcPos.x-locShapeSmallSize, pmcPos.y-locShapeSize]);
        result.push([pmcPos.x+locShapeSmallSize, pmcPos.y-locShapeSize]);

        result.push([pmcPos.x-locShapeSmallSize, pmcPos.y+locShapeSize]);
        result.push([pmcPos.x+locShapeSmallSize, pmcPos.y+locShapeSize]);

        return result;
    }

    private removePointSpanningTriangles(pts: number[][], triIdxs: number[], halfEdges: number[]): void
    {
        // Filter out triangles with edges that are too long - this is needed because delaunay generates a convex hull, and our shapes are
        // likely not convex, and can contain holes. These triangles will be cut out.
        let maxEdgeLengthSquared = this._dataset.locationDisplayPointRadius*1.2; // just makes it a bit bigger than display radius because that
                                                                                 // radius is only a guess of a good fitting distance between
                                                                                 // points (for element map display)
        maxEdgeLengthSquared = maxEdgeLengthSquared*maxEdgeLengthSquared;

        for(let c = 0; c < triIdxs.length; c+=3)
        {
            // Form triangle
            let thisTriIdxs = [ triIdxs[c], triIdxs[c+1], triIdxs[c+2] ];
            let triPts = [];
            for(let i = 0; i < 3; i++)
            {
                triPts.push(new Point(pts[thisTriIdxs[i]][0], pts[thisTriIdxs[i]][1]));
            }

            // Only add if it's not got edges that are too long (in which case it's connecting regions that shouldn't be connected)
            let valid = true;

            for(let i = 0; i < 3; i++)
            {
                let vec = getVectorBetweenPoints(triPts[i], triPts[(i+1)%3]);
                let sqLen = vec.x*vec.x+vec.y*vec.y;
                if(sqLen > maxEdgeLengthSquared)
                {
                    valid = false;
                    break;
                }
            }

            if(!valid)
            {
//console.log('invalidating triangle:');
//console.log(thisTriIdxs);
                // triangle not valid, so remove it from half-edges array
                // mark the other half-edges as "outer" because we've just made a hole
                for(let i = 0; i < halfEdges.length; i++)
                {
                    if(halfEdges[i] >= c && halfEdges[i] <= (c+2))
                    {
                        halfEdges[i] = -1;
                    }
                    else if(halfEdges[i] > (c+2))
                    {
                        halfEdges[i] -= 3;
                    }
                }
                halfEdges.splice(c, 3);
                triIdxs.splice(c, 3);
                c -= 3;
            }
        }
    }

    private buildOuterEdgeLookup(triIdxs: number[], halfEdges: number[]): Map<number, number>
    {
        // Find outer edges and store that loop of points (using half-edge structure)
        let outerEdges = new Map<number, number>();

        for(let c = 0; c < halfEdges.length; c+=3)
        {
            if(halfEdges[c] == -1)
            {
                outerEdges.set(triIdxs[c], triIdxs[c+1]);
            }
            if(halfEdges[c+1] == -1)
            {
                outerEdges.set(triIdxs[c+1], triIdxs[c+2]);
            }
            if(halfEdges[c+2] == -1)
            {
                outerEdges.set(triIdxs[c+2], triIdxs[c]);
            }
        }

        return outerEdges;
    }

    private buildConcaveHullsForTriangles(outerEdges: Map<number, number>, pts: number[][]): Point[][]
    {
        let result: Point[][] = [];

        while(outerEdges.size > 0)
        {
            let polyIdxs = [];

            let c = 0;
            const edgeCount = outerEdges.size; // prevent infinite loop/browser blowup. This is just a safety
                                               // stop, normal/valid edge data shouldn't cause infinite loops
            let startIdx = outerEdges.keys().next().value;
            let initialIdx = startIdx;

            let endIdx = outerEdges.get(initialIdx);
            outerEdges.delete(initialIdx); // don't need this in here any more!

            while(endIdx != initialIdx && c < edgeCount)
            {
                polyIdxs.push(startIdx);

                // Read the next one
                startIdx = endIdx;
                endIdx = outerEdges.get(startIdx);
                outerEdges.delete(startIdx); // don't need this in here any more!
                if(endIdx == undefined)
                {
console.warn('Failed to find poly outer edges');
                    break;
                }

                c++;
            }

            // Save the last start idx
            polyIdxs.push(startIdx);

//console.log(polyIdxs);
//console.log('building poly vertices');
            let resultPoly = [];
            for(let c = 0; c < polyIdxs.length; c++)
            {
                resultPoly.push(new Point(pts[polyIdxs[c]][0], pts[polyIdxs[c]][1]));
            }

            if(resultPoly.length > 0)
            {
                result.push(resultPoly);
            }
        }

        return result;
    }*/

    forcePolygonGeneration(roiIDs: string[])
    {
        let rois = this._widgetDataService.regions;

        for(let roiID of roiIDs)
        {
            for(let region of this._regions)
            {
                if(region.roi.id == roiID)
                {
                    let rawRegion = rois.get(roiID);
                    if(rawRegion)
                    {
                        if(rawRegion.locationIndexes.length > 0)
                        {
                            region.polygons = this.makeRegionPolygons(rawRegion.locationIndexes, roiID);
                        }

                        if(rawRegion.pixelIndexes.size > 0 && rawRegion.imageName == this._lastContextImageName)
                        {
                            region.pixelMask = this.makePixelMask(rawRegion.pixelIndexes, roiID, rawRegion.colour);
                        }
                    }
                }
            }
        }
    }
}
