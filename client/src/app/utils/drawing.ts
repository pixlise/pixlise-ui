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

import { Point, Rect } from "src/app/models/Geometry";
import { Colours, RGBA } from "src/app/utils/colours";


///////////////////////////////////////////////
// Image -> PIXELS and back...
export function getRawImageData(img: HTMLImageElement, rect: Rect = null): ImageData
{
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);

    if(rect)
    {
        return context.getImageData(rect.x, rect.y, rect.w, rect.h);
    }
    return context.getImageData(0, 0, img.width, img.height);
}



///////////////////////////////////////////////
// Drawing circles (filled vs outline)

export function drawFilledCircle(screenContext: CanvasRenderingContext2D, pt: Point, radius: number): void
{
    screenContext.beginPath();
    screenContext.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
    screenContext.fill();
}

export function drawEmptyCircle(screenContext: CanvasRenderingContext2D, pt: Point, radius: number): void
{
    screenContext.beginPath();
    screenContext.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
    screenContext.stroke();
}

/* Ended up not being used!

// NOTE: This does not complete the triangle by calling fill or stroke, this is left up to the caller, because we have some clipping
// scenarios... Caller must ensure beginPath and some finishing call is done after
export function drawTriangleCoordinates(screenContext: CanvasRenderingContext2D, pt: Point, radius: number): void
{
    // Draw a triangle centered on coord

    // Triangle peak is just a radius move UP (note - is up in draw coord space)
    screenContext.moveTo(pt.x, pt.y-radius);

    // calculate the x/y offset for bottom points
    let xOffset = Math.sin(degToRad(60))*radius;
    let yOffset = Math.cos(degToRad(60))*radius;

    screenContext.lineTo(pt.x+xOffset, pt.y+yOffset);
    screenContext.lineTo(pt.x-xOffset, pt.y+yOffset);
    screenContext.lineTo(pt.x, pt.y-radius);
}
*/

export function drawPlusCoordinates(screenContext: CanvasRenderingContext2D, pt: Point, size: number): void
{
    // Draw centered around pt. Need half-width of 1 arm:
    const armHalfWidth = size / 8;
    const armLength = size / 2;//-armHalfWidth;

    // Note: y negative is up on screen

    screenContext.moveTo(pt.x - armHalfWidth, pt.y - armHalfWidth);

    // Top arm
    screenContext.lineTo(pt.x - armHalfWidth, pt.y - armLength);
    screenContext.lineTo(pt.x + armHalfWidth, pt.y - armLength);
    screenContext.lineTo(pt.x + armHalfWidth, pt.y - armHalfWidth);

    // Right arm
    screenContext.lineTo(pt.x + armLength, pt.y - armHalfWidth);
    screenContext.lineTo(pt.x + armLength, pt.y + armHalfWidth);
    screenContext.lineTo(pt.x + armHalfWidth, pt.y + armHalfWidth);

    // Bottom arm
    screenContext.lineTo(pt.x + armHalfWidth, pt.y + armLength);
    screenContext.lineTo(pt.x - armHalfWidth, pt.y + armLength);
    screenContext.lineTo(pt.x - armHalfWidth, pt.y + armHalfWidth);

    // Left arm
    screenContext.lineTo(pt.x - armLength, pt.y + armHalfWidth);
    screenContext.lineTo(pt.x - armLength, pt.y - armHalfWidth);
    screenContext.lineTo(pt.x - armHalfWidth, pt.y - armHalfWidth);
}

export function drawPointCrosshair(screenContext: CanvasRenderingContext2D, pt: Point, radius: number, zoomFactor: number, crossLength: number)
{
    screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
    screenContext.lineWidth = 3 / zoomFactor;

    // Draw a circle
    drawEmptyCircle(screenContext, pt, radius);

    // Draw the + bits
    screenContext.beginPath();
    screenContext.moveTo(pt.x - radius, pt.y);
    screenContext.lineTo(pt.x - radius - crossLength, pt.y);

    screenContext.moveTo(pt.x + radius, pt.y);
    screenContext.lineTo(pt.x + radius + crossLength, pt.y);

    screenContext.moveTo(pt.x, pt.y - radius);
    screenContext.lineTo(pt.x, pt.y - radius - crossLength);

    screenContext.moveTo(pt.x, pt.y + radius);
    screenContext.lineTo(pt.x, pt.y + radius + crossLength);
    screenContext.stroke();
}


///////////////////////////////////////////////
// Point drawing

export const HOVER_POINT_RADIUS = 4;

export const CANVAS_FONT_SIZE = 12;
export const CANVAS_FONT_SIZE_TITLE = 14;

