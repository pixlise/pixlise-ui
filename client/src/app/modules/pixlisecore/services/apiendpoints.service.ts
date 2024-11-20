import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, from, map, mergeMap, of, shareReplay, switchMap, throwError } from "rxjs";
import { RGBUImage, RGBUImageGenerated } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";
import { APIPaths } from "src/app/utils/api-helpers";
import { Uint8ToString } from "src/app/utils/utils";
import { ImageUploadHttpRequest } from "src/app/generated-protos/image-msgs";
import { CachedImageItem, CachedRGBUImageItem } from "../models/local-storage-db";

const DefaultMaxTIFImageCacheAgeSec = 60 * 60 * 2;
const DefaultMaxCachedTIFImageSizeBytes = 1024 * 1024 * 15;

@Injectable({
  providedIn: "root",
})
export class APIEndpointsService {
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  // Path being the key of the image in the images DB, so scanid/filename.png for example
  loadImageForPath(imagePath: string): Observable<HTMLImageElement> {
    if (!imagePath) {
      throw new Error("No image path provided");
    }

    const apiUrl = APIEndpointsService.getImageURL(imagePath);
    return this.loadImageFromURL(apiUrl);
  }

  // TODO: Refactor this? Is the toDataURL call going to return the same thing that is constructed
  //       along the way to loading it (within loadImageForPath)?
  loadImagePreviewForPath(imagePath: string): Observable<string> {
    if (!imagePath) {
      throw new Error("No image path provided");
    }

    return this.loadImageForPath(imagePath).pipe(
      switchMap(img => {
        return new Observable<string>(observer => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            observer.next(canvas.toDataURL());
            observer.complete();
          }
        });
      }),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  loadRawImageFromURL(imagePath: string): Observable<ArrayBuffer> {
    const apiUrl = APIEndpointsService.getImageURL(imagePath);
    return this.http.get(apiUrl, { responseType: "arraybuffer" });
  }

  private loadImageFromURL(url: string): Observable<HTMLImageElement> {
    // Seems file interface with onload/onerror functions is still best implemented wrapped in a new Observable
    return new Observable<HTMLImageElement>(observer => {
      this.http.get(url, { responseType: "arraybuffer" }).subscribe({
        next: (arrayBuf: ArrayBuffer) => {
          const img = new Image();

          img.onload = event => {
            console.log("  Loaded image: " + url + ". Dimensions: " + img.width + "x" + img.height);
            observer.next(img);
            observer.complete();
          };

          img.onerror = event => {
            // event doesn't seem to provide us much, usually just says "error" inside it... found that this
            // last occurred when a bug allowed us to try to load a tif image with this function!
            const errStr = "Failed to download image: " + url;
            console.error(errStr);
            observer.error(errStr);
          };

          // TODO: look at this for speed, javascript puke is probably copying the array 100x before
          // we get our string. Found this was happening with some code examples used... This implementation
          // below seems to work but it's def not optimal.
          const data = new Uint8Array(arrayBuf);
          const base64 = btoa(Uint8ToString(data));
          const dataURL = "data:image;base64," + base64;
          // NOTE: the above isn't going to work straight in an img.src - you need to use the base64Image pipe
          img.src = dataURL;
        },
        error: err => {
          if (err instanceof HttpErrorResponse && err.status == 404) {
            console.warn(url + " not found - skipping download...");
          } else {
            console.error(err);
          }

          observer.error(err);
        },
      });
    });
  }

