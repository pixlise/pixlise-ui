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
import { QuantOp } from "src/app/expression-language/data-values";
import { PixliseDataQuerier } from "src/app/expression-language/interpret-pixlise";

export class LuaTranspiler {
  private _runningExpression: string = "";
  private _variableLookupIsMap: Map<string, boolean> = new Map<string, boolean>();
  private _mapLibFuncs = [
    "pow",
    "over",
    "min",
    "max",
    "under",
    "under_undef",
    "over",
    "over_undef",
    "avg",
    "ln",
    "exp",
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
  ];

  public static builtinFunctions = [
    "element",
    "elementSum",
    "data",
    "spectrum",
    "spectrumDiff",
    "pseudo",
    "housekeeping",
    "diffractionPeaks",
    "roughness",
    "position",
    "makeMap",
  ];
  private _mapReturningFuncs = LuaTranspiler.builtinFunctions;

  constructor() {}

  transpile(expression: string): string {
    let result = "";
    let returnCount = 0;

    let lines = expression.split("\n");

    // Run through each line, convert comments, parse assignments and the expression per line
    for (let c = 0; c < lines.length; c++) {
      let line = lines[c];

      // What we find on a line:
      let varName = "";
      let lineExpression = "";
      let comment = "";
      let preCommentWhitespace = "";

      // The line we're building
      let luaLine = "";

      // Strip comments
      let commentPos = line.indexOf("//");
      if (commentPos > -1) {
        // Run back and find the first whitespace before the comment too
        for (let c = commentPos - 1; c > 0; c--) {
          if (line[c] != " ") {
            break;
          }
          preCommentWhitespace += " ";
        }
        comment = line.substring(commentPos + 2);
        line = line.substring(0, commentPos);
      }

      // Strip whitespace at start
      line = line.trimStart();

      if (line.length > 0) {
        let equalPos = line.indexOf("=");
        if (equalPos > -1) {
          varName = line.substring(0, equalPos).trim();
          varName = this.ensureNoClash(varName);
          if (!PixliseDataQuerier.isValidVariableName(varName)) {
            throw new Error("ERROR: Line " + (c + 1) + ': Invalid variable name definition: "' + varName + '"');
          }

          lineExpression = line.substring(equalPos + 1).trim();
        } else {
          // Assume it's the expression at the end, no = here...
          lineExpression = line;
        }
      }

      if (varName.length > 0) {
        // If it's a new one, add local to it
        if (!this._variableLookupIsMap.has(varName)) {
          //result += "local ";
        }

        luaLine += varName + " = ";
      }

      let luaExpr = "";
      if (lineExpression.length > 0) {
        try {
          luaExpr = this.parseLineExpression(lineExpression, this._variableLookupIsMap);
          luaLine += luaExpr;

          // If we've got a var being defined, check if it's just a number
          if (varName.length > 0) {
            let isMap = this.evaluatesToMap(lineExpression, this._variableLookupIsMap);
            this._variableLookupIsMap.set(varName, isMap);
          }
        } catch (err) {
          console.error(err);
          return "";
        }
      }

      if (comment.length > 0) {
        if (lineExpression.length > 0) {
          luaLine += " ";
        }
        luaLine += preCommentWhitespace + "--" + comment;
      }

      // NOTE: we have a special case, where Mike creates a "unit" map to use in calculations, we can replace this with
      // a new map call
      if (luaLine.startsWith("unit = Map.over(element(") && luaLine.indexOf(", -10)") > -1) {
        luaLine = "unit = makeMap(1)";
      }

      // Also note if it's after the variable define lines, we need to insert a return
      if (varName.length <= 0 && luaExpr.length > 0) {
        luaLine = "return " + luaLine;
        returnCount++;

        if (returnCount > 1) {
          throw new Error("Multiple return statements");
        }
      }

      result += luaLine;
      if (c < lines.length - 1) {
        result += "\n";
      }
    }

    return result;
  }

