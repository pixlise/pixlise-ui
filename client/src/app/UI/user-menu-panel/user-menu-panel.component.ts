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
import { AuthenticationService } from "src/app/services/authentication.service";
import { NotificationMethod, NotificationSubscriptions, UserOptionsService } from "src/app/services/user-options.service";
import { UserManagementService } from "src/app/services/user-management.service";
import { httpErrorToString } from "src/app/utils/utils";


class NotificationSetting
{
    constructor(public label: string, public id: string, public method: NotificationMethod)
    {
    }
}

@Component({
    selector: "app-user-menu-panel",
    templateUrl: "./user-menu-panel.component.html",
    styleUrls: ["./user-menu-panel.component.scss"]
})
export class UserMenuPanelComponent implements OnInit
{
    user: any = null;

    notifications: NotificationSetting[] = [];

    constructor(
        private _authService: AuthenticationService,
        private _userOptionsService: UserOptionsService,
        private _userService: UserManagementService,
    )
    {
        this.notifications = [
            new NotificationSetting("Your Quantification Complete", NotificationSubscriptions.notificationUserQuantComplete, new NotificationMethod(false, false, false)),
            new NotificationSetting("Quantification Shared", NotificationSubscriptions.notificationQuantShared, new NotificationMethod(false, false, false)),
            new NotificationSetting("New Dataset Available", NotificationSubscriptions.notificationNewDatasetAvailable, new NotificationMethod(false, false, false)),
            new NotificationSetting("Dataset Spectra Updated", NotificationSubscriptions.notificationDatasetSpectraUpdated, new NotificationMethod(false, false, false)),
            new NotificationSetting("Dataset Image Updated", NotificationSubscriptions.notificationDatasetImageUpdated, new NotificationMethod(false, false, false)),
            new NotificationSetting("Dataset Housekeeping Updated", NotificationSubscriptions.notificationDatasetHousekeepingUpdated, new NotificationMethod(false, false, false)),
            new NotificationSetting("Element Set Shared", NotificationSubscriptions.notificationElementSetShared, new NotificationMethod(false, false, false)),
        ];

        this._authService.userProfile$.subscribe(
            (user)=>
            {
                //console.log(user);
                this.user = user;
            }
        );

        this._userOptionsService.userOptionsChanged$.subscribe(
            ()=>
            {
                // Update our notifications settings for display
                const subs = this._userOptionsService.notificationSubscriptions;
                for(let n of this.notifications)
                {
                    for(let topic of subs.topics)
                    {
                        if(topic.name == n.id)
                        {
                            n.method = topic.config.method;
                            break;
                        }
                    }
                }
            }
        );
    }

    ngOnInit()
    {
    }

    onToggleNotification(notification: NotificationSetting, methodName: string): void
    {
        this._userOptionsService.toggleNotificationMethod(notification.id, methodName);
    }

    get hintAssitanceOn(): boolean
    {
        if(!this._userOptionsService.userHints)
        {
            return false;
        }
        return this._userOptionsService.userHints.enabled;
    }

    onToggleHintAssitanceOn(): void
    {
        if(!this._userOptionsService.userHints)
        {
            return;
        }

        this._userOptionsService.setHintAssistanceEnabled(!this._userOptionsService.userHints.enabled);
    }

    onResetHints(): void
    {
        this._userOptionsService.resetHints();
    }

    onLogout(): void
    {
        this._authService.logout();
    }

    get userName(): string
    {
        if(!this.user)
        {
            return "Loading...";
        }

        return this.user.name;
    }

    get userEmail(): string
    {
        if(!this.user)
        {
            return "Loading...";
        }
        return this.user.email;
    }

    get dataCollectionActive(): boolean
    {
        return this._userOptionsService.isDataCollectionEnabled;
    }

    showDataCollectionDialog(): void
    {
        this._userOptionsService.showDataCollectionDialog();
    }

    onToggleDataCollection(): void
    {
        // Add additional step to prevent accidental toggling
        this.showDataCollectionDialog();
    }

    onEditName(): void
    {
        let name = prompt("Please enter your name");
        if(name.length > 0)
        {
            this._userService.setUserField("name", name).subscribe(
                ()=>
                {
                    alert("You will now be logged out. When you log back in your name will be correctly loaded.")
                    this._authService.logout();
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to save user name"));
                }
            );
        }
    }

    onEditEmail(): void
    {
        let email = prompt("Please enter your email address");
        if(email.length > 0)
        {
            this._userService.setUserField("email", email).subscribe(
                ()=>
                {
                    alert("You will now be logged out. When you log back in your name will be correctly loaded. You can check this using the user menu on the top-right. Thanks!")
                    this._authService.logout();
                },
                (err)=>
                {
                    alert(httpErrorToString(err, "Failed to save user email"));
                }
            );
        }
    }
}
