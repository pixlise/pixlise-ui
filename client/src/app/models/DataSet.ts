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

import * as moment from "moment";
import { Observable } from "rxjs";
import {
    HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import {
    addVectors, distanceBetweenPoints, getRotationMatrix, getVectorBetweenPoints, getVectorDotProduct,
    getVectorLength, normalizeVector, Point, pointByMatrix, Rect, subtractVectors,
    vectorsEqual
} from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { SpectrumValues } from "src/app/models/Spectrum";
import { Experiment } from "src/app/protolibs/experiment_pb";
import { DecompressZeroRunLengthEncoding } from "src/app/utils/dataset-utils";
import { invalidPMC, radToDeg } from "src/app/utils/utils";
import Voronoi from "voronoi";


let QuickHull = require("quickhull");
const polygonClipping = require("polygon-clipping");


export class DataSetLocation
{
    constructor(
        public coord: Point,
        public locationIdx: number,
        public PMC: number,
        public hasNormalSpectra: boolean,
        public hasDwellSpectra: boolean,
        public hasMissingData: boolean,
        public polygon: Point[],
        public hasPseudoIntensities: boolean = false,
        public source: Experiment.ScanSource = null,
    )
    {
    }

    // PMC is usually a number but in combined datasets we need
    // to also show the dataset this PMC is sourced from
    getPrintablePMC(): string
    {
        if(!this.source)
        {
            return this.PMC.toLocaleString();
        }

        let result = this.getPMCWithoutOffset().toLocaleString();
        result += " Dataset: "+this.source.getRtt();
        return result;
    }

    getPMCWithoutOffset(): number
    {
        if(!this.source)
        {
            return this.PMC;
        }
        return this.PMC-this.source.getIdOffset();
    }
}

export class ContextImageItemTransform
{
    constructor(
        public xOffset: number,
        public yOffset: number,
        public xScale: number,
        public yScale: number
    )
    {
    }

    calcXPos(): number
    {
        return this.xOffset / this.xScale;
    }

    calcYPos(): number
    {
        return this.yOffset / this.yScale;
    }

    calcWidth(imageWidth: number): number
    {
        return imageWidth / this.xScale;
    }

    calcHeight(imageHeight: number): number
    {
        return imageHeight / this.yScale;
    }
}

export class ContextImageItem
{
    constructor(
        public path: string,
        public imagePMC: number,
        public hasBeamData: boolean,
        public beamIJIndex: number, // -1=default context image beam ij's, 0+ indexes into beam.context_locations[]
        public imageDrawTransform: ContextImageItemTransform,
        public rgbuSourceImage: RGBUImage, // eg if image was a floating point TIF
        public rgbSourceImage: HTMLImageElement, // eg if image was a PNG or JPG
    )
    {
    }
}

export class HullPoint extends Point
{
    constructor(x: number, y: number, public idx: number, public normal: Point = null)
    {
        super(x, y);
    }
}

export class PointCluster
{
    constructor(public locIdxs: number[], public pointDistance: number, public footprintPoints: HullPoint[], public angleRadiansToContextImage: number)
    {
    }
}

export class DataSetSummary
{
    constructor(
        public dataset_id: string,
        public bulk_spectra: number,
        public context_image: string,
        public context_images: number,
        public tiff_context_images: number = 0,
        public data_file_size: number,
        public detector_config: string,
        public dwell_spectra: number,
        public location_count: number,
        public max_spectra: number,
        public normal_spectra: number,
        public pseudo_intensities: number,
        public target_id: string,
        public dataset_link: string,
        public context_image_link: string,
        public drive_id: number,
        public site_id: number,
        public sol: string,
        public rtt: number,
        public sclk: number,
        public target: string,
        public site: string,
        public title: string,
        public create_unixtime_sec: number,
    )
    {
    }

    public static listMissingData(summary: DataSetSummary): string[]
    {
        return DataSetSummary.listMissingDataForSummaryStats(
            summary.detector_config,
            summary.sol,
            summary.bulk_spectra,
            summary.max_spectra,
            summary.normal_spectra,
            summary.pseudo_intensities
        );
    }

    public static listMissingDataForSummaryStats(detectorConfig: string, sol: string, bulkSpectra: number, maxSpectra: number, normalSpectra: number, pseudoIntensities: number): string[]
    {
        // We don't show this for test datasets
        if(detectorConfig != "PIXL")
        {
            return [];
        }

        // SOL13 dataset is a hand-made hack out, so exclude it
        if(parseInt(sol, 10) <= 13)
        {
            return [];
        }

        // If it's likely a "disco" dataset, don't complain
        if(
            bulkSpectra == 0 &&
            maxSpectra == 0 &&
            pseudoIntensities == 0 &&
            normalSpectra == 0
        )
        {
            return [];
        }

        // If missing bulk/max...
        let result: string[] = [];
        if(bulkSpectra < 2)
        {
            result.push("bulk spectra");
        }
        if(maxSpectra < 2)
        {
            result.push("max spectra");
        }
        if(pseudoIntensities <= 0)
        {
            result.push("pseudo-intensities");
        }
        if(pseudoIntensities > 0 && normalSpectra != pseudoIntensities*2)
        {
            result.push("normal spectra");
        }
        return result;
    }
}


export class DataSet implements PseudoIntensityDataQuerierSource, HousekeepingDataQuerierSource, SpectrumDataQuerierSource
{
    public static readonly invalidPMC: number = invalidPMC;

    experiment: Experiment;

    contextImages: ContextImageItem[] = [];
    rgbuImages: RGBUImage[] = [];

    defaultContextImageIdx: number = -1;

    locationPointCache: DataSetLocation[] = null;
    locationPointBBox: Rect;
    locationPointXSize = 0;
    locationPointYSize = 0;
    locationPointZSize = 0;
    minXYDistance_mm = 0;
    locationCount: number = 0;
    locationsWithNormalSpectra: number = 0;

    wholeFootprintHullPoints: HullPoint[][] = [];

    pmcToLocationIndex = new Map<number, number>();
    pmcMinMax = new MinMax();

    locationDisplayPointRadius: number = 1;
    experimentAngleRadiansOnContextImage: number = 0;

    spectrumMaxValueNormal: number = 0;
    pmcForBulkMaxValueLocation: number = null;
    idxForBulkMaxValueLocation: number = null;
    detectorIds: string[] = [];

    beamUnitsInMeters: boolean = false; // Original test data had mm

    private _datasetID: string = "";
    private _contextPixelsTommConversion: number = 1;
    private _missingData: string[] = [];
    private _isRGBUDataset: boolean = false;
    private _selectedIJBank: number = null;

    private _decompressedSpectra: Map<number, Int32Array[]> = new Map<number, Int32Array[]>();
    private _metaLabelIndexes: Map<string, number> = new Map<string, number>();

    //dsid: string = null;

    constructor(datasetID: string, exp: Experiment, img: HTMLImageElement)
    {
        let t0 = performance.now();
        console.log("--- Dataset Init: "+datasetID+" ---");
        //this.dsid = makeGUID();

        this._datasetID = datasetID;
        this.experiment = exp;

        // Initialise static stuff once:
        this.cacheMetaData();
        this.cacheSpectrumInfo();
        this.findContextImages(img);

        // Decide if we're "missing data"
        this._missingData = DataSetSummary.listMissingDataForSummaryStats(
            this.experiment.getDetectorConfig(),
            this.experiment.getSol(),
            this.experiment.getBulkSpectra(),
            this.experiment.getMaxSpectra(),
            this.experiment.getNormalSpectra(),
            this.experiment.getPseudoIntensities()
        );

        if(this._missingData.length > 0)
        {
            console.log("  Dataset missing data list: "+this._missingData.join(","));
        }

        // Decide if we're an RGBU dataset
        this._isRGBUDataset = this.rgbuImages.length > 0 && this.experiment.getNormalSpectra() <= 0 && this.experiment.getPseudoIntensities() <= 0;
        if(this._isRGBUDataset)
        {
            console.log("  Dataset is considered an RGBU dataset.");
        }

        // Initialise to use default context image's bank of IJ coordinates
        this.selectBeamIJBank(-1);

        let t1 = performance.now();
        console.log("--- Dataset Ready in "+(t1 - t0).toLocaleString() + "ms ---");
    }

    static getSpectrumValueCount(): number
    {
        return 4096;
    }

    static convertLocationComponentToPixelPosition(xy: number)
    {
        return Math.round(xy);
    }

    getId(): string
    {
        return this._datasetID;
    }

    get missingData(): string[]
    {
        return this._missingData;
    }

    hasMissingData(): boolean
    {
        return this._missingData.length > 0;
    }

    isRGBUDataset(): boolean
    {
        return this._isRGBUDataset;
    }

    // Sets which bank of i/j coordinates to use. -1 is the one for the default context image
    // while 0+ uses the ones for other beam-aligned context images
    selectBeamIJBank(idx: number): void
    {
        if(this._selectedIJBank == idx)
        {
            // We've done this job already!
            console.log("Already using IJ bank: "+idx+"...");
            return;
        }

        this.initLocationCaching(idx);
        this.findMinPointDistances(this.locationPointCache, this.locationPointBBox, this.locationPointXSize, this.locationPointYSize, this.locationPointZSize);

        let clusters = DataSet.makePointClusters(this.locationPointCache);

        // Clear footprints, get from clusters as we process them
        this.wholeFootprintHullPoints = [];

        for(let cluster of clusters)
        {
            this.makePMCPolygons(cluster);
            this.wholeFootprintHullPoints.push(cluster.footprintPoints);
        }

        if(this.wholeFootprintHullPoints.length > 0)
        {
            this.experimentAngleRadiansOnContextImage = DataSet.findExperimentAngle(this.wholeFootprintHullPoints[0]);
            console.log("  Found "+this.wholeFootprintHullPoints.length+" footprints");
        }
        else
        {
            console.warn("  No footprint found");
        }

        this._selectedIJBank = idx;
    }

    isBulkSumQuant(quantID: string): boolean
    {
        let compareQuantID = quantID;
        if(!quantID.startsWith("shared-"))
        {
            compareQuantID = "shared-"+quantID;
        }
        //console.log('compare: '+compareQuantID+' with: '+this.experiment.getBulkSumQuantFile());
        return (compareQuantID == this.experiment.getBulkSumQuantFile());
    }

    getImagePixelsToPhysicalmm(): number
    {
        return this._contextPixelsTommConversion;
    }

    mmToContextImageSpacePixelSize(mm: number): number
    {
        // We need to work out how many screen pixels that is, if we start from
        // mm, go through context image pixel sizes
        const contextTomm = this._contextPixelsTommConversion;

        // Convert beam to context image pixels
        return mm/contextTomm;
    }

    // TODO: Worry about types, for now just return anything we get as a string, but if we want to show something as ints or floats
    // we should be enforcing that the type check indicates the expected type is stored
    getDetectorMetaValue(metaLabel: string, detector: Experiment.Location.DetectorSpectrum): any
    {
        // Look up the label
        let c = this._metaLabelIndexes.get(metaLabel);
        if(c === undefined)
        {
            console.error("Failed to find detector meta value: "+metaLabel);
            return "";
        }

        let typeStored = this.experiment.getMetaTypesList()[c];

        for(let metaValue of detector.getMetaList())
        {
            if(metaValue.getLabelIdx() === c)
            {
                // Found it, return the right value
                //console.log('getDetectorMetaValue('+metaLabel+'), type='+typeStored)
                switch (typeStored)
                {
                case Experiment.MetaDataType.MT_FLOAT:
                    return metaValue.getFvalue();
                case Experiment.MetaDataType.MT_INT:
                    return metaValue.getIvalue();
                case Experiment.MetaDataType.MT_STRING:
                    return metaValue.getSvalue();
                }
            }
        }

        console.error("Failed to read detector meta value "+metaLabel+" for type: "+typeStored);
        //console.error('Failed to read detector meta value '+metaLabel+' due to invalid type: '+typeStored+', looking for: '+c+', detector meta: '+detector.getMetaList()+', labels: '+this.experiment.getMetaLabelsList());
        return "";
    }

    getDetectorReadUnixTime(detector: Experiment.Location.DetectorSpectrum): number
    {
        let readDate = this.getDetectorMetaValue("DATE", detector);
        let readTime = this.getDetectorMetaValue("TIME", detector);

        // Expecting date to be of the form: 01-Jun-2019
        // Expecting time to be of the form: 14:55:32

        // Combine them
        let readDateTime = readDate+"T"+readTime;

        // Calculate a unix time
        let theMoment: moment.Moment = moment(readDateTime, "DD-MMM-YYYYTHH:mm:ss");
        return theMoment.unix();
    }
    /*
    initMetadataLookup(): void
    {
        let labels = this.experiment.getMetaLabelsList();
        let types = this.experiment.getMetaTypesList();

        if(labels.length != types.length)
        {
            console.error('WARNING: Meta labels list length does not match meta types list length!');
        }

        for(let idx of labels)
        {
            this.metaTypeLookup[labels[idx]] = types[idx];
        }
    }
*/

    // PseudoIntensityDataQuerierSource interface
    getPseudoIntensityData(name: string): PMCDataValues
    {
        // If the name exists in our list of pseudo-elements, get its index and read out a map
        let elemList = this.getPseudoIntensityElementsList();
        let elemIdx = elemList.indexOf(name);
        if(elemIdx == -1)
        {
            throw new Error("The currently loaded dataset does not include pseudo-intensity data with column name: \""+name+"\"");
        }

        // Run through all locations & build it
        let values: PMCDataValue[] = [];

        let locs = this.experiment.getLocationsList();
        let idx = 0;
        for(let loc of locs)
        {
            let pseudoIntensities = loc.getPseudoIntensitiesList();
            // We just read the first one, DataSet can store detector ID but apparently the final flight
            // data will only have 1 pseudo-intensity value per PMC anyway.
            // TODO: get rid of detector ID choices here
            if(pseudoIntensities && pseudoIntensities.length > 0)
            {
                // Get PMC
                let pmc = Number.parseInt(loc.getId());

                let intensities = pseudoIntensities[0].getElementIntensitiesList();
                values.push(new PMCDataValue(pmc, intensities[elemIdx]));
            }
        }

        return PMCDataValues.makeWithValues(values);
    }

    // HousekeepingDataQuerierSource interface
    getHousekeepingData(name: string): PMCDataValues
    {
        let metaLabels = this.experiment.getMetaLabelsList();
        let metaTypes = this.experiment.getMetaTypesList();

        // If it exists as a metaLabel and has a type we can return, do it
        let metaIdx = metaLabels.indexOf(name);
        if(metaIdx < 0)
        {
            throw new Error("The currently loaded dataset does not include housekeeping data with column name: \""+name+"\"");
        }

        let metaType = metaTypes[metaIdx];
        if(metaType != Experiment.MetaDataType.MT_FLOAT && metaType != Experiment.MetaDataType.MT_INT)
        {
            throw new Error("Non-numeric data type for housekeeping data column: "+name);
        }

        // Run through all locations & build it
        let values: PMCDataValue[] = [];

        let locs = this.experiment.getLocationsList();
        let idx = 0;
        for(let loc of locs)
        {
            let metaList = loc.getMetaList();
            if(metaList)
            {
                // Not all locations have all metadata values, eg if no spectra, this won't have a LIVETIME
                if(metaIdx >= 0 && metaIdx < metaList.length)
                {
                    let item = metaList[metaIdx];
                    if(item != undefined)
                    {
                        let pmc = Number.parseInt(loc.getId());
                        let value = (metaType == Experiment.MetaDataType.MT_FLOAT) ? item.getFvalue() : item.getIvalue();

                        values.push(new PMCDataValue(pmc, value));
                    }
                }
            }
        }

        return PMCDataValues.makeWithValues(values);
    }

    getPositionData(axis: string): PMCDataValues
    {
        if(axis != "x" && axis != "y" && axis != "z")
        {
            throw new Error("Cannot find position for axis: "+axis);
        }

        let values: PMCDataValue[] = [];

        let locs = this.experiment.getLocationsList();
        for(let loc of locs)
        {
            // Get PMC
            let pmc = Number.parseInt(loc.getId());

            let beam = loc.getBeam();
            if(beam)
            {
                values.push(
                    new PMCDataValue(
                        pmc,
                        (axis == "x")
                            ? (beam.getX())
                            : ( (axis == "y") ? (beam.getY()) : beam.getZ() )
                    )
                );
            }
        }

        return PMCDataValues.makeWithValues(values);
    }

    // SpectrumDataQuerierSource
    getSpectrumRangeMapData(channelStart: number, channelEnd: number, detectorExpr: string): PMCDataValues
    {
        // For now, only supporting A & B for now
        if(detectorExpr != "A" && detectorExpr != "B")
        {
            console.error("getSpectrumData: Invalid detectorExpr: "+detectorExpr+", must be A or B");
            return null;
        }

        let values: PMCDataValue[] = [];

        // Loop through & sum all values within the channel range
        let locs = this.experiment.getLocationsList();

        let foundRange = false;
        for(let loc of locs)
        {
            let detectors = loc.getDetectorsList();
            let pmc = Number.parseInt(loc.getId());

            // At this point, we want to read from the detectors in this location. We are reading spectra for each PMC
            // so we need to read for the detector specified (A vs B), and within there, we may have normal or dwell
            // spectra. We can't actually combine normal vs dwell because the counts in dwell would be higher so
            // we just hard-code here to read from normal!
            let detIdx = 0;
            for(let det of detectors)
            {
                let detectorId = this.getDetectorMetaValue("DETECTOR_ID", det);
                let detectorReadType = this.getDetectorMetaValue("READTYPE", det);

                if(detectorId == detectorExpr && detectorReadType == "Normal")
                {
                    // We found it, return the sum of that section of the spectrum
                    let vals = this.getSpectrumValues(pmc, detIdx);

                    if(channelStart < 0 || channelEnd < channelStart || channelEnd > vals.length)
                    {
                        console.error("getSpectrumData: Invalid start/end channel specified");
                        return null;
                    }

                    // Loop through & add it
                    let sum = 0;
                    for(let ch = channelStart; ch < channelEnd; ch++)
                    {
                        sum += vals[ch];
                    }

                    values.push(new PMCDataValue(pmc, sum));
                    foundRange = true;
                }

                detIdx++;
            }
        }

        if(!foundRange)
        {
            console.error("getSpectrumData: Invalid start/end channel specified");
            return null;
        }

        return PMCDataValues.makeWithValues(values);
    }

    getSpectrumDifferences(channelStart: number, channelEnd: number, sumOrMax: boolean): PMCDataValues
    {
        let values: PMCDataValue[] = [];

        // Loop through & sum all values within the channel range
        let locs = this.experiment.getLocationsList();

        for(let loc of locs)
        {
            let detectors = loc.getDetectorsList();
            let pmc = Number.parseInt(loc.getId());

            let spectraA: Int32Array = null;
            let spectraB: Int32Array = null;

            // At this point, we want to read from the detectors in this location. We are reading spectra for each PMC
            // so we need to read for the detector specified (A vs B), and within there, we may have normal or dwell
            // spectra. We can't actually combine normal vs dwell because the counts in dwell would be higher so
            // we just hard-code here to read from normal!
            let detIdx = 0;
            for(let det of detectors)
            {
                let detectorId = this.getDetectorMetaValue("DETECTOR_ID", det);
                let detectorReadType = this.getDetectorMetaValue("READTYPE", det);

                if(detectorReadType == "Normal")
                {
                    let vals = this.getSpectrumValues(pmc, detIdx);

                    if(detectorId == "A")
                    {
                        spectraA = vals;
                    }
                    else
                    {
                        spectraB = vals;
                    }
                }

                detIdx++;
            }

            // We've now got in theory an A and B, check this, and if so, do the operation requested
            if(spectraA && spectraB && spectraA.length == spectraB.length)
            {
                let value = 0;

                for(let c = channelStart; c < channelEnd; c++)
                {
                    let channelAbsDiff = Math.abs(spectraA[c]-spectraB[c]);
                    if(sumOrMax)
                    {
                        value += channelAbsDiff;
                    }
                    else
                    {
                        if(channelAbsDiff > value)
                        {
                            value = channelAbsDiff;
                        }
                    }
                }

                values.push(new PMCDataValue(pmc, value));
            }
        }

        return PMCDataValues.makeWithValues(values);
    }

    hasDwellSpectra(locationIdx: number): boolean
    {
        let locs = this.experiment.getLocationsList();
        if(locationIdx >= 0 && locationIdx < locs.length)
        {
            let detectors = locs[locationIdx].getDetectorsList();
            if(detectors.length > 2)
            {
                for(let detector of detectors)
                {
                    let readtype = this.getDetectorMetaValue("READTYPE", detector);
                    if(readtype == "Dwell")
                    {
                        // stop looking, we know we have at least one dwell in here!
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getDwellLocationIdxs(): Set<number>
    {
        let result = new Set<number>();

        for(let locCache of this.locationPointCache)
        {
            if(this.hasDwellSpectra(locCache.locationIdx))
            {
                result.add(locCache.locationIdx);
            }
        }

        return result;
    }

    getLocationIdxsForSubDataset(id: string): Set<number>
    {
        let result = new Set<number>();

        for(let locCache of this.locationPointCache)
        {
            if(locCache.source && locCache.source.getRtt() == id)
            {
                result.add(locCache.locationIdx);
            }
        }

        return result;
    }

    getPseudoIntensityElementsList(): string[]
    {
        let ranges = this.experiment.getPseudoIntensityRangesList();
        let elems: string[] = [];
        for(let range of ranges)
        {
            elems.push(range.getName());
        }
        return elems;
    }

    getPMCsForLocationIndexes(locationIndexes: number[], onlyWithNormalOrDwellSpectra: boolean): Set<number>
    {
        let result = new Set<number>();

        // This used to look at this.experiment.getLocationsList(), but now that we want to filter by spectra too
        // it makes more sense to use the purpose-built location cache. Also don't need to parseInt!
        let locs = this.locationPointCache;
        //let locs = this.experiment.getLocationsList();

        for(let idx of locationIndexes)
        {
            let loc = locs[idx];

            // Ignore invalid PMC IDs - this can happen if the wrong MIST ROI CSV is imported and we want the user
            // to be able to recover from it. This was previously commented out, but adding it back because this
            // state is easier to get into now and is unrecoverable from the user's perspective as it hides all ROIs
            if(!loc)
            {
                console.warn(`getPMCsForLocationIndexes found invalid locationIdx: ${idx} Skipping...`);
                continue;
            }

            if(onlyWithNormalOrDwellSpectra && !loc.hasNormalSpectra && !loc.hasDwellSpectra)
            {
                // We're filtering these out
                continue;
            }

            result.add(loc.PMC);
        }
        return result;
    }

    getClosestLocationIdxToPoint(worldPt: Point, maxDistance: number = 3): number
    {
        let idxs = [];
        for(let loc of this.locationPointCache)
        {
            if( loc.coord &&
                Math.abs(worldPt.x-loc.coord.x) < maxDistance &&
                Math.abs(worldPt.y-loc.coord.y) < maxDistance )
            {
                idxs.push(loc.locationIdx);
            }
        }

        // If we've got multiple, find the closest one geometrically
        let closestDist = null;
        let closestIdx = -1;
        for(let idx of idxs)
        {
            let comparePt = this.locationPointCache[idx].coord;
            if(closestIdx == -1)
            {
                closestIdx = idx;

                if(idxs.length > 0)
                {
                    closestDist = distanceBetweenPoints(worldPt, comparePt);
                    //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
                }
            }
            else
            {
                let dist = distanceBetweenPoints(worldPt, comparePt);
                //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
                if(dist < closestDist)
                {
                    closestIdx = idx;
                    closestDist = dist;
                }
            }
        }

        //console.log('Closest: '+closestIdx);
        return closestIdx;
    }

    getSpectrum(locationIndex: number, detectorId: string, readType: string): SpectrumValues
    {
        let locs = this.experiment.getLocationsList();
        let loc = locs[locationIndex];
        let detectors = loc.getDetectorsList();

        // NOTE: if we are asked for a Normal spectrum and we have a Dwell, we add the 2 together and return
        // that instead of just the Normal spectrum.
        let readTypes = [readType];
        if(readType == "Normal")
        {
            readTypes.push("Dwell");
        }


        let pmc = Number.parseInt(loc.getId());

        let result: SpectrumValues[] = [];

        let detIdx = 0;
        for(let detector of detectors)
        {
            // Get the detector name & read type
            let thisDetectorId = this.getDetectorMetaValue("DETECTOR_ID", detector);
            let thisDetectorReadType = this.getDetectorMetaValue("READTYPE", detector);
            let thisLiveTime = this.getDetectorMetaValue("LIVETIME", detector);

            if(thisDetectorId == detectorId && readTypes.indexOf(thisDetectorReadType) >= 0)
            {
                let values = this.getSpectrumValues(pmc, detIdx);
                let maxValue = detector.getSpectrummax();

                result.push(new SpectrumValues(new Float32Array(values), maxValue, detectorId, thisLiveTime));
            }

            detIdx++;
        }

        if(result.length <= 0)
        {
            return null;
        }

        if(result.length == 1)
        {
            return result[0];
        }

        // If we have more than 1, we add them up. This is to support dwell+normal spectra
        return SpectrumValues.bulkSum(result);
    }

    // Inits location caching. Need to tell it which beam IJ's to use. -1=the "old style" i/j stored in the beam
    // while 0+ uses beam.context_locations[]
    // Writes: pmcToLocationIndex, pmcMinMax, locationPointBBox, locationCount, locationPointX/Y/ZSize,
    //         beamUnitsInMeters, _contextPixelsTommConversion, footprintHullPoints, locationsWithNormalSpectra
    //
    private initLocationCaching(beamIJIndex: number): void
    {
        console.log("  initLocationCaching for beam: "+beamIJIndex);

        this.locationPointCache = [];
        this.locationCount = 0;
        this.locationsWithNormalSpectra = 0;
        this.pmcToLocationIndex.clear();
        this.pmcMinMax = new MinMax();
        this.locationPointBBox = null;

        let locPointXMinMax = new MinMax();
        let locPointYMinMax = new MinMax();
        let locPointZMinMax = new MinMax();

        let scanSources = this.experiment.getScanSourcesList();
        let locs = this.experiment.getLocationsList();
        let idx = 0;
        for(let loc of locs)
        {
            // Get PMC
            let pmc = Number.parseInt(loc.getId());

            // Find min/max PMC
            this.pmcMinMax.expand(pmc);

            this.pmcToLocationIndex.set(pmc, idx);

            let beam = loc.getBeam();
            let beamPoint: Point = null;
            if(beam)
            {
                // Get the point
                if(beamIJIndex < 0) // Use "default" aka "main" context image's beam i/j's. Originally this was all we had
                {
                    beamPoint = new Point(beam.getImageI(), beam.getImageJ());
                }
                else
                {
                    // Use a specific set of i/j's
                    let beamIJs = beam.getContextLocationsList();
                    beamPoint = new Point(beamIJs[beamIJIndex].getI(), beamIJs[beamIJIndex].getJ());
                }

                // Side-effect: expand the bbox of all points
                let x = DataSet.convertLocationComponentToPixelPosition(beam.getImageI());
                let y = DataSet.convertLocationComponentToPixelPosition(beam.getImageJ());

                if(!this.locationPointBBox)
                {
                    this.locationPointBBox = new Rect(x, y, 0, 0);
                }
                else
                {
                    this.locationPointBBox.expandToFitPoint(new Point(x, y));
                }

                // Also we're measuring the X/Y/Z sizes:
                locPointXMinMax.expand(beam.getX());
                locPointYMinMax.expand(beam.getY());
                locPointZMinMax.expand(beam.getZ());
            }

            // Store in location cache
            let hasNormalSpectra = false;
            let hasDwellSpectra = false;
            for(let det of loc.getDetectorsList())
            {
                //let detectorId = this.getDetectorMetaValue('DETECTOR_ID', det);
                let detectorReadType = this.getDetectorMetaValue("READTYPE", det);

                if(detectorReadType == "Normal")
                {
                    hasNormalSpectra = true;
                }
                if(detectorReadType == "Dwell")
                {
                    hasDwellSpectra = true;
                }
            }

            // We consider a point to have missing data if it has pseudo-intensities but no spectra
            let pseudoIntensities = loc.getPseudoIntensitiesList();
            let hasPseudo = pseudoIntensities && pseudoIntensities.length > 0;
            let hasMissingData = hasPseudo && !hasNormalSpectra;
            let scanSourceIdx = loc.getScanSource();
            let scanSource = null;
            if(scanSourceIdx >= 0 && scanSourceIdx < scanSources.length)
            {
                scanSource = scanSources[scanSourceIdx];
            }

            let locToCache = new DataSetLocation(beamPoint, idx, pmc, hasNormalSpectra, hasDwellSpectra, hasMissingData, [], hasPseudo, scanSource);
            this.locationPointCache.push(locToCache);

            if(locToCache.hasNormalSpectra || locToCache.hasDwellSpectra)
            {
                this.locationsWithNormalSpectra++;
            }

            if(beamPoint)
            {
                this.locationCount++;
            }

            idx++;
        }

        let detectorConfig = this.experiment.getDetectorConfig().toLowerCase();
        console.log("  Dataset detector config is \""+detectorConfig+"\"");

        // If there is NO location data at all, set up to work as a visual spectroscopy dataset
        // essentially setting defaults for location info so other code doesn't break when it's expecting
        // values to be set
        if(!this.locationPointBBox)
        {
            console.log("  Location data not present in dataset - initialising as visual spectroscopy dataset");

            // We used to init the bounding box to be 0,0->1,1 but any code that uses this was not working (specifically
            // the colour selection tool which checks against the bbox as an early out).
            // Now we init to the size of the default image, which is most likely an MCC image. This way
            // all image pixels are considered to be in the "location" that's selectable

            let w = 1;
            let h = 1;

            if(
                this.defaultContextImageIdx >= 0 &&
                this.defaultContextImageIdx < this.contextImages.length &&
                this.contextImages[this.defaultContextImageIdx]
            )
            {
                if(this.contextImages[this.defaultContextImageIdx].rgbSourceImage)
                {
                    w = this.contextImages[this.defaultContextImageIdx].rgbSourceImage.width;
                    h = this.contextImages[this.defaultContextImageIdx].rgbSourceImage.height;
                }
                else if(
                    this.contextImages[this.defaultContextImageIdx].rgbuSourceImage &&
                    this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r
                )
                {
                    w = this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r.width;
                    h = this.contextImages[this.defaultContextImageIdx].rgbuSourceImage.r.height;
                }
            }

            this.locationPointBBox = new Rect(0, 0, w, h);

            locPointXMinMax.expand(0);
            locPointXMinMax.expand(w);

            locPointYMinMax.expand(0);
            locPointYMinMax.expand(h);

            locPointZMinMax.expand(0);
            locPointZMinMax.expand(1);
        }
        else
        {
            console.log("  Location position relative to context image: (x,y)="+this.locationPointBBox.x+","+this.locationPointBBox.y+", (w,h)="+this.locationPointBBox.w+","+this.locationPointBBox.h);
        }

        // store sizing
        this.locationPointXSize = locPointXMinMax.getRange();
        this.locationPointYSize = locPointYMinMax.getRange();
        this.locationPointZSize = locPointZMinMax.getRange();

        console.log("  Location data physical size X="+this.locationPointXSize+", Y="+this.locationPointYSize+", Z="+this.locationPointZSize);

        // Work out what units we're in
        this.beamUnitsInMeters = this.decideBeamUnitsIsMeters(detectorConfig, locPointZMinMax.max);

        this._contextPixelsTommConversion = this.calcImagePixelsToPhysicalmm();
        console.log("  Conversion factor for image pixels to mm: "+this._contextPixelsTommConversion);
    }

    private decideBeamUnitsIsMeters(detectorConfig: string, locPointZMaxValue: number): boolean
    {
        // Units in the beam location file were converted from mm to meters around June 2020, the way to tell what
        // we're dealing with is by Z, as our standoff distance is always around 25mm, so in mm units this is > 1
        // and in m it's way < 1
        let beamUnitsInMeters = detectorConfig.indexOf("breadboard") == -1 && locPointZMaxValue < 1.0;
        if(beamUnitsInMeters)
        {
            console.log("  Beam location is in meters");
        }
        else
        {
            console.log("  Beam location is in mm");
        }
        return beamUnitsInMeters;
    }

    // Returns the conversion multiplier to go from context image pixels to physical units in mm (based on beam location)
    private calcImagePixelsToPhysicalmm(): number
    {
        // We see the diagonal size of the location points bbox vs the widest X distance between points
        let mmConversion = Math.sqrt(
            (this.locationPointXSize*this.locationPointXSize+this.locationPointYSize*this.locationPointYSize)
            /
            (this.locationPointBBox.w*this.locationPointBBox.w+this.locationPointBBox.h*this.locationPointBBox.h)
        );

        if(this.beamUnitsInMeters)
        {
            mmConversion *= 1000.0;
        }

        return mmConversion;
    }

    private static calcFootprintNormals(footprintHullPoints: HullPoint[]): void
    {
        if(footprintHullPoints.length <= 0)
        {
            console.log("  Footprint hull normals not calculated, no points exist");
            return;
        }

        // Calc normals so we can draw expanded
        let normals = [];
        for(let c = 0; c < footprintHullPoints.length; c++)
        {
            let nextPtIdx = c+1;
            if(c == footprintHullPoints.length-1)
            {
                nextPtIdx = 0;
            }

            let nextPt = footprintHullPoints[nextPtIdx];

            let lineVec = normalizeVector(getVectorBetweenPoints(footprintHullPoints[c], nextPt));
            normals.push(new Point(lineVec.y, -lineVec.x));
        }

        // Smooth them and save
        for(let c = 0; c < footprintHullPoints.length; c++)
        {
            let lastIdx = c-1;
            if(lastIdx < 0)
            {
                lastIdx = footprintHullPoints.length-1;
            }

            footprintHullPoints[c].normal = normalizeVector(addVectors(normals[c], normals[lastIdx]));
        }
    }

    private static fattenFootprint(footprintHullPoints: HullPoint[], enlargeBy: number, angleRad: number): HullPoint[]
    {
        if(footprintHullPoints.length <= 0)
        {
            console.warn("  Footprint hull not widened, no points exist");
            return [];
        }

        // If it's a line scan, we may have ended up with a hull that's basically 2 parallel lines (or close to it).
        // We want this to be expanded out, so at this point we take all hull points and find the hull of all of those points if
        // they were formed of a rect

        // Make rotated boxes for each point, then form the hull around it
        let centers: Point[] = [];
        for(let pt of footprintHullPoints)
        {
            centers.push(new Point(pt.x, pt.y));
        }

        let boxes = DataSet.makeRotatedBoxes(centers, enlargeBy, angleRad);

        let fatHullPoints = [];

        let c = 0;
        for(let box of boxes)
        {
            for(let pt of box)
            {
                fatHullPoints.push(new HullPoint(pt.x, pt.y, footprintHullPoints[c].idx, footprintHullPoints[c].normal));
            }

            c++;
        }

        let result = QuickHull(fatHullPoints);

        // Remove the last point (it's a duplicate of the first)
        result.splice(result.length-1, 1);

        DataSet.calcFootprintNormals(result);

        /* METHOD WITHOUT RECTS:
        // Run through all normals and push the point out by that much
        let fatten = enlargeBy;
        for(let pt of footprintHullPoints)
        {
            pt.x += pt.normal.x*fatten;
            pt.y += pt.normal.y*fatten;
        }
*/
        return result;
    }

    private static makeRotatedBoxes(centers: Point[], halfSideLength: number, angleRad: number): Point[][]
    {
        // Calculate vectors to add to each center to form the box
        let xAddVec = new Point(halfSideLength, 0);
        let yAddVec = new Point(0, halfSideLength);

        // Rotate them by the experiment angle
        let rotM = getRotationMatrix(angleRad);

        let xAddRotatedVec = pointByMatrix(rotM, xAddVec);
        let yAddRotatedVec = pointByMatrix(rotM, yAddVec);

        // Calc the negative direction too
        let xSubRotatedVec = subtractVectors(new Point(0,0), xAddRotatedVec);
        let ySubRotatedVec = subtractVectors(new Point(0,0), yAddRotatedVec);

        let boxes: Point[][] = [];

        for(let center of centers)
        {
            let box: Point[] = [];

            // Calculate the 4 corners of the box around this center
            box.push(addVectors(addVectors(center, xAddRotatedVec), yAddRotatedVec));
            box.push(addVectors(addVectors(center, xSubRotatedVec), yAddRotatedVec));
            box.push(addVectors(addVectors(center, xSubRotatedVec), ySubRotatedVec));
            box.push(addVectors(addVectors(center, xAddRotatedVec), ySubRotatedVec));

            boxes.push(box);
        }

        return boxes;
    }

    // Returns the experiment angle in radians.
    // Can be called any time
    private static findExperimentAngle(footprintHullPoints: HullPoint[]): number
    {
        let experimentAngleRad = 0;

        if(footprintHullPoints.length <= 0)
        {
            console.log("  Experiment angle not checked, as no location data exists");
            return experimentAngleRad;
        }

        // Now that we have a hull, we can find the experiment angle. To do this we take the longest edge of the
        // hull and use the angle formed by that vs the X axis
        let longestVec = null;
        let longestVecLength = 0;
        let longestVecIdx = -1;
        for(let c = 0; c < footprintHullPoints.length; c++)
        {
            let lastIdx = c-1;
            if(lastIdx < 0)
            {
                lastIdx = footprintHullPoints.length-1;
            }

            let vec = getVectorBetweenPoints(footprintHullPoints[lastIdx], footprintHullPoints[c]);
            let vecLen = getVectorLength(vec);
            if(longestVec == null || vecLen > longestVecLength)
            {
                longestVec = vec;
                longestVecLength = vecLen;
                longestVecIdx = c;
            }
        }

        // Now find how many degrees its rotated relative to X axis
        let normalVec = normalizeVector(longestVec);

        // Calculate angle
        experimentAngleRad = Math.acos(getVectorDotProduct(new Point(0, -1), normalVec));

        if(normalVec.x < 0)
        {
            experimentAngleRad = Math.PI/2-experimentAngleRad;
        }

        // If the angle is near 90, 180, 270 or 360, set it to 0 so we don't
        // pointlessly do the rotation when drawing rectangles!
        let angleDeg = radToDeg(experimentAngleRad);

        // If it's near 90 increments, set to 0
        if(
            Math.abs(angleDeg) < 5 ||
            Math.abs(angleDeg-90) < 5 ||
            Math.abs(angleDeg-270) < 5 ||
            Math.abs(angleDeg-360) < 5
        )
        {
            angleDeg = 0;
            experimentAngleRad = 0;
        }

        return experimentAngleRad;
    }

    // Sets some local stats about point coordinates:
    // locationDisplayPointRadius, minXYDistance_mm
    private findMinPointDistances(locationPointCache: DataSetLocation[], locationPointBBox: Rect, locationPointXSize: number, locationPointYSize: number, locationPointZSize: number): void
    {
        let locCoordCount = 0;
        for(let locPt of locationPointCache)
        {
            if(locPt.coord)
            {
                locCoordCount++;
            }
        }

        if(locCoordCount <= 0)
        {
            console.log("  Location data not found for loaded dataset, coord caching skipped");
            return;
        }

        const NumSamples = 100;

        // Randomly pick a few points, find the min distance to between any other point to that point
        // and then average this out
        let samples: number[] = [];
        let nearestDistanceToSamples: number[] = [];

        for(let c = 0; c < NumSamples; c++)
        {
            let sampleIdx = null;

            // Make sure it's got a location
            while(sampleIdx == null)
            {
                sampleIdx = Math.floor(Math.random()*locationPointCache.length);
                if(locationPointCache[sampleIdx].coord == null)
                {
                    sampleIdx = null;
                }
            }

            samples.push(sampleIdx);
        }

        // Now loop through all and find the nearest point to each sample in distance-squared units
        const ExclusionBoxSize = (locationPointBBox.w+locationPointBBox.h)/2/10;

        for(let c = 0; c < NumSamples; c++)
        {
            let sampleIdx = samples[c];
            let samplePt = locationPointCache[sampleIdx].coord;

            let nearestIdx = -1;
            let nearestDistSq = ExclusionBoxSize*ExclusionBoxSize;

            // Find the distance of the nearest point - we can exclude most of the points fast by bounding box
            let locIdx = 0;
            for(let locPt of locationPointCache)
            {
                // Don't compare to itself, don't compare to PMCs without locations!
                if(locPt.coord && locIdx != sampleIdx)
                {
                    let xDiff = Math.abs(samplePt.x-locPt.coord.x);
                    let yDiff = Math.abs(samplePt.y-locPt.coord.y);

                    // Could use ptWithinBox but then gotta calculate xDiff and yDiff anyway...

                    if( xDiff < ExclusionBoxSize &&
                        yDiff < ExclusionBoxSize )
                    {
                        // Get the square distance
                        let distSq = xDiff*xDiff+yDiff*yDiff;
                        if(distSq < nearestDistSq)
                        {
                            nearestIdx = locIdx;
                            nearestDistSq = distSq;
                        }
                    }
                }
                locIdx++;
            }

            if(nearestIdx >= 0)
            {
                nearestDistanceToSamples.push(Math.sqrt(nearestDistSq));
            }
        }

        // Now we have an array of nearest distances, average them and get to a single radius to use
        this.locationDisplayPointRadius = nearestDistanceToSamples.reduce((a,b)=>a+b,0) / nearestDistanceToSamples.length;

        // Increase it a bit, to make sure things are covered nicely
        this.locationDisplayPointRadius = this.locationDisplayPointRadius * 1.1;

        if(isNaN(this.locationDisplayPointRadius))
        {
            this.locationDisplayPointRadius = 1;
        }

        console.log("  Generated locationDisplayPointRadius: "+this.locationDisplayPointRadius);

        // The above was done in image space (context image pixels, i/j coordinates). We now do the same in physical XYZ coordinates
        this.minXYDistance_mm = locationPointXSize+locationPointYSize+locationPointZSize;
        let locs = this.experiment.getLocationsList();
        /*
        let minXYZi = -1;
        let minXYZpti: Point = null;
        let minXYZc = -1;
        let minXYZptc: Point = null;
        */

        for(let c = 0; c < locs.length; c++)
        {
            // We're only interested if there are spectra (or pseudo-intensities, as we may not have received the spectra yet)
            if(locs[c] && (locationPointCache[c].hasNormalSpectra || locationPointCache[c].hasPseudoIntensities))
            {
                const cBeam = locs[c].getBeam();
                if(cBeam)
                {
                    let cPt = new Point(cBeam.getX(), cBeam.getY());

                    for(let i = c+1; i < locs.length; i++)
                    {
                        // We're only interested if there are spectra!
                        if(locationPointCache[i].hasNormalSpectra || locationPointCache[i].hasPseudoIntensities)
                        {
                            const pBeam = locs[i].getBeam();
                            if(pBeam)
                            {
                                let iPt = new Point(pBeam.getX(), pBeam.getY());

                                let vec = getVectorBetweenPoints(cPt, iPt);

                                let distSq = getVectorDotProduct(vec, vec);
                                if(distSq > 0 && distSq < this.minXYDistance_mm)
                                {
                                    this.minXYDistance_mm = distSq;
                                    /*
                                    minXYZi = i;
                                    minXYZpti = iPt;
                                    minXYZc = c;
                                    minXYZptc = cPt;
                                    */
                                }
                            }
                        }
                    }
                }
            }
        }

        this.minXYDistance_mm = Math.sqrt(this.minXYDistance_mm);

        // If we're in meters, convert
        if(this.beamUnitsInMeters)
        {
            this.minXYDistance_mm *= 1000.0;
        }
    }

    // Included to optimise searching for metadata index. Existing code just looped through all meta labels in the dataset
    // to find the index of the one that matches. This was fine when we had 10-20 meta values, but datasets these days have
    // 136 labels, and the most used ones are at the end of the array, so this wasted a lot of loops!
    private cacheMetaData(): void
    {
        this._metaLabelIndexes.clear();

        let c = 0;
        for(let label of this.experiment.getMetaLabelsList())
        {
            this._metaLabelIndexes.set(label, c);
            c++;
        }
    }

    // Caches stats about spectra: spectrumMaxValueNormal, pmcForBulkMaxValueLocation, idxForBulkMaxValueLocation, detectorIds
    // Can be called any time, independent of other init functions
    private cacheSpectrumInfo(): void
    {
        this.spectrumMaxValueNormal = 0;
        this.pmcForBulkMaxValueLocation = null;
        this.idxForBulkMaxValueLocation = null;

        let detectorIds = new Set<string>();
        let locs = this.experiment.getLocationsList();
        let c = 0;
        for(let loc of locs)
        {
            let pmc = Number.parseInt(loc.getId());

            for(let detector of loc.getDetectorsList())
            {
                detectorIds.add(this.getDetectorMetaValue("DETECTOR_ID", detector));

                // Only include this in the appropriate max value
                let readType = this.getDetectorMetaValue("READTYPE", detector);

                if(readType == "Normal")
                {
                    let thisMax = detector.getSpectrummax();
                    if(thisMax > this.spectrumMaxValueNormal)
                    {
                        this.spectrumMaxValueNormal = thisMax;
                    }
                }
                else if(readType == "BulkSum")
                {
                    if(this.pmcForBulkMaxValueLocation != null && this.pmcForBulkMaxValueLocation != pmc)
                    {
                        console.warn("  Multiple PMCs contain BulkSum or MaxValue spectrums");
                    }
                    else if(this.pmcForBulkMaxValueLocation == null)
                    {
                        this.pmcForBulkMaxValueLocation = pmc;
                        console.log("  PMC: "+this.pmcForBulkMaxValueLocation+" contains BulkSum/MaxValue spectrums");
                        this.idxForBulkMaxValueLocation = c;
                    }
                }

                // Decode the spectrum and save it - optimisation made because expression language now queries this and
                // we have some users writing expressions that read this very intensively
                let item = this._decompressedSpectra.get(pmc);
                if(!item)
                {
                    item = [];
                }

                let decoded = DecompressZeroRunLengthEncoding(detector.getSpectrumList(), DataSet.getSpectrumValueCount());
                item.push(decoded);

                this._decompressedSpectra.set(pmc, item);
            }

            c++;
        }
        
        if(!this.pmcForBulkMaxValueLocation)
        {
            console.warn("  Dataset does not contain BulkSum or MaxValue spectrums");
        }
        if(!this.spectrumMaxValueNormal || this.spectrumMaxValueNormal  <= 0)
        {
            console.warn("  Max spectrum value found: "+this.spectrumMaxValueNormal);
        }
        else
        {
            console.log("  Max spectrum value found: "+this.spectrumMaxValueNormal);
        }

        this.detectorIds = Array.from(detectorIds.values());
    }

    // Finds all context images from various sources, stores in contextImages
    // Can be called any time, independent of other init functions
    private findContextImages(loadedContextImage: HTMLImageElement): void
    {
        this.contextImages = [];
        this.rgbuImages = [];

        this.defaultContextImageIdx = -1;

        // We used to read images from each location, but we now rely on the dataset to supply everything pre-made:
        // aligned_context_images: context images with beam info, defines which PMC and if it's trapezoid corrected
        // unaligned context images - images which we DO NOT have beam information
        //
        // main_context_image defines which one to show first
        let mainContextImage = this.experiment.getMainContextImage();

        let alignedImages = this.experiment.getAlignedContextImagesList(); // MCC images
        let unalignedImages = this.experiment.getUnalignedContextImagesList(); // "other" images, this is where RGBU used to reside
        let matchedAlignedImages = this.experiment.getMatchedAlignedContextImagesList(); // "matched" images, which have a transform associated with beam locs of a MCC of given PMC

        let idx = -1; // assume first is default context image
        for(let item of alignedImages)
        {
            let image = item.getImage();
            let data: HTMLImageElement = null;
            if(image == mainContextImage)
            {
                data = loadedContextImage;
            }

            this.contextImages.push(new ContextImageItem(image, item.getPmc(), true, idx, null, null, data));
            idx++;
        }

        for(let image of unalignedImages)
        {
            let data: HTMLImageElement = null;
            if(image == mainContextImage)
            {
                data = loadedContextImage;
            }

            // If this is a tif image, it's an RGBU image, so store it separately
            if(image.toUpperCase().endsWith(".TIF"))
            {
                // We no longer support TIFs as non-matched images! Maybe we should???
                console.error("Loaded unaligned image: "+image+". Ignored, TIF is no longer supported as non-matched image");

                /*                // Add this as a loadable RGBU image
                this.rgbuImages.push(new RGBUImage(image, null, null, null, null));

                // Also add it to the list of selectable context images. It will be lazy-loaded as needed
                this.contextImages.push(new ContextImageItem(image, DataSet.invalidPMC, false, -1, null, null, null));*/
            }
            else
            {
                this.contextImages.push(new ContextImageItem(image, DataSet.invalidPMC, false, -1, null, null, data));
            }
        }

        for(let image of matchedAlignedImages)
        {
            // Get the PMC from the aligned image, so we show the right beam location coordinates
            // NOTE: If there IS NO aligned image, ie a breadboard dataset with NO images included
            // but just made from spectra... we still need to honor the matched images added to the
            // dataset!
            const alignedIdx = image.getAlignedIndex();
            if(alignedIdx >= 0 && (alignedImages.length == 0 || alignedIdx < alignedImages.length))
            {
                let transform = new ContextImageItemTransform(image.getXOffset(), image.getYOffset(), image.getXScale(), image.getYScale());

                // Find the beam IJ number (which "bank" of beam IJ's this image is associated with)
                let beamIdx = alignedIdx-1; // NOTE: start from -1, because -1 references the "default" context image, aka aligned image 0's beam coordinates

                let alignedImagePMC = 0; // If there is no "aligned" image, this just stays at 0
                if(alignedImages.length > 0)
                {
                    alignedImagePMC = alignedImages[alignedIdx].getPmc();
                }

                this.contextImages.push(
                    new ContextImageItem(
                        image.getImage(), // File name
                        alignedImagePMC, // Use the PMC of the aligned image
                        true, // This is beam aligned
                        beamIdx,
                        transform, // Transform info as read from file
                        null, // Not RGBU
                        null, // Don't have the image at the moment, will be lazy loaded if needed
                    )
                );

                if(image.getImage().toUpperCase().endsWith(".TIF"))
                {
                    // Add this as a loadable RGBU image
                    this.rgbuImages.push(
                        new RGBUImage(
                            image.getImage(), // File name
                            // Channels are lazy-loaded
                            null,
                            null,
                            null,
                            null
                        )
                    );
                }
            }
        }

        console.log("  Found "+this.contextImages.length+" context images...");
        
        for(let c = 0; c < this.contextImages.length; c++)
        {
            let i = this.contextImages[c];

            let isdefault = "";
            if(i.path == mainContextImage)
            {
                isdefault = " <-- Main Image";
                this.defaultContextImageIdx = c;
            }
            console.log("   * "+i.path+", pmc="+i.imagePMC+", hasBeam="+i.hasBeamData+", hasImageLoaded="+(i.rgbSourceImage!=null||i.rgbuSourceImage!=null)+isdefault);
        }

        // If we still haven't picked a default, pick the one with the lowest PMC
        if(this.defaultContextImageIdx < 0 && this.contextImages.length)
        {
            let minPMC = this.contextImages[0].imagePMC;
            let minPMCIdx = -1;

            for(let c = 0; c < this.contextImages.length; c++)
            {
                let i = this.contextImages[c];
                if(i.imagePMC < minPMC)
                {
                    minPMC = i.imagePMC;
                    minPMCIdx = c;
                }
            }

            this.defaultContextImageIdx = minPMCIdx;
        }

        // If still don't have one, use first image
        if(this.defaultContextImageIdx < 0)
        {
            this.defaultContextImageIdx = 0;
        }
    }

    // Finds points that are clustered nearby and returns their location indexes
    // Currently the only place this really happens is the cal target scans where we
    // take several lines and grids with large jumps between them.
    // Because PIXL goes sequentially through PMCs, we just need to find when there
    // is a large gap between scan points
    private static makePointClusters(locCache: DataSetLocation[]): PointCluster[]
    {
        // Loop through locations, if distance jump is significantly larger than last size, we
        // assume a new cluster of points has started
        let clusters: PointCluster[] = [new PointCluster([], 0, [], 0)];

        let lastIdx: number = -1;
        let lastDistance: number = -1;
        let distanceSum: number = 0;
        let nonZeroDistanceCount: number = 0;

        // We keep track of the angle at which the gap that broke the cluster went. This is so we
        // can detect the case where for eg breadboards are scanning in a Z shape, so every line
        // moves to the start of the previous line, hence there is a large (same angled) leap.
        // If this is the case, the special work-around is to just return the whole thing as one cluster.
        let clusterBreakAngleCosines: number[] = [];

        for(let locIdx = 0; locIdx < locCache.length; locIdx++)
        {
            if(!locCache[locIdx].coord || (!locCache[locIdx].hasNormalSpectra && !locCache[locIdx].hasPseudoIntensities))
            {
                // No coord, won't have spectra either... ignore
                continue;
            }

            // If we've seen one already, do a distance compare
            if(lastIdx >= 0)
            {
                let vec = subtractVectors(locCache[lastIdx].coord, locCache[locIdx].coord);
                let dst = getVectorLength(vec);
                if(lastDistance > -1 && dst > (distanceSum/nonZeroDistanceCount)*10)
                {
                    // Save the point distance for the last cluster
                    let lastCluster = clusters[clusters.length-1];

                    lastCluster.pointDistance = distanceSum;
                    if(nonZeroDistanceCount > 0)
                    {
                        lastCluster.pointDistance /= nonZeroDistanceCount;
                    }

                    // Save the angle at which this break happened
                    clusterBreakAngleCosines.push(getVectorDotProduct(normalizeVector(vec), new Point(1,0)));

                    // Start a new cluster!
                    clusters.push(new PointCluster([], 0, [], 0));

                    // Forget last distance, we need to discover a new one now
                    lastDistance = -1;
                    distanceSum = 0;
                    nonZeroDistanceCount = 0;
                }
                else
                {
                    if(dst > 0)
                    {
                        lastDistance = dst;

                        distanceSum += dst;
                        nonZeroDistanceCount++;
                    }
                }
            }

            clusters[clusters.length-1].locIdxs.push(locIdx);
            lastIdx = locIdx;
        }

        // Calculate distance for the last one
        if(clusters.length > 0)
        {
            let lastCluster = clusters[clusters.length-1];

            lastCluster.pointDistance = distanceSum;
            if(nonZeroDistanceCount > 0)
            {
                lastCluster.pointDistance /= nonZeroDistanceCount;
            }
        }

        // If we find that the clusters are all broken in the same direction, we have to assume it's a scan done in a Z pattern, and we
        // don't want every single scan line to be a separate cluster, so here we check for that and if that's the case, we build one single
        // cluster for the whole thing
        if(clusterBreakAngleCosines.length > 0)
        {
            let similarAngleCount: number = 0;
            for(let angleCos of clusterBreakAngleCosines)
            {
                // We allow for some floating-point accuracy mess, but really they should be exactly equal
                if(Math.abs(angleCos-clusterBreakAngleCosines[0]) < 0.001)
                {
                    similarAngleCount++;
                }
            }

            if(similarAngleCount >= clusterBreakAngleCosines.length)
            {
                // We are assuming this is a Z scan pattern, so we turn the whole thing into a single cluster
                let singleCluster: PointCluster = new PointCluster([], clusters[0].pointDistance, [], clusters[0].angleRadiansToContextImage);
                for(let cluster of clusters)
                {
                    singleCluster.locIdxs.push(...cluster.locIdxs);
                }

                clusters = [singleCluster];
            }
        }

        // If we only have the 1 default cluster we added...
        if(clusters.length == 1 && clusters[0].locIdxs.length <= 0)
        {
            clusters = [];
        }

        // Calculate footprints for all clusters
        let c = 0;
        for(let cluster of clusters)
        {
            cluster.footprintPoints = DataSet.makeConvexHull(cluster.locIdxs, locCache);
            cluster.angleRadiansToContextImage = DataSet.findExperimentAngle(cluster.footprintPoints);

            cluster.footprintPoints = DataSet.fattenFootprint(cluster.footprintPoints, cluster.pointDistance/2, cluster.angleRadiansToContextImage);

            console.log("  Point cluster "+(c+1)+" contains "+cluster.locIdxs.length+" PMCs, "+cluster.footprintPoints.length+" footprint points, "+radToDeg(cluster.angleRadiansToContextImage).toFixed(3)+" degrees rotated");
            c++;
        }

        return clusters;
    }

    private static makeConvexHull(useLocIdxs: number[], locationPointCache: DataSetLocation[]): HullPoint[]
    {
        let hullPoints: HullPoint[] = [];
        for(let locIdx of useLocIdxs)
        {
            let loc = locationPointCache[locIdx];

            if(loc && loc.coord && (loc.hasNormalSpectra || loc.hasPseudoIntensities)) // normal spectra may not be down yet!
            {
                hullPoints.push(new HullPoint(loc.coord.x, loc.coord.y, locIdx));
            }
        }

        // Find the hull
        let result = QuickHull(hullPoints);

        // Remove the last point (it's a duplicate of the first)
        result.splice(result.length-1, 1);
        return result;
    }

    private makePMCPolygons(cluster: PointCluster): void
    {
        let voronoi = new Voronoi();

        // Create a larger bbox to ensure all polygons generated extend past the hull
        let clusterBBox: Rect = null;

        let sites = [];
        let locIdxs = [];

        let c = 0;
        for(let locIdx of cluster.locIdxs)
        {
            let loc = this.locationPointCache[locIdx];

            if(loc && loc.coord && (loc.hasNormalSpectra || loc.hasPseudoIntensities)) // normal spectra may not be down yet!
            {
                let pt = new Point(loc.coord.x, loc.coord.y);
                if(!clusterBBox)
                {
                    clusterBBox = new Rect(pt.x, pt.y, 0, 0);
                }
                else
                {
                    clusterBBox.expandToFitPoint(pt);
                }

                sites.push(pt);
                locIdxs.push(locIdx);
            }
            c++;
        }

        if(!clusterBBox)
        {
            // haven't found valid points
            console.warn("No valid points for generating PMC polygons for: "+cluster.locIdxs.join(","));
            return;
        }

        const bboxExpand = 50;
        let bbox = {xl: clusterBBox.x-bboxExpand, xr: clusterBBox.maxX()+bboxExpand, yt: clusterBBox.y-bboxExpand, yb: clusterBBox.maxY()+bboxExpand}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom

        let hullPts = [];
        for(let pt of cluster.footprintPoints)
        {
            hullPts.push([pt.x, pt.y]);
        }
        hullPts = [hullPts];

        let diagram = voronoi.compute(sites, bbox);

        // Sites now have voronoiID added, we add the polygons associated with this site to our returned polygon list
        for(c = 0; c < sites.length; c++)
        {
            let site = sites[c];
            let cell = diagram.cells[site.voronoiId];

            // Get the location index for this "site" and see if it's a member of our ROI
            let siteLocIdx = locIdxs[c];

            if(cell && siteLocIdx != undefined)
            {
                let halfedges = cell.halfedges;
                if(halfedges.length > 2)
                {
                    let v = halfedges[0].getStartpoint();

                    let polyPts = [];
                    polyPts.push([v.x, v.y]);

                    for(let halfedge of halfedges)
                    {
                        v = halfedge.getEndpoint();
                        polyPts.push([v.x, v.y]);
                    }

                    // TESTING: no clipping
                    //let clippedPolyPts = [[polyPts]];

                    // TESTING: only clip against max poly, not footprint
                    //let clippedPolyPts = DataSet.clipAgainstLargestPolyAllowed([polyPts], this.locationPointCache[siteLocIdx], (cluster.pointDistance/2)*1.25, cluster.angleRadiansToContextImage);

                    // Clip polygon against the hull
                    let hullClippedPolyPts = polygonClipping.intersection([polyPts], hullPts);

                    // Also against the biggest polygon we want to allow
                    let clippedPolyPts = DataSet.clipAgainstLargestPolyAllowed(
                        hullClippedPolyPts,
                        this.locationPointCache[siteLocIdx],
                        (cluster.pointDistance/2)*1.25,
                        DataSet.getAngleForLocation(siteLocIdx, cluster.angleRadiansToContextImage, this.locationPointCache)
                    );

                    // Now we convert it back to Points
                    this.locationPointCache[siteLocIdx].polygon = [];
                    if(clippedPolyPts.length == 1 && clippedPolyPts[0].length == 1)
                    {
                        // NOTE: we don't add the last one, because it's a repeat of the first one
                        for(let ptIdx = 0; ptIdx < clippedPolyPts[0][0].length-1; ptIdx++)
                        {
                            let pt = clippedPolyPts[0][0][ptIdx];
                            this.locationPointCache[siteLocIdx].polygon.push(new Point(pt[0], pt[1]));
                        }
                    }
                }
            }
        }
    }

    private static getAngleForLocation(locIdx: number, clusterAngleRad: number, locationPointCache: DataSetLocation[]): number
    {
        // Get the 2 points around it. If this isn't possible just use the cluster angle
        if(locIdx <= 0 || locIdx >= locationPointCache.length-1)
        {
            return clusterAngleRad;
        }

        let pt = locationPointCache[locIdx].coord;

        let preIdx = locIdx-1;
        let postIdx = locIdx+1;

        // If they have a coordinate...
        let prePt = locationPointCache[preIdx].coord;
        let postPt = locationPointCache[postIdx].coord;

        if(!pt || !prePt || !postPt)
        {
            return clusterAngleRad;
        }

        // If somehow we ended up with the same points, we can't generate an angle here...
        // Found this issue with Baker Springs test dataset (from breadboard)
        if(vectorsEqual(prePt, pt) || vectorsEqual(pt, postPt))
        {
            console.warn("Found equivalent PMC coordinates, failed to generate angle. PMCs around: "+locationPointCache[locIdx].PMC);
            return clusterAngleRad;
        }

        // Find the vectors, add them
        let preVecN = normalizeVector(getVectorBetweenPoints(prePt, pt));
        let postVecN = normalizeVector(getVectorBetweenPoints(pt, postPt));

        // If the angle between them is > 60 degrees...
        let angleAroundPt = Math.acos(getVectorDotProduct(preVecN, postVecN));
        if(angleAroundPt > (Math.PI / 3))
        {
            // We assume we're at a turning point and we'll just use the overall angle
            return clusterAngleRad;
        }

        let vecN = normalizeVector(addVectors(preVecN, postVecN));

        // Get its angle to axis
        let compareAxis = new Point(0, vecN.x < 0 ? 1 : -1);
        let result = Math.acos(getVectorDotProduct(compareAxis, vecN));

        if(!isFinite(result))
        {
            console.error("NaN in getAngleForLocation");
            return clusterAngleRad;
        }

        return result;
    }

    private static clipAgainstLargestPolyAllowed(polyPts: number[][][], loc: DataSetLocation, maxBoxSize: number, clusterAngleRad: number): number[][][]
    {
        // Generate the largest allowable polygon for the point in question
        if(!loc.coord)
        {
            return [];
        }

        let boxes = DataSet.makeRotatedBoxes([loc.coord], maxBoxSize, clusterAngleRad);
        if(boxes.length != 1 && boxes[0].length != 4)
        {
            return [];
        }

        let boxPts: number[][][] = [[]];
        for(let pt of boxes[0])
        {
            boxPts[0].push([pt.x, pt.y]);
        }

        try
        {
            // Do the clip
            let result = polygonClipping.intersection(polyPts, boxPts);
            return result;
        }
        catch (err)
        {
            console.error(err);
        }
        return [];
    }

    getSpectrumValues(pmc: number, detectorIdx: number): Int32Array
    {
        let spectra = this._decompressedSpectra.get(pmc);
        if(!spectra || !spectra[detectorIdx])
        {
            return new Int32Array();
        }

        return spectra[detectorIdx];
    }
}