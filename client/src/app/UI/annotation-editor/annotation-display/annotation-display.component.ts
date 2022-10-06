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
import { DataSetService } from "src/app/services/data-set.service";
import { ViewStateService } from "src/app/services/view-state.service";
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
    constructor(
        public x: number,
        public y: number,
        public screenWidth: number, 
        public screenHeight: number,
    ) {}

    copy(): AnnotationPoint
    {
        return new AnnotationPoint(this.x, this.y, this.screenWidth, this.screenHeight);
    }

    distanceTo(nextPoint: AnnotationPoint): number
    {
        return Math.sqrt(Math.pow(nextPoint.x - this.x, 2) + Math.pow(nextPoint.y - this.y, 2));
    }
};

export class FullScreenAnnotationItem
{
    private _x: number = 0;
    private _y: number = 0;
    
    private _width: number = 100;
    private _height: number = 100;

    private _pointPairs: [AnnotationPoint, AnnotationPoint][];

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
        let [minX, maxX, minY, maxY] = [0,0,0,0];
        if(this.points.length > 0)
        {
            [minX, maxX, minY, maxY] = [this.points[0].x, this.points[0].x, this.points[0].y, this.points[0].y];
        }
        this.points.forEach(point =>
        {
            minX = Math.min(point.x, minX);
            maxX = Math.max(point.x, maxX);
            minY = Math.min(point.y, minY);
            maxY = Math.max(point.y, maxY);
        });

        this._x = minX;
        this._y = minY;
        this._width = maxX - minX;
        this._height = maxY - minY;
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
            pairs.push([lastValue, point]);
            lastValue = point;
        });

        this._pointPairs = pairs;
    }

    addPoint(newPoint: AnnotationPoint)
    {
        this._pointPairs.push([this.points[this.points.length - 1], newPoint]);
        this.points.push(newPoint);


        let minX = Math.min(newPoint.x, this._x);
        let maxX = Math.max(newPoint.x, this._x + this.width);
        let minY = Math.min(newPoint.y, this._y);
        let maxY = Math.max(newPoint.y, this._y + this.height);

        this._x = minX;
        this._y = minY;
        this._width = maxX - minX;
        this._height = maxY - minY;
    }

    shiftPoint(index: number, xShift: number, yShift: number)
    {
        this.points[index].x += xShift;
        this.points[index].y += yShift;

        let minX = Math.min(this.points[index].x, this._x);
        let maxX = Math.max(this.points[index].x, this._x + this.width);
        let minY = Math.min(this.points[index].y, this._y);
        let maxY = Math.max(this.points[index].y, this._y + this.height);

        this._x = minX;
        this._y = minY;
        this._width = maxX - minX;
        this._height = maxY - minY;

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

        this._x += offsetX;
        this._y += offsetY;
        this._generatePointPairs();
    }

    get pointPairs(): [AnnotationPoint, AnnotationPoint][]
    {
        return this._pointPairs;
    }

    get width(): number
    {
        return this._width;
    }

    get widthStr(): string
    {
        return `${this._width}px`;
    }

    get height(): number
    {
        return this._height;
    }

    get heightStr(): string
    {
        return `${this._height}px`;
    }

    get x(): number
    {
        return this._x;
    }

    get xStr(): string
    {
        return `${this._x}px`;
    }

    get y(): number
    {
        return this._y;
    }

    get yStr(): string
    {
        return `${this._y}px`;
    }
}

@Component({
    selector: "annotation-display",
    templateUrl: "./annotation-display.component.html",
    styleUrls: ["./annotation-display.component.scss"]
})
export class AnnotationDisplayComponent implements OnInit
{
    private _subs = new Subscription();

    @Input() editable: boolean = false;
    @Input() annotationTool: AnnotationTool = null;
    @Input() savedAnnotations: FullScreenAnnotationItem[] = null;
    @Input() editingIndex: number = -1;

    @Output() onToolChange = new EventEmitter();
    @Output() onEditIndex = new EventEmitter();

    _draggingID: number = -1;
    _dragStartX: number = -1;
    _dragStartY: number = -1;

    constructor(
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
    )
    {
    }

    makeBoundingBox(topLeftPoint: AnnotationPoint, width: number, height: number)
    {
        let topRightPoint = topLeftPoint.copy();
        topRightPoint.x += width;

        let bottomLeftPoint = topLeftPoint.copy();
        bottomLeftPoint.y += height;

        let bottomRightPoint = topRightPoint.copy();
        bottomRightPoint.y += height;

        return [topLeftPoint, topRightPoint, bottomLeftPoint, bottomRightPoint];
    }

