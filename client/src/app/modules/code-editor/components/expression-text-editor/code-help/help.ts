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

export class NameAndParamResult {
  constructor(
    public funcName: string,
    public params: string[],
    public partialParam: string
  ) {}

  get empty(): boolean {
    return this.funcName.length <= 0 && this.params.length <= 0 && this.partialParam.length <= 0;
  }
}

export class SourceContextParser {
  constructor(private _commentMarker: string) {
    if (!this._commentMarker) {
      throw new Error("Comment marker cannot be blank");
    }
  }

  // If we can, extract the word right before the end of the string
  // This means we're looking back from the end of the string and only reporting
  // we found a "word" if it's alpha-numeric but is a valid variable/function name
  wordAtEnd(source: string): string {
    const text = this.stripCommentsAndFlatten(source);

    let foundLetters = false;
    for (let c = text.length - 1; c >= 0; c--) {
      const ch = text[c];
      if (ch == '"' || ch == "'") {
        // If we found a quote char, we're likely something like "blah where this isn't a word, but a string def
        break;
      } else if (ch == ")" || ch == "(" || ch == " " || ch == "\t") {
        if (foundLetters) {
          // Found these but had some valid letters until then, so cut off here
          return text.substring(c + 1);
        } else {
          // If we've found these, we don't have a word anyway so stop here
          break;
        }
      } else if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch == "_") {
        foundLetters = true;
      }
    }

    return "";
  }

  // Get module name typed, expects "." with a name before it
  rfindModuleName(source: string): string {
    let modName = "";
    const validModuleChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

    if (source.length > 0 && source[source.length - 1] == ".") {
      // Likely won't have a longer module name than 20 chars, API limits it
      for (let c = 0; c < 20; c++) {
        const idx = source.length - 2 - c;
        if (idx >= 0) {
          const ch = source[idx];
          // Check if it's still module name goodness
          if (validModuleChars.indexOf(ch) == -1) {
            modName = source.substring(idx + 1, source.length - 1);
            break;
          }
        } else {
          // Too long, not a module name, stop here
          break;
        }
      }
    }

    return modName;
  }

  // Reverse-find from the end of the text, what function we're in, and what parameters have already been provided
  rfindFunctionNameAndParams(source: string): NameAndParamResult {
    const text = this.stripCommentsAndFlatten(source);

    const result = new NameAndParamResult("", [], "");

    let inQuotes = false;
    let bracketDepth = 0;
    let currMark = -1;

    for (let c = text.length - 1; c >= 0; c--) {
      const ch = text[c];
      if (ch == '"') {
        // If this is the first thing we've seen, we may be partially through typing
        // a parameter with quotes, eg: element("Fe
        // So in this case we have to assume we've just LEFT the quoted area, not just
        // entered
        if (result.empty) {
          // This is the special case...
          inQuotes = false;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes) {
        if (ch == ")") {
          bracketDepth++;
        } else if (ch == "(") {
          bracketDepth--;
          if (currMark >= 0) {
            // Likely end of 1st param, into the function call
            if (bracketDepth < 0) {
              result.params.push(this.cleanParam(text.substring(c + 1, currMark)));
              currMark = c;
            }
          } else {
            if (bracketDepth < 0) {
              // We must have a partial parameter typed, eg element("Fe", "%
              // So save it here
              const typedParam = text.substring(c + 1).trim();
              if (typedParam) {
                result.partialParam = this.cleanParam(typedParam);
              }
            }
            currMark = c;
          }
        } else if (bracketDepth <= 0) {
          if (ch == ",") {
            if (currMark < 0) {
              // We must have a partial parameter typed, eg element("Fe", "%
              // So save it here
              const typedParam = text.substring(c + 1).trim();
              if (typedParam) {
                result.partialParam = this.cleanParam(typedParam);
              }

              currMark = c;
            } else {
              // We have just found a param, save the whole thing
              result.params.push(this.cleanParam(text.substring(c + 1, currMark)));
              currMark = c;
            }
          }
          // Anything that can be before a module or function name
          // Eg " " in: v = func()
          // Eg "\t" in: v =  func()
          // Eg we're at the start of string already in: func()
          // Eg "=" in: v=func()
          // Eg "/" in: x=v/func()
          // Eg "*" in: x=2*func()
          // Eg "+" in: x=2+func()
          // Eg "-" in: x=2-func()
          // Eg "^" in: x=2^func()
          // NOTE: All of the above apply if we had mod.func() instead of func()!
          else if (c == 0 || " \t=/*+-^".indexOf(ch) > -1) {
            if (bracketDepth < 0) {
              let startIdx = c;
              if ("=/*+-^".indexOf(ch) > -1) {
                startIdx++;
              }
              result.funcName = this.cleanParam(text.substring(startIdx, currMark));
              break;
            }
          }
        }
      }
    }

    // Reverse the param order here, we were parsing backwards!
    result.params = result.params.reverse();
    return result;
  }

  private cleanParam(param: string): string {
    const noWhite = param.trim();
    /*
        // Now remove quotes if they exist on both ends
        // NOTE: This is only because if we're dealing with "cleaning" a partially typed param
        // eg element("Fe, we don't want to clear the ", so it's displayed correctly
        if(noWhite[0] == "\"" && noWhite[noWhite.length-1] == "\"")
        {
            noWhite = noWhite.substring(1, noWhite.length-2);
        }
    */
    /*
        // Now remove any \" in case it's a string
        if(noWhite[0] == "\"")
        {
            noWhite = noWhite.substring(1);
        }
        if(noWhite[noWhite.length-1] == "\"")
        {
            noWhite = noWhite.substring(0, noWhite.length-1);
        }*/
    return noWhite;
  }

  public static stripQuotes(param: string): string {
    // Now remove any \" in case it's a string
    if (param[0] == '"' && param[param.length - 1] == '"') {
      return param.substring(1, param.length - 1);
    }
    return param;
  }

  private stripCommentsAndFlatten(searchTextLines: string): string {
    // Split by line, and remove comments, then recombine
    const searchLines = searchTextLines.split("\n");
    let searchText = "";
    for (let line of searchLines) {
      // Trim comments
      const pos = line.indexOf(this._commentMarker);
      if (pos > -1) {
        line = line.substring(0, pos);
      }

      if (searchText.length > 0) {
        searchText += " ";
      }
      searchText += line;
    }

    return searchText;
  }
}

