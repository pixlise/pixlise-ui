import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { ImageMatchTransform } from "src/app/generated-protos/image";

import { SnackbarService, AddCustomImageParameters, AddCustomImageComponent, AddCustomImageResult, APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService, UploadProgress, UploadStatus } from "src/app/modules/pixlisecore/services/apiendpoints.service";

import { getPathBase, SDSFields } from "../utils";
import { ImageImportReq } from "../../generated-protos/image-msgs";
import { concat, forkJoin, map, Observable, of, switchMap, throwError } from "rxjs";


export class ImageUploader {
  constructor(
    protected _endpointsService: APIEndpointsService,
    protected _dataService: APIDataService,
    protected _dialog: MatDialog
  ) {
  }

  // Starts image upload flow, returns an observable that reports progress or null if the dialog was cancelled
  imageUpload(scanId: string, title: string, showMatchedOption: boolean, acceptTypes?: string): Observable<UploadProgress|null> {
    if (!scanId) {
      return throwError(() => new UploadProgress("", 0, 0, UploadStatus.US_ERROR, "No scan id supplied"));
    }

    if (!acceptTypes) {
      acceptTypes = "image/jpeg,image/png,image/tiff";
    }

    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    dialogConfig.data = new AddCustomImageParameters(acceptTypes, showMatchedOption, title, scanId, true);
    const dialogRef = this._dialog.open(AddCustomImageComponent, dialogConfig);

    return dialogRef.afterClosed().pipe(
      switchMap(
        (result: AddCustomImageResult) => {
          if (!result) {
            // Cancelled
            return of(null);
          }

          const uploads$: Observable<UploadProgress>[] = [];
          for (let f of result.imagesToUpload) {
            uploads$.push(this.uploadIndividualImage(scanId, f, result.imageToMatch));
          }

          return concat(...uploads$);
        }
      )
    );
  }

  private uploadIndividualImage(scanId: string, imageToUpload: File, imageToMatch: string): Observable<UploadProgress> {
    const nameToSave = imageToUpload.name;

    if (nameToSave.toUpperCase().endsWith(".TIF") || nameToSave.toUpperCase().endsWith(".TIFF")) {
      const errs: string[] = [];

      // Check that the file name is not too long because of file extension. We expect it to just be TIF not TIFF
      if (!nameToSave.toUpperCase().endsWith(".TIF")) {
        errs.push("Must end in .tif");
      } else {
        // Check that the file name conforms to the iSDS name standard, otherwise import will fail
        const fields = SDSFields.makeFromFileName(getPathBase(imageToUpload.name));

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
        return throwError(() => new Error(`Invalid file name: "${imageToUpload.name}'\nErrors encountered:\n${errs.join("\n")}`));
      }
    }

    return new Observable<UploadProgress>(observer => {
      observer.next(new UploadProgress(imageToUpload.name, 0, 0, UploadStatus.US_UPLOADING, `Uploading ${imageToUpload.name}...`));

      this._endpointsService.uploadFile(scanId, imageToUpload, "image").subscribe({
        next: prog => {
          // When it's complete, we don't send that out because we process it further!
          if (prog.status == UploadStatus.US_COMPLETE) {
            // Now import it
            let beamImageRef: ImageMatchTransform | undefined = undefined;
            if (imageToMatch) {
              // Create beam match transform, this can be fine-tuned by user later but at its existance will signify that this
              // is a matched image that _can_ be edited in this way
              beamImageRef = ImageMatchTransform.create({
                beamImageFileName: imageToMatch,
                xOffset: 0,
                yOffset: 0,
                xScale: 1,
                yScale: 1,
              });
            }
            
            // We can now import the image
            observer.next(new UploadProgress(
              imageToUpload.name,
              prog.uploadedBytes,
              prog.uploadedPercent,
              UploadStatus.US_PROCESSING,
              `Processing upload ${imageToUpload.name}...`)
            );

            this._dataService.sendImageImportRequest(ImageImportReq.create({
              name: imageToUpload.name,
              originScanId: scanId,
              associatedScanIds: [scanId],
              beamImageRef: beamImageRef,
            })).subscribe(() => {
              observer.complete();
            });
          } else {
            observer.next(prog);
          }
        },
        error: err => {
          observer.error(err);
          observer.complete();
        }
      });
    });
  }

/*
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
        console.log(`Uploading ${fileName} chunk ${chunkIndex}/${totalChunks} from ${start}->${end}...`);
        return this.sendChunk(scanId, fileName, file.size, chunk, beamImageRef, chunkIndex, totalChunks, chunkSize);
        })
      ));
    }

    return chunks$;
  }

  private sendChunk(scanId: string, fileName: string, totalSize: number, data: ArrayBuffer, beamImageRef: ImageMatchTransform | undefined, idx: number, totalChunks: number, chunkSize: number): Observable<ImageUploadHttpPartialInfo> {
    const req = {
      name: fileName,
      imageData: new Uint8Array(data),
      imageByteSize: totalSize,
      associatedScanIds: [scanId],
      originScanId: scanId,
      // oneof
      //locationPerScan
      beamImageRef: beamImageRef,
      // Removed
      // partNo: idx,
      // totalParts: totalChunks,
      bytesUploadedSoFar: idx * chunkSize
    };

    if (totalChunks > 1) {
      this.setWait(idx+1, idx == totalChunks-1 ? "Processing Upload" : `Uploading ${fileName} (${Math.round(idx / totalChunks * 100)}%)...`);
    }

    return this._endpointsService.uploadImage(ImageUploadHttpRequest.create(req)).pipe(
      tap(() => {
        console.log(`Upload OK: ${fileName} chunk ${idx}!`);
      })
    );
  }*/
}