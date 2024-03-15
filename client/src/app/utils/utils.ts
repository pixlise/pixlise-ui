// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { HttpErrorResponse } from "@angular/common/http";
import { Rect } from "../models/Geometry";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import * as Sentry from "@sentry/browser";

export class SentryHelper {
  // Can be called from anywhere we see a weird case or an error that we used to just log to
  // console.error() where it never gets seen - this does that but also sends to sentry.
  // Can be told it's an error or if flag is false, it's a warning
  public static logMsg(isError: boolean, msg: string): string {
    if (isError) {
      console.error(msg);
    } else {
      console.warn(msg);
    }

    // Log with sentry
    // TODO: figure out any other fields to add, and how to represent error vs warning!
    return Sentry.captureMessage(msg);
  }

  // Wrapper for captureException, also logs to console as error
  public static logException(error: any, location: string = ""): string {
    // error can be anything - we've seen sentry errors like:
    // Non-Error exception captured with keys: error, headers, message, name, ok
    // Coming from instances where we got a 404 for an image and somehow a non-error object was passed in here. Here we try to
    // handle all the crap JS can throw at us and provide sentry with something it's happy to process!

    // Firstly, log to console, so we may be able to capture it if needed
    console.error(error);
    if (location.length > 0) {
      console.log("Last error location: " + location);
    }

    // Now get a usable error object
    let processableError = SentryHelper.extractError(error);

    // Send this to Sentry
    return Sentry.captureException(processableError);
  }

