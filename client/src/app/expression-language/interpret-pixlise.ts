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

import { Observable, from } from "rxjs";
import jsep from "jsep";
import { PMCDataValues, DataQueryResult, QuantOp } from "src/app/expression-language/data-values";
import { InterpreterDataSource } from "./interpreter-data-source";
import { DataExpressionId } from "./expression-id";

export class ExpressionParts {
  constructor(
    public variableNames: string[],
    public variableExpressions: string[],
    public variableLines: number[],
    public expressionLine: string
  ) {}
}

export class PixliseDataQuerier {
  private _runningExpression: string = "";
  private _dataSource: InterpreterDataSource | null = null;
  private _runtimeDataRequired: Set<string> = new Set<string>();

  constructor() {}

  public runQuery(expression: string, dataSource: InterpreterDataSource): Observable<DataQueryResult> {
    this._dataSource = dataSource;
    this._runtimeDataRequired.clear();

    const t0 = performance.now();

    // Parse the expression
    // We do this in 2 stages, first we allow variables to be defined, then we expect to end in a line that has an expression in it
    // Blank lines and // comments are ignored
    const exprParts = PixliseDataQuerier.breakExpressionIntoParts(expression);

    return from(this.runQueryInternal(expression, exprParts, t0));
  }

  private async runQueryInternal(expression: string, exprParts: ExpressionParts, t0: number) {
    const variableLookup = await this.parseVariables(exprParts);
    const result = await this.parseExpression(exprParts.expressionLine, variableLookup);

    if (result instanceof PMCDataValues) {
      const runtimeMs = performance.now() - t0;
      return new DataQueryResult(
        result as PMCDataValues,
        true,
        Array.from(this._runtimeDataRequired.keys()),
        runtimeMs,
        "",
        "",
        new Map<string, PMCDataValues>(),
        new Map<string, string>()
      );
    }

    throw new Error("Expression did not result in usable map data. Result was: " + result);
  }

  private async parseExpression(expression: string, variableLookup: Map<string, string | number | PMCDataValues>): Promise<any> {
    // Save this expression in a local var so anything printing error msgs can reference it
    this._runningExpression = '"' + expression + '"';
    const parseTree = jsep(expression);

    return await this.parseExpressionNode(parseTree, variableLookup);
  }

  public static breakExpressionIntoParts(expression: string): ExpressionParts {
    const lines = expression.split("\n");
    const variableNames: string[] = [];
    const variableExpressions: string[] = [];
    const variableLines: number[] = [];

    let expressionLine: string = "";

    for (let c = 0; c < lines.length; c++) {
      let line = lines[c];

      // Strip comments
      const commentPos = line.indexOf("//");
      if (commentPos > -1) {
        line = line.substring(0, commentPos);
      }

      // Strip whitespace at start
      line = line.trimStart();

      if (line.length <= 0) {
        continue;
      }

      const equalPos = line.indexOf("=");

      // We expect the first block of lines to either have = or be blank (effectively after comments+whitespace stripped)
      // When we find lines that don't have an = we concat them onto one line assuming it's all part of the expression. If
      // we find another = that's an error. Finally the concated expression is run, using the variables detected above it

      if (equalPos > -1) {
        if (expressionLine.length > 0) {
          // We found line(s) that didn't contain = then they did again
          throw new Error(
            "Line " + (c + 1) + ": Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability."
          );
        }

        variableLines.push(c + 1);

        const varName = line.substring(0, equalPos).trim();
        if (!PixliseDataQuerier.isValidVariableName(varName)) {
          throw new Error("Line " + (c + 1) + ': Invalid variable name definition: "' + varName + '"');
        }

        variableNames.push(varName);
        variableExpressions.push(line.substring(equalPos + 1).trim());
      } else {
        // Append to the expression line
        if (expressionLine.length > 0) {
          expressionLine += " ";
        }

        expressionLine += line;
      }
    }

    if (expressionLine.length <= 0) {
      throw new Error("No usable expression found");
    }

    return new ExpressionParts(variableNames, variableExpressions, variableLines, expressionLine);
  }

  public static isValidVariableName(name: string): boolean {
    if (name.length <= 0 || name.length >= 50) {
      return false;
    }

    // Should only contain the valid characters in a var name
    const matched = name.match(/^[_a-zA-Z][_a-zA-Z0-9]*$/);
    if (!matched) {
      return false;
    }

    return matched.length == 1 && matched[0] === name;
  }

