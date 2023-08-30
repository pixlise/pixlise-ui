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

import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Subject, Subscription, fromEvent } from "rxjs";
import { tap, throttleTime, debounceTime } from "rxjs/operators";

import { getMatrixAs2x3Array, Point, Rect } from "src/app/models/Geometry";
// import { LayoutService } from "src/app/services/layout.service";
import { AnalysisLayoutService } from "../../../services/analysis-layout.service";


export class CanvasParams
{
    constructor(public width: number, public height: number, public dpi: number)
    {
    }

    getCenterPoint(): Point
    {
        return new Point(this.width/2, this.height/2);
    }

    getRect(): Rect
    {
        return new Rect(0, 0, this.width, this.height);
    }

    equals(other: CanvasParams): boolean
    {
        return this.width == other.width &&
            this.height == other.height &&
            this.dpi == other.dpi;
    }
}

export class CanvasDrawParameters
{
    constructor(
        public worldTransform: CanvasWorldTransform,
        public drawViewport: CanvasParams,
        // If not drawing for export, set to null/empty...
        //public exportChoices: ExportDataChoice[],
        public exportItemIDs: string[]
    )
    {
    }
}

export interface CanvasDrawer
{
    // The distinction has been lost over time. The intent was that drawing transformed objects was done
    // in drawWorldSpace, while overlays that are screen-aligned, eg buttons/colour scales, etc are drawn
    // in drawScreenSpace. These can probably be merged and instead built with some kind of draw pass number
    // passed into the draw function via CanvasDrawParameters, though currently the transform is applied
    // only before drawWorldSpace so it still makes sense. Left it as a refactoring exercise for now
    // because a lot of code already splits this way and works fine.

    // Refactored to supply everything via CanvasDrawParameters in case we want to implement future draw
    // modes (eg forExport) and we don't have to then refactor a huge amount of code

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;

    // Optional parameters just for export
    showSwapButton?: boolean;
    lightMode?: boolean;
}

export enum CanvasMouseEventId
{
    MOUSE_DOWN,
    MOUSE_UP,
    MOUSE_MOVE,
    MOUSE_DRAG,
    MOUSE_WHEEL,
    MOUSE_ENTER,
    MOUSE_LEAVE
}

export class CanvasMouseEvent
{
    constructor(
        public eventId: CanvasMouseEventId,

        // World-space coordinates
        public point: Point,
        public mouseDown: Point,
        public mouseLast: Point,

        // Canvas-space coordinates
        public canvasPoint: Point,
        public canvasMouseDown: Point,
        public canvasMouseLast: Point,

        // Canvas size info
        public canvasParams: CanvasParams,

        // Mouse wheel
        public deltaY: number,

        // Modifier key states
        public shiftKey: boolean,
        public ctrlKey: boolean,
        public metaKey: boolean,        
    )
    {
    }
}

export class CanvasKeyEvent
{
    constructor(
        public key: string,
        public down: boolean,
    )
    {
    }
}

export interface CanvasDrawNotifier
{
    needsDraw$: Subject<void>;
}

export class CanvasInteractionResult
{
    constructor(public redraw: boolean, public catchEvent: boolean)
    {
    }

    static get redrawAndCatch(): CanvasInteractionResult { return new CanvasInteractionResult(true, true); }
    static get neither(): CanvasInteractionResult { return new CanvasInteractionResult(false, false); }
    static get redrawOnly(): CanvasInteractionResult { return new CanvasInteractionResult(true, false); }
}

export interface CanvasInteractionHandler
{
    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult;
    keyEvent(event: CanvasKeyEvent): CanvasInteractionResult;
}

export interface CanvasWorldTransform
{
    setCanvasParams(canvasParams: CanvasParams): any;

    getScale(): Point;

    canvasToWorldSpace(canvasPt: Point): Point;
    getTransformMatrix(): math.Matrix;

    clone(): CanvasWorldTransform;
}


@Component({
    selector: "interactive-canvas",
    templateUrl: "./interactive-canvas.component.html",
    styleUrls: ["./interactive-canvas.component.scss"]
})
export class InteractiveCanvasComponent implements OnInit, OnDestroy
{
    @Input() drawer: CanvasDrawer | null = null;
    @Input() drawNotifier: CanvasDrawNotifier | null = null;
    @Input() interactionHandler: CanvasInteractionHandler | null = null;
    @Input() transform: CanvasWorldTransform | null = null;

