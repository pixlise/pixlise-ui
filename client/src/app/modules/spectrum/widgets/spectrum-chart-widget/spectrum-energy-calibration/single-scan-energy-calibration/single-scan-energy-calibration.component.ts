import { Component, Input, OnInit } from "@angular/core";
import { ScanItem } from "src/app/generated-protos/scan";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { httpErrorToString } from "src/app/utils/utils";

export class SingleScanEnergyCalibration {
  constructor(
    public scan: ScanItem,
    public quantId: string,
    public calibration: SpectrumEnergyCalibration[]
  ) {}
}

@Component({
  selector: "single-scan-energy-calibration",
  templateUrl: "./single-scan-energy-calibration.component.html",
  styleUrls: ["./single-scan-energy-calibration.component.scss"],
})
export class SingleScanEnergyCalibrationComponent implements OnInit {
  @Input() calibration: SingleScanEnergyCalibration | null = null;

  eVStartA: string = "";
  eVPerChannelA: string = "";

  eVStartB: string = "";
  eVPerChannelB: string = "";

  // Stuff we load
  private _scanCalibration: SpectrumEnergyCalibration[] = [];
  private _originalCalibration: SpectrumEnergyCalibration[] = [];

  constructor(private _energyCalibrationService: EnergyCalibrationService) {}

  ngOnInit(): void {
    if (!this.calibration) {
      return;
    }

    // Remember this for future...
    this._originalCalibration = this.cloneCalibration(this.calibration.calibration);

    // Use the current one
    this.onLoadCurrent();

    // Get the scan calibration so we can manipulate with it
    this._energyCalibrationService.getScanCalibration(this.calibration.scan.id).subscribe(cal => {
      this._scanCalibration = cal;
    });
  }

  private setCalibration(cal: SpectrumEnergyCalibration[]) {
    if (!this.calibration) {
      return;
    }

    // Clear
    this.eVStartA = "";
    this.eVPerChannelA = "";

    this.eVStartB = "";
    this.eVPerChannelB = "";

    // Remember this is what's currently set
    this.calibration.calibration = this.cloneCalibration(cal);

    // Set it on the dialog too
    for (let c = 0; c < cal.length; c++) {
      const item = cal[c];
      if (item.detector == "A") {
        this.eVStartA = item.eVstart.toFixed(3);
        this.eVPerChannelA = item.eVperChannel.toFixed(3);
      } else {
        this.eVStartB = item.eVstart.toFixed(3);
        this.eVPerChannelB = item.eVperChannel.toFixed(3);
      }
    }
  }

  get editDisabled(): boolean {
    return false;
  }

  private cloneCalibration(cals: SpectrumEnergyCalibration[]) {
    const copy: SpectrumEnergyCalibration[] = [];
    for (const cal of cals) {
      copy.push(new SpectrumEnergyCalibration(cal.eVstart, cal.eVperChannel, cal.detector));
    }
    return copy;
  }

  onLoadCurrent() {
    if (!this.calibration) {
      return;
    }

    // Read the calibration from the one passed to this dialog on startup
    this.setCalibration(this._originalCalibration);
  }

  get hasDatasetCalibration(): boolean {
    return this._scanCalibration.length > 0;
  }

  onLoadDataset() {
    if (this._scanCalibration.length <= 0) {
      return;
    }

    this.setCalibration(this._scanCalibration);
  }

  get hasQuantCalibration(): boolean {
    return (this.calibration?.quantId.length || 0) > 0;
  }

  onLoadQuant() {
    const scanId = this.calibration?.scan.id || "";
    if (scanId.length <= 0) {
      alert("Failed to get scan id for quantification when loading calibration");
    }

    const quantId = this.calibration?.quantId || "";
    if (quantId.length <= 0) {
      alert(`Failed to get quant id set for scan ${scanId} when loading calibration`);
    }

    this._energyCalibrationService.getQuantCalibration(scanId, quantId).subscribe({
      next: (calibration: SpectrumEnergyCalibration[]) => {
        this.setCalibration(calibration);
      },
      error: (err: any) => {
        alert(httpErrorToString(err, "Failed to get quant data for calibration"));
      },
    });
  }

  onValueChanged(): void {
    this.readUserEntry();
  }

  private readUserEntry() {
    // Make sure they are valid strings
    const eVStartNumA = Number.parseFloat(this.eVStartA);
    const eVPerChannelNumA = Number.parseFloat(this.eVPerChannelA);

    const eVStartNumB = Number.parseFloat(this.eVStartB);
    const eVPerChannelNumB = Number.parseFloat(this.eVPerChannelB);

    // if (isNaN(eVStartNumA) || isNaN(eVPerChannelNumA) || isNaN(eVStartNumB) || isNaN(eVPerChannelNumB)) {
    //   alert("Please enter a number for eV Start and eV per channel for each detector.");
    //   return;
    // }

    // if (eVPerChannelNumA <= 0 || eVPerChannelNumB <= 0) {
    //   alert("eV per channel values must be greater than 0");
    //   return;
    // }

    // Read them into whatever scan ID is asked
    this.setCalibration([new SpectrumEnergyCalibration(eVStartNumA, eVPerChannelNumA, "A"), new SpectrumEnergyCalibration(eVStartNumB, eVPerChannelNumB, "B")]);
  }
}
