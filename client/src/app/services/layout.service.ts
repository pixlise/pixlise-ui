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

import { Injectable } from "@angular/core";
import { ReplaySubject, timer } from "rxjs";



// TODO: remove LayoutService. ViewStateService is now what is really persisting the states, so no point
//       having this around anymore. One thing that it does do independently is the canvas resizing...

@Injectable({
    providedIn: "root"
})
export class LayoutService
{
    private _showScatterPlot = false;

    private _resizeCanvas$ = new ReplaySubject<void>(1);

    constructor()
    {
    }

    get resizeCanvas$(): ReplaySubject<void>
    {
        // Something just subscribed, schedule a notification in a second
        // This should fix some chord/ternary/binary diagram issues where they reset and
        // are too small until a window resize or data reset.
        // TODO: Remove this hack!
        this.delayNotifyCanvasResize(10);

        return this._resizeCanvas$;
    }

    get showScatterPlot(): boolean
    {
        return this._showScatterPlot;
    }

    set showScatterPlot(val: boolean)
    {
        this._showScatterPlot = val;
    }

    notifyNgAfterViewInit(): void
    {
        // TODO: This is an ugly hack - we check if canvases need resizing 2 and 4 sec after the window is initialized.
        //       These numbers happen to work. This sucks. We need a proper mechanism, to be implemented when we re-evaluate the
        //       UI layout tools/options. For the science meeting this will get us by.
        for(let c = 1000; c < 8000; c += 1000)
        {
            this.delayNotifyCanvasResize(c);
        }
    }

    notifyWindowResize(): void
    {
        // Window resized, notify all canvases
        this._resizeCanvas$.next();
    }

    private delayNotifyCanvasResize(delayMS: number): void
    {
        // Wait a bit & then notify canvases to recalculate their size
        const source = timer(delayMS);
        const abc = source.subscribe(val => 
        {
            this._resizeCanvas$.next();
        });
    }
}
