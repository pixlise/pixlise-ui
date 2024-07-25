import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, from, map, mergeMap, of, shareReplay, switchMap, tap, throwError } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";
import { APIPaths } from "src/app/utils/api-helpers";
import { Uint8ToString } from "src/app/utils/utils";
import { ImageUploadHttpRequest } from "src/app/generated-protos/image-msgs";

const DefaultMaxImageCacheAgeSec = 60 * 60 * 24 * 2;
const DefaultMaxCachedImageSizeBytes = 1024 * 1024 * 10;

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

  // Assumes the path is going to get us the image, might have to include the scan id in it
  // Loads image from local storage if available and under the max age, otherwise downloads it from the server
  loadImageForPath(imagePath: string, maxAgeSec: number = DefaultMaxImageCacheAgeSec): Observable<HTMLImageElement> {
    if (!imagePath) {
      throw new Error("No image path provided");
    }

    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);

    return from(this.localStorageService.getImage(apiUrl)).pipe(
      switchMap(imageData => {
        // If we have it and it's not older than maxAge (2 days), use it
        if (imageData && imageData.timestamp > Date.now() - maxAgeSec * 1000) {
          return new Observable<HTMLImageElement>(observer => {
            const img = new Image();

            img.onload = event => {
              console.log("  Loaded image from cache: " + apiUrl + ". Dimensions: " + img.width + "x" + img.height);
              observer.next(img);
              observer.complete();
            };

            img.onerror = event => {
              // event doesn't seem to provide us much, usually just says "error" inside it... found that this
              // last occurred when a bug allowed us to try to load a tif image with this function!
              const errStr = "Failed to load image from cache: " + apiUrl;
              console.error(errStr);
              observer.error(errStr);
            };

            img.src = imageData.data;
          });
        } else {
          return this.loadImageFromURL(apiUrl).pipe(
            catchError(err => {
              return throwError(() => err);
            })
          );
        }
      }),
      catchError(err => {
        console.error(err);
        return this.loadImageFromURL(apiUrl).pipe(
          catchError(err => {
            console.error(err);
            return throwError(() => err);
          })
        );
      }),
      shareReplay(1)
    );
  }

  loadImagePreviewForPath(imagePath: string, maxAgeSec: number = DefaultMaxImageCacheAgeSec): Observable<string> {
    if (!imagePath) {
      throw new Error("No image path provided");
    }

    return this.loadImageForPath(imagePath, maxAgeSec).pipe(
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
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return this.http.get(apiUrl, { responseType: "arraybuffer" });
  }

  private loadImageFromURL(url: string, maxCacheSize: number = DefaultMaxCachedImageSizeBytes): Observable<HTMLImageElement> {
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
            const errStr = "Failed to download context image: " + url;
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

          // Only store if it's not too big (15 mb)
          if (dataURL.length < maxCacheSize) {
            this.localStorageService.storeImage(dataURL, url, url, img.height, img.width, dataURL.length);
          }
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
        return new Observable<HTMLImageElement>(observer => {
          const generated = img.generateRGBDisplayImage(1, "RGB", 0, false, PixelSelection.makeEmptySelection(), null, null);
          if (generated?.image) {
            observer.next(generated.image);
            observer.complete();
          } else {
            observer.error("Error generating RGB display image");
            console.error("Error generating RGB display image", img?.path);
          }
        });
      }),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      }),
      tap(url => console.log(`Generated preview URL: ${url}`)),
      mergeMap(url => of(url)),
      shareReplay(1)
    );
  }

  loadRGBUImageTIFPreview(imagePath: string, maxAgeSec: number = DefaultMaxTIFImageCacheAgeSec): Observable<string> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    const tiffPreviewKey = `tiff-preview-${apiUrl}`;

    return from(this.localStorageService.getImage(tiffPreviewKey)).pipe(
      switchMap(imageData => {
        if (imageData && imageData.timestamp > Date.now() - maxAgeSec*1000) {
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

    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);

    return from(this.localStorageService.getRGBUImage(apiUrl)).pipe(
      switchMap(imageData => {
        if (imageData && imageData.timestamp > Date.now() - maxAgeSec * 1000) {
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
          const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
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

  uploadBreadboardScanZip(scanId: string, imageName: string, imageData: ArrayBuffer): Observable<void> {
    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),
      params: new HttpParams().set("scan", scanId).set("filename", imageName),
    };

    const apiUrl = APIPaths.getWithHost("scan");
    return this.http.put<void>(apiUrl, imageData, httpOptions).pipe(
      map(() => {
        console.log("Image " + imageName + " uploaded");
      })
    );
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
}