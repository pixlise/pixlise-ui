import { OwnershipItem, OwnershipSummary } from "src/app/generated-protos/ownership-access";
import { DataExpression } from "../generated-protos/expressions";
import { DataExpressionId } from "./expression-id";
import { EXPR_LANGUAGE_PIXLANG } from "./expression-language";
import { UserInfo } from "src/app/generated-protos/user";

export const DefaultDetectorId = "Default";

// Returns a predefined expression. The only complication is what detector to have in the expression generated!
// Previously we used to pass in the valid detector list and it would pick the first one (meaning A or Combined)
// but at time of writing we may introduce a new concept of the "default" detector, which the expression
// language will look up at runtime, as the user may want to choose a different detector for a given scans quant
export function getPredefinedExpression(id: string): DataExpression | undefined {
  // Form the expression based on the ID passed in
  let name = "";
  let expr = "";

  // Default means if the expression ID didn't specify one, use whatever is the
  // user-chosen "active" detector for the given quant
  let detectorId = DefaultDetectorId;

  // We don't want to add -Combined or -Default to the expression name, only add if it's something else
  const detectorSuffix = ["Combined", DefaultDetectorId].indexOf(detectorId) == -1 ? "-" + detectorId : "";

  const exprDetector = DataExpressionId.getPredefinedQuantExpressionDetector(id);
  if (exprDetector.length > 0) {
    detectorId = exprDetector;
  }

  const elem = DataExpressionId.getPredefinedQuantExpressionElement(id);
  if (elem.length > 0) {
    const column = DataExpressionId.getPredefinedQuantExpressionElementColumn(id);

    if (column.length > 0) {
      expr = "element('" + elem + "','" + column + "','" + detectorId + "')";
      name = elem + " " + getPrintableColumnName(column) + detectorSuffix;
    }
  } else {
    // If the element is actually saying we want the unquantified expression, return that
    if (id.startsWith(DataExpressionId.predefinedUnquantifiedPercentDataExpression)) {
      expr = '100-elementSum("%","' + detectorId + '")';
      name = "Unquantified Weight %" + detectorSuffix;
    } else if (id === DataExpressionId.predefinedHeightZDataExpression) {
      expr = 'position("z")';
      name = "Height in Z";
    } else if (id === DataExpressionId.predefinedRoughnessDataExpression) {
      expr = "roughness()";
      name = "Roughness";
    } else if (id === DataExpressionId.predefinedDiffractionCountDataExpression) {
      expr = "diffractionPeaks(0,4096)";
      name = "Diffraction Count";
    } else {
      const pseudoElem = DataExpressionId.getPredefinedPseudoIntensityExpressionElement(id);
      if (pseudoElem.length > 0) {
        expr = "pseudo('" + pseudoElem + "')";
        name = "Pseudo " + pseudoElem;
      } else if (id.startsWith(DataExpressionId.predefinedQuantDataExpression)) {
        // Now get the column (sans detector in case it's specified)
        const idWithoutDetector = DataExpressionId.getExpressionWithoutDetector(id);

        const bits = idWithoutDetector.split("-");
        const col = bits[2];

        expr = "data('" + col + "','" + detectorId + "')";
        name = col;

        if (name == "chisq") {
          name = "Chi\u00B2 uncertainty/spectrum";
        }
        name += detectorSuffix;
      }
    }
  }

  if (expr.length <= 0) {
    return undefined;
  }

  const result = DataExpression.create({
    id: id,
    name: name,
    sourceCode: expr,
    sourceLanguage: EXPR_LANGUAGE_PIXLANG,
    comments: "Built-in expression",
    owner: OwnershipSummary.create({
      creatorUser: UserInfo.create({
        id: DataExpressionId.BuiltInUserId,
        name: "Pixlise", // Builtin User Name
        iconURL: "assets/PIXLISE.svg", // Builtin User Icon
      }),
    }),
  });

  // Previously we used to do this, do we still need to? Does it even make sense?
  // Run the compatibility checker on this
  //result.checkQuantCompatibility(this._elementFormulae, this._validDetectors);

  return result;
}

// Converts quantification columns to a nicer printable name, eg % becomes Weight %, int becomes Int.
export function getPrintableColumnName(column: string): string {
  if (column == "%") {
    return "Weight %";
  }
  if (column == "int") {
    return "Int.";
  }
  if (column == "err") {
    return "Err.";
  }

  // If we don't have anything better to call it, use the column name as is
  return column;
}

export function getAnomalyExpressions(): DataExpression[] {
  let anomalyExpressions = [];

  let roughnessExpression = getPredefinedExpression(DataExpressionId.predefinedRoughnessDataExpression);
  if (roughnessExpression) {
    anomalyExpressions.push(roughnessExpression);
  }

  let diffractionExpression = getPredefinedExpression(DataExpressionId.predefinedDiffractionCountDataExpression);
  if (diffractionExpression) {
    anomalyExpressions.push(diffractionExpression);
  }

  let heightZExpression = getPredefinedExpression(DataExpressionId.predefinedHeightZDataExpression);
  if (heightZExpression) {
    anomalyExpressions.push(heightZExpression);
  }

  return anomalyExpressions;
}
