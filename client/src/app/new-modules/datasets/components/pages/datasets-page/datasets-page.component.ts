import { Component } from '@angular/core';
import { Router } from "@angular/router";
import { APIDataService } from "src/app/new-modules/core/core.module";

import { ResponseStatus } from "src/app/generated-protos/response";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { MemoizationService } from 'src/app/new-modules/core/services/memoization.service';
import { of } from 'rxjs';


@Component({
    selector: 'app-datasets-page',
    templateUrl: './datasets-page.component.html',
    styleUrls: ['./datasets-page.component.scss']
})
export class DatasetsPageComponent {
    datasetList: string[] = [];
    //lastReqFilter?: DatasetListReq;

    constructor(
        private _router: Router,
        private _apiData: APIDataService,
        //private _memoService: MemoizationService,
    ) {
        // Need to do an initial request for datasets to handle the case where we're already connected
        //this.requestDatasets();
    }

    ngOnInit() {
        this.onRefresh();
    }
    /*
        private requestDatasets()
        {
            let req: DatasetListReq = {SolFilter: ""};
            this.lastReqFilter = req;
            this._memoService.requestRoute(
                "datasets", // route key
                JSON.stringify(this.lastReqFilter), // body of the request
                ()=> // function to call if we don't have a cached response
                {
                    return of(this._apiComms.send(req)); // TODO: convert this to be able to send a specific type and have it return the response type+upd type in an Observable?
                },
                (resp: string[])=> // function to call if we do have a cached response
                {
                    this.datasetList = resp;
                }, 
                false // don't cache the response (we're caching it ourselves so we can include the data processing step)
            );
        }
    
        private processDatasets(resp: DatasetListResp)
        {
            this.datasetList = [];
            for(let ds of resp.datasets)
            {
                this.datasetList.push(ds.rtt);
            }
    
            // Cache the response, JSONify the request so we can use it as a body key (maybe we want this to be automatic?)
            this._memoService.cacheRouteResponse("datasets", JSON.stringify(this.lastReqFilter), this.datasetList);
        }
    */
    onHome() {
        this._router.navigateByUrl("/");
    }

    onRefresh() {
        this._apiData.sendScanListRequest(ScanListReq.create()).subscribe(
            (resp: ScanListResp) => {
                if (resp.status != ResponseStatus.WS_OK) {
                    console.error("Response failed: " + resp);
                    this.datasetList = ["ERROR"];
                    return;
                }

                this.datasetList = [];
                for (let ds of resp.scans) {
                    this.datasetList.push(ds.id);
                }
            }
        )
    }
}
