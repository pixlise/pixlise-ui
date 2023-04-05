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

import { PIXLANGHelp } from "src/app/UI/expression-editor/expression-text-editor/code-help/pixlang-help";
import { LUAHelp } from "src/app/UI/expression-editor/expression-text-editor/code-help/lua-help";
import { SourceContextParser } from "src/app/UI/expression-editor/expression-text-editor/code-help/help";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";

import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";


export const MONACO_LUA_LANGUAGE_NAME = "lua";


@Injectable({
    providedIn: 'root',
})
export class MonacoEditorService
{
    public loadingFinished: Subject<void> = new ReplaySubject<void>();

    private _helpPIXLANG = new PIXLANGHelp();
    private _helpLUA = new LUAHelp();

    constructor(
        private _widgetRegionDataService: WidgetRegionDataService,
    )
    {
    }

    load()
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

    buildHelpForSources(sourceCode: Map<string, string>): void
    {
        // We don't do this for PIXLANG, but for LUA source files we rebuild the help database
        // so the next code suggestion that comes up is relevant to what sources we are running
        this._helpLUA.buildHelpForSources(sourceCode);
    }

    private get monaco(): any
    {
        let monaco = (<any>window).monaco;
        return monaco;
    }

    private finishLoading()
    {
        let monaco = this.monaco;

        // Setup syntax highlighting for PIXLANG
        this.createMonacoPIXLANGLanguage(monaco);

        // The best monaco resources:
        // https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1
        // https://microsoft.github.io/monaco-editor/typedoc/index.html
        
        this.installIntellisenseHelpers(monaco);

        // Tell the world we're ready
        this.loadingFinished.next();
    }

    private createMonacoPIXLANGLanguage(monaco)
    {
        // Register a new language
        monaco.languages.register({ id: EXPR_LANGUAGE_PIXLANG });

        // Register a tokens provider for the language
        let keywords = this._helpPIXLANG.getKeywords();
        monaco.languages.setMonarchTokensProvider(EXPR_LANGUAGE_PIXLANG, {
            keywords,
            tokenizer: {
                root: [
                    [/@?[a-zA-Z][\w$]*/, {cases:{"@keywords": "keyword", "@default": "variable"}}],
                    [/\/\/.*/, "comment"],
                    [/".*?"/, "string"],
                ],
            },
        });

        // Define a new theme that contains only rules that match this language
        monaco.editor.defineTheme("vs-dark-pixlang", {
            base: "vs-dark",
            inherit: false,
            rules: [
                { token: "keyword", foreground: "#91bfdb", fontStyle: "bold" },
                { token: "variable", foreground: "#ffff8d" },
                { token: "string", foreground: "#fc8d59" },
                { token: "comment", foreground: "#549e7a" },
            ],
            colors: {
                "editor.foreground": "#eeffff",
            },
        });
    }

    private installIntellisenseHelpers(monaco)
    {
        // Setup PIXLANG help lookup
        //registerCompletionItemProvider(languageSelector: LanguageSelector, provider: CompletionItemProvider): IDisposable
        monaco.languages.registerCompletionItemProvider(EXPR_LANGUAGE_PIXLANG, {
            triggerCharacters: ["\"", ",", "("], // Make completion show up for functions and their parameters, and strings
            //provideCompletionItems: (model: ITextModel, position: Position, context: CompletionContext, token: CancellationToken): ProviderResult<CompletionList>
            provideCompletionItems: (model, position, context, token)=>this.providePIXLANGCompletionItems(model, position, context, token),
            //resolveCompletionItem: (item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
            resolveCompletionItem: (item, token)=>this.resolvePIXLANGCompletionItem(item, token)
        });

        //registerSignatureHelpProvider(languageSelector: LanguageSelector, provider: SignatureHelpProvider): IDisposable
        monaco.languages.registerSignatureHelpProvider(EXPR_LANGUAGE_PIXLANG, {
            signatureHelpTriggerCharacters: ["(", ","],
            //provideSignatureHelp: (model: ITextModel, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelpResult>
            provideSignatureHelp: (model, position, token, context)=>this.providePIXLANGSignatureHelp(model, position, context)
        });

        // Setup Lua help lookup
        //registerCompletionItemProvider(languageSelector: LanguageSelector, provider: CompletionItemProvider): IDisposable
        monaco.languages.registerCompletionItemProvider(MONACO_LUA_LANGUAGE_NAME, {
            triggerCharacters: ["\"", ",", "("], // Make completion show up for functions and their parameters, and strings
            //provideCompletionItems: (model: ITextModel, position: Position, context: CompletionContext, token: CancellationToken): ProviderResult<CompletionList>
            provideCompletionItems: (model, position, context, token)=>this.provideLUACompletionItems(model, position, context, token),
            //resolveCompletionItem: (item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
            resolveCompletionItem: (item, token)=>this.resolveLUACompletionItem(item, token)
        });

        //registerSignatureHelpProvider(languageSelector: LanguageSelector, provider: SignatureHelpProvider): IDisposable
        monaco.languages.registerSignatureHelpProvider(MONACO_LUA_LANGUAGE_NAME, {
            signatureHelpTriggerCharacters: ["(", ","],
            //provideSignatureHelp: (model: ITextModel, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelpResult>
            provideSignatureHelp: (model, position, token, context)=>this.provideLUASignatureHelp(model, position, context)
        });

        // Other providers we may want to implement
        // registerImplementationProvider(languageSelector: LanguageSelector, provider: ImplementationProvider): IDisposable
        //     ^-- Go to implementation
        // registerDeclarationProvider(languageSelector: LanguageSelector, provider: DeclarationProvider): IDisposable
        //     ^-- Go to definition
        // registerTypeDefinitionProvider(languageSelector: LanguageSelector, provider: TypeDefinitionProvider): IDisposable
        //     ^-- Go to type definition

        // Install lua help provider stuff:
        // NOTE: there are several things we can do...
        //   https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1#example-extending-language-services-inlay-hints-provider-example
        // codelens - installs a line above a function for eg that can be run
        // hoverprovider - maybe for debugging, see a variable value?
        // inlay hints - not even sure what this is...

    }

