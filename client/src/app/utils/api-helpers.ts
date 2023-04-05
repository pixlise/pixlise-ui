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


export function makeHeaders(): object
{
    const httpOptions = {
        headers: new HttpHeaders({
            "Content-Type":  "application/json",
            //'Authorization': 'Bearer '+this.authService.getTokenSilently$()
        })
    };
    return httpOptions;
}

export class APIPaths
{
    private static _apiURL: string = "";
    public static setAPIUrl(url: string)
    {
        APIPaths._apiURL = url;
    }

    public static readonly api_detector_config = "detector-config";
    public static readonly api_piquant_root = "piquant";
    public static readonly api_componentVersions = "version";
    public static readonly api_roi = "roi";
    public static readonly api_element_set = "element-set";
    public static readonly api_annotation = "annotation";
    public static readonly api_dataset = "dataset";
    public static readonly api_quantification = "quantification";
    public static readonly api_data_expression = "data-expression";
    public static readonly api_data_module = "data-module";
    public static readonly api_view_state = "view-state";
    public static readonly api_share = "share";
    public static readonly api_export = "export";
    public static readonly api_user_management = "user";
    public static readonly api_notification = "notification";
    public static readonly api_test = "test";
    public static readonly api_diffraction = "diffraction";
    public static readonly api_rgb_mix = "rgb-mix";
    public static readonly api_logger = "logger";
    public static readonly api_tags = "tags";

    // path should be one of the above, or the above with more stuff added to it, making sure / are included!
    public static getWithHost(path: string): string
    {
        return APIPaths._apiURL+path;
    }
}
