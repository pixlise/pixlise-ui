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

// This was inspired by a post here: https://stackoverflow.com/questions/71072724/implement-monaco-editor-in-angular-13

import { Injectable } from '@angular/core';
import { Subject, ReplaySubject } from 'rxjs';


@Injectable({
    providedIn: 'root',
})
export class MonacoEditorService
{
    public loadingFinished: Subject<void> = new ReplaySubject<void>();

    constructor() {}

    private finishLoading()
    {
        this.loadingFinished.next();
    }

    public load()
    {
        // load the assets
        const baseUrl = './assets' + '/monaco-editor/min/vs';

        if (typeof (<any>window).monaco === 'object')
        {
            this.finishLoading();
            return;
        }

        const onGotAmdLoader: any = ()=>
        {
            // load Monaco
            (<any>window).require.config({ paths: { vs: `${baseUrl}` } });
            (<any>window).require([`vs/editor/editor.main`], ()=>
            {
                this.finishLoading();
            });
        };

        // load AMD loader, if necessary
        if(!(<any>window).require)
        {
            const loaderScript: HTMLScriptElement = document.createElement('script');
            loaderScript.type = 'text/javascript';
            loaderScript.src = `${baseUrl}/loader.js`;
            loaderScript.addEventListener('load', onGotAmdLoader);
            document.body.appendChild(loaderScript);
        }
        else
        {
            onGotAmdLoader();
        }
    }
}