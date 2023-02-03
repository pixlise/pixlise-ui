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

import { Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CodemirrorComponent } from "@ctrl/ngx-codemirror";
import { Subscription, timer } from "rxjs";
import { ExpressionParts, PixliseDataQuerier } from "src/app/expression-language/interpret-pixlise";
import { QuantificationLayer, QuantModes } from "src/app/models/Quantifications";
import { DataExpression } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CursorSuggestions, ExpressionHelp, FunctionParameterPosition, LabelElement, Suggestion } from "./expression-help";
import { SentryHelper } from "src/app/utils/utils";


export class ExpressionEditorConfig
{
    constructor(
        public expr: DataExpression,
        public allowEdit: boolean,
        public applyNow: boolean = false,
        public isImmediatelyAppliable: boolean = true,
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
    selector: "app-expression-editor",
    templateUrl: "./expression-editor.component.html",
    styleUrls: ["./expression-editor.component.scss"]
})
export class ExpressionEditorComponent implements OnInit, OnDestroy
{
    @ViewChild(CodemirrorComponent, {static: false}) private _codeMirror: CodemirrorComponent;
    //@ViewChild(CodemirrorComponent) _codeMirror: CodemirrorComponent;

    private _subs = new Subscription();
    private _expr: DataExpression = null;
    private _exprParts: ExpressionParts = null;

    activeHelp: CursorSuggestions = null;
    private _markTextPositions: MarkPosition[] = [];
    private _markMatchedBracketPositions: MarkPosition[] = [];

    dropdownTop: string = "";
    dropdownLeft: string = "";

