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

import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { Point } from "src/app/models/Geometry";
import { PixelSelection } from "src/app/models/PixelSelection";

import { SelectionHistoryItem } from "src/app/services/selection.service";

export interface AverageRGBURatio {
    name: string;
    ratio: number;
}
export const rgbuDisplayNames = {
    "r": "Near-IR",
    "g": "Green",
    "b": "Blue",
    "u": "UV",
};

export interface PixelPoint {
    point: Point;
    i: number;
}


export class SelectionTabModel 
{
    static calculateAverageRGBURatio(selection: SelectionHistoryItem, contextImage: ContextImageItem, firstChannel: string, secondChannel: string): AverageRGBURatio
    {
        // Verify context image is valid and there is an RGBU source image
        if(!contextImage || !contextImage.rgbuSourceImage)
        {
            return {
                name: `${rgbuDisplayNames[firstChannel]}/${rgbuDisplayNames[secondChannel]}`,
                ratio: null
            };
        }

        // Verify both selected channels are not null
        let rgbuSourceImage = contextImage.rgbuSourceImage;
        if(!rgbuSourceImage[firstChannel] || !rgbuSourceImage[secondChannel]) 
        {
            console.error(`Invalid Channel Selection (${firstChannel}/${secondChannel})`);
            return {
                name: `${rgbuDisplayNames[firstChannel]}/${rgbuDisplayNames[secondChannel]}`,
                ratio: null
            };
        }
        let firstChannelPixels = rgbuSourceImage[firstChannel].values;
        let secondChannelPixels = rgbuSourceImage[secondChannel].values;

        let averageRatio = Array.from(selection.pixelSelection.selectedPixels).reduce((acc, currPixel, i) =>
        {
            let currRatio = firstChannelPixels[currPixel] / secondChannelPixels[currPixel];

            // Primarily fires if divide by 0 occurs, in which case we ignore these pixels
            if(isNaN(currRatio) || !isFinite(currRatio))
            {
                return acc;
            }
            return i === 0 ? currRatio : (currRatio + acc) / 2;
        }, 0);

        return {
            name: `${rgbuDisplayNames[firstChannel]}/${rgbuDisplayNames[secondChannel]}`,
            ratio: Math.round(averageRatio * 100) / 100
        };
    }

    static calculateAverageRGBURatios(selection: SelectionHistoryItem, contextImage: ContextImageItem): AverageRGBURatio[]
    {
        let channelPermutations = [];
        Object.keys(rgbuDisplayNames).forEach(channel =>
        {
            Object.keys(rgbuDisplayNames).filter(subChannel => subChannel !== channel).forEach(subChannel =>
            {
                channelPermutations.push([channel, subChannel]);
            });
        });

        return channelPermutations.map(([firstChannel, secondChannel]) =>
        {
            return this.calculateAverageRGBURatio(selection, contextImage, firstChannel, secondChannel);
        });
    }


    static getPixelIndexAtPoint(point: Point, contextImage: ContextImageItem): number 
    {
        // Verify we have a valid RGBU context image before continuing
        if(!contextImage)
        {
            return -1;
        }
        let imageDrawTransform = contextImage.imageDrawTransform;

        let redChannel = contextImage.rgbuSourceImage.r;

        // Remove offset from point and convert to index using red channel for width
        let rawX = Math.round(point.x) - imageDrawTransform.xOffset;
        let rawY = Math.round(point.y) - imageDrawTransform.yOffset;
        let pixelIndex = rawY * redChannel.width + rawX;

        // Return -1 if pixel index is not within bounds
        if(pixelIndex <= 0 || pixelIndex >= redChannel.values.length) 
        {
            return -1;
        }

        return pixelIndex;
    }