    @ViewChild("InteractiveCanvas") _imgCanvas?: ElementRef;

    private _screenContext!: CanvasRenderingContext2D;

    private _mouseDown: Point | null = null;
    private _mouseLast: Point | null = null;

    //private _mouseWheelDeltaAccum: number = 0;
    //private _mouseWheelDeltaAccumWheel: number = 0;
    private _mouseWheelDeltaAccumX: number = 0;
    //private _mouseWheelDeltaAccumWheelX: number = 0;
    private _mouseWheelDeltaAccumY: number = 0;
    //private _mouseWheelDeltaAccumWheelY: number = 0;

    protected _subs = new Subscription();
    protected _viewport: CanvasParams = new CanvasParams(0, 0, 1);

    constructor(private _layoutService: AnalysisLayoutService)
    {
    }

    ngOnInit()
    {
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    ngAfterViewInit(): void
    {
        //this.printDbg('ngAfterViewInit');
        this.triggerRedraw();

        // this._subs.add(this._layoutService.resizeCanvas$.subscribe(
        //     ()=>
        //     {
        //         this.callFitCanvasToContainer();
        //     }
        // ));

        this._subs.add(this.drawNotifier?.needsDraw$.subscribe(
            ()=>
            {
                this.triggerRedraw();
            }
        ));
    }

    triggerRedraw(): void
    {
        window.requestAnimationFrame(
            ()=>
            {
                if(this._screenContext && this._viewport && this.transform && this.drawer)
                {
                    InteractiveCanvasComponent.drawFrame(this._screenContext, this._viewport, this.transform, this.drawer);
                }
            }
        );
        //this.drawFrame();
    }

    /*
    printDbg(event: string)
    {
        let canvasElem = this._imgCanvas.nativeElement;

        let width = canvasElem.parentNode.clientWidth;
        let height = canvasElem.parentNode.clientHeight;

        let dpi = window.devicePixelRatio;

        let style_height = +getComputedStyle(canvasElem).getPropertyValue("height").slice(0, -2);
        let style_width = +getComputedStyle(canvasElem).getPropertyValue("width").slice(0, -2);

        let canvas_width = canvasElem.width;
        let canvas_height = canvasElem.height;

console.log(event+' (dpi='+dpi+'):');
console.log('Parent Size: '+width+'x'+height);
console.log('Canvas size: '+canvas_width+'x'+canvas_height);
console.log('Style size: '+style_width+'x'+style_height);
console.log(canvasElem);
    }
*/
    private callFitCanvasToContainer()
    {
        if(!this._imgCanvas)
        {
            console.error("this._imgCanvas was not set");
            return;
        }

        //this.printDbg('callFitCanvasToContainer');
        let canvasElem = this._imgCanvas.nativeElement;

        let newViewport = this.fitCanvasToContainer(this._imgCanvas);
        if(newViewport)
        {
            //console.log('callFitCanvasToContainer viewport: '+newViewport.width+'x'+newViewport.height+', dpi='+newViewport.dpi);
            //console.log(canvasElem);

            this._viewport = newViewport;
            this.transform?.setCanvasParams(newViewport);
            this.triggerRedraw();
        }

        let canvasContext = (<HTMLCanvasElement>canvasElem).getContext("2d");
        if (canvasContext)
        {
            this._screenContext = canvasContext;
        }
    }

    fitCanvasToContainer(canvas: ElementRef): CanvasParams | null
    {
        if(!canvas)
        {
            //console.error('fitCanvasToContainer failed: null canvas');
            return null;
        }

        const dpi = window.devicePixelRatio;

        let canvasElem = canvas.nativeElement;
        if(canvasElem.width == canvasElem.parentNode.clientWidth*dpi && canvasElem.height == canvasElem.parentNode.clientHeight*dpi)
        {
            //console.error('fitCanvasToContainer failed: size already matched');
            return null;
        }

        let width = canvasElem.parentNode.clientWidth;
        let height = canvasElem.parentNode.clientHeight;

        let displayBackup = canvasElem.style.display;
        canvasElem.style.display = "none";

        canvasElem.width = width*dpi;
        canvasElem.height = height*dpi;

        canvasElem.style.display = displayBackup;

        canvasElem.style.width = width + "px";
        canvasElem.style.height = height + "px";

        return new CanvasParams(width, height, dpi);
    }

    // Not using this because it's a global event, we're only interested if this canvas received it
    //@HostListener('document:mousedown', ['$event'])
    onMouseDownCanvas(event: MouseEvent)
    {
        event.preventDefault();
        // We only consider it a mouse down if it's the left mouse button
        if(event.button == 0)
        {
            this._mouseDown = new Point(event.clientX, event.clientY);
            this.sendMouseEvent(this._mouseDown, 0, CanvasMouseEventId.MOUSE_DOWN, event.shiftKey, event.ctrlKey, event.metaKey);
        }
    }

    private shouldProcessMouseEvent(event: MouseEvent): boolean
    {
        // If mouse is down, we're stalking the mouse, so process it
        if(this._mouseDown)
        {
            return true;
        }
        return false;
    }

    onMouseEnter(event: MouseEvent): void
    {
        event.preventDefault();
        // Grab focus - so we get keyboard presses
        if(this._imgCanvas)
        {
            this._imgCanvas.nativeElement.focus();
        }
        let mouse = new Point(event.clientX, event.clientY);
        this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_ENTER, event.shiftKey, event.ctrlKey, event.metaKey);
        //this.mouseEntered = true;
    }

