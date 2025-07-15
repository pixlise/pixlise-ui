import { DataQueryResult, PMCDataValues } from "src/app/expression-language/data-values";
import { RegionSettings } from "../../roi/models/roi-region";

import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModuleVersion } from "src/app/generated-protos/modules";


// The Ids associated with one or more scans that we wish to display in a widget
export class ScanDataIds {
  constructor(
    public quantId: string,
    public roiIds: string[]
  ) {}
}

export type WidgetDataIds = Map<string, ScanDataIds>;


export type DataModuleVersionWithRef = {
  id: string;
  name: string;
  moduleVersion: DataModuleVersion;
};

export enum DataUnit {
  //UNIT_WEIGHT_PCT,
  UNIT_DEFAULT, // Was ^ but realised we don't know what the underlying unit is... the following only work if possible...
  UNIT_MMOL,
  UNIT_PPM,
}

export class DataSourceParams {
  constructor(
    public scanId: string,
    public exprId: string,
    public quantId: string,
    public roiId: string,
    public units: DataUnit = DataUnit.UNIT_DEFAULT,
    public injectedFunctions: Map<string, any> | null = null
  ) {}
}

export class WidgetError extends Error {
  constructor(
    message: string,
    public description: string
  ) {
    super(message);
    this.name = "WidgetError";
  }
}

export class RegionDataResultItem {
  constructor(
    public exprResult: DataQueryResult,
    public error: WidgetError | null,
    public warning: string,
    public expression: DataExpression | null,
    public region: RegionSettings | null,
    public query: DataSourceParams,
    public isPMCTable: boolean = true
  ) {}

  get values(): PMCDataValues {
    return this.exprResult?.resultValues;
  }

  // Returns a human-readable identity string that allows working out which query is which. For example
  // in case of an error message on a widget where multiple queries have run, we call this to say
  // this is the query that the error was generated for
  public identity(): string {
    return `scan: "${this.query.scanId}", expr: "${this.expression?.name || ""}" (${this.query.exprId}, ${this.expression?.sourceLanguage || ""}), roi: "${
      this.query.roiId
    }", quant: "${this.query.quantId}"`;
  }
}

export class RegionDataResults {
  private _hasQueryErrors: boolean = false;

  constructor(
    public queryResults: RegionDataResultItem[],
    public error: string
  ) {
    for (const item of queryResults) {
      if (item.error) {
        this._hasQueryErrors = true;
        break;
      }
    }
  }

  hasQueryErrors(): boolean {
    return this._hasQueryErrors;
  }
}

export class LoadedSources {
  constructor(
    public expressionSrc: string,
    public modules: DataModuleVersionWithRef[]
  ) {}
}
