import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, defaultIfEmpty, map, mergeMap, of, switchMap, throwError } from "rxjs";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import {
  ExpressionDeleteReq,
  ExpressionDisplaySettingsGetReq,
  ExpressionDisplaySettingsWriteReq,
  ExpressionGetReq,
  ExpressionGetResp,
  ExpressionListReq,
  ExpressionWriteReq,
} from "src/app/generated-protos/expression-msgs";
import { DataExpression, ExpressionDisplaySettings } from "src/app/generated-protos/expressions";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
import { DataModuleAddVersionReq, DataModuleGetReq, DataModuleListReq, DataModuleWriteReq } from "src/app/generated-protos/module-msgs";
import { SemanticVersion, VersionField } from "src/app/generated-protos/version";
import {
  ExpressionGroupDeleteReq,
  ExpressionGroupGetReq,
  ExpressionGroupListReq,
  ExpressionGroupListResp,
  ExpressionGroupWriteReq,
} from "src/app/generated-protos/expression-group-msgs";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { ColourRamp } from "src/app/utils/colours";
import { getPredefinedExpression } from "../../../expression-language/predefined-expressions";

@Injectable({
  providedIn: "root",
})
export class ExpressionsService {
  expressionGroups$: BehaviorSubject<ExpressionGroup[]> = new BehaviorSubject<ExpressionGroup[]>([]);
  expressions$ = new BehaviorSubject<Record<string, DataExpression>>({});
  modules$ = new BehaviorSubject<Record<string, DataModule>>({});

  displaySettings$ = new BehaviorSubject<Record<string, ExpressionDisplaySettings>>({});

  lastWrittenExpressionGroupId$ = new BehaviorSubject<string>("");

  public static NewExpressionId: string = "new";

  lastSavedExpressionId: string = "";

  public static ExpressionCheckInterval: number = 1000 * 60 * 5; // 5 minutes
  lastFetchedTime: number = 0;

  constructor(
    private _snackBarService: SnackbarService,
    private _cacheService: APICachedDataService,
    private _dataService: APIDataService
  ) {}

  fetchModules() {
    this._cacheService.getModuleList(DataModuleListReq.create({})).subscribe(res => {
      this.modules$.next(res.modules);
    });
  }

  getLatestModuleVersion(id: string, isEditable: boolean = false): DataModuleVersion | null {
    let module = this.modules$.value[id];
    if (!module) {
      return null;
    }

    if (module.versions.length === 0) {
      return null;
    }

    let latestVersion = module.versions[0];
    module.versions.forEach(version => {
      let currentMajorVersion = version.version?.major || 0;
      let currentMinorVersion = version.version?.minor || 0;
      let currentPatchVersion = version.version?.patch || 0;

      let latestMajorVersion = latestVersion.version?.major || 0;
      let latestMinorVersion = latestVersion.version?.minor || 0;
      let latestPatchVersion = latestVersion.version?.patch || 0;

      // If we're an editor, show latest version, else show latest major/minor versions
      if (currentMajorVersion > latestMajorVersion || (currentMajorVersion === latestMajorVersion && currentMinorVersion > latestMinorVersion)) {
        latestVersion = version;
      } else if (
        (!isEditable || module.creator?.canEdit) &&
        currentMajorVersion === latestMajorVersion &&
        currentMinorVersion === latestMinorVersion &&
        currentPatchVersion > latestPatchVersion
      ) {
        latestVersion = version;
      }
    });

    return latestVersion;
  }

  checkIsLatestModuleVersion(id: string, version: SemanticVersion): boolean {
    let module = this.modules$.value[id];
    if (!module) {
      return false;
    }

    let latestVersion = this.getLatestModuleVersion(id);
    return latestVersion?.version?.major === version.major && latestVersion?.version?.minor === version.minor && latestVersion?.version?.patch === version.patch;
  }

  fetchModuleVersion(id: string, version: SemanticVersion | null) {
    let request = DataModuleGetReq.create({ id });

    // If version isnt specified, get the latest version
    if (version) {
      request["version"] = version;
    }
    this._dataService.sendDataModuleGetRequest(request).subscribe(res => {
      if (res.module) {
        this.modules$.next({ ...this.modules$.value, [id]: res.module });
      }
    });
  }