  private ensureNoClash(varName: string): string {
    // Saw some scripts that had "element" as a variable name, which is also a function, in Lua this breaks
    // Here we check if it's any of the global function names, if so, replace

    if (
      this._mapReturningFuncs.indexOf(varName) > -1 ||
      varName == "return" // Special case, we've seen "return" as a variable name in PIXLANG, breaks Lua converted code... this makes it "return _return"
    ) {
      return "_" + varName;
    }
    return varName;
  }

  private parseLineExpression(expression: string, variableLookupIsMap: Map<string, boolean>): any {
    this._runningExpression = '"' + expression + '"';
    let parseTree = jsep(expression);
    return this.parseExpressionNode(parseTree, variableLookupIsMap);
  }

  private evaluatesToMap(expression: string, variableLookupIsMap: Map<string, boolean>): boolean {
    let parseTree = jsep(expression);
    return this.parseExpressionNodeEvalToMap(parseTree, variableLookupIsMap);
  }

  private parseExpressionNodeEvalToMap(expressionParseTreeNode: object, variableLookupIsMap: Map<string, boolean>): boolean {
    let expType = expressionParseTreeNode["type"];
    if (expType == "BinaryExpression") {
      // These are the tricky ones, we need to check left & right side
      let left = this.parseExpressionNodeEvalToMap(expressionParseTreeNode["left"], variableLookupIsMap);
      let right = this.parseExpressionNodeEvalToMap(expressionParseTreeNode["right"], variableLookupIsMap);

      // Either one could eval to a map, and the binary expression could then become a map
      return left || right;
    } else if (expType == "CallExpression") {
      let callee = expressionParseTreeNode["callee"]["name"];

      // If we call a function that returns a map, it's a map!
      if (this._mapReturningFuncs.indexOf(callee) > -1) {
        return true;
      }

      // Otherwise it depends on the parameters to the function because some of ours have optional maps/scalars
      // Here we simply check each argument to see what it evaluates to
      for (let arg of expressionParseTreeNode["arguments"]) {
        let isMap = this.parseExpressionNodeEvalToMap(arg, variableLookupIsMap);
        if (isMap) {
          return true;
        }
      }

      // If we get this far, whatever func is being called, it's not going to return a map
      return false;
    } else if (expType == "UnaryExpression") {
      // Negation only works with numbers in original code, so this won't evaluate to a map
      return false;
    } else if (expType == "Literal") {
      return false; // We don't have syntax to define a map in place
    } else if (expType == "Identifier") {
      // Look up the value in our var lookup
      let varName = expressionParseTreeNode["name"];
      varName = this.ensureNoClash(varName);
      if (!variableLookupIsMap.has(varName)) {
        throw new Error('Unknown identifier: "' + varName + '"');
      }
      // We're whatever type the other var is
      return variableLookupIsMap.get(varName);
    }

    throw new Error("Unexpected: " + expressionParseTreeNode["type"]);
  }