  // Inspired by: https://github.com/getsentry/sentry-javascript/issues/2292
  public static extractError(error: any) {
    // Try to unwrap zone.js error.
    // https://github.com/angular/angular/blob/master/packages/core/src/util/errors.ts
    if (error && error.ngOriginalError) {
      error = error.ngOriginalError;
    } else if (error && error.originalError) {
      error = error.originalError;
    }

    // We can handle messages and Error objects directly.
    if (typeof error === "string" || error instanceof Error) {
      return error;
    }
    // If it's http module error, extract as much information from it as we can.
    if (error instanceof HttpErrorResponse) {
      // The `error` property of http exception can be either an `Error` object, which we can use directly...
      if (error.error instanceof Error) {
        return error.error;
      }
      // ... or an`ErrorEvent`, which can provide us with the message but no stack...
      if (error.error instanceof ErrorEvent) {
        return error.error.message;
      }
      // ...or the request body itself, which we can use as a message instead.
      if (typeof error.error === "string") {
        return `Server returned code ${error.status} with body "${error.error}"`;
      }
      // If we don't have any detailed information, fallback to the request message itself.
      return error.message;
    }

    // ***** CUSTOM *****
    // The above code doesn't always work since 'instanceof' relies on the object being created with the 'new' keyword
    if (error.error && error.error.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    // ***** END CUSTOM *****

    // Skip if there's no error, and let user decide what to do with it.
    return null;
  }
}

export function getMB(numBytes: number): string {
  return (numBytes / (1024 * 1024)).toFixed(2) + "MB";
}

// TODO: This is a very basic, quick implementation - might be good to replace with NPM uuid package
export function makeGUID(): string {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
// https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
export function randomString(len: number): string {
  let arr = new Uint8Array(len * 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, byteToHexString).join("").substring(0, len);
}

// TODO: remove me? this was only used by string colour conversions but was found to be slow so switched to rgba()
export function byteToHexString(val: number): string {
  let result = val.toString(16);
  if (val < 16) {
    result = "0" + result;
  }
  return result;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function xor_sum(value1: number, value2: number): number {
  let xor = value1 ^ value2;

  // What's sum mean here? Are we adding up the bits that are on after xor?
  let bit = 1;
  let sum = 0;
  for (let c = 0; c < 31; c++) {
    if (xor & bit) {
      sum++;
    }
    bit = bit << 1;
  }
  return sum;
}
/*
export function isValidPhoneNumber(phNum: string): boolean
{
    if(phNum.length > 0 && phNum.length < 7)
    {
        return false;
    }

    let startCheckIdx = 0;
    if(phNum[0] == "+")
    {
        startCheckIdx++;
    }
    else
    {
        return false;
    }

    for(let c = startCheckIdx; c < phNum.length; c++)
    {
        if(phNum[c] < "0" || phNum[c] > "9")
        {
            return false;
        }
    }

    return true;
}
*/
export function stripInvalidCharsFromPhoneNumber(phNum: string): string {
  // After a + at the start, we strip everything that's not a digit
  let result = "";

  let c = 0;
  for (let ch of phNum) {
    if ((c == 0 && ch == "+") || (ch >= "0" && ch <= "9")) {
      result += ch;
    }

    c++;
  }

  return result;
}

// https://memory.psych.mun.ca/tech/js/correlation.shtml
export function getPearsonCorrelation(x: any, y: any) {
  let shortestArrayLength = 0;

  if (x.length == y.length) {
    shortestArrayLength = x.length;
  } else {
    console.error("getPearsonCorrelation failed, input arrays are not the same length: " + x.length + " vs " + y.length);
    return null;
  }

  let xy = [];
  let x2 = [];
  let y2 = [];

  for (let i = 0; i < shortestArrayLength; i++) {
    xy.push(x[i] * y[i]);
    x2.push(x[i] * x[i]);
    y2.push(y[i] * y[i]);
  }

  let sum_x = 0;
  let sum_y = 0;
  let sum_xy = 0;
  let sum_x2 = 0;
  let sum_y2 = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
    sum_x += x[i];
    sum_y += y[i];
    sum_xy += xy[i];
    sum_x2 += x2[i];
    sum_y2 += y2[i];
  }

  let step1 = shortestArrayLength * sum_xy - sum_x * sum_y;
  let step2 = shortestArrayLength * sum_x2 - sum_x * sum_x;
  let step3 = shortestArrayLength * sum_y2 - sum_y * sum_y;
  let step4 = Math.sqrt(step2 * step3);
  let answer = 0;
  if (step4 != 0) {
    answer = step1 / step4;
  }

  return answer;
}

export function makeScatterPlotData(xvalues: any, yvalues: any, extraValueLookupTable: any, extraValueLabel: string, pmcs: any): object[] {
  if (xvalues.length != yvalues.length || (pmcs && pmcs.length != xvalues.length)) {
    let pmcbit = "";
    if (pmcs) {
      pmcbit = ", pmcs: " + pmcs.length;
    }
    throw new Error(
      "makeScatterPlotData called with differing array lengths: xvalues: " + xvalues.length + ", yvalues: " + yvalues.length + pmcbit
    );
  }

  let xys: any[] = [];
  let c = 0;

  for (let c = 0; c < xvalues.length; c++) {
    let xy: any = { x: xvalues[c], y: yvalues[c] };

    // If this value happens to have a definition in the element list, add it for use with tooltips
    if (extraValueLookupTable && c in extraValueLookupTable) {
      xy[extraValueLabel] = extraValueLookupTable[c];
    }

    if (pmcs) {
      xy["pmc"] = pmcs[c];
    }

    xys.push(xy);
  }
  return xys;
}

export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (!a || !b) {
    return false; // If we are passed undefined or null sets, stop here
  }

  if (a.size !== b.size) {
    return false; // Sizes differ, early-out for not equal
  }

  // Check each item
  for (let aVal of a) {
    if (!b.has(aVal)) {
      return false;
    }
  }
  return true;
}

export function arraysEqual<T>(a: Array<T>, b: Array<T>): boolean {
  if (!a || !b) {
    return false; // If we are passed undefined or null arrays, stop here
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let c = 0; c < a.length; c++) {
    if (a[c] !== b[c]) {
      return false;
    }
  }
  return true;
}

// Lifted from ChartJS:
// https://github.com/chartjs/Chart.js/blob/533bbea7667c92f5f8b3a7f5ca4b71140fea194c/src/scales/scale.linearbase.js
export function niceNum(value: number): number {
  const isNeg = value < 0;

  let absValue = Math.abs(value);

  const exponent = Math.floor(Math.log10(absValue));
  const fraction = absValue / Math.pow(10, exponent);
  let niceFraction;

  if (fraction <= 1.0) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  let result = niceFraction * Math.pow(10, exponent);

  if (isNeg) {
    result = -result;
  }

  return result;
}

// Generates to the right number of decimal places to represent this value
export function getValueDecimals(value: number): number {
  let decCount = 1;
  if (value > 0 && value < 1) {
    decCount -= Math.log10(value);
  }
  return Math.ceil(decCount);
}

export function nearestRoundValue(value: number): number {
  let rounded = 0;
  if (value != 0) {
    let div = 1;
    while (rounded == 0) {
      rounded = Math.round(value * div) / div;
      div *= 10;
    }
  }
  return rounded;
}

export const UNICODE_CARET_UP = "\u25B4"; // was "big" tiangle: u25B2
export const UNICODE_CARET_DOWN = "\u25BE"; // was "big" tiangle: u25BC
export const UNICODE_CARET_LEFT = "\u25C0";
export const UNICODE_CARET_RIGHT = "\u25B6";
export const UNICODE_CLOSE = "\u2716";
export const UNICODE_MATHEMATICAL_F = "\ud835\udc53";
export const UNICODE_GREEK_LOWERCASE_PSI = "\u03C8";
export const UNICODE_ELLIPSIS = "\u2026";

export function Uint8ToString(u8a: Uint8Array) {
  let CHUNK_SZ = 0x8000;
  let c = [];
  for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, Array.from(u8a.subarray(i, i + CHUNK_SZ))));
  }
  return c.join("");
}

