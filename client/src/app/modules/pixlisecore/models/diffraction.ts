export const diffractionPeakWidth = 15; // TODO: set this right!

export class DiffractionPeak {
  public static readonly statusUnspecified = "unspecified";
  public static readonly statusNotAnomaly = "not-anomaly";
  public static readonly diffractionPeak = "diffraction-peak";
  public static readonly roughnessPeak = "intensity-mismatch";

  public static readonly statusToLabelMap = new Map<string, string>([
    ["other", "Other"],
    [DiffractionPeak.roughnessPeak, "Intensity Mismatch"], // Roughness
    [DiffractionPeak.diffractionPeak, "Diffraction Peak"],
    [DiffractionPeak.statusNotAnomaly, "Not Anomaly"], // Manually overriden
    [DiffractionPeak.statusUnspecified, "Unspecified"], // User Specified
  ]);

  private _id: string = "";

  constructor(
    public pmc: number,

    // Raw data values
    public effectSize: number,
    public baselineVariation: number,
    public globalDifference: number,
    public differenceSigma: number,
    public peakHeight: number,
    public detector: string,
    public channel: number,

    // keV values are calculated based on calibration
    public keV: number,

    public kevStart: number,
    public kevEnd: number,

    // Thought we'd be operating on these, but raw data doesn't (yet?) contain it
    //public confidence: number,
    //public skew: number,
    public status: string, // one of the keys in statusToLabelMap
    id: string = ""
  ) {
    this._id = id;
    if (!this._id) {
      this._id = this.pmc + "-" + this.channel;
    }
  }

  get id(): string {
    return this._id;
  }
}

const roughnessIDPrefix = "roughness-";

export class RoughnessItem {
  private _id: string = "";

  constructor(
    public pmc: number,
    public globalDifference: number,
    public deleted: boolean,
    id: string = ""
  ) {
    this._id = id;
    if (!this._id) {
      this._id = roughnessIDPrefix + this.pmc;
    }
  }

  get id(): string {
    return this._id;
  }
}
