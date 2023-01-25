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

import jsep from "jsep";
import { Observable, from } from "rxjs";
import { tap } from "rxjs/operators";
import {
    DiffractionPeakQuerierSource, HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, QuantifiedDataQuerierSource, SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues, QuantOp } from "src/app/expression-language/data-values";
import { DataSet } from "src/app/models/DataSet";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { LuaEngine } from "wasmoon";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";

const { LuaFactory } = require('wasmoon')

//import { Jsep } from 'jsep';
//const jsep = require('jsep').default;


// Helper function to run a query
export function getQuantifiedDataWithExpression(
    expression: string,
    quantSource: QuantifiedDataQuerierSource,
    pseudoSource: PseudoIntensityDataQuerierSource,
    housekeepingSource: HousekeepingDataQuerierSource,
    spectrumSource: SpectrumDataQuerierSource,
    diffractionSource: DiffractionPeakQuerierSource,
    dataset: DataSet,
    forPMCs: Set<number> = null
): PMCDataValues
{
    //console.log('  getQuantifiedDataWithExpression: "'+expression+'", forPMCs: '+(forPMCs===null ? 'All' : forPMCs.size));
    let query = new DataQuerier(quantSource, pseudoSource, housekeepingSource, spectrumSource, diffractionSource, dataset);
    let queryResult = query.runQuery(expression);

    if(forPMCs === null)
    {
        return queryResult;
    }

    // Build a new result only containing PMCs specified
    let resultValues: PMCDataValue[] = [];
    for(let item of queryResult.values)
    {
        if(forPMCs.has(item.pmc))
        {
            resultValues.push(item);
        }
    }

    return PMCDataValues.makeWithValues(resultValues);
}

export class ExpressionParts
{
    constructor(public variableNames: string[], public variableExpressions: string[], public variableLines: number[], public expressionLine: string)
    {
    }
}

export class DataQuerier
{
    private _runningExpression: string = "";
    private static _lua = null;
    private static _context: DataQuerier = null;

    constructor(
        public quantDataSource: QuantifiedDataQuerierSource,
        public pseudoDataSource: PseudoIntensityDataQuerierSource,
        public housekeepingDataSource: HousekeepingDataQuerierSource,
        public spectrumDataSource: SpectrumDataQuerierSource,
        public diffractionSource: DiffractionPeakQuerierSource,
        private _dataset: DataSet
    )
    {
    }

    public static initLua(): Observable<void>
    {
        // NOTE: WE NEVER DO THIS:
        // DataQuerier._lua.global.close()
        // DO WE NEED TO???

        console.log("Initializing Lua...");
        return new Observable<void>(
            (observer)=>
            {
                // Initialize a new lua environment factory
                // Pass our hosted wasm file location in here
/*
                let wasmURI = EnvConfigurationInitService.appConfig.name == "prod" ? "www" : EnvConfigurationInitService.appConfig.name;
                wasmURI = "https://"+wasmURI+"."+EnvConfigurationInitService.appConfig.appDomain;
                wasmURI += "/assets/glue.wasm";*/
                let wasmURI = "https://dev.pixlise.org/assets/glue.wasm";
                console.log("Loading WASM from: "+wasmURI);

                const factory = new LuaFactory(wasmURI);
                let lua = factory.createEngine();
                lua.then((eng)=>{
                    console.log("Lua Engine created...");

                    // Save this for later
                    DataQuerier._lua = eng;

                    // Set up constants/functions that can be accessed from Lua
                    DataQuerier.setupLua();

                    console.log("Lua Engine ready...");
                    observer.complete();
                })
                .catch((err)=>{
                    console.error(err);
                    observer.error(err);
                });
            }
        );
/*
        // Create a standalone lua environment from the factory
        return from(factory.createEngine())
        .pipe(
            tap(
                (lua)=>
                {
                    DataQuerier._lua = lua;
                }
            )
        );*/
    }

