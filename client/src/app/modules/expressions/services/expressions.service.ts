import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { ExpressionGetReq, ExpressionGetResp, ExpressionListReq, ExpressionWriteReq } from "src/app/generated-protos/expression-msgs";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
import { DataModuleAddVersionReq, DataModuleGetReq, DataModuleListReq, DataModuleWriteReq } from "src/app/generated-protos/module-msgs";
import { SemanticVersion, VersionField } from "src/app/generated-protos/version";
import { ExpressionGroupGetReq, ExpressionGroupListReq, ExpressionGroupListResp, ExpressionGroupWriteReq } from "src/app/generated-protos/expression-group-msgs";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";

@Injectable({
  providedIn: "root",
})
export class ExpressionsService {
  expressionGroups$: BehaviorSubject<ExpressionGroup[]> = new BehaviorSubject<ExpressionGroup[]>([]);
  expressions$ = new BehaviorSubject<Record<string, DataExpression>>({});
  modules$ = new BehaviorSubject<Record<string, DataModule>>({});

  public static NewExpressionId: string = "new";

  lastSavedExpressionId: string = "";

  constructor(
    private _snackBarService: SnackbarService,
    private _cacheService: APICachedDataService,
    private _dataService: APIDataService
  ) {
    this.fetchExpressions();
    this.fetchModules();
  }

  fetchModules() {
    this._dataService.sendDataModuleListRequest(DataModuleListReq.create({})).subscribe(res => {
      this.modules$.next(res.modules);
    });
  }

  getLatestModuleVersion(id: string): DataModuleVersion | null {
    let module = this.modules$.value[id];
    if (!module) {
      return null;
    }

    return module.versions[module.versions.length - 1];
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

  fetchExpressions() {
    this._dataService.sendExpressionListRequest(ExpressionListReq.create({})).subscribe(res => {
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

  writeExpression(expressionToWrite: DataExpression) {
    let expression = DataExpression.create(expressionToWrite);

    // Remove owner to avoid overwriting
    expression.owner = undefined;

    this._dataService.sendExpressionWriteRequest(ExpressionWriteReq.create({ expression })).subscribe(res => {
      if (res.expression) {
        this.lastSavedExpressionId = res.expression.id;
        this.expressions$.next({ ...this.expressions$.value, [res.expression.id]: res.expression });
        this._cacheService.cacheExpression(ExpressionGetReq.create({ id: expression.id }), ExpressionGetResp.create({ expression: res.expression }));
      }
    });
  }

  listExpressionGroups() {
    // Get a list of groups
    this._cacheService.getExpressionGroupList(ExpressionGroupListReq.create({})).subscribe((resp: ExpressionGroupListResp) => {
      let expressionGroups = Object.values(resp.groups);
      this.expressionGroups$.next(expressionGroups);
    });
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

          this.expressionGroups$.value.push(res.group);
          this.expressionGroups$.next(this.expressionGroups$.value);

          this._cacheService.getExpressionGroupList(ExpressionGroupListReq.create({}), true);
        }
      });
  }
}
