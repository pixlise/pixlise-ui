import { UNICODE_GREEK_LOWERCASE_PSI } from "../utils/utils";
import { DataExpressionId } from "./expression-id";

export class ShortName {
  constructor(
    public shortName: string,
    public name: string
  ) {}
}

export function getExpressionShortDisplayName(charLimit: number, id: string, expressionName: string): ShortName {
  const result = new ShortName(id, id);

  result.shortName = expressionName;
  result.name = expressionName;

  let elem = DataExpressionId.getPredefinedQuantExpressionElement(id);
  if (elem.length > 0) {
    // For example, FeO-T becomes FeOᴛ
    if (elem.endsWith("-T")) {
      result.shortName = elem.substring(0, elem.length - 2) + "ᴛ";
    } else {
      result.shortName = elem;
    }

    // Add the detector if there is one specified!
    let det = DataExpressionId.getPredefinedQuantExpressionDetector(id);
    if (det.length > 0) {
      // If it's combined, we show something shorter...
      if (det == "Combined") {
        det = "A&B";
      }
      result.shortName += "-" + det;
    }
  } else {
    elem = DataExpressionId.getPredefinedPseudoIntensityExpressionElement(id);
    if (elem.length > 0) {
      result.shortName = UNICODE_GREEK_LOWERCASE_PSI + elem;
    } else {
      // If it's too long, show f(elem)
      if (result.shortName.length > charLimit) {
        // Cut it short
        result.shortName = result.shortName.substring(0, charLimit) + "...";
      }
    }
  }

  return result;
}
