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
import { RoleInfo, UserInfo, UserManagementService } from "src/app/services/user-management.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";



// TODO: Unify the concepts of lists with selectable items, including CSS for the fields
// with offsets, etc

function sortUserByLogin(a: UserInfo, b: UserInfo)
{
    return b.last_login-a.last_login;
}

@Component({
    selector: "app-users",
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"]
})
export class UsersComponent implements OnInit
{
    toSearch: string = "";

    roles: RoleInfo[] = [];

    users: UserInfo[] = [];
    usersWithoutPermissions: UserInfo[] = [];

    selectedUserDetails: UserInfo = null;
    selectedUserRoles: RoleInfo[] = null;
    selectedUserMissingRoles: RoleInfo[] = null;

    constructor(
        private userMgmt: UserManagementService,
    )
    {
    }

    ngOnInit()
    {
        this.userMgmt.userRoles$.subscribe(
            (roles: RoleInfo[])=>
            {
                this.roles = roles;
            },
            (err)=>
            {
            }
        );
        this.userMgmt.refreshRoles();
        this.onSearch();
        this.refreshUnassignedNewUsers();
    }

    get selectedUserName(): string
    {
        if(this.selectedUserDetails)
        {
            return this.selectedUserDetails.name;
        }

        return "Selected User";
    }

    protected refreshUnassignedNewUsers(): void
    {
        this.userMgmt.getRoleUsers(EnvConfigurationInitService.appConfig.unassignedNewUserRoleId).subscribe(
            (users: UserInfo[])=>
            {
                this.usersWithoutPermissions = users;
                this.usersWithoutPermissions.sort(sortUserByLogin);
            },
            (err)=>
            {
                this.usersWithoutPermissions = [];
                console.log(err);
            }
        );
    }

    onSearch()
    {
        this.users = null;
        this.userMgmt.searchUsers(this.toSearch).subscribe(
            (users: UserInfo[])=>
            {
                // If user has no permissions, it gets bin sorted into the other list...
                this.users = users;

                this.users.sort(sortUserByLogin);
                this.selectedUserDetails = null;
            },
            (err)=>
            {
                this.users = [];
                console.log(err);
            }
        );
    }

    onSelect(user: UserInfo)
    {
        this.selectedUserDetails = user;
        this.refreshSelectedUserRoles();
    }

    private refreshSelectedUserRoles()
    {
        this.selectedUserRoles = null;
        this.selectedUserMissingRoles = null;

        // Load roles for this user
        this.userMgmt.getUserRoles(this.selectedUserDetails.user_id).subscribe(
            (roles: RoleInfo[])=>
            {
                this.selectedUserRoles = roles;

                let existingRoleIDs = new Set<string>();
                for(let r of roles)
                {
                    existingRoleIDs.add(r.id);
                }

                // Put the roles that are missing from the above into the missing list
                this.selectedUserMissingRoles = [];
                for(let r of this.roles)
                {
                    if(!existingRoleIDs.has(r.id))
                    {
                        this.selectedUserMissingRoles.push(r);
                    }
                }
            },
            (err)=>
            {
                this.selectedUserRoles = [];
                this.selectedUserMissingRoles = [];
                console.log(err);
            }
        );
    }

    onAddRole(role: RoleInfo)
    {
        if(confirm("Are you sure you want to add role: "+role.name+" to user: "+this.selectedUserDetails.name+"?"))
        {
            this.userMgmt.addUserRole(this.selectedUserDetails.user_id, role.id).subscribe(
                ()=>
                {
                    this.refreshSelectedUserRoles();
                },
                (err)=>
                {
                    console.log(err);
                    this.refreshSelectedUserRoles();
                }
            );
        }
    }

    onDeleteRole(role: RoleInfo)
    {
        if(confirm("Are you sure you want to remove role: "+role.name+" from user: "+this.selectedUserDetails.name+"?"))
        {
            this.userMgmt.deleteUserRole(this.selectedUserDetails.user_id, role.id).subscribe(
                ()=>
                {
                    this.refreshSelectedUserRoles();
                },
                (err)=>
                {
                    console.log(err);
                    this.refreshSelectedUserRoles();
                }
            );
        }
    }
}