  private async parseVariables(parts: ExpressionParts): Promise<Map<string, string | number | PMCDataValues>> {
    const varLookup: Map<string, string | number | PMCDataValues> = new Map<string, string | number | PMCDataValues>();

    // Run through all of them, parse each line in order
    for (let c = 0; c < parts.variableNames.length; c++) {
      try {
        const result = await this.parseExpression(parts.variableExpressions[c], varLookup);

        if (result instanceof PMCDataValues || typeof result == "number" || typeof result == "string") {
          varLookup.set(parts.variableNames[c], result);
        } else {
          throw new Error("Unexpected result for variable");
        }
      } catch (error: any) {
        let errorMsg = error;
        if (error && error["message"]) {
          errorMsg = error["message"];
        }
        throw new Error("Line " + parts.variableLines[c] + ": " + errorMsg);
      }
    }

    return varLookup;
  }

  private async parseExpressionNode(expressionParseTreeNode: Record<string, any>, variableLookup: Map<string, string | number | PMCDataValues>): Promise<any> {
    const expType = expressionParseTreeNode["type"];
    if (expType == "BinaryExpression") {
      return await this.binaryExpression(expressionParseTreeNode, variableLookup);
    } else if (expType == "CallExpression") {
      return await this.callExpression(expressionParseTreeNode, variableLookup);
    } else if (expType == "UnaryExpression") {
      return new Promise(resolve => {
        resolve(this.unaryExpression(expressionParseTreeNode));
      });
    } else if (expType == "Literal") {
      return new Promise(resolve => {
        resolve(expressionParseTreeNode["value"]);
      });
    } else if (expType == "Identifier") {
      // Look up the value in our var lookup
      const varName = expressionParseTreeNode["name"];
      const val = variableLookup.get(varName);
      if (val == undefined) {
        throw new Error('Unknown identifier: "' + varName + '"');
      }
      return new Promise(resolve => {
        resolve(val);
      });
    }

    throw new Error("Unexpected: " + expressionParseTreeNode["type"]);
  }

  private unaryExpression(expressionParseTreeNode: Record<string, any>): number {
    const op = this.getEnumForOp(expressionParseTreeNode["operator"]);
    const prefix = expressionParseTreeNode["prefix"];
    const arg = expressionParseTreeNode["argument"];

    // We only support unary expressions of negative numbers...
    if (op == QuantOp.SUBTRACT && prefix && arg) {
      return -1 * arg["value"];
    } else if (op == QuantOp.ADD && prefix && arg) {
      return arg["value"];
    }

    throw new Error("Unexpected unary type: " + expressionParseTreeNode["operator"] + " prefix: " + prefix + " in: " + this._runningExpression);
  }

  private async binaryExpression(expressionParseTreeNode: Record<string, any>, variableLookup: Map<string, string | number | PMCDataValues>): Promise<any> {
    // Parse left, right, then combine them
    const left = await this.parseExpressionNode(expressionParseTreeNode["left"], variableLookup);
    const right = await this.parseExpressionNode(expressionParseTreeNode["right"], variableLookup);

    const op = this.getEnumForOp(expressionParseTreeNode["operator"]);

    if (typeof left == "number" && typeof right == "number") {
      return this.binaryScalarOp(op, left, right);
    } else if (left instanceof PMCDataValues && typeof right == "number") {
      return left.operationWithScalar(op, right, false); // false because: map <op> number
    } else if (right instanceof PMCDataValues && typeof left == "number") {
      return right.operationWithScalar(op, left, true); // true because: number <op> map
    } else if (left instanceof PMCDataValues && right instanceof PMCDataValues) {
      return left.operationWithMap(op, right);
    } else if (typeof left == "string" && typeof right == "string") {
      return this.addString(op, left, right);
    }

    throw new Error("Failed to calculate operation: " + expressionParseTreeNode["operator"] + " in: " + this._runningExpression);
  }

  private binaryScalarOp(operation: QuantOp, left: number, right: number): number {
    switch (operation) {
      case QuantOp.ADD:
        return left + right;
        break;
      case QuantOp.SUBTRACT:
        return left - right;
        break;
      case QuantOp.MULTIPLY:
        return left * right;
        break;
      case QuantOp.DIVIDE:
        return left / right;
        break;
    }

    throw new Error("Failed to apply operation: " + operation + " to 2 scalars in: " + this._runningExpression);
  }

  private addString(operation: QuantOp, left: string, right: string): string {
    switch (operation) {
      case QuantOp.ADD:
        return left + right;
        break;
    }

    throw new Error("Failed to apply operation: " + operation + " to 2 strings in: " + this._runningExpression);
  }