    static getNearbyPixels(pixelIndex: number, contextImage: ContextImageItem, radius: number = 3): PixelPoint[]
    {
        // Only contine if we have a valid RGBU context image and requested radius >= 0 
        if(!contextImage || radius < 0)
        {
            return [];
        }

        let imageDrawTransform = contextImage.imageDrawTransform;
        let redChannel = contextImage.rgbuSourceImage.r;

        // Convert pixelIndex to x and y point coordinates
        let yCoord = Math.floor(pixelIndex/redChannel.width);
        let xCoord = pixelIndex % redChannel.width;

        // Calculate top left starting point
        let startX = Math.max(xCoord - radius, 0);
        let startY = Math.max(yCoord - radius, 0);

        // Calculate bottom right ending point
        let endX = Math.min(xCoord + radius, redChannel.width - 1);
        let endY = Math.min(yCoord + radius, redChannel.height - 1);

        let pixels = [];

        // Generate a square with pixelIndex in center with specified radius
        for(let x = startX; x <= endX; x++) 
        {
            for(let y = startY; y <= endY; y++)
            {
                let index = y * redChannel.width + x;

                // Verify nothing went wrong and this is a valid index
                if(index >= 0 && index < redChannel.values.length) 
                {
                    // Offset coordinates to be in global draw coordinate system
                    let offsetX = x + imageDrawTransform.xOffset;
                    let offsetY = y + imageDrawTransform.yOffset;

                    // Join point with pixel index
                    pixels.push({point: new Point(offsetX, offsetY), i: index});
                }
            }
        }

        return pixels;
    }

    // Algorithm adapted from https://www.algorithms-and-technologies.com/point_in_polygon/javascript
    static pointInPolygon(polygon: Point[], point: Point): boolean 
    {
        // A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
        let oddNumberOfCrossings = false;

        // For each edge (In this case for each point of the polygon and the previous one)
        for(let i = 0, j = polygon.length - 1; i < polygon.length; i++) 
        {
            // If a line from the point into infinity crosses this edge
            if(((polygon[i].y > point.y) !== (polygon[j].y > point.y)) // One point needs to be above, one below our y coordinate
            // ...and the edge doesn't cross our Y corrdinate before our x coordinate (but between our x coordinate and infinity)
            && (point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x))) 
            {
                oddNumberOfCrossings = !oddNumberOfCrossings;
            }
            j = i;

        }
        // If the number of crossings was odd, the point is in the polygon
        return oddNumberOfCrossings;
    }


    static getPixelsInPolygon(polygon: Point[], contextImage: ContextImageItem, oversizeRadius: number = 2, includeOversizedPoints: boolean = false): number[]
    {
        let polygonPixels: Set<number> = new Set();
        polygon.forEach(point => 
        {
            // Convert point to pixel index
            let currentPixel = this.getPixelIndexAtPoint(point, contextImage);
            if(currentPixel >= 0) 
            {
                // Get an oversized pixel selection based on polygon points
                let nearbyPixels = this.getNearbyPixels(currentPixel, contextImage, oversizeRadius);
                nearbyPixels.forEach(pixel => 
                {
                    // Add pixel from oversized pixel selection to polygon pixels if it's in the polygon or oversized points are included
                    if(includeOversizedPoints || this.pointInPolygon(polygon, pixel.point)) 
                    {
                        polygonPixels.add(pixel.i);
                    }
                });
            }
        });

        return Array.from(polygonPixels);
    }


    static getJoinedNearbyPixelSelection(dataset: DataSet, contextImage: ContextImageItem, currentSelection: SelectionHistoryItem): PixelSelection
    {
        // Verify valid dataset and RGBU context image before continuing
        if(!dataset || !contextImage)
        {
            return;
        }

        let beamSelection = currentSelection.beamSelection;

        // Transform PMC selection into a list of pixel indices that are within all PMC sub-polygons 
        let selectedPixels = Array.from(beamSelection.locationIndexes).reduce((prevPixels, location) => 
        {
            // Get pixels within each polygon corresponding to selected PMCs
            let polygonPixels = this.getPixelsInPolygon(dataset.locationPointCache[location].polygon, contextImage);
            return [...prevPixels, ...polygonPixels];
        }, []);

        // Get width and height from red channel
        let redChannel = contextImage.rgbuSourceImage.r;
        let [width, height] = [redChannel.width, redChannel.height];

        let imageName = "";
        let newPixelSelection: Set<number> = new Set();
        
        // If there's a current pixel selection, use this as the starting point
        if(currentSelection.pixelSelection) 
        {
            imageName = currentSelection.pixelSelection.imageName;
            newPixelSelection = currentSelection.pixelSelection.selectedPixels;
        }

        newPixelSelection = new Set([...newPixelSelection, ...selectedPixels]);

        return new PixelSelection(dataset, newPixelSelection, width, height, imageName);
    }
}