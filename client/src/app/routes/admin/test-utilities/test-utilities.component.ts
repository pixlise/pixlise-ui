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
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { APILogService } from "src/app/services/apilog.service";
import { NotificationItem, NotificationService } from "src/app/services/notification.service";
import { SentryHelper } from "src/app/utils/utils";
import { combineLatest } from "rxjs";


@Component({
    selector: "test-utilities",
    templateUrl: "./test-utilities.component.html",
    styleUrls: ["./test-utilities.component.scss"]
})
export class TestUtilitiesComponent implements OnInit
{
    logLevels: string[] = ["DEBUG", "INFO", "ERROR"];
    logLevel: string = "";

    sendEmail: string = "";
    sendSms: string = "";

    constructor(
        private _notificationService: NotificationService,
        private _envService: EnvConfigurationService,
        private _logService: APILogService
    )
    {
    }

    ngOnInit(): void
    {
        this.refreshLogLevel();
    }

    onTriggerTestError(): void
    {
        console.log("Firing Sentry Exception");
        SentryHelper.logException(new Error("This is my fake error message!"));
    }

    onTriggerTestNotification(): void
    {
        if(this.sendSms.length <= 0 && this.sendEmail.length <= 0)
        {
            alert("Specify an SMS or email (or both)!");
        }

        if(this.sendEmail !== "")
        {
            console.log("Firing Email Test");
            this._notificationService.sendTestRequest({type: "email", contact: this.sendEmail});
        }

        if(this.sendSms !== "")
        {
            console.log("Firing SMS Test");
            this._notificationService.sendTestRequest( {type: "sms", contact: this.sendSms});
        }
    }

    onTriggerTestUINotification(): void
    {
        this._notificationService.addNotification("Test notification triggered from client-side test button", true);
    }

    onTriggerTestUIUpdating(): void
    {
        this._notificationService.addNotification("This is a special updating style notification", true, NotificationItem.typeUpdating);
    }

    onTest500(): void
    {
        this._envService.test500().subscribe(
            (str: string)=>
            {
                console.log("500 test returned: "+str);
            },
            (err)=>
            {
                console.log("500 test returned error: "+err);
            }
        );
    }

    onTest503(): void
    {
        this._envService.test503().subscribe(
            (str: string)=>
            {
                console.log("503 test returned: "+str);
            },
            (err)=>
            {
                console.log("503 test returned error: "+err);
            }
        );
    }

    onTest404(): void
    {
        this._envService.test404().subscribe(
            (str: string)=>
            {
                console.log("404 test returned: "+str);
            },
            (err)=>
            {
                console.log("404 test returned error: "+err);
            }
        );
    }

    onLogLevelChanged(): void
    {
        if(this.logLevel.length <= 0)
        {
            alert("Select a log level!");
            return;
        }

        // Set this frequently a few times, this way we should be load balanced
        // out to all APIs and set it for each
        let waitSetResult = [];
        for(let c = 0; c < 4; c++)
        {
            waitSetResult.push(this._logService.setLogLevel(this.logLevel));
        }

        let all$ = combineLatest(waitSetResult);
        all$.subscribe(
            (data)=>
            {
                alert("Log level has been set");
                this.refreshLogLevel();
            },
            (err)=>
            {
                alert("Log level set encountered errors");
                this.refreshLogLevel();
            }
        );
    }

    private refreshLogLevel(): void
    {
        this._logService.getLogLevel().subscribe(
            (level: string)=>
            {
                this.logLevel = level;
            }
        );
    }
}