    private static setupLua(): void
    {
        // Implementing new functions for Lua to deal with our maps/operators
        DataQuerier._lua.global.set("add", DataQuerier.LaddMap);
        DataQuerier._lua.global.set("sub", DataQuerier.LsubtractMap);
        DataQuerier._lua.global.set("mult", DataQuerier.LmultiplyMap);
        DataQuerier._lua.global.set("div", DataQuerier.LdivideMap);
        DataQuerier._lua.global.set("under", DataQuerier.LunderMap);
        DataQuerier._lua.global.set("over", DataQuerier.LoverMap);
        DataQuerier._lua.global.set("under_undef", DataQuerier.LunderUndefinedMap);
        DataQuerier._lua.global.set("over_undef", DataQuerier.LoverUndefinedMap);
        DataQuerier._lua.global.set("avg", DataQuerier.LavgMap);
        DataQuerier._lua.global.set("min", DataQuerier.LminMap);
        DataQuerier._lua.global.set("max", DataQuerier.LmaxMap);

        // Implementing original expression language
        DataQuerier._lua.global.set("element", DataQuerier.LreadElement);
        DataQuerier._lua.global.set("elementSum", DataQuerier.LreadElementSum);
        DataQuerier._lua.global.set("data", DataQuerier.LreadDataColumn);
        DataQuerier._lua.global.set("spectrum", DataQuerier.LreadSpectrum);
        DataQuerier._lua.global.set("spectrumDiff", DataQuerier.LreadSpectrumDiff);
        DataQuerier._lua.global.set("pseudo", DataQuerier.LreadPseudoIntensity);
        DataQuerier._lua.global.set("housekeeping", DataQuerier.LreadHouseKeeping);
        DataQuerier._lua.global.set("diffractionPeaks", DataQuerier.LreadDiffractionPeaks);
        DataQuerier._lua.global.set("roughness", DataQuerier.LreadRoughness);
        DataQuerier._lua.global.set("position", DataQuerier.LreadPosition);
        DataQuerier._lua.global.set("makeMap", DataQuerier.LmakeMap);
        DataQuerier._lua.global.set("normalize", DataQuerier.LnormalizeMap);
        DataQuerier._lua.global.set("threshold", DataQuerier.LthresholdMap);
        DataQuerier._lua.global.set("pow", DataQuerier.LpowMap);
        DataQuerier._lua.global.set("atomicMass", (symbol)=>
        {
            return periodicTableDB.getMolecularMass(symbol);
        });
        DataQuerier._lua.global.set("sin", DataQuerier.LsinMap);
        DataQuerier._lua.global.set("cos", DataQuerier.LcosMap);
        DataQuerier._lua.global.set("tan", DataQuerier.LtanMap);
        DataQuerier._lua.global.set("asin", DataQuerier.LasinMap);
        DataQuerier._lua.global.set("acos", DataQuerier.LacosMap);
        DataQuerier._lua.global.set("atan", DataQuerier.LatanMap);
        DataQuerier._lua.global.set("exp", DataQuerier.LexpMap);
        DataQuerier._lua.global.set("ln", DataQuerier.LlnMap);
    }

    private static LaddMap(left, right)
    {
        return DataQuerier.mapBinaryOp(QuantOp.ADD, left, right);
    }
    private static LsubtractMap(left, right)
    {
        return DataQuerier.mapBinaryOp(QuantOp.SUBTRACT, left, right);
    }
    private static LmultiplyMap(left, right)
    {
        return DataQuerier.mapBinaryOp(QuantOp.MULTIPLY, left, right);
    }
    private static LdivideMap(left, right)
    {
        return DataQuerier.mapBinaryOp(QuantOp.DIVIDE, left, right);
    }
    private static LunderMap(left, right)
    {
        return DataQuerier._context.mapOperation(false, true, "under", [left, right]);
    }
    private static LoverMap(left, right)
    {
        return DataQuerier._context.mapOperation(false, true, "over", [left, right]);
    }
    private static LunderUndefinedMap(left, right)
    {
        return DataQuerier._context.mapOperation(false, true, "under_undef", [left, right]);
    }
    private static LoverUndefinedMap(left, right)
    {
        return DataQuerier._context.mapOperation(false, true, "over_undef", [left, right]);
    }
    private static LavgMap(left, right)
    {
        return DataQuerier._context.mapOperation(true, false, "avg", [left, right]);
    }
    private static LminMap(left, right)
    {
        return DataQuerier._context.mapOperation(true, true, "min", [left, right]);
    }
    private static LmaxMap(left, right)
    {
        return DataQuerier._context.mapOperation(true, true, "max", [left, right]);
    }
    private static LreadElement(symbol, column, detector)
    {
        return DataQuerier._context.readElement([symbol, column, detector]);
    }
    private static LreadElementSum(column, detector)
    {
        return DataQuerier._context.readElementSum([column, detector]);
    }
    private static LreadDataColumn(column, detector)
    {
        return DataQuerier._context.readMap([column, detector]);
    }
    private static LreadSpectrum(startChannel, endChannel, detector)
    {
        return DataQuerier._context.readSpectrum([startChannel, endChannel, detector]);
    }
    private static LreadSpectrumDiff(startChannel, endChannel, op)
    {
        return DataQuerier._context.readSpectrumDifferences([startChannel, endChannel, op]);
    }
    private static LreadPseudoIntensity(elem)
    {
        return DataQuerier._context.readPseudoIntensity([elem]);
    }
    private static LreadHouseKeeping(column)
    {
        return DataQuerier._context.readHousekeepingData([column]);
    }
    private static LreadDiffractionPeaks(eVstart, eVend)
    {
        return DataQuerier._context.readDiffractionData([eVstart, eVend])
    }
    private static LreadRoughness()
    {
        return DataQuerier._context.readRoughnessData([]);
    }
    private static LreadPosition(axis)
    {
        return DataQuerier._context.readPosition([axis]);
    }
    private static LmakeMap(value)
    {
        return DataQuerier._context.makeMap([value]);
    }
    private static LnormalizeMap(m)
    {
        return DataQuerier._context.normalizeMap([m]);
    }
    private static LthresholdMap(m)
    {
        return DataQuerier._context.thresholdMap([m]);
    }
    private static LpowMap(left, right)
    {
        return DataQuerier._context.pow([left, right]);
    }
    private static LsinMap(arg)
    {
        return DataQuerier._context.mathFunction("sin", arg);
    }
    private static LcosMap(arg)
    {
        return DataQuerier._context.mathFunction("cos", arg);
    }
    private static LtanMap(arg)
    {
        return DataQuerier._context.mathFunction("tan", arg);
    }
    private static LasinMap(arg)
    {
        return DataQuerier._context.mathFunction("asin", arg);
    }
    private static LacosMap(arg)
    {
        return DataQuerier._context.mathFunction("acos", arg);
    }
    private static LatanMap(arg)
    {
        return DataQuerier._context.mathFunction("atan", arg);
    }
    private static LexpMap(arg)
    {
        return DataQuerier._context.mathFunction("exp", arg);
    }
    private static LlnMap(arg)
    {
        return DataQuerier._context.mathFunction("ln", arg);
    }

