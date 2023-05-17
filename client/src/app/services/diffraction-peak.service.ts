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

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, ReplaySubject, Subject, Subscription } from "rxjs";
import { tap } from "rxjs/operators";
import { DiffractionPeakQuerierSource } from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { DataSet } from "src/app/models/DataSet";
import { Diffraction } from "src/app/protolibs/diffraction_pb";
import { EnergyCalibrationManager } from "src/app/UI/spectrum-chart-widget/energy-calibration-manager";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";







const peakWidth = 15; // TODO: set this right!

export class DiffractionPeak
{
    public static readonly statusUnspecified = "unspecified";
    public static readonly statusNotAnomaly = "not-anomaly";

    public static readonly statusToLabelMap = new Map<string, string>([
        ["other", "Other"],
        ["intensity-mismatch", "Intensity Mismatch"],
        ["diffraction-peak", "Diffraction Peak"],
        [DiffractionPeak.statusNotAnomaly, "Not Anomaly"],
        [DiffractionPeak.statusUnspecified, "Unspecified"],
    ]);

    private _id: string = "";

    constructor(
        public pmc: number,

        // Raw data values
        public effectSize: number,
        public baselineVariation: number,
        public globalDifference: number,
        public differenceSigma: number,
        public peakHeight: number,
        public detector: string,
        public channel: number,

        // keV values are calculated based on calibration
        public keV: number,

        public kevStart: number,
        public kevEnd: number,

        // Thought we'd be operating on these, but raw data doesn't (yet?) contain it
        //public confidence: number,
        //public skew: number,
        public status: string, // one of the keys in statusToLabelMap
        id: string = null)
    {
        this._id = id;
        if(!this._id)
        {
            this._id = this.pmc+"-"+this.channel;
        }
    }

    get id(): string
    {
        return this._id;
    }
}

// Ones entered by user
export class UserDiffractionPeak
{
    constructor(
        public pmc: number, // raw user input
        public keV: number, // raw user input. NOTE: -1 means it's a roughness peak!
        //public channel: number, // calculated from keV
    )
    {
    }

    get id(): string
    {
        return "usr-"+this.pmc+"-"+this.keV;
    }
}

const roughnessIDPrefix = "roughness-";

export class RoughnessItem
{
    private _id: string = "";

    constructor(
        public pmc: number,
        public globalDifference: number,
        public deleted: boolean,
        id: string = null)
    {
        this._id = id;
        if(!this._id)
        {
            this._id = roughnessIDPrefix+this.pmc;
        }
    }

    get id(): string
    {
        return this._id;
    }
}

export class UserRoughnessItem
{
    private _id: string = "";

    constructor(
        public pmc: number, // raw user input
        id: string = null
    )
    {
        this._id = id;
        if(!this._id)
        {
            this._id = "usr-"+this.pmc;
        }
    }

    get id(): string
    {
        return this._id;
    }
}


// TODO: Which detectors calibration do we adopt?
const eVCalibrationDetector = "A";

@Injectable({
    providedIn: "root"
})
export class DiffractionPeakService implements DiffractionPeakQuerierSource
{
    private _subs = new Subscription();

    private _allPeaks: DiffractionPeak[] = [];
    private _allPeaks$ = new ReplaySubject<DiffractionPeak[]>(1);

    private _userPeaks: Map<string, UserDiffractionPeak> = new Map<string, UserDiffractionPeak>();
    private _userPeaks$ = new ReplaySubject<Map<string, UserDiffractionPeak>>(1);

    private _roughnessItems: RoughnessItem[] = [];
    private _roughnessItems$ = new ReplaySubject<RoughnessItem[]>(1);

    // These are all roughness ones, so keV will be -1
    private _userRoughnessItems: Map<string, UserDiffractionPeak> = new Map<string, UserDiffractionPeak>();
    private _userRoughnessItems$ = new ReplaySubject<Map<string, UserDiffractionPeak>>(1);

    private _energyCalibrationManager: EnergyCalibrationManager = null;