  private parseExpressionNode(expressionParseTreeNode: object, variableLookupIsMap: Map<string, boolean>): string {
    let expType = expressionParseTreeNode["type"];
    if (expType == "BinaryExpression") {
      return this.binaryExpression(expressionParseTreeNode, variableLookupIsMap);
    } else if (expType == "CallExpression") {
      return this.callExpression(expressionParseTreeNode, variableLookupIsMap);
    } else if (expType == "UnaryExpression") {
      return this.unaryExpression(expressionParseTreeNode);
    } else if (expType == "Literal") {
      if (expressionParseTreeNode["raw"].startsWith("'") && expressionParseTreeNode["raw"].endsWith("'")) {
        return '"' + expressionParseTreeNode["value"] + '"';
      }
      return expressionParseTreeNode["raw"];
    } else if (expType == "Identifier") {
      // Look up the value in our var lookup
      let varName = expressionParseTreeNode["name"];
      varName = this.ensureNoClash(varName);
      if (!variableLookupIsMap.has(varName)) {
        throw new Error('Unknown identifier: "' + varName + '"');
      }
      return varName;
    }

    throw new Error("Unexpected: " + expressionParseTreeNode["type"]);
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

  private unaryExpression(expressionParseTreeNode: object): string {
    let op = this.getEnumForOp(expressionParseTreeNode["operator"]);
    let prefix = expressionParseTreeNode["prefix"];
    let arg = expressionParseTreeNode["argument"];

    // We only support unary expressions of negative numbers...
    if (op == QuantOp.SUBTRACT && prefix && arg) {
      return "-" + arg["value"];
    }

    throw new Error("Unexpected unary type: " + expressionParseTreeNode["operator"] + " prefix: " + prefix + " in: " + this._runningExpression);
  }

  private binaryExpression(expressionParseTreeNode: object, variableLookupIsMap: Map<string, boolean>): any {
    // Parse left, right, then combine them
    let left = this.parseExpressionNode(expressionParseTreeNode["left"], variableLookupIsMap);
    let leftIsMap = this.parseExpressionNodeEvalToMap(expressionParseTreeNode["left"], variableLookupIsMap);
    let right = this.parseExpressionNode(expressionParseTreeNode["right"], variableLookupIsMap);
    let rightIsMap = this.parseExpressionNodeEvalToMap(expressionParseTreeNode["right"], variableLookupIsMap);

    let op = this.getEnumForOp(expressionParseTreeNode["operator"]);

    if (typeof left == "string" && typeof right == "string" && left.startsWith('"') && right.startsWith('"')) {
      return left + ".." + right;
    } else if (!leftIsMap && !rightIsMap) {
      // Neither side evaluates to a map so we must be simple arithmatic
      // NOTE: this outputs a lot of brackets! We could probably be smarter and see if the operator above us is of higher
      // precedence, hence leaving out our brackets, but for the time being this provides reliable code, even if it's
      // a little uglier.
      return "(" + left + " " + expressionParseTreeNode["operator"] + " " + right + ")";
    }

    // This will evaluate to a map operation
    return this.opFunc(op) + "(" + left + ", " + right + ")";
  }

  private opFunc(op: QuantOp): string {
    switch (op) {
      case QuantOp.ADD:
        return "Map.add";
      case QuantOp.SUBTRACT:
        return "Map.sub";
      case QuantOp.MULTIPLY:
        return "Map.mul";
      case QuantOp.DIVIDE:
        return "Map.div";
    }

    throw new Error("Failed to substitute for operator: " + op + " in: " + this._runningExpression);
  }

  private callExpression(expressionParseTreeNode: object, variableLookupIsMap: Map<string, boolean>): string {
    let callee = expressionParseTreeNode["callee"]["name"];

    let mapArgs = 0;
    let argTxts = [];
    let argFlat = "";
    for (let arg of expressionParseTreeNode["arguments"]) {
      if (argFlat.length > 0) {
        argFlat += ", ";
      }

      let argTxt = this.parseExpressionNode(arg, variableLookupIsMap);
      // Also determine if this is a map, as that affects what we call
      let isMap = this.parseExpressionNodeEvalToMap(arg, variableLookupIsMap);
      if (isMap) {
        mapArgs++;
      }

      argTxts.push(argTxt);
      argFlat += argTxt;
    }

    if (mapArgs > 0) {
      // Check if it's a map function we're having to call in Lua...
      if (this._mapLibFuncs.indexOf(callee) > -1) {
        callee = "Map." + callee;
      }
    } else {
      // No params are maps, special case for pow() in Lua
      if (callee == "pow") {
        if (argTxts.length != 2) {
          throw new Error("Failed to substitute ^ for pow in: " + this._runningExpression);
        }

        return argTxts[0] + "^" + argTxts[1];
      }
    }

    let result = callee + "(" + argFlat;

    result += ")";
    return result;
  }
}
