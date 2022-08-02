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
import { Injectable } from "@angular/core";
import { ReplaySubject, Subscription } from "rxjs";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { UserOptionsService } from "./user-options.service";






/* An example that came back:
[
    {
        "topic": "Quantification Processing",
        "message": "Quantification alert-test Processing Complete",
        "timestamp": "2021-03-05T11:04:47.355344822Z",
        "userid": "5de45d85ca40070f421a3a34"
    }
]
*/

class WireNotification
{
    constructor(
        public topic: string,
        public message: string,
        public timestamp: string,
        public userid: string
    )
    {
    }
}

export class NotificationItem
{
    public static readonly typeInfoDismissable: string = "typeInfoDismissable"; // The normal blue ones which can be dismissed with X button
    public static readonly typeUpdating: string = "typeUpdating"; // Yellow, with refresh page button

    constructor(
        public id: number,
        public message: string,
        public notificationType: string,
        public hintId: string // associated hintId, if user dismisses it, we have to save this hintId in user options!
    )
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class NotificationService
{
    private _subs = new Subscription();

    private _notifications$ = new ReplaySubject<void>(1);
    private _notifications: NotificationItem[] = [];
    private _lastId: number = 1;

    constructor(
        private http: HttpClient,
        private _userOptionsService: UserOptionsService
    )
    {
    }

    // Adds notification to our list of notifications, generates an ID for it and returns that
    private addNotificationWithoutSubs(message: string, hintId: string = null, doNotAddDuplicate: boolean = false, notificationType: string = NotificationItem.typeInfoDismissable): number
    {
        if(doNotAddDuplicate)
        {
            for(let notif of this._notifications)
            {
                if(notif.message == message)
                {
                    // Don't add!
                    return -1;
                }
            }
        }

        this._lastId++;
        this._notifications.push(new NotificationItem(this._lastId, message, notificationType, hintId));

        return this._lastId;
    }

    addNotification(message: string, doNotAddDuplicate: boolean = false, notificationType: string = NotificationItem.typeInfoDismissable): void
    {
        this.addNotificationWithoutSubs(message, null, doNotAddDuplicate, notificationType);
        this._notifications$.next();
    }

    // Adds a notification that behaves like a hint. So if it was shown/dismissed before
    // by the user, we don't show it again. We check this by looking at the hint ids
    // that the user has already dismissed. Note that this also means when the user dismisses
    // it we must store it in hint ids!
    addHintLikeNotification(message: string, hintId: string): void
    {
        // If user already dismissed once, don't do anything...
        if(!this._userOptionsService.canShowHint(hintId))
        {
            return;
        }

        // First time user is seeing it, show it
        this.addNotificationWithoutSubs(message, hintId);
        this._notifications$.next();
    }

    acknowledge(id: number): void
    {
        // If id matches one of ours, remove it and notify
        for(let c = 0; c < this._notifications.length; c++)
        {
            if(this._notifications[c].id == id)
            {
                // Check if it's got a hint id associated, if so, we have to save
                // that among user options hints so if we come across this scenario
                // we don't show it again
                const hintId = this._notifications[c].hintId;
                if(hintId)
                {
                    this._userOptionsService.addDismissedHintID(hintId);
                }

                // Delete it
                this._notifications.splice(c, 1);
                this._notifications$.next();
                return;
            }
        }
    }

    clear(): void
    {
        this._notifications = [];
        this._notifications$.next();
    }

    pollAPI(): void
    {
        // Here we ask the API if it has any new alerts for us.
        // NOTE: If the API has sent us an alert, it deletes it from its list, so we need to queue
        // it up to be shown here otherwise user never sees it

        let apiURL = APIPaths.getWithHost(APIPaths.api_notification+"/alerts");

        this.http.get<WireNotification[]>(apiURL, makeHeaders()).subscribe(
            (alerts: WireNotification[])=>
            {
                if(alerts && alerts.length > 0)
                {
                    // Run through what we received and create notifications out of them
                    for(let alert of alerts)
                    {
                        this.addNotificationWithoutSubs(alert.message);
                    }

                    // Alert that we have new notifications in the queue
                    this._notifications$.next();
                }
            },
            (err)=>
            {
                console.error("Failed to retrieve notification config: "+JSON.stringify(err));
            }
        );
    }

    sendTestRequest(body: object): void
    {
        const apiURL = APIPaths.getWithHost(APIPaths.api_notification + "/test");
        const jsonobj = JSON.stringify(body);
        this.http.post(apiURL, jsonobj, makeHeaders()).subscribe(res => console.log(res));
    }

    sendGlobalEmail(content: object): void
    {
        const apiURL = APIPaths.getWithHost(APIPaths.api_notification + "/globalemail");
        const jsonobj = JSON.stringify(content);
        this.http.post(apiURL, jsonobj, makeHeaders()).subscribe(res => console.log(res));
    }

    get notifications$(): ReplaySubject<void>
    {
        return this._notifications$;
    }

    getLatestNotification(): NotificationItem
    {
        if(this._notifications.length <= 0)
        {
            return null;
        }

        return this._notifications[this._notifications.length-1];
    }
}