  //ALLOWED_CALLS = ['normalize', 'data', 'min', 'max', 'threshold'];
  //CALLER_PARAMS_REQUIRED = [1, 2, 2, 2, 3];
  private async callExpression(expressionParseTreeNode: Record<string, any>, variableLookup: Map<string, string | number | PMCDataValues>): Promise<any> {
    if (!this._dataSource) {
      throw new Error("DataSource not initialised for pixlise expression parser");
    }

    const callee = expressionParseTreeNode["callee"]["name"];
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
    const args = [];
    for (const arg of expressionParseTreeNode["arguments"]) {
      args.push(await this.parseExpressionNode(arg, variableLookup));
    }

    // It's a valid call & right param count, now run it
    if (callee == "normalize") {
      return this.normalizeMap(args);
    } else if (callee == "threshold") {
      return this.thresholdMap(args);
    } else if (callee == "pow") {
      return this.pow(args);
    } else if (callee == "data") {
      const r = await this._dataSource.readQuantMap(args);
      // If we didn't die so far, it must be valid
      if (args && args.length == 2) {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantDataExpression(args[0], args[1]));
      }
      return r;
    } else if (callee == "spectrum") {
      this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
      return this._dataSource.readSpectrum(args);
    } else if (callee == "spectrumDiff") {
      this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
      return this._dataSource.readSpectrumDifferences(args);
    } else if (callee == "element") {
      const r = await this._dataSource.readElement(args);
      // If we didn't die so far, it must be valid
      if (args && args.length == 3) {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantElementExpression(args[0], args[1], args[2]));
      }
      return r;
    } else if (callee == "elementSum") {
      // TODO: Store the fact that we required all elements!
      return this._dataSource.readElementSum(args);
    } else if (callee == "pseudo") {
      const r = this._dataSource.readPseudoIntensity(args);
      // If we didn't die so far, it must be valid
      if (args && args.length == 1) {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedPseudoIntensityExpression(args[0]));
      }
      return r;
    } else if (callee == "housekeeping") {
      const r = this._dataSource.readHousekeepingData(args);
      // If we didn't die so far, it must be valid
      if (args && args.length == 1) {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeHousekeeping + "-" + args[0]);
      }
      return r;
    } else if (callee == "diffractionPeaks") {
      this._runtimeDataRequired.add(DataQueryResult.DataTypeDiffraction);
      return this._dataSource.readDiffractionData(args);
    } else if (callee == "roughness") {
      this._runtimeDataRequired.add(DataQueryResult.DataTypeRoughness);
      return this._dataSource.readRoughnessData(args);
    } else if (callee == "position") {
      this._runtimeDataRequired.add(DataQueryResult.DataTypePosition);
      return await this._dataSource.readPosition(args);
    } else if (callee == "under" || callee == "over" || callee == "under_undef" || callee == "over_undef") {
      return this.mapOperation(false, true, callee, args);
    } else if (callee == "avg") {
      return this.mapOperation(true, false, callee, args);
    } else if (callee == "min" || callee == "max") {
      return this.mapOperation(true, true, callee, args);
    } else if (callee == "makeMap") {
      return this._dataSource.makeMap(args);
    } else if (callee == "sin" || callee == "cos" || callee == "tan" || callee == "asin" || callee == "acos" || callee == "atan") {
      return this.mathFunction(callee, args);
    } else if (callee == "exp" || callee == "ln") {
      return this.mathFunction(callee, args);
    } else if (callee == "atomicMass") {
      return this._dataSource.atomicMass(args);
    }

    throw new Error("Unknown callee: " + callee + " in: " + this._runningExpression);

    // Shouldn't get here really... we checked it's a valid callee above!
    //throw new Error('Unreachable error... in: '+JSON.stringify(expressionParseTreeNode));
  }

  // Expects a PMCDataValues
  private normalizeMap(argList: any[]): PMCDataValues {
    if (argList.length != 1 || !(argList[0] instanceof PMCDataValues)) {
      throw new Error("normalize() expects 1 map parameter. Received: " + argList.length + " parameters");
    }

    // Take the map and normalize its values, returning them that way
    return argList[0].normalize();
  }

  // Expects PMCDataValues, scalar, scalar
  private thresholdMap(argList: any[]): PMCDataValues {
    if (argList.length != 3 || !(argList[0] instanceof PMCDataValues) || typeof argList[1] != "number" || typeof argList[2] != "number") {
      throw new Error("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: " + argList.length + " parameters");
    }

    return argList[0].threshold(argList[1], argList[2]);
  }

  // Expects PMCDataValues or scalar, scalar, returns scalar or PMCDataValues
  private pow(argList: any[]): any {
    if (argList.length != 2) {
      throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: " + argList.length + " parameters");
    }

    if (typeof argList[1] != "number") {
      throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg1 was wrong type");
    }

    if (typeof argList[0] == "number") {
      return Math.pow(argList[0], argList[1]);
    }

    if (argList[0] instanceof PMCDataValues) {
      // Input is a map of radians, we run the trig function for each value and return a map of the same size
      return argList[0].mathFuncWithArg(Math.pow, argList[1]);
    }

    throw new Error("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg0 was wrong type");
  }

  ////////////////////////////////////// Calling Trig Functions //////////////////////////////////////
  // Expects: Function name, and arg of either PMCDataValues or scalar
  // Returns: PMCDataValues or scalar depending on args
  private mathFunction(funcName: string, argList: any[]): any {
    // Expect the right one(s)
    const trigFunctionNames = ["sin", "cos", "tan", "asin", "acos", "atan", "exp", "ln"];
    const trigFunctions = [Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan, Math.exp, Math.log];
    const trigFuncIdx = trigFunctionNames.indexOf(funcName);
    if (trigFuncIdx < 0) {
      throw new Error("trigFunction() expression unknown function: " + funcName);
    }

    if (argList.length != 1) {
      throw new Error(funcName + "() expression expects 1 parameter: scalar (radians) OR map of radians");
    }

    const trigFunc = trigFunctions[trigFuncIdx];

    // If argument is a scalar, we simply call the trig function and return the result as a single value
    // this is useful for things like makeMap(sin(0.5)) where we want a whole map initialised to a certain value
    if (typeof argList[0] == "number") {
      return trigFunc(argList[0]);
    }

    if (argList[0] instanceof PMCDataValues) {
      // Input is a map of radians, we run the trig function for each value and return a map of the same size
      return argList[0].mathFunc(trigFunc);
    }

    throw new Error(funcName + "() expression expects 1 parameter: scalar (radians) OR map of radians. Arg was wrong type.");
  }

  // Expects PMCDataValues and a scalar
  private mapOperation(allowMap: boolean, allowScalar: boolean, callee: string, argList: any[]): PMCDataValues {
    const op = this.getEnumForCallIfExists(callee);
    if (op == null) {
      throw new Error(callee + " unsupported");
    }

    // Check first parameter:
    if (argList.length == 2 && argList[0] instanceof PMCDataValues) {
      // Check second parameter. Flags tell us what's allowed
      const secondIsMap = argList[1] instanceof PMCDataValues;
      const secondIsScalar = typeof argList[1] == "number";

      // Check if we're allowed to have the second parameter be what it is...
      if ((secondIsMap && allowMap) || (secondIsScalar && allowScalar)) {
        if (secondIsMap) {
          return argList[0].operationWithMap(op, argList[1] as PMCDataValues);
        }
        return argList[0].operationWithScalar(op, argList[1] as number, true);
      }
    }

    // If we made it here, we're not happy with the parameters...
    let secondParamType = "";
    if (allowMap) {
      secondParamType = "map";
    }
    if (allowScalar) {
      if (secondParamType.length > 0) {
        secondParamType += " or ";
      }
      secondParamType += "scalar";
    }

    throw new Error(callee + "() expects 2 parameters: (map, " + secondParamType + "). Received: " + argList.length + " parameters");
  }

  private getEnumForOp(operation: string): QuantOp {
    if (operation == "*") {
      return QuantOp.MULTIPLY;
    } else if (operation == "/") {
      return QuantOp.DIVIDE;
    } else if (operation == "+") {
      return QuantOp.ADD;
    } else if (operation == "-") {
      return QuantOp.SUBTRACT;
    }
    throw new Error("Unknown operation: " + operation);
  }

  private getEnumForCallIfExists(operation: string): QuantOp | null {
    if (operation == "min") {
      return QuantOp.MIN;
    } else if (operation == "max") {
      return QuantOp.MAX;
    } else if (operation == "under") {
      return QuantOp.UNDER;
    } else if (operation == "over") {
      return QuantOp.OVER;
    } else if (operation == "under_undef") {
      return QuantOp.UNDER_UNDEFINED;
    } else if (operation == "over_undef") {
      return QuantOp.OVER_UNDEFINED;
    } else if (operation == "avg") {
      return QuantOp.AVG;
    }
    return null;
  }
}
