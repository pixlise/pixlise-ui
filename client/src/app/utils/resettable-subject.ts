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

import { Observable, Subject } from "rxjs";
import { startWith, switchMap } from "rxjs/operators";


// This came from:
// https://javascript.plainenglish.io/how-do-you-clean-the-subjects-in-rxjs-298bf129d3bb
// See also:
// https://stackoverflow.com/questions/51145664/resetting-replaysubject-in-rxjs-6
//
// Initial use case was when a dataset loads, the view state subject already
// contained the view state of the last loaded dataset and until the new one
// loaded, anything subscribed to it was showing the old view state.
//
// The idea here is we can reset this (and maybe other) ReplaySubjects to not
// having an already-published value.
//
// An attempted fix was to use just a Subject not a ReplaySubject but then when
// switching between tabs, newly created components never received a view state
// because there wasn't one being loaded by then.

//
// Example Usage:
// let resettable: ResettableType<number> = asResettable(() => new ReplaySubject<number>(1));
// ...
// resettable.reset();
//

export type ResettableType<T> = { observable: Observable<T>, subject: Subject<T>, reset: () => void};

export function asResettable<T>(factory: () => Subject<T>): ResettableType<T>
{
    const resetSubj = new Subject<T>();
    const modifySubj = new Subject<T>();

    let newValueSubj = factory();
    let subscription = modifySubj.subscribe(newValueSubj);

    return {
        observable: resetSubj.asObservable().pipe(
            startWith(undefined),
            switchMap(() => newValueSubj)
        ),
        subject: modifySubj,
        reset: ()=>
        {
            subscription.unsubscribe();
            newValueSubj = factory();
            subscription = modifySubj.subscribe(newValueSubj);
            resetSubj.next((undefined as any) as T);
        },
    };
}
