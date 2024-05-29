import { Component, HostListener, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SentryHelper } from "../../../../utils/utils";
import { SnackbarService } from "../../pixlisecore.module";

export interface FeedbackTextDialogData {
  description: string;
}

@Component({
  selector: "feedback-dialog",
  templateUrl: "./feedback-dialog.component.html",
  styleUrls: ["./feedback-dialog.component.scss"],
})
export class FeedbackDialogComponent {
  userIssue: string = "";
  description =
    "We'd love to hear if you're having any issues! Feel free to reach out to us on Mattermost, by email, \
  or type the problem here and we'll try our best to get back to you.";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FeedbackTextDialogData,
    private _snackService: SnackbarService,
    public dialogRef: MatDialogRef<FeedbackDialogComponent>
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.description) {
      this.description = this.data.description;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSubmitIssue(backToV3: boolean = false): void {
    let strippedIssue = this.userIssue.trim();
    if (strippedIssue.length > 0) {
      this._snackService.openSuccess("Thanks for the feedback!");
      this.userIssue = "";
      SentryHelper.logMsg(false, "User Feedback (Back to V3): \n" + strippedIssue);
    } else if (backToV3) {
      SentryHelper.logMsg(false, "User Feedback (Back to V3): No feedback given");
    }

    this.dialogRef.close(true);
  }

  // listen for enter key to confirm
  @HostListener("document:keydown.enter", ["$event"])
  onKeydown(event: any) {
    if (event.key === "Enter") {
      this.onSubmitIssue();
    }
  }
}