export class FunctionParamHelp {
  constructor(
    public name: string,
    public doc: string,
    private _possibleValues: string[] = []
  ) {}

  // Can be overridden if needed
  getPossibleValues(paramsProvided: string[], paramLists: Map<string, string[]>): string[] {
    return this._possibleValues;
  }
}

export class FunctionHelp {
  constructor(
    public name: string,
    public moduleName: string,
    public doc: string,
    public originID: string, // The module ID it's defined in, or blank in case of PIXLISE functions, element() etc
    public params: FunctionParamHelp[] = [] // For parameter-less functions
  ) {}
}

export class HelpCompletionItem {
  constructor(
    public name: string,
    public doc: string //public sig: string
  ) {}
}

class HelpSignatureParam {
  constructor(
    public name: string,
    public doc: string //public possibleValues: string[]
  ) {}
}

export class HelpSignature {
  constructor(
    public signature: string,
    public funcName: string,
    public funcDoc: string,
    public params: HelpSignatureParam[],
    //public prefix: string,
    //public activeParam: string,
    //public suffix: string,
    //public paramDoc: string,
    public paramPossibleValues: string[],
    public activeParamIdx: number
  ) {}
}

export class SourceHelp {
  private _allHelp = new Map<string, FunctionHelp>();
  private _constHelp = new Map<string, Map<string, string>>();
  protected _keywords: string[] = [];

  constructor(public commentStartToken: string) {}

