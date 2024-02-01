import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, mergeMap } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";
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
  loadImageForPath(imagePath: string, maxAge: number = 1000 * 60 * 60 * 24 * 7): Observable<HTMLImageElement> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return new Observable<HTMLImageElement>(observer => {
      this.localStorageService
        .getImage(apiUrl)
        .then(async imageData => {
          // If we have it and it's not older than maxAge (1 week), use it
          if (imageData && imageData.timestamp > Date.now() - maxAge) {
            const img = new Image();
            img.src = imageData.data;
            observer.next(img);
            observer.complete();
          } else {
            // Get from API
            this.loadImageFromURL(apiUrl).subscribe({
              next: img => {
                observer.next(img);
                observer.complete();
              },
              error: err => {
                observer.error(err);
              },
            });
          }
        })
        .catch(async err => {
          console.error(err);

          // Get from API
          this.loadImageFromURL(apiUrl).subscribe({
            next: img => {
              observer.next(img);
              observer.complete();
            },
            error: err => {
              observer.error(err);
            },
          });
        });
    });

    // return this.loadImageFromURL(apiUrl);
  }
  /*
  // Constructs the path from scan id and image
  loadImageForScan(scanId: string, imageName: string): Observable<HTMLImageElement> {
    const apiUrl = APIPaths.getWithHost(`images/download/${scanId}/${imageName}`);
    return this.loadImageFromURL(apiUrl);
  }
*/
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

          this.localStorageService.storeImage(dataURL, url, url, img.height, img.width, dataURL.length);
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

  loadRGBUImageTIFFromAPI(imagePath: string): Observable<RGBUImage> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return this.http.get(apiUrl, { responseType: "arraybuffer" }).pipe(
      mergeMap((bytes: ArrayBuffer) => {
        this.localStorageService.storeRGBUImage(bytes, apiUrl, apiUrl);
        return RGBUImage.readImage(bytes, imagePath);
      })
    );
  }

  // Used by dataset customisation RGBU loading and from loadRGBUImage()
  // Gets and decodes image
  loadRGBUImageTIF(imagePath: string, maxAge: number = 3600): Observable<RGBUImage> {
    const apiUrl = APIPaths.getWithHost(`images/download/${imagePath}`);
    return new Observable<RGBUImage>(observer => {
      this.localStorageService
        .getRGBUImage(apiUrl)
        .then(async imageData => {
          // If we have it, use it
          if (imageData && imageData.timestamp > Date.now() - maxAge) {
            RGBUImage.readImage(imageData.data, imagePath).subscribe({
              next: img => {
                observer.next(img);
                observer.complete();
              },
              error: err => {
                observer.error(err);
              },
            });
            observer.complete();
          } else {
            // Get from API
            this.loadRGBUImageTIFFromAPI(imagePath).subscribe({
              next: img => {
                observer.next(img);
                observer.complete();
              },
              error: err => {
                observer.error(err);
              },
            });
          }
        })
        .catch(async err => {
          console.error(err);

          // Get from API
          this.loadRGBUImageTIFFromAPI(imagePath).subscribe({
            next: img => {
              observer.next(img);
              observer.complete();
            },
            error: err => {
              observer.error(err);
            },
          });
        });
    });

    // TODO: shareReplay(1)?
  }
}
