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
    
    @ViewChild('editorContainer', { static: true }) _editorContainer: ElementRef;
    private _editor: any/*IStandaloneCodeEditor*/ = null;
    //editorOptions = {theme: 'vs-dark', language: 'javascript'};

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
    providePIXLANGCompletionItems(model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
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

        let detectors = "\nDetector must be ";
        let validDetectorHint: any = this._widgetRegionDataService.quantificationLoaded?.getDetectors();
        if(validDetectorHint == undefined)
        {
            detectors += " a detector label present in the loaded quantification";
        }
        else
        {
            if(validDetectorHint.length == 1)
            {
                detectors += validDetectorHint[0];
            }
            else
            {
                detectors += "one of "+validDetectorHint.join(" or ");
            }
            detectors += " to match the loaded quantification";
        }

        let elemHint = "";
        if(this._widgetRegionDataService.quantificationLoaded?.getElementFormulae()?.length)
        {
            elemHint = " Available element formulae are: "+this._widgetRegionDataService.quantificationLoaded.getElementFormulae().join(", ");
        }

        let dataFuncs = new Map<string, string[]>([
            ["element", ["${1:elementFormula}, ${2:column}, ${3:detector}",
                "Queries element map values",
                "Looks up quantified value for the specified element formula."+elemHint+"\nColumn selects which column to use: %, %-as-mmol or err are commonly used."+detectors]],
            ["elementSum", ["${1:column}, ${2:detector}",
                "Sum of column values for all elements in quantification",
                "Computes the sum of all elements in the quantification for the given column"+detectors]],
            ["data", ["${1:column}, ${2:detector}",
                "Reads the data column specified",
                "Reads the column specified, as found in the loaded quantification, eg: chisq."+detectors]],
            ["spectrum", ["${1:startChannel}, ${2:endChannel}, ${3:detector}",
                "Retrieves the sum of counts between start and end channels",
                "Retrieves the sum of counts for the spectrum of each PMC between the start and end channels specified"+detectors]],
            ["spectrumDiff", ["${1:startChannel}, ${2:endChannel}, ${3:operation}",
                "Returns a map of A-B spectrum within the specified channel range",
                "Returns a map containing the difference of combining all channels in the specified channel range of A and B spectrum. Operation can be max or sum"]],
            ["pseudo", ["${1:element}",
                "Returns pseudo-intensity map for given element",
                "Looks up the pseudo-intensity value calculated on-board for the given elements"]],
            ["housekeeping", ["${1:column}",
                "Retrieves housekeeping data from specified column",
                "These come from the housekeeping values returned from PIXL, things like temperatures, voltages, etc."]],
            ["diffractionPeaks", ["${1:eVstart}, ${2:eVend}",
                "Returns a map of diffraction peak counts per PMC",
                "Sums all diffraction peaks detected per PMC (in both diffraction database and user-entered diffraction peaks)"]],
            ["roughness", ["",
                "Retrieves a map of roughness from diffraction database",
                "Roughness values come from the diffraction database, each PMC will contain the globalDifference of roughness (higher = rougher)"]],
            ["position", ["${1:axis}",
                "Returns a map of position values for each PMC",
                "Returns a map of position values (x, y or z) for each PMC, as read from the spectrum data returned from PIXL"]],
            ["makeMap", ["${1:value}",
                "Makes a map with each PMC having the value specified",
                "Returns a map with the same dimensions as any map returned by other functions, all PMCs having the value specified. Useful for making for example a map of all 1's"]],
            ["atomicMass", ["${1:elementFormula}",
                "Returns the atomic mass of the formula",
                "This calculates the atomic mass of the given formula, using the same method that is used elsewhere in PIXLISE. Examples: Ca or Fe2O3"]],
            
            ["threshold", ["${1:map}, ${2:compare}, ${3:threshold}",
                "Returns a map where all values within compare+/-threshold are 1, the rest 0",
                "Returns a map with where the value of each PMC in the source map is checked to be within compare +/- threshold, if so, a 1 is returned, but if it's outside the range, 0 is returned"]],
            ["normalise", ["${1:map}",
                "Normalise a map, so all values are between 0-1",
                "Normalises a map by finding the min and max value, then computing each PMCs value as a percentage between that min and max, so all output values range between 0.0 and 1.0"]],
            ["pow", ["${1:mapOrScalarBase}, ${2:exponent}",
                "Calculates pow of each map PMC value, to the given exponent",
                "Returns a map where the value of each PMC is the first param raised to the exponent"]],

            ["under", ["${1:map}, ${2:reference}",
                "Returns a map where value is 1 if less than reference, else 0",
                "Returns a map where the value is 1 for any PMC whose input map value is less than the reference value, and 0 otherwise"]],
            ["under_undef", ["${1:map}, ${2:reference}",
                "Returns a map where value is 1 if less than reference, else 0",
                "Returns a map where the value is 1 for any PMC whose input map value is less than the reference value, and undefined otherwise (will create hole in map on context image)"]],
            ["over", ["${1:map}, ${2:reference}",
                "Returns a map where value is 1 if greater than reference, else 0",
                "Returns a map where the value is 1 for any PMC whose input map value is greater than the reference value, and 0 otherwise"]],
            ["over_undef", ["${1:map}, ${2:reference}",
                "Returns a map where value is 1 if greater than reference, else 0",
                "Returns a map where the value is 1 for any PMC whose input map value is greater than the reference value, and undefined otherwise (will create hole in map on context image)"]],

            ["avg", ["${1:map}, ${2:param2}",
                "Returns a map which is the average of the 2 parameters specified",
                "param2 may optionally be a map or a number"]],
            ["min", ["${1:map}, ${2:param2}",
                "Returns a map which is the minimum of the 2 parameters specified",
                "param2 may optionally be a map or a number"]],
            ["max", ["${1:map}, ${2:param2}",
                "Returns a map which is the maximum of the 2 parameters specified",
                "param2 may optionally be a map or a number"]],
        ]);
        for(let [f, details] of dataFuncs)
        {
            result.push({
                label: f,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: f+"("+details[0]+")",
                detail: details[1],
                documentation: details[2],
                insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                        .InsertAsSnippet,
                range: range,
                //commitCharacters: ["("],
            });
        }
        
        let trigFuncs = ["sin", "cos", "tan", "asin", "acos", "atan"];
        for(let f of trigFuncs)
        {
            result.push({
				label: f,
				kind: monaco.languages.CompletionItemKind.Keyword,
                detail: "Returns a map where each PMC value is "+f+" of the given angle (or map of angles)",
                documentation: "If a angle is a single number parameter, the map will have the same value in each PMC, but if the parameter is a map, each resulting map value with be "+f+" of the parameter maps value for that PMC",
				insertText: f+"(${1:angle})",
				insertTextRules:
					monaco.languages.CompletionItemInsertTextRule
						.InsertAsSnippet,
				range: range,
			});
        }

        result.push({
            label: "ln",
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: "Returns a map where each PMC contains the natural logarithm of the given value (or the corresponding PMCs value if the parameter is a map)",
            documentation: "",
            insertText: "ln(${1:value})",
            insertTextRules:
                monaco.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
            range: range,
        });

        result.push({
            label: "exp",
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: "Returns a map where each PMC contains the e raised to the value (or the corresponding PMCs value if the parameter is a map)",
            documentation: "",
            insertText: "exp(${1:value})",
            insertTextRules:
                monaco.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
            range: range,
        });

        return {suggestions: result};
    }

    resolvePIXLANGCompletionItem(item/*: CompletionItem*/, token/*: CancellationToken*/)//: ProviderResult<CompletionItem>
    {
    }

    provideLUACompletionItems(model/*: ITextModel*/, position/*: Position*/, context/*: CompletionContext*/, token/*: CancellationToken*/)//: ProviderResult<CompletionList>
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

    resolveLUACompletionItem(item/*: CompletionItem*/, token/*: CancellationToken*/)//: ProviderResult<CompletionItem>
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
