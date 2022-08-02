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

import { MinMax } from "src/app/models/BasicTypes";
import { Point } from "src/app/models/Geometry";
import { RGBA } from "src/app/utils/colours";


export class RGBUMineralRatios
{
    public static names = [
        "Plag",
        "Sanidine",
        "Microcline",
        "Aug",
        "Opx",
        "Fo89",
        "Fo11",
        "Chalcedor",
        "Calsite",
        "Gypsum",
        "Dolomite",
        "FeS2",
        "FeS",
        "Fe3O4",
        "Fe2O3",
        "FeOOH",
        "F2O3H20"
    ];

    // Values as R,G,B,U
    public static ratioValues = [
        /*plag =*/      [0.837, 0.785, 0.734, 0.667],
        /*sanidine =*/  [0.738, 0.715, 0.697, 0.623],
        /*microline =*/ [0.774, 0.560, 0.503, 0.453],
        /*aug =*/       [0.293, 0.244, 0.197, 0.133],
        /*opx =*/       [0.288, 0.209, 0.177, 0.127],
        /*Fo89 =*/      [0.398, 0.434, 0.288, 0.216],
        /*Fo11 =*/      [0.316, 0.248, 0.166, 0.091],
        /*Chalcedor =*/ [0.620, 0.536, 0.487, 0.394],
        /*calsite =*/   [0.918, 0.877, 0.850, 0.785],
        /*gypsum =*/    [0.928, 0.915, 0.904, 0.883],
        /*dolomite =*/  [0.855, 0.783, 0.729, 0.658],
        /*FeS2 =*/      [0.059, 0.051, 0.040, 0.036],
        /*FeS =*/       [0.088, 0.061, 0.044, 0.034],
        /*Fe3O4 =*/     [0.049, 0.045, 0.046, 0.047],
        /*Fe2O3 =*/     [0.308, 0.023, 0.020, 0.019],
        /*FeOOH =*/     [0.297, 0.069, 0.041, 0.023],
        /*F2O3H20 =*/   [0.168, 0.025, 0.016, 0.014],
    ];
}

export class RGBUAxisUnit
{
    constructor(
        public numeratorChannelIdx: number = -1,
        public denominatorChannelIdx: number = -1,
    )
    {
    }

    get label(): string
    {
        let numer = this.channelIdxToName(this.numeratorChannelIdx);
        if(this.denominatorChannelIdx == -1)
        {
            // User configured this to not include a ratio, so we're just the top unit...
            return numer;
        }

        let denom = this.channelIdxToName(this.denominatorChannelIdx);
        return numer+"/"+denom;
    }

    private channelIdxToName(idx: number): string
    {
        switch (idx)
        {
        case 0:
            return "Near-IR";
        case 1:
            return "Green";
        case 2:
            return "Blue";
        case 3:
            return "UV";
        default:
            return "ERROR";
        }
    }
}

export class RGBURatioPoint
{
    constructor(
        public ratioPt: Point,
        public count: number,
        public colour: RGBA,
        public srcPixelIdxs: number[]
    )
    {
    }
}

export class RGBUMineralPoint
{
    constructor(
        public ratioPt: Point,
        public name: string,
    )
    {
    }
}

export class RGBUPlotData
{
    constructor(
        public xAxisUnit: RGBUAxisUnit,
        public yAxisUnit: RGBUAxisUnit,
        public points: RGBURatioPoint[],
        public pointWidth: number,
        public pointHeight: number,
        public xRange: MinMax,
        public yRange: MinMax,
        public minerals: RGBUMineralPoint[],
        public errorMsg: string,
        public imgWidth: number,
        public imgHeight: number,
        public imgName: string
    )
    {
    }
}