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
import { ReplaySubject, Subject } from "rxjs";
import { UserHints, UserOptionsService } from "./user-options.service";



export class SnackParams
{
    constructor(
        public message: string,
        public action: string, public id: number,
        public action2: string = null
    )
    {
    }
}

export class SnackEvent
{
    constructor(
        public id: number,
        public action: string,
    )
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class SnackService
{
    private _snacks$ = new ReplaySubject<SnackParams[]>(1);
    private _snacksEvents$ = new Subject<SnackEvent>();
    private _snacks: SnackParams[] = [];
    private _lastSnackId: number = 0;

    private _hintIdToSnackId: Map<number, string> = new Map<number, string>();

    constructor(private _userOptionsService: UserOptionsService)
    {
    }

    // Adds a "hint" - generally a snack that tells the user about some key combination, or provides a helpful hint. To
    // not spam users constantly with this, user options (in UserOptionsService) stores a list of already-dismissed hint
    // IDs. If this id is one of them, we don't show it. If we DO show it, and the user dismisses it, we tell the user
    // option service that this is the case, so it won't be shown next time.
    addHint(hintId: string, clear: boolean): number
    {
        if(clear)
        {
            this._snacks = [];
        }

        // Check if this hint is allowed
        if(this._userOptionsService.canShowHint(hintId))
        {
            let msg = this.getHintMessage(hintId);
            let action = "Dismiss";

            let snackId = this.add(msg, action, clear);

            // Listen for a dismissal event, and then mark this as dismissed in user options
            this._hintIdToSnackId.set(snackId, hintId);
            return snackId;
        }

        return -1;
    }

    // TODO: Make this a bit less clunky/hard-coded... should probably define the msg & the id in the same place
    private getHintMessage(id: string): string
    {
        if(id == UserHints.hintContextColourSelectionShiftForPan ||
            id == UserHints.hintContextLassoShiftForPan ||
            id == UserHints.hintContextLineDrawShiftForPan ||
            id == UserHints.hintContextLineSelectShiftForPan ||
            id == UserHints.hintContextPointSelectShiftForPan)
        {
            return "Hold Shift for Pan Tool";
        }
        else if(id == UserHints.hintContextColourSelectionZForZoom ||
            id == UserHints.hintContextLassoZForZoom ||
            id == UserHints.hintContextLineDrawZForZoom ||
            id == UserHints.hintContextLineSelectZForZoom ||
            id == UserHints.hintContextPointSelectZForZoom)
        {
            return "Hold Z for Zoom Tool";
        }
        else if(id == UserHints.hintContextLineDrawEscForClear)
        {
            return "Hit Esc to clear drawing";
        }
        else if(id == UserHints.hintContextPointSelectAlt)
        {
            return "Hold Alt (or Option on Mac) for Point Investigation";
        }
        else if(id == UserHints.hintContextRotateShiftIncrements)
        {
            return "Hold Shift for fixed increments";
        }

        return "Unknown hint code: "+id;
    }

    // Adds a snack, returns an ID that can be used to check when the user clicks the "action" button
    add(message: string, action: string, clear: boolean, action2: string = null): number
    {
        if(clear)
        {
            this._snacks = [];
        }

        this._lastSnackId++;

        this._snacks.push(new SnackParams(message, action, this._lastSnackId, action2));
        this._snacks$.next(this._snacks);

        return this._lastSnackId;
    }

    get snacks$(): ReplaySubject<SnackParams[]>
    {
        return this._snacks$;
    }

    get snacksEvents$(): Subject<SnackEvent>
    {
        return this._snacksEvents$;
    }

    // Called when user clicks an action button
    remove(id: number, action: string = null): void
    {
        for(let c = 0; c < this._snacks.length; c++)
        {
            if(id == this._snacks[c].id)
            {
                if(action == null)
                {
                    action = this._snacks[c].action; // default to the first action!
                }

                this._snacks.splice(c, 1);
                this._snacks$.next(this._snacks);

                this.checkIfDismissedHint(id);

                this._snacksEvents$.next(new SnackEvent(id, action));
                return;
            }
        }
    }

    // Clears all snacks
    clear(): void
    {
        this._snacks = [];
        this._snacks$.next(this._snacks);
    }

    // Checks if the user has just dismissed a hint ID (using our stored _hintIdToSnackId. If this is one of them,
    // we mark that as a dismissed hint ID in user options so it doesn't get shown again
    protected checkIfDismissedHint(snackId: number): void
    {
        let hintId = this._hintIdToSnackId.get(snackId);

        if(hintId != undefined)
        {
            this._userOptionsService.addDismissedHintID(hintId);
            this._hintIdToSnackId.delete(snackId);
        }
    }
}
