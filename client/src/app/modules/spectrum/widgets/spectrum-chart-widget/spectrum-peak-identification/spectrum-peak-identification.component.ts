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

import { Component, ComponentFactoryResolver, EventEmitter, Inject, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from "@angular/core";
import { Subscription, timer } from "rxjs";
import { BrowseOnChartComponent } from "./tabs/browse-on-chart.component";
import { ElementSetsComponent } from "./tabs/element-sets.component";
import { PeriodicTableTabComponent } from "./tabs/periodic-table-tab.component";
import { TabSelectors } from "./tab-selectors";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { SpectrumChartModel } from "../spectrum-model";
import { QuantJobsComponent } from "./tabs/quant-jobs.component";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { QuantCreateUpd } from "src/app/generated-protos/quantification-create";
import { JobStatus_JobType, JobStatus_Status } from "src/app/generated-protos/job";
import { JobListReq, JobListResp } from "src/app/generated-protos/job-msgs";
// import { AuthService } from "@auth0/auth0-angular";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { Permissions } from "src/app/utils/permissions";

export class SpectrumPeakIdentificationData {
  constructor(
    public mdl: SpectrumChartModel,
    public draggable: boolean
  ) {}
}

export class PeakIdentificationData {}

@Component({
  selector: "spectrum-peak-identification",
  templateUrl: "./spectrum-peak-identification.component.html",
  styleUrls: ["./spectrum-peak-identification.component.scss"],
})
export class SpectrumPeakIdentificationComponent implements OnInit, OnDestroy {
  @ViewChild("peakTab", { read: ViewContainerRef }) tabAreaContainer!: any;

  private _subs = new Subscription();

  private _tabComponent: any = null;
  private _tabSelector: string = "";

  @Output() onChange: EventEmitter<PeakIdentificationData> = new EventEmitter();

  jobsRunning: number = 0;

  userCanViewQuantJobs: boolean = false;

  constructor(
    private resolver: ComponentFactoryResolver,
    private _dataService: APIDataService,
    private _authService: AuthService,
    public dialogRef: MatDialogRef<SpectrumPeakIdentificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SpectrumPeakIdentificationData
  ) {}

  ngOnInit() {
    this._subs.add(
      this._dataService.quantCreateUpd$.subscribe((upd: QuantCreateUpd) => {
        this.updateJobsRunning();
      })
    );
    this._subs.add(
      this._authService.idTokenClaims$.subscribe(idToken => {
        if (idToken) {
          this.userCanViewQuantJobs = Permissions.hasPermissionSet(idToken, Permissions.permissionCreateQuantification);
        }
      })
    );

    // And for startup case:
    this.updateJobsRunning();
  }

  ngAfterViewInit() {
    // Run this after this function finished, else we get ExpressionChangedAfterItHasBeenCheckedError
    const source = timer(1);
    /*const sub =*/ source.subscribe(() => {
      this.onTabPeriodicTable();
    });
  }

  ngOnDestroy() {
    this.mdl.xrfNearMouse.clear();
    this.clearTabArea();
    this._subs.unsubscribe();
  }

  updateJobsRunning() {
    this._dataService.sendJobListRequest(JobListReq.create()).subscribe((jobListResp: JobListResp) => {
      this.jobsRunning = 0;

      for (const job of jobListResp.jobs) {
        if (job.jobType == JobStatus_JobType.JT_RUN_QUANT && job.status != JobStatus_Status.COMPLETE && job.status != JobStatus_Status.ERROR) {
          this.jobsRunning++;
        }
      }
    });
  }

  private get mdl(): SpectrumChartModel {
    return this.data.mdl;
  }

  onTabPeriodicTable() {
    this.setTab(TabSelectors.tabPeriodicTable);
  }

  onTabBrowseOnChart() {
    this.setTab(TabSelectors.tabBrowseOnChart);
  }

  onTabElementSets() {
    this.setTab(TabSelectors.tabElementSets);
  }

  onTabQuantJobs() {
    this.setTab(TabSelectors.tabQuantJobs);
  }

  onClose() {
    this.dialogRef.close();
  }

  get isPeriodicTableSelected(): boolean {
    return this._tabSelector == TabSelectors.tabPeriodicTable;
  }

  get isBrowseOnChartSelected(): boolean {
    return this._tabSelector == TabSelectors.tabBrowseOnChart;
  }

  get isElementSetsSelected(): boolean {
    return this._tabSelector == TabSelectors.tabElementSets;
  }

  get isQuantJobsSelected(): boolean {
    return this._tabSelector == TabSelectors.tabQuantJobs;
  }

  protected setTab(selector: string) {
    this.tabAreaContainer.clear();
    this.clearTabArea();

    const factory = this.makeComponentFactory(selector);
    if (!factory) {
      return;
    }

    //console.log('createUnderContextImageComponent made factory for: '+selector);
    this._tabComponent = this.tabAreaContainer.createComponent(factory);
    this._tabSelector = selector;

    if (selector == TabSelectors.tabBrowseOnChart) {
      // We've switched to the browse-by-chart tab, set the browseOnChart value to
      // be in the middle of the chart so user can start dragging it
      if (this.mdl.transform && this.mdl.transform.canvasParams && this.mdl.xAxis) {
        const middleX = this.mdl.transform.canvasParams.width / 2;
        const browseOnChartEnergy = this.mdl.xAxis.canvasToValue(middleX);
        this.mdl.setEnergyAtMouse(browseOnChartEnergy);
      }
    } else if (selector == TabSelectors.tabQuantJobs) {
      const quantJobsTab = this._tabComponent.instance as QuantJobsComponent;
      this._subs.add(
        quantJobsTab.onClose.subscribe(() => {
          this.onClose();
        })
      );
    } else {
      this.mdl.xrfNearMouse.clear();
    }

    this.mdl.needsDraw$.next();
  }

  // NOTE: there are ways to go from selector string to ComponentFactory:
  //       eg. https://indepth.dev/posts/1400/components-by-selector-name-angular
  //       but we're only really doing this for 5 components, and don't actually want
  //       it to work for any number of components, so hard-coding here will suffice
  private getComponentClassForSelector(selector: string): any {
    // Widgets
    if (selector == TabSelectors.tabBrowseOnChart) {
      return BrowseOnChartComponent;
    } else if (selector == TabSelectors.tabElementSets) {
      return ElementSetsComponent;
    } else if (selector == TabSelectors.tabQuantJobs) {
      return QuantJobsComponent;
    } else if (selector != TabSelectors.tabPeriodicTable) {
      console.error("getComponentClassForSelector unknown selector: " + selector + ". Substituting periodic table");
    }
    return PeriodicTableTabComponent;
  }

  private makeComponentFactory(selector: string): object {
    const klass = this.getComponentClassForSelector(selector);
    const factory = this.resolver.resolveComponentFactory(klass);
    return factory;
  }

  private clearTabArea(): void {
    // Under context image
    if (this._tabComponent != null) {
      this._tabComponent.destroy();
      this._tabComponent = null;
      this._tabSelector = TabSelectors.tabPeriodicTable;
    }
  }
}
