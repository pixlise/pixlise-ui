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
import { ContextImageItem, DataSet } from "src/app/models/DataSet";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SDSFields } from "src/app/utils/utils";




// TODO: Should probably generalise this and make it into a reusable drop-list since the reason for writing
// this was that the standard mat-select wasn't doing enough for us!


class DisplayContextImageItem
{
    marsViewerURL: string = "";
    title: string = "";

    constructor(public item: ContextImageItem, public selected: boolean, public tooltip: string)
    {
        this.marsViewerURL = this.makeMarsViewerURL();
        this.title = this.makeTitle();
    }

    private makeMarsViewerURL(): string
    {    
        // If this is not a valid file name, don't try
        let mvName = this.item.path.toUpperCase();
        let fields = SDSFields.makeFromFileName(mvName);
        if(!fields)
        {
            return "";
        }

        // Work out what the mars viewer URL would be
        if(mvName.toUpperCase().endsWith(".PNG"))
        {
            mvName = mvName.substring(0, mvName.length-3)+"IMG";
        }
        else
        {
            // TIF images shouldn't have mars viewer links!
            return "";
        }

        // Switch the prodType to something that's likely to be found in MarsViewer
        if(fields.prodType == "RCM")
        {
            // Replace this with something that's likely to appear
            /*
Response from Kyle Uckert about RCM and what we should point to...

The RCM product type is something that we (Luca and I) generate, not IDS - it is not archived in the PDS and will not appear in MarsViewer.
RCM is the same as ECM, but has the second TIF layer with the X-ray beam locations. ECM is an EDR product that is essentially the "raw
image". The camera SIS has a description of all of these products, but the main differences are summarized below:

ECM - raw image
EDR - decompanded image
FDR - the raw image that all RDRs are derived from (usually identical to ECM)
RAD - radiometrically-corrected in absolute radiance units (15-bit int)
RAF - radiometrically-corrected in absolute radiance units (floats)
RAS - radiometrically-corrected in absolute radiance units (12-bit ints)
RZS - zenith-scaled radiance (12-bit ints)

We were originally using the ECM files as our source because a radiometric calculation was not available at the start of the mission to
generate the RAD/RAF/RAS/RZS files. In some cases, the radiometric calculation fails and the resulting image is purely white, which also
causes our pipeline to have some issues.

I would suggest opening the ECM file, which should allow a user to select the dropdown button at the top right (see image below) to change
the image to any other RDR file. Also note that the images in MarsViewer are often scaled and the contrast that is shown in these images can
be a bit misleading.
*/

            mvName = mvName.substring(0, 23)+"ECM"+mvName.substring(26);
        }

        // Generate URL
        // An example, when browsing around finding one manually:
        // https://marsviewer.sops.m20.jpl.nasa.gov/?B_ocs_type_name=m20-edr-rdr-m20-mosaic&EDR=s3%3A%2F%2Fm20-sops-ods%2Fods%2Fsurface%2Fsol%2F00257%2Fids%2Ffdr%2Fpixl%2FPCW_0257_0689790669_000FDR_N00800000890639430006075J01.IMG&FS_instrument_id=PC&FS_ocs_name=PCW_0257_0689790669_000FDR_N00800000890639430006075J01.IMG&FS_ocs_type_name=m20-edr-rdr-m20-mosaic&FS_time1=257%2C257&center=376.00000%2C290.00000&iti=0&overlays=PCW_0257_0689790669_000RAD_N00800000890639430006075J02.IMG&sti=1&zoom=1.13830
        // We only want to specify the minimum, which seems to be:
        return "https://marsviewer.sops.m20.jpl.nasa.gov/?FS_ocs_name="+mvName;
    }

    private makeTitle(): string
    {
        let title = "";
        if(this.item.pmc != DataSet.invalidPMC)
        {
            title = "PMC: "+this.item.pmc+" ";

            if(this.item.hasBeamData)
            {
                if(this.item.imageDrawTransform)
                {
                    // File name might contain some info that we're interested in, eg is this mastcam/watson, etc
                    // chop off extension though!
                    let filename = this.item.path;
                    let dotpos = filename.lastIndexOf(".");
                    if(dotpos > -1)
                    {
                        filename = filename.substring(0, dotpos);
                    }
                    title += "(Matched)";
                }
                else
                {
                    title += "(GDS)";
                }
            }
        }

        title += " " + this.item.path;

        return title;
    }
}

