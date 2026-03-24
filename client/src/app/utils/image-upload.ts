import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { concat, from, Observable, switchMap, tap } from "rxjs";

import { ImageMatchTransform } from "src/app/generated-protos/image";
import { ImageUploadHttpRequest, ImageUploadHttpPartialInfo } from "src/app/generated-protos/image-msgs";

import { SnackbarService, AddCustomImageParameters, AddCustomImageComponent, AddCustomImageResult } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";

import { httpErrorToString, SDSFields } from "./utils";


export class ImageUploader {
  constructor(
    private _snackService: SnackbarService,
    protected _endpointsService: APIEndpointsService,
    protected _dialog: MatDialog,
    protected setWait: ((chunkProgress: number, details?: string) => void)
  ) {
  }

  // Starts image upload flow, returns an error string (or blank string if no errors)
  imageUpload(scanId: string, title: string, showMatchedOption: boolean, acceptTypes?: string): void {
    if (!scanId) {
        this._snackService.openError("No scan id supplied");
        return;
    }

    if (!acceptTypes) {
      acceptTypes = "image/jpeg,image/png,image/tiff";
    }

    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    dialogConfig.data = new AddCustomImageParameters(acceptTypes, showMatchedOption, title, scanId);
    const dialogRef = this._dialog.open(AddCustomImageComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: AddCustomImageResult) => {
      if (!result) {
        // Cancelled
        return;
      }

      const nameToSave = result.imageToUpload.name;

      if (nameToSave.toUpperCase().endsWith(".TIF") || nameToSave.toUpperCase().endsWith(".TIFF")) {
        const errs = [];

        // Check that the file name is not too long because of file extension. We expect it to just be TIF not TIFF
        if (!nameToSave.toUpperCase().endsWith(".TIF")) {
          errs.push("Must end in .tif");
        } else {
          // Check that the file name conforms to the iSDS name standard, otherwise import will fail
          const fields = SDSFields.makeFromFileName(result.imageToUpload.name);

          // Expecting it to parse, and expecting:
          // - prodType to be VIS (visualisation image) or MSA (multi-spectral analysis... NOT to be confused with MSA spectrum files)
          // - instrument to be PC (PIXL MCC)
          // - colour filter to be C (special field for 4-channel RGBU TIF images)
          // - sol is non-zero length
          // - rtt is non-zero length
          // - sclk is non-zero length
          // - version is >= 1
          if (!fields) {
            // Previously we only allowed TIF images that were RGBU - now we say here if we failed to parse it with the SDS file name
            // convention, we just allow it through
            //errs.push("invalid length, should be 58 chars (including .tif)");
          } else {
            if (["VIS", "MSA"].indexOf(fields.prodType) < 0) {
              errs.push("Bad prod type: " + fields.prodType);
            }

            if (fields.instrument != "PC") {
              errs.push("Bad instrument: " + fields.instrument);
            }

            if (fields.colourFilter != "C") {
              errs.push("Bad colour filter: " + fields.colourFilter);
            }

            if (fields.getSolNumber() <= 0) {
              errs.push("Bad sol: " + fields.primaryTimestamp);
            }

            if (fields.RTT <= 0) {
              errs.push("Bad RTT: " + fields.seqRTT);
            }

            if (fields.SCLK <= 0) {
              errs.push("Bad SCLK: " + fields.secondaryTimestamp);
            }

            if (fields.version < 1) {
              errs.push("Bad version: " + fields.version);
            }
          }
        }

        if (errs.length > 0) {
          alert(`Invalid file name: "${result.imageToUpload.name}'\nErrors encountered:\n${errs.join("\n")}`);
          return;
        }
      }

      this._snackService.open(`Uploading ${result.imageToUpload.name}...`);
      this.setWait(0, "Checking Resume");

      // Do the actual upload
      let beamImageRef: ImageMatchTransform | undefined = undefined;
      if (result.imageToMatch) {
        // Create beam match transform, this can be fine-tuned by user later but at its existance will signify that this
        // is a matched image that _can_ be edited in this way
        beamImageRef = ImageMatchTransform.create({
          beamImageFileName: result.imageToMatch,
          xOffset: 0,
          yOffset: 0,
          xScale: 1,
          yScale: 1,
        });
      }

      // First, see if we can resume it from a previous attempt
      const imagePutResumeCheckReq = {
        name: result.imageToUpload.name,
        imageData: new Uint8Array(),
        imageByteSize: result.imageToUpload.size,
        associatedScanIds: [scanId],
        originScanId: scanId,
      };

      this._endpointsService.uploadImage(ImageUploadHttpRequest.create(imagePutResumeCheckReq)).subscribe({
        next: (resp: ImageUploadHttpPartialInfo) => {
          const chunkSize = 20*1024*1024;
          const totalChunks = Math.ceil(result.imageToUpload.size / chunkSize);

          // Set up the observables
          let chunks$ = this.readFileChunks(scanId, result.imageToUpload.name, result.imageToUpload, chunkSize, totalChunks, beamImageRef);

          // Chop out the ones that we have sent already
          if (resp?.bytesReceived > 0) {
            // If it's not a round number of chunks, don't chop...
            if (resp.bytesReceived % chunkSize != 0) {
              console.error(`Error resuming upload, server does not have a multiple of ${chunkSize} bytes, has ${resp.bytesReceived} bytes.`);
            } else {
              const skip = resp.bytesReceived / chunkSize;
              chunks$ = chunks$.slice(skip);
            }
          }

          // Subscribe on-by-one
          concat(...chunks$).subscribe({
            error: err => {
              const errMsg = httpErrorToString(err, `Error uploading ${result.imageToUpload.name}`);
              console.log(errMsg);

              this._snackService.openError(errMsg);
              this.setWait(-1);
            },
            complete: () => {
              console.log(`Uploading ${result.imageToUpload.name} complete, ${totalChunks} x ${chunkSize} bytes`);

              this._snackService.openSuccess(`Successfully uploaded ${result.imageToUpload.name}...`);
              this.setWait(-1);
            }
          });
        },
        error: err => {
          const errMsg = httpErrorToString(err, `EError determining resume position of ${result.imageToUpload.name}:`);
          console.log(errMsg);

          this._snackService.openError(errMsg);
          this.setWait(-1);
        }
      });
    });
  }

  private readFileChunks(scanId: string, fileName: string, file: File, chunkSize: number, totalChunks: number, beamImageRef: ImageMatchTransform | undefined): Observable<ImageUploadHttpPartialInfo>[] {
    const chunks$: Observable<ImageUploadHttpPartialInfo>[] = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end); // Extract chunk

      const chunkByte$ = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
      });
    
      const obs$ = from(chunkByte$ as Promise<ArrayBuffer>);
      chunks$.push(obs$.pipe(
        switchMap(chunk => {
        console.log(`Uploading ${fileName} chunk ${chunkIndex} from ${start}->${end}...`);
        return this.sendChunk(scanId, fileName, file.size, chunk, beamImageRef, chunkIndex, totalChunks);
        })
      ));
    }

    return chunks$;
  }

  private sendChunk(scanId: string, fileName: string, totalSize: number, data: ArrayBuffer, beamImageRef: ImageMatchTransform | undefined, idx: number, totalChunks: number): Observable<ImageUploadHttpPartialInfo> {
    const req = {
      name: fileName,
      imageData: new Uint8Array(data),
      imageByteSize: totalSize,
      associatedScanIds: [scanId],
      originScanId: scanId,
      // oneof
      //locationPerScan
      beamImageRef: beamImageRef,
      partNo: idx,
      totalParts: totalChunks
    };

    if (totalChunks > 1) {
      this.setWait(idx+1, idx == totalChunks-1 ? "Processing Upload" : `Uploading ${fileName} (${Math.round(idx / totalChunks * 100)}%)...`);
    }

    return this._endpointsService.uploadImage(ImageUploadHttpRequest.create(req)).pipe(
      tap(() => {
        console.log(`Upload OK: ${fileName} chunk ${idx}!`);
      })
    );
  }
}