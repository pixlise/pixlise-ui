import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { UserOptionsService } from "../../services/user-options.service";
import { UserDetails } from "src/app/generated-protos/user";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import Compressor from "compressorjs";

@Component({
  selector: "app-image-uploader-dialog",
  templateUrl: "./image-uploader-dialog.component.html",
  styleUrls: ["./image-uploader-dialog.component.scss"],
})
export class ImageUploaderDialogComponent implements OnInit {
  acceptTypes: string = "image/jpeg,image/png";
  uploadedImage: File | undefined = undefined;

  constructor(
    public dialogRef: MatDialogRef<ImageUploaderDialogComponent>,
    private _userOptionsService: UserOptionsService,
    private _snackbarService: SnackbarService
  ) {}

  get userDetails(): UserDetails {
    return this._userOptionsService.userDetails;
  }

  ngOnInit(): void {}

  onDropFile(event: any) {
    let rejectedFiles = [];
    for (let reject of event.rejectedFiles) {
      rejectedFiles.push(reject.name);
    }

    if (rejectedFiles.length > 0) {
      let errorMessage = `Rejected file for upload: ${rejectedFiles.join(",")}. Was it of an acceptible format?`;
      this._snackbarService.openError(errorMessage);
    } else if (event.addedFiles.length <= 0) {
      this._snackbarService.openError("No files added for uploading");
    } else {
      this.uploadedImage = event.addedFiles[0];
      this._snackbarService.openSuccess(`Image ${this.uploadedImage!.name} loaded for upload`);
    }
  }

  onRemoveDroppedFile() {
    this.uploadedImage = undefined;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (!this.userDetails || !this.uploadedImage) {
      this._snackbarService.openError("No user details or image to upload");
      return;
    }

    new Compressor(this.uploadedImage, {
      quality: 0.9,
      width: 172,
      height: 172,
      convertSize: 30000,
      resize: "cover",
      success: result => {
        const reader = new FileReader();
        reader.readAsDataURL(result);
        reader.onload = () => {
          if (reader.result) {
            this._userOptionsService.updateUserDetails(
              this.userDetails.info!.name,
              this.userDetails.info!.email,
              reader.result.toString(),
              this.userDetails.dataCollectionVersion
            );
          }
        };
      },
      error: err => {
        console.error(err.message);
        this._snackbarService.openError(err.message);
      },
    });

    this.dialogRef.close(true);
  }
}
