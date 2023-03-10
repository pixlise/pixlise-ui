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
import { Observable, ReplaySubject, Subject, of } from "rxjs";
import { tap, map, catchError } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";


// What we send in POST or PUT
class DataModuleInput
{
    constructor(
        public name: string, // Editable name
        public sourceCode: string, // The module executable code
        public comments: string, // Editable comments
        public tags: string[], // Any tags for this version
    )
    {
    }
}

class DataModuleVersionInput
{
    constructor(
        public sourceCode: string, // The module executable code
        public comments: string, // Editable comments
        public tags: string[], // Any tags for this version
    )
    {
    }
}

class APIObjectOrigin
{
    constructor(
        public shared: boolean,
        public creator: ObjectCreator,
        public create_unix_time_sec: number,
        public mod_unix_time_sec: number
    )
    {
    }
}

export class DataModuleVersionSourceWire
{
    constructor(
        public version: string,
        public tags: string[],
        public comments: string,
        public mod_unix_time_sec: number,
        public sourceCode: string,
    )
    {
    }
}

export class DataModule
{
    constructor(
        public id: string,
        public name: string,
        public comments: string,
        public origin: APIObjectOrigin,
        public versions: Map<string, DataModuleVersionSourceWire>,
    )
    {
    }
}

export class DataModuleSpecificVersionWire
{
    constructor(
        public id: string,
        public name: string,
        public comments: string,
        public origin: APIObjectOrigin,
        public version: DataModuleVersionSourceWire,
    )
    {
    }
}

class DataModuleStore
{
    private _modules: Map<string, DataModule> = new Map<string, DataModule>();

    constructor()
    {
    }

    ensureModuleExists(m: DataModule)
    {
        // Add/overwrite but if we have source code, preserve it
        let existing = this._modules.get(m.id);
        if(existing)
        {
            // copy source code from existing versions if we have any
            for(let [ver, existingVersion] of existing.versions)
            {
                if(existingVersion.sourceCode.length > 0)
                {
                    let gotVer = m.versions.get(ver);
                    if(gotVer.sourceCode.length <= 0)
                    {
                        gotVer.sourceCode = existingVersion.sourceCode;
                    }
                }
            }
        }

        // Add/Overwrite
        this._modules.set(m.id, m);
    }

    ensureModuleVersionExists(m: DataModuleSpecificVersionWire)
    {
        let toStore = new DataModule(
            m.id,
            m.name,
            m.comments,
            m.origin,
            new Map<string, DataModuleVersionSourceWire>()
        );

        let existing = this._modules.get(m.id);
        if(existing)
        {
            toStore.versions = existing.versions;
        }

        // Store the version in question (keep source code if we had it before)
        let verToStore = m.version;

        let existingVer = toStore.versions.get(m.version.version);
        if(existingVer && existingVer.sourceCode.length > 0 && verToStore.sourceCode.length <= 0)
        {
            verToStore.sourceCode = existingVer.sourceCode;
        }

        toStore.versions.set(verToStore.version, verToStore);

        // Add/Overwrite
        this._modules.set(m.id, toStore);
    }

    // Ensure only the IDs in the list provided are what we store
    pruneModules(validIDs: Set<string>): void
    {
        let toDelete = [];

        for(let id of this._modules.keys())
        {
            if(!validIDs.has(id))
            {
                toDelete.push(id);
            }
        }

        for(let id of toDelete)
        {
            this._modules.delete(id)
        }
    }

    getModuleVersion(id: string, version: string): DataModuleSpecificVersionWire
    {
        let module = this._modules.get(id);
        if(!module)
        {
            return null;
        }
        let ver = module.versions.get(version);
        if(!ver)
        {
            return null;
        }

        return new DataModuleSpecificVersionWire(
            module.id,
            module.name,
            module.comments,
            module.origin,
            new DataModuleVersionSourceWire(
                ver.version,
                ver.tags,
                ver.comments,
                ver.mod_unix_time_sec,
                ver.sourceCode
            )
        );
    }

    getModules(): DataModule[]
    {
        return Array.from(this._modules.values());
    }
}

@Injectable({
    providedIn: "root"
})
export class DataModuleService
{
    private _modulesUpdated$ = new ReplaySubject<void>(1);
    private _modules: DataModuleStore = new DataModuleStore();

    constructor(
        private _loadingSvc: LoadingIndicatorService,
        private http: HttpClient
    )
    {
        this.refresh();
    }

    get modulesUpdated$(): Subject<void>
    {
        return this._modulesUpdated$;
    }

