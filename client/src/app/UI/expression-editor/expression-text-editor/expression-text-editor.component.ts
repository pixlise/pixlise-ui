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

import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { DataExpression } from "src/app/models/Expression";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { AuthenticationService } from "src/app/services/authentication.service";
import { MonacoEditorService, MONACO_LUA_LANGUAGE_NAME } from "src/app/services/monaco-editor.service";
import { LuaRuntimeError } from "src/app/routes/dataset/code-editor/editor-config";


export class DataExpressionModule
{
    constructor(
        public id: string,
        public name: string,
        public description: string = "",
        public version: string = "",
        public author: ObjectCreator= new ObjectCreator("", ""),
        public allVersions: string[] = [],
    )
    {
    }
}

export class TextSelection
{
    constructor(
        public text: string,
        public isEmptySelection: boolean,
        public startLine: number,
        public endLine: number,
        public range: Range,
        public clearMarkedText: () => void,
        public markText?: () => void,
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

    private _gutterWidth: number = 0;

    private _installedModules: DataExpressionModule[] = [];
    private _isHeaderOpen: boolean = false;

    public moduleContainerWidths: Record<string, number> = {};

    @Input() isLua: boolean = false;
    @Input() expression: DataExpression = null;
    @Input() allowEdit: boolean = true;
    @Input() applyNow: boolean = false;
    @Input() isImmediatelyAppliable: boolean = true;

    // If this is not null, will trigger diff view
    private _diffText: string = null;
    private _runtimeError: LuaRuntimeError = null;

    @Input() showHelp: boolean = true;
    @Input() range: Range = null;

    @Input() showInstalledModules: boolean = true;
    @Input() linkedModuleID: string = null;

    @Input() isSplitScreen: boolean = false;

    @Output() onChange = new EventEmitter<DataExpression>();
    @Output() onTextChange = new EventEmitter<string>();
    @Output() onTextSelect = new EventEmitter<TextSelection>();
    @Output() onModuleChange = new EventEmitter<DataExpressionModule[]>();
    @Output() runExpression = new EventEmitter();
    @Output() runHighlightedExpression = new EventEmitter();
    @Output() saveExpression = new EventEmitter();
    @Output() toggleSidebar = new EventEmitter();
    @Output() toggleSplitView = new EventEmitter();
    @Output() toggleHeader = new EventEmitter();
    @Output() onClick = new EventEmitter();
    @Output() linkModule = new EventEmitter<string>();
    
    @ViewChild("editorContainer", { static: true }) _editorContainer: ElementRef;
    private _editor: any/*IStandaloneCodeEditor*/ = null;

    constructor(
        private _authService: AuthenticationService,
        private elementRef: ElementRef,
        private _monacoService: MonacoEditorService,
    )
    {
    }

    ngOnInit()
    {
        // Make a copy of incoming expression, so we don't edit what's there!
        this._expr = this.copyExpression(this.expression);
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
        // For more fundamental monaco extensions, see MonacoEditorService
        // Set up options and create a monaco editor:
        let options = {
            model: null,
            automaticLayout: true,
            theme: "vs-dark-lua",
            scrollBeyondLastLine: false,
            //roundedSelection: false,
            readOnly: !this.allowEdit,
            minimap: { enabled: false },
        };

        // Create a blank monaco editor
        return this.monaco.editor.create(this._editorContainer.nativeElement, options);
    }

    private createDiffEditor()
    {
        let originalModel = this.monaco.editor.createModel(
            this._expr.sourceCode,
            MONACO_LUA_LANGUAGE_NAME
        );

        let diffModel = this.monaco.editor.createModel(
            this._diffText,
            MONACO_LUA_LANGUAGE_NAME
        );

        this._editor = this.monaco.editor.createDiffEditor(
            this._editorContainer.nativeElement,
            {
                enableSplitViewResizing: false,
                renderSideBySide: false,
                readOnly: true
            }
        );

        this._editor.setModel({
            original: originalModel,
            modified: diffModel,
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
            this._expr.sourceLanguage == EXPR_LANGUAGE_LUA ? MONACO_LUA_LANGUAGE_NAME : this._expr.sourceLanguage
        );

        // Add handlers to this model
        mdl.onDidChangeContent(
            (e/*: IModelContentChangedEvent*/)=>
            {
                // Something changed in the text editor, save the entire thing in our source code
                // variable
                this._expr.sourceCode = mdl.getValue();
                this.onTextChange.emit(this._expr.sourceCode || "");
                this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", []);
            }
        );

        this._editor.setModel(mdl);
        this.monaco.editor.setTheme(this._expr.sourceLanguage === EXPR_LANGUAGE_LUA ? "vs-dark-lua" : "vs-dark-pixlang");
        this.registerKeyBindings();
        this._editor.onDidChangeCursorSelection((event) =>
        {
            let range = event.selection;
            let isSingleLineEmpty = range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;

            let text = this._editor.getModel().getValueInRange(range);
            this.onTextSelect.emit(
                new TextSelection(
                    text,
                    isSingleLineEmpty,
                    range.startLineNumber,
                    range.endLineNumber,
                    range,
                    () =>
                    {
                        // Clear the highlight
                        this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", []);
                    },
                    () =>
                    {
                        this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", [
                            {
                                message: `Currently visualizing the highlighted lines (${range.startLineNumber}:${range.startColumn} - ${range.endLineNumber}:${range.endColumn})`,
                                severity: this.monaco.MarkerSeverity.Info,
                                startLineNumber: range.startLineNumber,
                                startColumn: range.startColumn,
                                endLineNumber: range.endLineNumber,
                                endColumn: range.endColumn,
                            }
                        ]);
                    }
                )
            );
        });
    }

