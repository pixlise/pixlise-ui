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
