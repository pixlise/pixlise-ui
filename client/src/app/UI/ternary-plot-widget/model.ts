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

import { Point, Rect, scaleVector } from "src/app/models/Geometry";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { CANVAS_FONT_SIZE_TITLE, HOVER_POINT_RADIUS, PLOT_POINTS_SIZE } from "src/app/utils/drawing";
import { degToRad } from "src/app/utils/utils";
import { TernaryData, TernaryDataItem } from "./ternary-data";


export class TernaryDrawModel
{
    triangleWidth: number = null;
    triangleHeight: number = null;

    // Coordinates we draw the points at
    pointGroupCoords: Point[][] = [];
    totalPointCount: number = 0;

    // Triangle points
    //    C
    //
    // A     B
    triangleA: Point = null;
    triangleB: Point = null;
    triangleC: Point = null;

    dataAreaA: Point = null;
    dataAreaWidth: number = null;

    labelA: Rect = null;
    labelB: Rect = null;
    labelC: Rect = null;

    hoverLabelA: Point = null;
    hoverLabelB: Point = null;
    hoverLabelC: Point = null;

    // If a label is hovered over with the mouse, we set its name (A, B or C)
    hoverLabel: string = null;


    regenerate(raw: TernaryData, canvasParams: CanvasParams): void
    {
        this.totalPointCount = 0;
        let labelHeight = TernaryModel.FONT_SIZE+TernaryModel.LABEL_PADDING+TernaryModel.OUTER_PADDING;

        // Calculate triangle height (to make it equilateral) - assuming height is not the constraining direction
        this.triangleWidth = canvasParams.width-TernaryModel.OUTER_PADDING-TernaryModel.OUTER_PADDING;

        // Equilateral triangle height = sqrt(3)*height
        let ratio = Math.sqrt(3)/2;
        this.triangleHeight = this.triangleWidth*ratio;

        let triangleLeft = TernaryModel.OUTER_PADDING;
        let triangleTop = labelHeight+(canvasParams.height-this.triangleHeight-labelHeight*2)/2;

        // If this won't fit, go by the height and center it width-wise
        if((this.triangleHeight+labelHeight*2) > canvasParams.height)
        {
            //h=w*sqrt(3)/2
            //w=h/(sqrt(3)/2)

            this.triangleHeight = canvasParams.height-labelHeight*2;
            this.triangleWidth = this.triangleHeight/ratio;
            //console.log('TERNARY: new tri size: '+this.triangleWidth+'x'+this.triangleHeight);
            triangleLeft = (canvasParams.width-this.triangleWidth)/2;
            triangleTop = labelHeight+(canvasParams.height-this.triangleHeight-labelHeight*2)/2;
        }

        let xLabelOffset = (canvasParams.width-this.triangleWidth)/4;
        if(xLabelOffset < TernaryModel.OUTER_PADDING)
        {
            xLabelOffset = TernaryModel.OUTER_PADDING;
        }

        // Calculate triangle and element label coordinates
        this.triangleA = new Point(triangleLeft, triangleTop+this.triangleHeight);
        this.triangleB = new Point(triangleLeft+this.triangleWidth, triangleTop+this.triangleHeight);
        this.triangleC = new Point(canvasParams.width/2, triangleTop);
        //console.log('A:'+this.triangleA.x+','+this.triangleA.y+' B:'+this.triangleB.x+','+this.triangleB.y+' C:'+this.triangleC.x+','+this.triangleC.y+' w='+this.triangleWidth+', h='+this.triangleHeight);
        // Make sure the labels end up in the right place!
        let labelAreaW = canvasParams.width*0.4;
        let bottomLabelY = canvasParams.height-(TernaryModel.FONT_SIZE+TernaryModel.LABEL_PADDING);
        this.labelA = new Rect(xLabelOffset-labelAreaW/2, bottomLabelY, labelAreaW, TernaryModel.SWAP_BUTTON_SIZE);
        this.labelB = new Rect(canvasParams.width-xLabelOffset-labelAreaW/2, bottomLabelY, labelAreaW, TernaryModel.SWAP_BUTTON_SIZE);
        this.labelC = new Rect(this.triangleC.x-labelAreaW/2, this.triangleC.y-labelHeight+TernaryModel.LABEL_PADDING, labelAreaW, TernaryModel.SWAP_BUTTON_SIZE);

        // If labels hang off view, push them in
        if(this.labelA.x < 0)
        {
            this.labelA.x = 0;
        }
        let rightOffset = this.labelB.maxX() - canvasParams.width;
        if(rightOffset > 0)
        {
            this.labelB.x -= rightOffset;
        }

        // Hover data positions
        let hoverUp = 50;
        this.hoverLabelA = new Point(this.triangleA.x+20, this.triangleA.y-hoverUp); // left triangle point, but further up for space. Draw right-aligned!
        this.hoverLabelB = new Point(this.triangleB.x-20, this.triangleB.y-hoverUp); // right triangle point, but further up for space
        this.hoverLabelC = new Point(this.triangleC.x+10, this.triangleC.y); // right of top triangle point

        // Calculate data coordinates
        // We have to pad the drawn triangle based on point sizes we draw
        let dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS)*2;
        // This padding is applied into the corners of the triangle, differs in X and Y:
        let dataPaddingX = Math.cos(degToRad(30))*dataPadding;
        let dataPaddingY = Math.sin(degToRad(30))*dataPadding;