export function positionDialogNearParent(openerRect: any, ourWindowRect: any): object {
  const gapSizeHalf = 4; // Should be the same as $sz-half from CSS

  let windowPos = new Rect(openerRect.right + gapSizeHalf, openerRect.top - ourWindowRect.height / 2, ourWindowRect.width, ourWindowRect.height);

  // Adjust so it's always on screen still...
  if (windowPos.x < gapSizeHalf) {
    windowPos.x = gapSizeHalf;
  }

  if (windowPos.maxX() > window.innerWidth) {
    windowPos.x -= windowPos.maxX() - window.innerWidth + gapSizeHalf;
  }

  if (windowPos.y < gapSizeHalf) {
    windowPos.y = gapSizeHalf;
  }

  if (windowPos.maxY() > window.innerHeight) {
    windowPos.y -= windowPos.maxY() - window.innerHeight + gapSizeHalf;
  }

  let pos = { left: windowPos.x + "px", top: windowPos.y + "px" };
  return pos;
}

export function httpErrorToString(err: any, operationMsg: string): string {
  console.error(err);
  console.log(operationMsg);

  // Interpret the error as best we can
  let msg = "";

  if (operationMsg.length > 0) {
    msg = operationMsg + ": ";
  }

  // Status of response, eg 400
  // err['status']

  // status of 0 seems to be associated with TCP errors, eg if server killed at a breakpoint and
  // response never comes back... ERR_CONNECTION_REFUSED
  // See: https://stackoverflow.com/questions/41354553/how-to-handle-neterr-connection-refused-in-angular2
  if (err["status"] === 0) {
    msg += "Request Failed.\n\nCheck your internet connection.";
  } else {
    let errorStr = "";

    if (typeof err === "string") {
      errorStr = err;
    } else {
      // Text version, eg Bad Request
      // err['statusText']

      // Text sent back from the server
      // This comes back in various ways, here we try to read it back
      if (err["error"] != undefined) {
        if (typeof err["error"] === "string") {
          errorStr = err["error"];
        } else if (err["error"] instanceof ArrayBuffer) {
          errorStr = new TextDecoder().decode(err["error"]);
          //errorStr = String.fromCharCode.apply(null, err['error']);
        }
      }
    }

    // This isn't necessarily from the server, eg with 404 something in the browser
    // sets this to "Not Found", which is not that helpful
    if (errorStr.length <= 0 && err["statusText"] != undefined) {
      errorStr = err["statusText"];
    }

    if (errorStr.length <= 0) {
      // Still don't have one? Try use this other function
      //errorStr = SentryHelper.extractError(err);
      if (err["message"]) {
        errorStr = err["message"];
      }
    }

    if (errorStr.length > 0) {
      msg += errorStr;
    }
  }

  return msg;
}

