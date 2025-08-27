import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ReferenceData } from "src/app/generated-protos/references";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ReferenceDataBulkWriteReq, ReferenceDataBulkWriteResp } from "../../../../generated-protos/references-msgs";

export interface ReferenceUploadSummary {
  reference: ReferenceData;
  upload: boolean;
  expressionCount: number;
  category: string;
  group: string;
}

export interface ReferenceCSVUploadData {
  referenceData: ReferenceData[];
}

export interface ReferenceCSVUploadResponse {
  uploaded: boolean;
  uploadedCount: number;
}

@Component({
  selector: "reference-csv-upload-dialog",
  templateUrl: "./reference-csv-upload-dialog.component.html",
  styleUrls: ["./reference-csv-upload-dialog.component.scss"],
})
export class ReferenceCSVUploadDialogComponent {
  uploadSummaries: ReferenceUploadSummary[] = [];
  allChecked: boolean = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReferenceCSVUploadData,
    public dialogRef: MatDialogRef<ReferenceCSVUploadDialogComponent, ReferenceCSVUploadResponse>,
    private _apiDataService: APIDataService,
    private _snackBarService: SnackbarService
  ) {
    this.initializeSummaries();
  }

  private initializeSummaries(): void {
    this.uploadSummaries = this.data.referenceData.map(reference => ({
      reference,
      upload: true,
      expressionCount: reference.expressionValuePairs?.length || 0,
      category: reference.category || "No category",
      group: reference.group || "No group",
    }));
  }

  get selectedCount(): number {
    return this.uploadSummaries.filter(summary => summary.upload).length;
  }

  get totalCount(): number {
    return this.uploadSummaries.length;
  }

  onToggleAll(): void {
    this.allChecked = !this.allChecked;
    this.uploadSummaries.forEach(summary => {
      summary.upload = this.allChecked;
    });
  }

  onToggleUpload(summary: ReferenceUploadSummary): void {
    summary.upload = !summary.upload;
    this.updateAllCheckedState();
  }

  private updateAllCheckedState(): void {
    this.allChecked = this.uploadSummaries.every(summary => summary.upload);
  }

  onUpload(): void {
    const referencesToUpload = this.uploadSummaries.filter(summary => summary.upload).map(summary => summary.reference);

    if (referencesToUpload.length === 0) {
      this._snackBarService.openError("No references selected for upload");
      return;
    }

    this._apiDataService
      .sendReferenceDataBulkWriteRequest(
        ReferenceDataBulkWriteReq.create({
          referenceData: referencesToUpload,
          matchByFields: true,
        })
      )
      .subscribe({
        next: (response: ReferenceDataBulkWriteResp) => {
          if (response?.referenceData && response.referenceData.length > 0) {
            this._snackBarService.openSuccess(`Successfully uploaded ${response.referenceData.length} references from CSV`);

            this.dialogRef.close({
              uploaded: true,
              uploadedCount: response.referenceData.length,
            });
          } else {
            this._snackBarService.openError("No references were created from the CSV upload");
            this.dialogRef.close({ uploaded: false, uploadedCount: 0 });
          }
        },
        error: error => {
          this._snackBarService.openError("Failed to upload references", error?.message || "Unknown error");
          this.dialogRef.close({ uploaded: false, uploadedCount: 0 });
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close({ uploaded: false, uploadedCount: 0 });
  }

  trackBySummary(index: number, summary: ReferenceUploadSummary): string {
    return summary.reference.mineralSampleName || index.toString();
  }
}
