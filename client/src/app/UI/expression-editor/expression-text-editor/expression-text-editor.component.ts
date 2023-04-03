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

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef } from "@angular/core";
import { Subscription } from "rxjs";
import { ExpressionParts, PixliseDataQuerier } from "src/app/expression-language/interpret-pixlise";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { DataExpression } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CursorSuggestions, ExpressionHelp, FunctionParameterPosition, LabelElement, Suggestion } from "../expression-help";
import { SentryHelper } from "src/app/utils/utils";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { MonacoEditorService } from "src/app/services/monaco-editor.service";
import { PIXLANGHelp } from "./code-help/pixlang-help";
import { rfindFunctionNameAndParams } from "./code-help/help";


export class DataExpressionModule
{
    constructor(
        public id: string,
        public name: string,
        public description: string = "",
        public version: string = "",
        public author: ObjectCreator= new ObjectCreator("", ""),
        public allVersions: string[] = [],
    ){}
}

export class TextSelection
{
    constructor(
        public text: string,
        public isEmptySelection: boolean,
        public startLine: number,
        public endLine: number,
        public range: Range,
        public markText: () => void,
        public clearMarkedText: () => void,
    )
    {
    } 
}

export class MarkPosition
{
    constructor(public line: number, public idxStart: number, public idxEnd: number)
    {
    }
}

