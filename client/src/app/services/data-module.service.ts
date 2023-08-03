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
import { Observable, ReplaySubject, Subject, of, from, combineLatest } from "rxjs";
import { tap, map, catchError, mergeMap, shareReplay } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { DataExpression } from "../models/Expression";
import { EXPR_LANGUAGE_LUA } from "../expression-language/expression-language";
import { AuthenticationService } from "./authentication.service";
import { DOIMetadata } from "../UI/expression-metadata-editor/doi-publish-dialog/doi-publish-dialog.component";


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
        public versionupdate: string = "patch", // "major", "minor", "patch"
        public doiMetadata: DOIMetadata = null // DOI metadata
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
        public doiMetadata: DOIMetadata = null
        // public doi: string = "",
        // public doiBadge: string = "",
        // public doiLink: string = ""
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

    convertToExpression(): DataExpression
    {
        return new DataExpression(
            this.id,
            this.name,
            this.version.sourceCode,
            EXPR_LANGUAGE_LUA,
            this.comments,
            this.origin.shared,
            this.origin.creator,
            this.origin.create_unix_time_sec,
            this.version.mod_unix_time_sec,
            this.version.tags,
            [],
            null,
            this.version.doiMetadata
        );
    }
}

class DataModuleStore
{
    private _modules: Map<string, DataModule> = new Map<string, DataModule>();

    constructor()
    {
    }

    ensureModuleExists(module: DataModule)
    {
        // Add/overwrite but if we have source code, preserve it
        let existing = this._modules.get(module.id);
        if(existing)
        {
            // copy source code from existing versions if we have any
            for(let [ver, existingVersion] of existing.versions)
            {
                if(existingVersion.sourceCode.length > 0)
                {
                    let gotVer = module.versions.get(ver);
                    if(gotVer.sourceCode.length <= 0)
                    {
                        gotVer.sourceCode = existingVersion.sourceCode;
                    }
                }
            }
        }

        // Add/Overwrite
        this._modules.set(module.id, module);
    }

