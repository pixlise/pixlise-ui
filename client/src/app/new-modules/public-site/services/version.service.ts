import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";

import { Observable, map } from "rxjs";

import { environment } from "src/environments/environment";

import { VersionResponse, VersionResponse_Version } from "src/app/generated-protos/restmsgs";
import { APIPaths } from 'src/app/utils/api-helpers';
//import { mapArrayBufferToProto } from "src/app/modules/core/core.module";


@Injectable({
    providedIn: 'root'
})
export class VersionService {
    constructor(
        private http: HttpClient,
    ) {
    }

    get version$(): Observable<VersionResponse_Version[]> {
        let url = APIPaths.getWithHost("version-binary");
        return this.http.get<ArrayBuffer>(url, { responseType: "arraybuffer" as "json" }).pipe(
            map(
                (resp: ArrayBuffer) => {
                    //return mapArrayBufferToProto<VersionResponse>(resp, VersionResponse);
                    const arr = new Uint8Array(resp);
                    const res = VersionResponse.decode(arr);
                    return res.versions;
                }
            )
        );
    }
}