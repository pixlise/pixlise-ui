import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, from, map, mergeMap, of, shareReplay, switchMap, tap, throwError } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";
import { APIPaths } from "src/app/utils/api-helpers";
import { Uint8ToString } from "src/app/utils/utils";

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
  loadImageForPath(imagePath: string, maxAge: number = 1000 * 60 * 60 * 24 * 2): Observable<HTMLImageElement> {
    if (!imagePath) {
      throw new Error("No image path provided");
    }

    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);

    return from(this.localStorageService.getImage(apiUrl)).pipe(
      switchMap(imageData => {
        // If we have it and it's not older than maxAge (2 days), use it
        if (imageData && imageData.timestamp > Date.now() - maxAge) {
          const img = new Image();
          img.src = imageData.data;
          return of(img);
        } else {
          return this.loadImageFromURL(apiUrl).pipe(
            catchError(err => {
              return throwError(() => new Error(err));
            })
          );
        }
      }),
      catchError(err => {
        console.error(err);
        return this.loadImageFromURL(apiUrl).pipe(
          catchError(err => {
            console.error(err);
            return throwError(() => new Error(err));
          })
        );
      }),
      shareReplay(1)
    );
  }

  private loadImageFromURL(url: string, maxCacheSize: number = 10000000): Observable<HTMLImageElement> {
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

  loadRGBUImageTIFFromAPI(imagePath: string, maxCacheSize: number = 15000000): Observable<RGBUImage> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return this.http.get(apiUrl, { responseType: "arraybuffer" }).pipe(
      mergeMap((bytes: ArrayBuffer) => {
        // Only store if it's not too big (15 mb)
        if (bytes.byteLength < maxCacheSize) {
          this.localStorageService.storeRGBUImage(bytes, apiUrl, apiUrl);
        }
        return RGBUImage.readImage(bytes, imagePath);
      })
    );
  }

  private _generatedTIFFPreview(imagePath: string, maxAge: number = 3600): Observable<string> {
    return this.loadRGBUImageTIF(imagePath, maxAge).pipe(
      switchMap(img => {
        return new Observable<string>(observer => {
          let generated = img.generateRGBDisplayImage(1, "RGB", 0, false, PixelSelection.makeEmptySelection(), null, null);
          if (generated?.image?.src) {
            observer.next(generated.image.src);
          } else {
            observer.error("Error generating RGB display image");
            console.error("Error generating RGB display image", img?.path);
          }
        });
      }),
      catchError(err => {
        console.error(err);
        return throwError(() => new Error(err));
      }),
      tap(url => console.log(`Generated preview URL: ${url}`)),
      mergeMap(url => of(url)),
      shareReplay(1)
    );
  }

  loadRGBUImageTIFPreview(imagePath: string, maxAge: number = 3600): Observable<string> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    let tiffPreviewKey = `tiff-preview-${apiUrl}`;

    return from(this.localStorageService.getImage(tiffPreviewKey)).pipe(
      switchMap(imageData => {
        if (imageData && imageData.timestamp > Date.now() - maxAge) {
          return of(imageData.data);
        } else {
          return this._generatedTIFFPreview(imagePath, maxAge).pipe(
            catchError(err => {
              return throwError(() => new Error(err));
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
        return this._generatedTIFFPreview(imagePath, maxAge).pipe(
          catchError(err => {
            console.error(err);
            return throwError(() => new Error(err));
          })
        );
      })
    );
  }

  // Used by dataset customisation RGBU loading and from loadRGBUImage()
  // Gets and decodes image
  loadRGBUImageTIF(imagePath: string, maxAge: number = 3600): Observable<RGBUImage> {
    if (!imagePath) {
      return throwError(() => new Error("No image path provided"));
    }

    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);

    return from(this.localStorageService.getRGBUImage(apiUrl)).pipe(
      switchMap(imageData => {
        if (imageData && imageData.timestamp > Date.now() - maxAge) {
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
          return this.loadRGBUImageTIFFromAPI(imagePath).pipe(
            catchError(err => {
              console.error(err);
              return throwError(() => new Error(err));
            })
          );
        }
      }),
      shareReplay(1)
    );
  }

  uploadImage(scanId: string, imageName: string, imageData: ArrayBuffer): Observable<void> {
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
}