export function isValidElementsString(elements: string): boolean {
  // Lets run through and make sure it's actually valid...
  // Expecting strings like: "Co,Cu,Ga"
  // NOTE: no whitespace, just , separated elements
  if (elements.length <= 0) {
    return false;
  }

  let elemSymbols = elements.split(",");
  for (let symbol of elemSymbols) {
    // We allow elements with _<something> after it, for special control of PIQUANT
    let uscoreIdx = symbol.indexOf("_");
    if (uscoreIdx > -1) {
      symbol = symbol.substring(0, uscoreIdx);
    }

    let elem = periodicTableDB.getElementOxidationState(symbol);
    if (!elem || !elem.isElement) {
      // Found a not-an-element
      return false;
    }
  }

  return true;
}

// Expecting stuff like 88, 89, 91 - 94
export function parseNumberRangeString(nums: string): Set<number> {
  let result: Set<number> = new Set<number>();

  // Remove all whitespace first
  nums.replace(/ /g, "");

  // Split by , and filter out blank strings
  let parts = nums.split(",").filter(part => part.length > 0);

  // Run through each and parse it
  for (let part of parts) {
    // If eg 91-94
    if (part.indexOf("-") > -1) {
      let rangeParts = part.split("-");
      if (rangeParts.length === 2) {
        let start = Number(rangeParts[0]);
        let end = Number(rangeParts[1]);
        if (!isNaN(start) && !isNaN(end)) {
          for (let c = start; c <= end; c++) {
            result.add(c);
          }
        }
      }
    } else {
      let num = Number(part);
      if (!isNaN(num)) {
        result.add(num);
      }
    }
  }

  return result;
}

export function makeValidFileName(name: string): string {
  //return name.replace(/\!|\@|\#|$|\%|^|\&|*|?|\\|\/|\$/g, "_");
  return name.replace(/\\|!|@|#|\*|&|\?|\^|%|\$|\:|\//g, "_");
}

// Using Go terminology, just gets last part of path or "" if path ends in /
export function getPathBase(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx > -1) {
    return path.substring(idx + 1);
  }
  return "";
}

export const invalidPMC = -1;

// Copied from implementation in pixlise-dataset-converter/importer/pixlfm/fmFileNameMeta.go
export class SDSFields {
  constructor(
    public instrument: string,
    public colourFilter: string,
    public special: string,
    public primaryTimestamp: string,
    public venue: string,
    public secondaryTimestamp: string,
    // _
    public ternaryTimestamp: string,
    public prodType: string,
    public geometry: string,
    public thumbnail: string,
    public siteStr: string,
    public driveStr: string,
    public seqRTT: string,
    public camSpecific: string,
    public downsample: string,
    public compression: string,
    public producer: string,
    public versionStr: string // .
  ) // EXT
  {}

  static makeFromFileName(name: string): SDSFields | null {
    if (name.length !== 58) {
      return null;
    }

    let result = new SDSFields(
      name.substring(0, 2),
      name.substring(2, 3),
      name.substring(3, 4),
      name.substring(4, 8),
      name.substring(8, 9),
      name.substring(9, 19),
      // _
      name.substring(20, 23),
      name.substring(23, 26),
      name.substring(26, 27),
      name.substring(27, 28),
      name.substring(28, 31),
      name.substring(31, 35),
      name.substring(35, 44),
      name.substring(44, 48),
      name.substring(48, 49),
      name.substring(49, 51),
      name.substring(51, 52),
      name.substring(52, 54)
    );

    return result;
  }

  static makeBlankForTest(): SDSFields {
    return new SDSFields(
      "",
      "",
      "",
      "",
      "",
      "",
      // _
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    );
  }

  toDebugString(): string {
    return (
      this.instrument +
      " " +
      this.colourFilter +
      " " +
      this.special +
      " " +
      this.primaryTimestamp +
      " " +
      this.venue +
      " " +
      this.secondaryTimestamp +
      " " +
      // _
      this.ternaryTimestamp +
      " " +
      this.prodType +
      " " +
      this.geometry +
      " " +
      this.thumbnail +
      " " +
      this.siteStr +
      " " +
      this.driveStr +
      " " +
      this.seqRTT +
      " " +
      this.camSpecific +
      " " +
      this.downsample +
      " " +
      this.compression +
      " " +
      this.producer +
      " " +
      this.versionStr
    );
  }