@Component({
    selector: "expression-text-editor",
    templateUrl: "./expression-text-editor.component.html",
    styleUrls: ["./expression-text-editor.component.scss"]
})
export class ExpressionTextEditorComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();
    private _expr: DataExpression = null;
    private _exprParts: ExpressionParts = null;

    activeHelp: CursorSuggestions = null;
    private _markTextPositions: MarkPosition[] = [];
    private _markMatchedBracketPositions: MarkPosition[] = [];

    dropdownTop: string = "";
    dropdownLeft: string = "";

    private _gutterWidth: number = 0;

    private _initAsLua: boolean = false;

    @Input() isLua: boolean = false;
    @Input() expression: DataExpression = null;
    @Input() allowEdit: boolean = true;
    @Input() applyNow: boolean = false;
    @Input() isImmediatelyAppliable: boolean = true;

    @Input() showHelp: boolean = true;
    @Input() range: Range = null;

    @Input() installedModules: DataExpressionModule[] = [];
    @Input() isHeaderOpen: boolean = false;
    @Input() showInstalledModules: boolean = true;

    @Input() linkedModuleID: string = null;

    @Output() onChange = new EventEmitter<DataExpression>();
    @Output() onTextChange = new EventEmitter<string>();
    @Output() onTextSelect = new EventEmitter<TextSelection>();
    @Output() onModuleChange = new EventEmitter<DataExpressionModule[]>();
    @Output() runExpression = new EventEmitter();
    @Output() runHighlightedExpression = new EventEmitter();
    @Output() saveExpression = new EventEmitter();
    @Output() toggleSidebar = new EventEmitter();
    @Output() toggleSplitView = new EventEmitter();
    @Output() changeExpression = new EventEmitter<(text: string) => void>();
    @Output() toggleHeader = new EventEmitter();
    @Output() onClick = new EventEmitter();
    @Output() linkModule = new EventEmitter<string>();
    
    @ViewChild('editorContainer', { static: true }) _editorContainer: ElementRef;
    private _editor: any/*IStandaloneCodeEditor*/ = null;
    //editorOptions = {theme: 'vs-dark', language: 'javascript'};

    private _helpPIXLANG = new PIXLANGHelp();

    constructor(
        private _monacoService: MonacoEditorService,
        private _widgetRegionDataService: WidgetRegionDataService,
    )
    {
    }

    ngOnInit()
    {
        // Make a copy of incoming expression, so we don't edit what's there!
        this._expr = this.copyExpression(this.expression);

        this.changeExpression.emit((text: string) =>
        {
            this._expr.sourceCode = text;
            this.refreshMonaco();
        });
    }

    getHintList(curWord: string): string[]
    {
        return [];
    }

    copyExpression(expression: DataExpression): DataExpression
    {
        return new DataExpression(
            expression.id,
            expression.name,
            expression.sourceCode,
            expression.sourceLanguage,
            expression.comments,
            expression.shared,
            expression.creator,
            expression.createUnixTimeSec,
            expression.modUnixTimeSec,
            expression.tags,
            expression.moduleReferences,
            expression.recentExecStats
        );
    }

    ngAfterViewInit(): void
    {
        this.refreshMonaco();
    }

    private get monaco(): any
    {
        // At this point monaco should be loaded and part of our window, so we can access it like this:
        return (<any>window).monaco;
    }

    private createMonaco(): any/*IStandaloneCodeEditor*/
    {
        // The best monaco resources:
        // https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1
        // https://microsoft.github.io/monaco-editor/typedoc/index.html
        
        // Here is everything we need to re-implement/modify in Monaco:
        //
        // Gutters - is this needed at all?
        //
        // Key bindings:
        // "Cmd-/" "Ctrl-/" - comments - monaco already implements this!
        // "Cmd-Enter" "Ctrl-Enter" - Run expression
        // "Cmd-Alt-Enter" "Ctrl-Alt-Enter" - Run highlighted expression
        // "Cmd-S" "Ctrl-S" saveExpression.emit(),
        // "Cmd-B" "Ctrl-B": () => this.toggleSidebar.emit(),
        // "Cmd-\\" "Ctrl-\\": () => this.toggleSplitView.emit(),
        //
        // Other key bindings (outside the codemirror div)
        // - onKeyDown event.key == "Escape": this.activeHelp = null;
        // - onKeyUp - swallow all events
        // - onClickDialog - hide help if user clicked on anything outside codemirror: this.activeHelp = null;
        //
        // Marking text in black (run to line/run selection)
        //
        // Code-mirror had event handlers for:
        // - "beforeChange" - filtered what was pasted, only calling event.update if it's acceptable (origin==paste, text was type object of length > 1
        // - "change" - called this.findVariables(), this.updateGutter(), this.updateHelp(), and set this.range=null;
        // - "cursorActivity" - this.updateHelp()
        // - "focus" - this.onSetActive(), this.updateHelp(), this.markExecutedExpressionRange(cm);
        // - "beforeSelectionChange" - When selection was valid, called this.onTextSelect.emit() with new TextSelection containing functions to handle running that text
        //
        // PIXLANG syntax highlighting
        //
        // PIXLANG help. This is a short description of what it did:
        //  findVariables() would call PixliseDataQuerier.breakExpressionIntoParts, store that in this._exprParts
        //  onHelpEscape() - if user clicked esc button on help dialog, we went up a level
        //  onHelpClick() - if user clicked help suggestion, we did it. Supported:
        //                              - element function param fill from list
        //                              - adding functions from list
        //                              - selecting operators from list
        //                              - showing help dialog if nothing else useful to show 

        // Set up PIXLANG syntax highlighter
        this.createMonacoPIXLANGLanguage();

        // Setup PIXLANG help lookup
        this.monaco.languages.registerCompletionItemProvider(EXPR_LANGUAGE_PIXLANG, {
            provideCompletionItems: (model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)=>//: ProviderResult<CompletionList>
            {
                return this.providePIXLANGCompletionItems(model, position, context, token);
            },
            resolveCompletionItem: (item/*: CompletionItem*/, token/*: CancellationToken*/)=>//: ProviderResult<CompletionItem>
            {
                return this.resolvePIXLANGCompletionItem(item, token);
            }
        });

        this.monaco.languages.registerSignatureHelpProvider(EXPR_LANGUAGE_PIXLANG, {
            signatureHelpTriggerCharacters: ["(", ","],
            provideSignatureHelp: (model/*: ITextModel*/, position/*: Position*/, token/*: CancellationToken*/, context/*: SignatureHelpContext*/)=>//: ProviderResult<SignatureHelpResult>
            {
                return this.providePIXLANGSignatureHelp(model, position, context);
            }
        });
        
        // Setup Lua help lookup
        this.monaco.languages.registerCompletionItemProvider("lua", {
            provideCompletionItems: (model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)=>//: ProviderResult<CompletionList>
            {
                return this.provideLUACompletionItems(model, position, context, token);
            },
            resolveCompletionItem: (item/*: CompletionItem*/, token/*: CancellationToken*/)=>//: ProviderResult<CompletionItem>
            {
                return this.resolveLUACompletionItem(item, token);
            }
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
        // completionprovider - our help case
        // hoverprovider - maybe for debugging, see a variable value?
        // inlay hints - not even sure what this is...

        // Set up options and create a monaco editor:
        let options = {
            model: null,
            automaticLayout: true,
            theme: "vs-dark", // I think this takes away some of the colouring unfortunately
            scrollBeyondLastLine: false,
            //roundedSelection: false,
            readOnly: !this.allowEdit,
            minimap: { enabled: false },
        };

        // Create a blank monaco editor
        return this.monaco.editor.create(this._editorContainer.nativeElement, options);
    }

    private createMonacoPIXLANGLanguage()
    {
        let monaco = this.monaco;

        // Register a new language
        monaco.languages.register({ id: EXPR_LANGUAGE_PIXLANG });

        // Register a tokens provider for the language
        let keywords = ["normalize", "threshold", "pow", "data", "spectrum", "spectrumDiff", "element", "elementSum", "pseudo", "housekeeping", "diffractionPeaks", "roughness", "position", "under", "over", "under_undef", "over_undef", "avg", "min", "max", "makeMap", "sin", "cos", "tan", "asin", "acos", "atan", "exp", "ln", "atomicMass"];
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

    private createMonacoModel(): void
    {
        // If we don't yet have an editor, create one
        if(!this._editor)
        {
            this._editor = this.createMonaco();
        }

        // Create the model the editor will use
        let mdl/*: ITextModel*/ = this.monaco.editor.createModel(
            this._expr.sourceCode,
            this._expr.sourceLanguage == EXPR_LANGUAGE_LUA ? "lua" : this._expr.sourceLanguage
        );

        // Add handlers to this model
        mdl.onDidChangeContent(
            (e/*: IModelContentChangedEvent*/)=>
            {
                // Something changed in the text editor, save the entire thing in our source code
                // variable
                this._expr.sourceCode = mdl.getValue();
                this.onTextChange.emit(this._expr.sourceCode || "");
            }
        );

        this._editor.setModel(mdl);
        this.monaco.editor.setTheme(this._expr.sourceLanguage == EXPR_LANGUAGE_LUA ? "vs-dark" : "vs-dark-pixlang");
    }

    private refreshMonaco(): void
    {
        this._monacoService.loadingFinished.subscribe(
            ()=>
            {
                this.createMonacoModel();
            }
        );
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }
/*
    private _PIXLANGHelpItems = new Map<string, string>([
        ["element", "Element function with parameters: element, column (% or %-as-mmol), detector (Combined, A or B)"],
        ["pseudo", "Pseudo-element lookup with parameter: element"],
    ]);
*/
    private providePIXLANGCompletionItems(model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
    {
        // See: https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.CompletionItem.html
        let word = model.getWordUntilPosition(position);
        let range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };

        let monaco = this.monaco;
        let result/*: CompletionItem[]*/ = [];

        let items = this._helpPIXLANG.getCompletionItems();
        for(let item of items)
        {
            result.push({
                label: item.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: item.name+"(",
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
        
        // Split by line, and remove comments, then recombine
        let searchLines = searchTextLines.split("\n");
        let searchText = "";
        for(let line of searchLines)
        {
            // Trim comments
            let pos = line.indexOf("//");
            if(pos > -1)
            {
                line = line.substring(0, pos);
            }
            searchText += line+" ";
        }

        // Find the function name going backwards
        let items = rfindFunctionNameAndParams(searchText);

        if(!items.empty)
        {
            // Provide signature help if we can find the function
            let sig = this._helpPIXLANG.getSignatureHelp(items.funcName, items.params, this._widgetRegionDataService.quantificationLoaded, this._widgetRegionDataService.dataset);
            if(!sig)
            {
                return null;
            }

/*
        let sigParams = [];
        for(let p of sig.params)
        {
            sigParams.push({label: p.name, documentation: p.doc});
        }

        let signatureHelp = {
            signatures: [
                {
                    label: sig.funcName,
                    documentation: null,//sig.funcDoc,
                    parameters: []//sigParams
                }
            ],
            activeParameter: 0,
            activeSignature: 0
        };
*/
            let signatureHelp = {
                signatures: [
                    {
                        label: sig.prefix+"   "+sig.activeParam+",   "+sig.suffix,
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

    get isSourceLanguageLua(): boolean
    {
        return this.expression?.sourceLanguage === EXPR_LANGUAGE_LUA;
    }

    get toggleHeaderTooltip(): string
    {
        let tooltip = this.isHeaderOpen ? "Hide installed modules" : "Show installed modules";
        return this.isSourceLanguageLua ? tooltip : "Modules are only available in Lua";
    }

    onToggleHeader(): void
    {
        if(this.isSourceLanguageLua)
        {
            this.toggleHeader.emit();
        }
    }

    onLinkModule(moduleID: string): void
    {
        this.linkModule.emit(moduleID);
    }

    onSetActive(): void
    {
        this.onClick.emit();
    }

    onModuleVersionChange(event, i): void
    {
        this.installedModules[i].version = event.value;
        this.onModuleChange.emit(this.installedModules);
    }

    deleteModule(i): void
    {
        this.installedModules.splice(i, 1);
        this.onModuleChange.emit(this.installedModules);
    }

    get isHeaderNonEmptyAndOpen(): boolean
    {
        return this.isHeaderOpen && this.installedModules.length > 0;
    }

    get gutterWidth(): string
    {
        return `${this._gutterWidth}px`;
    }

    get isWindows(): boolean
    {
        return navigator.userAgent.search("Windows") !== -1;
    }

    get expressionName(): string
    {
        return this._expr.name;
    }

    set expressionName(val: string)
    {
        this._expr.name = val;
    }

    get expressionComments(): string
    {
        return this._expr.comments;
    }

    set expressionComments(val: string)
    {
        this._expr.comments = val;
    }

    get isEditable(): boolean
    {
        return this.allowEdit;
    }

    get selectedTagIDs(): string[]
    {
        return this._expr.tags;
    }

    onTagSelectionChanged(tags: string[]): void
    {
        this._expr.tags = tags;
    }
}
