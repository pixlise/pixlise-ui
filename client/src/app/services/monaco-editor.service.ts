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

import { Injectable } from "@angular/core";
import { Subject, ReplaySubject } from "rxjs";

import { PIXLANGHelp } from "src/app/UI/expression-editor/expression-text-editor/code-help/pixlang-help";
import { LUAHelp } from "src/app/UI/expression-editor/expression-text-editor/code-help/lua-help";
import { SourceHelp, NameAndParamResult, HelpSignature } from "src/app/UI/expression-editor/expression-text-editor/code-help/help";
import { SourceContextParser } from "src/app/UI/expression-editor/expression-text-editor/code-help/help";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";

import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { DataModuleService, DataModule } from "src/app/services/data-module.service";

import { languages } from "monaco-editor";
import { language, conf } from "monaco-editor/esm/vs/basic-languages/lua/lua.js";

export const MONACO_LUA_LANGUAGE_NAME = "lua";


@Injectable({
    providedIn: "root",
})
export class MonacoEditorService
{
    public loadingFinished: Subject<void> = new ReplaySubject<void>();

    private _helpPIXLANG = new PIXLANGHelp();
    private _helpLUA = new LUAHelp();

    constructor(
        private _widgetRegionDataService: WidgetRegionDataService,
        private _moduleService: DataModuleService,
    )
    {
    }

    load()
    {
        // load the assets
        const baseUrl = "./assets/monaco-editor/min/vs";

        if(typeof (<any>window).monaco === "object")
        {
            this.finishLoading();
            return;
        }

        const onGotAmdLoader: any = ()=>
        {
            // load Monaco
            (<any>window).require.config({ paths: { vs: baseUrl } });
            (<any>window).require(["vs/editor/editor.main"], ()=>
            {
                this.finishLoading();
            });
        };

        // load AMD loader, if necessary
        if(!(<any>window).require)
        {
            const loaderScript: HTMLScriptElement = document.createElement("script");
            loaderScript.type = "text/javascript";
            loaderScript.src = `${baseUrl}/loader.js`;
            loaderScript.addEventListener("load", onGotAmdLoader);
            document.body.appendChild(loaderScript);
        }
        else
        {
            onGotAmdLoader();
        }
    }

    buildHelpForSource(originID: string, sourceCode: string): void
    {
        // We don't do this for PIXLANG, but for LUA source files we rebuild the help database
        // so the next code suggestion that comes up is relevant to what sources we are running
        this._helpLUA.buildHelpForSource(originID, sourceCode);
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
        this.styleMonacoLUALanguage(monaco);

        // The best monaco resources:
        // https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1
        // https://microsoft.github.io/monaco-editor/typedoc/index.html
        this.installIntellisenseHelpers(monaco);

        // Get the built in modules and generate help for them right away
        this._moduleService.getBuiltInModules(false).subscribe(
            (modules: DataModule[])=>
            {
                for(let mod of modules)
                {
                    let ver = mod.versions.get("0.0.0");
                    if(ver && ver.sourceCode.length > 0)
                    {
                        this._helpLUA.buildHelpForSource(mod.id, ver.sourceCode);
                    }
                }

                // Tell the world we're ready
                this.loadingFinished.next();
            }
        );
    }

