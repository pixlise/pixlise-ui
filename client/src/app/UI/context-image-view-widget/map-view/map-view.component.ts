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

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { getMatrixAs2x3Array, Point } from "src/app/models/Geometry";
import { ContextImageService } from "src/app/services/context-image.service";
import { SelectionService } from "src/app/services/selection.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import {
    CanvasDrawer, CanvasDrawNotifier, CanvasDrawParameters, CanvasInteractionHandler,
    CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent,
    CanvasMouseEventId
} from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { FootprintDrawer } from "src/app/UI/context-image-view-widget/drawers/footprint-drawer";
import { UserLineDrawer } from "src/app/UI/context-image-view-widget/drawers/user-line-drawer";
import { ContextImageModel } from "src/app/UI/context-image-view-widget/model";
import { ContextImagePan } from "src/app/UI/context-image-view-widget/tools/pan";
import { MapColourScale } from "src/app/UI/context-image-view-widget/ui-elements/map-colour-scale";
import { Colours } from "src/app/utils/colours";
import { drawPointCrosshair } from "src/app/utils/drawing";









@Component({
    selector: "context-map-view",
    templateUrl: "./map-view.component.html",
    styleUrls: ["./map-view.component.scss"]
})
export class MapViewComponent implements OnInit, OnDestroy, CanvasInteractionHandler, CanvasDrawNotifier, CanvasDrawer
{
    private _subs = new Subscription();

    @Input() layerId: string = "";

    mdl: ContextImageModel = null;
    cursorShown: string = CursorId.panCursor;
    needsDraw$: Subject<void> = new Subject<void>();
    transform: PanZoom = new PanZoom();

    private _uiColourScale: MapColourScale = null;