  fetchModuleVersionAsync(id: string, version: SemanticVersion | null): Observable<DataModuleVersion | null> {
    let request = DataModuleGetReq.create({ id });

    // If version isnt specified, get the latest version
    if (version) {
      request["version"] = version;
    }
    return this._dataService.sendDataModuleGetRequest(request).pipe(
      map(res => {
        if (res.module) {
          this.modules$.next({ ...this.modules$.value, [id]: res.module });

          let moduleVersion = res.module.versions.find(responseVersion => {
            return (
              version &&
              version.major === responseVersion.version?.major &&
              version.minor === responseVersion.version?.minor &&
              version.patch === responseVersion.version?.patch
            );
          });

          return moduleVersion || this.getLatestModuleVersion(id);
        } else {
          throw new WidgetError("Failed to fetch module version", `Module (${id}, ${version}) was not returned from the API`);
        }
      })
    );
  }

  fetchExpressions() {
    this._cacheService.getExpressionList(ExpressionListReq.create({})).subscribe(res => {
      this.expressions$.next(res.expressions);
    });
  }

  fetchExpression(id: string) {
    if (id === ExpressionsService.NewExpressionId) {
      return;
    }
    this._dataService.sendExpressionGetRequest(ExpressionGetReq.create({ id })).subscribe(res => {
      if (res.expression) {
        this.expressions$.next({ ...this.expressions$.value, [id]: res.expression });
      }
    });
  }

  fetchCachedExpressionHash(id: string): Observable<string> {
    return this.fetchCachedExpression(id).pipe(
      map(res => {
        if (!res?.expression) {
          return id;
        } else {
          let modifiedUnixSec = res.expression.modifiedUnixSec || res.expression.owner?.createdUnixSec || 0;
          return `${id}-${modifiedUnixSec}`;
        }
      })
    );
  }

  fetchCachedExpression(id: string): Observable<ExpressionGetResp> {
    if (id === ExpressionsService.NewExpressionId) {
      return of(ExpressionGetResp.create({}));
    }

    if (DataExpressionId.isPredefinedExpression(id)) {
      let predefinedExpression = getPredefinedExpression(id);
      if (predefinedExpression) {
        return of(ExpressionGetResp.create({ expression: predefinedExpression }));
      } else {
        return throwError(() => new Error(`Failed to fetch predefined expression (${id})`));
      }
    }

    return this._cacheService.getExpression(ExpressionGetReq.create({ id })).pipe(
      map(res => {
        if (res.expression) {
          this.expressions$.next({ ...this.expressions$.value, [id]: res.expression });
        }

        return res;
      })
    );
  }

  writeUserExpressionDisplaySettings(settings: ExpressionDisplaySettings) {
    this._dataService.sendExpressionDisplaySettingsWriteRequest(ExpressionDisplaySettingsWriteReq.create({ id: settings.id, displaySettings: settings })).subscribe({
      next: res => {
        if (res.displaySettings) {
          this.displaySettings$.next({ ...this.displaySettings$.value, [settings.id]: settings });
        }
      },
      error: err => {
        this._snackBarService.openError(`Failed to save expression display settings (${settings.id})`, err);
        console.error(`Failed to save expression display settings (${settings.id}): `, err);
      },
    });
  }

  getDefaultExpressionDisplaySettings(id: string): ExpressionDisplaySettings {
    let displaySettings: ExpressionDisplaySettings = {
      id,
      colourRamp: DataExpressionId.isPredefinedExpression(id) ? ColourRamp.SHADE_VIRIDIS : ColourRamp.SHADE_MAGMA,
    };

    return displaySettings;
  }

  getUserExpressionDisplaySettings(id: string): Observable<ExpressionDisplaySettings> {
    return of(this.displaySettings$.value[id]).pipe(
      mergeMap(displaySettings => {
        if (displaySettings) {
          return of(displaySettings);
        } else {
          return this._dataService.sendExpressionDisplaySettingsGetRequest(ExpressionDisplaySettingsGetReq.create({ id })).pipe(
            mergeMap(res => {
              if (res.displaySettings && res.displaySettings.colourRamp) {
                return of(res.displaySettings);
              } else {
                return of(this.getDefaultExpressionDisplaySettings(id));
              }
            }),
            defaultIfEmpty(this.getDefaultExpressionDisplaySettings(id))
          );
        }
      })
    );
  }

