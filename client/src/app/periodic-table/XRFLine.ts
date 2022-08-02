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

import { ElementLine, EscapeLine } from "./periodic-table-db";
//import { AnnotationItem } from 'src/app/services/spectrum-annotation.service';


export enum XRFLineType
{
    K_MAX,
    K_OTHER,
    L_MAX,
    L_OTHER,
    M_MAX,
    M_OTHER,
    ESCAPE,
//    ANNOTATION
}

// TODO: Really need to break this up, XRFLine should be a base class, and depending on its XRFLineType it could store the XRF info, or annotation info, or whatever else.
//       For now, we need a ROI field for annotations, and it's going to go into the XRFLine class :-/
export class XRFLine
{
    constructor(
        public atomicNumber: number,
        public name: string,
        public eV: number,
        public intensity: number,
        public elementSymbol: string,
        public siegbahn: string,
        public lineType: XRFLineType,
        public tags: string[], // Things like maxK, maxL, maxM (see periodic table data)
        public roi: string = null
    )
    {
    }

    isMaxLine(): boolean
    {
        return  this.lineType == XRFLineType.K_MAX ||
                this.lineType == XRFLineType.L_MAX ||
                this.lineType == XRFLineType.M_MAX;
    }

    isOtherLine(): boolean
    {
        return  this.lineType == XRFLineType.K_OTHER ||
                this.lineType == XRFLineType.L_OTHER ||
                this.lineType == XRFLineType.M_OTHER;
    }
    /*
    static makeFromAnnotationItem(item: AnnotationItem, roi: string): XRFLine
    {
        return new XRFLine(0, item.name, item.eV, 0, '', '', XRFLineType.ANNOTATION, [], roi);
    }
*/
    static makeXRFLineFromEscapeLine(symbol: string, atomicNumber: number, escLine: EscapeLine): XRFLine
    {
        return new XRFLine(
            atomicNumber, escLine.name, escLine.energy, escLine.intensity, symbol, "Esc"+escLine.parentSiegbahn, XRFLineType.ESCAPE, []
        );
    }

    static makeXRFLineFromPeriodicTableItem(symbol: string, atomicNumber: number, elemLine: ElementLine): XRFLine
    {
        let lineType = XRFLineType.K_OTHER;
        if(elemLine.Siegbahn[0] == "L")
        {
            lineType = XRFLineType.L_OTHER;
        }
        else
        {
            lineType = XRFLineType.M_OTHER;
        }

        let tags = elemLine.tags;
        if(!tags)
        {
            tags = [];
        }
        else
        {
            if(tags.indexOf("maxK") > -1)
            {
                lineType = XRFLineType.K_MAX;
            }

            if(tags.indexOf("maxL") > -1)
            {
                lineType = XRFLineType.L_MAX;
            }

            if(tags.indexOf("maxM") > -1)
            {
                lineType = XRFLineType.M_MAX;
            }
        }
        return new XRFLine(atomicNumber, symbol+"-"+elemLine.Siegbahn, elemLine.energy, elemLine.intensity, symbol, elemLine.Siegbahn, lineType, tags);
    }
}