    // Used as helpers by the above function calls
    private static mapBinaryOp(op: QuantOp, left, right)
    {
        if(left instanceof PMCDataValues && typeof right == "number")
        {
            return left.operationWithScalar(op, right, false); // false because: map <op> number
        }
        else if(right instanceof PMCDataValues && typeof left == "number")
        {
            return right.operationWithScalar(op, left, true); // true because: number <op> map
        }
        else if(left instanceof PMCDataValues && right instanceof PMCDataValues)
        {
            return left.operationWithMap(op, right);
        }

        throw new Error("Unable to perform operation: "+op+" on parameters passed");
    }


// See: https://github.com/ceifa/wasmoon
/*
    // Set a JS function to be a global lua function
    lua.global.set('sum', (x, y) => x + y)
    // Run a lua string
    await lua.doString(`
    print(sum(10, 10))
    function multiply(x, y)
        return x * y
    end
    `)
    // Get a global lua function as a JS function
    const multiply = lua.global.get('multiply')
    console.log(multiply(10, 10))
*/

    public runQuery(expression: string): PMCDataValues
    {
        // If it's a LUA script, run it directly here
        if(expression.startsWith("LUA"))
        {
            // Trim the marker
            expression = expression.substring(3);

            // Set context for this run
            DataQuerier._context = this;

            let result = null;
            try
            {
                // Run a lua string
                result = DataQuerier._lua.doStringSync(expression)
            }
            catch (err)
            {
                console.error(err);
                throw new Error(err);
            }
            finally
            {
                // Clear the context, don't want any Lua code to execute with us around any more
                DataQuerier._context = null;

                // Close the lua environment, so it can be freed
                //DataQuerier._lua.global.close()
            }

            if(result)
            {
                return result;
            }

            throw new Error("Expression: "+expression+" did not complete");
        }

        // It's an old-style expression, run it the old way...

        // Parse the expression
        // We do this in 2 stages, first we allow variables to be defined, then we expect to end in a line that has an expression in it
        // Blank lines and // comments are ignored
        let exprParts = DataQuerier.breakExpressionIntoParts(expression);

        let variableLookup = this.parseVariables(exprParts);

        let result = this.parseExpression(exprParts.expressionLine, variableLookup);
        if(result instanceof PMCDataValues)
        {
            return result as PMCDataValues;
        }

        throw new Error("Expression: "+expression+" did not result in usable map data. Result was: "+result);
    }

    private parseExpression(expression: string, variableLookup: Map<string, string | number | PMCDataValues>): any
    {
        // Save this expression in a local var so anything printing error msgs can reference it
        this._runningExpression = "\""+expression+"\"";
        let parseTree = jsep(expression);
        return this.parseExpressionNode(parseTree, variableLookup);
    }

    public static breakExpressionIntoParts(expression: string): ExpressionParts
    {
        let lines = expression.split("\n");
        let variableNames: string[] = [];
        let variableExpressions: string[] = [];
        let variableLines: number[] = [];

        let expressionLine: string = "";

        for(let c = 0; c < lines.length; c++)
        {
            let line = lines[c];

            // Strip comments
            let commentPos = line.indexOf("//");
            if(commentPos > -1)
            {
                line = line.substring(0, commentPos);
            }

            // Strip whitespace at start
            line = line.trimStart();

            if(line.length <= 0)
            {
                continue;
            }

            let equalPos = line.indexOf("=");

            // We expect the first block of lines to either have = or be blank (effectively after comments+whitespace stripped)
            // When we find lines that don't have an = we concat them onto one line assuming it's all part of the expression. If
            // we find another = that's an error. Finally the concated expression is run, using the variables detected above it

            if(equalPos > -1)
            {
                if(expressionLine.length > 0)
                {
                    // We found line(s) that didn't contain = then they did again
                    throw new Error("Line "+(c+1)+": Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability.");
                }

                variableLines.push(c+1);

                let varName = line.substring(0, equalPos).trim();
                if(!DataQuerier.isValidVariableName(varName))
                {
                    throw new Error("Line "+(c+1)+": Invalid variable name definition: \""+varName+"\"");
                }

                variableNames.push(varName);
                variableExpressions.push(line.substring(equalPos+1).trim());
            }
            else
            {
                // Append to the expression line
                if(expressionLine.length > 0)
                {
                    expressionLine += " ";
                }

                expressionLine += line;
            }
        }

        if(expressionLine.length <= 0)
        {
            throw new Error("No usable expression found");
        }

        return new ExpressionParts(variableNames, variableExpressions, variableLines, expressionLine);
    }

