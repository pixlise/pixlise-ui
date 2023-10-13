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

import { ReplaySubject } from "rxjs";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";

export class EnergyCalibrationManager {
  // The currently applied calibration
  private _eVCalibrationA: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "A");
  private _eVCalibrationB: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "B");

  // What we read from dataset file (for bulk spectrum!)
  private _eVCalibrationFromDatasetBulkA: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "A");
  private _eVCalibrationFromDatasetBulkB: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "B");

  // What we read from Quant files
  private _eVCalibrationFromQuantA: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "A");
  private _eVCalibrationFromQuantB: SpectrumEnergyCalibration = new SpectrumEnergyCalibration(0, 1, "B");

  calibrationChanged$ = new ReplaySubject<void>(1);

  setDatasetCalibration(calib: SpectrumEnergyCalibration[]): void {
    if (calib.length != 2) {
      console.error("Specturm EnergyCalibration setDatasetCalibration did not receive A+B calibration");
      return;
    }

    const idxA = calib[0].detector == "A" ? 0 : 1;
    const idxB = calib[1].detector == "B" ? 0 : 1;

    this._eVCalibrationFromDatasetBulkA = calib[idxA];
    this._eVCalibrationFromDatasetBulkB = calib[idxB];

    console.log("BulkSum A eV calibration OFFSET=" + this._eVCalibrationFromDatasetBulkA.eVstart + ", XPERCHAN=" + this._eVCalibrationFromDatasetBulkA.eVperChannel);
    console.log("BulkSum B eV calibration OFFSET=" + this._eVCalibrationFromDatasetBulkB.eVstart + ", XPERCHAN=" + this._eVCalibrationFromDatasetBulkB.eVperChannel);
    this.setXAxisEnergyCalibration("reset()-AB-found", this._eVCalibrationFromDatasetBulkA, this._eVCalibrationFromDatasetBulkB);
  }

  setQuantificationeVCalibration(calib: SpectrumEnergyCalibration[]): void {
    if (calib.length <= 0) {
      this._eVCalibrationFromQuantA = new SpectrumEnergyCalibration(0, 1, "A");
      this._eVCalibrationFromQuantB = new SpectrumEnergyCalibration(0, 1, "B");
      console.warn("No quantification, eV configuration has been reset");
    } else {
      if (calib.length == 1) {
        // Same on both, they're Combined...
        this._eVCalibrationFromQuantA = calib[0];
        this._eVCalibrationFromQuantB = calib[0];
      } else {
        // We have a seprate A and B calibration. Make sure they get applied to the right detector in memory
        if (calib[0].detector == "B") {
          this._eVCalibrationFromQuantA = calib[1];
          this._eVCalibrationFromQuantB = calib[0];
        } else {
          this._eVCalibrationFromQuantA = calib[0];
          this._eVCalibrationFromQuantB = calib[1];
        }
      }

      console.warn(
        "eV configuration [A=" + this._eVCalibrationFromQuantA.toString() + ", B=" + this._eVCalibrationFromQuantB.toString() + "] read from quantification"
      );
      this.setXAxisEnergyCalibration("quant-subs", this._eVCalibrationFromQuantA, this._eVCalibrationFromQuantB);
    }
  }

  setXAxisEnergyCalibration(src: string, detectorA: SpectrumEnergyCalibration, detectorB: SpectrumEnergyCalibration): void {
    console.log("setXAxisEnergyCalibration reason: " + src);
    //console.log(detectorA);
    //console.log(detectorB);

    // Only respond if they're different
    if (this._eVCalibrationA.equals(detectorA) && !this._eVCalibrationB.equals(detectorB)) {
      return; // No change
    }

    this._eVCalibrationA = detectorA;
    this._eVCalibrationB = detectorB;

    this.calibrationChanged$.next();
  }

  channelTokeV(channel: number, detector: string) {
    let calibrated = 0;
    if (detector == "A") {
      calibrated = this._eVCalibrationA.eVstart + channel * this._eVCalibrationA.eVperChannel;
    } else {
      calibrated = this._eVCalibrationB.eVstart + channel * this._eVCalibrationB.eVperChannel;
    }
    return calibrated * 0.001; // keV conversion
  }

  keVToChannel(keV: number, detector: string) {
    const eV = keV * 1000;
    if (detector == "A") {
      return Math.floor((eV - this._eVCalibrationA.eVstart) / this._eVCalibrationA.eVperChannel);
    }
    return Math.floor((eV - this._eVCalibrationB.eVstart) / this._eVCalibrationB.eVperChannel);
  }

  get eVCalibrationA(): SpectrumEnergyCalibration {
    return this._eVCalibrationA;
  }

  get eVCalibrationB(): SpectrumEnergyCalibration {
    return this._eVCalibrationB;
  }

  get eVCalibrationFromDatasetBulkA(): SpectrumEnergyCalibration {
    return this._eVCalibrationFromDatasetBulkA;
  }

  get eVCalibrationFromDatasetBulkB(): SpectrumEnergyCalibration {
    return this._eVCalibrationFromDatasetBulkB;
  }

  get eVCalibrationFromQuantA(): SpectrumEnergyCalibration {
    return this._eVCalibrationFromQuantA;
  }

  get eVCalibrationFromQuantB(): SpectrumEnergyCalibration {
    return this._eVCalibrationFromQuantB;
  }
}