  get SOL(): string {
    return this.primaryTimestamp;
  }

  getSolNumber(): number {
    if (this.isAllDigits(this.primaryTimestamp)) {
      return parseInt(this.primaryTimestamp);
    }
    return -1;
  }

  get RTT(): number {
    let rtt = parseInt(this.seqRTT);
    if (isNaN(rtt)) {
      rtt = 0;
    }
    return rtt;
  }

  get PMC(): number {
    if (this.instrument != "PC" && this.instrument != "PE" && this.instrument != "PS") {
      return invalidPMC;
    }

    let pmc = parseInt(this.camSpecific);
    if (isNaN(pmc)) {
      pmc = invalidPMC;
    }
    return pmc;
  }

  get SCLK(): number {
    let sclk = parseInt(this.secondaryTimestamp);
    if (isNaN(sclk)) {
      sclk = 0;
    }
    return sclk;
  }

  get version(): number {
    return this.stringToVersion(this.versionStr);
  }

  get driveID(): number {
    return this.stringToDriveID(this.driveStr);
  }

  get siteID(): number {
    return this.stringToSiteID(this.siteStr);
  }

  get producerLong(): string {
    if (this.producer == "J") {
      return "JPL (IDS)";
    } else if (this.producer == "P") {
      return "Principal Investigator";
    } else if (this.producer == "D") {
      return "DTU";
    }
    return this.producer;
  }

  get compressionLong(): string {
    if (this.compression == "LI") {
      return "ICER";
    } else if (this.compression == "LL") {
      return "LOCO";
    } else if (this.compression == "LM") {
      return "Malin";
    } else if (this.compression == "LU") {
      return "Uncompressed";
    }
    return this.compression;
  }

  get thumbnailLong(): string {
    if (this.thumbnail == "N") {
      return "No";
    } else if (this.thumbnail == "T") {
      return "Yes";
    }
    return this.thumbnail;
  }

  get colourFilterLong(): string {
    if (this.colourFilter == "R") {
      return "Red";
    } else if (this.colourFilter == "G") {
      return "Green";
    } else if (this.colourFilter == "B") {
      return "Blue";
    } else if (this.colourFilter == "U") {
      return "UV";
    } else if (this.colourFilter == "W") {
      return "White (all on)";
    } else if (this.colourFilter == "D") {
      return "SLI-A (Dense)";
    } else if (this.colourFilter == "S") {
      return "SLI-B (Sparse)";
    } else if (this.colourFilter == "_") {
      return "Off";
    } else if (this.colourFilter == "O") {
      return "Other";
    }
    return this.colourFilter;
  }

  get instrumentLong(): string {
    if (this.instrument == "PE") {
      return "PIXL Engineering";
    } else if (this.instrument == "PC") {
      return "PIXL Camera";
    } else if (this.instrument == "PS") {
      return "PIXL Spectrometer";
    }
    return this.instrument;
  }

  get venueLong(): string {
    if (this.venue == "_") {
      return "Flight";
    }
    return this.venue;
  }

  private stringToIDSimpleCase(str: string): number {
    if (!this.isAllDigits(str)) {
      return -1;
    }

    return parseInt(str);
  }

  private isAllDigits(str: string): boolean {
    for (let c = 0; c < str.length; c++) {
      let ch = str.charCodeAt(c);
      if (ch < "0".charCodeAt(0) || ch > "9".charCodeAt(0)) {
        return false;
      }
    }
    return true;
  }

  private isAlpha(s: string): boolean {
    if (s.length != 1) {
      return false;
    }

    let c = s.charAt(0);
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
  }

  private letterValue(c: string): number {
    if (c.length != 1) {
      return -1;
    }

    return c.charCodeAt(0) - "A".charCodeAt(0);
  }

