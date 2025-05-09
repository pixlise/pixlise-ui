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

import { HttpHeaders } from "@angular/common/http";
//import { throwError, of } from 'rxjs';

export function makeHeaders(): { headers: HttpHeaders } {
  const httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    }),
  };
  return httpOptions;
}

export class APIPaths {
  public static apiURL: string = "";
  public static setAPIUrl(url: string) {
    APIPaths.apiURL = url;
  }

  public static readonly api_componentVersions = "version-binary";
  public static readonly api_scan = "scan";
  public static readonly api_images = "images";
  public static readonly api_imagedownload = "images/download/";
  public static readonly api_magiclink = "magiclink";
  public static readonly api_memoise = "memoise";
  public static readonly api_websocket = "ws-connect";

  // path should be one of the above, or the above with more stuff added to it, making sure / are included!
  public static getWithHost(path: string): string {
    // Try to generate valid URLs! Include a / but only if needed
    let url = APIPaths.apiURL;
    if (!url.endsWith("/") && !path.startsWith("/")) {
      url += "/";
    }
    url += path;
    return url;
  }
}