  addHelp(h: FunctionHelp): void {
    const fullName = h.moduleName.length > 0 ? h.moduleName + "." + h.name : h.name;
    this._allHelp.set(fullName, h);
  }

  addConstHelp(modName: string, consts: Map<string, string>) {
    this._constHelp.set(modName, consts);
  }

  clearHelp(originID: string): void {
    // Remove all entries that have this origin ID
    for (const [k, v] of this._allHelp) {
      if (v.originID == originID) {
        this._allHelp.delete(k);
      }
    }
  }

  getAllFunctions(): string[] {
    return Array.from(this._allHelp.keys());
  }

  getKeywords(): string[] {
    return this._keywords;
  }

  getConstants(): string[] {
    return Array.from(this._constHelp.keys());
  }

  getCompletionFunctions(moduleName: string): HelpCompletionItem[] {
    const result: HelpCompletionItem[] = [];

    for (const item of this._allHelp.values()) {
      if (item.moduleName == moduleName) {
        result.push(new HelpCompletionItem(item.name, item.doc /*, sig*/));
      }
    }

    return result;
  }

  getCompletionConstants(moduleName: string): Map<string, string> {
    const consts = this._constHelp.get(moduleName);
    if (!consts) {
      return new Map<string, string>();
    }

    return consts;
  }

  // Blank input returns all modules
  getCompletionModules(moduleName: string): HelpCompletionItem[] {
    const modules = new Set<string>();

    const result: HelpCompletionItem[] = [];

    for (const item of this._allHelp.values()) {
      if ((moduleName.length <= 0 && item.moduleName.length > 0) || (moduleName.length > 0 && item.moduleName == moduleName)) {
        modules.add(item.moduleName);
      }
    }

    for (const mod of modules) {
      result.push(new HelpCompletionItem(mod, ""));
    }
    return result;
  }

  getSignatureHelp(moduleName: string, funcName: string, paramsProvided: string[], paramLists: Map<string, string[]>): HelpSignature | null {
    const fullName = moduleName.length > 0 ? moduleName + "." + funcName : funcName;
    const help = this._allHelp.get(fullName);
    if (!help) {
      return null;
    }

    if (help.params.length <= 0) {
      return new HelpSignature(funcName + "()", funcName, help.doc, [], [], 0);
    }

    const paramIdx = paramsProvided.length;

    let signature = funcName + "(";
    const resultParams: HelpSignatureParam[] = [];
    let first = true;
    for (const p of help.params) {
      // Store param info
      resultParams.push(new HelpSignatureParam(p.name, p.doc));

      // And add to the signature
      if (!first) {
        signature += ", ";
      }

      signature += p.name;
      first = false;
    }

    signature += ")";

    // NOTE: User may have typed too many , - in this case the active param index will be too high. Here's hoping monaco handles that OK!
    //if(paramIdx >= help.params.length)

    const result = new HelpSignature(signature, funcName, help.doc, resultParams, [], paramIdx);

    // Add possible values to docs if needed
    const possibilities = help.params[paramIdx]?.getPossibleValues(paramsProvided, paramLists);
    if (possibilities && possibilities.length > 0) {
      result.paramPossibleValues = possibilities;
    }
    return result;
  }

  static makeDataFunctionHelp(help: SourceHelp): void {
    const OriginID = "";

    // --- Map querying
    const elementFormulae = new FunctionParamHelp("elementFormula", "Element formula to read for");
    elementFormulae.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      return paramLists.get("quantElements") || [];
    };

    const elementColumns = new FunctionParamHelp("column", "Which column to use for the given element formula");
    elementColumns.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      // Resolved when needed, needs preceeding elementFormulae parameter
      const result = [];

