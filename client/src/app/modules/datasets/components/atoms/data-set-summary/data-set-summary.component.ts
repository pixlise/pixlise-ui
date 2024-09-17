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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subscription } from "rxjs";
import { ScanDataType, ScanItem } from "src/app/generated-protos/scan";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { replaceAsDateIfTestSOL } from "src/app/utils/utils";

@Component({
  selector: "data-set-summary",
  templateUrl: "./data-set-summary.component.html",
  styleUrls: ["./data-set-summary.component.scss"],
})
export class DataSetSummaryComponent implements OnInit, OnDestroy, OnChanges {
  private _subs = new Subscription();

  @Input() summary: ScanItem | null = null;
  @Input() defaultImage: string | undefined = undefined;
  @Input() selected: ScanItem | null = null;
  @Input() isMultiSelected: boolean = false;
  @Output() onSelect = new EventEmitter();
  @Output() onCtrlSelect = new EventEmitter();

  private _title: string = "";
  private _missingData: string = "";
  private _thumbnail: string = "";

  constructor(private _endpointsService: APIEndpointsService) {}

  ngOnInit() {
    this.generateTitle();
  }

  generateTitle(summary: ScanItem | null = this.summary) {
    if (!summary) {
      return;
    }

    // Prepend SOL if it's there
    this._title = "";
    const sol = summary.meta["Sol"] || "";
    if (sol) {
      const testSOLAsDate = replaceAsDateIfTestSOL(sol);
      if (testSOLAsDate.length != sol.length) {
        this._title = testSOLAsDate + ": ";
      } else {
        this._title += "SOL-" + sol + ": ";
      }
    }
    this._title += summary.title;

    const missing = ""; // TODO: DataSetSummary.listMissingData(summary);
    if (missing.length > 0) {
      this._missingData = "Missing: " + Array.from(missing).join(",");
    } else {
      this._missingData = "";
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["defaultImage"] && this.defaultImage && !this._thumbnail) {
      // Load the thumbnail sized one
      let loadImg = this.defaultImage;
      /*const dotpos = loadImg.lastIndexOf(".");
      loadImg = loadImg.substring(0, dotpos - 1) + "-width240" + loadImg.substring(dotpos);*/
      loadImg += "?minwidth=240";
      this._endpointsService.loadImageForPath(loadImg).subscribe((img: HTMLImageElement) => {
        this._thumbnail = img.src;
      });
    }

    if (changes["summary"]) {
      this.generateTitle(changes["summary"].currentValue);
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get tileImage(): string {
    /* TODO:
        // Snip off the end and replace with context-thumb, which allows the API to work out the image to return
        let pos = this.summary.context_image_link.lastIndexOf("/");
        if(pos < 0)
        {
            return this.summary.context_image_link;
        }

        let url = this.summary.context_image_link.substring(0, pos+1)+"context-thumb";
        return url;
*/
    return this._thumbnail;
  }

  get title(): string {
    return this._title;
  }

  get incomplete(): boolean {
    return this._missingData.length > 0;
  }

  get missingDataList(): string {
    return this._missingData;
  }

  get isSelected(): boolean {
    if (!this.selected) {
      return false;
    }

    return this.selected?.id == this.summary?.id;
  }

  get isRGBU(): boolean {
    if (!this.summary) {
      return false;
    }

    for (const sdt of this.summary.dataTypes) {
      if (sdt.dataType == ScanDataType.SD_RGBU) {
        return sdt.count > 0;
      }
    }
    return false;
  }
  get isXRF(): boolean {
    return (this.summary?.contentCounts["NormalSpectra"] || 0) > 0;
  }

  get bulkSpectra(): number {
    return this.summary?.contentCounts["BulkSpectra"] || 0;
  }

  get maxSpectra(): number {
    return this.summary?.contentCounts["MaxSpectra"] || 0;
  }

  get normalSpectra(): number {
    return this.summary?.contentCounts["NormalSpectra"] || 0;
  }

  get dwellSpectra(): number {
    return this.summary?.contentCounts["DwellSpectra"] || 0;
  }

  get pseudoIntensities(): number {
    return this.summary?.contentCounts["PseudoIntensities"] || 0;
  }

  get displaySol(): string {
    const sol = this.summary?.meta["Sol"] || "";
    if (sol.length <= 0) {
      return "pre-mission";
    }
    return sol;
  }

  get displayTarget(): string {
    const target = this.summary?.meta["Target"] || "";
    if (target == "?" || target.length <= 0) {
      return "--";
    }

    return target;
  }

  get displayTargetId(): string {
    const targetId = this.summary?.meta["TargetId"] || "";
    if (targetId == "?" || targetId.length <= 0) {
      return "--";
    }

    return targetId;
  }

  get displayDriveID(): string {
    const driveId = this.summary?.meta["DriveId"] || "";
    if (driveId.length <= 0) {
      return "--";
    }
    return driveId;
  }

  get displaySite(): string {
    return this.summary?.meta["Site"] || "";
  }

  get summaryId(): string {
    return this.summary?.id || "";
  }

  onClickTileArea(event: MouseEvent): void {
    // Consume event so our parent doesn't get our clicks
    event.stopPropagation();

    if (this.summary == null) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      this.onCtrlSelect.emit(this.summary);
    } else {
      // Tell container we're clicked on
      this.onSelect.emit(this.summary);
    }
  }
}
