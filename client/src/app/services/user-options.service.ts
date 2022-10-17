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
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, ReplaySubject } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataCollectionDialogComponent } from "src/app/UI/data-collection-dialog/data-collection-dialog.component";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";


export class NotificationMethod
{
    constructor(public ui: boolean, public sms: boolean, public email: boolean)
    {
    }
}

export class NotificationConfig
{
    constructor(public method: NotificationMethod)
    {
    }
}

export class UserConfig
{
    constructor(
        public name: string,
        public email: string,
        public data_collection: string
    )
    {
    }
}

export class NotificationTopic
{
    constructor(public name: string, public config: NotificationConfig)
    {
    }
}

export class NotificationSubscriptions
{
    public static readonly notificationTypeUIOnly = "ui-only";
    public static readonly notificationTypeSMS = "sms";
    public static readonly notificationTypeEmail = "email";

    public static readonly notificationUserQuantComplete = "user-quant-complete";
    public static readonly notificationQuantShared = "quant-shared";
    public static readonly notificationNewDatasetAvailable = "new-dataset-available";
    public static readonly notificationDatasetSpectraUpdated = "dataset-spectra-updated";
    public static readonly notificationDatasetImageUpdated = "dataset-image-updated";
    public static readonly notificationDatasetHousekeepingUpdated = "dataset-housekeeping-updated";
    public static readonly notificationElementSetShared = "element-set-shared";

    constructor(public topics: NotificationTopic[])
    {
    }
}

export class UserHints
{
    public static readonly hintContextColourSelectionShiftForPan = "colour-select-shift-for-pan";
    public static readonly hintContextColourSelectionZForZoom = "colour-select-z-for-zoom";

    public static readonly hintContextLassoShiftForPan = "lasso-shift-for-pan";
    public static readonly hintContextLassoZForZoom = "lasso-z-for-zoom";

    public static readonly hintContextLineDrawShiftForPan = "line-draw-shift-for-pan";
    public static readonly hintContextLineDrawZForZoom = "line-draw-z-for-zoom";
    public static readonly hintContextLineDrawEscForClear = "line-draw-esc-for-clear";

    public static readonly hintContextLineSelectShiftForPan = "line-select-shift-for-pan";
    public static readonly hintContextLineSelectZForZoom = "line-select-z-for-zoom";

    public static readonly hintContextPointSelectShiftForPan = "point-select-shift-for-pan";
    public static readonly hintContextPointSelectZForZoom = "point-select-z-for-zoom";
    public static readonly hintContextPointSelectAlt = "point-select-alt";

    public static readonly hintContextRotateShiftIncrements = "rotate-shift-increments";

    public static readonly hintDwellExistsPrefix = "dwell-exists-";

    constructor(public enabled: boolean, public hints: string[])
    {
    }
}


@Injectable({
    providedIn: "root"
})
export class UserOptionsService
{
    private _userConfig: UserConfig = new UserConfig("", "", "");
    private _version: string = "";
    private _notificationConfig: NotificationConfig = new NotificationConfig(
        new NotificationMethod(true, false, false)
    );
    private _notificationSubscriptions: NotificationSubscriptions = new NotificationSubscriptions([]);
    private _userHints: UserHints = new UserHints(true, []);

    private _userOptionsChanged$ = new ReplaySubject<void>(1);

    constructor(
        private http: HttpClient,
        private _authService: AuthenticationService,
        public dialog: MatDialog
    )
    {
        // When we're authenticated, we can refresh the user options...
        this._authService.isAuthenticated$.subscribe(
            (loggedIn: boolean)=>
            {
                if(loggedIn)
                {
                    this.refreshOptions();
                }
            }
        );
    }

    private makeURL(path: string): string
    {
        return APIPaths.getWithHost(APIPaths.api_notification+"/"+path);
    }

    private makeUserConfigURL(): string
    {
        return APIPaths.getWithHost(APIPaths.api_user_management+"/config");
    }

    private refreshOptions(): void
    {
        this.refreshUserConfig();
        this.refreshSubscriptions();
        this.refreshHints();
    }

    showDataCollectionDialog(): void
    {
        const dialogConfig = new MatDialogConfig();

        // Don't allow user to close config until data collection option is chosen
        dialogConfig.disableClose = true;

        const dialogRef = this.dialog.open(DataCollectionDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (allowed: boolean)=>
            {
                let falseValue = `${this._version}-false`;
                // Save this user setting
                this._userConfig.data_collection = allowed ? this._version : falseValue;
                this.saveUserConfig().subscribe(()=>
                {
                },
                (err)=>
                {
                    console.error("Failed to save data collection: "+JSON.stringify(err));
                }
                );
            }
        );
    }

    disableDataCollection(): void
    {
        this._userConfig.data_collection = `${this._version}-false`;
        this.saveUserConfig().subscribe(()=>
        {
        },
        (err)=>
        {
            console.error("Failed to save data collection: "+JSON.stringify(err));
        }
        );
    }

    private refreshUserConfig(): void
    {
        this.http.get<{ version: string; }>(EnvConfigurationInitService.appConfig.dataCollectionAgreementVersionUrl, makeHeaders()).subscribe(
            (version: { version: string; })=>
            {
                this._version = version.version;
                this.http.get<UserConfig>(this.makeUserConfigURL(), makeHeaders()).subscribe(
                    (config: UserConfig)=>
                    {
                        this._userConfig = config;
                        this._userOptionsChanged$.next();
                        // If data collection flag was not set at this version, show dialog
                        if(![`${this._version}-false`, this._version].includes(this._userConfig.data_collection))
                        {
                            this.showDataCollectionDialog();
                        }
                    },
                    (err)=>
                    {
                        console.error("Failed to retrieve user config: "+JSON.stringify(err));
                    }
                );
            });
    }

