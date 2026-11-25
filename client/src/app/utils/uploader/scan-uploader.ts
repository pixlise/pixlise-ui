import { Observable } from "rxjs";

import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService, UploadProgress, UploadStatus } from "src/app/modules/pixlisecore/services/apiendpoints.service";

import { ScanImportReq } from "src/app/generated-protos/scan-msgs";

export class ScanUploader {
  constructor(
    protected _endpointsService: APIEndpointsService,
    protected _dataService: APIDataService
  ) {
  }

  uploadScanZip(scanId: string, file: File, format: string): Observable<UploadProgress> {
    return new Observable<UploadProgress>(observer => {
      observer.next(new UploadProgress(file.name, 0, 0, UploadStatus.US_UPLOADING, `Uploading ${file.name}...`));

      // We upload the scan as a multi-part file upload, then trigger the scan import
      this._endpointsService.uploadFile(scanId, file, "scan").subscribe({
        next: prog => {
          // When it's complete, we don't send that out because we process it further!
          if (prog.status == UploadStatus.US_COMPLETE) {
            observer.next(new UploadProgress(
              file.name,
              prog.uploadedBytes,
              prog.uploadedPercent,
              UploadStatus.US_PROCESSING,
              `Processing upload ${file.name}...`)
            );

            this._dataService.sendScanImportRequest(ScanImportReq.create({
              id: scanId,
              format: format,
              zipFileName: file.name
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
}
