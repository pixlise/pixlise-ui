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
import { ComponentVersions, DetectorConfig, DetectorConfigList, PiquantConfig, PiquantDownloadables, PiquantVersionConfig } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { DataSetService } from "./data-set.service";


@Injectable({
    providedIn: "root"
})
export class EnvConfigurationService
{
    private _subs = new Subscription();

    private _detectorConfig: DetectorConfig = null;
    private _detectorConfig$ = new ReplaySubject<DetectorConfig>(1);

    constructor(
        private http: HttpClient,
        private datasetService: DataSetService
    )
    {
        this.resubscribeDataset();
    }

    get detectorConfig(): DetectorConfig
    {
        return this._detectorConfig;
    }

    get detectorConfig$(): Subject<DetectorConfig>
    {
        return this._detectorConfig$;
    }

    private resubscribeDataset()
    {
        this._subs.add(this.datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(dataset)
                {
                    this.refresh(dataset.experiment.getDetectorConfig());
                }
            },
            (err)=>
            {
            },
            ()=>
            {
                this.resubscribeDataset();
            }
        ));
    }

    refresh(config: string)
    {
        console.log("Refreshing detector config: "+config);
        let apiURL = APIPaths.getWithHost(APIPaths.api_detector_config+"/"+config);
        this.http.get<DetectorConfig>(apiURL, makeHeaders()).subscribe(
            (resp: DetectorConfig)=>
            {
                this._detectorConfig = resp;
                this._detectorConfig$.next(this._detectorConfig);

                // Re-init the XRF line cache
                periodicTableDB.notifyDetectorConfig(this._detectorConfig);
            },
            (err)=>
            {
                console.error("Failed to refresh detector config: \""+config+"\"");
            }
        );
    }

    listConfigs(): Observable<DetectorConfigList>
    {
        console.log("Loading quant config list");
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/config");
        return this.http.get<DetectorConfigList>(apiURL, makeHeaders());
    }

    getPiquantConfigVersions(config: string): Observable<string[]>
    {
        console.log("Loading quant config version for: "+config);
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/config/"+config+"/versions");
        return this.http.get<string[]>(apiURL, makeHeaders());
    }

    getPiquantConfig(config: string, version: string): Observable<PiquantConfig>
    {
        console.log("Loading quant config: "+config+", version: "+version);
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/config/"+config+"/version/"+version);
        return this.http.get<PiquantConfig>(apiURL, makeHeaders());
    }

    listPiquantDownloads(): Observable<PiquantDownloadables>
    {
        console.log("Loading piquant downloadable list");
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/download");
        return this.http.get<PiquantDownloadables>(apiURL, makeHeaders());
    }

    getPiquantVersion(): Observable<PiquantVersionConfig>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/version");
        return this.http.get<PiquantVersionConfig>(apiURL, makeHeaders());
    }

    setPiquantVersion(version: string): Observable<void>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_piquant_root+"/version");
        let body = {"version": version};
        
        return this.http.post<void>(apiURL, body, makeHeaders());
    }

    // TODO: If we've requested these before, cache them locally
    getComponentVersions(): Observable<ComponentVersions>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_componentVersions);

        return this.http.get<ComponentVersions>(apiUrl, makeHeaders());
    }

    // For testing only, calls API endpoints that return specific errors
    test500(): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_test+"/500");
        return this.http.get<string>(apiUrl, makeHeaders());
    }

    test503(): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_test+"/503");
        return this.http.get<string>(apiUrl, makeHeaders());
    }

    test404(): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_test+"/404"); // literally doesn't exist on API side, so should get real 404 back
        return this.http.get<string>(apiUrl, makeHeaders());
    }
}