    /*
    codeMirrorOptions = {
        lineNumbers: true,
        theme: 'pixlise',
        mode: 'pixlise'
    };
*/
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExpressionEditorConfig,
        public dialogRef: MatDialogRef<ExpressionEditorComponent>,
        private _datasetService: DataSetService,
        private _widgetDataService: WidgetRegionDataService,
    )
    {
        // Make a copy of incoming expression, so we don't edit what's there!
        this._expr = new DataExpression(data.expr.id, data.expr.name, data.expr.expression, data.expr.type, data.expr.comments, data.expr.shared, data.expr.creator, data.expr.createUnixTimeSec, data.expr.modUnixTimeSec, data.expr.tags);
        this.findVariables();

        // https://stackoverflow.com/questions/62676638/ngx-codemirror-cursor-is-not-working-correctly-angular-8
        // NOTE: we had an issue where the cursor/selection box (basically, the size of the underlying textarea in codemirror) wasn't
        //       sized correctly (height-wise). Once a key was typed it fixed itself but until then if the user clicked somewhere/selected, it
        //       was too small. Turns out this is because at the point of initialization, codemirror was not yet given the final sizing so
        //       whatever it did was wrong. We now wait for an afterOpened callback here and tell it to resize once more.
        this.dialogRef.afterOpened().subscribe(
            ()=>
            {
                this._codeMirror.codeMirror.refresh();
            }
        );
    }

    ngOnInit()
    {
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

            cmObj.setOption("mode", "pixlise");
            cmObj.setOption("lineNumbers", true);
            cmObj.setOption("theme", "pixlise");
            cmObj.setOption("readOnly", !this.data.allowEdit);

            // Not sure what codemirror is doing, and why it does it but some ms after creation it has been resetting... we now reset it 2x, once for
            // reducing flicker for user, 2nd time to ensure anything that changed is overwritten with our settings again
            let setupFunc = ()=>
            {
                //cm.setSize(null, '100%');
                //cm.setSize(null, cm.defaultTextHeight() + 2 * 4);
                //cm.setOption('cursorHeight', 1);
                //cm.setOption('autofocus', true);

                this.setupCodeMirrorEventHandlers(cmObj);
                cmObj.refresh();
            };

            const source1 = timer(1);
            const sub1 = source1.subscribe(setupFunc);

            const source2 = timer(100);
            const sub2 = source2.subscribe(setupFunc);
        }
        );
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private findVariables(): void
    {
        try
        {
            this._exprParts = PixliseDataQuerier.breakExpressionIntoParts(this._expr.expression);
        }
        catch (error)
        {
            SentryHelper.logException(error, "ExpressionEditorComponent.findVariables");
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
        return this._expr.expression;
    }

    set editExpression(val: string)
    {
        this._expr.expression = val;
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
        return this.data.allowEdit;
    }

    onOK()
    {
        // Make sure both have data
        if(this._expr == null || this._expr.name.length <= 0 || this._expr.expression.length <= 0)
        {
            alert("Please enter a name and expression");
            return;
        }

        this.dialogRef.close(new ExpressionEditorConfig(this._expr, this.data.allowEdit));
    }

    onApplyToChart()
    {
        // Make sure both have data
        if(this._expr == null || this._expr.name.length <= 0 || this._expr.expression.length <= 0)
        {
            alert("Please enter a name and expression");
            return;
        }

        this.dialogRef.close(new ExpressionEditorConfig(this._expr, this.data.allowEdit, true));
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }

    onKeyDown(event: KeyboardEvent): void
    {
        //console.log(event);
        if(event.key == "Escape")
        {
            // User is going "up" a menu in the help window
            // If we're already at the root menu, hide the help system all together
            /*if(this.activeHelp)
            {
                this.onHelpClick();
            }*/
            this.activeHelp = null;
        }

        event.stopPropagation();
    }

    onKeyUp(event: KeyboardEvent): void
    {
        //console.log(event);
        event.stopPropagation();
    }

    onHelpEscape(parentMenuId: string): void
    {
        //console.log('onHelpEscape parentMenuId='+parentMenuId);

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
        let lines = this._expr.expression.split("\n");
        let cursorIdx = ExpressionHelp.getIndexInExpression(cursor.line, cursor.ch, lines);

        //console.log('onHelpClick actionId='+actionId);
        //console.log(suggestionSelected);

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
        let prefix = this._expr.expression.substring(0, startIdx);

        // Check if it ends in a , we add a space for niceness
        if(prefix.length > 0 && prefix[prefix.length-1] == ",")
        {
            prefix += " ";
        }

        let postfix = this._expr.expression.substring(endIdx);

        this._expr.expression = prefix+replaceWith+postfix;
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

    private setupCodeMirrorEventHandlers(cm: CodeMirror.EditorFromTextArea): void
    {
        cm.on("beforeChange", (instance, event)=>
        {
            /*
            // Enforce single line tip: https://discuss.codemirror.net/t/single-line-codemirror/195/3
            let typedNewLine = event.origin == '+input' && typeof event.text == "object" && event.text.join("") == "";
            if (typedNewLine)
            {
                return event.cancel();
            }
*/
            let pastedNewLine = event.origin == "paste" && typeof event.text == "object" && event.text.length > 1;
            if(pastedNewLine)
            {
                /*
                // Force it to be all on one line
                let newText = event.text.join(" ");

                // trim
                //newText = $.trim(newText);

                return event.update(null, null, [newText]);
                */
                return event.update(null, null, event.text);
            }

            return null;
        });

        cm.on("change", (instance, event)=>
        {
            // User may have created/deleted variables
            this.findVariables();

            this.updateHelp();
        });

        cm.on("cursorActivity", (instance)=>
        {
            this.updateHelp();
        });

        cm.on("focus", (instance)=>
        {
            this.updateHelp();
        });

        cm.on("blur", (instance)=>
        {
            // The intent was to hide the dialog if the expression editor lost focus
            // This can't be done though, because the focus may have been lost to something
            // that's on the expression help area! If we close the whole thing now, that event
            // never comes back up to us
            /*
            // Lost focus
//console.log('Lost focus');

            // Allow any mouse clicks to process (because if we remove the help dialog now
            // we cancel anything that was clicked there, to which we lost our focus!)
            const source = timer(1);
            source.subscribe(
                ()=>
                {
                    //this.updateHelp();
                    this.activeHelp = null;
                }
            );
*/
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

    private updateHelp(): void
    {
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
            this._markTextPositions = ExpressionEditorComponent.findPositionsToMark(this._exprParts, this._expr.expression, cursor);
            this._markMatchedBracketPositions = ExpressionEditorComponent.findMatchedBracketPositions(this._expr.expression, cursor);
        }

        //console.log(this);
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
        let varName = ExpressionEditorComponent.getVariableAtCursor(exprParts, cursor.line, cursor.ch, lines);

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
            (startPos == 0 || ExpressionEditorComponent.acceptableCharsAround.indexOf(line[startPos-1]) > -1) &&
            (endPos == line.length || ExpressionEditorComponent.acceptableCharsAround.indexOf(line[endPos]) > -1)
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
            if(ExpressionEditorComponent.acceptableCharsAround.indexOf(lineStr[pos]) > -1)
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
            if(ExpressionEditorComponent.acceptableCharsAround.indexOf(lineStr[pos]) > -1)
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
