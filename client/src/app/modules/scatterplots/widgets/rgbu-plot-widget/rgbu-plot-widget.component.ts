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

import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { RGBUPlotDrawer } from "./rgbu-plot-drawer";
import { RGBUPlotInteraction } from "./rgbu-plot-interaction";
import { RGBUPlotModel } from "./rgbu-plot-model";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { RGBUPlotWidgetState } from "src/app/generated-protos/widget-data";
import { RGBUImage } from "src/app/models/RGBUImage";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { MatSelectChange } from "@angular/material/select";

@Component({
  selector: "rgbu-plot",
  templateUrl: "./rgbu-plot-widget.component.html",
  styleUrls: ["./rgbu-plot-widget.component.scss"],
})
export class RGBUPlotWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new RGBUPlotModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  // Just a dummy, we don't pan/zoom
  transform: PanZoom = new PanZoom();

  private _subs = new Subscription();

  private _selectionModes: string[] = [RGBUPlotModel.SELECT_SUBTRACT, RGBUPlotModel.SELECT_RESET, RGBUPlotModel.SELECT_ADD];
  private _selectionMode: string = RGBUPlotModel.SELECT_RESET;

  yAxisSliderLength: number = 150;
  xAxisSliderLength: number = 250;

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _endpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
  ) {
    super();

    this.drawer = new RGBUPlotDrawer(this.mdl);
    this.toolhost = new RGBUPlotInteraction(this.mdl, this._selectionService);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "minerals",
          type: "button",
          title: "Minerals",
          tooltip: "Choose mineral areas to display",
          onClick: () => this.onMinerals(),
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
        },
      ],
    };
  }

  private setInitialConfig() {
    // If we don't have anything showing yet, just show the first one...
    if (!this._analysisLayoutService.defaultScanId) {
      return;
    }

    this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [this._analysisLayoutService.defaultScanId] })).subscribe((resp: ImageListResp) => {
      for (const img of resp.images) {
        if (img.purpose == ScanImagePurpose.SIP_MULTICHANNEL) {
          this.loadImage(img.path);
        }
      }
    });
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      RGBUPlotWidgetState.create({
        drawMonochrome: this.mdl.drawMonochrome,
        imageName: this.mdl.imageName,
      })
    );
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as RGBUPlotWidgetState;
        if (state) {
          this.mdl.drawMonochrome = state.drawMonochrome;
          // TODO: fill in other vars here...
          this.loadImage(state.imageName);
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel: SelectionHistoryItem) => {
        this.mdl.handleSelectionChange(sel);
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onMinerals() {
    // RGBUPlotModel.selectMinerals(this.dialog, this._mineralsShown, mineralsShown => {
    //   if (mineralsShown) {
    //     this._mineralsShown = mineralsShown;
    //     const reason = "mineral-choice";
    //     this.saveState(reason);
    //     this.prepareData(reason);
    //   }
    // });
  }

  onRegions() {}

  get scanIdsForRGBUPicker(): string[] {
    if (!this._analysisLayoutService.defaultScanId) {
      return [];
    }

    return [this._analysisLayoutService.defaultScanId];
  }

  get drawMonochrome(): boolean {
    return this.mdl.drawMonochrome;
  }

  onToggleDrawMonochrome(): void {
    this.mdl.drawMonochrome = !this.mdl.drawMonochrome;

    // let reason = "draw-colour-toggle";
    // this.prepareData(reason);
    // this.saveState(reason);
  }

  get selectionModes(): string[] {
    return this._selectionModes;
  }

  get currentSelectionMode(): string {
    return this._selectionMode;
  }

  onChangeSelectionMode(mode: string): void {
    // Check that it's one of the selected ones
    if (this._selectionModes.indexOf(mode) >= 0) {
      this._selectionMode = mode;

      // Set on our model too so interaction class can see it
      this.mdl.selectionMode = mode;
    }
  }

  onSelectionExclude(): void {
    //this.mdl.excludeSelection(this._selectionService, this._datasetService.datasetLoaded);
  }

  onSelectionClear(): void {
    this._selectionService.clearSelection();
  }

  onImageChanged(change: MatSelectChange) {
    if (this.mdl.imageName == change.value) {
      // No change, stop here
      return;
    }

    this.loadImage(change.value);
  }

  private loadImage(imagePath: string) {
    this._endpointsService.loadRGBUImageTIF(imagePath).subscribe((img: RGBUImage) => {
      this.mdl.imageName = imagePath;
      this.mdl.setData(img);

      this.saveState();
    });
  }
}