  private stringToVersion(version: string): number {
    if (version.length == 2) {
      let val = this.stringToIDSimpleCase(version);
      if (val >= 0) {
        return val;
      }

      if (this.isAlpha(version.substring(0, 1)) && this.isAllDigits(version.substring(1))) {
        let remainder = this.stringToIDSimpleCase(version.substring(1));
        if (remainder >= 0) {
          return 100 + this.letterValue(version.substring(0, 1)) * 36 + remainder;
        }
      }

      if (this.isAlpha(version.substring(0, 1)) && this.isAlpha(version.substring(1, 2))) {
        return 110 + this.letterValue(version.substring(0, 1)) * 36 + this.letterValue(version.substring(1, 2));
      }
    }

    return -1;
  }

  private stringToSiteID(site: string): number {
    if (site.length == 3) {
      let id = this.stringToIDSimpleCase(site);
      if (id >= 0) {
        return id;
      }

      if (this.isAlpha(site.substring(0, 1)) && this.isAllDigits(site.substring(1))) {
        let remainder = this.stringToIDSimpleCase(site.substring(1));
        if (remainder >= 0) {
          return 1000 + this.letterValue(site.substring(0, 1)) * 100 + remainder;
        }
      }

      if (this.isAlpha(site.substring(0, 1)) && this.isAlpha(site.substring(1, 2)) && this.isAllDigits(site.substring(2))) {
        let remainder = this.stringToIDSimpleCase(site.substring(2));
        if (remainder >= 0) {
          return 3600 + this.letterValue(site.substring(0, 1)) * 260 + this.letterValue(site.substring(1, 2)) * 10 + remainder;
        }
      }

      if (this.isAlpha(site.substring(0, 1)) && this.isAlpha(site.substring(1, 2)) && this.isAlpha(site.substring(2, 3))) {
        return (
          10360 +
          this.letterValue(site.substring(0, 1)) * 26 * 26 +
          this.letterValue(site.substring(1, 2)) * 26 +
          this.letterValue(site.substring(2, 3))
        );
      }

      if (this.isAllDigits(site.substring(0, 1)) && this.isAlpha(site.substring(1, 2)) && this.isAlpha(site.substring(2, 3))) {
        let firstDigit = this.stringToIDSimpleCase(site.substring(0, 1));
        if (firstDigit >= 0) {
          let val = 27936 + firstDigit * 26 * 26 + this.letterValue(site.substring(1, 2)) * 26 + this.letterValue(site.substring(2, 3));
          if (val < 32768) {
            return val;
          }
        }
      }
    }

    return -1;
  }

  private stringToDriveID(drive: string): number {
    if (drive.length == 4) {
      let id = this.stringToIDSimpleCase(drive);
      if (id >= 0) {
        return id;
      }

      if (this.isAlpha(drive.substring(0, 1)) && this.isAllDigits(drive.substring(1))) {
        let remainder = this.stringToIDSimpleCase(drive.substring(1));
        if (remainder >= 0) {
          return 10000 + this.letterValue(drive.substring(0, 1)) * 1000 + remainder;
        }
      }

      if (this.isAlpha(drive.substring(0, 1)) && this.isAlpha(drive.substring(1, 2)) && this.isAllDigits(drive.substring(2))) {
        let remainder = this.stringToIDSimpleCase(drive.substring(2));
        if (remainder >= 0) {
          let val = 36000 + this.letterValue(drive.substring(0, 1)) * 2600 + this.letterValue(drive.substring(1, 2)) * 100 + remainder;
          if (val < 65536) {
            return val;
          }
        }
      }
    }

    return -1;
  }
}