    public static isValidVariableName(name: string): boolean
    {
        if(name.length <= 0 || name.length >= 50)
        {
            return false;
        }

        // Should only contain the valid characters in a var name
        let matched = name.match(/^[_a-zA-Z][_a-zA-Z0-9]*$/);
        if(!matched)
        {
            return false;
        }

        return matched.length == 1 && matched[0] === name;
    }

    private parseVariables(parts: ExpressionParts): Map<string, string | number | PMCDataValues>
    {
        let varLookup: Map<string, string | number | PMCDataValues> = new Map<string, string | number | PMCDataValues>();

        // Run through all of them, parse each line in order
        for(let c = 0; c < parts.variableNames.length; c++)
        {
            try
            {
                let result = this.parseExpression(parts.variableExpressions[c], varLookup);

                if(result instanceof PMCDataValues || typeof result == "number" || typeof result == "string")
                {
                    varLookup.set(parts.variableNames[c], result);
                }
                else
                {
                    throw new Error("Unexpected result for variable");
                }
            }
            catch (error)
            {
                let errorMsg = error.message;
                throw new Error("Line "+parts.variableLines[c]+": "+errorMsg);
            }
        }

        return varLookup;
    }

    private parseExpressionNode(expressionParseTreeNode: object, variableLookup: Map<string, string | number | PMCDataValues>): any
    {
        let expType = expressionParseTreeNode["type"];
        if(expType == "BinaryExpression")
        {
            return this.binaryExpression(expressionParseTreeNode, variableLookup);
        }
        else if(expType == "CallExpression")
        {
            return this.callExpression(expressionParseTreeNode, variableLookup);
        }
        else if(expType == "UnaryExpression")
        {
            return this.unaryExpression(expressionParseTreeNode);
        }
        else if(expType == "Literal")
        {
            return expressionParseTreeNode["value"];
        }
        else if(expType == "Identifier")
        {
            // Look up the value in our var lookup
            let varName = expressionParseTreeNode["name"];
            let val = variableLookup.get(varName);
            if(val == undefined)
            {
                throw new Error("Unknown identifier: \""+varName+"\"");
            }
            return val;
        }

        throw new Error("Unexpected: "+expressionParseTreeNode["type"]);
    }

    private unaryExpression(expressionParseTreeNode: object): number
    {
        let op = this.getEnumForOp(expressionParseTreeNode["operator"]);
        let prefix = (expressionParseTreeNode["prefix"]);
        let arg = expressionParseTreeNode["argument"];

        // We only support unary expressions of negative numbers...
        if(op == QuantOp.SUBTRACT && prefix && arg)
        {
            return -1*arg["value"];
        }
        else if(op == QuantOp.ADD && prefix && arg)
        {
            return arg["value"];
        }

        throw new Error("Unexpected unary type: "+expressionParseTreeNode["operator"]+" prefix: "+prefix+" in: "+this._runningExpression);
    }

    private binaryExpression(expressionParseTreeNode: object, variableLookup: Map<string, string | number | PMCDataValues>): any
    {
        // Parse left, right, then combine them
        let left = this.parseExpressionNode(expressionParseTreeNode["left"], variableLookup);
        let right = this.parseExpressionNode(expressionParseTreeNode["right"], variableLookup);

        let op = this.getEnumForOp(expressionParseTreeNode["operator"]);

        if(typeof left == "number" && typeof right == "number")
        {
            return this.binaryScalarOp(op, left, right);
        }
        else if(left instanceof PMCDataValues && typeof right == "number")
        {
            return left.operationWithScalar(op, right, false); // false because: map <op> number
        }
        else if(right instanceof PMCDataValues && typeof left == "number")
        {
            return right.operationWithScalar(op, left, true); // true because: number <op> map
        }
        else if(left instanceof PMCDataValues && right instanceof PMCDataValues)
        {
            return left.operationWithMap(op, right);
        }
        else if(typeof left == "string" && typeof right == "string")
        {
            return this.addString(op, left, right);
        }

        throw new Error("Failed to calculate operation: "+expressionParseTreeNode["operator"]+" in: "+this._runningExpression);
    }

