import { DatePipe } from "@angular/common";
import { Observable, throwError, switchMap, map, combineLatest } from "rxjs";
import { DataExpression } from "../generated-protos/expressions";
import { DataQueryResult, PMCDataValues } from "./data-values";
import { DataQuerier, EXPR_LANGUAGE_LUA } from "./expression-language";
import { InterpreterDataSource } from "./interpreter-data-source";
import { ExpressionDataSource } from "../modules/pixlisecore/models/expression-data-source";
import { LoadedSources, WidgetDataService } from "../modules/pixlisecore/services/widget-data.service";
import { DataModuleHelpers } from "./data-module-helpers";
import { WidgetExportData } from "../modules/widget/components/widget-export-dialog/widget-export-model";
import { APICachedDataService } from "../modules/pixlisecore/services/apicacheddata.service";
import { loadCodeForExpression } from "./expression-code-load";
import { PredefinedROIID } from "../models/RegionOfInterest";
import { EnergyCalibrationService } from "../modules/pixlisecore/services/energy-calibration.service";
import { SpectrumEnergyCalibration } from "../models/BasicTypes";
import { SpectrumDataService } from "../modules/pixlisecore/services/spectrum-data.service";
import { DetectorConfigReq, DetectorConfigResp } from "../generated-protos/detector-config-msgs";

