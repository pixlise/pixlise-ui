import { QuantificationSummary } from "../generated-protos/quantification-meta";
import { periodicTableDB } from "../periodic-table/periodic-table-db";

export class QuantModes {
  // Enums that we may get back from API (quant summary.params.quantMode)
  public static readonly quantModeCombined = "Combined";
  public static readonly quantModeAB = "AB";
  public static readonly quantModeBulkCombined = "CombinedBulk";
  public static readonly quantModeBulkAB = "ABBulk";
  public static readonly quantModeManualCombined = "CombinedManual";
  public static readonly quantModeManualAB = "ABManual";
  public static readonly quantModeMultiQuantCombined = "CombinedMultiQuant";
  public static readonly quantModeMultiQuantAB = "ABMultiQuant";
  // Unfortunately we had a period where this was valid
  //public static readonly quantModeManual = "Manual";

  public static getQuantDetectors(mode: string): string {
    if (mode.startsWith("AB")) {
      return "A/B";
    } else if (mode.startsWith("Combined")) {
      return "Combined";
    }
    return "?";
  }

  public static getQuantMethod(mode: string): string {
    if (mode.endsWith("Bulk")) {
      return "Sum-First";
    } else if (mode.endsWith("Manual")) {
      return "Manual";
    } else if (mode.endsWith("MultiQuant")) {
      return "Multi";
    }

    // Otherwise assume it's a per PMC map, which we display as blank, as it's
    // our old mode we're used to
    //return "Per PMC";
    return "";
  }

  public static getShortDescription(mode: string): string {
    let desc = QuantModes.getQuantDetectors(mode);
    const method = QuantModes.getQuantMethod(mode);
    if (method) {
      desc += "(" + method + ")";
    }
    return desc;
  }
}

export class QuantifiedElements {
  constructor(
    public carbonates: boolean,
    public nonElementSymbols: string[],
    public elementAtomicNumbers: number[],
    public ignoreAr: boolean
  ) {}
}

export const getQuantifiedElements = (summary: QuantificationSummary): QuantifiedElements => {
  if (!summary.params) {
    return new QuantifiedElements(false, [], [], false);
  }

  const result = new QuantifiedElements(
    // If CO3 was in the param element list, it was quantified as carbonates
    (summary.params.userParams?.elements || []).indexOf("CO3") > -1,
    [],
    [],
    // If Ar_I was in the param element list, it was set to ignore Argon
    (summary.params.userParams?.elements || []).indexOf("Ar_I") > -1
  );

  // Run through all elements and get their symbol or atomic number
  // NOTE: Due to originally only having the parameter elements stored, if we don't have
  //       any elements in the quant summary, we fall back to reading the parameters.
  //       This should be fairly future proof because it's unlikely that a quant can have
  //       nothing quantified, that should result in an error...
  let elemList = summary.elements;
  if (elemList.length <= 0) {
    elemList = summary.params.userParams?.elements || []; // May contain Ar_I
  }

  for (const symbol of elemList) {
    // CO3 won't be in summary.elements, but due to the above fallback, we still need to filter it out
    // Ar_I, as above, won't be in summary.elements...
    // As of July 2022 we allow users to ignore Argon using the Ar_I "special" element passed to PIQUANT.
    // This would error in for anything trying to parse it so exclude it here
    if (symbol != "CO3" && symbol != "Ar_I") {
      const elem = periodicTableDB.getElementOxidationState(symbol);
      if (elem && elem.isElement) {
        // It's an element
        result.elementAtomicNumbers.push(elem.Z);
      } else {
        result.nonElementSymbols.push(symbol);
      }
    }
  }

  return result;
};
