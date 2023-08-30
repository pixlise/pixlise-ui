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

export class DatasetFilter {
  constructor(
    public solMin: string | null,
    public solMax: string | null,

    public target: string | null,

    public site: string | null,

    public drive: string | null,

    public detectorChosen: string | null,

    public hasDwell: boolean | null,
    public hasQuant: boolean | null,
    public hasNormal: boolean | null,

    public pmcsMin: string | null,
    public pmcsMax: string | null
  ) {}

  clear(): void {
    this.solMin = null;
    this.solMax = null;

    this.target = null;

    this.site = null;

    this.drive = null;

    this.detectorChosen = null;

    this.hasDwell = null;
    this.hasQuant = null;
    this.hasNormal = null;

    this.pmcsMin = null;
    this.pmcsMax = null;
  }

  copy(): DatasetFilter {
    return new DatasetFilter(
      this.solMin,
      this.solMax,

      this.target,

      this.site,

      this.drive,

      this.detectorChosen,

      this.hasDwell,
      this.hasQuant,
      this.hasNormal,

      this.pmcsMin,
      this.pmcsMax
    );
  }

  itemCount(): number {
    let c = 0;

    let check = [this.target, this.site, this.drive, this.detectorChosen, this.hasDwell, this.hasQuant, this.hasNormal];

    for (let item of check) {
      if (item) {
        c++;
      }
    }

    if (this.solMin || this.solMax) {
      c++;
    }

    if (this.pmcsMin || this.pmcsMax) {
      c++;
    }

    return c;
  }

  toSearchString(): string {
    let result = "";

    if (this.solMin || this.solMax) {
      if (this.solMin == this.solMax) {
        result = DatasetFilter.appendTerm(result, "sol=" + this.solMin);
      } else if (this.solMin && this.solMax) {
        result = DatasetFilter.appendTerm(result, "sol=bw|" + this.solMin + "|" + this.solMax);
      } else {
        if (this.solMin) {
          result = DatasetFilter.appendTerm(result, "sol>" + this.solMin);
        }

        if (this.solMax) {
          result = DatasetFilter.appendTerm(result, "sol<" + this.solMax);
        }
      }
    }

    if (this.target) {
      result = DatasetFilter.appendTerm(result, "target_id=" + this.target);
    }

    if (this.site) {
      result = DatasetFilter.appendTerm(result, "site_id=" + this.site);
    }

    if (this.drive) {
      result = DatasetFilter.appendTerm(result, "drive_id=" + this.drive);
    }

    if (this.detectorChosen) {
      result = DatasetFilter.appendTerm(result, "detector_config=" + this.detectorChosen);
    }

    if (this.hasDwell) {
      result = DatasetFilter.appendTerm(result, "dwell_spectra>0");
    }

    if (this.hasQuant) {
      result = DatasetFilter.appendTerm(result, "quant_count>0");
    }

    if (this.hasNormal) {
      result = DatasetFilter.appendTerm(result, "normal_spectra>0");
    }

    if (this.pmcsMin || this.pmcsMax) {
      if (this.pmcsMin == this.pmcsMax) {
        result = DatasetFilter.appendTerm(result, "location_count=" + this.pmcsMin);
      } else if (this.pmcsMin && this.pmcsMax) {
        result = DatasetFilter.appendTerm(result, "location_count=bw|" + this.pmcsMin + "|" + this.pmcsMax);
      } else {
        if (this.pmcsMin) {
          result = DatasetFilter.appendTerm(result, "location_count>" + this.pmcsMin);
        }

        if (this.pmcsMax) {
          result = DatasetFilter.appendTerm(result, "location_count<" + this.pmcsMax);
        }
      }
    }

    return DatasetFilter.makeSendableSearchString(result);
  }

  public static appendTerm(str: string, term: string): string {
    if (!str) {
      return term;
    }

    return str + ";" + term;
  }

  public static makeSendableSearchString(search: string): string {
    // Replace spaces, comma or ; in search text with & so we have:
    // sol=10 rt=123
    // sol=10, rt=123
    // sol=10;rt=123
    // all become:
    // sol=10&rtt=123
    search = search.replace(/[,; ] */g, "&");

    // Also anything with > or < in it becomes:
    // sol>10 -> sol=gt|10
    // sol<10 -> sol=lt|10
    search = search.replace(/([a-zA-Z0-9_]+)>([a-zA-Z0-9_]+)/g, "$1=gt|$2");
    search = search.replace(/([a-zA-Z0-9_]+)<([a-zA-Z0-9_]+)/g, "$1=lt|$2");
    return search;
  }
}
