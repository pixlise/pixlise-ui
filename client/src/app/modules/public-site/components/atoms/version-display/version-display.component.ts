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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { VersionResponse, VersionResponse_Version } from "src/app/generated-protos/restmsgs";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { httpErrorToString } from "src/app/utils/utils";
import { VERSION } from "src/environments/version";

@Component({
  standalone: false,
  selector: "version-display",
  templateUrl: "./version-display.component.html",
  styleUrls: ["./version-display.component.scss"],
})
export class VersionDisplayComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _uiVersion = VersionResponse_Version.create({
    component: "PIXLISE",
    version: (VERSION as any)?.raw || "(Local build)",
  });
  private _apiVersionDefault = VersionResponse_Version.create({
    component: "API",
    version: "",
  });
  private _piquantVersionDefault = VersionResponse_Version.create({
    component: "PIQUANT",
    version: "",
  });

  versions: VersionResponse_Version[] = [this._uiVersion, this._apiVersionDefault, this._piquantVersionDefault];

  constructor(public envConfigService: EnvConfigurationService) {}

  ngOnInit() {
    this._subs.add(
      this.envConfigService.getComponentVersions().subscribe({
        next: (versions: VersionResponse) => {
          // Overwrite ours
          this.versions = [this._uiVersion, ...versions.versions];

          versions.versions;
          // Remove the image name from piquant version
          for (const ver of this.versions) {
            if (ver.component == "PIQUANT") {
              const parts = ver.version.split(":");
              if (parts.length == 2) {
                ver.version = parts[1];
              }
            }
          }
        },
        error: err => {
          console.error(httpErrorToString(err, "Failed to get API versions"));

          // Just show our own version and errors for the other 2 known ones
          this.versions = [
            this._uiVersion,
            VersionResponse_Version.create({
              component: this._apiVersionDefault.component,
              version: "(error)",
            }),
            VersionResponse_Version.create({
              component: this._piquantVersionDefault.component,
              version: "(error)",
            }),
          ];
        },
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