    private binaryScalarOp(operation: QuantOp, left: number, right: number): number
    {
        switch (operation)
        {
        case QuantOp.ADD:
            return left+right;
            break;
        case QuantOp.SUBTRACT:
            return left-right;
            break;
        case QuantOp.MULTIPLY:
            return left*right;
            break;
        case QuantOp.DIVIDE:
            return left/right;
            break;
        }

        throw new Error("Failed to apply operation: "+operation+" to 2 scalars in: "+this._runningExpression);
    }

    private addString(operation: QuantOp, left: string, right: string): string
    {
        switch (operation)
        {
        case QuantOp.ADD:
            return left+right;
            break;
        }

        throw new Error("Failed to apply operation: "+operation+" to 2 strings in: "+this._runningExpression);
    }

    //ALLOWED_CALLS = ['normalize', 'data', 'min', 'max', 'threshold'];
    //CALLER_PARAMS_REQUIRED = [1, 2, 2, 2, 3];
    private callExpression(expressionParseTreeNode: object, variableLookup: Map<string, string | number | PMCDataValues>): any
    {
        let callee = expressionParseTreeNode["callee"]["name"];
        /*
        let calleeIdx = this.ALLOWED_CALLS.indexOf(callee);
        if(calleeIdx == -1)
        {
            throw new Error('Unknown callee: '+callee+' in: '+JSON.stringify(expressionParseTreeNode));
        }

        let expectedParamCount = this.CALLER_PARAMS_REQUIRED[calleeIdx];
        if(expressionParseTreeNode['arguments'].length != expectedParamCount)
        {
            throw new Error(callee+' expects '+expectedParamCount+' parameter in: '+JSON.stringify(expressionParseTreeNode));
        }
*/
        // Parse each argument
        let args = [];
        for(let arg of expressionParseTreeNode["arguments"])
        {
            args.push(this.parseExpressionNode(arg, variableLookup));
        }

        // It's a valid call & right param count, now run it
        if(callee == "normalize")
        {
            return this.normalizeMap(args);
        }
        else if(callee == "threshold")
        {
            return this.thresholdMap(args);
        }
        else if(callee == "pow")
        {
            return this.pow(args);
        }
        else if(callee == "data")
        {
            return this.readMap(args);
        }
        else if(callee == "spectrum")
        {
            return this.readSpectrum(args);
        }
        else if(callee == "spectrumDiff")
        {
            return this.readSpectrumDifferences(args);
        }
        else if(callee == "element")
        {
            return this.readElement(args);
        }
        else if(callee == "elementSum")
        {
            return this.readElementSum(args);
        }
        else if(callee == "pseudo")
        {
            return this.readPseudoIntensity(args);
        }
        else if(callee == "housekeeping")
        {
            return this.readHousekeepingData(args);
        }
        else if(callee == "diffractionPeaks")
        {
            return this.readDiffractionData(args);
        }
        else if(callee == "roughness")
        {
            return this.readRoughnessData(args);
        }
        else if(callee == "position")
        {
            return this.readPosition(args);
        }
        else if(callee == "under" || callee == "over" || callee == "under_undef" || callee == "over_undef")
        {
            return this.mapOperation(false, true, callee, args);
        }
        else if(callee == "avg")
        {
            return this.mapOperation(true, false, callee, args);
        }
        else if(callee == "min" || callee == "max")
        {
            return this.mapOperation(true, true, callee, args);
        }
        else if(callee == "makeMap")
        {
            return this.makeMap(args);
        }
        else if(callee == "sin" || callee == "cos" || callee == "tan" || callee == "asin" || callee == "acos" || callee == "atan")
        {
            return this.mathFunction(callee, args);
        }
        else if(callee == "exp" || callee == "ln")
        {
            return this.mathFunction(callee, args);
        }
        else if(callee == "atomicMass")
        {
            return this.atomicMass(args);
        }

        throw new Error("Unknown callee: "+callee+" in: "+this._runningExpression);

        // Shouldn't get here really... we checked it's a valid callee above!
        //throw new Error('Unreachable error... in: '+JSON.stringify(expressionParseTreeNode));
    }

    // Expects a PMCDataValues
    private normalizeMap(argList): PMCDataValues
    {
        if(argList.length != 1 || !(argList[0] instanceof PMCDataValues))
        {
            throw new Error("normalize() expects 1 map parameter. Received: "+argList.length+" parameters");
        }

        // Take the map and normalize its values, returning them that way
        return argList[0].normalize();
    }

    // Expects PMCDataValues, scalar, scalar
    private thresholdMap(argList): PMCDataValues
    {
        if(argList.length != 3 || !(argList[0] instanceof PMCDataValues) || (typeof argList[1] != "number") || (typeof argList[2] != "number"))
        {
            throw new Error("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: "+argList.length+" parameters");
        }

        return argList[0].threshold(argList[1], argList[2]);
    }