// Used in places where we need a rough estimate of the length of text in pixels
// because characters are on average 70% as wide as tall. This is only useful if
// we don't need an exact measurement
export const CANVAS_FONT_WIDTH_PERCENT = 0.7;

//export const PLOT_POINTS_AS_CIRCLES = true;
export const PLOT_POINTS_SIZE = 3;

export const OUTLINE_LINE_WIDTH = 1;

export class PointDrawer
{
    _screenContext: CanvasRenderingContext2D;
    _fillColour: RGBA = null;
    _outlineColour: RGBA = null;
    _size: number;
    _shape: string;

    constructor(screenContext: CanvasRenderingContext2D, size: number, fillColour: RGBA, outlineColour: RGBA, shape: string = "circle")
    {
        this._screenContext = screenContext;
        this._fillColour = fillColour;
        this._outlineColour = outlineColour;
        this._size = size;
        this._shape = shape;
    }

    static getOpacity(pointCount: number): number
    {
        // At 5000 points, we want 20% opacity, ramping up to 70% opacity at 50 points
        let clampedCount = pointCount > 5000 ? 5000 : pointCount;
        if(clampedCount < 50)
        {
            clampedCount = 50;
        }

        let pointPct = 1 - (clampedCount - 50) / 4950;
        let a = 0.2 + 0.5 * pointPct;
        return a;
    }

    drawPoints(points: Point[], colourAlpha: number): void
    {
        // Setup the context for drawing this
        if(this._fillColour)
        {
            this._screenContext.fillStyle = this._fillColour.asStringWithA(colourAlpha);
        }

        if(this._outlineColour)
        {
            this._screenContext.strokeStyle = this._outlineColour.asStringWithA(colourAlpha);
        }

        for(let pt of points)
        {
            if(this._shape === "triangle")
            {
                this._screenContext.beginPath();
                this._screenContext.moveTo(pt.x-this._size, pt.y+this._size);
                this._screenContext.lineTo(pt.x, pt.y-this._size);
                this._screenContext.lineTo(pt.x+this._size, pt.y+this._size);
            }
            else if(this._shape === "square")
            {
                this._screenContext.fillRect(pt.x-this._size, pt.y-this._size, this._size*2, this._size*2);
            }
            else if(this._shape === "cross")
            {
                this._screenContext.beginPath();
                this._screenContext.fillRect(pt.x-this._size, pt.y-1/4*this._size, this._size*2, this._size/2);
                this._screenContext.fillRect(pt.x-1/4*this._size, pt.y-this._size, this._size/2, this._size*2);
            }
            else
            {
                // Default case is circle
                this._screenContext.beginPath();
                this._screenContext.arc(pt.x, pt.y, this._size, 0, 2 * Math.PI);
            }

            if(this._fillColour)
            {
                this._screenContext.fill();
            }

            if(this._outlineColour)
            {
                this._screenContext.stroke();
            }
        }
    }
}


///////////////////////////////////////////////
// Line drawing

export class OutlineDrawer
{
    _screenContext: CanvasRenderingContext2D;
    _outlineColour: RGBA;
    _lineWidth: number;

    constructor(screenContext: CanvasRenderingContext2D, lineWidth: number, outlineColour: RGBA)
    {
        this._screenContext = screenContext;
        this._lineWidth = lineWidth;
        this._outlineColour = outlineColour;

        // Setup the context for drawing this
        this._screenContext.strokeStyle = this._outlineColour.asString();
    }

    drawOutline(points: Point[]): void
    {
        let count = points.length;
        if(count <= 0)
        {
            return;
        }

        this._screenContext.beginPath();
        this._screenContext.moveTo(points[0].x, points[0].y);
        for(let c = 1; c < count; c++)
        {
            this._screenContext.lineTo(points[c].x, points[c].y);
        }

        this._screenContext.closePath();
        this._screenContext.stroke();
    }
}