        this.dataAreaA = new Point(this.triangleA.x+dataPaddingX, this.triangleA.y-dataPaddingY);
        this.dataAreaWidth = this.triangleB.x-this.triangleA.x-dataPaddingX*2;

        // Loop through and calculate x/y coordinates for each point
        this.pointGroupCoords = [];
        for(let item of raw.pointGroups)
        {
            let coords = [];

            for(let ternaryItem of item.values)
            {
                coords.push(this.calcPointForTernary(ternaryItem));
            }

            this.pointGroupCoords.push(coords);
            this.totalPointCount += coords.length;
        }
    }

    private calcPointForTernary(ternaryPoint: TernaryDataItem): Point
    {
        // Using https://en.wikipedia.org/wiki/Ternary_plot
        // "Plotting a ternary plot" formuula
        let sum = ternaryPoint.a+ternaryPoint.b+ternaryPoint.c;
        let twoD = new Point(
            0.5*((2*ternaryPoint.b+ternaryPoint.c)/sum),
            0.866025403784439*(ternaryPoint.c/sum)
        );

        // NOTE: y is flipped for drawing!
        twoD.y = -twoD.y;

        //console.log('twoD: '+twoD.x+','+twoD.y);

        // This fits an equilateral triangle of side length=1. We need to scale it to our triangle size, so we need
        // to scale it. Triangle width and height are not equal, but our scale factor should be... we need the size=1
        // triangle to scale up to our triangle size, which has a side length of triangleWidth
        let scale = this.dataAreaWidth;

        let result = scaleVector(twoD, scale);

        // Now translate it so it starts where our triangle starts
        result.x += this.dataAreaA.x;
        result.y += this.dataAreaA.y;

        return result;
    }
}

export class TernaryModel
{
    // Some commonly used constants
    public static readonly OUTER_PADDING = 10;
    public static readonly LABEL_PADDING = 4;
    public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE-1;
    public static readonly SWAP_BUTTON_SIZE = 16;

    // The raw data we start with
    private _raw: TernaryData = null;

    // The drawable data (derived from the above)
    private _drawData: TernaryDrawModel = null;

    // Settings for drawing
    hoverPoint: Point = null;
    hoverPointData: TernaryDataItem = null;

    cursorShown: string = CursorId.defaultPointer;
    mouseLassoPoints: Point[] = null;
    showMmol: boolean = false;
    selectModeExcludeROI: boolean = false;

    set raw(r: TernaryData)
    {
        this._raw = r;
    }

    get raw(): TernaryData
    {
        return this._raw;
    }

    get drawData(): TernaryDrawModel
    {
        return this._drawData;
    }

    recalcDisplayData(canvasParams: CanvasParams): boolean
    {
        if(!this._raw)
        {
            return false;
        }

        this._drawData = new TernaryDrawModel();
        this._drawData.regenerate(this._raw, canvasParams);
        return true;
    }
}