    // Expects PMCDataValues or scalar, scalar, returns scalar or PMCDataValues
    private pow(argList): any
    {
        if(argList.length != 2)
        {
            throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: "+argList.length+" parameters");
        }

        if(typeof argList[1] != "number")
        {
            throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg1 was wrong type");
        }

        if(typeof argList[0] == "number")
        {
            return Math.pow(argList[0], argList[1]);
        }

        if(argList[0] instanceof PMCDataValues)
        {
            // Input is a map of radians, we run the trig function for each value and return a map of the same size
            return argList[0].mathFuncWithArg(Math.pow, argList[1]);
        }

        throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg0 was wrong type");
    }

    ////////////////////////////////////// Calling Quant Data Source //////////////////////////////////////
    // Expects: Fe, %, A for example
    // Optionally supports mmol conversion for % values by specifying %-as-mmol
    private readElement(argList): PMCDataValues
    {
        if(argList.length != 3 || (typeof argList[0] != "string") || (typeof argList[1] != "string") || (typeof argList[2] != "string"))
        {
            throw new Error("element() expression expects 3 parameters: element, datatype, detector Id. Received: "+JSON.stringify(argList));
        }

        if(!this.quantDataSource)
        {
            throw new Error("element() expression failed, no quantification data loaded");
        }

        // Work out the column, and if we have mmol requested, it should only work for %
        let col = argList[1];
        let asMmol = false;

        if(col == "%-as-mmol")
        {
            col = "%";
            asMmol = true;
        }

        let dataLabel = argList[0]+"_"+col;
        let result = this.quantDataSource.getQuantifiedDataForDetector(argList[2], dataLabel);

        if(asMmol)
        {
            result = this.convertToMmol(argList[0], result);
        }

        return result;
    }

    private convertToMmol(formula: string, values: PMCDataValues): PMCDataValues
    {
        let result: PMCDataValue[] = [];

        let conversion = 1;

        /* REMOVED Because this was a more special case, see the new FeO-T workaround below
        // Also note, FeO-T can be converted to Fe2O3 by multiplying by 1.111 according to email from Balz Kamber
        if(formula == "FeO-T")
        {
            conversion = 1.111;
            formula = "Fe2O3";
        }
*/
        /* Modified because it now turns out we have other special cases such as FeCO3-T, so lets make it generic...
        if(formula == "FeO-T")
        {
            // We don't know what flavour of FeO we're dealing with, just the total. Mike discovered that the above 1.111 conversion
            // was giving back values 2x as large as expected. Just treat it like FeO
            formula = "FeO";
        }
*/

        // We are dealing with a "total" quantification of something, eg FeO, so here we just treat it like the element being quantified!
        if(formula.endsWith("-T"))
        {
            formula = formula.substring(0, formula.length-2);
        }

        let mass = periodicTableDB.getMolecularMass(formula);
        if(mass > 0)
        {
            // Success parsing it, work out the conversion factor:
            // This came from an email from Joel Hurowitz:
            // weight % (eg 30%) -> decimal (div by 100)
            // divide by mass
            // mult by 1000 to give mol/kg
            conversion *= 10/mass; // AKA: 1/100/mass*1000;
        }

        for(let c = 0; c < values.values.length; c++)
        {
            let valToSave = 0;
            if(!values.values[c].isUndefined)
            {
                valToSave = values.values[c].value*conversion;
            }

            result.push(new PMCDataValue(values.values[c].pmc, valToSave, values.values[c].isUndefined));
        }

        return PMCDataValues.makeWithValues(result);
    }

    // Expects: %, A for example, calls element() for each element there is, and returns the sum of the values
    private readElementSum(argList): PMCDataValues
    {
        if(argList.length != 2 || (typeof argList[0] != "string") || (typeof argList[1] != "string"))
        {
            throw new Error("elementSum() expression expects 2 parameters: datatype, detector Id. Received: "+JSON.stringify(argList));
        }

        if(!this.quantDataSource)
        {
            throw new Error("elementSum() expression failed, no quantification data loaded");
        }

        let result: PMCDataValues = null;
        let allElems = this.quantDataSource.getElementList();

        // NOTE we want only the "most complex" states, these are the ones that were in the quant file, and the ones we should be adding
        let elems = periodicTableDB.getOnlyMostComplexStates(allElems);

        for(let elem of elems)
        {
            let dataLabel = elem+"_"+argList[0];
            let vals = this.quantDataSource.getQuantifiedDataForDetector(argList[1], dataLabel);

            if(!result)
            {
                result = vals;
            }
            else
            {
                result = result.operationWithMap(QuantOp.ADD, vals);
            }
        }
        
        return result;
    }

    // Expects: chisq, A for example
    private readMap(argList): PMCDataValues
    {
        if(argList.length != 2 || (typeof argList[0] != "string") || (typeof argList[1] != "string"))
        {
            throw new Error("data() expression expects 2 parameters: quantified column name, detector Id. Received: "+argList.length+" parameters");
        }

        if(!this.quantDataSource)
        {
            throw new Error("data() expression failed, no quantification data loaded");
        }

        return this.quantDataSource.getQuantifiedDataForDetector(argList[1], argList[0]);
    }

