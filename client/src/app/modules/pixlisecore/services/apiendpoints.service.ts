import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, from, map, mergeMap, of, shareReplay, switchMap, throwError } from "rxjs";
import { RGBUImage, RGBUImageGenerated } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";
import { APIPaths } from "src/app/utils/api-helpers";
import { mimeTypeForImage, Uint8ToString } from "src/app/utils/utils";
import { ImageUploadHttpRequest } from "src/app/generated-protos/image-msgs";
import { CachedImageItem, CachedRGBUImageItem } from "../models/local-storage-db";
import { ReviewerMagicLinkLoginReq, ReviewerMagicLinkLoginResp } from "../../../generated-protos/user-management-msgs";

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
    return new Observable<HTMLImageElement>(observer => {const mime = mimeTypeForImage(url);
      if (mime.length <= 0) {
        const err = `Unknown mime type for image: ${url}`;
        console.error(err);
        observer.error(err);
        return;
      }

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

          // This is done this ugly way because of JWT tokens. When assigning a url to an img.src there is no
          // way to intercept the subsequent HTTP request and insert the Authorisation header. There are a few
          // common solutions, one is to generate a "key" on the server (and store it, expire it) and append
          // that to the URL as a query parameter (you don't want to include the JWT in query param!) but this
          // is another common solution - download the image via code, and create an Image and assign the data
          // Unfortunately the only way is as a "data URL", so here we convert the array to a string, then to
          // base64, then construct the data URL.
          // NOTE: This code worked fine for 4+ years and stopped working with Chrome 146 in March 2026 because
          // we were just saying "data:image;base64" but they made the Chrome parser more strict, and it expects
          // a mime type now, eg image/png so we had to update this.
          // There's a new function for ArrayBuffer: toBase64 which came out in September 2025 and is supported
          // by all browsers but at time of writing Angular 21 uses Typescript 5.9.3 which doesn't contain this
          // function yet. We may be able to use a polyfill.
          // TODO: Update this to use toBase64 when it's available, perhaps in Typescript 6.x?
          const data = new Uint8Array(arrayBuf);
          const base64 = btoa(Uint8ToString(data));
          const dataURL = `data:${mime};base64,` + base64;

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
    const apiUrl = APIPaths.getWithHost(APIPaths.api_imagedownload + imagePath);
    return apiUrl;
  }

  uploadScanZip(scanId: string, zipName: string, imageData: ArrayBuffer): Observable<void> {
    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),
      params: new HttpParams().set("scan", scanId).set("filename", zipName),
    };

    const apiUrl = APIPaths.getWithHost(APIPaths.api_scan);
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

    const apiUrl = APIPaths.getWithHost(APIPaths.api_images);
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

  magicLinkLogin(magiclinkReq: ReviewerMagicLinkLoginReq): Observable<ReviewerMagicLinkLoginResp> {
    const apiUrl = APIPaths.getWithHost(APIPaths.api_magiclink);
    return this.http.post<ReviewerMagicLinkLoginResp>(apiUrl, magiclinkReq);
  }
}
