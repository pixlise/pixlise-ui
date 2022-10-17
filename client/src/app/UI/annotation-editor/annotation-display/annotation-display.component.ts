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

import { Component, EventEmitter, HostListener, Input, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { AnnotationTool } from "../annotation-editor.component";

export const ANNOTATION_CURSORS = {
    freeform: "url(/assets/cursors/line-draw.svg), auto",
    text: "text",
    arrow: "pointer",
    default: "auto"
};
export type AnnotationToolOption = "freeform" | "text" | "arrow";

export class AnnotationPoint
{
    // Scaling is disproportionate across different elements, so these min dimensions are just used to prevent
    // a total collapse of annotations at a small screen resolution
    _minScreenWidth: number = 500;
    _minScreenHeight: number = 500;

    constructor(
        private _x: number,
        private _y: number,
        public screenWidth?: number, 
        public screenHeight?: number,
    )
    {
        this.screenWidth = screenWidth ? screenWidth : this._currentWidth();
        this.screenHeight = screenHeight ? screenHeight : this._currentHeight();
    }

    _currentWidth(): number
    {
        return window.innerWidth > this._minScreenWidth ? window.innerWidth : this._minScreenWidth;
    }

    _currentHeight(): number
    {
        return window.innerHeight > this._minScreenHeight ? window.innerHeight : this._minScreenHeight;
    }

    get x(): number
    {
        return this._x / this.screenWidth * this._currentWidth();
    }

    set x(newX: number)
    {
        this._x = newX;
        this.screenWidth = this._currentWidth();
    }

    get y(): number
    {
        return this._y / this.screenHeight * this._currentHeight();
    }

    set y(newY: number)
    {
        this._y = newY;
        this.screenHeight = this._currentHeight();
    }

    copy(): AnnotationPoint
    {
        return new AnnotationPoint(this._x, this._y, this.screenWidth, this.screenHeight);
    }

    distanceTo(nextPoint: AnnotationPoint): number
    {
        return Math.sqrt(Math.pow(nextPoint.x - this.x, 2) + Math.pow(nextPoint.y - this.y, 2));
    }
}

export class FullScreenAnnotationItem
{
    private _startingPoint: AnnotationPoint;
    private _cachedStartingPoint: AnnotationPoint;
    
    private _relativeEndPoint: AnnotationPoint;

    private _pointPairs: [AnnotationPoint, AnnotationPoint][];
    private _relativePointPairs: [AnnotationPoint, AnnotationPoint][];

    private _isGlobalPosition: boolean = true;

    constructor(
        public type: AnnotationToolOption,
        public points: AnnotationPoint[],
        public colour: string, 
        public complete: boolean,
        public text?: string, 
        public fontSize?: number,
        public id?: number
    )
    {
        this._calcDimensions();
        this._generatePointPairs();
    }

    private _calcDimensions()
    {
        let minPoint = new AnnotationPoint(0,0);
        let maxPoint = new AnnotationPoint(0,0);

        if(this.points.length > 0)
        {
            minPoint = this.points[0].copy();
            maxPoint = this.points[0].copy();
        }
        this.points.forEach(point =>
        {
            minPoint.x = Math.min(point.x, minPoint.x);
            maxPoint.x = Math.max(point.x, maxPoint.x);
            minPoint.y = Math.min(point.y, minPoint.y);
            maxPoint.y = Math.max(point.y, maxPoint.y);
        });

        this._startingPoint = minPoint.copy();
        this._cachedStartingPoint = minPoint.copy();
        this._relativeEndPoint = new AnnotationPoint(maxPoint.x - minPoint.x, maxPoint.y - minPoint.y);
    }

    private _generatePointPairs()
    {
        if(this.points.length === 0)
        {
            return [];
        }

        let pairs: [AnnotationPoint, AnnotationPoint][] = [];
        let lastValue = this.points[0];
        this.points.forEach((point) =>
        {
            pairs.push([lastValue.copy(), point.copy()]);
            lastValue = point.copy();
        });

        this._pointPairs = pairs;

        this._generateRelativePoints();
    }

    _generateRelativePoints()
    {
        this._cachedStartingPoint = this._startingPoint.copy();
        this._relativePointPairs = this._pointPairs.map(([pointA, pointB]) =>
        {
            let relativePointA = pointA.copy();
            relativePointA.x -= this._cachedStartingPoint.x;
            relativePointA.y -= this._cachedStartingPoint.y;
            let relativePointB = pointB.copy();
            relativePointB.x -= this._cachedStartingPoint.x;
            relativePointB.y -= this._cachedStartingPoint.y;

            return [
                relativePointA,
                relativePointB
            ];
        });
    }

    addPoint(newPoint: AnnotationPoint)
    {
        this._pointPairs.push([this.points[this.points.length - 1], newPoint]);
        this.points.push(newPoint);

        let minX = Math.min(newPoint.x, this._startingPoint.x);
        let maxX = Math.max(newPoint.x, this._startingPoint.x + this.width);
        let minY = Math.min(newPoint.y, this._startingPoint.y);
        let maxY = Math.max(newPoint.y, this._startingPoint.y + this.height);

        this._startingPoint = new AnnotationPoint(minX, minY);
        this._relativeEndPoint = new AnnotationPoint(maxX - minX, maxY - minY);
    }

    shiftPoint(index: number, xShift: number, yShift: number)
    {
        this.points[index].x += xShift;
        this.points[index].y += yShift;

        let minPoint = this.points[index].copy();
        let maxPoint = this.points[index].copy();

        this.points.forEach(point =>
        {
            minPoint.x = Math.min(point.x, minPoint.x);
            maxPoint.x = Math.max(point.x, maxPoint.x);
            minPoint.y = Math.min(point.y, minPoint.y);
            maxPoint.y = Math.max(point.y, maxPoint.y);
        });

        this._startingPoint = minPoint.copy();
        this._relativeEndPoint = new AnnotationPoint(maxPoint.x - minPoint.x, maxPoint.y - minPoint.y);

        this._pointPairs[index][0] = this.points[index];
        if(this._pointPairs.length > 1)
        {
            this._pointPairs[index - 1][1] = this.points[index];
        }
        else
        {
            this._pointPairs[index][1] = this.points[index];
        }
        this._pointPairs.push([this.points[this.points.length - 1], this.points[index]]);
    }

    moveAllPoints(offsetX: number, offsetY: number)
    {
        this.points = this.points.map((point) =>
        {
            let newPoint = point.copy();
            newPoint.x += offsetX;
            newPoint.y += offsetY;

            return newPoint;
        });

        this._startingPoint.x += offsetX;
        this._startingPoint.y += offsetY;
        this._generatePointPairs();
    }

    moveCachedBase(offsetX: number, offsetY: number)
    {
        this._cachedStartingPoint.x += offsetX;
        this._cachedStartingPoint.y += offsetY;
    }

    updatePointCache()
    {
        this.moveAllPoints(this._cachedStartingPoint.x - this._startingPoint.x, this._cachedStartingPoint.y - this._startingPoint.y);
    }

    get pointPairs(): [AnnotationPoint, AnnotationPoint][]
    {
        return this._pointPairs;
    }

    get relativePointPairs(): [AnnotationPoint, AnnotationPoint][]
    {
        return this._relativePointPairs;
    }

    get width(): number
    {
        return this._relativeEndPoint.x;
    }

    get widthStr(): string
    {
        return `${this.width}px`;
    }

    get height(): number
    {
        return this._relativeEndPoint.y;
    }

    get heightStr(): string
    {
        return `${this.height}px`;
    }

    get isGlobalPosition(): boolean
    {
        return this._isGlobalPosition;
    }

    set isGlobalPosition(globalPositioning: boolean)
    {
        if(!globalPositioning)
        {
            this._generateRelativePoints();
        }
        this._isGlobalPosition = globalPositioning;
    }

    get x(): number
    {
        return this.isGlobalPosition ? this._startingPoint.x : this._cachedStartingPoint.x;
    }

    get xStr(): string
    {
        return `${this.x}px`;
    }

    get y(): number
    {
        return this.isGlobalPosition ? this._startingPoint.y : this._cachedStartingPoint.y;
    }

    get yStr(): string
    {
        return `${this.y}px`;
    }
}

@Component({
    selector: "annotation-display",
    templateUrl: "./annotation-display.component.html",
    styleUrls: ["./annotation-display.component.scss"]
})
export class AnnotationDisplayComponent
{
    private _subs = new Subscription();

    @Input() editable: boolean = false;
    @Input() annotationTool: AnnotationTool = null;
    @Input() savedAnnotations: FullScreenAnnotationItem[] = null;
    @Input() editingIndex: number = -1;

    @Output() onToolChange = new EventEmitter();
    @Output() onEditIndex = new EventEmitter();
    @Output() onNewAnnotation = new EventEmitter();
    @Output() onDeleteAnnotation = new EventEmitter();
    @Output() onEditAnnotation = new EventEmitter();

    _draggingID: number = -1;
    _dragStartX: number = -1;
    _dragStartY: number = -1;

    _isDeletable: boolean = true;

    @HostListener("document:mousedown", ["$event"])
    mouseDownListener(event)
    {
        // event path is only fully supported on Chrome, use legacy composedPath as backup and if that fails, accept things are going to act weird
        let path = event.path ? event.path : event.composedPath ? event.composedPath() : [];
        let isAboveAnnotationLayer = path.includes(document.querySelector("div#annotation-editor")) || path.includes(document.querySelector("#annotation-toggle-btn"));

        // Ignore if editor isn't open or if editor is clicked
        if(!this.editable || !event || !event.target || isAboveAnnotationLayer)
        {
            return;
        }

        // Started dragging annotation item case
        if(event.target.getAttribute("draggable"))
        {
            let annotationID: number = null;
            if(typeof event.target.id === "string" && event.target.id.includes("annotation-item"))
            {
                annotationID = Number(event.target.id.replace("annotation-item-", ""));
            }
            else if(event.target.classList && (Array.from(event.target.classList).includes("arrow-box") || Array.from(event.target.classList).includes("freeform-box")))
            {
                annotationID = Number(event.target.parentNode.id.replace("annotation-item-", ""));
            }

            if(!isNaN(annotationID))
            {
                this._draggingID = annotationID;
                this._dragStartX = event.clientX;
                this._dragStartY = event.clientY;
            }
            return false;
        }

        // Ignore if no annotation tool selected
        if(!this.annotationTool)
        {
            return;
        }

        // Started creating arrow case
        else if(this.annotationTool.tool === "arrow")
        {
            let startPoint = new AnnotationPoint(event.clientX, event.clientY);
            this.onNewAnnotation.emit(new FullScreenAnnotationItem(
                this.annotationTool.tool,
                [startPoint, startPoint.copy()],
                this.annotationTool.colour,
                true
            ));

            this._draggingID = this.savedAnnotations.length - 1;
        }
        // Started creating freeform case
        else if(this.annotationTool.tool === "freeform")
        {
            let startPoint = new AnnotationPoint(event.clientX, event.clientY);
            this.onNewAnnotation.emit(new FullScreenAnnotationItem(
                this.annotationTool.tool,
                [startPoint],
                this.annotationTool.colour,
                true
            ));
            this._draggingID = this.savedAnnotations.length - 1;
        }
    }

    @HostListener("document:mousemove", ["$event"])
    mouseMoveListener(event)
    {
        // Dragging
        if(this._dragStartX > -1 && this._dragStartY > -1 && this._draggingID > -1 && this.savedAnnotations[this._draggingID])
        {
            if(this.savedAnnotations[this._draggingID].isGlobalPosition)
            {
                this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
            }
            else
            {
                this.savedAnnotations[this._draggingID].moveCachedBase(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
            }
            this._dragStartX = event.clientX;
            this._dragStartY = event.clientY;
        }
        // Drawing shape
        else if(this._draggingID >= 0 && this.savedAnnotations[this._draggingID])
        {   
            let newPoint = new AnnotationPoint(event.clientX, event.clientY);

            let draggingPoints = this.savedAnnotations[this._draggingID].points;
            let lastPoint = draggingPoints[draggingPoints.length - 1];

            // Creating arrow
            if(this.savedAnnotations[this._draggingID].type === "arrow")
            {
                this.savedAnnotations[this._draggingID].shiftPoint(1, newPoint.x - lastPoint.x, newPoint.y - lastPoint.y);
            }
            // Creating freeform
            else if(this.savedAnnotations[this._draggingID].type === "freeform" && newPoint.distanceTo(lastPoint) > 5)
            {
                this.savedAnnotations[this._draggingID].addPoint(newPoint);
            }
        }
        else
        {
            return;
        }

        return false;
    }

    @HostListener("document:mouseup", ["$event"])
    mouseUpListener(event)
    {
        // Finished dragging
        if(this._dragStartX > -1 && this._dragStartY > -1 && this._draggingID > -1 && this.savedAnnotations[this._draggingID])
        {
            if(this.savedAnnotations[this._draggingID].isGlobalPosition)
            {
                this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
            }
            else
            {
                this.savedAnnotations[this._draggingID].moveCachedBase(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
                this.savedAnnotations[this._draggingID].updatePointCache();
            }
        }
        // Finished drawing shape
        else if(this._draggingID >= 0 && this.savedAnnotations[this._draggingID])
        {
            // Finished creating arrow
            if(this.savedAnnotations[this._draggingID].type === "arrow")
            {   
                let xPoint = this.savedAnnotations[this._draggingID].points[1].x;
                let yPoint = this.savedAnnotations[this._draggingID].points[1].y;
                this.savedAnnotations[this._draggingID].shiftPoint(1, event.clientX - xPoint, event.clientY - yPoint);
            }
            // Finished creating freeform
            else if(this.savedAnnotations[this._draggingID].type === "freeform")
            {
                let newPoint = new AnnotationPoint(event.clientX, event.clientY);
                this.savedAnnotations[this._draggingID].addPoint(newPoint);
                this.savedAnnotations[this._draggingID].isGlobalPosition = false;
            }

            this.onToolChange.emit(new AnnotationTool(null, this.annotationTool.colour, this.annotationTool.fontSize));
        }
        else
        {
            return;
        }

        this.onEditAnnotation.emit({ id: this._draggingID, annotation: this.savedAnnotations[this._draggingID] });
        this._draggingID = -1;
        this._dragStartX = -1;
        this._dragStartY = -1;
        
        return false;
    }

    @HostListener("document:click", ["$event"])
    clickListener(event)
    {
        // event path is only fully supported on Chrome, use legacy composedPath as backup and if that fails, accept things are going to act weird
        let path = event.path ? event.path : event.composedPath ? event.composedPath() : [];
        let isAboveAnnotationLayer = path.includes(document.querySelector("div#annotation-editor")) || path.includes(document.querySelector("#annotation-toggle-btn"));
        
        // Ignore if editor isn't open or if editor is clicked
        if(!this.editable || !event || isAboveAnnotationLayer)
        {
            return;
        }

        // Verify there's an active tool
        if(this.annotationTool && this.annotationTool.tool)
        {
            let clickPoint = new AnnotationPoint(event.clientX, event.clientY);

            // Only create new text if we're not currently editing
            if(this.editingIndex === -1)
            {
                let annotationPoints = [clickPoint];
                let text: string = null;
                let complete = false;

                if(this.annotationTool.tool === "text")
                {
                    annotationPoints = [clickPoint];
                    text = "New Text";

                    this.savedAnnotations.push(new FullScreenAnnotationItem(
                        this.annotationTool.tool,
                        annotationPoints,
                        this.annotationTool.colour,
                        complete,
                        text,
                        this.annotationTool.fontSize
                    ));

                    this.onToolChange.emit(new AnnotationTool(null, this.annotationTool.colour, this.annotationTool.fontSize));
                }
            }
        }
    }

    @HostListener("document:keyup", ["$event"])
    deleteListener(event: KeyboardEvent)
    {
        if(["Delete", "Backspace"].includes(event.key) && this._isDeletable && this.editingIndex >= 0)
        {
            this.onDeleteAnnotation.emit(this.editingIndex);
        }
    }

    get annotationItems(): FullScreenAnnotationItem[]
    {
        return this.savedAnnotations.map((item, index) =>
        {
            item.id = index;
            return item;
        });
    }

    getAnnotationItemID(id: number)
    {
        return `annotation-item-${id}`;
    }

    convertFontSize(fontSize: number)
    {
        return `${fontSize}px`;
    }

    onTextChange(event: any, index: number)
    {
        if(this.editable && event && event.target && event.target.innerText !== undefined)
        {
            this.savedAnnotations[index].text = event.target.innerText;
        }
    }

    onTextClick(event: any, index: number)
    {
        if(this.editable && event && event.target && document)
        {
            this.onEditIndex.emit(index);
            this._isDeletable = false;

            let selectedAnnotation = this.savedAnnotations[index];
            this.onToolChange.emit(new AnnotationTool(this.annotationTool?.tool, selectedAnnotation.colour, selectedAnnotation.fontSize));
            if(!this.savedAnnotations[index].complete)
            {
                event.target.innerText = "";
                selectedAnnotation.text = "";
                selectedAnnotation.complete = true;
            }
        }
    }

    onDisplayClick(event: any)
    {
        if(this.editable && event && event.target)
        {
            let isAnnotationContainer = event.target.classList && Array.from(event.target.classList).includes("annotation-container");
            let isAnnotationContainerChild = event.target.offsetParent && event.target.offsetParent.className && event.target.offsetParent.className.includes("annotation-container"); 
            let isArrowBox = event.target.classList && Array.from(event.target.classList).includes("arrow-box");
            let isFreeform = event.target.classList && Array.from(event.target.classList).includes("freeform-box");
            
            if(isAnnotationContainer || isAnnotationContainerChild || isArrowBox || isFreeform)
            {
                let annotationID: number = null;
                if(isAnnotationContainer)
                {
                    annotationID = Number(event.target.id.replace("annotation-item-", ""));
                    this._isDeletable = true;
                }
                else if(isAnnotationContainerChild)
                {
                    annotationID = Number(event.target.offsetParent.id.replace("annotation-item-", ""));
                }
                else if(isArrowBox || isFreeform)
                {
                    annotationID = Number(event.target.parentNode.id.replace("annotation-item-", ""));
                    this._isDeletable = true;
                }

                if(!isNaN(annotationID))
                {
                    this.onEditIndex.emit(annotationID);
                }
            }
            else
            {
                this.onEditIndex.emit(-1);
                this._isDeletable = true;
            }
        }
    }

    get toolCursor(): string
    {
        return ANNOTATION_CURSORS[this.annotationTool?.tool || "default"];
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }
}