@Component({
    selector: "app-context-image-picker",
    templateUrl: "./context-image-picker.component.html",
    styleUrls: ["./context-image-picker.component.scss"]
})
export class ContextImagePickerComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();

    contextImageItemShowing: ContextImageItem = null;
    contextImageItemShowingTooltip: string = "";
    contextImages: DisplayContextImageItem[] = [];

    constructor(
        private _contextImageService: ContextImageService,
        private _datasetService: DataSetService
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.onGotModel();
            }
        ));
    }

    onGotModel(): void
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(dataset)
                {
                    // Set up context image list & select the one that's shown
                    this.contextImages = [];

                    let contextImagesToRead = Array.from(dataset.contextImages);

                    let gdsImgs: DisplayContextImageItem[] = [];
                    let rgbuImgs: DisplayContextImageItem[] = [];
                    let matchedImgs: DisplayContextImageItem[] = [];
                    let otherImgs: DisplayContextImageItem[] = [];

                    for(let img of contextImagesToRead)
                    {
                        let tooltip = this.makeTooltip(img.path);
                        let dispItem = new DisplayContextImageItem(img, false, tooltip);

                        if(img.path.toUpperCase().endsWith(".TIF"))
                        {
                            rgbuImgs.push(dispItem);
                        }
                        else if(img.pmc > DataSet.invalidPMC)
                        {
                            if(!img.imageDrawTransform)
                            {
                                gdsImgs.push(dispItem);
                            }
                            else
                            {
                                matchedImgs.push(dispItem);
                            }
                        }
                        else
                        {
                            otherImgs.push(dispItem);
                        }
                    }

                    let sortFunc = (a: DisplayContextImageItem, b: DisplayContextImageItem)=>
                    {
                        if(a.item.pmc == b.item.pmc)
                        {
                            return a.item.path.localeCompare(b.item.path);
                        }
                        else if(a.item.pmc > b.item.pmc)
                        {
                            return 1;
                        }
                        else
                        {
                            return -1;
                        }
                    };

                    gdsImgs.sort(sortFunc);
                    rgbuImgs.sort(sortFunc);
                    matchedImgs.sort(sortFunc);
                    otherImgs.sort(sortFunc);

                    this.contextImages.push(...gdsImgs);
                    this.contextImages.push(...rgbuImgs);
                    this.contextImages.push(...matchedImgs);
                    this.contextImages.push(...otherImgs);

                    this.updateSelected();
                }
            }
        ));

        this._subs.add(this._contextImageService.mdl.contextImageItemShowing$.subscribe(
            (contextImgShowing: ContextImageItem)=>
            {
                if(contextImgShowing)
                {
                    this.contextImageItemShowing = contextImgShowing;
                    this.contextImageItemShowingTooltip = this.makeTooltip(contextImgShowing.path);
                }
                else
                {
                    this.contextImageItemShowing = null;
                    this.contextImageItemShowingTooltip = "";
                }

                this.updateSelected();
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private updateSelected()
    {
        for(let img of this.contextImages)
        {
            img.selected = (img.item.path == this.currentFileName);
        }
    }

    private makeTooltip(fileName: string): string
    {
        let fields = SDSFields.makeFromFileName(fileName);
        if(!fields)
        {
            return fileName;//'Cannot decode file name';
        }

        let pmc: any = fields.PMC;
        let result = "SOL="+fields.SOL+"\n";
        if(fields.PMC >= 0)
        {
            result += "PMC="+fields.PMC+"\n";
        }

        result += "SCLK="+fields.SCLK+"\n"+
            "Site="+fields.siteID+"\n"+
            "Drive="+fields.driveID+"\n"+
            "RTT="+fields.RTT+"\n"+
            "Instrument="+fields.instrumentLong+"\n"+
            "Version="+fields.version+"\n\n"+
            "ProdType="+fields.prodType+"\n"+
            "Producer="+fields.producerLong+"\n"+
            "Colour Filter="+fields.colourFilterLong+"\n";

        if(fields.PMC < 0)
        {
            result += "CamSpecific="+fields.camSpecific+"\n";
        }

        if(fields.special != "_")
        {
            result += "Special="+fields.special+"\n";
        }

        result += "Venue="+fields.venueLong+"\n";

        if(fields.ternaryTimestamp && fields.ternaryTimestamp != "000")
        {
            result += "TernaryTimestamp="+fields.ternaryTimestamp+"\n";
        }

        if(fields.geometry != "_")
        {
            result += "Geometry="+fields.geometry+"\n";
        }

        if(fields.thumbnail != "_")
        {
            result += "Thumbnail="+fields.thumbnailLong+"\n";
        }

        if(fields.downsample != "_")
        {
            result += "Downsample="+fields.downsample+"\n";
        }
        result += "Compression="+fields.compressionLong;

        return result;
    }

    onSetImage(img: DisplayContextImageItem)
    {
        this._contextImageService.mdl.setContextImageShowing(img ? img.item : null);
    }

    onOpenExternal(img: DisplayContextImageItem, event)
    {
        // Stop this triggering an image selection event
        event.stopPropagation();

        if(!img.marsViewerURL)
        {
            alert("This image is not in Mars Viewer");
            return;
        }

        // Open this URL in a new window
        window.open(img.marsViewerURL, "_blank");
    }

    get currentFileName(): string
    {
        return this.contextImageItemShowing ? this.contextImageItemShowing.path : "(No Image)";
    }
}
