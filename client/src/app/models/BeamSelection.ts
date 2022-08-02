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

import { setsEqual } from "../utils/utils";
import { DataSet } from "./DataSet";


// For now, a selection is simply an array of points that are included.
// In time/as needed this might store some optimised display items, perhaps even bulk spectra of the points selected

export class SelectionDetector
{
    constructor(public spectrum: Int32Array,
        public maxValue: number,
        public isCalculated: boolean, // if true, location & detector indexes won't be set as we're providing a "virtual" view of data
        public locationIdx: number,
        public detectorIdx: number,
        public detectorId: string,
        public detectorReadType: string)
    {
    }
}

export class BeamSelection
{
    selectedSpectrums: SelectionDetector[] = [];

    private _selectedPMCs: Set<number> = new Set<number>();

    static makeEmptySelection(): BeamSelection
    {
        return new BeamSelection(null, new Set<number>());
    }

    constructor(dataset: DataSet, public locationIndexes: Set<number>, public creator: string = "")
    {
        // Make a set of PMCs out of them
        if(dataset)
        {
            this._selectedPMCs = dataset.getPMCsForLocationIndexes(Array.from(locationIndexes), false);
        }

        if(locationIndexes.size == 1)
        {
            let locIdx = locationIndexes.values().next().value;
            let loc = dataset.experiment.getLocationsList()[locIdx];
            let pmc = Number.parseInt(loc.getId());

            let c = 0;
            for(let detector of loc.getDetectorsList())
            {
                let detectorId = dataset.getDetectorMetaValue("DETECTOR_ID", detector);
                let detectorReadType = dataset.getDetectorMetaValue("READTYPE", detector);

                let vals = dataset.getSpectrumValues(pmc, c);
                let maxVal = detector.getSpectrummax();
                let spec = new SelectionDetector(vals, maxVal, false, locIdx, c, detectorId, detectorReadType);

                this.selectedSpectrums.push(spec);
                c++;
            }
        }
        else
        {
            this.calcMultiSelection(dataset, locationIndexes);
        }
    }

    isEqualTo(other: BeamSelection): boolean
    {
        return setsEqual(this._selectedPMCs, other._selectedPMCs);
    }

    getSelectedPMCs(): Set<number>
    {
        return this._selectedPMCs;
    }

    private calcMultiSelection(dataset: DataSet, locationIndexes: Set<number>): void
    {
        if(locationIndexes.size <= 0)
        {
            this.selectedSpectrums = [];
            return;
        }

        let Count = DataSet.getSpectrumValueCount();

        let A = new Int32Array(Count);
        let maxA = 0;
        let B = new Int32Array(Count);
        let maxB = 0;

        let normalCount = 0;

        let dwellA = new Int32Array(Count);
        let dwellMaxA = 0;
        let dwellB = new Int32Array(Count);
        let dwellMaxB = 0;

        let dwellCount = 0;

        for(let idx of locationIndexes)
        {
            let loc = dataset.experiment.getLocationsList()[idx];

            let pmc = Number.parseInt(loc.getId());
            let detIdx = 0;
            for(let detector of loc.getDetectorsList())
            {
                let detectorId = dataset.getDetectorMetaValue("DETECTOR_ID", detector);
                let readType = dataset.getDetectorMetaValue("READTYPE", detector);

                if(readType == "Normal")
                {
                    normalCount++;

                    if(detectorId == "A")
                    {
                        maxA += detector.getSpectrummax();

                        let vals = dataset.getSpectrumValues(pmc, detIdx);
                        for(let c = 0; c < Count; c++)
                        {
                            A[c] += vals[c];
                        }
                    }

                    if(detectorId == "B")
                    {
                        maxB += detector.getSpectrummax();

                        let vals = dataset.getSpectrumValues(pmc, detIdx);
                        for(let c = 0; c < Count; c++)
                        {
                            B[c] += vals[c];
                        }
                    }
                }
                else if(readType == "Dwell")
                {
                    dwellCount++;

                    // Add up Dwell spectra separately
                    if(detectorId == "A")
                    {
                        dwellMaxA += detector.getSpectrummax();

                        let vals = dataset.getSpectrumValues(pmc, detIdx);
                        for(let c = 0; c < Count; c++)
                        {
                            dwellA[c] += vals[c];
                        }
                    }

                    if(detectorId == "B")
                    {
                        dwellMaxB += detector.getSpectrummax();

                        let vals = dataset.getSpectrumValues(pmc, detIdx);
                        for(let c = 0; c < Count; c++)
                        {
                            dwellB[c] += vals[c];
                        }
                    }
                }

                detIdx++;
            }
        }

        this.selectedSpectrums = [
            new SelectionDetector(A, maxA, true, null, null, "A", "Normal"),
            new SelectionDetector(B, maxB, true, null, null, "B", "Normal")
        ];

        if(normalCount == dwellCount)
        {
            this.selectedSpectrums.push(new SelectionDetector(dwellA, dwellMaxA, true, null, null, "A", "Dwell"));
            this.selectedSpectrums.push(new SelectionDetector(dwellB, dwellMaxB, true, null, null, "B", "Dwell"));
        }
    }
}