    ensureModuleVersionExists(module: DataModuleSpecificVersionWire)
    {
        let toStore = new DataModule(
            module.id,
            module.name,
            module.comments,
            module.origin,
            new Map<string, DataModuleVersionSourceWire>()
        );

        let existing = this._modules.get(module.id);
        if(existing)
        {
            toStore.versions = existing.versions;
        }

        // Store the version in question (keep source code if we had it before)
        let verToStore = module.version;

        let existingVer = toStore.versions.get(module.version.version);
        if(existingVer && existingVer.sourceCode.length > 0 && verToStore.sourceCode.length <= 0)
        {
            verToStore.sourceCode = existingVer.sourceCode;
        }

        toStore.versions.set(verToStore.version, verToStore);

        // Add/Overwrite
        this._modules.set(module.id, toStore);
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
            this._modules.delete(id);
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
                ver.sourceCode,
                ver.doiMetadata
                // ver.doi,
                // ver.doiBadge,
                // ver.doiLink
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

    // List of built in modules - static so other things can access it without a pointer to our instance
    private static _builtInModuleNames = ["Map", "DebugHelp"];
    // Built-in modules that are only required for export
    private static _exportedBuiltInModuleNames = ["PixliseRuntime", "CSV"];

    // List of downloaded modules as observables - we store the first one, in theory it shouldn't download
    // again but just be served from this static cache
    private static _builtInModules = DataModuleService.fetchBuiltInModules();

    private static fetchBuiltInModules(): Map<string, Observable<string>>
    {
        let result = new Map<string, Observable<string>>();
        let allMods = [...DataModuleService._builtInModuleNames, ...DataModuleService._exportedBuiltInModuleNames];
        for(let mod of allMods)
        {
            result.set(`builtin-${mod}`,
                from(
                    fetch("assets/lua/"+mod+".lua")
                ).pipe(
                    mergeMap(
                        (resp)=>
                        {
                            if(resp.status != 200)
                            {
                                throw new Error("Failed to download built-in module: "+mod+": "+resp.statusText);
                            }
                            return from(resp.text());
                        }
                    ),
                    shareReplay(1)
                )
            );
        }
        return result;
    }

    constructor(
        private _loadingSvc: LoadingIndicatorService,
        private http: HttpClient,
        private _authService: AuthenticationService,
    )
    {
/* This never seems to end up with a true value!
        // We only refresh once we have authenticated
        this._authService.isAuthenticated$.subscribe(
            (authenticated: boolean)=>
            {
                if(authenticated)
                {
                    this.refresh();
                }
            }
        );
*/
        // We only refresh once we have authenticated
        this._authService.userProfile$.subscribe(
            (profile)=>
            {
                if(profile)
                {
                    this.refresh();
                }
            }
        );
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
                // Once we receive the list of modules, we need to fetch the built-in modules and add them in
                this.getBuiltInModules().subscribe(
                    (builtInModules)=>
                    {   
                        builtInModules.forEach((module)=>
                        {
                            resp[module.id] = module;
                            resp[module.id].versions = [module.versions.get("0.0.0")];
                        });

                        this.processReceivedList(resp);
                        this._loadingSvc.remove(loadID);
                    },
                    (err)=>
                    {
                        this.processReceivedList(resp);
                        this._loadingSvc.remove(loadID);

                        console.error("Failed to refresh built-in modules!", err);
                    }
                );
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                console.error("Failed to refresh data expressions!", err);
            }
        );
    }

    public readSpecificVersionModule(module: object): DataModuleSpecificVersionWire
    {
        let wireMod = new DataModuleSpecificVersionWire(
            module["id"],
            module["name"],
            module["comments"],
            new APIObjectOrigin(
                module["origin"]["shared"],
                module["origin"]["creator"],
                module["origin"]["create_unix_time_sec"],
                module["origin"]["mod_unix_time_sec"],
            ),
            new DataModuleVersionSourceWire(
                module["version"]["version"],
                module["version"]["tags"],
                module["version"]["comments"],
                module["version"]["mod_unix_time_sec"],
                module["version"]["sourceCode"],
                new DOIMetadata(
                    module["version"]["doiMetadata"]?.["title"],
                    module["version"]["doiMetadata"]?.["creators"],
                    module["version"]["doiMetadata"]?.["description"],
                    module["version"]["doiMetadata"]?.["keywords"],
                    module["version"]["doiMetadata"]?.["notes"],
                    module["version"]["doiMetadata"]?.["relatedIdentifiers"],
                    module["version"]["doiMetadata"]?.["contributors"],
                    module["version"]["doiMetadata"]?.["references"],
                    module["version"]["doiMetadata"]?.["version"],
                    module["version"]["doiMetadata"]?.["doi"],
                    module["version"]["doiMetadata"]?.["doiBadge"],
                    module["version"]["doiMetadata"]?.["doiLink"],
                )
                // module["version"]["doi"],
                // module["version"]["doiBadge"],
                // module["version"]["doiLink"],
            ),
        );

        return wireMod;
    }

    private processReceivedList(receivedDataModules: object): void
    {
        let t0 = performance.now();

        let recvdIDs = new Set<string>(); 
        Object.entries(receivedDataModules).forEach(([id, module]: [string, object])=>
        {
            recvdIDs.add(id);

            let versMap = new Map<string, DataModuleVersionSourceWire>();
            for(let moduleVersion of module["versions"])
            {
                versMap.set(
                    moduleVersion["version"],
                    new DataModuleVersionSourceWire(
                        moduleVersion["version"],
                        moduleVersion["tags"],
                        moduleVersion["comments"],
                        moduleVersion["mod_unix_time_sec"],
                        "",
                        new DOIMetadata(
                            moduleVersion["version"]["doiMetadata"]?.["title"],
                            moduleVersion["version"]["doiMetadata"]?.["creators"],
                            moduleVersion["version"]["doiMetadata"]?.["description"],
                            moduleVersion["version"]["doiMetadata"]?.["keywords"],
                            moduleVersion["version"]["doiMetadata"]?.["notes"],
                            moduleVersion["version"]["doiMetadata"]?.["relatedIdentifiers"],
                            moduleVersion["version"]["doiMetadata"]?.["contributors"],
                            moduleVersion["version"]["doiMetadata"]?.["references"],
                            moduleVersion["version"]["doiMetadata"]?.["version"],
                            moduleVersion["version"]["doiMetadata"]?.["doi"],
                            moduleVersion["version"]["doiMetadata"]?.["doiBadge"],
                            moduleVersion["version"]["doiMetadata"]?.["doiLink"],
                        )
                        // moduleVersion["doi"],
                        // moduleVersion["doiBadge"],
                        // moduleVersion["doiLink"]
                    )
                );
            }
            
            let wireMod = new DataModule(
                module["id"],
                module["name"],
                module["comments"],
                new APIObjectOrigin(
                    module["origin"]["shared"],
                    module["origin"]["creator"],
                    module["origin"]["create_unix_time_sec"],
                    module["origin"]["mod_unix_time_sec"],
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

    updateTags(moduleId: string, tags: string[]): Observable<DataModuleSpecificVersionWire>
    {
        return this.getLatestModuleVersion(moduleId).pipe(
            tap(async (latestVersion) =>
            {
                let { sourceCode, comments } = latestVersion.version;
                let specificVersion = await this.addModuleVersion(moduleId, sourceCode, comments, tags, "patch", null, "Updating tags...").toPromise().then((resp)=>
                {
                    return resp;
                });

                this._modulesUpdated$.next();
                return specificVersion;
            })
        );

    }

    savePatchVersion(moduleId: string, sourceCode: string, comments: string, tags: string[]): Observable<DataModuleSpecificVersionWire>
    {
        return this.addModuleVersion(moduleId, sourceCode, comments, tags, "patch", null, "Saving new patch version...");
    }

    releaseMinorVersion(moduleId: string, sourceCode: string, comments: string, tags: string[], doiMetadata: DOIMetadata = null): Observable<DataModuleSpecificVersionWire>
    {
        return this.addModuleVersion(moduleId, sourceCode, comments, tags, "minor", doiMetadata, "Releasing minor version...");
    }

    releaseMajorVersion(moduleId: string, sourceCode: string, comments: string, tags: string[], doiMetadata: DOIMetadata = null): Observable<DataModuleSpecificVersionWire>
    {
        return this.addModuleVersion(moduleId, sourceCode, comments, tags, "major", doiMetadata, "Releasing major version...");
    }
    
    addModuleVersion(moduleId: string, sourceCode: string, comments: string, tags: string[], type: string = "patch", doiMetadata: DOIMetadata = null, loadingText: string = "Saving new module version..."): Observable<DataModuleSpecificVersionWire>
    {
        let loadID = this._loadingSvc.add(loadingText);
        let publishParam = doiMetadata && doiMetadata.title ? "?publish_doi=true" : "";
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_module+"/"+moduleId) + publishParam;
        let toSave = new DataModuleVersionInput(sourceCode, comments, tags, type, doiMetadata);
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

                            this._loadingSvc.remove(loadID);
                            return this.readSpecificVersionModule(recvdModule);
                        }
                        else 
                        {
                            console.error("addModuleVersion: empty response received");
                            this._loadingSvc.remove(loadID);
                            return null;
                        }
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

        if(moduleId.startsWith("builtin-"))
        {
            return this.getBuiltInModule(moduleId).pipe(
                map((module) =>
                {
                    let specificVersion = new DataModuleSpecificVersionWire(
                        module.id,
                        module.name,
                        module.comments,
                        module.origin,
                        module.versions.get("0.0.0")
                    );
                    this._modules.ensureModuleVersionExists(specificVersion);

                    return specificVersion;
                })
            );
        }
        else
        {
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
    }

    getSourceDataModule(moduleId: string): DataModule
    {
        let modules = this.getModules();
        let module = modules.find((module: DataModule) => module.id === moduleId);
        return module;
    }

    getLatestCachedModuleVersion(moduleId: string, releasedOnly: boolean = false): DataModuleVersionSourceWire
    {
        let module = this.getSourceDataModule(moduleId);
        if(!module)
        {
            return null;
        }

        let latestVersion = null;
        if(releasedOnly || module?.origin?.creator?.user_id !== this._authService?.getUserID())
        {
            let releasedVersions = Array.from(module.versions.values()).filter((version: DataModuleVersionSourceWire) => version.version.endsWith(".0"));
            latestVersion = releasedVersions.pop();
        }
        else
        {
            latestVersion = Array.from(module.versions.values()).pop();
        }

        return latestVersion;
    }

    getLatestModuleVersion(moduleId: string): Observable<DataModuleSpecificVersionWire>
    {
        let latestVersion = this.getLatestCachedModuleVersion(moduleId);
        if(!latestVersion)
        {
            return of(null);
        }

        return this.getModule(moduleId, latestVersion.version);
    }

    getModules(): DataModule[]
    {
        return this._modules.getModules();
    }

    // NOTE: these are static so the code can be shared with LuaDataQuerier. We want these to look the same
    // modules up, and not download them too often.
    static getBuiltInModuleNames(): string[]
    {
        // NOTE: we also have FuncRunner for running replay data... bit of a hack for testing
        return DataModuleService._builtInModuleNames;
    }

    static getBuiltInModuleSource(name: string): Observable<string>
    {
        let cachedModule = DataModuleService._builtInModules.get(name);
        if(cachedModule)
        {
            return cachedModule;
        }
        else
        {
            return DataModuleService.getBuiltInModuleSource(`builtin-${name}`);
        }
    }

    getBuiltInModule(id: string): Observable<DataModule>
    {
        return DataModuleService.getBuiltInModuleSource(id).pipe(
            map(sourceCode =>
            {
                let moduleName = id.replace("builtin-", "");

                return new DataModule(
                    id,
                    moduleName,
                    `Built-in module: ${moduleName}`, 
                    new APIObjectOrigin(true, new ObjectCreator("BUILTIN", "builtin"), 0, 0),
                    new Map<string, DataModuleVersionSourceWire>([
                        ["0.0.0", new DataModuleVersionSourceWire("0.0.0", [], "", 0, sourceCode)]
                    ])
                );

            })
        );
    }

    getBuiltInModules(includeExported: boolean = false): Observable<DataModule[]>
    {
        let modules = [...DataModuleService._builtInModuleNames];
        if(includeExported)
        {
            modules = [...modules, ...DataModuleService._exportedBuiltInModuleNames];
        }

        let waitFor$ = [];
        for(let module of modules)
        {
            waitFor$.push(DataModuleService.getBuiltInModuleSource(module));
        }

        return combineLatest(waitFor$).pipe(
            map(
                (builtInModules)=>
                {
                    let result: DataModule[] = [];
                    builtInModules.forEach((moduleSourceCode, i) => 
                    {
                        let sourceCode = String(moduleSourceCode);

                        let moduleName = modules[i];
                        let moduleId = `builtin-${moduleName}`;

                        let builtInModule = new DataModule(
                            moduleId,
                            moduleName,
                            `Built-in module: ${moduleName}`,
                            new APIObjectOrigin(true, new ObjectCreator("Built-In", "builtin"), 0, 0),
                            new Map<string, DataModuleVersionSourceWire>([
                                ["0.0.0", new DataModuleVersionSourceWire("0.0.0", [], "", 0, sourceCode)]
                            ])
                        );

                        result.push(builtInModule);
                    });

                    return result;
                }
            )
        );
    }
}
