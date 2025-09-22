import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Observable } from "rxjs";

export class TextFileViewingDialogData {
  constructor(
    public title: string,
    public content: Observable<string>,
    public contentIsCSV: boolean,
    public skipCSVLines: number
  ) {}
}

@Component({
  standalone: false,
  selector: "app-text-file-viewing-dialog",
  templateUrl: "./text-file-viewing-dialog.component.html",
  styleUrls: ["./text-file-viewing-dialog.component.scss"],
})
export class TextFileViewingDialogComponent {
  private _content: string | null = null;
  private _contentCSV: string[][] | null = null;
  private _contentCSVHeader: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TextFileViewingDialogData,
    public dialogRef: MatDialogRef<TextFileViewingDialogComponent>
  ) {
    data.content.subscribe((content: string) => {
      if (data.contentIsCSV) {
        const lines = content.split("\n");

        this._contentCSV = [];
        this._contentCSVHeader = [];

        let linesToSkip = data.skipCSVLines;
        for (const line of lines) {
          linesToSkip--;

          if (linesToSkip >= 0) {
            continue;
          }

          const cells = line.split(",");
          if (this._contentCSVHeader.length == 0) {
            this._contentCSVHeader = cells;
          } else {
            this._contentCSV.push(cells);
          }
        }
      } else {
        this._content = content;
      }
    });
  }

  get title(): string {
    return this.data.title;
  }

  get loading(): boolean {
    return this._contentCSV == null && this.content == null;
  }

  get content(): string | null {
    return this._content;
  }

  get contentCSVHeader(): string[] | null {
    return this._contentCSVHeader;
  }
  get contentCSV(): string[][] | null {
    return this._contentCSV;
  }
}