export function drawSwapButton(screenContext: CanvasRenderingContext2D, buttonCenter: Point, buttonSize: number): void
{
    const buttonSizeHalf = buttonSize / 2;

    screenContext.save();

    // Background
    screenContext.fillStyle = Colours.GRAY_60.asString();
    screenContext.fillRect(buttonCenter.x - buttonSizeHalf, buttonCenter.y - buttonSizeHalf, buttonSize, buttonSize);

    // Swap circle
    let radius = buttonSize * 0.28;
    screenContext.strokeStyle = Colours.GRAY_10.asString();
    screenContext.lineWidth = 1;
    screenContext.beginPath();
    screenContext.arc(buttonCenter.x, buttonCenter.y, radius, 0, 2 * Math.PI);
    screenContext.stroke();

    // And arrow head triangles
    let arrowHeadHalfSize = 2;
    screenContext.fillStyle = Colours.GRAY_10.asString();

    screenContext.beginPath();
    screenContext.moveTo(buttonCenter.x - radius - arrowHeadHalfSize, buttonCenter.y);
    screenContext.lineTo(buttonCenter.x - radius + arrowHeadHalfSize, buttonCenter.y);
    screenContext.lineTo(buttonCenter.x - radius, buttonCenter.y + arrowHeadHalfSize);
    screenContext.fill();

    screenContext.beginPath();
    screenContext.moveTo(buttonCenter.x + radius - arrowHeadHalfSize, buttonCenter.y);
    screenContext.lineTo(buttonCenter.x + radius + arrowHeadHalfSize, buttonCenter.y);
    screenContext.lineTo(buttonCenter.x + radius, buttonCenter.y - arrowHeadHalfSize);
    screenContext.fill();

    screenContext.restore();
}

export function drawErrorIcon(screenContext: CanvasRenderingContext2D, center: Point, size: number): void
{
    const radius = size / 2;

    screenContext.save();

    // Background
    screenContext.fillStyle = Colours.ORANGE.asString();

    screenContext.beginPath();
    screenContext.moveTo(center.x, center.y - radius);
    screenContext.lineTo(center.x + radius, center.y + radius);
    screenContext.lineTo(center.x - radius, center.y + radius);
    screenContext.closePath();
    screenContext.fill();

    // Draw the !
    screenContext.font = "bold " + (size) + "px Roboto";
    screenContext.fillStyle = Colours.GRAY_80.asString();

    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";

    screenContext.fillText("!", center.x, center.y + 3);

    screenContext.restore();
}

export type TooltipText = {
    text: string;
    colour: RGBA;
    fontSize?: number;
    bold?: boolean;
}

export function drawToolTip(
    screenContext: CanvasRenderingContext2D,
    //viewport: CanvasParams,
    pos: Point,
    drawOnLeft: boolean,
    title: string,
    message: string | TooltipText | TooltipText[],
    fontSize: number = 12,
    backgroundColour: string | RGBA = Colours.GRAY_90.asStringWithA(0.8)
): void
{
    const LABEL_TXT_GAP = 10;

    let messages: TooltipText[] = [];
    if(title)
    {
        messages.push({ text: title, colour: Colours.GRAY_10, fontSize, bold: true });
    }

    if(typeof message === "string")
    {
        messages.push({ text: message, colour: Colours.GRAY_10, fontSize });
    }
    else if(!Array.isArray(message))
    {
        messages = [message];
    }
    else
    {
        messages = message;
    }

    const maxWidth = Math.max(
        screenContext.measureText(title).width,
        ...messages.map((msg) => screenContext.measureText(msg.text).width)
    );

    const rect = new Rect(
        pos.x,
        pos.y,
        LABEL_TXT_GAP * 2 + maxWidth,
        LABEL_TXT_GAP + messages.length * (fontSize + LABEL_TXT_GAP)
    );

    let txtX = rect.x + LABEL_TXT_GAP;
    if(drawOnLeft)
    {
        rect.x -= rect.w;
        txtX = rect.maxX() - LABEL_TXT_GAP;
    }

    screenContext.fillStyle = typeof backgroundColour === "string" ? backgroundColour : backgroundColour.asString();
    screenContext.fillRect(rect.x, rect.y, rect.w, rect.h);

    const align: CanvasTextAlign = drawOnLeft ? "right" : "left";
    screenContext.textAlign = align;
    screenContext.textBaseline = "top";

    messages.forEach((msg, i) =>
    {
        screenContext.font = `${msg.bold ? "bold " : ""}${msg.fontSize || fontSize}px Roboto`;
        screenContext.fillStyle = msg.colour.asString();
        screenContext.fillText(msg.text, txtX, rect.y + LABEL_TXT_GAP + i * (msg.fontSize || fontSize + LABEL_TXT_GAP));
    });

}

export function rgbBytesToImage(bytes: Uint8Array, width: number, height: number): HTMLImageElement
{
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    let context = canvas.getContext("2d");
    let imgData = context.createImageData(width, height);

    let srcIndex = 0;
    let dstIndex = 0;
    const totalPixels = width * height;

    for(let c = 0; c < totalPixels; c++)
    {
        imgData.data[dstIndex] = bytes[srcIndex]; // r
        imgData.data[dstIndex + 1] = bytes[srcIndex + 1]; // g
        imgData.data[dstIndex + 2] = bytes[srcIndex + 2]; // b
        imgData.data[dstIndex + 3] = 255; // a=100%
        srcIndex += 3;
        dstIndex += 4;
    }

    context.putImageData(imgData, 0, 0);

    let result = document.createElement("img");
    result.src = canvas.toDataURL(); // make base64 string of image, yuck, slow...
    result.width = width;
    result.height = height;
    return result;
}