// For use with API endpoints that allow encoding indexes in more compact formats:
// Returns a list of unsigned indexes, throws an error if:
// - A negative value is seen that is not -1
// - <start idx>, -1, <end idx which is <= start idx>
// NOTE: if arraySizeOptional is -1, it is not checked against
export function decodeIndexList(encodedIndexes: number[], arraySizeOptional: number = -1): number[] {
  if (encodedIndexes.length <= 0) {
    return [];
  }

  // Defining a range, fill the gap...
  if (encodedIndexes[0] == -1) {
    // Can't have -1 at the start, we don't have the starting
    // number then!
    throw new Error("indexes start with -1");
  } else if (encodedIndexes[encodedIndexes.length - 1] == -1) {
    // Can't look ahead, we're at th end!
    throw new Error("indexes end with -1");
  }

  const result = [];
  for (let c = 0; c < encodedIndexes.length; c++) {
    const idx = encodedIndexes[c];
    if (idx == -1) {
      // Find the last value (noting it was already added!)
      const startIdx = encodedIndexes[c - 1];
      const endIdx = encodedIndexes[c + 1];

      if (arraySizeOptional > -1 && endIdx >= arraySizeOptional) {
        throw new Error(`index ${endIdx} out of bounds: ${arraySizeOptional}`);
      }

      // Ensure there is a valid range between these numbers
      if (endIdx <= startIdx + 1) {
        throw new Error(`invalid range: ${startIdx}->${endIdx}`);
      }

      for (let iFill = startIdx + 1; iFill < endIdx; iFill++) {
        result.push(iFill);
      }
    } else if (idx < -1) {
      throw new Error(`invalid index: ${idx}`);
    } else {
      if (arraySizeOptional > -1 && idx >= arraySizeOptional) {
        throw new Error(`index ${idx} out of bounds: ${arraySizeOptional}`);
      }
      result.push(idx);
    }
  }

  return result;
}

export const MAXINT32 = 0x7fffffff;

// Given a list of unsigned indexes, this SORTS them and encodes them such that runs of consecutive
// numbers like 4, 5, 6, 7 are replaced with the sequence 4, -1, 7 - thereby reducing storage size
// NOTE: even though it takes unsigned int32s, it cannot support values over maxint, it just takes
// unsigned to signify that an array index can't be negative
export function encodeIndexList(indexesSrc: number[]): number[] {
  if (indexesSrc.length == 0) {
    return [];
  }

  const indexes = Array.from(indexesSrc);
  indexes.sort((a, b) => a - b);

  const result = [];
  let incrCount = 0;

  for (let c = 0; c < indexes.length; c++) {
    const idx = indexes[c];
    if (idx > MAXINT32) {
      throw new Error("index list had value > maxint");
    }
    if (c == 0) {
      // First one is ALWAYS appended!
      result.push(idx);
    } else {
      // Check if we're the last of a run
      const diffPrev = idx - indexes[c - 1];

      if (diffPrev == 1) {
        incrCount++;
      }

      // A wall for last value to pick up...
      let diffNext = MAXINT32;
      if (c < indexes.length - 1) {
        diffNext = indexes[c + 1] - idx;
      }

      if (diffPrev <= 1 && diffNext > 1) {
        // We're the end of a run of incrementing numbers
        if (incrCount > 1) {
          result.push(-1);
        }
        result.push(idx);
        incrCount = 0;
      } else if (diffPrev > 1) {
        // Bigger leap than 1, so write this value, as it may
        // be the start of a run of incrementing numbers
        result.push(idx);
      }
    }
  }
  return result;
}

export function decompressZeroRunLengthEncoding(input: number[], expectedCount: number): Int32Array {
  const result = new Int32Array(expectedCount);
  let writeIdx = 0;
  for (let c = 0; c < input.length; c++) {
    // Warn if we're going to see issues with overflow because we don't fit into an int!
    if (input[c] > MAXINT32) {
      console.warn("decompressZeroRunLengthEncoding: Value does not fit into int: " + input[c]);
    }

    if (input[c] != 0) {
      // Just copy it across
      result[writeIdx] = input[c];
      writeIdx++;
    } else {
      // We found a 0, this is going to be followed by the number of 0's
      // Since our array is inited with all 0's, we just have to skip the right
      // number!
      writeIdx += input[c + 1]; // Pretend we wrote a 0

      // Skip over the count value next run
      c++;
    }
  }

  return result;
}

export function rawProtoMessageToDebugString(buffer: ArrayBuffer, charLimit: number): string {
  const buff = new Uint8Array(buffer);
  const subBuff = buff.subarray(0, buff.length >= charLimit ? charLimit : buff.length);

  // msg id might be 2nd byte
  let msgId = "?";
  if (buff.length > 1) {
    msgId = buff[1].toString();
  }

  const byteList = [...subBuff].map(x => x.toString(16).padStart(2, "0")).join(",");
  return `MsgId: ${msgId}, Length: ${buffer.byteLength} bytes, Starts With: [${byteList}]`;
}
