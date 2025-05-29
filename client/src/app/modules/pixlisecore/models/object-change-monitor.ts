import { DataQueryResult } from "src/app/expression-language/data-values";
import { RegionDataResults } from "../pixlisecore.module";

export class ObjectChangeMonitor {
  private _mapsUsed = new Set<string>();
  private _roisUsed = new Set<string>();

  checkExpressionResultObjectsUsed(data: RegionDataResults) {
    // Clear anything we cared about until now, our monitoring solely depends on what was used in this latest expression run
    this._mapsUsed.clear();
    this._roisUsed.clear();

    for (const result of data.queryResults) {
      // Check ROIs
      if (result.region) {
        this._roisUsed.add(result.region.region.id);
      }

      // Check any maps that were used
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

  isROIUsed(roiId: string): boolean {
    return this._roisUsed.has(roiId);
  }
}