    constructor(
        private _contextImageService: ContextImageService,
        private _selectionService: SelectionService
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this.setModel(this._contextImageService.mdl);
            }
        ));

        this._subs.add(this._selectionService.hoverChangedReplaySubject$.subscribe(
            ()=>
            {
                // Bit of a race condition situation - other maps & the context image will also be setting
                // this same field, but the point is to trigger a redraw for all these views when the value changes

                // Like context image, we require the highlighted point to have coordinates defined, else ignore
                this.mdl.highlighedLocationIdx = this._selectionService.hoverLocationWithCoordsIdx;
                this.needsDraw$.next();
            }
        ));
    }

    setModel(mdl: ContextImageModel): void
    {
        this.mdl = mdl;
        this._uiColourScale = new MapColourScale(mdl, this.layerId);

        this._subs.add(this.mdl.transform.transformChangeComplete$.subscribe(
            (complete: boolean)=>
            {
                this.needsDraw$.next();
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this.mdl.drawnLinePoints$.subscribe(
            ()=>
            {
                this.needsDraw$.next();
            },
            (err)=>
            {
            }
        ));

        // If the model says redraw, tell our own canvas to redraw too
        this._subs.add(this.mdl.needsDraw$.subscribe(
            ()=>
            {
                this.needsDraw$.next();
            },
            (err)=>
            {
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    // CanvasInteractionHandler
    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // Allow colour scale to catch the mouse event if it's related to the scale area...
        if(this.colourScaleActive)
        {
            let result = this._uiColourScale.mouseEvent(event);
            if(result.catchEvent)
            {
                // Tell other maps & context image to redraw too using the models "shared" needsDraw subject
                this.mdl.needsDraw$.next();
                return CanvasInteractionResult.redrawAndCatch;
            }
        }

        // NOTE: at this point, event.point and event.canvasPoint are equal, because we're not applying transformations
        // in the same way... there is no canvas transform, we only do it when drawing
        let contextToUsTransform = this.getContextToOurCanvasTransform();

        // Translate to context image canvas space first
        let contextCanvasPt = new Point(event.point.x-contextToUsTransform.x, event.point.y-contextToUsTransform.y);

        // Transform using context image transform into "world" space
        let worldPt = this.mdl.transform.canvasToWorldSpace(contextCanvasPt);

        // We do zooming independently of the tools, any scrolling over the context image is zoom
        if(event.eventId == CanvasMouseEventId.MOUSE_WHEEL)
        {
            let newScale = this.mdl.transform.scale.x*(1-event.deltaY/100);
            this.mdl.transform.setScaleRelativeTo(new Point(newScale, newScale), worldPt, false);
            return CanvasInteractionResult.redrawAndCatch;
        }

        let worldLastPt = this.mdl.transform.canvasToWorldSpace(new Point(event.mouseLast.x-contextToUsTransform.x, event.mouseLast.y-contextToUsTransform.y));
        ContextImagePan.panZoomMouseMove(
            event.eventId,
            worldPt,
            event.mouseDown != null,
            worldLastPt,
            this.mdl.transform
        );

        // Handle mouse moves/hover detection at least here
        if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            let idx = this.mdl.dataset.getClosestLocationIdxToPoint(worldPt);
            if(idx < 0)
            {
                this._selectionService.setHoverPMC(-1);
            }
            else
            {
                let pmcs = this.mdl.dataset.getPMCsForLocationIndexes([idx], false);
                if(pmcs.size == 1)
                {
                    this._selectionService.setHoverPMC(pmcs.keys().next().value);
                }
            }

            // Redraw will be initiated due to selectionService hover idx change
        }

        return CanvasInteractionResult.neither;
    }

    keyEvent(event: CanvasKeyEvent): CanvasInteractionResult
    {
        return CanvasInteractionResult.neither;
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        let contextToUsTransform = this.getContextToOurCanvasTransform();

        // First transform so context image center is at the origin, then back so it's at our center
        screenContext.transform(1, 0, 0, 1, contextToUsTransform.x, contextToUsTransform.y);

        // Now apply the same transformation specified by context image
        const contextImageTransform = this.mdl.transform;
        let xformMat = contextImageTransform.getTransformMatrix();
        let xform = getMatrixAs2x3Array(xformMat);

        screenContext.transform(xform[0], xform[1], xform[2], xform[3], xform[4], xform[5]);

        // Draw footprint
        screenContext.lineWidth = 1 / contextImageTransform.scale.x;
        let footprintDrawer = new FootprintDrawer(this.mdl);
        footprintDrawer.drawFootprint(screenContext, 0, Colours.GRAY_100.asString(), Colours.GRAY_60.asString());

        // Draw layer
        let layer = this.mdl.layerManager.getLayerById(this.layerId);
        if(layer)
        {
            // Check if we should draw the layer - if it's all 0's, we don't bother
            let histogram = layer.getHistogram(0);

            if(MapColourScale.isMapDataValid(histogram))
            {
                layer.drawLocationData(screenContext, this.mdl.dataset.locationDisplayPointRadius, this.mdl.dataset.experimentAngleRadiansOnContextImage, this.mdl.dataset);
            }
        }

        // If there's a line drawn, draw that too!
        if(this._contextImageService.mdl.drawnLinePoints.length > 0)
        {
            let drawer = new UserLineDrawer(this.mdl);
            drawer.drawWorldSpace(screenContext, drawParams);
        }

        // Draw a highlighted location if there is one
        if(this.mdl.highlighedLocationIdx >= 0)
        {
            let beamRadiusPixels = this._contextImageService.mdl.dataset.mmToContextImageSpacePixelSize(this.mdl.mmBeamRadius);
            drawPointCrosshair(screenContext, this.mdl.dataset.locationPointCache[this.mdl.highlighedLocationIdx].coord, beamRadiusPixels, this.mdl.transform.scale.x, beamRadiusPixels/2);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.colourScaleActive)
        {
            this._uiColourScale.drawScreenSpace(screenContext, drawParams);
        }
    }

    private getContextToOurCanvasTransform(): Point
    {
        // Transform so that whatever is in the center of the context image is also in the center of our viewport
        // TODO: For some reason this isn't all that exactly tracking the centered bit of the context image :-/
        const ourTransform = this.transform;
        const contextImageTransform = this.mdl.transform;

        let contextCanvasCenter = contextImageTransform.canvasParams.getCenterPoint();
        let ourCanvasCenter = new Point(ourTransform.canvasParams.width/2, ourTransform.canvasParams.height/2);

        // Need to transform points to the top-left coord of the context canvas, then to the middle of our canvas, so
        // the translation is:
        let translation = new Point(-contextCanvasCenter.x+ourCanvasCenter.x, -contextCanvasCenter.y+ourCanvasCenter.y);

        return translation;
    }

    private get colourScaleActive(): boolean
    {
        if(this.mdl.viewStateService.showColourScaleOnMaps && this._uiColourScale) // I refuse to !!this._uiColourScale, that's grotesque.
        {
            return true;
        }
        return false;
    }
}