    // Expects: 1, 2, A|Normal for example (eV start, eV end, A|Normal or B|Normal or A|Dwell)
    private readSpectrum(argList): PMCDataValues
    {
        if(
            argList.length != 3 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number") ||
            (typeof argList[2] != "string")
        )
        {
            throw new Error("spectrum() expression expects 3 parameters: start channel, end channel, detector. Received: "+argList.length+" parameters");
        }

        if(!this.spectrumDataSource)
        {
            throw new Error("spectrum() expression failed, no data loaded");
        }

        return this.spectrumDataSource.getSpectrumRangeMapData(argList[0], argList[1], argList[2]); // TODO: supply a formula here to describe how to query the spectrum, eg A, or A+B, or MAX(A,B)
    }

    // Expects: 1, 2, 'sum'|'max'
    private readSpectrumDifferences(argList): PMCDataValues
    {
        if(
            argList.length != 3 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number") ||
            (typeof argList[2] != "string")
        )
        {
            throw new Error("spectrumDiff() expression expects 3 parameters: start channel, end channel, \"sum\"|\"max\". Received: "+argList.length+" parameters");
        }

        if(!this.spectrumDataSource)
        {
            throw new Error("spectrumDiff() expression failed, no data loaded");
        }

        // Validate the string
        let sumOrMax = false;
        if(argList[2] == "sum")
        {
            sumOrMax = true;
        }
        else if(argList[2] == "max")
        {
            sumOrMax = false;
        }
        else
        {
            throw new Error("spectrumDiff() expected param 3 to be \"sum\" or \"max\", got: "+argList[2]);
        }

        return this.spectrumDataSource.getSpectrumDifferences(argList[0], argList[1], sumOrMax);
    }

    ////////////////////////////////////// Calling Diffraction Data Source //////////////////////////////////////
    // Expects: 1, 2 for example (eV start, eV end)
    private readDiffractionData(argList): PMCDataValues
    {
        if(
            argList.length != 2 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number")
        )
        {
            throw new Error("diffractionPeaks() expression expects 2 parameters: start channel, end channel. Received: "+argList.length+" parameters");
        }

        if(!this.diffractionSource)
        {
            throw new Error("diffractionPeaks() expression failed, no diffraction data loaded");
        }

        return this.diffractionSource.getDiffractionPeakEffectData(argList[0], argList[1], this._dataset);
    }

    // Expects: NO parameters
    private readRoughnessData(argList): PMCDataValues
    {
        if(argList.length != 0)
        {
            throw new Error("roughness() expression expects NO parameters. Received: "+argList.length+" parameters");
        }

        if(!this.diffractionSource)
        {
            throw new Error("roughness() expression failed, no diffraction data loaded");
        }

        return this.diffractionSource.getRoughnessData(this._dataset);
    }

    // Expects: NO parameters
    private readPosition(argList): PMCDataValues
    {
        if(argList.length != 1 && argList[0] != "x" && argList[0] != "y" && argList[0] != "z")
        {
            throw new Error("position() expression expects 1 parameter: x, y or z");
        }

        if(!this.housekeepingDataSource)
        {
            throw new Error("position() expression failed, no housekeeping data loaded");
        }

        return this.housekeepingDataSource.getPositionData(argList[0]);
    }

    // Expects: 1 parameter, the values to put into each map cell
    private makeMap(argList): PMCDataValues
    {
        if(
            argList.length != 1 || // only 1 param
            (typeof argList[0] != "number") // must be a number
            )
        {
            throw new Error("makeMap() expression expects 1 parameter: map value");
        }

        if(!this.quantDataSource)
        {
            throw new Error("makeMap() expression failed, failed to determine map dimensions");
        }

        let quantifiedPMCs = this.quantDataSource.getPMCList();
        let mapValue = argList[0];

        let values: PMCDataValue[] = [];

        for(let pmc of quantifiedPMCs)
        {
            values.push(
                new PMCDataValue(
                    pmc,
                    mapValue
                )
            );
        }

        return PMCDataValues.makeWithValues(values);
    }

    ////////////////////////////////////// Calling Trig Functions //////////////////////////////////////
    // Expects: Function name, and arg of either PMCDataValues or scalar
    // Returns: PMCDataValues or scalar depending on args
    private mathFunction(funcName: string, argList): any
    {
        // Expect the right one(s)
        let trigFunctionNames = ["sin", "cos", "tan", "asin", "acos", "atan", "exp", "ln"];
        let trigFunctions = [Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan, Math.exp, Math.log];
        let trigFuncIdx = trigFunctionNames.indexOf(funcName);
        if(trigFuncIdx < 0)
        {
            throw new Error("trigFunction() expression unknown function: "+funcName);
        }
 
        if(argList.length != 1)
        {
            throw new Error(funcName+"() expression expects 1 parameter: scalar (radians) OR map of radians");
        }

        let trigFunc = trigFunctions[trigFuncIdx];

        // If argument is a scalar, we simply call the trig function and return the result as a single value
        // this is useful for things like makeMap(sin(0.5)) where we want a whole map initialised to a certain value
        if(typeof argList[0] == "number")
        {
            return trigFunc(argList[0]);
        }

        if(argList[0] instanceof PMCDataValues)
        {
            // Input is a map of radians, we run the trig function for each value and return a map of the same size
            return argList[0].mathFunc(trigFunc);
        }

        throw new Error(funcName+"() expression expects 1 parameter: scalar (radians) OR map of radians. Arg was wrong type.");
    }

