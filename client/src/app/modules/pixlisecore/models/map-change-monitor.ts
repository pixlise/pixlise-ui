import { DataQueryResult } from "src/app/expression-language/data-values";
import { RegionDataResults } from "../pixlisecore.module";

export class MapChangeMonitor {
  private _mapsUsed = new Set<string>();

  checkResultsUseMaps(data: RegionDataResults) {
    // If we've got maps we're subscribed for, listen to the memo service for changes to those
    this._mapsUsed.clear();

    for (const result of data.queryResults) {
      const savedMaps = result.exprResult.dataRequired.filter(dataType => DataQueryResult.isDataTypeSavedMap(dataType));
      const savedMapNames = savedMaps.map(val => DataQueryResult.getDataTypeSavedMapName(val));
      for (const name of savedMapNames) {
        this._mapsUsed.add(name);
      }
    }
  }

  isMapUsed(mapName: string): boolean {
    return this._mapsUsed.has(mapName);
  }
}