export function alphaBytesToImage(alphaBytes: Uint8Array, width: number, height: number, rgb: RGBA): HTMLImageElement
{
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    let context = canvas.getContext("2d");
    let imgData = context.createImageData(width, height);

    let srcIndex = 0;
    let dstIndex = 0;
    const totalPixels = width * height;

    for(let c = 0; c < totalPixels; c++)
    {
        imgData.data[dstIndex] = rgb.r;
        imgData.data[dstIndex + 1] = rgb.g;
        imgData.data[dstIndex + 2] = rgb.b;
        imgData.data[dstIndex + 3] = alphaBytes[srcIndex]; // a
        srcIndex++;
        dstIndex += 4;
    }

    context.putImageData(imgData, 0, 0);

    let result = document.createElement("img");
    result.src = canvas.toDataURL(); // make base64 string of image, yuck, slow...
    return result;
}

export function drawTextWithBackground(
    ctx: CanvasRenderingContext2D,
    text: string,
    textX: number,
    textY: number,
    fontSize: number,
    padding: number,
    backgroundColour: string = Colours.GRAY_100.asStringWithA(0.5),
    textColour: string = Colours.GRAY_10.asString(),
    ensureWithinRect: Rect = null): void
{
    ctx.save();
    // Measure, so we can position it
    let sz = ctx.measureText(text);

    let labelRect = new Rect(textX - padding, textY - padding, sz.width + padding + padding, fontSize + padding + padding);

    if(ctx.textAlign == "end" || ctx.textAlign == "right")
    {
        // Text alignment is to the end, so our specified textX and textY points are the right end of the text
        // and label background needs to be drawn accordingly
        labelRect.x -= labelRect.w - padding;
    }

    if(ensureWithinRect)
    {
        // If we're past the ends of the rect, reposition so we are fully visible
        if(labelRect.maxX() > ensureWithinRect.maxX())
        {
            labelRect.x -= labelRect.maxX() - ensureWithinRect.maxX();
        }

        if(labelRect.x < ensureWithinRect.x)
        {
            labelRect.x += ensureWithinRect.x - labelRect.x;
        }
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    // Draw a background box
    ctx.fillStyle = backgroundColour;
    ctx.fillRect(labelRect.x, labelRect.y, labelRect.w, labelRect.h);

    // Draw text
    ctx.font = fontSize + "px Roboto";
    ctx.fillStyle = textColour;

    ctx.fillText(text, labelRect.x + padding, labelRect.y + padding);
    ctx.restore();
}

export function adjustImageRGB(img: HTMLImageElement, brightness: number): HTMLImageElement
{
    if(brightness < 0)
    {
        brightness = 0;
    }

    let raw = getRawImageData(img, null);

    // Multiply by brightness
    const pixels = raw.width * raw.height;
    const pixelBytes = pixels * 4;

    let newImageBytes = new Uint8Array(pixels * 3);

    let writeIdx = 0;
    for(let c = 0; c < pixelBytes; c += 4)
    {
        newImageBytes[writeIdx] = Math.min(255, raw.data[c] * brightness);
        newImageBytes[writeIdx + 1] = Math.min(255, raw.data[c + 1] * brightness);
        newImageBytes[writeIdx + 2] = Math.min(255, raw.data[c + 2] * brightness);
        writeIdx += 3;
    }

    return rgbBytesToImage(newImageBytes, raw.width, raw.height);
}


// https://stackoverflow.com/questions/5026961/html5-canvas-ctx-filltext-wont-do-line-breaks
// http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
export function wrapText(context, text, x, y, maxWidth, lineHeight)
{
    let cars = text.split("\n");

    for(let ii = 0; ii < cars.length; ii++)
    {
        let line = "";
        let words = cars[ii].split(" ");

        for(let n = 0; n < words.length; n++)
        {
            let testLine = line + words[n] + " ";
            let metrics = context.measureText(testLine);
            let testWidth = metrics.width;

            if(testWidth > maxWidth)
            {
                context.fillText(line, x, y);
                line = words[n] + " ";
                y += lineHeight;
            }
            else
            {
                line = testLine;
            }
        }

        context.fillText(line, x, y);
        y += lineHeight;
    }
}