  checkExpressionChanged(expression: DataExpression): boolean {
    let cachedExpression = this.expressions$.value[expression.id];
    if (!cachedExpression) {
      return true;
    }

    return (
      cachedExpression.name !== expression.name ||
      cachedExpression.comments !== expression.comments ||
      cachedExpression.sourceCode.length !== expression.sourceCode.length ||
      cachedExpression.sourceLanguage !== expression.sourceLanguage ||
      cachedExpression.sourceCode !== expression.sourceCode
    );
  }

  createNewModule(expression: DataExpression) {
    this._dataService
      .sendDataModuleWriteRequest(
        DataModuleWriteReq.create({
          id: expression.id,
          name: expression.name,
          comments: expression.comments,
          initialSourceCode: expression.sourceCode,
          initialTags: expression.tags,
        })
      )
      .subscribe(res => {
        if (res.module) {
          this.lastSavedExpressionId = res.module.id;
          this.modules$.next({ ...this.modules$.value, [res.module.id]: res.module });
        }
      });
  }

  createNewModuleAsync(expression: DataExpression): Observable<DataModule> {
    return this._dataService
      .sendDataModuleWriteRequest(
        DataModuleWriteReq.create({
          id: expression.id,
          name: expression.name,
          comments: expression.comments,
          initialSourceCode: expression.sourceCode,
          initialTags: expression.tags,
        })
      )
      .pipe(
        switchMap(res => {
          if (res.module) {
            this.lastSavedExpressionId = res.module.id;
            this.modules$.next({ ...this.modules$.value, [res.module.id]: res.module });
            return of(res.module);
          } else {
            return throwError(() => new Error("Failed to create new module"));
          }
        })
      );
  }

  writeModuleVersion(id: string, moduleToWrite: DataModuleVersion, versionUpdate: VersionField) {
    this._dataService
      .sendDataModuleAddVersionRequest(
        DataModuleAddVersionReq.create({
          moduleId: id,
          versionUpdate,
          sourceCode: moduleToWrite.sourceCode,
          comments: moduleToWrite.comments,
          tags: moduleToWrite.tags,
        })
      )
      .subscribe(res => {
        if (res.module) {
          this.lastSavedExpressionId = res.module.id;
          this.modules$.next({ ...this.modules$.value, [res.module.id]: res.module });
        }
      });
  }

  writeModuleVersionAsync(id: string, moduleToWrite: DataModuleVersion, versionUpdate: VersionField): Observable<DataModule> {
    return this._dataService
      .sendDataModuleAddVersionRequest(
        DataModuleAddVersionReq.create({
          moduleId: id,
          versionUpdate,
          sourceCode: moduleToWrite.sourceCode,
          comments: moduleToWrite.comments,
          tags: moduleToWrite.tags,
        })
      )
      .pipe(
        switchMap(res => {
          if (res.module) {
            this.lastSavedExpressionId = res.module.id;
            this.modules$.next({ ...this.modules$.value, [res.module.id]: res.module });
            return of(res.module);
          } else {
            return throwError(() => new Error("Failed to write module version"));
          }
        })
      );
  }

  writeModuleFromExpression(expressionToWrite: DataExpression, versionUpdate: VersionField) {
    if (!expressionToWrite.id) {
      this.createNewModule(expressionToWrite);
    } else {
      this.writeModuleVersion(
        expressionToWrite.id,
        DataModuleVersion.create({
          sourceCode: expressionToWrite.sourceCode,
          comments: expressionToWrite.comments,
          tags: expressionToWrite.tags,
        }),
        versionUpdate
      );
    }
  }

  writeModuleFromExpressionAsync(expressionToWrite: DataExpression, versionUpdate: VersionField): Observable<DataModule> {
    if (!expressionToWrite.id) {
      return this.createNewModuleAsync(expressionToWrite);
    } else {
      return this.writeModuleVersionAsync(
        expressionToWrite.id,
        DataModuleVersion.create({
          sourceCode: expressionToWrite.sourceCode,
          comments: expressionToWrite.comments,
          tags: expressionToWrite.tags,
        }),
        versionUpdate
      );
    }
  }

