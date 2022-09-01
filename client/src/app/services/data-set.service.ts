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

import { HttpClient, HttpErrorResponse, HttpEventType } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivationEnd, Router } from "@angular/router";
import { combineLatest, Observable, of, ReplaySubject, Subject, throwError } from "rxjs";
import { catchError, map, tap, filter, mergeMap } from "rxjs/operators";
import { DataSet, DataSetSummary } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { RGBUImage } from "src/app/models/RGBUImage";
import { Diffraction } from "src/app/protolibs/diffraction_pb";
import { Experiment } from "src/app/protolibs/experiment_pb";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { getMB, httpErrorToString, Uint8ToString } from "src/app/utils/utils";
import { NotificationService } from "./notification.service";
import { QuantificationService } from "./quantification.service";
import { ViewState, ViewStateService } from "./view-state.service";


export class DatasetCustomImageInfo
{
    constructor(
        public downloadLink: string,
        public alignedBeamPMC: number,
        public matchedImage: string,
        public xOffset: number,
        public yOffset: number,
        public xScale: number,
        public yScale: number,
        public alignedImageLink: string
    )
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class DataSetService
{
    // Dataset currently loaded
    private _dataset: DataSet = null;
    private _dataset$ = new ReplaySubject<DataSet>(1);
    private _datasetIDLoaded: string = null;

    private _reqDatasetID$;

    constructor(
        private router: Router,
        private http: HttpClient,
        private _quantService: QuantificationService,
        private _diffractionService: DiffractionPeakService,
        private _notificationService: NotificationService,
        private _viewStateService: ViewStateService,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
        this.router.events.subscribe(
            (event)=>
            {
                if(event instanceof ActivationEnd)
                {
                    let datasetID = event.snapshot.params["dataset_id"];
                    if(datasetID && datasetID != this._datasetIDLoaded)
                    {
                        console.log("Dataset ID changed from: "+this._datasetIDLoaded+" to: "+datasetID+". Loading the new dataset...");
                        // URL changed to one with a different dataset... so load that dataset!
                        this.loadDataset(datasetID);
                    }
                }
            }
        );
    }

    get dataset$(): Subject<DataSet>
    {
        return this._dataset$;
    }

    get datasetIDLoaded(): string
    {
        return this._datasetIDLoaded;
    }

    get datasetLoaded(): DataSet
    {
        return this._dataset;
    }

    listDatasets(searchText: string): Observable<DataSetSummary[]>
    {
        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset);
        if(searchText.length > 0)
        {
            apiUrl += "?"+searchText;
        }
        return this.http.get<DataSetSummary[]>(apiUrl, makeHeaders());
    }

    // Returns an observable which completes with success the moment some data arrives, or error
    // Shows progress on loadingSvc
    private loadDatasetFile(datasetID: string): Observable<Experiment>
    {
        let loadID = this._loadingSvc.add("Dataset");
        let datasetURL = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+datasetID+"/dataset");

        let get$ = this.http.request("GET", datasetURL, {
            observe: "events",
            reportProgress: true,
            responseType: "arraybuffer"
        });