    private providePIXLANGCompletionItems(model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
    {
        let monaco = this.monaco;
        let result/*: CompletionItem[]*/ = [];

        // Find a range we'll insert in
        let word = model.getWordUntilPosition(position);
        let range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };

        // See: https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.CompletionItem.html

        // First, check if we're within a function and need to provide parameter completion:
        let searchTextLines = model.getValueInRange(/*new IRange*/{
            startLineNumber: Math.max(position.lineNumber-5, 0),
            endLineNumber: position.lineNumber,
            startColumn: 0,
            endColumn: position.column
        });

        // Find the function name going backwards
        let p = new SourceContextParser("//");
        let itemsNearCursor = p.rfindFunctionNameAndParams(searchTextLines);

        if(!itemsNearCursor.empty)
        {
            let sig = this._helpPIXLANG.getSignatureHelp(itemsNearCursor.funcName, itemsNearCursor.params, this._widgetRegionDataService.quantificationLoaded, this._widgetRegionDataService.dataset);
            if(sig)
            {
                for(let possibleValue of sig.paramPossibleValues)
                {
                    let quotedValue = "\""+possibleValue+"\"";
                    let possibleValueToInsert = possibleValue+"\"";
                    if(itemsNearCursor.partialParam != "\"")
                    {
                        possibleValueToInsert = "\""+possibleValueToInsert;
                    }

                    result.push({
                        label: quotedValue,
                        kind: monaco.languages.CompletionItemKind.EnumMember,
                        insertText: possibleValueToInsert,
                        insertTextRules:
                            monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                        range: range,
                        //commitCharacters: ["("],
                    });
                }

                // We're responding with these values
                return {suggestions: result};
            }
        }

        let items = this._helpPIXLANG.getCompletionItems();
        for(let item of items)
        {
            result.push({
                label: item.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: item.name,
                detail: item.doc,
                //documentation: item.doc,
                insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                        .InsertAsSnippet,
                range: range,
                //commitCharacters: ["("],
            });
        }

        return {suggestions: result};
    }

    private resolvePIXLANGCompletionItem(item/*: CompletionItem*/, token/*: CancellationToken*/)//: ProviderResult<CompletionItem>
    {
    }

    private providePIXLANGSignatureHelp(model/*: ITextModel*/, position/*: Position*/, context/*: SignatureHelpContext*/)//: ProviderResult<SignatureHelpResult>
    {
        // Find the function we're being asked to provide help for. Search backwards from the current position
        let searchTextLines = model.getValueInRange(/*new IRange*/{
            startLineNumber: Math.max(position.lineNumber-5, 0),
            endLineNumber: position.lineNumber,
            startColumn: 0,
            endColumn: position.column
        });

        // Find the function name going backwards
        let p = new SourceContextParser("//");
        let items = p.rfindFunctionNameAndParams(searchTextLines);

        if(!items.empty)
        {
            // Provide signature help if we can find the function
            let sig = this._helpPIXLANG.getSignatureHelp(items.funcName, items.params, this._widgetRegionDataService.quantificationLoaded, this._widgetRegionDataService.dataset);
            if(!sig)
            {
                return null;
            }

            let showLabel = sig.prefix+" <<"+sig.activeParam+">> "+sig.suffix;

            let signatureHelp = {
                signatures: [
                    {
                        label: showLabel,
                        documentation: sig.paramDoc,//sig.funcDoc,
                        parameters: []//sigParams
                    }
                ],
                activeParameter: 0,
                activeSignature: 0
            };

            // NOTE: we have to provide the dispose function. MS code also includes this, see https://github.com/microsoft/pxt/blob/master/webapp/src/monaco.tsx#L209
            return { value: signatureHelp, dispose: () => {} };
        }

        return null;
    }

    private provideLUACompletionItems(model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
    {
        let word = model.getWordUntilPosition(position);
        let range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };

        console.log("LUA completion: "+word.word);
    }

    private resolveLUACompletionItem(item/*: CompletionItem*/, token/*: CancellationToken*/)//: ProviderResult<CompletionItem>
    {
    }

    private provideLUASignatureHelp(model/*: ITextModel*/, position/*: Position*/, context/*: SignatureHelpContext*/)//: ProviderResult<SignatureHelpResult>
    {
    }
}