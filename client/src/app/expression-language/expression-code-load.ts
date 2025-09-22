import { Observable, of, map, combineLatest } from "rxjs";
import { DataExpression } from "../generated-protos/expressions";
import { DataModuleGetReq, DataModuleGetResp } from "../generated-protos/module-msgs";
import { LoadedSources, DataModuleVersionWithRef } from "../modules/pixlisecore/models/widget-data-source";
import { EXPR_LANGUAGE_LUA } from "./expression-language";
import { APICachedDataService } from "../modules/pixlisecore/services/apicacheddata.service";

export function loadCodeForExpression(expression: DataExpression, cachedDataService: APICachedDataService): Observable<LoadedSources> {
  // Filter out crazy cases
  if (expression.sourceCode.length <= 0) {
    throw new Error(`Expression ${expression.id} source code is empty`);
  }

  if (expression.moduleReferences.length > 0 && expression.sourceLanguage != EXPR_LANGUAGE_LUA) {
    throw new Error(`Expression ${expression.id} references modules, but source language is not Lua`);
  }

  // If we are a simple loaded expression that doesn't have references, early out!
  const result = new LoadedSources(expression.sourceCode, []);
  if (expression.sourceCode.length > 0 && expression.moduleReferences.length <= 0) {
    return of(result);
  }

  // Read the module sources
  const waitModules$: Observable<DataModuleVersionWithRef>[] = [];
  for (const ref of expression.moduleReferences) {
    waitModules$.push(
      cachedDataService.getDataModule(DataModuleGetReq.create({ id: ref.moduleId, version: ref.version })).pipe(
        map((value: DataModuleGetResp) => {
          if (value.module === undefined) {
            throw new Error(`Module ${ref.moduleId} version ${ref.version} came back empty`);
          }

          const moduleVersion = value.module.versions.find(
            v => v.version?.major === ref.version?.major && v.version?.minor === ref.version?.minor && v.version?.patch === ref.version?.patch
          );
          if (!moduleVersion) {
            throw new Error(`Module (${ref.moduleId}) does not contain version: ${ref.version}`);
          }

          return { id: value.module.id, name: value.module.name, moduleVersion };
        })
      )
    );
  }

  const allResults$ = combineLatest(waitModules$);
  return allResults$.pipe(
    map((sources: unknown[]) => {
      // At this point, we should have all the source code we're interested in. Combine them!
      for (const src of sources) {
        const version = src as DataModuleVersionWithRef;
        result.modules.push(version);
      }

      return result;
    })
  );
}