    constructor(
        private http: HttpClient
    )
    {
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    // NOTE: Must be called after setDiffractionFile, can be called multiple times
    setEnergyCalibrationManager(energyCalibrationManager: EnergyCalibrationManager)
    {
        // Store so we can query it later too
        this._energyCalibrationManager = energyCalibrationManager;

        // Unsubscribe from any prev one
        this._subs.unsubscribe();
        this._subs = new Subscription();

        this._subs.add(energyCalibrationManager.calibrationChanged$.subscribe(
            ()=>
            {
                for(let peak of this._allPeaks)
                {
                    let channel = peak.channel;
                    let startChannel = channel-peakWidth/2;
                    let endChannel = channel+peakWidth/2;

                    peak.keV = energyCalibrationManager.channelTokeV(channel, eVCalibrationDetector);
                    peak.kevStart = energyCalibrationManager.channelTokeV(startChannel, eVCalibrationDetector);
                    peak.kevEnd = energyCalibrationManager.channelTokeV(endChannel, eVCalibrationDetector);
                }

                this._allPeaks$.next(this._allPeaks);
            }
        ));
    }

    // To be called when a dataset is loaded
    setDiffractionFile(diffractionDB: Diffraction): void
    {
        // Save the peaks!
        this._allPeaks = [];
        this._roughnessItems = [];

        let roughnessPMCs: Set<number> = new Set<number>();

        for(let loc of diffractionDB.getLocationsList())
        {
            let pmc: number = Number.parseInt(loc.getId());
            if(pmc == undefined)
            {
                console.warn("Diffraction file contained invalid location id: "+loc.getId());
                continue;
            }

            for(let peak of loc.getPeaksList())
            {
                /* Never triggered, protobuf defaults to 0, but we don't really want to stop if we get 0's here, so whatever...
                if(isNaN(peak.getPeakHeight()) || isNaN(peak.getGlobalDifference()))
                {
                    console.error('Diffraction db file is older version, does not contain peak height or global difference');
                    return;
                }
*/
                // Work out if it's a diffraction peak or roughness
                // Thresholds provided by Austin to decide if we're dealing with roughness or diffraction peak
                if(peak.getEffectSize() > 6.0)
                {
                    if(peak.getGlobalDifference() > 0.16)
                    {
                        // It's roughness, can repeat so ensure we only save once
                        if(!roughnessPMCs.has(pmc))
                        {
                            this._roughnessItems.push(
                                new RoughnessItem(
                                    pmc,
                                    peak.getGlobalDifference(),
                                    false // at tihs point we don't know yet
                                )
                            );
                            roughnessPMCs.add(pmc);
                        }
                    }
                    else if(peak.getPeakHeight() > 0.64)
                    {
                        // It's diffraction!
                        this._allPeaks.push(
                            new DiffractionPeak(
                                pmc,
                                
                                Math.min(100, peak.getEffectSize()), // Found in SOL139 some spectra were corrupt and effect size was bazillions, so now capping at 100
                                peak.getBaselineVariation(),
                                peak.getGlobalDifference(),
                                peak.getDifferenceSigma(),
                                peak.getPeakHeight(),
                                peak.getDetector(),
                                peak.getPeakChannel(),

                                // keV values will be calculated later
                                0, 0, 0,

                                DiffractionPeak.statusUnspecified
                            )
                        );
                    }
                    // else ignore
                }
                // else ignore
            }
        }

        let msg = "Diffraction file contained "+this._allPeaks.length+" usable diffraction peaks, "+this._roughnessItems.length+" roughness items";
        if(this._allPeaks.length <= 0 || this._roughnessItems.length <= 0)
        {
            console.warn(msg);
        }
        else
        {
            console.log(msg);
        }

        // Sort them by PMC!
        this._allPeaks.sort((a: DiffractionPeak, b: DiffractionPeak)=>{return a.pmc==b.pmc ? 0 : (a.pmc < b.pmc ? -1 : 1);});
        this._roughnessItems.sort((a: RoughnessItem, b: RoughnessItem)=>{return a.pmc==b.pmc ? 0 : (a.pmc < b.pmc ? -1 : 1);});

        this._roughnessItems$.next(this._roughnessItems);
    }

    get allPeaks$(): Subject<DiffractionPeak[]>
    {
        return this._allPeaks$;
    }

    refreshPeakStatuses(datasetID: string): void
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/status/"+datasetID);
        this.http.get<object>(apiURL, makeHeaders()).subscribe(
            (statuses: object)=>
            {
                this.updatePeakStatuses(statuses);
            }
        );
    }

    // status should be one of the readonly status enums on DiffractionPeak
    setPeakStatus(id: string, status: string, datasetID: string): Observable<object>
    {
        let statusLabel = DiffractionPeak.statusToLabelMap.get(status);
        if(status == DiffractionPeak.statusUnspecified || !statusLabel)
        {
            // Delete it!
            let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/status/"+datasetID+"/"+id);
            return this.http.delete<object>(apiURL, makeHeaders())
                .pipe(
                    tap(
                        (statuses: object)=>
                        {
                            this.updatePeakStatuses(statuses);
                        }
                    )
                );
        }

        // We now know it's valid, so use it as part of the URL
        let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/status/"+status+"/"+datasetID+"/"+id);
        return this.http.post<object>(apiURL, makeHeaders())
            .pipe(
                tap(
                    (statuses: object)=>
                    {
                        this.updatePeakStatuses(statuses);
                    }
                )
            );
    }

    private updatePeakStatuses(peakStatuses: object): void
    {
        // Form a map
        let statusMap: Map<string, string> = new Map<string, string>();
        let deletedRoughnessPMCs: Set<number> = new Set<number>();
        for(let key of Object.keys(peakStatuses))
        {
            let status = peakStatuses[key];

            if(key.startsWith(roughnessIDPrefix))
            {
                deletedRoughnessPMCs.add(parseInt(key.substring(roughnessIDPrefix.length)));
            }
            else
            {
                statusMap.set(key, status);
            }
        }

        for(let peak of this._allPeaks)
        {
            let statusToSet = statusMap.get(peak.id);
            if(!statusToSet)
            {
                statusToSet = DiffractionPeak.statusUnspecified;
            }

            peak.status = statusToSet;
        }

        this._allPeaks$.next(this._allPeaks);


        for(let item of this._roughnessItems)
        {
            item.deleted = deletedRoughnessPMCs.has(item.pmc);
        }

        this._roughnessItems$.next(this._roughnessItems);
    }