    private styleMonacoLUALanguage(monaco)
    {
        languages.register({
            id: "lua",
            extensions: [".lua"],
            aliases: ["Lua", "lua"],
        });
        languages.setMonarchTokensProvider("lua", language);
        languages.setLanguageConfiguration("lua", conf);

        monaco.editor.defineTheme("vs-dark-lua", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "keyword", foreground: "#c792ea", fontStyle: "bold" },
                { token: "variable", foreground: "#ffff8d" },
                { token: "string", foreground: "#fc8d59" },
                { token: "comment", foreground: "#549e7a" },
                { token: "number", foreground: "#FF5370" },
                { token: "constant", foreground: "#91bfdb" },
            ],
            colors: {
                "editor.foreground": "#eeffff",
                "editor.background": "#232829",
                "editorGutter.background": "#283237",
            },
        });
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
                { token: "keyword", foreground: "#c792ea", fontStyle: "bold" },
                { token: "variable", foreground: "#ffff8d" },
                { token: "string", foreground: "#fc8d59" },
                { token: "comment", foreground: "#549e7a" },
                { token: "number", foreground: "#FF5370" },
            ],
            colors: {
                "editor.foreground": "#eeffff",
                "editor.background": "#232829",
                "editorGutter.background": "#283237",
            },
        });
    }

    private installIntellisenseHelpers(monaco)
    {
        // Setup help lookup
        let lang = [EXPR_LANGUAGE_PIXLANG, MONACO_LUA_LANGUAGE_NAME];
        let helpSource = [this._helpPIXLANG, this._helpLUA];

        for(let c = 0; c < lang.length; c++)
        {
            let language = lang[c];
            let src = helpSource[c];

            //registerCompletionItemProvider(languageSelector: LanguageSelector, provider: CompletionItemProvider): IDisposable
            monaco.languages.registerCompletionItemProvider(language, {
                triggerCharacters: ["\"", ",", "(", "."], // Make completion show up for functions and their parameters, and strings
                //provideCompletionItems: (model: ITextModel, position: Position, context: CompletionContext, token: CancellationToken): ProviderResult<CompletionList>
                provideCompletionItems: (model, position, context, token)=>this.provideCompletionItems(src, model, position, context, token),
                //resolveCompletionItem: (item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
                //resolveCompletionItem: (item, token)=>this.resolveCompletionItem(src, item, token)
            });

            //registerSignatureHelpProvider(languageSelector: LanguageSelector, provider: SignatureHelpProvider): IDisposable
            monaco.languages.registerSignatureHelpProvider(language, {
                signatureHelpTriggerCharacters: ["(", ","],
                //provideSignatureHelp: (model: ITextModel, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelpResult>
                provideSignatureHelp: (model, position, token, context)=>this.provideSignatureHelp(src, model, position, context)
            });
        }

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

    private provideCompletionItems(helpSource: SourceHelp, model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
    {
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
        let p = new SourceContextParser(helpSource.commentStartToken);
        let itemsNearCursor = p.rfindFunctionNameAndParams(searchTextLines);

        if(!itemsNearCursor.empty)
        {
            // Try split it into module name and function if possible
            let modName = "";
            let funcName = itemsNearCursor.funcName;

            let parts = itemsNearCursor.funcName.split(".");
            if(parts.length == 2)
            {
                modName = parts[0];
                funcName = parts[1];
            }

            let sig = helpSource.getSignatureHelp(modName, funcName, itemsNearCursor.params, this._widgetRegionDataService.quantificationLoaded, this._widgetRegionDataService.dataset);
            if(sig)
            {
                return this.showFunctionParamCompletion(itemsNearCursor, sig, range);
            }
        }

        // If we just typed a module name, we have to list the functions within it
        let moduleName = p.rfindModuleName(searchTextLines);
        if(moduleName.length > 0)
        {
            return this.showModuleFunctionsCompletion(moduleName, helpSource, range);
        }

        return this.showGlobalCompletion(helpSource, range);
    }

    private showFunctionParamCompletion(itemsNearCursor: NameAndParamResult, sig: HelpSignature, range)
    {
        let monaco = this.monaco;
        let result/*: CompletionItem[]*/ = [];

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

        return {suggestions: result};
    }

    private showModuleFunctionsCompletion(moduleName: string, helpSource: SourceHelp, range)
    {
        let monaco = this.monaco;
        let result/*: CompletionItem[]*/ = [];

        let mods = helpSource.getCompletionModules(moduleName);
        if(mods.length == 1)
        {
            // List items for this module!
            let funcs = helpSource.getCompletionFunctions(mods[0].name);
            for(let modItem of funcs)
            {
                result.push({
                    label: modItem.name,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: modItem.name,
                    detail: modItem.doc,
                    //documentation: item.doc,
                    insertTextRules:
                        monaco.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    range: range,
                    //commitCharacters: ["("],
                });
            }
        }

        return {suggestions: result};
    }

    private showGlobalCompletion(helpSource: SourceHelp, range)
    {
        let monaco = this.monaco;
        let result/*: CompletionItem[]*/ = [];

        // Otherwise, stick to global functions and modules
        // If we're still here, show global functions and modules
        let funcs = helpSource.getCompletionFunctions("");
        for(let item of funcs)
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

        let mods = helpSource.getCompletionModules("");
        for(let item of mods)
        {
            result.push({
                label: item.name,
                kind: monaco.languages.CompletionItemKind.Module,   // vs .Class
                                                                    // See: https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionItemKind.html
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

/*
    private resolveCompletionItem(helpSource: SourceHelp, item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
    }
*/
    private provideSignatureHelp(helpSource: SourceHelp, model/*: ITextModel*/, position/*: Position*/, context/*: SignatureHelpContext*/)//: ProviderResult<SignatureHelpResult>
    {
        // Find the function we're being asked to provide help for. Search backwards from the current position
        let searchTextLines = model.getValueInRange(/*new IRange*/{
            startLineNumber: Math.max(position.lineNumber-5, 0),
            endLineNumber: position.lineNumber,
            startColumn: 0,
            endColumn: position.column
        });

        // Find the function name going backwards
        let p = new SourceContextParser(helpSource.commentStartToken);
        let items = p.rfindFunctionNameAndParams(searchTextLines);

        if(!items.empty)
        {
            // Provide signature help if we can find the function
            let modName = "";
            let funcName = items.funcName;

            let parts = items.funcName.split(".");
            if(parts.length == 2)
            {
                modName = parts[0];
                funcName = parts[1];
            }

            let sig = helpSource.getSignatureHelp(modName, funcName, items.params, this._widgetRegionDataService.quantificationLoaded, this._widgetRegionDataService.dataset);
            if(!sig)
            {
                return null;
            }

            let sigParams = [];
            let funcDocPrefix = "";
            for(let p of sig.params)
            {
                let sigParam = {label: p.name};
                if(p.doc)
                {
                    sigParam["documentation"] = p.name+": "+p.doc;
                    if(sigParams.length == sig.activeParamIdx)
                    {
                        // We have docs for the active one, so put a prefix in for func doc to provide some separation
                        funcDocPrefix = "\n";
                    }
                }
                sigParams.push(sigParam);
            }

            let signatureHelp = {
                signatures: [
                    {
                        label: sig.signature,
                        documentation: funcDocPrefix+(modName.length > 0 ? modName+"." : "")+sig.funcName+"():\n"+sig.funcDoc,//sig.paramDoc,//sig.funcDoc,
                        parameters: sigParams
                    }
                ],
                activeParameter: sig.activeParamIdx,
                activeSignature: 0 // We're only showing one signature, because we look it up, and we don't support overloading...
            };

            // NOTE: we have to provide the dispose function. MS code also includes this, see https://github.com/microsoft/pxt/blob/master/webapp/src/monaco.tsx#L209
            return { value: signatureHelp, dispose: () => {} };
        }

        return null;
    }
}