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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { BeamSelection } from "src/app/models/BeamSelection";
import { DataSet } from "src/app/models/DataSet";
import { Experiment } from "src/app/protolibs/experiment_pb";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";





export class PMCInspectorSettings
{
    highlightedPMCs: Set<number>;

    showNormalPMC: boolean;
    showDwellPMC: boolean;
    showContextImagePMC: boolean;
    showPMCPath: boolean;

    constructor()
    {
        this.reset();
    }

    reset(): void
    {
        this.highlightedPMCs = new Set<number>();

        this.showNormalPMC = true;
        this.showDwellPMC = true;
        this.showContextImagePMC = true;
        this.showPMCPath = true;
    }
}

class DisplayDetectorData
{
    detectorId: string;
    readType: string;

    metadata: string[] = [];
}

class PseudoIntensityItem
{
    constructor(public element: string, public intensity: number)
    {
    }
}
class PseudoIntensityData
{
    detectorId: string;
    intensities: PseudoIntensityItem[] = [];
}

class DisplayLocationData
{
    pmc: number;
    locIdx: number;

    metadata: string[] = [];
    detectors: DisplayDetectorData[] = [];

    pseudoIntensities: PseudoIntensityData[] = [];

    beamX: number;
    beamY: number;
    beamZ: number;
    beamI: number;
    beamJ: number;

    contextImage: string;
    contextImageURL: string;
}

const NoPMCSelectedMsg = "Click on a location or type a PMC to inspect it";

@Component({
    selector: "app-pmcinspector-view",
    templateUrl: "./pmcinspector-view.component.html",
    styleUrls: ["./pmcinspector-view.component.scss"]
})
export class PMCInspectorViewComponent implements OnInit, OnDestroy
{
    private subs = new Subscription();

    private minPMC = null;
    private maxPMC = null;

    private _settings = new PMCInspectorSettings();

    PMCData: DisplayLocationData = null;
    PMCShown: string = "";
    MsgDisplay: string = NoPMCSelectedMsg;

    showNormalPMC: boolean = true;
    showDwellPMC: boolean = true;
    showContextImagePMC: boolean = true;
    showPMCPath: boolean = true;

    constructor(
        private contextImageService: ContextImageService,
        private datasetService: DataSetService,
        private selectionService: SelectionService,
    )
    {
    }

