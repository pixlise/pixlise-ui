import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, filter, map } from "rxjs";
import { ScanFile } from "src/app/generated-protos/scan-file";
import { ScanFileDeleteReq, ScanFileListReq, ScanFileWriteReq } from "src/app/generated-protos/scan-file-msgs";
import { APIDataService } from "src/app/modules/pixlisecore/services/apidata.service";
import { APIPaths } from "src/app/utils/api-helpers";

export const MaxScanFileSizeBytes = 250 * 1024 * 1024;

export type ScanFileUploadProgress = {
  percent: number;
  file: ScanFile | null;
};

export type ScanFileKind = "pdf" | "docx" | "pptx" | "image" | "text" | "markdown" | "video" | "audio" | "other";

const extMapping: Partial<Record<ScanFileKind,string[]>> = {
  pdf: ["pdf"],
  docx: ["docx"],
  pptx: ["pptx"],
  markdown: ["md"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"],
  video: ["mp4", "webm", "mov"],
  audio: ["mp3", "wav", "ogg", "m4a"],
  text: ["txt", "csv", "tsv", "json", "xml", "log", "yaml", "yml"],
};

export function getScanFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.substring(idx + 1).toLowerCase() : "";
}

const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const pptxMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function getContentTypeExtension(contentType: string): string {
  const mime = (contentType || "").split(";")[0].trim().toLowerCase();
  const known: Record<string, string> = {
    "application/pdf": "pdf",
    [docxMime]: "docx",
    [pptxMime]: "pptx",
    "text/markdown": "md",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "image/jpeg": "jpg",
    "image/svg+xml": "svg",
    "video/quicktime": "mov",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
  };
  if (known[mime]) {
    return known[mime];
  }
  const parts = mime.split("/");
  if (parts[0] === "image" && /^[a-z0-9]+$/.test(parts[1] || "")) {
    return parts[1];
  }
  return "";
}

export function getScanFileTypeExtension(file: ScanFile): string {
  return getContentTypeExtension(file.contentType) || getScanFileExtension(file.name);
}

function hasNameExtension(name: string): boolean {
  return /^[a-z0-9]{1,5}$/i.test(getScanFileExtension(name));
}

export function getScanFileDisplayName(file: ScanFile): string {
  return hasNameExtension(file.name) ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;
}

export function getScanFileNameFromDisplay(file: ScanFile, displayName: string): string {
  return hasNameExtension(file.name) ? displayName + file.name.substring(file.name.lastIndexOf(".")) : displayName;
}

export function getScanFileDownloadName(file: ScanFile): string {
  const ext = getScanFileTypeExtension(file);
  return hasNameExtension(file.name) || !ext ? file.name : `${file.name}.${ext}`;
}

export function getScanFileKind(file: ScanFile): ScanFileKind {
  const ext = getScanFileTypeExtension(file);

  let kind: ScanFileKind = "other";
  Object.entries(extMapping).forEach(([kind, extensions]) => {
    if (extensions.includes(ext)) {
      kind = kind as ScanFileKind;
    }
  });
  return kind;
}

export function formatFileSize(numBytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = numBytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return (unit === 0 ? value.toString() : value.toFixed(value < 10 ? 1 : 0)) + " " + units[unit];
}

@Injectable({
  providedIn: "root",
})
export class ScanFilesService {
  constructor(
    private _http: HttpClient,
    private _dataService: APIDataService
  ) {}

  listFiles(scanId: string): Observable<ScanFile[]> {
    return this._dataService.sendScanFileListRequest(ScanFileListReq.create({ scanId })).pipe(map(resp => resp.files));
  }

  uploadFile(scanId: string, file: File): Observable<ScanFileUploadProgress> {
    const options = {
      headers: new HttpHeaders({ "Content-Type": file.type || "application/octet-stream" }),
      params: new HttpParams().set("scan", scanId).set("filename", file.name),
      reportProgress: true,
      observe: "events" as const,
    };

    return this._http.put(APIPaths.getWithHost(APIPaths.api_scanfiles), file, options).pipe(
      filter((event: HttpEvent<any>) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          return { percent: 100, file: ScanFile.fromJSON(event.body) };
        }

        const progress = event as { loaded: number; total?: number };
        return { percent: progress.total ? Math.round((100 * progress.loaded) / progress.total) : 0, file: null };
      })
    );
  }

  downloadFile(file: ScanFile): Observable<Blob> {
    const url = APIPaths.getWithHost(`${APIPaths.api_scanfiledownload}${encodeURIComponent(file.scanId)}/${encodeURIComponent(file.id)}`);
    return this._http.get(url, { responseType: "arraybuffer" }).pipe(map(data => new Blob([data], { type: file.contentType || "application/octet-stream" })));
  }

  updateFile(id: string, name: string, description: string): Observable<ScanFile> {
    return this._dataService.sendScanFileWriteRequest(ScanFileWriteReq.create({ id, name, description })).pipe(
      map(resp => {
        if (!resp.file) {
          throw new Error("No file returned");
        }
        return resp.file;
      })
    );
  }

  deleteFile(id: string): Observable<void> {
    return this._dataService.sendScanFileDeleteRequest(ScanFileDeleteReq.create({ id })).pipe(map(() => undefined));
  }
}