    onMouseLeave(event: MouseEvent): void
    {
        event.preventDefault();
        // Relinquish focus
        if(this._imgCanvas)
        {
            this._imgCanvas.nativeElement.blur();
        }

        let mouse = new Point(event.clientX, event.clientY);
        this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_LEAVE, event.shiftKey, event.ctrlKey, event.metaKey);
        //this.mouseEntered = false;
    }

    @HostListener("document:mousemove", ["$event"])
    onGlobalMouseMoveCanvas(event: MouseEvent)
    {
        if(this.shouldProcessMouseEvent(event))
        {
            this.onMouseMoveCanvas(event);
        }
    }

    onMouseMoveCanvas(event: MouseEvent)
    {
        event.preventDefault();
        let mouse = new Point(event.clientX, event.clientY);

        let sendEvent = CanvasMouseEventId.MOUSE_MOVE;
        if(this._mouseDown)
        {
            sendEvent = CanvasMouseEventId.MOUSE_DRAG;
        }
        this.sendMouseEvent(mouse, 0, sendEvent, event.shiftKey, event.ctrlKey, event.metaKey);
    }

    @HostListener("document:mouseup", ["$event"])
    onGlobalMouseUpCanvas(event: MouseEvent)
    {
        if(this.shouldProcessMouseEvent(event))
        {
            this.onMouseUpCanvas(event);
        }
    }

    onMouseUpCanvas(event: MouseEvent)
    {
        event.preventDefault();

        // We only consider it a mouse up if it's the left mouse button
        if(event.button == 0)
        {
            let mouse = new Point(event.clientX, event.clientY);
            this.sendMouseEvent(mouse, 0, CanvasMouseEventId.MOUSE_UP, event.shiftKey, event.ctrlKey, event.metaKey);
            this._mouseDown = null;
        }
    }

    //@HostListener('document:wheel', ['$event'])
    onMouseWheelCanvas(event: WheelEvent)
    {
        // Found a whole bunch of funny stuff between browser versions/OS's...
        // OSX: Late 2019: if user pressed shift while mouse-scrolling, deltaY was 0, deltaX was populated but 10x deltaY units
        // Windows: Early 2021: getting +/-100 for the deltaY value, deltaX is always 0
        // To make this always do something useful, check if deltaY is 0, if so, operate off deltaX
        // Normalise the value (only care about the sign). We previously operated on delta=4, so maybe do that, or similar
        // and that should provide similar functionality on all browsers/platforms.

        //console.log('onMouseWheelCanvas:');
        //console.log(event);
        event.preventDefault();

        let delta = event.deltaY;
        if(delta == 0)
        {
            delta = event.deltaX;
        }

        const deltaStep = 6;

        // Found that on Windows, we were being given deltaX= +/-100, so lets standardise. On OSX we're getting about +/-4, and
        // wrote code to handle it that way...
        if(delta > 0)
        {
            delta = deltaStep;
        }
        else if(delta < 0)
        {
            delta = -deltaStep;
        }

        let mouse = new Point(event.clientX, event.clientY);
        this.sendMouseEvent(mouse, delta, CanvasMouseEventId.MOUSE_WHEEL, event.shiftKey, event.ctrlKey, event.metaKey);
    }

    onKeyDown(event: KeyboardEvent): void
    {
        // Notify parent
        this.sendKeyEvent(event.key, true);
    }

    onKeyUp(event: KeyboardEvent): void
    {
        this.sendKeyEvent(event.key, false);
    }

    private sendKeyEvent(key: string, down: boolean): void
    {
        if(!this.interactionHandler)
        {
            console.warn("sendKeyEvent: No interaction handler defined");
            return;
        }

        let redraw = this.interactionHandler.keyEvent(new CanvasKeyEvent(key, down));

        if(redraw)
        {
            this.triggerRedraw();
        }
    }

    private sendMouseEvent(mousePos: Point, deltaY: number, eventId: number, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean): void
    {
        if(!this._mouseLast)
        {
            this._mouseLast = mousePos;
        }

        //let t0 = performance.now();
        if(!this.interactionHandler)
        {
            console.warn("sendMouseEvent: No interaction handler defined");
        }
        else
        {
            let redraw = this.interactionHandler.mouseEvent(
                new CanvasMouseEvent(
                    eventId,

                    mousePos ? this.screenToWorldSpace(mousePos) as Point : new Point(0, 0),
                    this._mouseDown ? this.screenToWorldSpace(this._mouseDown!) as Point : new Point(0, 0),
                    this._mouseLast ? this.screenToWorldSpace(this._mouseLast) as Point : new Point(0, 0),

                    this.screenToCanvasSpace(mousePos),
                    this.screenToCanvasSpace(this._mouseDown!),
                    this.screenToCanvasSpace(this._mouseLast),

                    this._viewport,

                    deltaY,
                    shiftKey,
                    ctrlKey,
                    metaKey
                    /*, rect: this.imgCanvas.nativeElement.getBoundingClientRect()*/
                )
            );

            //let t1 = performance.now();
            //console.log('mouseEvent took: '+(t1-t0)+'ms');
            if(redraw)
            {
                this.triggerRedraw();
            }
        }

        this._mouseLast = mousePos;
    }

    public static drawFrame(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, transform: CanvasWorldTransform, drawer: CanvasDrawer, exportItemIDs: string[]=[]): void
    {
        //let t0 = performance.now();
        if(!screenContext || !viewport || !transform || !drawer)
        {
            return;
        }

        // Clear the frame as we know its dimensions
        screenContext.clearRect(0, 0, viewport.width, viewport.height);

        // Set a transform that will scale all points we generate by the dpi value, thereby giving us
        // native scaling on a high res monitor, for eg macbook pros 3000x2000-ish monitor, if we ignore
        // devicePixelRatio, we'd end up with say a 500x300 canvas scaled up by the browser to fit the
        // viewport of 1000x600. We instead make our canvas 1000x600 in size, and here we multiply all
        // points by 2, and it still looks the same but is at native resolution.
        screenContext.setTransform(viewport.dpi, 0, 0, viewport.dpi, 0, 0);

        let drawParams = new CanvasDrawParameters(transform, viewport, exportItemIDs);

        // Set the transform as needed
        screenContext.save();
        let xformMat = transform.getTransformMatrix();
        let xform = getMatrixAs2x3Array(xformMat);

        screenContext.transform(xform[0], xform[1], xform[2], xform[3], xform[4], xform[5]);
        //this.screenContext.rotate(degToRad(15));

        drawer.drawWorldSpace(screenContext, drawParams);
        screenContext.restore();

        // Draw the untransformed stuff (overlays, scales, etc)
        screenContext.save();
        drawer.drawScreenSpace(screenContext, drawParams);
        screenContext.restore();

        //let t1 = performance.now();
        //console.log('Canvas redraw took: '+(t1-t0)+'ms');
    }

    protected screenToCanvasSpace(pt: Point): Point
    {
        if(!pt)
        {
            return pt;
        }

        // Make it relative to our canvas
        let canvasScreenRect = this._imgCanvas?.nativeElement.getBoundingClientRect();

        let canvasPt = new Point(pt.x-canvasScreenRect.left, pt.y-canvasScreenRect.top);
        return canvasPt;
    }

    protected screenToWorldSpace(pt: Point): Point | null
    {
        if(!pt)
        {
            return pt;
        }

        let canvasPt = this.screenToCanvasSpace(pt);

        // Transform to worldspace
        return this.transform?.canvasToWorldSpace(canvasPt) || null;
    }
}
