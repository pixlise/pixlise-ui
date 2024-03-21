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

import { Point } from "src/app/models/Geometry";
import { ContextImageItem } from "src/app/modules/image-viewers/image-viewers.module";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";

export interface AverageRGBURatio {
  name: string;
  ratio: number;
}
export const rgbuDisplayNames = {
  r: "Near-IR",
  g: "Green",
  b: "Blue",
  u: "UV",
};

export interface PixelPoint {
  point: Point;
  i: number;
}

export class SelectionTabModel {
  /* static calculateAverageRGBURatio(pixels: Set<number>, contextImage: ContextImageItem, firstChannel: string, secondChannel: string): AverageRGBURatio {
    const averageName = firstChannel === secondChannel ? `${rgbuDisplayNames[firstChannel]}` : `${rgbuDisplayNames[firstChannel]}/${rgbuDisplayNames[secondChannel]}`;

    // Verify context image is valid and there is an RGBU source image
    if (!contextImage || !contextImage.rgbuSourceImage) {
      return {
        name: averageName,
        ratio: null,
      };
    }

    // Verify both selected channels are not null
    const rgbuSourceImage = contextImage.rgbuSourceImage;
    if (!rgbuSourceImage[firstChannel] || !rgbuSourceImage[secondChannel]) {
      console.error(`Invalid Channel Selection (${firstChannel}/${secondChannel})`);
      return {
        name: averageName,
        ratio: null,
      };
    }
    const firstChannelPixels = rgbuSourceImage[firstChannel].values;
    const secondChannelPixels = rgbuSourceImage[secondChannel].values;

    let averageRatio = 0;
    let count = pixels.size;

    // Use all pixels if no selection is made
    if (count === 0) {
      count = firstChannelPixels.length;
      firstChannelPixels.forEach((value, index) => {
        const currRatio = firstChannel === secondChannel ? value : value / secondChannelPixels[index];

        // Primarily fires if divide by 0 occurs, in which case we ignore these pixels
        if (isNaN(currRatio) || !isFinite(currRatio)) {
          count--;
          return;
        } else {
          averageRatio += currRatio;
        }
      });
    } else {
      pixels.forEach(pixel => {
        const currRatio = firstChannel === secondChannel ? firstChannelPixels[pixel] : firstChannelPixels[pixel] / secondChannelPixels[pixel];

        // // Primarily fires if divide by 0 occurs, in which case we ignore these pixels
        if (isNaN(currRatio) || !isFinite(currRatio)) {
          count--;
          return;
        } else {
          averageRatio += currRatio;
        }
      });
    }

    averageRatio /= count;

    return {
      name: averageName,
      ratio: averageRatio,
    };
  }

  static calculateAverageRGBURatios(selection: SelectionHistoryItem, contextImage: ContextImageItem): AverageRGBURatio[] {
    const channelPermutations = [];
    Object.keys(rgbuDisplayNames).forEach(channel => {
      channelPermutations.push([channel, channel]);
      Object.keys(rgbuDisplayNames)
        .filter(subChannel => subChannel !== channel)
        .forEach(subChannel => {
          channelPermutations.push([channel, subChannel]);
        });
    });

    return channelPermutations.map(([firstChannel, secondChannel]) => {
      return this.calculateAverageRGBURatio(selection.pixelSelection.selectedPixels, contextImage, firstChannel, secondChannel);
    });
  }

*/
  // static getNearbyPixels(pixelIndex: number, contextImage: ContextImageItem, radius: number = 3): PixelPoint[] {
  //   // Only contine if we have a valid RGBU context image and requested radius >= 0
  //   if (!contextImage || radius < 0) {
  //     return [];
  //   }
  //   const imageDrawTransform = contextImage.imageDrawTransform;
  //   const redChannel = contextImage.rgbuSourceImage.r;
  //   // Convert pixelIndex to x and y point coordinates
  //   const yCoord = Math.floor(pixelIndex / redChannel.width);
  //   const xCoord = pixelIndex % redChannel.width;
  //   // Calculate top left starting point
  //   const startX = Math.max(xCoord - radius, 0);
  //   const startY = Math.max(yCoord - radius, 0);
  //   // Calculate bottom right ending point
  //   const endX = Math.min(xCoord + radius, redChannel.width - 1);
  //   const endY = Math.min(yCoord + radius, redChannel.height - 1);
  //   const pixels = [];
  //   // Generate a square with pixelIndex in center with specified radius
  //   for (let x = startX; x <= endX; x++) {
  //     for (let y = startY; y <= endY; y++) {
  //       const index = y * redChannel.width + x;
  //       // Verify nothing went wrong and this is a valid index
  //       if (index >= 0 && index < redChannel.values.length) {
  //         // Offset coordinates to be in global draw coordinate system
  //         const offsetX = x + imageDrawTransform.xOffset;
  //         const offsetY = y + imageDrawTransform.yOffset;
  //         // Join point with pixel index
  //         pixels.push({ point: new Point(offsetX, offsetY), i: index });
  //       }
  //     }
  //   }
  //   return pixels;
  // }
  // static getPixelIndexAtPoint(point: Point, contextImage: ContextImageItem): number {
  //   // Verify we have a valid RGBU context image before continuing
  //   if (!contextImage) {
  //     return -1;
  //   }
  //   const imageDrawTransform = contextImage.imageDrawTransform;
  //   const redChannel = contextImage.rgbuSourceImage.r;
  //   // Remove offset from point and convert to index using red channel for width
  //   const rawX = Math.round(point.x) - imageDrawTransform.xOffset;
  //   const rawY = Math.round(point.y) - imageDrawTransform.yOffset;
  //   const pixelIndex = rawY * redChannel.width + rawX;
  //   // Return -1 if pixel index is not within bounds
  //   if (pixelIndex <= 0 || pixelIndex >= redChannel.values.length) {
  //     return -1;
  //   }
  //   return pixelIndex;
  // }
  // // Algorithm adapted from https://www.algorithms-and-technologies.com/point_in_polygon/javascript
  // static pointInPolygon(polygon: Point[], point: Point): boolean {
  //   // A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
  //   let oddNumberOfCrossings = false;
  //   // For each edge (In this case for each point of the polygon and the previous one)
  //   for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
  //     // If a line from the point into infinity crosses this edge
  //     if (
  //       polygon[i].y > point.y !== polygon[j].y > point.y && // One point needs to be above, one below our y coordinate
  //       // ...and the edge doesn't cross our Y corrdinate before our x coordinate (but between our x coordinate and infinity)
  //       point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
  //     ) {
  //       oddNumberOfCrossings = !oddNumberOfCrossings;
  //     }
  //     j = i;
  //   }
  //   // If the number of crossings was odd, the point is in the polygon
  //   return oddNumberOfCrossings;
  // }
  // static getPixelsInPolygon(polygon: Point[], contextImage: ContextImageItem, oversizeRadius: number = 2, includeOversizedPoints: boolean = false): number[] {
  //   const polygonPixels: Set<number> = new Set();
  //   polygon.forEach(point => {
  //     // Convert point to pixel index
  //     const currentPixel = this.getPixelIndexAtPoint(point, contextImage);
  //     if (currentPixel >= 0) {
  //       // Get an oversized pixel selection based on polygon points
  //       const nearbyPixels = this.getNearbyPixels(currentPixel, contextImage, oversizeRadius);
  //       nearbyPixels.forEach(pixel => {
  //         // Add pixel from oversized pixel selection to polygon pixels if it's in the polygon or oversized points are included
  //         if (includeOversizedPoints || this.pointInPolygon(polygon, pixel.point)) {
  //           polygonPixels.add(pixel.i);
  //         }
  //       });
  //     }
  //   });
  //   return Array.from(polygonPixels);
  // }
  // static getJoinedNearbyPixelSelection(dataset: DataSet, contextImage: ContextImageItem, currentSelection: SelectionHistoryItem): PixelSelection {
  //   // Verify valid dataset and RGBU context image before continuing
  //   if (!dataset || !contextImage) {
  //     return;
  //   }
  //   const beamSelection = currentSelection.beamSelection;
  //   // Transform PMC selection into a list of pixel indices that are within all PMC sub-polygons
  //   const selectedPixels = Array.from(beamSelection.locationIndexes).reduce((prevPixels, location) => {
  //     // Get pixels within each polygon corresponding to selected PMCs
  //     let polygonPixels = this.getPixelsInPolygon(dataset.locationPointCache[location].polygon, contextImage);
  //     return [...prevPixels, ...polygonPixels];
  //   }, []);
  //   // Get width and height from red channel
  //   const redChannel = contextImage.rgbuSourceImage.r;
  //   const [width, height] = [redChannel.width, redChannel.height];
  //   let imageName = "";
  //   let newPixelSelection: Set<number> = new Set();
  //   // If there's a current pixel selection, use this as the starting point
  //   if (currentSelection.pixelSelection) {
  //     imageName = currentSelection.pixelSelection.imageName;
  //     newPixelSelection = currentSelection.pixelSelection.selectedPixels;
  //   }
  //   newPixelSelection = new Set([...newPixelSelection, ...selectedPixels]);
  //   return new PixelSelection(dataset, newPixelSelection, width, height, imageName);
  // }
}