  loadRGBTIFFDisplayImage(imagePath: string, maxAgeSec: number = DefaultMaxTIFImageCacheAgeSec): Observable<HTMLImageElement> {
    return this.loadRGBUImageTIF(imagePath, maxAgeSec).pipe(
      switchMap((img: RGBUImage) => {
        return img.generateRGBDisplayImage(1, "RGB", 0, false, PixelSelection.makeEmptySelection(), null, null).pipe(
          map((generated: RGBUImageGenerated | null) => {
            if (!generated || !generated.image) {
              throw new Error(`Error generating RGB display image: ${imagePath}`);
            }

            return generated.image;
          })
        );
      }),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      }),
      //tap(() => console.log(`Loaded TIFF display image: ${imagePath}`)),
      shareReplay(1)
    );
  }

  loadRGBUImageTIFPreview(imagePath: string, maxAgeSec: number = DefaultMaxTIFImageCacheAgeSec): Observable<string> {
    const apiUrl = APIEndpointsService.getImageURL(imagePath);
    const tiffPreviewKey = `tiff-preview-${apiUrl}`;

    return from(this.localStorageService.getImage(tiffPreviewKey)).pipe(
      switchMap(imageData => {
        if (this.isValidLocallyCachedImage(imageData, maxAgeSec)) {
          return of(imageData.data);
        } else {
          return this.loadRGBTIFFDisplayImage(imagePath, maxAgeSec).pipe(
            map((v: HTMLImageElement) => v.src),
            catchError(err => {
              return throwError(() => err);
            }),
            switchMap(url => {
              this.localStorageService.storeImage(url, tiffPreviewKey, tiffPreviewKey, 0, 0, url.length);
              return of(url);
            })
          );
        }
      }),
      catchError(err => {
        console.error(err);
        return this.loadRGBTIFFDisplayImage(imagePath, maxAgeSec).pipe(
          map((v: HTMLImageElement) => v.src),
          catchError(err => {
            console.error(err);
            return throwError(() => err);
          })
        );
      })
    );
  }

  // Used by dataset customisation RGBU loading and from loadRGBUImage()
  // Gets and decodes image
  loadRGBUImageTIF(imagePath: string, maxAgeSec: number = DefaultMaxTIFImageCacheAgeSec): Observable<RGBUImage> {
    if (!imagePath) {
      return throwError(() => new Error("No image path provided"));
    }

    const apiUrl = APIEndpointsService.getImageURL(imagePath);

    return from(this.localStorageService.getRGBUImage(apiUrl)).pipe(
      switchMap(imageData => {
        if (this.isValidLocallyCachedImage(imageData, maxAgeSec)) {
          return RGBUImage.readImage(imageData.data, imagePath);
        } else {
          return of(null);
        }
      }),
      catchError(err => {
        console.error(err);
        return of(null);
      }),
      switchMap(img => {
        if (img) {
          return of(img);
        } else {
          const apiUrl = APIEndpointsService.getImageURL(imagePath);
          return this.http.get(apiUrl, { responseType: "arraybuffer" }).pipe(
            mergeMap((bytes: ArrayBuffer) => {
              // Only store if it's not too big
              const maxCacheSize: number = DefaultMaxCachedTIFImageSizeBytes;
              if (bytes.byteLength < maxCacheSize) {
                this.localStorageService.storeRGBUImage(bytes, apiUrl, apiUrl);
              }
              return RGBUImage.readImage(bytes, imagePath);
            }),
            catchError(err => {
              console.error(err);
              return throwError(() => err);
            })
          );
        }
      }),
      shareReplay(1)
    );
  }

  public static getImageURL(imagePath: string): string {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return apiUrl;
  }

  uploadScanZip(scanId: string, zipName: string, imageData: ArrayBuffer): Observable<void> {
    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),
      params: new HttpParams().set("scan", scanId).set("filename", zipName),
    };

    const apiUrl = APIPaths.getWithHost("scan");
    return this.http.put<void>(apiUrl, imageData, httpOptions);
  }

  uploadImage(req: ImageUploadHttpRequest): Observable<void> {
    const writer = ImageUploadHttpRequest.encode(req);
    const bytes = writer.finish();
    const sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),
    };

    const apiUrl = APIPaths.getWithHost("images");
    return this.http.put<void>(apiUrl, sendbuf, httpOptions);
  }

  private isValidLocallyCachedImage(imageData: CachedImageItem | CachedRGBUImageItem | undefined, maxAgeSec: number): boolean {
    if (!imageData) {
      return false;
    }

    const maxAgeMs = Date.now() - maxAgeSec * 1000;

    // NOTE: timestamp is in milliseconds
    if (imageData.timestamp < maxAgeMs) {
      // Too old, don't use it
      return false;
    }

    // Check other params
    const img = imageData as CachedImageItem;
    if (img && img.width <= 0 && img.height <= 0) {
      // Seen this, invalidly stored width/height of 0
      return false;
    }

    return true;
  }
}