    ngOnInit()
    {
        this.subs.add(this.datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                this.minPMC = null;
                this.maxPMC = null;

                if(dataset)
                {
                    for(let pmc of dataset.pmcToLocationIndex.keys())
                    {
                        if(this.minPMC == null || pmc < this.minPMC)
                        {
                            this.minPMC = pmc;
                        }

                        if(this.maxPMC == null || pmc > this.maxPMC)
                        {
                            this.maxPMC = pmc;
                        }
                    }
                }
            }
        ));
        /*
        this.subs.add(this.contextImageService.PMCInspectorSettings$.subscribe((settings)=>
        {
            // If PMC is valid and we have data for it, show it
            let dataset = this.datasetService.datasetLoaded;

            let data = null;
            if(settings.highlightedPMCs != null)
            {
                // Find it...
                for(let pmc of settings.highlightedPMCs)
                {
                    // TODO: make this multi-compatible!
                    let idx = dataset.pmcToLocationIndex.get(pmc);
                    if(idx !== null && idx !== undefined)
                    {
                        data = this.makeMetaData(dataset, idx);
                    }
                }
            }

            this.PMCData = data;
            if(data)
            {
                // Load the URL if needed
                if(this.PMCData.contextImage)
                {
                    this.datasetService.loadDataURLForContextImage(this.PMCData.contextImage).subscribe(
                        (dataURL: string)=>
                        {
                            this.PMCData.contextImageURL = dataURL;
                        }
                    );
                }
                this.PMCShown = data.pmc.toFixed(0);
                this.MsgDisplay = null;
            }
            else
            {
                this.MsgDisplay = NoPMCSelectedMsg;
            }

            this.showNormalPMC = settings.showNormalPMC;
            this.showDwellPMC = settings.showDwellPMC;
            this.showContextImagePMC = settings.showContextImagePMC;
            this.showPMCPath = settings.showPMCPath;
        }));
*/
    }

    ngOnDestroy()
    {
        this.subs.unsubscribe();
    }

    onPrevPMC(): void
    {
        if(this.PMCData)
        {
            let prevPMC = this.PMCData.pmc-1;
            if(prevPMC < this.minPMC)
            {
                // Wrap around
                prevPMC = this.maxPMC;
            }
            this.setHighlightedPMCs(new Set<number>([prevPMC]));
            this.MsgDisplay = null;
        }
    }

    onNextPMC(): void
    {
        if(this.PMCData)
        {
            let nextPMC = this.PMCData.pmc+1;
            if(nextPMC >= this.maxPMC)
            {
                // Wrap around
                nextPMC = this.minPMC;
            }
            this.setHighlightedPMCs(new Set<number>([nextPMC]));
            this.MsgDisplay = null;
        }
    }

    onSearchPMC(): void
    {
        // Look up this PMC, if it's valid
        let PMCShownNum = Number.parseInt(this.PMCShown);
        if(!isNaN(PMCShownNum) && PMCShownNum >= this.minPMC && PMCShownNum <= this.maxPMC)
        {
            this.setHighlightedPMCs(new Set<number>([PMCShownNum]));
            this.MsgDisplay = null;
        }
        else
        {
            this.PMCData = null;
            this.MsgDisplay = "Please enter a valid PMC between "+this.minPMC+" and "+this.maxPMC;
        }
    }

    setShowPMCs(setting: string, event): void
    {
        let settings = this._settings;

        if(setting == "normal")
        {
            settings.showNormalPMC = event.checked;
        }
        else if(setting == "dwell")
        {
            settings.showDwellPMC = event.checked;
        }
        else if(setting == "context")
        {
            settings.showContextImagePMC = event.checked;
        }
        else if(setting == "path")
        {
            settings.showPMCPath = event.checked;
        }

        this._settings = settings;
    }

    onSelectPMCIdx(locIdx: number): void
    {
        let selectedPMCIdx = new Set<number>();
        selectedPMCIdx.add(locIdx);

        this.selectionService.setSelection(this.datasetService.datasetLoaded, new BeamSelection(this.datasetService.datasetLoaded, selectedPMCIdx), null);
    }

    private setHighlightedPMCs(pmcs: Set<number>): void
    {
        let settings = this._settings;
        settings.highlightedPMCs = pmcs;
        this._settings = settings;
    }

    private makeMetaData(dataset: DataSet, locIdx: number): DisplayLocationData
    {
        let result = new DisplayLocationData();

        result.locIdx = locIdx;

        let exp = dataset.experiment;

        let metaLabels = exp.getMetaLabelsList();
        let metaTypes = exp.getMetaTypesList();
        let pseudoElements = dataset.getPseudoIntensityElementsList();

        let loc = exp.getLocationsList()[locIdx];

        result.pmc = Number.parseInt(loc.getId());

        // Run through and print out metadata for the location, then for each detector
        for(let item of loc.getMetaList())
        {
            result.metadata.push(this.makeMetaLine(item, metaLabels, metaTypes));
        }

        // Now do it for each detector/spectrum read
        for(let detector of loc.getDetectorsList())
        {
            let det = new DisplayDetectorData();
            det.detectorId = dataset.getDetectorMetaValue("DETECTOR_ID", detector);
            det.readType = dataset.getDetectorMetaValue("READTYPE", detector);

            for(let item of detector.getMetaList())
            {
                det.metadata.push(this.makeMetaLine(item, metaLabels, metaTypes));
            }

            result.detectors.push(det);
        }

        // Sort the detectors, they're in unknown order, might as well leaf through them being shown in a nice order
        result.detectors.sort((a, b) => ((a.detectorId+a.readType) > (b.detectorId+b.readType)) ? 1 : -1);

        result.contextImage = loc.getContextImage();

        let beam = loc.getBeam();
        if(beam)
        {
            result.beamX = beam.getX();
            result.beamY = beam.getY();
            result.beamZ = beam.getZ();

            result.beamI = beam.getImageI();
            result.beamJ = beam.getImageJ();
        }

        let pseudoIntensities = loc.getPseudoIntensitiesList();
        if(pseudoIntensities && pseudoIntensities.length > 0)
        {
            for(let data of pseudoIntensities)
            {
                let toSave = new PseudoIntensityData();
                toSave.detectorId = data.getDetectorId();

                let elemIdx = 0;
                for(let intensity of data.getElementIntensitiesList())
                {
                    toSave.intensities.push(new PseudoIntensityItem(pseudoElements[elemIdx], intensity));
                    elemIdx++;
                }

                result.pseudoIntensities.push(toSave);
            }
        }

        return result;
    }

    private makeMetaLine(metaItem: any, metaLabels: any, metaTypes: any): string
    {
        let val = "UNKNOWN";

        // Look up what type to use
        if(metaTypes[metaItem.getLabelIdx()] == Experiment.MetaDataType.MT_STRING)
        {
            val = metaItem.getSvalue();
        }
        else if(metaTypes[metaItem.getLabelIdx()] == Experiment.MetaDataType.MT_FLOAT)
        {
            val = metaItem.getFvalue();
        }
        else if(metaTypes[metaItem.getLabelIdx()] == Experiment.MetaDataType.MT_INT)
        {
            val = metaItem.getIvalue();
        }

        let line = metaLabels[metaItem.getLabelIdx()] + ":  " + val;
        return line;
    }
}
