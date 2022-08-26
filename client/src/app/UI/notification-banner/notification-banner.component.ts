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

import { Component, OnInit } from "@angular/core";
import { Subscription, timer } from "rxjs";
import { LayoutService } from "src/app/services/layout.service";
import { NotificationItem, NotificationService } from "src/app/services/notification.service";
import { VersionUpdateCheckerService } from "src/app/services/version-update-checker.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";


@Component({
    selector: "notification-banner",
    templateUrl: "./notification-banner.component.html",
    styleUrls: ["./notification-banner.component.scss"]
})
export class NotificationBannerComponent implements OnInit
{
    private _subs = new Subscription();

    notification: NotificationItem = null;
    notificationType: string = "";

    constructor(
        private _notificationService: NotificationService,
        private _versionCheckService: VersionUpdateCheckerService,
        private _layoutService: LayoutService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._notificationService.notifications$.subscribe(
            ()=>
            {
                this.getLatestNotification();
            }
        ));

        // Start timer in a little while, don't want it rushing straight away
        const timerStartMs = 1000;
        this._subs.add(timer(timerStartMs, EnvConfigurationInitService.appConfig.alertPollInterval_ms).subscribe(
            (counter: number)=>
            {
                this._notificationService.pollAPI();
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onClose(): void
    {
        if(this.notification)
        {
            this._notificationService.acknowledge(this.notification.id);
            this.getLatestNotification();
        }
    }

    onRefresh(): void
    {
        location.reload();
    }

    protected getLatestNotification(): void
    {
        let lastNotificationType = this.notificationType;
        this.notification = this._notificationService.getLatestNotification();
        if(!this.notification)
        {
            this.notificationType = "";
        }
        else
        {
            this.notificationType = this.notification.notificationType;
        }

        if(lastNotificationType != this.notificationType)
        {
            // We've shown or hidden the banner, so trigger a UI resize because canvases will be the wrong size now
            const source = timer(10);
            const abc = source.subscribe(val => 
            {
                this._layoutService.notifyWindowResize();
            });
        }
    }
}
