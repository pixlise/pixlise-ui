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

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { CodemirrorComponent } from "@ctrl/ngx-codemirror";
import { Subscription, timer } from "rxjs";
import { ExpressionParts, PixliseDataQuerier } from "src/app/expression-language/interpret-pixlise";
import { QuantificationLayer, QuantModes } from "src/app/models/Quantifications";
import { DataExpression } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CursorSuggestions, ExpressionHelp, FunctionParameterPosition, LabelElement, Suggestion } from "../expression-help";
import { SentryHelper } from "src/app/utils/utils";
import { Range } from "codemirror";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";

require("codemirror/addon/comment/comment.js");
require("codemirror/mode/lua/lua");

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
    @ViewChild(CodemirrorComponent, {static: false}) private _codeMirror: CodemirrorComponent;
    
    private _subs = new Subscription();
    private _expr: DataExpression = null;
    private _exprParts: ExpressionParts = null;

    activeHelp: CursorSuggestions = null;
    private _markTextPositions: MarkPosition[] = [];
    private _markMatchedBracketPositions: MarkPosition[] = [];

    dropdownTop: string = "";
    dropdownLeft: string = "";

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
    @Output() changeExpression = new EventEmitter<(text: string) => void>();
    @Output() toggleHeader = new EventEmitter();
    @Output() onClick = new EventEmitter();
    
    constructor(
        private _datasetService: DataSetService,
        private _widgetDataService: WidgetRegionDataService,
    )
    {
    }

    ngOnInit()
    {
        // Make a copy of incoming expression, so we don't edit what's there!
        this._expr = this.copyExpression(this.expression);
        this.findVariables();

        this.changeExpression.emit((text: string) =>
        {
            this._expr.sourceCode = text;
            this._codeMirror.codeMirrorGlobal.then((cm: any)=>
            {
                this.setupCodeMirror(cm.default);
                let cmObj = this._codeMirror.codeMirror;
                cmObj.setOption("mode", this.isLua ? "lua" : "pixlise");
                this.setUpKeyBindings(cmObj);
                cmObj.refresh();
            });
        });
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
        // Get the codemirror object
        // Vital: https://stackoverflow.com/questions/62097418/how-i-can-add-the-simple-mode-to-codemirror-angular-8
        // NOTE: As of angular 13 it seems to return a ZoneAwarePromise so we use then to get the object...
        this._codeMirror.codeMirrorGlobal.then((cm: any)=>
        {
            this.setupCodeMirror(cm.default);

            let cmObj = this._codeMirror.codeMirror;

            this._initAsLua = this.isLua;

            cmObj.setOption("mode", this.isLua ? "lua" : "pixlise");
            cmObj.setOption("lineNumbers", true);
            cmObj.setOption("theme", "pixlise");
            cmObj.setOption("readOnly", !this.allowEdit);

            this.setUpKeyBindings(cmObj);

            // Not sure what codemirror is doing, and why it does it but some ms after creation it has been resetting... we now reset it 2x, once for
            // reducing flicker for user, 2nd time to ensure anything that changed is overwritten with our settings again
            let setupFunc = ()=>
            {
                this.setupCodeMirrorEventHandlers(cmObj);
                cmObj.refresh();
            };

            const source1 = timer(1);
            const sub1 = source1.subscribe(setupFunc);

            const source2 = timer(100);
            const sub2 = source2.subscribe(setupFunc);
        });
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onToggleHeader(): void
    {
        this.toggleHeader.emit();
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

    get isHeaderNonEmptyAndOpen(): boolean
    {
        return this.isHeaderOpen && this.installedModules.length > 0;
    }

    get gutterWidth(): string
    {
        return this._codeMirror?.codeMirror?.getGutterElement()?.style?.width || "29px";
    }

    get isWindows(): boolean
    {
        return navigator.userAgent.search("Windows") !== -1;
    }

    private setUpKeyBindings(cmObj: any): void
    {
        const toggleComment = (cm) =>
        {
            cm.toggleComment({
                indent: true,
                lineComment: this.isLua ? "--" : "//"
            });
        };

        const resetMarks = (cm) =>
        {
            this.range = null;
            let cursor = cm.getCursor();
            cm.setSelection({line: 0, ch: 0}, {line: 0, ch: 0});
            cm.setSelection(cursor, cursor);
        };
        
        if(this.isWindows)
        {
            cmObj.setOption("extraKeys", {
                "Ctrl-/": toggleComment,
                "Ctrl-Enter": (cm) =>
                {
                    resetMarks(cm);
                    this.runExpression.emit();
                },
                "Ctrl-Alt-Enter": (cm) =>
                {
                    resetMarks(cm);
                    this.runHighlightedExpression.emit();
                },
                "Ctrl-S": () => this.saveExpression.emit(),
                "Ctrl-B": () => this.toggleSidebar.emit(),
            });
        }
        else
        {
            cmObj.setOption("extraKeys", {
                "Cmd-/": toggleComment,
                "Cmd-Enter": (cm) =>
                {
                    resetMarks(cm);
                    this.runExpression.emit();
                },
                "Cmd-Alt-Enter": (cm) =>
                {
                    resetMarks(cm);
                    this.runHighlightedExpression.emit();

                },
                "Cmd-S": () => this.saveExpression.emit(),
                "Cmd-B": () => this.toggleSidebar.emit(),
            });
        }
    }

    private findVariables(): void
    {
        // NOTE: this is confusing, we have isLua input and expression also has a source language
        if(this._expr.sourceLanguage != EXPR_LANGUAGE_LUA || this.isLua)
        {
            return;
        }

        if(this._expr.sourceCode == null || this._expr.sourceCode.length == 0)
        {
            this._exprParts = new ExpressionParts([], [], [], "");
            return;
        }

        try
        {
            this._exprParts = PixliseDataQuerier.breakExpressionIntoParts(this._expr.sourceCode);
        }
        catch (error)
        {
            SentryHelper.logException(error, "ExpressionTextEditorComponent.findVariables");
            this._exprParts = new ExpressionParts([], [], [], "");
        }
    }

    get expressionName(): string
    {
        return this._expr.name;
    }

    set expressionName(val: string)
    {
        this._expr.name = val;
    }

    get editExpression(): string
    {
        // If lua mode switched after init, then we need to strip/add lua and refresh code mirror
        if(this._initAsLua !== this.isLua && this._codeMirror?.codeMirrorGlobal)
        {
            this._initAsLua = this.isLua;
            this._codeMirror.codeMirrorGlobal.then((cm: any)=>
            {
                this.setupCodeMirror(cm.default);
                let cmObj = this._codeMirror.codeMirror;
                cmObj.setOption("mode", this.isLua ? "lua" : "pixlise");
                this.setUpKeyBindings(cmObj);
                cmObj.refresh();
            });
        }

        return this._expr.sourceCode;
    }

    set editExpression(val: string)
    {
        this._expr.sourceCode = val;
        this.onTextChange.emit(this._expr.sourceCode || "");
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

    onKeyDown(event: KeyboardEvent): void
    {
        if(event.key == "Escape")
        {
            this.activeHelp = null;
        }

        event.stopPropagation();
    }

    onKeyUp(event: KeyboardEvent): void
    {
        event.stopPropagation();
    }

    onHelpEscape(parentMenuId: string): void
    {
        // We show the parent menu if we can
        if(parentMenuId)
        {
            this.activeHelp = this.makeSuggestionMenu(parentMenuId);
            return;
        }

        this.activeHelp = null;
    }

    onHelpClick(suggestionSelected: Suggestion): void
    {
        let actionId = null;
        if(suggestionSelected.labelElements && suggestionSelected.labelElements.length > 0)
        {
            actionId = suggestionSelected.labelElements[0].actionId;
        }

        // User clicked on a function, put that in at the cursor
        let cm = this._codeMirror.codeMirror;
        let doc = cm.getDoc();
        let cursor = doc.getCursor();

        // Work out what the cursor is over, need to consider multi-line!
        let lines = this._expr.sourceCode.split("\n");
        let cursorIdx = ExpressionHelp.getIndexInExpression(cursor.line, cursor.ch, lines);

        // Do whatever the action id suggests
        if(actionId == LabelElement.idElementFunction)
        {
            // User clicked an element function, insert it into the expression at current cursor
            let quant = this.getLoadedQuant();
            let dets = [];
            if(quant)
            {
                dets = quant.getDetectors();
            }
            let det = QuantModes.quantModeCombined;
            if(dets.length > 0)
            {
                det = dets[0];
            }

            let elemFunc = "element("+suggestionSelected.labelElements[0].txt+", \"%\", \""+det+"\")";
            this.replaceExpressionPart(cursorIdx, cursorIdx, elemFunc);
            doc.setCursor(cursorIdx+elemFunc.length);

            this.activeHelp = this.makeSuggestionMenu(LabelElement.idRoot);
        }
        else if(actionId == LabelElement.idSpecificFunction)
        {
            // User clicked a function, insert "name(" at cursor
            let funcInsert = suggestionSelected.labelElements[0].txt+"(";
            this.replaceExpressionPart(cursorIdx, cursorIdx, funcInsert);
            doc.setCursor(cursorIdx+funcInsert.length);

            this.activeHelp = this.getCursorSuggestions(cursor);
        }
        else if(actionId == LabelElement.idOperator)
        {
            // User clicked an operator, insert it at cursor (or position if specified)
            let operatorInsert = suggestionSelected.labelElements[0].txt;
            this.replaceExpressionPartWithFallback(suggestionSelected.positionInfo, cursorIdx, operatorInsert);
            doc.setCursor(cursorIdx+operatorInsert.length);

            this.activeHelp = this.makeSuggestionMenu(LabelElement.idRoot);
        }
        else if(actionId == LabelElement.idParameterOption)
        {
            // Replace the parameter with the chosen value
            // If we have no position info, do it at the cursor!
            this.replaceExpressionPartWithFallback(suggestionSelected.positionInfo, cursorIdx, suggestionSelected.labelElements[0].txt);
        }
        else
        {
            // Show menu for whatever they clicked
            this.activeHelp = this.makeSuggestionMenu(actionId);
        }
    }

    private replaceExpressionPartWithFallback(posInfoOptional: FunctionParameterPosition, cursorIdxFallback: number, toReplace: string)
    {
        let startIdx = cursorIdxFallback;
        let endIdx = cursorIdxFallback;
        if(posInfoOptional)
        {
            startIdx = posInfoOptional.startIdx;
            endIdx = posInfoOptional.startIdx+posInfoOptional.length;
        }

        this.replaceExpressionPart(startIdx, endIdx, toReplace);
    }

    private replaceExpressionPart(startIdx: number, endIdx: number, replaceWith: string)
    {
        // Apply the suggestion picked
        let prefix = this._expr.sourceCode.substring(0, startIdx);

        // Check if it ends in a , we add a space for niceness
        if(prefix.length > 0 && prefix[prefix.length-1] == ",")
        {
            prefix += " ";
        }

        let postfix = this._expr.sourceCode.substring(endIdx);

        this._expr.sourceCode = prefix+replaceWith+postfix;
    }

    onClickDialog(event): void
    {
        // hide help
        this.activeHelp = null;
    }

    onClickExpression(event): void
    {
        // Don't let this bubble up to our catch-all dialog click handler (that hides the help!)
        event.stopPropagation();
    }

    private setupCodeMirror(cm: any): void
    {
        let help: ExpressionHelp = new ExpressionHelp();
        let funcs = help.listFunctions();

        if(!this.isLua)
        {
            cm.defineSimpleMode("pixlise", {
                // The start state contains the rules that are intially used
                start: [
                // The regex matches the token, the token property contains the type
                    {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string"},
                    // You can match multiple tokens at once. Note that the captured
                    // groups must span the whole string in this case
                    //{regex: /(function)(\s+)([a-z$][\w$]*)/, token: ["keyword", null, "variable-2"]},
                    // Rules are matched in the order in which they appear, so there is
                    // no ambiguity between this one and the one above
                    {regex: new RegExp("(?:"+funcs.join("|")+")\\b"), token: "function"},
                    //{regex: /true|false|null|undefined/, token: "atom"},
                    //{regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
                    {regex: /0x[a-f\d]+|(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
                    {regex: /\/\/.*/, token: "comment"},
                    //{regex: /\/(?:[^\\]|\\.)*?\//, token: "variable-3"},
                    // A next property will cause the mode to move to a different state
                    {regex: /\/\*/, token: "comment", next: "comment"},
                    //{regex: /[-+\/*=<>!]+/, token: "operator"},
                    {regex: /[-+\/*]+/, token: "operator"},
                    // indent and dedent properties guide autoindentation
                    //{regex: /[\{\[\(]/, indent: true},
                    //{regex: /[\}\]\)]/, dedent: true},
                    {regex: /[A-Za-z$][\w$]*/, token: "variable"},
                // You can embed other modes with the mode property. This rule
                // causes all code between << and >> to be highlighted with the XML
                // mode.
                //{regex: /<</, token: "meta", mode: {spec: "xml", end: />>/}}
                ],

                // The multi-line comment state.
                comment: [
                    {regex: /.*?\*\//, token: "comment", next: "start"},
                    {regex: /.* /, token: "comment"}
                ],
                // // The meta property contains global information about the mode. It
                // // can contain properties like lineComment, which are supported by
                // // all modes, and also directives like dontIndentStates, which are
                // // specific to simple modes.
                meta: {
                    dontIndentStates: ["comment"],
                    lineComment: "//"
                }
            });
        }
        // Use LUA code mirror mode

    }

    private setupCodeMirrorEventHandlers(cm: CodeMirror.EditorFromTextArea): void
    {
        cm.on("beforeChange", (instance, event)=>
        {
            let pastedNewLine = event.origin == "paste" && typeof event.text == "object" && event.text.length > 1;
            if(pastedNewLine)
            {
                return event.update(null, null, event.text);
            }

            return null;
        });

        cm.on("change", (instance, event)=>
        {
            
            // User may have created/deleted variables
            this.findVariables();

            this.updateHelp();
            this.range = null;
        });

        cm.on("cursorActivity", (instance)=>
        {
            this.updateHelp();
        });

        cm.on("focus", (instance)=>
        {
            this.onSetActive();
            this.updateHelp();
            this.markExecutedExpressionRange(cm);
        });

        cm.on("beforeSelectionChange", (instance, selection) =>
        {
            if(selection.ranges.length === 1)
            {
                let range = selection.ranges[0];
                let isSingleLineEmpty = range.anchor.line === range.head.line && range.anchor.ch === range.head.ch;
                let startLine = Math.min(range.anchor.line, range.head.line);
                let endLine = Math.max(range.anchor.line, range.head.line);
                
                setTimeout(() =>
                {
                    let text = "";
                    if(window.getSelection)
                    {
                        text = window.getSelection().toString();
                    }
                    else if(document.getSelection)
                    {
                        text = document.getSelection().toString();
                    }
                    this.onTextSelect.emit(
                        new TextSelection(text, isSingleLineEmpty, startLine, endLine, selection.ranges[0], 
                            () => this.markExecutedExpressionRange(cm, range),
                            () =>
                            {
                                let rangeEnd = this.range?.to() || {line: 0, ch: 0};
                                this.range = null;

                                // We have to set selection twice to clear the marked range because code mirror only
                                // does an actual selection change (which resets marked text) if the new selection is valid and
                                // different from the old selection and we can only ensure it is different by setting it twice
                                cm.setSelection({line: 0, ch: 0}, {line: 0, ch: 0});
                                cm.setSelection(rangeEnd, rangeEnd);
                            }
                        )
                    );
                    this.markExecutedExpressionRange(cm);
                }, 100);
            }
        });

        // TODO: key map, remove up/down arrow keys so they can be handled outside of codemirror, and we can move up/down help
        // menus when pressed (our editor is always single-line only)
        //
        // TODO: if user clicks on a help option (or key up/down+enter), we need to replace that parameter with whatever it is
        //
        // TODO: if user clicks esc button on help (or hits escape key), we need to show "1 level up"... eg param->func->root
        //
        // TODO: show some help for operators, somehow?
        //
        // TODO: handling of nested brackets in help

        // Start with it focussed if we've already got an expression name (would mostly happen
        // if we are editing an existing expression)
        if(this._expr && this._expr.name.length > 0)
        {
            cm.focus();
        }
    }

    private markExecutedExpressionRange(cm: CodeMirror.EditorFromTextArea, range: Range = null): void
    {
        let executedRange = range ? range : this.range;
        if(executedRange)
        {
            if(executedRange.head.line === executedRange.anchor.line && executedRange.head.ch === executedRange.anchor.ch)
            {
                let endLine = executedRange.to().line;
                cm.markText(
                    { line: 0, ch: 0 },
                    { line: endLine, ch: cm.getLine(endLine).length },
                    { className: "highlight", css: "background-color: black;" }
                );
            }
            else
            {
                cm.markText(
                    executedRange.from(),
                    executedRange.to(),
                    { className: "highlight", css: "background-color: black;" }
                );
            }
        }
    }

    private updateHelp(): void
    {
        // NOTE: this is confusing, we have isLua input and expression also has a source language
        if(this._expr.sourceLanguage != EXPR_LANGUAGE_LUA || this.isLua)
        {
            return;
        }

        let cm = this._codeMirror.codeMirror;

        let doc = cm.getDoc();
        let cursor = doc.getCursor();

        if(!cm.hasFocus())
        {
            // Not focused, so don't show any help
            this.activeHelp = null;
            this._markTextPositions = [];
            this._markMatchedBracketPositions = [];
        }
        else
        {
            this.activeHelp = this.getCursorSuggestions(cursor);
            this._markTextPositions = ExpressionTextEditorComponent.findPositionsToMark(this._exprParts, this._expr.sourceCode, cursor);
            this._markMatchedBracketPositions = ExpressionTextEditorComponent.findMatchedBracketPositions(this._expr.sourceCode, cursor);
        }

        if(this.activeHelp && cm)
        {
            let cursorCoord = cm.cursorCoords(true, "page");

            //let helpPos = positionDialogNearParent(
            this.dropdownTop = Math.floor(cursorCoord.bottom+3)+"px";//elem.clientTop;
            this.dropdownLeft = Math.floor(cursorCoord.left)+"px";//elem.clientLeft;
        }

        if(cm)
        {
            // Set the text marks
            let marks = cm.getAllMarks();
            for(let mark of marks)
            {
                mark.clear();
            }

            if(this._markTextPositions.length > 0)
            {
                for(let mark of this._markTextPositions)
                {
                    cm.markText({"line": mark.line, "ch": mark.idxStart}, {"line": mark.line, "ch": mark.idxEnd}, {className:"var-highlight"});
                }
            }

            for(let mark of this._markMatchedBracketPositions)
            {
                cm.markText({"line": mark.line, "ch": mark.idxStart}, {"line": mark.line, "ch": mark.idxEnd}, {className:"var-match-bracket"});
            }
        }
    }

    private static findMatchedBracketPositions(expression: string, cursor: any/*Position*/): MarkPosition[]
    {
        // If cursor is NOT before/after a bracket, don't do anything
        let lines = expression.split("\n");
        if(cursor.line < 0 || cursor.line >= lines.length || cursor.ch < 0 || cursor.ch >= lines[cursor.line].length)
        {
            // Invalid cursor pos
            return [];
        }

        const openBrackets = "({[";
        const closeBrackets = ")}]";

        // Find index we're at in original string
        let exprIdx = ExpressionHelp.getIndexInExpression(cursor.line, cursor.ch, lines);

        // If we are on a bracket, we may have to search for the open or close slightly offset
        let openSearchStartIdx = exprIdx;
        let closeSearchStartIdx = exprIdx;

        if(openBrackets.indexOf(expression[openSearchStartIdx]) > -1)
        {
            // Cursor is at ^(), to find the ) we have to start searching from +1
            closeSearchStartIdx++;
        }

        if(closeBrackets.indexOf(expression[openSearchStartIdx]) > -1)
        {
            // Cursor is at ^), need to start the search for ( from -1
            if(openSearchStartIdx > 0)
            {
                openSearchStartIdx--;
            }
        }

        // Find open bracket, watching bracket depth
        let bracketNestDepth = 0;
        let openIdx = -1;

        for(let c = openSearchStartIdx; c >= 0; c--)
        {
            if(closeBrackets.indexOf(expression[c]) > -1)
            {
                bracketNestDepth++;
            }
            if(openBrackets.indexOf(expression[c]) > -1)
            {
                if(bracketNestDepth == 0)
                {
                    openIdx = c;
                    break;
                }
                bracketNestDepth--;
            }
        }

        // Find close bracket
        bracketNestDepth = 0;
        let closeIdx = -1;

        for(let c = closeSearchStartIdx; c < expression.length; c++)
        {
            if(openBrackets.indexOf(expression[c]) > -1)
            {
                bracketNestDepth++;
            }
            if(closeBrackets.indexOf(expression[c]) > -1)
            {
                if(bracketNestDepth == 0)
                {
                    closeIdx = c;
                    break;
                }
                bracketNestDepth--;
            }
        }

        // Find this in terms of position on line and we're done
        let result = [];

        let openPos: MarkPosition = new MarkPosition(0, openIdx, -1);
        let closePos: MarkPosition = new MarkPosition(0, closeIdx, -1);

        for(let line of lines)
        {
            let lineLength = line.length+1; // include \n

            if(openPos.idxEnd == -1 && openPos.idxStart >= 0)
            {
                if(openPos.idxStart > lineLength)
                {
                    openPos.idxStart -= lineLength;
                    openPos.line++;
                }
                else
                {
                    openPos.idxEnd = openPos.idxStart+1;
                    result.push(openPos);
                }
            }

            if(closePos.idxEnd == -1 && closePos.idxStart >= 0)
            {
                if(closePos.idxStart > lineLength)
                {
                    closePos.idxStart -= lineLength;
                    closePos.line++;
                }
                else
                {
                    closePos.idxEnd = closePos.idxStart+1;
                    result.push(closePos);
                }
            }

            if(openPos.idxEnd > -1 && closePos.idxEnd > -1)
            {
                break;
            }
        }

        return result;
    }

    private static findPositionsToMark(exprParts: ExpressionParts, expression: string, cursor: any/*Position*/): MarkPosition[]
    {
        // Check if user cursor is on a variable name, if so, find all instances of that variable text to mark
        let lines = expression.split("\n");
        let varName = ExpressionTextEditorComponent.getVariableAtCursor(exprParts, cursor.line, cursor.ch, lines);

        if(varName.length <= 0)
        {
            // User is not on a variable name, so we've got nothing to do!
            return [];
        }

        let result: MarkPosition[] = [];

        let lineIdx = 0;
        for(let line of lines)
        {
            let idx = 0;
            do
            {
                let pos = line.indexOf(varName, idx);
                if(pos == -1)
                {
                    break;
                }

                let posEnd = pos+varName.length;

                // We found a copy!

                // Ensure it's actually a variable surrounded by whitespace
                if(this.isIsolatedWord(line, varName, pos))
                {
                    result.push(new MarkPosition(lineIdx, pos, posEnd));
                }

                idx = posEnd;
            }
            while(idx < line.length);

            lineIdx++;
        }

        return result;
    }

    private static readonly acceptableCharsAround = ",()=*/+- \t";

    private static isIsolatedWord(line: string, candidate: string, startPos: number): boolean
    {
        let endPos = startPos+candidate.length;
        
        return (
            (startPos == 0 || ExpressionTextEditorComponent.acceptableCharsAround.indexOf(line[startPos-1]) > -1) &&
            (endPos == line.length || ExpressionTextEditorComponent.acceptableCharsAround.indexOf(line[endPos]) > -1)
        );
    }

    private static getVariableAtCursor(exprParts: ExpressionParts, line: number, ch: number, lines: string[]): string
    {
        // check if text cursor is on (bounded by acceptableCharsAround) is a variable name, if so return it
        if(line < 0 || line >= lines.length)
        {
            return "";
        }

        let lineStr = lines[line];

        // Find start and end position of potential variable
        let startPos = -1;
        let endPos = -1;
        for(let pos = ch; pos >= 0; pos--)
        {
            if(ExpressionTextEditorComponent.acceptableCharsAround.indexOf(lineStr[pos]) > -1)
            {
                startPos = pos+1;
                break;
            }
        }
        if(startPos < 0)
        {
            startPos = 0;
        }

        for(let pos = ch; pos < lineStr.length; pos++)
        {
            if(ExpressionTextEditorComponent.acceptableCharsAround.indexOf(lineStr[pos]) > -1)
            {
                endPos = pos;
                break;
            }
        }
        if(endPos < 0)
        {
            endPos = lineStr.length;
        }

        let potentialVarName = lineStr.substring(startPos, endPos);

        // Check if it's a variable we know of
        if(exprParts.variableNames.indexOf(potentialVarName) >= 0)
        {
            return potentialVarName;
        }

        return "";
    }

    private getCursorSuggestions(cursor: any/*Position*/): CursorSuggestions
    {
        let quant = this.getLoadedQuant();

        let help: ExpressionHelp = new ExpressionHelp();

        // Work out what the cursor is over and get help for it
        let result = help.getExpressionHelp(this.editExpression, cursor.line, cursor.ch, this._datasetService.datasetLoaded, quant);
        //console.log(result);
        return result;
    }

    private makeSuggestionMenu(id: string): CursorSuggestions
    {
        let quant = this.getLoadedQuant();
        let help: ExpressionHelp = new ExpressionHelp();
        return help.getHelpMenu(id, quant);
    }

    private getLoadedQuant(): QuantificationLayer
    {
        // Expression editor needs quant to get elements, elem columns (%, int, etc), other columns (eg chisq), detectors
        return this._widgetDataService.quantificationLoaded;
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
