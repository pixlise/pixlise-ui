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

export class DataExpressionId {
  public static NewExpression = "new-expression";
  public static NewModule = "new-module";
  public static UnsavedExpressionPrefix = "unsaved-";

  private static PredefinedPseudoIntensityLayerPrefix = "pseudo-";
  private static PredefinedQuantDataLayerPrefix = "data-";
  private static PredefinedQuantElementLayerPrefix = "elem-";
  private static PredefinedLayerPrefix = "expr-";
  private static PredefinedLayerRoughness = "roughness";
//  private static PredefinedLayerDiffractionCounts = "diffraction";
  private static SuffixUnquantified = "unquantified";
  private static SuffixZHeight = "zheight";

  // Static functions for getting/accessing/parsing predefined expression IDs
  public static isPredefinedNewID(id: string): boolean {
    id = id ? id.toLowerCase() : "";
    return [DataExpressionId.NewExpression, DataExpressionId.NewModule].includes(id);
  }

  public static isUnsavedExpressionId(id: string): boolean {
    return id?.startsWith(DataExpressionId.UnsavedExpressionPrefix);
  }

  public static isPredefinedExpression(id: string): boolean {
    return id?.startsWith(DataExpressionId.PredefinedLayerPrefix);
  }
  public static isPredefinedQuantExpression(id: string): boolean {
    return id?.startsWith(DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix);
  }
  public static getPredefinedPseudoIntensityExpressionElement(id: string): string {
    const prefix = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedPseudoIntensityLayerPrefix;
    if (!id?.startsWith(prefix)) {
      return "";
    }

    return id.substring(prefix.length);
  }

  // Returns '' if it's not the right kind of id
  public static getPredefinedQuantExpressionElement(id: string): string {
    const prefix = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix;

    // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err, %-as-mmol>
    if (!id?.startsWith(prefix)) {
      return "";
    }

    // Check for column
    const remainder = id.substring(prefix.length);
    let lastDash = remainder.lastIndexOf("-");

    // If it ends with %-as-mmol we have to use a different idx here
    const asMmolIdx = remainder.indexOf("-%-as-mmol");
    if (asMmolIdx > 0) {
      lastDash = asMmolIdx;
    }

    if (lastDash < 0) {
      return "";
    }

    return remainder.substring(0, lastDash);
  }

  // Returns '' if it's not the right kind of id
  public static getPredefinedQuantExpressionElementColumn(id: string): string {
    const prefix = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix;

    // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err>
    if (!id?.startsWith(prefix)) {
      return "";
    }

    // Check for column
    const remainder = id.substring(prefix.length);
    let lastDash = remainder.lastIndexOf("-");

    // If it ends with %-as-mmol we have to use a different idx here
    const asMmolIdx = remainder.indexOf("-%-as-mmol");
    if (asMmolIdx > 0) {
      lastDash = asMmolIdx;
    }

    if (lastDash < 0) {
      return "";
    }

    let result = remainder.substring(lastDash + 1);

    // If result has (A), (B) or (Combined), snip that off
    if (result.endsWith("(A)") || result.endsWith("(B)") || result.endsWith("(Combined)")) {
      const bracketIdx = result.lastIndexOf("(");
      result = result.substring(0, bracketIdx);
    }

    return result;
  }

  // Returns detector part of a predefiend expression id:
  // expr-elem-
  public static getPredefinedQuantExpressionDetector(id: string): string {
    const elemPrefix = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix;
    const dataPrefix = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantDataLayerPrefix;

    // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err> OR a data column
    if (!id?.startsWith(elemPrefix) && !id.startsWith(dataPrefix)) {
      return "";
    }

    // Check end
    const detectorPossibilities = DataExpressionId.getPossibleDetectors();
    for (const det of detectorPossibilities) {
      if (id.endsWith("(" + det + ")")) {
        const bracketIdx = id.lastIndexOf("(");
        id = id.substring(bracketIdx);

        // Snip off the brackets
        return id.substring(1, id.length - 1);
      }
    }

    // None specified
    return "";
  }

  public static getExpressionWithoutDetector(id: string): string {
    // If the detector is specified, this removes it... bit ugly/hacky but needed in case of comparing
    // active expression IDs where we don't want the selected detector to confuse things
    const detectorPossibilities = DataExpressionId.getPossibleDetectors();

    for (const det of detectorPossibilities) {
      if (id.endsWith("(" + det + ")")) {
        return id.substring(0, id.length - 2 - det.length);
      }
    }
    return id;
  }

  // Instead of hard-coding it in multiple places...
  private static getPossibleDetectors(): string[] {
    return ["A", "B", "Combined"];
  }

  public static makePredefinedQuantElementExpression(element: string, column: string, detector: string = ""): string {
    let result = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix + element + "-" + column;
    if (detector.length > 0) {
      result += "(" + detector + ")";
    }
    return result;
  }
  public static makePredefinedPseudoIntensityExpression(pseudoElem: string): string {
    return DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedPseudoIntensityLayerPrefix + pseudoElem;
  }
  public static makePredefinedQuantDataExpression(column: string, detector: string): string {
    let result = DataExpressionId.predefinedQuantDataExpression + column;
    if (detector) {
      result += "(" + detector + ")";
    }
    return result;
  }
  public static readonly predefinedUnquantifiedPercentDataExpression =
    DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantElementLayerPrefix + DataExpressionId.SuffixUnquantified;
  public static readonly predefinedRoughnessDataExpression = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedLayerRoughness;

  // Temporarily disabled - previously this referenced an expression that could be changed by user selecting bars on the diffraction histogram (sidebar)
  // public static readonly predefinedDiffractionCountDataExpression =
  //   DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedLayerDiffractionCounts;

  public static readonly predefinedHeightZDataExpression = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.SuffixZHeight;
  public static readonly predefinedQuantDataExpression = DataExpressionId.PredefinedLayerPrefix + DataExpressionId.PredefinedQuantDataLayerPrefix;

  public static hasPseudoIntensityExpressions(exprIds: string[]): boolean {
    for (const exprId of exprIds) {
      if (DataExpressionId.getPredefinedPseudoIntensityExpressionElement(exprId).length > 0) {
        return true;
      }
    }
    return false;
  }
}
