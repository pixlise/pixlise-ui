import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Observable } from "rxjs";

export class TextFileViewingDialogData {
  constructor(
    public title: string,
    public content: Observable<string>
  ) {}
}

@Component({
  selector: "app-text-file-viewing-dialog",
  templateUrl: "./text-file-viewing-dialog.component.html",
  styleUrls: ["./text-file-viewing-dialog.component.scss"],
})
export class TextFileViewingDialogComponent {
  private _content: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TextFileViewingDialogData,
    public dialogRef: MatDialogRef<TextFileViewingDialogComponent>
  ) {
    data.content.subscribe((content: string) => {
      this._content = content;
    });
  }

  get title(): string {
    return this.data.title;
  }

  get content(): string | null {
    return this._content;
  }
}
