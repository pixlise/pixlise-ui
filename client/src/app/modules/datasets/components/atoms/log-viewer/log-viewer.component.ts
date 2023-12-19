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

import { AfterViewInit, Component, ElementRef, Input, ViewChild } from "@angular/core";

import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { LogReadReq, LogReadResp } from "src/app/generated-protos/log-msgs";
import { LogLine } from "src/app/generated-protos/log";

// TODO import { LayoutService } from "src/app/services/layout.service";
import { httpErrorToString } from "src/app/utils/utils";

const logAutoRetrieveLimit = 10; // 10 requests

@Component({
  selector: "log-viewer",
  templateUrl: "./log-viewer.component.html",
  styleUrls: ["./log-viewer.component.scss"],
})
export class LogViewerComponent implements AfterViewInit {
  @Input() title: string = "";
  @Input() logID: string = "";

  @ViewChild("logdata", { read: ElementRef }) private _logDataElem!: ElementRef<any>;

  logData: LogLine[] = [];

  private _logAutoRetrieveCount: number = 0;
  private _loading: boolean = false;

  constructor(private _dataService: APIDataService) {}

  ngAfterViewInit(): void {
    this.onRefreshLog();
  }

  onRefreshLog(): void {
    if (!this.logID) {
      return;
    }

    this._loading = true;
    this._dataService.sendLogReadRequest(LogReadReq.create({ logStreamId: this.logID })).subscribe({
      next: (resp: LogReadResp) => {
        this._loading = false;
        if (resp.entries.length > this.logData.length) {
          this.logData = resp.entries;
          this.scrollLogToBottom();
        }

        this.scheduleRefresh();
      },
      error: err => {
        this._loading = false;
        this.logData = [
          LogLine.create({
            timeStampUnixSec: Date.now() / 1000,
            timeStampMs: 0,
            message: httpErrorToString(err, "Failed to retrieve log, maybe it isn't created yet?"),
          }),
        ];

        // Auto-retry anyway, we may have only got a 404 because log isn't yet created/available!
        this.scheduleRefresh();
      },
    });
  }

  private scrollLogToBottom() {
    const elem = this._logDataElem.nativeElement;
    if (elem) {
      elem.scrollTop = elem.scrollHeight;
    }
  }

  private scheduleRefresh() {
    this._logAutoRetrieveCount++;

    if (this._logAutoRetrieveCount < logAutoRetrieveLimit) {
      setTimeout(() => {
        this.onRefreshLog();
      }, 2000);
    }
  }

  get loading(): boolean {
    return this._loading;
  }

  getTimestamp(line: LogLine): number {
    return line.timeStampUnixSec * 1000 + line.timeStampMs;
  }
}
