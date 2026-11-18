import { Component, Input, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { saveAs } from "file-saver";
import { ScanFile } from "src/app/generated-protos/scan-file";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { httpErrorToString } from "src/app/utils/utils";
import { formatFileSize, getScanFileDisplayName, getScanFileDownloadName, getScanFileKind, getScanFileNameFromDisplay, getScanFileTypeExtension, MaxScanFileSizeBytes, ScanFileKind, ScanFilesService } from "../../../services/scan-files.service";
import { ConfirmDialogComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/confirm-dialog/confirm-dialog.component";
import { ScanFilePreviewDialogComponent, ScanFilePreviewDialogData } from "../scan-file-preview-dialog/scan-file-preview-dialog.component";

export type FileSortField = "name" | "date" | "size";
export type FileDateFilter = "any" | "7d" | "30d" | "1y";

const dateFilterDays: Record<FileDateFilter, number> = { any: 0, "7d": 7, "30d": 30, "1y": 365 };

type FileUpload = {
  name: string;
  percent: number;
  error: string;
};

@Component({
  standalone: false,
  selector: "scan-files",
  templateUrl: "./scan-files.component.html",
  styleUrls: ["./scan-files.component.scss"],
})
export class ScanFilesComponent implements OnDestroy {
  private _subs = new Subscription();
  private _listSub: Subscription | null = null;
  private _scanId: string = "";
  private _dragDepth = 0;

  @Input() canEdit: boolean = false;

  files: ScanFile[] = [];
  loading: boolean = false;
  errorText: string = "";
  searchText: string = "";

  sortField: FileSortField = "date";
  sortAsc: boolean = false;
  filterAuthorIds = new Set<string>();
  filterTypes = new Set<string>();
  filterDate: FileDateFilter = "any";

  uploads: FileUpload[] = [];
  dragging: boolean = false;
  downloadingIds = new Set<string>();

  editingId: string = "";
  editName: string = "";
  editDescription: string = "";
  saving: boolean = false;

  constructor(
    private _scanFilesService: ScanFilesService,
    private _snackService: SnackbarService,
    private _dialog: MatDialog
  ) {}

  @Input() set scanId(id: string) {
    if (id === this._scanId) {
      return;
    }

    this._scanId = id;
    this.files = [];
    this.uploads = [];
    this.searchText = "";
    this.onClearFilters();
    this.onCancelEdit();
    this.refresh();
  }

  get scanId(): string {
    return this._scanId;
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._listSub?.unsubscribe();
  }

  get filteredFiles(): ScanFile[] {
    const search = this.searchText.trim().toLowerCase();
    const minSec = this.filterDate === "any" ? 0 : Date.now() / 1000 - dateFilterDays[this.filterDate] * 86400;

    const result = this.files.filter(
      file =>
        (!search || file.name.toLowerCase().includes(search) || file.description.toLowerCase().includes(search)) &&
        (this.filterAuthorIds.size <= 0 || this.filterAuthorIds.has(file.creatorUserId)) &&
        (this.filterTypes.size <= 0 || this.filterTypes.has(getScanFileTypeExtension(file))) &&
        file.createdUnixSec >= minSec
    );

    const dir = this.sortAsc ? 1 : -1;
    return result.sort((a, b) => {
      switch (this.sortField) {
        case "date":
          return (a.createdUnixSec - b.createdUnixSec) * dir;
        case "size":
          return (a.sizeBytes - b.sizeBytes) * dir;
        default:
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * dir;
      }
    });
  }

  get authors(): { id: string; name: string }[] {
    const authors = new Map<string, string>();
    for (const file of this.files) {
      if (file.creatorUserId) {
        authors.set(file.creatorUserId, file.creator?.name || file.creatorUserId);
      }
    }
    return Array.from(authors, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  get types(): string[] {
    return Array.from(new Set(this.files.map(file => getScanFileTypeExtension(file)).filter(ext => ext))).sort();
  }

  get activeFilterCount(): number {
    return (this.filterAuthorIds.size > 0 ? 1 : 0) + (this.filterTypes.size > 0 ? 1 : 0) + (this.filterDate !== "any" ? 1 : 0);
  }

  get fileCountText(): string {
    const total = this.files.length;
    const shown = this.filteredFiles.length;
    const noun = total === 1 ? "file" : "files";
    return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
  }

  onSortBy(field: FileSortField) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = field === "name";
    }
  }

  onToggleAuthor(id: string) {
    this.toggle(this.filterAuthorIds, id);
  }

  onToggleType(type: string) {
    this.toggle(this.filterTypes, type);
  }

  get isSortDefault(): boolean {
    return this.sortField === "date" && !this.sortAsc;
  }

  get canClear(): boolean {
    return this.activeFilterCount > 0 || !this.isSortDefault;
  }

  onClearFilters() {
    this.sortField = "date";
    this.sortAsc = false;
    this.filterAuthorIds.clear();
    this.filterTypes.clear();
    this.filterDate = "any";
  }

  private toggle<T>(set: Set<T>, value: T) {
    if (!set.delete(value)) {
      set.add(value);
    }
  }

  get activeUploadCount(): number {
    return this.uploads.filter(upload => !upload.error).length;
  }

  refresh() {
    this._listSub?.unsubscribe();
    this.errorText = "";

    if (!this._scanId) {
      this.loading = false;
      return;
    }

    const scanId = this._scanId;
    this.loading = true;
    this._listSub = this._scanFilesService.listFiles(scanId).subscribe({
      next: files => {
        this.files = files;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorText = httpErrorToString(err, "Failed to list files");
      },
    });
  }

  getExtension(file: ScanFile): string {
    return getScanFileTypeExtension(file).substring(0, 4) || "file";
  }

  getDisplayName(file: ScanFile): string {
    return getScanFileDisplayName(file);
  }

  getKind(file: ScanFile): ScanFileKind {
    return getScanFileKind(file);
  }

  getSize(file: ScanFile): string {
    return formatFileSize(file.sizeBytes);
  }

  trackFile(index: number, file: ScanFile): string {
    return file.id;
  }

  onFilesChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    this.uploadFiles(Array.from(input.files || []));
    input.value = "";
  }

  onDragEnter(event: DragEvent) {
    if (!this.canEdit || !event.dataTransfer?.types.includes("Files")) {
      return;
    }
    event.preventDefault();
    this._dragDepth++;
    this.dragging = true;
  }

  onDragOver(event: DragEvent) {
    if (this.canEdit && event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
    }
  }

  onDragLeave(event: DragEvent) {
    if (!this.dragging) {
      return;
    }
    this._dragDepth = Math.max(0, this._dragDepth - 1);
    this.dragging = this._dragDepth > 0;
  }

  onDrop(event: DragEvent) {
    this._dragDepth = 0;
    this.dragging = false;

    if (!this.canEdit || !event.dataTransfer?.files?.length) {
      return;
    }

    event.preventDefault();
    this.uploadFiles(Array.from(event.dataTransfer.files));
  }

  private uploadFiles(toUpload: File[]) {
    if (!this.canEdit || !this._scanId) {
      return;
    }

    const scanId = this._scanId;
    for (const file of toUpload) {
      const upload: FileUpload = { name: file.name, percent: 0, error: "" };
      this.uploads.push(upload);

      if (file.size <= 0) {
        upload.error = "File is empty";
        continue;
      }
      if (file.size > MaxScanFileSizeBytes) {
        upload.error = `File is too large (${formatFileSize(file.size)}), maximum is ${formatFileSize(MaxScanFileSizeBytes)}`;
        continue;
      }
      if (this.files.some(existing => existing.name === file.name)) {
        upload.error = "A file with this name already exists";
        continue;
      }

      this._subs.add(
        this._scanFilesService.uploadFile(scanId, file).subscribe({
          next: progress => {
            upload.percent = progress.percent;
            if (progress.file) {
              this.uploads = this.uploads.filter(item => item !== upload);
              if (scanId === this._scanId) {
                this.files = [...this.files, progress.file];
              }
            }
          },
          error: err => {
            upload.error = httpErrorToString(err, "");
          },
        })
      );
    }
  }

  onDismissUpload(upload: FileUpload) {
    this.uploads = this.uploads.filter(item => item !== upload);
  }

  onPreview(file: ScanFile) {
    if (this.editingId) {
      return;
    }

    const dialogConfig = new MatDialogConfig<ScanFilePreviewDialogData>();
    dialogConfig.data = { file, files: this.filteredFiles };
    dialogConfig.maxWidth = "100vw";
    dialogConfig.panelClass = "scan-file-preview-panel";
    this._dialog.open(ScanFilePreviewDialogComponent, dialogConfig);
  }

  onDownload(file: ScanFile, event?: Event) {
    event?.stopPropagation();
    if (this.downloadingIds.has(file.id)) {
      return;
    }

    this.downloadingIds.add(file.id);
    this._subs.add(
      this._scanFilesService.downloadFile(file).subscribe({
        next: blob => {
          this.downloadingIds.delete(file.id);
          saveAs(blob, getScanFileDownloadName(file));
        },
        error: err => {
          this.downloadingIds.delete(file.id);
          this._snackService.openError(httpErrorToString(err, `Failed to download ${file.name}`));
        },
      })
    );
  }

  onEdit(file: ScanFile, event?: Event) {
    event?.stopPropagation();
    this.editingId = file.id;
    this.editName = getScanFileDisplayName(file);
    this.editDescription = file.description;
  }

  onCancelEdit(event?: Event) {
    event?.stopPropagation();
    this.editingId = "";
    this.editName = "";
    this.editDescription = "";
    this.saving = false;
  }

  onSaveEdit(file: ScanFile, event?: Event) {
    event?.stopPropagation();

    const editedName = this.editName.trim();
    if (!editedName || this.saving) {
      return;
    }
    const name = getScanFileNameFromDisplay(file, editedName);

    if (name === file.name && this.editDescription === file.description) {
      this.onCancelEdit();
      return;
    }

    this.saving = true;
    this._subs.add(
      this._scanFilesService.updateFile(file.id, name, this.editDescription).subscribe({
        next: updated => {
          this.files = this.files.map(item => (item.id === updated.id ? updated : item)).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
          this.onCancelEdit();
        },
        error: err => {
          this.saving = false;
          this._snackService.openError(httpErrorToString(err, `Failed to update ${file.name}`));
        },
      })
    );
  }

  onDelete(file: ScanFile) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { confirmText: `Are you sure you want to delete ${getScanFileDisplayName(file)}?` };

    this._dialog
      .open(ConfirmDialogComponent, dialogConfig)
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.deleteFile(file);
        }
      });
  }

  private deleteFile(file: ScanFile) {
    this._subs.add(
      this._scanFilesService.deleteFile(file.id).subscribe({
        next: () => {
          this.files = this.files.filter(item => item.id !== file.id);
          this._snackService.openSuccess(`Deleted ${file.name}`);
        },
        error: err => {
          this._snackService.openError(httpErrorToString(err, `Failed to delete ${file.name}`));
        },
      })
    );
  }
}