  writeExpression(expressionToWrite: DataExpression) {
    let expression = DataExpression.create(expressionToWrite);

    // Remove owner to avoid overwriting
    expression.owner = undefined;

    this._dataService.sendExpressionWriteRequest(ExpressionWriteReq.create({ expression })).subscribe({
      next: res => {
        if (res.expression) {
          this.lastSavedExpressionId = res.expression.id;
          this.expressions$.next({ ...this.expressions$.value, [res.expression.id]: res.expression });
          this._cacheService.cacheExpression(ExpressionGetReq.create({ id: expression.id }), ExpressionGetResp.create({ expression: res.expression }));
          this._cacheService.exprListReqMapCacheInvalid = true;

          this._snackBarService.openSuccess(`Expression (${expression.name}) saved`);
        }
      },
      error: err => {
        this._snackBarService.openError(`Failed to save expression (${expression.name})`, err);
        console.error(`Failed to save expression (${expression.name}): `, err);
      },
    });
  }

  deleteExpression(id: string) {
    this._dataService.sendExpressionDeleteRequest(ExpressionDeleteReq.create({ id })).subscribe(res => {
      delete this.expressions$.value[id];
      this.expressions$.next(this.expressions$.value);
      this._cacheService.exprListReqMapCacheInvalid = true;
      this._cacheService.removeExpressionRequestFromCache(ExpressionGetReq.create({ id }));
    });
  }

  deleteExpressionGroup(id: string) {
    this._dataService.sendExpressionGroupDeleteRequest(ExpressionGroupDeleteReq.create({ id })).subscribe(res => {
      this.expressionGroups$.value.filter(group => group.id !== id);
      this.expressionGroups$.next(this.expressionGroups$.value);
      this._cacheService.userGroupListReqMapCacheInvalid = true;
      this.listExpressionGroups(true);
    });
  }

  getExpressionGroup(id: string, update: boolean = false): Observable<ExpressionGroup | undefined> {
    if (update) {
      this._cacheService.invalidExpressionGroupIds.add(id);
    }
    return this._cacheService.getExpressionGroup(ExpressionGroupGetReq.create({ id })).pipe(map(res => res.group));
  }

  listExpressionGroups(updateCache: boolean = false) {
    // Get a list of groups
    this._cacheService.getExpressionGroupList(ExpressionGroupListReq.create({}), updateCache).subscribe((resp: ExpressionGroupListResp) => {
      let expressionGroups = Object.values(resp.groups);
      this.expressionGroups$.next(expressionGroups);
    });
  }

  writeExpressionGroupAsync(expressionGroupToWrite: ExpressionGroup, silent: boolean = false): Observable<ExpressionGroup> {
    return this._dataService
      .sendExpressionGroupWriteRequest(
        ExpressionGroupWriteReq.create({
          group: expressionGroupToWrite,
        })
      )
      .pipe(
        map(res => {
          if (res.group) {
            if (!silent) {
              this._snackBarService.openSuccess(`Expression group (${expressionGroupToWrite.name}) saved`);
            }

            let existingGroupIndex = this.expressionGroups$.value.findIndex(group => group.id === res.group?.id);
            if (existingGroupIndex >= 0) {
              this.expressionGroups$.value[existingGroupIndex] = res.group;
            } else {
              this.expressionGroups$.value.push(res.group);
            }
            this.expressionGroups$.next(this.expressionGroups$.value);

            this._cacheService.invalidExpressionGroupIds.add(res.group.id);
            this._cacheService.getExpressionGroupList(ExpressionGroupListReq.create({}), true);
            this.lastWrittenExpressionGroupId$.next(res.group.id);

            return res.group;
          } else {
            throw new WidgetError(
              "Failed to write expression group",
              `Expression group (${expressionGroupToWrite.name}, ${expressionGroupToWrite.id}) was not returned from the API`
            );
          }
        })
      );
  }

  writeExpressionGroup(expressionGroupToWrite: ExpressionGroup) {
    this._dataService
      .sendExpressionGroupWriteRequest(
        ExpressionGroupWriteReq.create({
          group: expressionGroupToWrite,
        })
      )
      .subscribe(res => {
        if (res.group) {
          this._snackBarService.openSuccess(`Expression group (${expressionGroupToWrite.name}) saved`);

          let existingGroupIndex = this.expressionGroups$.value.findIndex(group => group.id === res.group?.id);
          if (existingGroupIndex >= 0) {
            this.expressionGroups$.value[existingGroupIndex] = res.group;
          } else {
            this.expressionGroups$.value.push(res.group);
          }
          this.expressionGroups$.next(this.expressionGroups$.value);

          this._cacheService.invalidExpressionGroupIds.add(res.group.id);
          this._cacheService.getExpressionGroupList(ExpressionGroupListReq.create({}), true);

          this.lastWrittenExpressionGroupId$.next(res.group.id);
        }
      });
  }
}