    get userPeaks$(): Subject<Map<string, UserDiffractionPeak>>
    {
        return this._userPeaks$;
    }

    refreshUserPeaks(datasetID: string): void
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/manual/"+datasetID);
        this.http.get<Map<string, UserDiffractionPeak>>(apiURL, makeHeaders()).subscribe(
            (result: Map<string, UserDiffractionPeak>)=>
            {
                this.readReturnedUserPeaksObject(result);
            }
        );
    }

    addDiffractionPeak(pmc: number, keV: number, datasetID: string): Observable<Map<string, UserDiffractionPeak>>
    {
        let toSave = new UserDiffractionPeak(pmc, keV);

        let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/manual/"+datasetID);
        return this.http.post<Map<string, UserDiffractionPeak>>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (result: Map<string, UserDiffractionPeak>)=>
                    {
                        this.readReturnedUserPeaksObject(result);
                    }
                )
            );
    }

    deleteDiffractionPeak(id: string, datasetID: string): Observable<Map<string, UserDiffractionPeak>>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_diffraction+"/manual/"+datasetID+"/"+id);
        return this.http.delete<Map<string, UserDiffractionPeak>>(apiURL, makeHeaders())
            .pipe(
                tap(
                    (result: Map<string, UserDiffractionPeak>)=>
                    {
                        this.readReturnedUserPeaksObject(result);
                    }
                )
            );
    }

    private readReturnedUserPeaksObject(ob: Object): void
    {
        this._userPeaks.clear();
        this._userRoughnessItems.clear();

        for(let key of Object.keys(ob))
        {
            let item = ob[key] as UserDiffractionPeak;
            if(item)
            {
                if(item.keV < 0)
                {
                    this._userRoughnessItems.set(key, item);
                }
                else
                {
                    this._userPeaks.set(key, item);
                }
            }
        }

        this._userPeaks$.next(this._userPeaks);
        this._userRoughnessItems$.next(this._userRoughnessItems);
    }

    get roughnessItems$(): Subject<RoughnessItem[]>
    {
        return this._roughnessItems$;
    }

    get userRoughnessItems$(): Subject<Map<string, UserDiffractionPeak>>
    {
        return this._userRoughnessItems$;
    }

    // DiffractionPeakQuerierSource implementation
    getDiffractionPeakEffectData(channelStart: number, channelEnd: number, dataset: DataSet): PMCDataValues
    {
        // Run through all our diffraction peak data and return the sum of all peaks within the given channel range

        // First, add them up per PMC
        let pmcDiffractionCount = new Map<number, number>();
        if(dataset)
        {
            // Fill the PMCs first
            for(let [pmc, locIdx] of dataset.pmcToLocationIndex.entries())
            {
                if(dataset.locationPointCache[locIdx].coord && dataset.locationPointCache[locIdx].hasNormalSpectra)
                {
                    pmcDiffractionCount.set(pmc, 0);
                }
            }
        }

        for(let peak of this._allPeaks)
        {
            if(peak.status != DiffractionPeak.statusNotAnomaly && peak.channel >= channelStart && peak.channel < channelEnd)
            {
                let prev = pmcDiffractionCount.get(peak.pmc);
                if(!prev)
                {
                    prev = 0;
                }
                pmcDiffractionCount.set(peak.pmc, prev+1);
            }
        }

        // Also loop through user-defined peaks
        // If we can convert the user peak keV to a channel, do it and compare
        if(this._energyCalibrationManager)
        {
            for(let peak of this._userPeaks.values())
            {
                let channel = this._energyCalibrationManager.keVToChannel(peak.keV, eVCalibrationDetector);
                if(channel >= channelStart && channel < channelEnd)
                {
                    let prev = pmcDiffractionCount.get(peak.pmc);
                    if(!prev)
                    {
                        prev = 0;
                    }
                    pmcDiffractionCount.set(peak.pmc, prev+1);
                }
            }
        }

        // Now turn these into data values
        let result: PMCDataValue[] = [];
        for(let [pmc, sum] of pmcDiffractionCount.entries())
        {
            result.push(new PMCDataValue(pmc, sum));
        }

        return PMCDataValues.makeWithValues(result);
    }

    getRoughnessData(dataset: DataSet): PMCDataValues
    {
        // Loop through all roughness items and form a map from their globalDifference value
        let result: PMCDataValue[] = [];

        for(let item of this._roughnessItems)
        {
            result.push(new PMCDataValue(item.pmc, item.globalDifference));
        }

        return PMCDataValues.makeWithValues(result);
    }
}