    refresh()
    {
        let loadID = this._loadingSvc.add("Refreshing modules...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_module);
        this.http.get<object>(apiURL, makeHeaders()).subscribe(
            (resp: object)=>
            {
                this.processReceivedList(resp);
                this._loadingSvc.remove(loadID);
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                console.error("Failed to refresh data expressions!");
            }
        );
    }

    private readSpecificVersionModule(m: object): DataModuleSpecificVersionWire
    {
        let wireMod = new DataModuleSpecificVersionWire(
            m["id"],
            m["name"],
            m["comments"],
            new APIObjectOrigin(
                m["shared"],
                m["creator"],
                m["create_unix_time_sec"],
                m["mod_unix_time_sec"],
            ),
            new DataModuleVersionSourceWire(
                m["version"]["version"],
                m["version"]["tags"],
                m["version"]["comments"],
                m["version"]["mod_unix_time_sec"],
                m["version"]["sourceCode"],
            ),
        );

        return wireMod;
    }

    private processReceivedList(receivedDataModules: object): void
    {
        let t0 = performance.now();

        let recvdIDs = new Set<string>(); 
        Object.entries(receivedDataModules).forEach(([id, m]: [string, object])=>
        {
            recvdIDs.add(id);

            let versMap = new Map<string, DataModuleVersionSourceWire>();
            for(let v of m["versions"])
            {
                versMap.set(v["version"], new DataModuleVersionSourceWire(v["version"], v["tags"], v["comments"], v["mod_unix_time_sec"], ""));
            }
            
            let wireMod = new DataModule(
                m["id"],
                m["name"],
                m["comments"],
                new APIObjectOrigin(
                    m["shared"],
                    m["creator"],
                    m["create_unix_time_sec"],
                    m["mod_unix_time_sec"],
                ),
                versMap,
            );

            this._modules.ensureModuleExists(wireMod);
        });

        this._modules.pruneModules(recvdIDs);

        let t1 = performance.now();
        console.log("Module list processed in "+(t1 - t0).toLocaleString() + "ms");

        // Always update in this case
        this._modulesUpdated$.next();
    }

    addModule(name: string, sourceCode: string, comments: string, tags: string[]): Observable<DataModuleSpecificVersionWire>
    {
        let loadID = this._loadingSvc.add("Saving new module...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_module);
        let toSave = new DataModuleInput(name, sourceCode, comments, tags);
        return this.http.post<DataModuleSpecificVersionWire>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: DataModuleSpecificVersionWire)=>
                    {
                        if(resp) 
                        {
                            // Add this to our list of modules
                            let recvdModule = this.readSpecificVersionModule(resp);

                            // NOTE that this is a creation, so the version received is the only one!
                            this._modules.ensureModuleVersionExists(recvdModule);
                        }
                        else 
                        {
                            console.error("addModule: empty response received");
                        }
                        this._loadingSvc.remove(loadID);
                        return resp;
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                        return null;
                    }
                )
            );
    }

    addModuleVersion(moduleId: string, sourceCode: string, comments: string, tags: string[]): Observable<DataModuleSpecificVersionWire>
    {
        let loadID = this._loadingSvc.add("Adding new module version...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_module+"/"+moduleId);
        let toSave = new DataModuleVersionInput(sourceCode, comments, tags);
        return this.http.put<DataModuleSpecificVersionWire>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: DataModuleSpecificVersionWire)=>
                    {
                        if(resp) 
                        {
                            // Add this to our list of modules
                            let recvdModule = this.readSpecificVersionModule(resp);

                            // NOTE that this is adding a module to existing version map
                            this._modules.ensureModuleVersionExists(recvdModule);
                        }
                        else 
                        {
                            console.error("addModuleVersion: empty response received");
                        }
                        this._loadingSvc.remove(loadID);
                        return resp;
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                        return null;
                    }
                )
            );
    }

    getModule(moduleId: string, version: string): Observable<DataModuleSpecificVersionWire>
    {
        // If we have this one loaded already (we can tell by the sourceCode field not being empty)
        // then we can resolve this from cache too!
        let existingItem = this._modules.getModuleVersion(moduleId, version);
        if(existingItem && existingItem.version.sourceCode.length > 0)
        {
            return of(existingItem);
        }

        // Don't have it, query from API
        let loadID = this._loadingSvc.add("Getting module: "+moduleId+"...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_module+"/"+moduleId+"/"+version);
        return this.http.get<object>(apiURL, makeHeaders()).pipe(
            map((m: object)=>
            {
                this._loadingSvc.remove(loadID);

                let recvd = this.readSpecificVersionModule(m);

                // Overwrite whatever we have cached
                this._modules.ensureModuleVersionExists(recvd);
                return recvd;
            }),
            catchError((err)=>
            {
                // Make sure we hide our loading display...
                this._loadingSvc.remove(loadID);
                throw err;
            })
        );
    }

    getSourceDataModule(moduleId: string): DataModule
    {
        let modules = this.getModules();
        let module = modules.find((module: DataModule) => module.id === moduleId);
        return module;
    }

    getLatestCachedModuleVersion(moduleId: string): DataModuleVersionSourceWire
    {
        let module = this.getSourceDataModule(moduleId);
        if(!module)
        {
            return null;
        }

        let latestVersion = Array.from(module.versions.values()).pop();
        return latestVersion;
    }

    getLatestModuleVersion(moduleId: string): Observable<DataModuleSpecificVersionWire>
    {
        let latestVersion = this.getLatestCachedModuleVersion(moduleId);
        return this.getModule(moduleId, latestVersion.version);
    }

    getModules(): DataModule[]
    {
        return this._modules.getModules();
    }
}