      if (paramsProvided.length > 0) {
        // Clear quotes from the parameter or it won't be interpreted correctly
        const p1 = SourceContextParser.stripQuotes(paramsProvided[0]);

        // Check if a column with % for this exists, if so show %-as-mmol
        const allCols = paramLists.get("quantColumns") || [];
        for (const col of allCols) {
          if (col.startsWith(p1)) {
            // Eg we just found Na2O_% starts with Na2O (specified in first param)
            // Add the first type here...
            const bits = p1.split("_");
            if (bits.length > 1) {
              result.push(bits[1]);
            }

            if (col.endsWith("%")) {
              result.push("%-as-mmol");
            }
          }
        }
      }
      return result;
    };

    const detectors = new FunctionParamHelp("detector", "Detector to read from");
    detectors.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      return paramLists.get("detectors") || [];
    };

    help.addHelp(new FunctionHelp("element", "", "Queries element map values", OriginID, [elementFormulae, elementColumns, detectors]));

    help.addHelp(new FunctionHelp("elementSum", "", "Sum of column values for all elements in quantification", OriginID, [elementColumns, detectors]));

    const dataColumn = new FunctionParamHelp("column", "Selects a column to read, use for non-element-related columns");
    dataColumn.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      return paramLists.get("quantColumns") || [];
    };

    help.addHelp(new FunctionHelp("data", "", "Reads the data column specified", OriginID, [dataColumn, detectors]));

    help.addHelp(
      new FunctionHelp("spectrum", "", "Retrieves the sum of counts between start and end channels, for the given detector", OriginID, [
        new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
        new FunctionParamHelp("endChannel", "End channel (0-4095)"),
        detectors,
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "spectrumDiff",
        "",
        "Retrieves the sum of the absolute difference in counts between Normal spectra for the A and B detector, within start and end channels.",
        OriginID,
        [
          new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
          new FunctionParamHelp("endChannel", "End channel (0-4095)"),
          new FunctionParamHelp("operation", "The operation to combine channel counts for a detector", ["max", "sum"]),
        ]
      )
    );

    const pseudoItem = new FunctionParamHelp("element", "The pseudo-intensity element");
    pseudoItem.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      return paramLists.get("quant") || [];
    };

    help.addHelp(new FunctionHelp("pseudo", "", "Returns pseudo-intensity map for given element", OriginID, [pseudoItem]));

    const housekeepingColumn = new FunctionParamHelp("column", "The housekeeping CSV column to retrieve data for");
    housekeepingColumn.getPossibleValues = (paramsProvided: string[], paramLists: Map<string, string[]>) => {
      return paramLists.get("housekeeping") || [];
    };

    help.addHelp(new FunctionHelp("housekeeping", "", "Retrieves housekeeping data from specified column", OriginID, [housekeepingColumn]));

    help.addHelp(
      new FunctionHelp("diffractionPeaks", "", "Returns a map of diffraction peak counts per PMC", OriginID, [
        new FunctionParamHelp("eVstart", "eV range start. Note, this depends on the spectrum calibration currently set!"),
        new FunctionParamHelp("eVend", "eV range end. Note, this depends on the spectrum calibration currently set!"),
      ])
    );

    help.addHelp(new FunctionHelp("roughness", "", "Retrieves a map of roughness from diffraction database globalDifference value (higher means rougher)", OriginID));

    help.addHelp(
      new FunctionHelp("position", "", "Returns a map of position values for each PMC", OriginID, [
        new FunctionParamHelp("axis", "The axis to read", ["x", "y", "z"]),
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "makeMap",
        "",
        "Makes a map with each PMC having the value specified. The map will have the same dimensions as other maps obtained",
        OriginID,
        [new FunctionParamHelp("value", "Value for each PMC in a map. Useful for eg to make a unit map of 1's")]
      )
    );

    help.addHelp(
      new FunctionHelp("atomicMass", "", "Returns the atomic mass of the formula, uses the same calculation as elsewhere in PIXLISE", OriginID, [
        new FunctionParamHelp("elementFormulae", "The formula to calculate the mass of, for example: Ca or Fe2O3"),
      ])
    );

    help.addHelp(
      new FunctionHelp("exists", "", "Returns true if the column exists, otherwise false", OriginID, [
        new FunctionParamHelp("dataType", "The type of data we're checking", ["element", "detector", "data", "housekeeping", "pseudo"]),
        new FunctionParamHelp("column", "Name of the data to check for"),
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "writeCache",
        "",
        "Saves the given table using the given key for later usage. This can be retrieved between PIXLISE sessions or different computers allowing one expression run to calculate something, while a different machine later can pick up and display the results",
        OriginID,
        [new FunctionParamHelp("key", "Unique key to identify data"), new FunctionParamHelp("table", "The data to save")]
      )
    );

    help.addHelp(
      new FunctionHelp("readCache", "", "Reads cached values saved by previous calls to writeCache", OriginID, [
        new FunctionParamHelp("key", "Unique key to identify data"),
        new FunctionParamHelp("waitIfInProgress", "Deprecated: Set to true to wait if this is already being calculated on this machine"),
      ])
    );

    help.addHelp(
      new FunctionHelp("readMap", "", "Reads a map saved by the PIXLISE client library's saveMap functionality", OriginID, [
        new FunctionParamHelp("key", "Unique key to identify the map to read"),
      ])
    );

    help.addHelp(new FunctionHelp("getVariogramInputs", "", "For use with Variograms", OriginID, []));
  }

  static makeMapFunctionHelp(help: SourceHelp, asModule: boolean): void {
    const OriginID = "";

    const moduleName = asModule ? "Map" : "";

    // --- Map operations
    help.addHelp(
      new FunctionHelp(
        "threshold",
        moduleName,
        "Returns a map with where the value of each PMC in the source map is checked to be within compare +/- threshold range, if so, a 1 is returned, but if it's outside the range, 0 is returned",
        OriginID,
        [
          new FunctionParamHelp("map", "The map to threshold"),
          new FunctionParamHelp("compare", "The comparison value"),
          new FunctionParamHelp("range", "The range of comparison (used as +/- around the compare value)"),
        ]
      )
    );

    help.addHelp(
      new FunctionHelp(
        "normalise",
        moduleName,
        "Normalises a map by finding the min and max value, then computing each PMCs value as a percentage between that min and max, so all output values range between 0.0 and 1.0",
        OriginID,
        [new FunctionParamHelp("map", "The map to normalise")]
      )
    );

    help.addHelp(
      new FunctionHelp("pow", moduleName, "Calculates pow of each map PMC value, to the given exponent", OriginID, [
        new FunctionParamHelp("value", "The map (or scalar) to raise to a power. If a scalar is used, all map values created will be the same."),
        new FunctionParamHelp("exponent", "Exponent to raise value to"),
      ])
    );

    help.addHelp(
      new FunctionHelp("under", moduleName, "Returns a map where value is 1 if less than reference, else 0", OriginID, [
        new FunctionParamHelp("map", "The map to operate on"),
        new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "under_undef",
        moduleName,
        "Returns a map where value is 1 if less than reference, else undefined (will leave holes in context image maps for example!)",
        OriginID,
        [new FunctionParamHelp("map", "The map to operate on"), new FunctionParamHelp("reference", "The value to use as a reference for the operation")]
      )
    );

    help.addHelp(
      new FunctionHelp("over", moduleName, "Returns a map where value is 1 if greater than reference, else 0", OriginID, [
        new FunctionParamHelp("map", "The map to operate on"),
        new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "over_undef",
        moduleName,
        "Returns a map where value is 1 if greater than reference, else undefined (will leave holes in context image maps for example!",
        OriginID,
        [new FunctionParamHelp("map", "The map to operate on"), new FunctionParamHelp("reference", "The value to use as a reference for the operation")]
      )
    );

    help.addHelp(
      new FunctionHelp("avg", moduleName, "Returns a map which is the average of the 2 parameters specified", OriginID, [
        new FunctionParamHelp("map", "The map to operate on"),
        new FunctionParamHelp("value", "May be a map or scalar, to calculate the average from using the first map parameter"),
      ])
    );

    help.addHelp(
      new FunctionHelp("min", moduleName, "Returns a map which is the minimum of the 2 parameters specified", OriginID, [
        new FunctionParamHelp("map", "The map to operate on"),
        new FunctionParamHelp("value", "May be a map or scalar, to find the minimum from using the first map parameter"),
      ])
    );

    help.addHelp(
      new FunctionHelp("max", moduleName, "Returns a map which is the maximum of the 2 parameters specified", OriginID, [
        new FunctionParamHelp("map", "The map to operate on"),
        new FunctionParamHelp("value", "May be a map or scalar, to find the maximum from using the first map parameter"),
      ])
    );

    help.addHelp(
      new FunctionHelp(
        "ln",
        moduleName,
        "Returns a map where each PMC contains the natural logarithm of the given value (or the corresponding PMCs value if the parameter is a map)",
        OriginID,
        [new FunctionParamHelp("value", "May be a map or scalar")]
      )
    );

    help.addHelp(
      new FunctionHelp(
        "exp",
        moduleName,
        "Returns a map where each PMC contains the e raised to the value (or the corresponding PMCs value if the parameter is a map)",
        OriginID,
        [new FunctionParamHelp("value", "May be a map or scalar")]
      )
    );

    help.addHelp(
      new FunctionHelp("add", moduleName, "Calculates a + b. If one is a scalar, it is treated a map", OriginID, [
        new FunctionParamHelp("a", "May be a map or scalar"),
        new FunctionParamHelp("b", "May be a map or scalar"),
      ])
    );

    help.addHelp(
      new FunctionHelp("sub", moduleName, "Calculates a - b. If one is a scalar, it is treated a map", OriginID, [
        new FunctionParamHelp("a", "May be a map or scalar"),
        new FunctionParamHelp("b", "May be a map or scalar"),
      ])
    );

    help.addHelp(
      new FunctionHelp("mul", moduleName, "Calculates a multiplied by b (a * b). If one is a scalar, it is treated a map", OriginID, [
        new FunctionParamHelp("a", "May be a map or scalar"),
        new FunctionParamHelp("b", "May be a map or scalar"),
      ])
    );

    help.addHelp(
      new FunctionHelp("div", moduleName, "Calculates a divided by b (a / b). If one is a scalar, it is treated a map", OriginID, [
        new FunctionParamHelp("a", "May be a map or scalar"),
        new FunctionParamHelp("b", "May be a map or scalar"),
      ])
    );

    // These didn't exist pre-module
    if (asModule) {
      help.addHelp(
        new FunctionHelp(
          "And",
          moduleName,
          "Calculates a And b (logical and, resulting map PMCs are 1 if a=1 and b=1). If one is a scalar, it is treated a map",
          OriginID,
          [new FunctionParamHelp("a", "May be a map or scalar"), new FunctionParamHelp("b", "May be a map or scalar")]
        )
      );

      help.addHelp(
        new FunctionHelp(
          "Or",
          moduleName,
          "Calculates a Or b (logical or, resulting map PMCs are 0 if a=0 and b=0). If one is a scalar, it is treated a map",
          OriginID,
          [new FunctionParamHelp("a", "May be a map or scalar"), new FunctionParamHelp("b", "May be a map or scalar")]
        )
      );

      help.addHelp(
        new FunctionHelp("Not", moduleName, "Calculates logical Not of m, so if any PMC in m is 0, result will have 1, otherwise 0", OriginID, [
          new FunctionParamHelp("m", "Must be a map"),
        ])
      );
    }
  }

  static makeTrigFunctionHelp(help: SourceHelp): void {
    const OriginID = "";

    // --- Trig functions
    const trigFuncs = ["sin", "cos", "tan", "asin", "acos", "atan"];

    for (const f of trigFuncs) {
      help.addHelp(
        new FunctionHelp(f, "", "Returns a map where each PMC value is " + f + " of the given angle (or map of angles)", OriginID, [
          new FunctionParamHelp("angle", "Angle in radians"),
        ])
      );
    }
  }
}
