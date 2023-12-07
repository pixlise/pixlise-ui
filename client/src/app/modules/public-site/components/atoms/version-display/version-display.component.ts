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
import { ComponentVersion, ComponentVersions } from "src/app/models/BasicTypes";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { VERSION } from "src/environments/version";

@Component({
  selector: "version-display",
  templateUrl: "./version-display.component.html",
  styleUrls: ["./version-display.component.scss"],
})
export class VersionDisplayComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _uiVersion = new ComponentVersion("PIXLISE", (VERSION as any)?.raw || "(Local build)");
  private _apiVersionDefault = new ComponentVersion("API", "");
  private _piquantVersionDefault = new ComponentVersion("PIQUANT", "");

  versions: ComponentVersion[] = [this._uiVersion, this._apiVersionDefault, this._piquantVersionDefault];

  constructor(public envConfigService: EnvConfigurationService) {}

  ngOnInit() {
    this._subs.add(
      this.envConfigService.getComponentVersions().subscribe({
        next: (versions: ComponentVersions) => {
          // Overwrite ours
          this.versions = [this._uiVersion, ...versions.components];

          // Remove the image name from piquant version
          for (let ver of this.versions) {
            if (ver.component == "PIQUANT") {
              let parts = ver.version.split(":");
              if (parts.length == 2) {
                ver.version = parts[1];
              }
            }
          }
        },
        error: err => {
          // Just show our own version and errors for the other 2 known ones
          this.versions = [
            this._uiVersion,
            new ComponentVersion(this._apiVersionDefault.component, "(error)"),
            new ComponentVersion(this._piquantVersionDefault.component, "(error)"),
          ];
        },
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
