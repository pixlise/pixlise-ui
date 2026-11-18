import { Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { DomSanitizer, SafeResourceUrl, SafeUrl } from "@angular/platform-browser";
import { Subscription } from "rxjs";
import { saveAs } from "file-saver";
import { ScanFile } from "src/app/generated-protos/scan-file";
import { httpErrorToString } from "src/app/utils/utils";
import { formatFileSize, getScanFileDownloadName, getScanFileKind, getScanFileTypeExtension, ScanFileKind, ScanFilesService } from "../../../services/scan-files.service";

export type ScanFilePreviewDialogData = {
  file: ScanFile;
  files: ScanFile[];
};

const MaxTextPreviewBytes = 2 * 1024 * 1024;

@Component({
  standalone: false,
  selector: "scan-file-preview-dialog",
  templateUrl: "./scan-file-preview-dialog.component.html",
  styleUrls: ["./scan-file-preview-dialog.component.scss"],
})
export class ScanFilePreviewDialogComponent implements OnInit, OnDestroy {
  @ViewChild("docContainer") docContainer?: ElementRef<HTMLElement>;

  private _loadSub: Subscription | null = null;
  private _loadId = 0;
  private _objectUrl: string = "";
  private _blob: Blob | null = null;
  private _pptxPreviewer: { destroy: () => void } | null = null;
  private readonly _renderers: Partial<Record<ScanFileKind, (blob: Blob, loadId: number) => Promise<void>>> = {
    pdf: blob => this.renderPdf(blob),
    image: blob => this.renderMedia(blob),
    video: blob => this.renderMedia(blob),
    audio: blob => this.renderMedia(blob),
    text: (blob, loadId) => this.renderText(blob, loadId),
    markdown: (blob, loadId) => this.renderText(blob, loadId),
    docx: (blob, loadId) => this.renderDocx(blob, loadId),
    pptx: (blob, loadId) => this.renderPptx(blob, loadId),
  };

  file: ScanFile;
  kind: ScanFileKind = "other";
  loading: boolean = false;
  statusText: string = "";

  frameUrl: SafeResourceUrl | null = null;
  mediaUrl: SafeUrl | null = null;
  text: string = "";
  textTruncated: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ScanFilePreviewDialogData,
    public dialogRef: MatDialogRef<ScanFilePreviewDialogComponent>,
    private _scanFilesService: ScanFilesService,
    private _sanitizer: DomSanitizer
  ) {
    this.file = data.file;
  }

  ngOnInit() {
    setTimeout(() => this.show(this.file));
  }

  ngOnDestroy() {
    this.clear();
  }

  get fileIndex(): number {
    return this.data.files.findIndex(file => file.id === this.file.id);
  }

  get hasPrevious(): boolean {
    return this.fileIndex > 0;
  }

  get hasNext(): boolean {
    const idx = this.fileIndex;
    return idx >= 0 && idx < this.data.files.length - 1;
  }

  get displayName(): string {
    return getScanFileDownloadName(this.file);
  }

  get fileSize(): string {
    return formatFileSize(this.file.sizeBytes);
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft" && this.hasPrevious) {
      this.onStep(-1);
    } else if (event.key === "ArrowRight" && this.hasNext) {
      this.onStep(1);
    }
  }

  onStep(direction: number) {
    const next = this.data.files[this.fileIndex + direction];
    if (next) {
      this.show(next);
    }
  }

  onDownload() {
    if (this._blob) {
      saveAs(this._blob, getScanFileDownloadName(this.file));
      return;
    }

    this._scanFilesService.downloadFile(this.file).subscribe({
      next: blob => saveAs(blob, getScanFileDownloadName(this.file)),
      error: err => (this.statusText = httpErrorToString(err, "Failed to download file")),
    });
  }

  onClose() {
    this.dialogRef.close();
  }

  private clear() {
    this._loadSub?.unsubscribe();
    this._loadSub = null;
    this._loadId++;

    if (this._pptxPreviewer) {
      try {
        this._pptxPreviewer.destroy();
      } catch (e) {
        console.warn(e);
      }
      this._pptxPreviewer = null;
    }

    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = "";
    }

    if (this.docContainer) {
      this.docContainer.nativeElement.innerHTML = "";
    }

    this._blob = null;
    this.frameUrl = null;
    this.mediaUrl = null;
    this.text = "";
    this.textTruncated = false;
    this.statusText = "";
    this.loading = false;
  }

  private show(file: ScanFile) {
    this.clear();
    this.file = file;
    this.kind = getScanFileKind(file);

    if (this.kind === "other") {
      const ext = getScanFileTypeExtension(file);
      this.statusText = `No preview is available for "${ext}" type of file. Download the file to view it.`;
      return;
    }

    const loadId = this._loadId;
    this.loading = true;
    this._loadSub = this._scanFilesService.downloadFile(file).subscribe({
      next: blob => {
        this._blob = blob;
        this.render(blob, loadId)
          .catch(err => {
            console.error(err);
            if (loadId === this._loadId) {
              this.statusText = "Failed to generate a preview for this file. Download the file to view it.";
            }
          })
          .finally(() => {
            if (loadId === this._loadId) {
              this.loading = false;
            }
          });
      },
      error: err => {
        this.loading = false;
        this.statusText = httpErrorToString(err, "Failed to load file");
      },
    });
  }

  private async render(blob: Blob, loadId: number): Promise<void> {
    await this._renderers[this.kind]?.(blob, loadId);
  }

  private async renderPdf(blob: Blob): Promise<void> {
    this._objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    this.frameUrl = this._sanitizer.bypassSecurityTrustResourceUrl(this._objectUrl);
  }

  private async renderMedia(blob: Blob): Promise<void> {
    this._objectUrl = URL.createObjectURL(blob);
    this.mediaUrl = this._sanitizer.bypassSecurityTrustUrl(this._objectUrl);
  }

  private async renderText(blob: Blob, loadId: number): Promise<void> {
    const text = await blob.slice(0, MaxTextPreviewBytes).text();
    if (loadId === this._loadId) {
      this.text = text;
      this.textTruncated = blob.size > MaxTextPreviewBytes;
    }
  }

  private async renderDocx(blob: Blob, loadId: number): Promise<void> {
    const docx = await import("docx-preview");
    const container = this.docContainer?.nativeElement;
    if (loadId !== this._loadId || !container) {
      return;
    }
    await docx.renderAsync(blob, container, undefined, {
      className: "docx",
      inWrapper: true,
      renderAltChunks: false,
      experimental: true,
    });
  }

  private async renderPptx(blob: Blob, loadId: number): Promise<void> {
    const pptx = await import("pptx-preview");
    const data = await blob.arrayBuffer();
    const container = this.docContainer?.nativeElement;
    if (loadId !== this._loadId || !container) {
      return;
    }

    const width = Math.max(320, Math.min(container.clientWidth - 48, 1280));
    const previewer = pptx.init(container, { width, height: Math.round((width * 9) / 16), mode: "list" });
    this._pptxPreviewer = previewer;
    await previewer.preview(data);
  }
}
