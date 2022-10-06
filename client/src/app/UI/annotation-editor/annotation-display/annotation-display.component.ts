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
};

export class FullScreenAnnotationItem
{
    private _x: number = 0;
    private _y: number = 0;
    
    private _width: number = 0;
    private _height: number = 0;

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

    addPoint(newPoint: AnnotationPoint)
    {
        this.points.push(newPoint);
        this._calcDimensions();
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
        if(!this.editable || !event || event.path.includes(document.querySelector("div#annotation-editor")) || event.path.includes(document.querySelector("#annotation-toggle-btn")))
        {
            return;
        }

        if(event && event.target && event.target.getAttribute("draggable") && event.target.id)
        {
            let annotationID: number = Number(event.target.id.replace("annotation-item-", ""));
            if(!isNaN(annotationID))
            {
                this._draggingID = annotationID;
                this._dragStartX = event.clientX;
                this._dragStartY = event.clientY;
            }
            return false;
        }
    }

    @HostListener("document:mousemove", ["$event"])
    mouseMoveListener(event)
    {
        if(this._dragStartX === -1 || this._dragStartY === -1 || this._draggingID === -1)
        {
            return;
        }

        this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
        this._dragStartX = event.clientX;
        this._dragStartY = event.clientY;

        return false;
    }

    @HostListener("document:mouseup", ["$event"])
    mouseUpListener(event)
    {
        if(this._dragStartX === -1 || this._dragStartY === -1 || this._draggingID === -1)
        {
            return;
        }

        this.savedAnnotations[this._draggingID].moveAllPoints(event.clientX - this._dragStartX, event.clientY - this._dragStartY);
        this._dragStartX = event.clientX;
        this._dragStartY = event.clientY;

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
                    this.onToolChange.emit(new AnnotationTool(null, this.annotationTool.colour, this.annotationTool.fontSize));
                }

                this.savedAnnotations.push(new FullScreenAnnotationItem(
                    this.annotationTool.tool,
                    annotationPoints,
                    this.annotationTool.colour,
                    complete,
                    text,
                    this.annotationTool.fontSize
                ));
                if(!["text"].includes(this.annotationTool.tool))
                {
                    this.onEditIndex.emit(this.savedAnnotations.length - 1);
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
