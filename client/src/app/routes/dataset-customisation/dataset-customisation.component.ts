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

import { Component, HostListener, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable, Subject, Subscription, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { PixelSelection } from "src/app/models/PixelSelection";
import { RGBUImage } from "src/app/models/RGBUImage";
import { APILogService, LogData, LogLine } from "src/app/services/apilog.service";
import { DatasetCustomImageInfo, DataSetService } from "src/app/services/data-set.service";
import { LayoutService } from "src/app/services/layout.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { CanvasDrawer, CanvasDrawParameters } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { httpErrorToString, SDSFields } from "src/app/utils/utils";
import { AddCustomImageComponent, AddCustomImageParameters, AddCustomImageResult } from "./add-custom-image/add-custom-image.component";
import { AlignmentDrawer } from "./drawer";
import { AlignmentInteraction } from "./interaction";
import { AlignmentModel } from "./model";


const imgTypeMatched = "matched";
//const imgTypeRGBU = 'rgbu';
const imgTypeUnaligned = "unaligned";

const logAutoRetrieveLimit = 10; // 10 requests


@Component({
    selector: "app-dataset-customisation",
    templateUrl: "./dataset-customisation.component.html",
    styleUrls: ["./dataset-customisation.component.scss"]
})
export class DatasetCustomisationComponent implements OnInit
{
    private _sub: Subscription;

    //rgbuImages: string[] = [];
    unalignedImages: string[] = [];
    matchedImages: string[] = [];
    title: string = "";

    datasetID: string = "";

    // For drawing to canvas
    transform: PanZoom = new PanZoom();
    interaction: AlignmentInteraction = null;
    drawer: CanvasDrawer = null;
    needsDraw$: Subject<void> = new Subject<void>();

    private _drawModel: AlignmentModel = new AlignmentModel();
    private _loadedMeta: DatasetCustomImageInfo = null;

    private _logIdWatched: string = "";//dataimport-t1ix4qjrir8h2vgo';
    private _logAutoRetrieveCount: number = 0;

    logData: LogLine[] = [];

    xOffset: string = "";
    yOffset: string = "";
    xScale: string = "";
    yScale: string = "";

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _layoutService: LayoutService,
        private _datasetService: DataSetService,
        public dialog: MatDialog,
        private _logService: APILogService,
        private _loadingSvc: LoadingIndicatorService,
    )
    {
    }

    ngOnInit(): void
    {
        this.drawer = new AlignmentDrawer(this._drawModel);
        this.interaction = new AlignmentInteraction(this._drawModel);

        this._sub = this._route.params.subscribe(
            (params)=>
            {
                this.datasetID = params["dataset_id_for_edit"];
                this.refresh();
            }
        );
    }

    ngAfterViewInit()
    {
        this._layoutService.notifyNgAfterViewInit();
    }

    ngOnDestroy()
    {
        this._sub.unsubscribe();
    }

    get cursorShown(): string
    {
        return this._drawModel.cursorShown;
    }

    private refresh(): void
    {
        this.title = null;

        this._datasetService.getCustomTitle(this.datasetID).subscribe(
            (title: string)=>
            {
                this.title = title;
            },
            (err)=>
            {
                console.error("Failed to get custom title!");
                console.log(err);
                this.title = "";
            }
        );

        this.matchedImages = null;
        this._datasetService.listCustomImages(this.datasetID, imgTypeMatched).subscribe(
            (imgs: string[])=>
            {
                this.matchedImages = imgs;
            },
            (err)=>
            {
                console.error("Failed to list matched images!");
                console.log(err);
                this.matchedImages = [];
            }
        );
        /*
        this.rgbuImages = null;
        this._datasetService.listCustomImages(this.datasetID, imgTypeRGBU).subscribe(
            (imgs: string[])=>
            {
                this.rgbuImages = imgs;
            },
            (err)=>
            {
                console.error('Failed to list rgbu images!');
                console.log(err);
                this.rgbuImages = [];
            }
        );
*/
        this.unalignedImages = null;
        this._datasetService.listCustomImages(this.datasetID, imgTypeUnaligned).subscribe(
            (imgs: string[])=>
            {
                this.unalignedImages = imgs;
            },
            (err)=>
            {
                console.error("Failed to list unaligned images!");
                console.log(err);
                this.unalignedImages = [];
            }
        );
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawWorldSpace(screenContext, drawParams);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawScreenSpace(screenContext, drawParams);
        }
    }

    onPreviewMeta(): void
    {
        // We take the values from the input boxes and apply them to the view
        this._drawModel.meta.xOffset = parseFloat(this.xOffset);
        this._drawModel.meta.yOffset = parseFloat(this.yOffset);
        this._drawModel.meta.xScale = parseFloat(this.xScale);
        this._drawModel.meta.yScale = parseFloat(this.yScale);

        this.needsDraw$.next();
    }

    onApplyMeta(): void
    {
        // Force a preview so we have latest values saved in drawModel meta
        this.onPreviewMeta();

        if(confirm("Are you sure you want to overwrite scale/offset factors with the values currently visible?"))
        {
            // Save to API
            this._datasetService.editCustomImageMeta(
                this.datasetID,
                imgTypeMatched,
                this._drawModel.displayImageName,
                this._drawModel.meta).subscribe(
                ()=>
                {
                    alert("Image scale and offset saved. Don't forget to click SAVE to regenerate the dataset.");
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to save image scale and offset"));
                }
            );
        }
    }

    onResetMeta(): void
    {
        if(!this._loadedMeta)
        {
            return;
        }

        // Overwrite the meta values in input boxes from the loaded image
        this.xOffset = this._loadedMeta.xOffset.toLocaleString();
        this.yOffset = this._loadedMeta.yOffset.toLocaleString();
        this.xScale = this._loadedMeta.xScale.toLocaleString();
        this.yScale = this._loadedMeta.yScale.toLocaleString();

        this.needsDraw$.next();
    }

    onSaveTitle(): void
    {
        // Title variable would hold the new value, save that
        this._datasetService.setCustomTitle(this.datasetID, this.title).subscribe(
            ()=>
            {
                // If it was successful, we trigger a dataset reprocess here
                this._datasetService.reprocessDataset(this.datasetID).subscribe(
                    (logId: string)=>
                    {
                        // Check if we've got a log id back for this dataset conversion process
                        if(logId)
                        {
                            alert("Saved. Dataset will be regenerated, watch log output for errors.");

                            this.logData = [];
                            this._logIdWatched = logId;

                            // Refresh now and start auto-retrieving
                            this._logAutoRetrieveCount = 0;
                            setTimeout(()=>{this.onRefreshLog();}, 2000);
                            //this.onRefreshLog();
                        }
                        else
                        {
                            alert("Save failed, unknown error.");
                        }
                        this.refresh();
                    },
                    (err)=>
                    {
                    }
                );
            },
            (err)=>
            {
                alert(httpErrorToString(err, "Failed to save custom title"));
                this.refresh();
            }
        );
    }

    onAddImage(imgType: string): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let title = "Add Matched Image";
        let acceptTypes = "image/jpeg,image/png,image/tiff";
        /*        if(imgType == imgTypeRGBU)
        {
            // ONLY allow tiff
            acceptTypes = "image/tiff";
            title = 'Add Processed RGBU TIFF image';
        }
        else*/ if(imgType == imgTypeUnaligned)
        {
            title = "Add Unaligned Image";
            acceptTypes = "image/jpeg,image/png";
        }

        dialogConfig.data = new AddCustomImageParameters(acceptTypes, imgType == imgTypeMatched, title);
        const dialogRef = this.dialog.open(AddCustomImageComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: AddCustomImageResult)=>
            {
                if(!result)
                {
                    // Cancelled
                    return;
                }

                let nameToSave = result.imageToUpload.name;

                if(nameToSave.toUpperCase().endsWith(".TIF") || nameToSave.toUpperCase().endsWith(".TIFF"))
                {
                    let errs = [];

                    // Check that the file name is not too long because of file extension. We expect it to just be TIF not TIFF
                    if(!nameToSave.toUpperCase().endsWith(".TIF"))
                    {
                        errs.push("Must end in .tif");
                    }
                    else
                    {
                        // Check that the file name conforms to the iSDS name standard, otherwise import will fail
                        let fields = SDSFields.makeFromFileName(result.imageToUpload.name);

                        // Expecting it to parse, and expecting:
                        // - prodType to be VIS (visualisation image) or MSA (multi-spectral analysis... NOT to be confused with MSA spectrum files)
                        // - instrument to be PC (PIXL MCC)
                        // - colour filter to be C (special field for 4-channel RGBU TIF images)
                        // - sol is non-zero length
                        // - rtt is non-zero length
                        // - sclk is non-zero length
                        // - version is >= 1
                        if(!fields)
                        {
                            errs.push("invalid length, should be 58 chars (including .tif)");
                        }
                        else
                        {
                            if(["VIS", "MSA"].indexOf(fields.prodType) < 0)
                            {
                                errs.push("Bad prod type: "+fields.prodType);
                            }

                            if(fields.instrument != "PC")
                            {
                                errs.push("Bad instrument: "+fields.instrument);
                            }

                            if(fields.colourFilter != "C")
                            {
                                errs.push("Bad colour filter: "+fields.colourFilter);
                            }

                            if(fields.getSolNumber() <= 0)
                            {
                                errs.push("Bad sol: "+fields.primaryTimestamp);
                            }

                            if(fields.RTT <= 0)
                            {
                                errs.push("Bad RTT: "+fields.seqRTT);
                            }

                            if(fields.SCLK <= 0)
                            {
                                errs.push("Bad SCLK: "+fields.secondaryTimestamp);
                            }

                            if(fields.version < 1)
                            {
                                errs.push("Bad version: "+fields.version);
                            }
                        }
                    }

                    if(errs.length > 0)
                    {
                        alert("Invalid file name: \""+result.imageToUpload.name+"\"\nErrors encountered:\n"+errs.join("\n"));
                        return;
                    }
                }


                let loadID = this._loadingSvc.add("Uploading "+result.imageToUpload.name+"...");

                // Do the actual upload
                result.imageToUpload.arrayBuffer().then(
                    (imgBytes: ArrayBuffer)=>
                    {
                        this._datasetService.addCustomImage(this.datasetID, imgType, nameToSave, imgBytes, result.meta).subscribe(
                            ()=>
                            {
                                this._loadingSvc.remove(loadID);
                                alert("Don't forget to click SAVE once you're happy with the image list. This will trigger dataset regeneration with the new images in it.");
                                this.refresh();
                            },
                            (err)=>
                            {
                                alert(httpErrorToString(err, "Failed to upload image"));
                                this._loadingSvc.remove(loadID);
                                this.refresh();
                            }
                        );
                    },
                    ()=>
                    {
                        this._loadingSvc.remove(loadID);
                        this.refresh();
                        alert("Error: Failed to read image to upload");
                    }
                );
            }
        );
    }

    onDeleteImage(imgType: string, imgName: string, event): void
    {
        event.stopPropagation();

        if(!confirm("Are you sure you want to delete "+imgName+"?"))
        {
            return;
        }

        let loadID = this._loadingSvc.add("Deleting "+imgName+"...");

        this._datasetService.deleteCustomImage(this.datasetID, imgType, imgName).subscribe(
            ()=>
            {
                this._loadingSvc.remove(loadID);
                alert("Image deleted - Don't forget to click SAVE at the top of this screen to trigger dataset regeneration so the deleted images are wiped from the dataset.");

                // If we deleted the one we were just showing, clear the view too
                if(imgName == this._drawModel.displayImageName)
                {
                    this.clearView();
                }

                this.refresh();
                this.needsDraw$.next();
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                this.refresh();
                alert(httpErrorToString(err, "Failed to delete image"));
            }
        );
    }

    private clearView(): void
    {
        // Clear existing images
        this._drawModel.alignedImage = null;
        this._drawModel.displayImage = null;

        this._drawModel.displayImageName = "";
        this._drawModel.alignedImageName = "";

        this._loadedMeta = null;
        this._drawModel.meta = null;
    }

    onSelectImage(imgType: string, imgName: string): void
    {
        let loadID = this._loadingSvc.add(imgName);

        this.clearView();

        // Get info for this one
        this._datasetService.getCustomImageInfo(this.datasetID, imgType, imgName).subscribe(
            (info: DatasetCustomImageInfo)=>
            {
                if(info.alignedBeamPMC >= 0)
                {
                    // Save a copy of the loaded metadata, and also put a copy in the draw model
                    this._loadedMeta = new DatasetCustomImageInfo(
                        info.downloadLink,
                        info.alignedBeamPMC,
                        info.matchedImage,
                        info.xOffset,
                        info.yOffset,
                        info.xScale,
                        info.yScale,
                        info.alignedImageLink
                    );

                    this._drawModel.meta = new DatasetCustomImageInfo(
                        info.downloadLink,
                        info.alignedBeamPMC,
                        info.matchedImage,
                        info.xOffset,
                        info.yOffset,
                        info.xScale,
                        info.yScale,
                        info.alignedImageLink
                    );
                }

                // Find and load the image this matched image is aligned to (only info we have is the PMC!)

                // Show this on editable textboxes
                this.onResetMeta();

                // Load the display image, it can be one of:
                // * RGB (png or jpg format)
                // * RGBU (tif format)
                let img$: Observable<HTMLImageElement> = null;
                if(info.downloadLink.toUpperCase().endsWith(".TIF") || info.downloadLink.toUpperCase().endsWith(".TIF?LOADCUSTOMTYPE=MATCHED"))
                {
                    img$ = this.loadRGBUImageToRGBDisplay(info.downloadLink, imgName);
                }
                else
                {
                    // Just loading a normal image
                    img$ = this._datasetService.loadImageFromURL(info.downloadLink);
                }

                // Load the aligned image if we got a link
                img$.subscribe(
                    (img: HTMLImageElement)=>
                    {
                        // Save in our model
                        this._drawModel.displayImage = img;
                        this._drawModel.displayImageName = imgName;

                        // If we have to load an aligned image, do that too
                        if(info.alignedImageLink)
                        {
                            let alignedImageName = info.alignedImageLink; // just in case...
                            let bits = info.alignedImageLink.split("/");
                            if(bits.length > 0)
                            {
                                // get the last bit of the link
                                alignedImageName = bits[bits.length-1];
                            }

                            this._datasetService.loadImageFromURL(info.alignedImageLink).subscribe(
                                (alignedImg: HTMLImageElement)=>
                                {
                                    this._loadingSvc.remove(loadID);

                                    this._drawModel.alignedImage = alignedImg;
                                    this._drawModel.alignedImageName = alignedImageName;

                                    // Redraw the new images
                                    this.needsDraw$.next();
                                },
                                (err)=>
                                {
                                    this._loadingSvc.remove(loadID);
                                    alert(httpErrorToString(err, "Failed to download aligned image \""+alignedImageName+"\""));
                                }
                            );
                        }
                        else
                        {
                            this._loadingSvc.remove(loadID);

                            // No more images to load, redraw
                            this.needsDraw$.next();
                        }
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                        alert(httpErrorToString(err, "Failed to download image \""+imgName+"\""));
                    }
                );
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                alert(httpErrorToString(err, "Failed to retrieve image info for \""+imgName+"\""));
            }
        );
    }

    private loadRGBUImageToRGBDisplay(link: string, imgName: string): Observable<HTMLImageElement>
    {
        // We load tif images differently
        return this._datasetService.loadRGBUImageTIF(link, imgName).pipe(
            map(
                (result: RGBUImage)=>
                {
                    // Now that we've read the image as RGBU, we combine the R,G,B channels into a viewable image
                    // NOTE: we raise the brightness, because the TIF images often come down pretty dark
                    let displayImg = result.generateRGBDisplayImage(this._drawModel.displayBrightness, "RGB", false, 1, false, PixelSelection.makeEmptySelection(), null, null);
                    this._drawModel.displaySourceRGBU = result;
                    return displayImg.image;
                },
                (err)=>
                {
                    throw throwError(httpErrorToString(err, "Failed to decode TIF image \""+imgName+"\", or incorrect format"));
                }
            )
        );
    }

    onRefreshLog(): void
    {
        this._logService.getLog(this._logIdWatched).subscribe(
            (resp: LogData)=>
            {
                if(resp.lines.length > this.logData.length)
                {
                    this.logData = resp.lines;
                }

                this._logAutoRetrieveCount++;

                if(this._logAutoRetrieveCount < logAutoRetrieveLimit)
                {
                    setTimeout(()=>{this.onRefreshLog();}, 2000);
                }
            },
            (err)=>
            {
                this.logData = [new LogLine(Date.now(), httpErrorToString(err, "Failed to retrieve log"))];
            }
        );
    }

    get matchedOpacity(): number
    {
        return this._drawModel.matchedOpacity;
    }

    onChangeMatchedOpacity(val: SliderValue): void
    {
        //if(val.finish)
        {
            this._drawModel.matchedOpacity = val.value;
            this.needsDraw$.next();
        }
    }

    get displayBrightness(): number
    {
        return this._drawModel.displayBrightness;
    }

    onChangeDisplayBrightness(val: SliderValue): void
    {
        this._drawModel.displayBrightness = val.value;

        if(this._drawModel.displaySourceRGBU && val.finish)
        {
            this._drawModel.displayImage = this._drawModel.displaySourceRGBU.generateRGBDisplayImage(this._drawModel.displayBrightness, "RGB", false, 1, false, PixelSelection.makeEmptySelection(), null, null).image;
            this.needsDraw$.next();
        }
    }

    get showLog(): boolean
    {
        return this._logIdWatched.length > 0;
    }

    get selectedImageMeta(): DatasetCustomImageInfo
    {
        return this._drawModel.meta;
    }

    @HostListener("window:resize", ["$event"])
    onResize(event)
    {
        // Window resized, notify all canvases
        this._layoutService.notifyWindowResize();
    }
}