    ////////////////////////////////////// Querying Periodic Table Data //////////////////////////////////////
    // Expects: Element symbol, eg Fe or O and also works with carbonates/oxides the same way the rest of
    //          PIXLISE works it out
    // Returns: scalar atomic mass
    private atomicMass(argList): number
    {
        if(argList.length != 1)
        {
            throw new Error("atomicMass() expression expects 1 parameters: Atomic symbol. Received: "+argList.length+" parameters");
        }
        if(typeof argList[0] != "string")
        {
            throw new Error("atomicMass() expression expects 1 parameters: Atomic symbol, eg Fe, O or Fe2O3");
        }

        let mass = periodicTableDB.getMolecularMass(argList[0]);
        if(mass <= 0)
        {
            throw new Error("atomicMass() Failed to calculate mass for: "+argList[0]);
        }
        return mass;
    }

    ////////////////////////////////////// Calling Pseudo-Intensity Data Source //////////////////////////////////////
    // Expects: Fe for example
    private readPseudoIntensity(argList): PMCDataValues
    {
        if(argList.length != 1 || (typeof argList[0] != "string"))
        {
            throw new Error("pseudo() expects 1 parameters: pseudo-intensity-element name. Received: "+argList.length+" parameters");
        }

        if(!this.pseudoDataSource)
        {
            throw new Error("pseudo() failed, no pseudo-intensity data exists in currently loaded data set.");
        }

        return this.pseudoDataSource.getPseudoIntensityData(argList[0]);
    }

    ////////////////////////////////////// Calling Pseudo-Intensity Data Source //////////////////////////////////////
    // Expects: Name of the housekeeping data column
    private readHousekeepingData(argList): PMCDataValues
    {
        if(argList.length != 1 || (typeof argList[0] != "string"))
        {
            throw new Error("housekeeping() expects 1 parameters: data column name. Received: "+argList.length+" parameters");
        }

        if(!this.housekeepingDataSource)
        {
            throw new Error("housekeeping() data retrieval failed, no housekeeping data exists in currently loaded data set.");
        }

        return this.housekeepingDataSource.getHousekeepingData(argList[0]);
    }

    // Expects PMCDataValues and a scalar
    private mapOperation(allowMap: boolean, allowScalar: boolean, callee, argList): PMCDataValues
    {
        let op = this.getEnumForCallIfExists(callee);
        if(op == null)
        {
            throw new Error(callee+" unsupported");
        }

        // Check first parameter:
        if(argList.length == 2 && (argList[0] instanceof PMCDataValues))
        {
            // Check second parameter. Flags tell us what's allowed
            let secondIsMap = (argList[1] instanceof PMCDataValues);
            let secondIsScalar = (typeof argList[1] == "number");

            // Check if we're allowed to have the second parameter be what it is...
            if(secondIsMap && allowMap || secondIsScalar && allowScalar)
            {
                if(secondIsMap)
                {
                    return argList[0].operationWithMap(op, argList[1] as PMCDataValues);
                }
                return argList[0].operationWithScalar(op, argList[1] as number, true);
            }
        }

        // If we made it here, we're not happy with the parameters...
        let secondParamType = "";
        if(allowMap)
        {
            secondParamType = "map";
        }
        if(allowScalar)
        {
            if(secondParamType.length > 0)
            {
                secondParamType += " or ";
            }
            secondParamType += "scalar";
        }

        throw new Error(callee+"() expects 2 parameters: (map, "+secondParamType+"). Received: "+argList.length+" parameters");
    }

    private getEnumForOp(operation: string): QuantOp
    {
        if(operation == "*")
        {
            return QuantOp.MULTIPLY;
        }
        else if(operation == "/")
        {
            return QuantOp.DIVIDE;
        }
        else if(operation == "+")
        {
            return QuantOp.ADD;
        }
        else if(operation == "-")
        {
            return QuantOp.SUBTRACT;
        }
        throw new Error("Unknown operation: "+operation);
    }

    private getEnumForCallIfExists(operation: string): QuantOp
    {
        if(operation == "min")
        {
            return QuantOp.MIN;
        }
        else if(operation == "max")
        {
            return QuantOp.MAX;
        }
        else if(operation == "under")
        {
            return QuantOp.UNDER;
        }
        else if(operation == "over")
        {
            return QuantOp.OVER;
        }
        else if(operation == "under_undef")
        {
            return QuantOp.UNDER_UNDEFINED;
        }
        else if(operation == "over_undef")
        {
            return QuantOp.OVER_UNDEFINED;
        }
        else if(operation == "avg")
        {
            return QuantOp.AVG;
        }
        return null;
    }
}
