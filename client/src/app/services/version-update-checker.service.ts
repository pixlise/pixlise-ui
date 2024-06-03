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

import { HttpClient } from "@angular/common/http";
import { Injectable, OnDestroy } from "@angular/core";
import { Subscription, timer } from "rxjs";
import { makeHeaders } from "src/app/utils/api-helpers";
import { doesVersionDiffer } from "src/app/utils/utils";
import { VERSION } from "src/environments/version";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { NotificationsService, UINotification } from "../modules/settings/services/notifications.service";
import { SnackbarService } from "../modules/pixlisecore/pixlisecore.module";
import { versionUpdateNotificationID } from "../components/toolbar/notifications-menu-panel/notifications-menu-panel.component";

class DeployedVersion {
  constructor(public version: string) {}
}

@Injectable({
  providedIn: "root",
})
export class VersionUpdateCheckerService implements OnDestroy {
  private _subs = new Subscription();

  constructor(
    private _notificationService: NotificationsService,
    private _snackService: SnackbarService,
    private http: HttpClient
  ) {
    if (EnvConfigurationInitService.appConfig.versionPollUrl.length <= 0) {
      console.log("Version update checking is disabled, will not be performed");
      return;
    }

    console.log("Version update checking will run every " + EnvConfigurationInitService.appConfig.versionPollInterval_ms + "ms");

    // Start timer in a little while, don't want it rushing straight away
    const timerStartMs = 5000;
    this._subs.add(
      timer(timerStartMs, EnvConfigurationInitService.appConfig.versionPollInterval_ms).subscribe((counter: number) => {
        this.pollServerVersion();
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  protected pollServerVersion(): void {
    // Request with a different URL so doesn't get cached
    this.http.get<DeployedVersion>(EnvConfigurationInitService.appConfig.versionPollUrl + "?checktime=" + Math.floor(Date.now() / 1000), makeHeaders()).subscribe(
      (version: DeployedVersion) => {
        const thisBuildVersion = VERSION?.raw || "";
        const recvVersion = version.version;

        if (doesVersionDiffer(thisBuildVersion, recvVersion)) {
          // don't add it multiple times...
          if (this._notificationService.notifications.find(n => n.id == versionUpdateNotificationID)) {
            return;
          }

          console.log("Deployed version: " + recvVersion + ", this build: " + thisBuildVersion + ", showing refresh page notification...");

          const title = "Version " + version.version + " of PIXLISE is available, please refresh this tab to get the latest version!";

          this._notificationService.addNotification(
            {
              id: versionUpdateNotificationID,
              title: title,
              type: "action",
              action: {
                buttonTitle: "Reload",
                /*buttonAction: () => {
                window.location.reload();
              },*/
              },
            },
            false // don't save this to DB, we will poll again in future/on tab reopen
          );

          // FOR NOW we also show a snack because the notification stuff is unfinished
          this._snackService.openWarning(title, "", "", false);
        }
      },
      err => {
        console.error("Failed to retrieve deployed UI version: " + JSON.stringify(err));
      }
    );
  }
}