    private onRunHighlightedExpressionCommand(): void
    {
        let range = this._editor.getSelection();

        let isSingleLineEmpty = range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;
        if(isSingleLineEmpty)
        {
            range.startLineNumber = 1;
            range.startColumn = 1;
        }

        let lastLine = this._editor.getModel().getLineContent(range.endLineNumber);
        range.endColumn = lastLine.length + 1;

        let text = this._editor.getModel().getValueInRange(range);

        this.onTextSelect.emit(
            new TextSelection(
                text,
                isSingleLineEmpty,
                range.startLineNumber,
                range.endLineNumber,
                range,
                () =>
                {
                    // Clear the highlight
                    this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", []);
                }
            )
        );
        this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", [
            {
                message: `Currently visualizing the highlighted lines (${range.startLineNumber}:${range.startColumn} - ${range.endLineNumber}:${range.endColumn})`,
                severity: this.monaco.MarkerSeverity.Info,
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.endColumn,
            }
        ]);

        this.runHighlightedExpression.emit();
    }

    private registerKeyBindings(): void
    {
        let runExpressionID = "run-expression";
        let runHighlightedExpressionID = "run-highlighted-expression";

        let keybindings = [
            {
                id: runExpressionID,
                keybinding: this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter,
                run: () => this.runExpression.emit()
            },
            {
                id: runHighlightedExpressionID,
                keybinding: this.monaco.KeyMod.CtrlCmd | this.monaco.KeyMod.Alt | this.monaco.KeyCode.Enter,
                run: () => this.onRunHighlightedExpressionCommand()
            },
        ];

        keybindings.forEach(({ id, keybinding, run }) =>
        {
            this.monaco.editor.addCommand({ id, run });
    
            this.monaco.editor.addKeybindingRule({
                keybinding,
                command: id,
                when: "textInputFocus",
            });
        });
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

    get diffText(): string
    {
        return this._diffText;
    }

    @Input() set diffText(value: string)
    {
        this._diffText = value;
        if(this._diffText)
        {
            if(this._editor)
            {
                this._editor.getModel().dispose();
            }
            this.createDiffEditor();
        }
    }

    get runtimeError(): LuaRuntimeError
    {
        return this._runtimeError;
    }

    @Input() set runtimeError(value: LuaRuntimeError)
    {
        this._runtimeError = value;
        if(this._runtimeError)
        {
            let marker =
            {
                message: this._runtimeError.message,
                severity: this.monaco.MarkerSeverity.Error,
                startLineNumber: this._runtimeError.line,
                startColumn: 1
            };

            this.monaco.editor.setModelMarkers(this._editor.getModel(), "owner", [marker]);
        }
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

    checkIsOwner(module: DataExpressionModule): boolean
    {
        return module.author.user_id === this._authService.getUserID();
    }


    onLinkModule(moduleID: string): void
    {
        this.linkModule.emit(moduleID);
    }

    onSetActive(): void
    {
        // Have to re-register keybindings every time the active editor is changed because these are stored globally
        this.registerKeyBindings();

        this.onClick.emit();
    }

    get installedModules(): DataExpressionModule[]
    {
        return this._installedModules;
    }

    @Input() set installedModules(modules: DataExpressionModule[])
    {
        this._installedModules = modules;
        this.calculateModuleContainerWidths();
    }

    get isHeaderOpen(): boolean
    {
        return this._isHeaderOpen;
    }

    @Input() set isHeaderOpen(isOpen: boolean)
    {
        this._isHeaderOpen = isOpen;
        this.calculateModuleContainerWidths();
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

    calculateModuleContainerWidths(): void
    {
        if(!this.installedModules?.length)
        {
            return;
        }

        // We need to wait for the DOM to be updated before we can get the width of the module containers
        // We do this by using setTimeout with 0ms delay, which will run on the next tick
        setTimeout(() =>
        {
            this.moduleContainerWidths = {};
            this.elementRef?.nativeElement?.querySelectorAll("div.module-import-line").forEach((element: HTMLElement)=>
            {
                let moduleID = element.id.replace("module-", "");
                let module = this.installedModules.find(module => module.id === moduleID);
                if(module)
                {
                    this.moduleContainerWidths[moduleID] = element.querySelector(".module-container")?.clientWidth || 0;
                }
            });
        });
    }

    getMaxWidthModule(): DataExpressionModule
    {
        let maxLength = 0;
        let maxWidthModule = null;
        this.installedModules.forEach((module) =>
        {
            if(module.name.length > maxLength)
            {
                maxWidthModule = module;
                maxLength = module.name.length;
            }
        });

        if(!maxWidthModule?.id)
        {
            return null;
        }

        return maxWidthModule;
    }

    getVersionContainerWidthDifference(moduleID: string): number
    {
        if(!this.installedModules || !moduleID)
        {
            return 0;
        }

        let maxWidth = this.moduleContainerWidths[this.getMaxWidthModule().id] || 0;
        let thisWidth = this.moduleContainerWidths[moduleID] || 0;

        return maxWidth && thisWidth ? maxWidth - thisWidth : 0;
    }

    get maxInstalledModuleCharacterLength(): number
    {
        if(!this.installedModules)
        {
            return 0;
        }

        let maxLength = 0;
        this.installedModules.forEach((module) =>
        {
            maxLength = Math.max(maxLength, module.name.length);
        });

        return maxLength;
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