        return get$.pipe(
            // Listen to all updates so we can pick off progress events and display them
            tap(
                (event)=>
                {
                    if(event.type === HttpEventType.DownloadProgress)
                    {
                        this._loadingSvc.update(loadID, "Dataset "+getMB(event.loaded)+" / "+getMB(event.total));
                    }
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    console.error(err);
                }
            ),
            // Want to finish when we get the full response
            filter((event)=>{ return event.type === HttpEventType.Response; }),
            // Decode bytes returned and pass dataset out
            map(
                (event)=>
                {
                    // Redundant, already sorted by the filter... But doesn't compile otherwise?
                    if(event.type !== HttpEventType.Response)
                    {
                        throw throwError("Expected response as last event from dataset download");
                    }

                    this._loadingSvc.remove(loadID);
                    console.log("  Importing dataset: "+datasetID+", size: "+(event.body.byteLength/(1024*1024)).toFixed(2)+"MB");

                    // Decode the incoming data array
                    const data = new Uint8Array(event.body);
                    let decoded = Experiment.deserializeBinary(data);

                    return decoded;
                }
            )
        );
    }

    // Shows progress on loadingSvc
    private loadDiffractionFile(datasetID: string): Observable<Diffraction>
    {
        let loadID = this._loadingSvc.add("Diffraction DB");
        let datasetURL = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+datasetID+"/diffraction");

        let get$ = this.http.request("GET", datasetURL, {
            observe: "events",
            reportProgress: true,
            responseType: "arraybuffer"
        });

        return get$.pipe(
            // Listen to all updates so we can pick off progress events and display them
            tap(
                (event)=>
                {
                    if(event.type === HttpEventType.DownloadProgress)
                    {
                        this._loadingSvc.update(loadID, "Diffraction DB "+getMB(event.loaded)+" / "+getMB(event.total));
                    }
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    console.error(err);
                }
            ),
            // Want to finish when we get the full response
            filter((event)=>{ return event.type === HttpEventType.Response; }),
            // Decode bytes returned and pass diffraction data out
            map(
                (event)=>
                {
                    // Redundant, already sorted by the filter... But doesn't compile otherwise?
                    if(event.type !== HttpEventType.Response)
                    {
                        throw throwError("Expected response as last event from diffraction download");
                    }

                    this._loadingSvc.remove(loadID);
                    console.log("  Importing diffraction DB: "+datasetID+", size: "+(event.body.byteLength/(1024*1024)).toFixed(2)+"MB");

                    // Decode the incoming data array
                    const data = new Uint8Array(event.body);
                    let decoded = Diffraction.deserializeBinary(data);
                    return decoded;
                }
            )
        );
    }

    // Shows progress on loadingSvc
    loadDataset(datasetID: string): void
    {
        if(this._dataset)
        {
            this.close();
        }

        // Show progress while loading dataset
        let loadID = this._loadingSvc.add("View State");

        // Tell view state we have a new dataset ID loading. Any view state operations after this can use this
        // ID. We do this BEFORE we tell it to load a view state to ensure it loads the right one for this dataset!
        this._viewStateService.setDatasetID(datasetID);

        // Trigger dataset download first because it's the largest file
        let datasetFile$ = this.loadDatasetFile(datasetID);

        // Fire off a query for the view state - this will help us determine what to load...
        this._viewStateService.loadViewState().subscribe(
            (state: ViewState)=>
            {
                this._loadingSvc.remove(loadID);

                // We've loaded the view state. If we have a quantification to load, we now know about it

                let diffractionFile$ = this.loadDiffractionFile(datasetID);

                // Start download of context image
                let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+datasetID+"/context-image");
                let contextImg$ = this.loadImageFromURL(apiUrl).pipe(
                    catchError(
                        //(err: any, caught: Observable<HTMLImageElement>) => ObservableInput<any>
                        (err, caught: Observable<HTMLImageElement>)=>
                        {
                            if(err instanceof HttpErrorResponse && err.status == 404)
                            {
                                //console.warn('  Context image not found - skipping download...');
                                return of(null);
                            }
                            return err;
                        }
                    )
                );

                // Tell quant service
                this._quantService.notifyDatasetLoaded(datasetID);

                // We now need to wait for these items to download. If any fail, we say the dataset failed to load...
                let waitDatasetItems = [datasetFile$, contextImg$, diffractionFile$];

                // In parallel, also start download of quantifications
                let quant$: Observable<QuantificationLayer> = null;

                if(state.quantification && state.quantification.appliedQuantID)
                {
                    let quantID = state.quantification.appliedQuantID;
                    console.log("  View state for datasetID: "+datasetID+" contained quantification: "+quantID+". Restoring...");
                    quant$ = this._quantService.getQuantification(quantID);
                }

                // Wait for all the above to finish
                let all$ = combineLatest(waitDatasetItems);
                all$.subscribe(
                    (data)=>
                    {
                        this._notificationService.clear();

                        // At this point, if we have all 3, we can continue. NOTE that the dataset can report null
                        // because that's how it signifies that the load has begun above...
                        if(data[0] != null)
                        {
                            this._dataset = new DataSet(datasetID, data[0], data[1] as HTMLImageElement);
                            this._datasetIDLoaded = datasetID;

                            // Pass the loaded diffraction file to the diffraction service
                            this._diffractionService.setDiffractionFile(data[2]);

                            this._diffractionService.refreshPeakStatuses(this._datasetIDLoaded);
                            this._diffractionService.refreshUserPeaks(this._datasetIDLoaded);

                            // Notify the world!
                            this._dataset$.next(this._dataset);
                            
                            let containsRGBUData = this._dataset.rgbuImages.length > 0;
                            let isXRF = this._dataset.experiment.getNormalSpectra() > 0;
                            const isHybrid = isXRF && containsRGBUData;

                            if(quant$)
                            {
                                quant$.subscribe(
                                    (quant)=>
                                    {
                                        // We don't actually do anything with them here, we just want to ensure
                                        // that they've loaded before we call applyViewState.

                                        // Finally, apply the view state to anything now that dataset stuff is all ready
                                        this._viewStateService.applyViewState(state, this._dataset.isRGBUDataset(), isHybrid);
                                    },
                                    (err)=>
                                    {
                                        // If any quants fail to load, eg your view state was loading a shared quant
                                        // which has since been deleted, we show an error notification and continue
                                        // on so user can continue to operate with this dataset.

                                        this._viewStateService.applyViewState(state, this._dataset.isRGBUDataset(), isHybrid);
                                        // We have since made the current quantification area able to show an error triangle, so no longer needed
                                        //this._notificationService.addNotification("Failed to load assigned quantification");
                                    }
                                );
                            }
                            else
                            {
                                // Just apply the view state
                                // Finally, apply the view state to anything now that dataset stuff is all ready
                                this._viewStateService.applyViewState(state, this._dataset.isRGBUDataset(), isHybrid);
                            }

                        }
                        else
                        {
                            // MUST NOT send error on _dataset$, we only send out null or newly loaded datasets
                            // errors are handled in UI from listening to datasetLoadProgress$
                            //this._dataset$.error('Failed to load all parts of dataset: '+datasetID);
                            this.setLoadProgressError("Failed to load all parts of dataset: "+datasetID);
                        }
                    },
                    (err)=>
                    {
                        // MUST NOT send error on _dataset$, we only send out null or newly loaded datasets
                        // errors are handled in UI from listening to datasetLoadProgress$
                        //this._dataset$.error(err);
                        this.setLoadProgressError(err);
                    }
                );
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);

                console.error("Failed to get view state for dataset: "+datasetID);
                // MUST NOT send error on _dataset$, we only send out null or newly loaded datasets
                // errors are handled in UI from listening to datasetLoadProgress$
                //this._dataset$.error(err);
                this.setLoadProgressError(err);
            }
        );
    }

    private setLoadProgressError(err): void
    {
        // Show a notification for the error
        this._notificationService.addNotification(httpErrorToString(err, "Dataset load failed"));
    }

    // Used by dataset tiles and selected tile, also locally from loadImageFromURL() and 
    loadImgDataURLFromURL(url: string): Observable<string>
    {
        console.log("  Downloading image data: "+url);

        return this.http.get(url, { responseType: "arraybuffer" }).pipe(
            map(
                (arrayBuf: ArrayBuffer)=>
                {
                    // TODO: look at this for speed, javascript puke is probably copying the array 100x before
                    // we get our string. Found this was happening with some code examples used... This implementation
                    // below seems to work but it's def not optimal.
                    const data = new Uint8Array(arrayBuf);
                    let base64 = btoa(Uint8ToString(data));
                    let dataURL = "data:image;base64," + base64;

                    // NOTE: the above isn't going to work straight in an img.src - you need to use the base64Image pipe
                    return dataURL;
                },
                (err)=>
                {
                    if(err instanceof HttpErrorResponse && err.status == 404)
                    {
                        console.warn("  Context image not found - skipping download...");
                    }
                    else
                    {
                        console.error(err);
                    }
                }
            )
        );
    }

    // Used by dataset customisation loading MCC background and aligned images, also locally (loadImage)
    // Shows progress on loadingSvc
    loadImageFromURL(url: string, showLoadingIndicator: boolean = true): Observable<HTMLImageElement>
    {
        console.log("  Downloading image: "+url);

        // Show progress for the file name

        let fileName = "Context Image";
        let urlBits = url.split("/");
        if(urlBits.length > 0)
        {
            fileName = urlBits[urlBits.length-1];
        }

        let loadID = -1;
        if(showLoadingIndicator)
        {
            loadID = this._loadingSvc.add(fileName);
        }

        // Seems file interface with onload/onerror functions is still best implemented wrapped in a new Observable
        return new Observable<HTMLImageElement>((observer)=>
        {
            this.loadImgDataURLFromURL(url).subscribe(
                (dataURL: string)=>
                {
                    if(showLoadingIndicator)
                    {
                        this._loadingSvc.remove(loadID);
                    }

                    let img = new Image();

                    img.onload = () =>
                    {
                        console.log("  Loaded image: "+url+". Dimensions: "+img.width+"x"+img.height);
                        observer.next(img);
                        observer.complete();
                    };

                    img.onerror = ()=>
                    {
                        let errStr = "Failed to download context image: "+url;
                        console.error(errStr);
                        observer.error(errStr);
                    };

                    img.src = dataURL;
                },
                (err)=>
                {
                    if(showLoadingIndicator)
                    {
                        this._loadingSvc.remove(loadID);
                    }
                    observer.error(err);
                }
            );
        }
        );
    }

    // Used by context image (setContextImageShowing)
    loadImage(contextImageFileName: string): Observable<HTMLImageElement>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+this._datasetIDLoaded+"/"+contextImageFileName);
        return this.loadImageFromURL(apiUrl, false);
    }

    /* Was used by PMC inspector
    loadDataURLForContextImage(contextImageFileName: string): Observable<string>
    {
        // Get a signed URL that we can download
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+this._datasetIDLoaded+"/"+contextImageFileName);
        return this.loadImgDataURLFromURL(apiUrl);
    }
*/

    // Used by dataset customisation RGBU loading and from loadRGBUImage()
    // Gets and decodes image
    loadRGBUImageTIF(url: string, imgName: string): Observable<RGBUImage>
    {
        return this.http.get(url, { responseType: "arraybuffer" }).pipe(
            mergeMap(
                (bytes: ArrayBuffer)=>
                {
                    return RGBUImage.readImage(bytes, imgName);
                }
            )
        );
    }

    // Used by RGBU plot, RGBU viewer and context image (setContextImageShowing)
    // Caches in currently loaded dataset, if it's not a part of the dataset, fails
    loadRGBUImage(fileName: string): Observable<RGBUImage>
    {
        if(!this._dataset)
        {
            throw throwError("No dataset loaded");
        }

        // Check if we have it already
        for(let c in this._dataset.rgbuImages)
        {
            let rgbu = this._dataset.rgbuImages[c];
            if(rgbu.path == fileName)
            {
                if(rgbu.loadComplete)
                {
                    // We've loaded it already!
                    return of(rgbu);
                }

                // Load the imagery
                let url = APIPaths.getWithHost(APIPaths.api_dataset+"/download/"+this._datasetIDLoaded+"/"+fileName);
                return this.loadRGBUImageTIF(url, rgbu.path).pipe(
                    tap(
                        (rgbu: RGBUImage)=>
                        {
                            // Save this newly loaded image for next time
                            this._dataset.rgbuImages[c] = rgbu;
                        }
                    )
                );
            }
        }

        throw throwError("Failed to find RGBU image: "+fileName);
    }

    close(): void
    {
        // Clean up!
        this._dataset = null;
        this._datasetIDLoaded = null;

        this._dataset$.next(null);
    }

    // Customisation of datasets:
    getCustomTitle(datasetID: string): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/meta/"+datasetID);
        return this.http.get<object>(apiUrl, makeHeaders()).pipe(
            map((x: object)=>
            {
                // TODO: define a struct for this, for now this works OK
                return x["title"];
            }
            )
        );
    }

    setCustomTitle(datasetID: string, title: string): Observable<object>
    {
        // TODO: define a struct for this, for now this works OK
        let body = { "title": title };

        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/meta/"+datasetID);
        return this.http.put<object>(apiUrl, body, makeHeaders());
    }

    listCustomImages(datasetID: string, imageType: string): Observable<string[]>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/images/"+datasetID+"/"+imageType);
        return this.http.get<string[]>(apiUrl, makeHeaders());
    }

    getCustomImageInfo(datasetID: string, imageType: string, imageName: string): Observable<DatasetCustomImageInfo>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/images/"+datasetID+"/"+imageType+"/"+imageName);
        return this.http.get<DatasetCustomImageInfo>(apiUrl, makeHeaders()).pipe(
            map((x: object)=>
            {
                let result = new DatasetCustomImageInfo(
                    x["download-link"],
                    x["aligned-beam-pmc"],
                    x["matched-image"],
                    x["x-offset"],
                    x["y-offset"],
                    x["x-scale"],
                    x["y-scale"],
                    x["alignedImageLink"]
                );

                // If we had no PMC match info, make sure they're all empty
                if(result.alignedBeamPMC == undefined)
                {
                    result.alignedBeamPMC = -1;
                    result.matchedImage = "";
                    result.xOffset = 0;
                    result.yOffset = 0;
                    result.xScale = 1;
                    result.yScale = 1;
                    result.alignedImageLink = "";
                }

                return result;
            }
            )
        );
    }

    addCustomImage(datasetID: string, imageType: string, imgName: string, imgBytes: ArrayBuffer, meta: DatasetCustomImageInfo): Observable<void>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/images/"+datasetID+"/"+imageType+"/"+imgName);

        // Add meta fields as query params if needed
        if(meta)
        {
            apiUrl += "?x-offset="+meta.xOffset+"&y-offset="+meta.yOffset+"&x-scale="+meta.xScale+"&y-scale="+meta.yScale+"&aligned-beam-pmc="+meta.alignedBeamPMC;
        }

        return this.http.post<void>(apiUrl, imgBytes, makeHeaders());
    }

    editCustomImageMeta(datasetID: string, imageType: string, imgName: string, meta: DatasetCustomImageInfo): Observable<void>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/images/"+datasetID+"/"+imageType+"/"+imgName);

        // Add meta fields as query params if needed
        if(meta)
        {
            apiUrl += "?x-offset="+meta.xOffset+"&y-offset="+meta.yOffset+"&x-scale="+meta.xScale+"&y-scale="+meta.yScale+"&aligned-beam-pmc="+meta.alignedBeamPMC;
        }

        return this.http.put<void>(apiUrl, "", makeHeaders());
    }

    deleteCustomImage(datasetID: string, imageType: string, imgName: string): Observable<void>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_dataset+"/images/"+datasetID+"/"+imageType+"/"+imgName);
        return this.http.delete<void>(apiUrl, makeHeaders());
    }
}