export class ExpressionExporter {
  exportExpressionCode(
    userId: string,
    expression: DataExpression,
    scanId: string,
    quantId: string,
    instrument: string,
    instrumentConfig: string,
    cachedDataService: APICachedDataService,
    spectrumDataService: SpectrumDataService,
    energyCalibrationService: EnergyCalibrationService,
  ): Observable<WidgetExportData> {
    const result: WidgetExportData = { luas: [], mds: [], csvs: [] };
    const querier = new DataQuerier(userId);

    if (expression.sourceLanguage != EXPR_LANGUAGE_LUA) {
      return throwError(() => new Error("Only expressions written in the Lua programming language can be exported"));
    }

    const req$: any[] = [loadCodeForExpression(expression, cachedDataService), energyCalibrationService.getCurrentCalibration(scanId)];

    const builtInMods = DataModuleHelpers.getExportModuleNames();
    for (const lib of builtInMods) {
      req$.push(DataModuleHelpers.getBuiltInModuleSource(lib));
    }

    req$.push(cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: instrumentConfig })));

    return combineLatest(req$).pipe(
      switchMap((resps: any[]) => {
        const sources: LoadedSources = resps[0];
        const calibration: SpectrumEnergyCalibration[] = resps[1];
        const config: DetectorConfigResp = resps[2];

        // We need a data source because we'll be executing the expression to record results
        // which are then saved in separate CSV files. This allows us to export exactly what
        // goes into an expression as opposed to exporting everything and writing some import
        // code in Lua that knows how to get the required column
        const dataSource = new ExpressionDataSource();

        return dataSource.prepare(cachedDataService, spectrumDataService, scanId, quantId, PredefinedROIID.getAllPointsForScan(scanId), calibration).pipe(
          switchMap(() => {
            const intDataSource = new InterpreterDataSource(expression.id, dataSource, dataSource, dataSource, dataSource, dataSource);

            // Built-in modules
            for (let c = 2; c < resps.length; c++) {
              const name = builtInMods[c - 2];
              const src = resps[c] as string;

              result.luas!.push({
                fileName: name + ".lua",
                subFolder: "expression",
                data: this.makeExportableModule(name, "", "", src),
              });
            }

            // Each module referenced
            for (const modRef of expression.moduleReferences) {
              let found = false;
              for (const modSrc of sources.modules) {
                if (modRef.version && modRef.moduleId === modSrc.id) {
                  found = true;
                  const verStr = `${modRef.version.major}.${modRef.version.minor}.${modRef.version.patch}`;
                  result.luas!.push({
                    fileName: modSrc.name + "-v" + this.makeSourceCompatibleVersionString(verStr) + ".lua",
                    subFolder: "expression",
                    data: this.makeExportableModule(modSrc.name, verStr, modSrc.id, modSrc.moduleVersion.sourceCode),
                  });

                  break;
                }
              }

              if (!found) {
                throw new Error("Failed to get source code for module: " + modRef.moduleId + "-v" + modRef.version);
              }
            }

            // Exporting: The source of the expression
            if (!sources.expressionSrc) {
              throw new Error("Failed to get source code for expression: " + expression.name);
            }

            result.luas!.push({
              fileName: expression.name + ".lua",
              subFolder: "expression",
              data: this.makeExportableExpression(expression, sources),
            });

            // The main file
            result.luas!.push({
              fileName: "Main.lua",
              subFolder: "expression",
              data: this.makeExportableMainFile(expression.name, scanId, quantId, instrument, config.config?.elevAngle || 0, userId),
            });

            // The readme file
            result.mds!.push({
              fileName: "README.md",
              subFolder: "expression",
              data: this.makeReadme(expression),
            });

            // Now execute the expression to record all the data it requires

            // Pass in the source and module sources separately
            const modSources = WidgetDataService.makeRunnableModules(sources.modules);

            return querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, intDataSource, true, true).pipe(
              map((queryResult: DataQueryResult) => {
                // NOTE: we save the final result in a CSV so it can be diffed against what is executed by running our exported
                // source code outside PIXLISE.
                // NOTE2: we do save the required data that the expression requested to individual CSV files. Write those to zip file
                for (const [name, data] of queryResult.recordedExpressionInputs) {
                  result.csvs!.push({
                    fileName: name + ".csv",
                    subFolder: "expression/input-data",
                    data: this.makeCSVData(data),
                  });
                }

                // Some functions called from expressions return values not maps, these are saved in one file here
                if (queryResult.recordedExpressionInputValues.size > 0) {
                  let data = "";
                  for (const [k, v] of queryResult.recordedExpressionInputValues) {
                    data += `"${k}","${v}"\n`;
                  }

                  result.csvs!.push({
                    fileName: "expression-input-values.csv",
                    subFolder: "expression/input-data",
                    data: data,
                  });
                }

                if (queryResult.isPMCTable) {
                  result.csvs!.push({
                    fileName: "PIXLISE_output.csv",
                    subFolder: "expression/output-data",
                    data: this.makeCSVData(queryResult.resultValues),
                  });
                }

                // And return the ready to be saved zip
                return result;
              })
            );
          })
        );
      })
    );
  }

  private makeReadme(expr: DataExpression): string {
    const creator = expr.owner?.creatorUser?.name || "unknown";

    const datepipe: DatePipe = new DatePipe("en-US");
    const createTime = datepipe.transform((expr.owner?.createdUnixSec || 0) * 1000, "dd-MMM-YYYY HH:mm:ss");
    const modTime = datepipe.transform(expr.modifiedUnixSec * 1000, "dd-MMM-YYYY HH:mm:ss");
    const nowTime = datepipe.transform(Date.now(), "dd-MMM-YYYY HH:mm:ss");

    return `# PIXLISE Expression: ${expr.name}

## What is this?

This is an export of the source code for a PIXLISE expression written in the
Lua programming language. You should be able to execute this by running your
Lua interpreter on the Main.lua function included in this directory.

## Where did it come from?
It was exported from PIXLISE, likely at www.pixlise.org.

### Expression details:
- Name: ${expr.name}
- Programming Language: ${expr.sourceLanguage}
- Creator: ${creator}
- Created Time: ${createTime}
- Modified Time: ${modTime}
- Exported Time: ${nowTime}
- PIXLISE id: ${expr.id}

## How to run it
Make sure you have a Lua interpreter installed and available in your terminal
or command prompt window. At time of writing, we are using Lua 5.4 and have
been able to execute this on Windows using the lua.exe downloaded from:

### Windows download
https://sourceforge.net/projects/luabinaries/files/5.4.2/Tools%20Executables/lua-5.4.2_Win64_bin.zip/download

### Linux download
https://sourceforge.net/projects/luabinaries/files/5.4.2/Tools%20Executables/lua-5.4.2_Linux54_64_bin.tar.gz/download

### Mac installation
\`brew install lua\` if you use homebrew (https://brew.sh), otherwise you may have to build from source.

To run this expression, for example on a Windows machine where the lua
executable is called lua54.exe:
\`lua54 Main.lua\`

If the expression executes successfully and returns map data, the first few rows will
be printed to stdout in CSV format (as rows of PMCs,values). The output will also be compared
(in memory) with the ouutput file exported from PIXLISE to ensure the calculations run
in this local Lua environment are the same as what PIXLISE does. See the code at the end of
Main.lua to see how to read the output data, or debug/time how long it takes, etc.

**NOTE:** If you specify a number as an argument, like:
\`lua54 Main.lua 20\`

The expression will be run 20 times (after the initial run) to calculate the average run-time.

## Export contents

The files exported are:
- \`Main.lua\` - To run the expression
- \`PixliseRuntime.lua\` - Emulates functions available in PIXLISE Lua runtime, but
re-implemented to read data from CSV files included in ./input-data
- All the built-in modules that are included in the runtime provided to any
expression in PIXLISE, eg Map
- \`${expr.name}.lua\` - The source code of the expression
- All the user-defined modules "required" by the expression
- \`./input-data/\` - Contains all CSV files required to run this expression, loaded
by code in PixliseRuntime.lua
- \`./output-data/\` - Contains last output from PIXLISE (NOTE: May not exist if
the expression did not generated valid output)
`;
  }

  // Passing src separately because it may have just been looked up, could still be empty in expr...
  private makeExportableExpression(expr: DataExpression, sources: LoadedSources): string {
    const creator = expr.owner?.creatorUser?.name || "unknown";

    const datepipe: DatePipe = new DatePipe("en-US");
    const createTime = datepipe.transform((expr.owner?.createdUnixSec || 0) * 1000, "dd-MMM-YYYY HH:mm:ss");
    const modTime = datepipe.transform(expr.modifiedUnixSec * 1000, "dd-MMM-YYYY HH:mm:ss");
    const nowTime = datepipe.transform(Date.now(), "dd-MMM-YYYY HH:mm:ss");

    let result = `-- Expression exported from PIXLISE (www.pixlise.org)
-- Details:
--     Expression name: ${expr.name}
--     Language: ${expr.sourceLanguage}
--     Creator: ${creator}
--     Created Time: ${createTime}
--     Modified Time: ${modTime}
--     Exported Time: ${nowTime}
--     PIXLISE id: ${expr.id}
`;
    if (expr.moduleReferences.length > 0) {
      result += "\n-- User module imports:\n";
    }

    // We need to put in the import statements
    for (const ref of expr.moduleReferences) {
      for (const mod of sources.modules) {
        if (ref.moduleId === mod.id && mod.moduleVersion.version) {
          const verStr = `${mod.moduleVersion.version.major}.${mod.moduleVersion.version.minor}.${mod.moduleVersion.version.patch}`;
          result += `local ${mod.name} = require("${mod.name}-v${this.makeSourceCompatibleVersionString(verStr)}")\n`;
        }
      }
    }

    result += "\n-- The expression code starts here:\n";

    result += sources.expressionSrc;

    result += "\n";
    return result;
  }

  private makeExportableModule(modName: string, modVersion: string, modID: string, modSource: string): string {
    // For now, we just put in some comments at the start
    let result = `-- Module exported from PIXLISE (www.pixlise.org)
--     Module name: ${modName}
`;
    if (modVersion) {
      result += `--     Version: ${modVersion}
`;
    }

    if (modID) {
      result += `--     PIXLISE id: ${modID}
`;
    }

    result += modSource;
    return result;
  }

  private makeExportableMainFile(exprName: string, scanId: string, quantId: string, instrument: string, elevAngle: number, userId: string): string {
    let builtInRequireLines = "";

    for (const builtInMod of DataModuleHelpers.getExportModuleNames()) {
      builtInRequireLines += `${builtInMod} = require("${builtInMod}")\n`;
    }

    return `-- The main file to execute when running a PIXLISE-exported expression

-- Allow loading local modules
package.path = package.path..";../?.lua"

scanId = "${scanId}"
quantId = "${quantId}"
maxSpectrumChannel = 4096
instrument = "${instrument}"
elevAngle = ${elevAngle}
userId = "${userId}"

-- PIXLISE runtime emulation:
-- (already imported as a built-in module below) require("PixliseRuntime")

-- Built-in module imports:
${builtInRequireLines}

-- We read the expression code in and define a function for it so we can execute it at will
function readAll(file)
    local f = assert(io.open(file, "rb"))
    local content = f:read("*all")
    f:close()
    return content
end

local TheExpression = load(readAll("${exprName}.lua"))

-- Run the expression, write the results to stdout as CSV
print("Running expression...")

local t0 = os.clock()
local r = TheExpression()
local t1 = os.clock()

print("\\nRuntime: "..(t1-t0).."sec generating "..#r[1].." values")

print("\\nResults:")
for idx, mapPMC in ipairs(r[1]) do
    print(mapPMC..","..r[2][idx])
    if idx > 10 then
        print("... not printing more rows!\\n")
        break
    end
end

-- NOTE: This could easily be modified to do something with the value, for example:
-- Map.getPMCValue(TheExpression(), 4) would return the value for PMC 4
-- Outputting as CSV:
-- writeCSV("output.csv", TheExpression())

-- Verify that the output is what we expect (output dir contains the result calculated in PIXLISE)
local expectedCSVPath = "./output-data/PIXLISE_output.csv"
local expectedValuesCSV = CSV.load(expectedCSVPath, ",", false)

local matches = 0
local count = 0
for k, pmcVal in ipairs(expectedValuesCSV) do
    local ok = true
    if tonumber(pmcVal[1]) ~= r[1][k] then
        print("Output: row "..k.." expected PMC "..pmcVal[1]..", got: "..r[1][k])
        ok = false
    end
    if tonumber(pmcVal[2]) ~= r[2][k] then
        print("Output: row "..k.." expected value "..pmcVal[2]..", got: "..r[2][k])
        ok = false
    end

    if ok then
        matches = matches+1
    end
    count = count+1
end

print("\\n"..matches.."/"..count.." rows equal expected output\\n")

local n = tonumber(arg[1])
if n ~= nil and n > 0 then
  print("Running expression "..n.." more times to get average run time...")

  local totalRuntime = 0
  for i = 1,n,1 do
      print("Running: "..i.."/"..n)
      local t0_ = os.clock()
      local r = TheExpression()
      local t1_ = os.clock()

      print("  Runtime: "..(t1_-t0_).."sec generating "..#r[1].." values")

      totalRuntime = totalRuntime + (t1_ - t0_)
  end

  print("Avg Runtime: "..(totalRuntime/n).."sec")
end
`;
  }

  private makeCSVData(pmcData: PMCDataValues): string {
    let result = "";

    for (const item of pmcData.values) {
      if (result.length > 0) {
        result += "\n";
      }

      result += item.pmc + "," + item.value;
    }
    return result;
  }

  private makeSourceCompatibleVersionString(version: string): string {
    return version.replace(/\./g, "_");
  }
}
