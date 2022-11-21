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
import { Observable, ReplaySubject, Subject } from "rxjs";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";



export class UserInfo
{
    constructor(
        public user_id: string,
        public name: string,
        public email: string,
        public created_at: number,
        public last_login: number,
        public picture: string,
        public roles: string[]
    )
    {
    }
}

export class RoleInfo
{
    constructor(
        public id: string,
        public name: string,
        public description: string
    )
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class UserManagementService
{
    private _userRoles$ = new ReplaySubject<RoleInfo[]>(1);

    constructor(private http: HttpClient)
    {
    }

    get userRoles$(): Subject<RoleInfo[]>
    {
        return this._userRoles$;
    }

    searchUsers(query: string): Observable<UserInfo[]>
    {
        console.log("Searching for users with query: "+query);
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/query");
        return this.http.get<UserInfo[]>(apiURL, makeHeaders());
    }

    getUserRoles(userID: string): Observable<RoleInfo[]>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/roles/"+userID);
        return this.http.get<RoleInfo[]>(apiURL, makeHeaders());
    }

    addUserRole(userID: string, roleID: string): Observable<void>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/roles/"+userID+"/"+roleID);
        return this.http.post<void>(apiURL, makeHeaders());
    }

    deleteUserRole(userID: string, roleID: string): Observable<void>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/roles/"+userID+"/"+roleID);
        return this.http.delete<void>(apiURL, makeHeaders());
    }

    getRoleUsers(roleID: string): Observable<UserInfo[]>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/by-role/"+roleID);
        return this.http.get<UserInfo[]>(apiURL, makeHeaders());
    }

    refreshRoles()
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_user_management+"/all-roles");
        return this.http.get<RoleInfo[]>(apiURL, makeHeaders()).subscribe(
            (roles: RoleInfo[])=>
            {
                this._userRoles$.next(roles);
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    setUserName(name: string): Observable<void>
    {
        // Users sign up via auth0 and only need to provide an email address. We later ask them for their
        // name and save via here.
        // This passes the name to the API endpoint, which can then do the appropriate updates on the back-end
        // Users must log out & back in for change to take effect
        
        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_user_management+"/name");
        return this.http.post<void>(apiUrl, "\""+name+"\"", makeHeaders());
    }
}