    @HostListener("document:mousedown", ["$event"])
    mouseDownListener(event)
    {
        // Ignore if editor isn't open or if editor is clicked
        if(!this.editable || !event || !event.target || event.path.includes(document.querySelector("div#annotation-editor")) || event.path.includes(document.querySelector("#annotation-toggle-btn")))
        {
            return;
        }

        // Dragging annotation item case
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

        // Creating arrow case
        else if(this.annotationTool.tool === "arrow")
        {
            let startPoint = new AnnotationPoint(event.clientX, event.clientY, event.view.innerWidth, event.view.innerHeight);
            this.savedAnnotations.push(new FullScreenAnnotationItem(
                this.annotationTool.tool,
                [startPoint, startPoint.copy()],
                this.annotationTool.colour,
                true
            ));

            this._draggingID = this.savedAnnotations.length - 1;
        }
        // Creating freeform
        else if(this.annotationTool.tool === "freeform")
        {
            let startPoint = new AnnotationPoint(event.clientX, event.clientY, event.view.innerWidth, event.view.innerHeight);
            this.savedAnnotations.push(new FullScreenAnnotationItem(
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
            this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
            this._dragStartX = event.clientX;
            this._dragStartY = event.clientY;
        }
        // Drawing shape
        else if(this._draggingID >= 0 && this.savedAnnotations[this._draggingID])
        {   
            let newPoint = new AnnotationPoint(event.clientX, event.clientY, event.view.innerWidth, event.view.innerHeight);

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
        if(this._dragStartX > -1 && this._dragStartY > -1 && this._draggingID > -1 && this.savedAnnotations[this._draggingID])
        {
            this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
            this._dragStartX = event.clientX;
            this._dragStartY = event.clientY;
        }
        else if(this._draggingID >= 0 && this.savedAnnotations[this._draggingID])
        {
            if(this.savedAnnotations[this._draggingID].type === "arrow")
            {   
                let xPoint = this.savedAnnotations[this._draggingID].points[1].x;
                let yPoint = this.savedAnnotations[this._draggingID].points[1].y;
                this.savedAnnotations[this._draggingID].shiftPoint(1, event.clientX - xPoint, event.clientY - yPoint);
            }
            else if(this.savedAnnotations[this._draggingID].type === "freeform")
            {
                let newPoint = new AnnotationPoint(event.clientX, event.clientY, event.view.innerWidth, event.view.innerHeight);
                this.savedAnnotations[this._draggingID].addPoint(newPoint);
            }

            this.onToolChange.emit(new AnnotationTool(null, this.annotationTool.colour, this.annotationTool.fontSize));
        }
        else
        {
            return;
        }

        this._draggingID = -1;
        this._dragStartX = -1;
        this._dragStartY = -1;
        
        return false;
    }

    @HostListener("document:click", ["$event"])
    clickListener(event)
    {
        // Ignore if editor isn't open or if editor is clicked
        if(!this.editable || !event || event.path.includes(document.querySelector("div#annotation-editor")) || event.path.includes(document.querySelector("#annotation-toggle-btn")))
        {
            return;
        }

        // Verify there's an active tool
        if(this.annotationTool && this.annotationTool.tool)
        {
            let clickPoint = new AnnotationPoint(event.clientX, event.clientY, event.view.innerWidth, event.view.innerHeight);
            if(this.editingIndex >= 0)
            {
                // This isn't the first click
            }
            else
            {
                let annotationPoints = [clickPoint];
                let text: string = null;
                let complete = false;

                if(this.annotationTool.tool === "text")
                {
                    annotationPoints = this.makeBoundingBox(clickPoint, 82, 20);
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
        else
        {
            // If no active tool, check for moving/resizing
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
            let selectedAnnotation = this.savedAnnotations[index];
            this.onToolChange.emit(new AnnotationTool(this.annotationTool.tool, selectedAnnotation.colour, selectedAnnotation.fontSize));
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
            let isAnnotationContainerChild = event.target.offsetParent && event.target.offsetParent.className && event.target.offsetParent.className.includes("annotation-container"); 
            let isArrowBox = event.target.classList && Array.from(event.target.classList).includes("arrow-box");
            let isFreeform = event.target.classList && Array.from(event.target.classList).includes("freeform-box");

            let isAnnotationItem = isAnnotationContainerChild || isArrowBox || isFreeform;
            if(isAnnotationItem)
            {
                let annotationID: number = null;
                if(isAnnotationContainerChild)
                {
                    annotationID = Number(event.target.offsetParent.id.replace("annotation-item-", ""));
                }
                else if(isArrowBox || isFreeform)
                {
                    annotationID = Number(event.target.parentNode.id.replace("annotation-item-", ""));
                }
                if(!isNaN(annotationID))
                {
                    this.onEditIndex.emit(annotationID);
                }
            }
            else
            {
                this.onEditIndex.emit(-1);
            }
        }
    }

    get toolCursor(): string
    {
        return ANNOTATION_CURSORS[this.annotationTool?.tool || "default"];
    }


    ngOnInit(): void
    {
    }

    ngAfterViewInit()
    {
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }
}
