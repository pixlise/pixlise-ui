import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, mergeMap } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";
import { APIPaths } from "src/app/utils/api-helpers";
import { Uint8ToString } from "src/app/utils/utils";

@Injectable({
  providedIn: "root",
})
export class APIEndpointsService {
  constructor(private http: HttpClient) {}

  // Assumes the path is going to get us the image, might have to include the scan id in it
  loadImageForPath(imagePath: string): Observable<HTMLImageElement> {
    const apiUrl = APIPaths.getWithHost(`/images/download/${imagePath}`);
    return this.loadImageFromURL(apiUrl);
  }
  /*
  // Constructs the path from scan id and image
  loadImageForScan(scanId: string, imageName: string): Observable<HTMLImageElement> {
    const apiUrl = APIPaths.getWithHost(`/images/download/${scanId}/${imageName}`);
    return this.loadImageFromURL(apiUrl);
  }
*/
  private loadImageFromURL(url: string): Observable<HTMLImageElement> {
    console.log("  Downloading image: " + url);

    // Seems file interface with onload/onerror functions is still best implemented wrapped in a new Observable
    return new Observable<HTMLImageElement>(observer => {
      this.http.get(url, { responseType: "arraybuffer" }).subscribe(
        (arrayBuf: ArrayBuffer) => {
          const img = new Image();

          img.onload = (event) => {
            console.log("  Loaded image: " + url + ". Dimensions: " + img.width + "x" + img.height);
            observer.next(img);
            observer.complete();
          };

          img.onerror = (event) => {
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
        },
        err => {
          if (err instanceof HttpErrorResponse && err.status == 404) {
            console.warn(url + " not found - skipping download...");
          } else {
            console.error(err);
          }

          observer.error(err);
        }
      );
    });
  }

  // Used by dataset customisation RGBU loading and from loadRGBUImage()
  // Gets and decodes image
  loadRGBUImageTIF(imagePath: string): Observable<RGBUImage> {
    const apiUrl = APIPaths.getWithHost(`/images/download/${imagePath}`);
    return this.http.get(apiUrl, { responseType: "arraybuffer" }).pipe(
      mergeMap((bytes: ArrayBuffer) => {
        return RGBUImage.readImage(bytes, imagePath);
      })
    );

    // TODO: shareReplay(1)?
  }
}