    private refreshSubscriptions(): void
    {
        let apiURL = this.makeURL("subscriptions");
        this.http.get<NotificationSubscriptions>(apiURL, makeHeaders()).subscribe(
            (subscriptions: NotificationSubscriptions)=>
            {
                // Save and notify listeners
                this._notificationSubscriptions = subscriptions;
                if(!this._notificationSubscriptions || !this._notificationSubscriptions.topics)
                {
                    this._notificationSubscriptions = new NotificationSubscriptions([]);
                }
                this._userOptionsChanged$.next();
            },
            (err)=>
            {
                console.error("Failed to retrieve subscriptions: "+JSON.stringify(err));
            }
        );
    }

    private refreshHints(): void
    {
        let apiURL = this.makeURL("hints");
        this.http.get<UserHints>(apiURL, makeHeaders()).subscribe(
            (hints: UserHints)=>
            {
                // Save and notify listeners
                // Done this way because UserHints doesn't really deliver the enabled flag yet from API
                this._userHints = new UserHints(true, hints && hints.hints ? hints.hints : []);
                this._userOptionsChanged$.next();
            },
            (err)=>
            {
                console.error("Failed to retrieve user hints: "+JSON.stringify(err));
            }
        );
    }

    private saveUserConfig(): Observable<void>
    {
        let apiURL = this.makeUserConfigURL();
        return this.http.post<void>(apiURL, this._userConfig, makeHeaders());
    }

    private saveNotificationSubscriptions(): void
    {
        let apiURL = this.makeURL("subscriptions");
        this.http.post<void>(apiURL, this._notificationSubscriptions, makeHeaders()).subscribe(()=>
        {
        },
        (err)=>
        {
            console.error("Failed to save notification subscriptions: "+JSON.stringify(err));
        }
        );
    }

    private saveHints(): void
    {
        let apiURL = this.makeURL("hints");
        this.http.post<void>(apiURL, this._userHints, makeHeaders()).subscribe(()=>
        {
        },
        (err)=>
        {
            console.error("Failed to save user hints: "+JSON.stringify(err));
        }
        );
    }

    get userOptionsChanged$(): ReplaySubject<void>
    {
        return this._userOptionsChanged$;
    }

    get notificationSubscriptions(): NotificationSubscriptions
    {
        return this._notificationSubscriptions;
    }

    get userConfig(): UserConfig
    {
        return this._userConfig;
    }

    get userHints(): UserHints
    {
        return this._userHints;
    }

    getNotificationTypes(): string[]
    {
        return [
            NotificationSubscriptions.notificationTypeUIOnly,
            NotificationSubscriptions.notificationTypeEmail,
            NotificationSubscriptions.notificationTypeSMS
        ];
    }

    toggleNotificationMethod(id: string, methodName: string): void
    {
        // Run through and see if we have a setting already...
        let foundTopicIdx: number = -1;

        for(let c = 0; c < this._notificationSubscriptions.topics.length; c++)
        {
            if(this._notificationSubscriptions.topics[c].name == id)
            {
                foundTopicIdx = c;
                break;
            }
        }

        // If it exists, apply the toggle
        if(foundTopicIdx > -1)
        {
            let prev = this._notificationSubscriptions.topics[foundTopicIdx].config.method[methodName];
            if(prev == undefined)
            {
                console.warn("Failed to set topic notification method: "+methodName);
                return;
            }

            this._notificationSubscriptions.topics[foundTopicIdx].config.method[methodName] = !prev;

            // If all methods are blank, delete the topic
            if( this._notificationSubscriptions.topics[foundTopicIdx].config.method.ui == false &&
                this._notificationSubscriptions.topics[foundTopicIdx].config.method.email == false &&
                this._notificationSubscriptions.topics[foundTopicIdx].config.method.sms == false )
            {
                this._notificationSubscriptions.topics.splice(foundTopicIdx, 1);
            }
        }
        else
        {
            // Doesn't exist, create the topic with this method turned on
            this._notificationSubscriptions.topics.push(
                new NotificationTopic(
                    id,
                    new NotificationConfig(
                        new NotificationMethod(methodName=="ui", methodName=="sms", methodName=="email")
                    )
                )
            );
        }

        this.saveNotificationSubscriptions();
        this._userOptionsChanged$.next();
    }

    setHintAssistanceEnabled(enabled: boolean): void
    {
        if(!this._userHints)
        {
            return;
        }

        // Resetting, so we want all to show like we're a new user again... therefore we clear the hint ids that have been shown
        this._userHints.enabled = enabled;

        this.saveHints();
        this._userOptionsChanged$.next();
    }

    resetHints(): void
    {
        if(!this._userHints)
        {
            return;
        }

        // Resetting, so we want all to show like we're a new user again... therefore we clear the hint ids that have been shown
        this._userHints.hints = [];

        this.saveHints();
        this._userOptionsChanged$.next();
    }

    addDismissedHintID(id: string): void
    {
        if(!this._userHints)
        {
            return;
        }

        // If we don't have it already marked as a dismissed hint...
        if(this._userHints.hints.indexOf(id) == -1)
        {
            // mark it
            this._userHints.hints.push(id);

            // save it
            this.saveHints();
            this._userOptionsChanged$.next();
        }
    }

    canShowHint(id: string): boolean
    {
        // Can show the hint if hint assistance is ON and user has not yet dismissed this ID
        return (this._userHints && this._userHints.enabled && this._userHints.hints.indexOf(id) < 0);
    }
}
