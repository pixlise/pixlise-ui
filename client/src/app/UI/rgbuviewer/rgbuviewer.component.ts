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

import { Component, Input, OnInit } from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { DataSet } from "src/app/models/DataSet";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { rgbuImagesWidgetState, ViewState, ViewStateService } from "src/app/services/view-state.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { RGBUViewerDrawer } from "./drawer";
import { RGBUViewerInteraction } from "./interaction";
import { RGBUViewerModel } from "./model";







@Component({
    selector: ViewStateService.widgetSelectorRGBUViewer,
    templateUrl: "./rgbuviewer.component.html",
    styleUrls: ["./rgbuviewer.component.scss"]
})
export class RGBUViewerComponent implements OnInit
{
    @Input() widgetPosition: string = "";

    private _model: RGBUViewerModel = null;
    private _errorMsg: string = "";

    private _subs = new Subscription();

    needsDraw$: Subject<void> = new Subject<void>();

    dummyTransform: PanZoom = new PanZoom(); // Needed for interactive canvas, but we don't actually touch this
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;

    keyItems: KeyItem[] = [];

    logColour: boolean = false;
    brightness: number = 1;

    private _rgbu: RGBUImage = null;

    constructor(
        private _datasetService: DataSetService,
        private _selectionService: SelectionService,
        private _contextImageService: ContextImageService, // for linked transforms
        private _viewStateService: ViewStateService,
    )
    {
    }

    ngOnInit(): void
    {
        // We want to know when a dataset changes, so we know what images are available to us
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                // We only want to use the first RGBU image from the dataset if there isn't one already loaded from the context image service
                if(dataset && this._model === null)
                {
                    // Get any RGBU images
                    if(dataset.rgbuImages.length <= 0)
                    {
                        // Find any TIF images
                        this._errorMsg = "Citizen opened a dataset with no RGBU imagery";
                    }
                    else
                    {
                        if(!dataset.rgbuImages[0].loadComplete)
                        {
                            // Trigger a load
                            this._datasetService.loadRGBUImage(dataset.rgbuImages[0].path).subscribe(
                                (rgbu: RGBUImage)=>
                                {
                                    this.setImage(rgbu);
                                }
                            );
                        }
                        else
                        {
                            this.setImage(dataset.rgbuImages[0]);
                        }
                    }
                }
            }
        ));

        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.initForDrawingIfNeeded();

                // Use the context images transform so we stay in sync
                if(this._model && this._contextImageService.mdl.transform)
                {
                    this._model.setTransform(this._contextImageService.mdl.transform);
                }

                this._subs.add(this._contextImageService.mdl.transform.transformChangeComplete$.subscribe(
                    (complete: boolean)=>
                    {
                        if(this._model)
                        {
                            this._model.setTransform(this._contextImageService.mdl.transform);
                            this.needsDraw$.next();
                        }
                    },
                    (err)=>
                    {
                    }
                ));

                this._subs.add(this._contextImageService.mdl.contextImageItemShowing$.subscribe(
                    (contextImageItemShowing)=>
                    {
                        if(contextImageItemShowing && contextImageItemShowing.rgbuSourceImage)
                        {
                            this.setImage(contextImageItemShowing.rgbuSourceImage);
                            this.redrawImage();
                        }
                    }
                ));
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            (sel: SelectionHistoryItem)=>
            {
                // Selection changed, get the mask image
                if(this._model)
                {
                    this._model.maskImage = sel.pixelSelection.getMaskImage();
                    this._model.cropMaskImage = sel.cropSelection && sel.cropSelection.selectedPixels.size > 0 ? sel.cropSelection.getInvertedMaskImage() : null;
                    this.needsDraw$.next();
                }
            }
        ));

        this._subs.add(this._viewStateService.viewState$.subscribe(
            (viewState: ViewState)=>
            {
                console.log("Restoring rgbu image viewer state...");

                let loadedState = viewState.rgbuImages.get(this.widgetPosition);

                if(loadedState)
                {
                    this.logColour = loadedState.logColour;
                    this.brightness = loadedState.brightness;
                }
                else
                {
                    console.warn("Failed to find view state for rgbu image viewer: "+this.widgetPosition);
                }
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private setImage(rgbu: RGBUImage)
    {
        // Read each channel out and store so it can be drawn
        this._model = new RGBUViewerModel(rgbu, null, null, this.brightness, this.logColour);

        if(this._contextImageService.mdl)
        {
            this._model.setTransform(this._contextImageService.mdl.transform);
        }

        this.initForDrawingIfNeeded();
    }

    // We don't know what we'll get first, the context image model or the RGBU image, so this is called from
    // both and will init when it's got everything
    private initForDrawingIfNeeded(): void
    {
        if(!this.drawer && this._model)
        {
            // Setup for drawing
            this.interaction = new RGBUViewerInteraction(this._model);
            this.drawer = new RGBUViewerDrawer(this._model);
        }

        this.needsDraw$.next();
    }

    private redrawImage(): void
    {
        if(this._model)
        {
            // Setup for drawing
            this.interaction = new RGBUViewerInteraction(this._model);
            this.drawer = new RGBUViewerDrawer(this._model);
        }

        this.needsDraw$.next();
    }


    get cursorShown(): string
    {
        if(!this._model)
        {
            return CursorId.defaultPointer;
        }

        return this._model.cursorShown;
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorRGBUViewer;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    onChangeBrightness(event: SliderValue): void
    {
        this.setBrightness(event.value, event.finish);
    }

    onResetBrightness(): void
    {
        this.setBrightness(1, true);
    }

    private setBrightness(val: number, apply: boolean): void
    {
        this.brightness = val;

        if(apply)
        {
            if(this._model)
            {
                this._model.setBrightness(this.brightness);
            }

            this.saveState("brightness");
            this.needsDraw$.next();
        }
    }

    onToggleLogColour(): void
    {
        this.logColour = !this.logColour;
        if(this._model)
        {
            this._model.setLogColour(this.logColour);
        }

        this.saveState("logColour");
        this.needsDraw$.next();
    }

    get errorMsg(): string
    {
        return this._errorMsg;
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawWorldSpace(screenContext, drawParams);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawScreenSpace(screenContext, drawParams);
        }
    }

    private saveState(reason: string): void
    {
        console.log("RGBU images saveState called due to: "+reason);
        this._viewStateService.setRGBUImagesState(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): rgbuImagesWidgetState
    {
        let toSave = new rgbuImagesWidgetState(this.logColour, this.brightness);
        return toSave;
    }
}
