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

import { Component, ComponentFactoryResolver, HostListener, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { Subscription, timer } from "rxjs";
import { ContextImageService } from "src/app/services/context-image.service";
import { LayoutService } from "src/app/services/layout.service";
import { analysisLayoutState, ViewStateService } from "src/app/services/view-state.service";
import { BinaryPlotWidgetComponent } from "src/app/UI/binary-plot-widget/binary-plot-widget.component";
// Components we can create dynamically
import { ChordViewWidgetComponent } from "src/app/UI/chord-view-widget/chord-view-widget.component";
import { ContextImageViewWidgetComponent } from "src/app/UI/context-image-view-widget/context-image-view-widget.component";
import { HistogramViewComponent } from "src/app/UI/histogram-view/histogram-view.component";
import { SpectrumChartWidgetComponent } from "src/app/UI/spectrum-chart-widget/spectrum-chart-widget.component";
import { SpectrumRegionPickerComponent } from "src/app/UI/spectrum-chart-widget/spectrum-region-picker/spectrum-region-picker.component";
import { TernaryPlotWidgetComponent } from "src/app/UI/ternary-plot-widget/ternary-plot-widget.component";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression } from "src/app/models/Expression";
import { DataSourceParams, RegionDataResultItem, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";
import { TextSelection } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
import { AuthenticationService } from "src/app/services/authentication.service";

@Component({
    selector: "code-editor",
    templateUrl: "./code-editor.component.html",
    styleUrls: ["./code-editor.component.scss"],
    providers: [ContextImageService],
})
export class CodeEditorComponent implements OnInit, OnDestroy
{
    @ViewChild("preview", { read: ViewContainerRef }) previewContainer;

    private _subs = new Subscription();

    private _previewComponent = null;
    private _datasetID: string;
    private _expressionID: string;

    private _editable = true;

    public useAutocomplete = false;
    public isCodeChanged = true;
    public isExpressionSaved = true;
    public isLua = false;

    public activeTextSelection: TextSelection = null;
    public executedTextSelection: TextSelection = null;
    public isSubsetExpression: boolean = false;

    public expression: DataExpression;
    public evaluatedExpression: RegionDataResultItem;
    public pmcGridExpressionTitle: string = "";
    public displayExpressionTitle: string = "";

    public isPMCDataGridSolo: boolean = false;

    private _keyPresses: { [key: string]: boolean } = {};
    
    private _fetchedExpression: boolean = false;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _authService: AuthenticationService,
        private _layoutService: LayoutService,
        private _viewStateService: ViewStateService,
        private resolver: ComponentFactoryResolver,
        public dialog: MatDialog,
        private _expressionService: DataExpressionService,
        private _widgetDataService: WidgetRegionDataService,
    )
    {
    }


    ngOnInit()
    {
        this._datasetID = this._route.snapshot.parent.params["dataset_id"];
        this._expressionID = this._route.snapshot.params["expression_id"];
        this._expressionService.expressionsUpdated$.subscribe(() =>
        {
            if(this._fetchedExpression)
            {
                return;
            }

            let expression = this._expressionService.getExpression(this._expressionID);

            let expressionText = expression.expression;
            this.isLua = this.checkLua(expressionText);

            this.expression = new DataExpression(
                expression.id,
                expression.name,
                expressionText,
                expression.type,
                expression.comments,
                expression.shared,
                expression.creator,
                expression.createUnixTimeSec,
                expression.modUnixTimeSec,
                expression.tags
            );
            this._fetchedExpression = true;
            this.runExpression();
        });
    }

    checkLua(text: string): boolean
    {
        return text.startsWith("LUA\n");
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this.clearPreviewReplaceable();
    }

    ngAfterViewInit()
    {
        this._layoutService.notifyNgAfterViewInit();

        this._subs.add(this._viewStateService.analysisViewSelectors$.subscribe(
            (selectors: analysisLayoutState)=>
            {
                if(selectors)
                {
                    // Run these after this function finished, else we get ExpressionChangedAfterItHasBeenCheckedError
                    // See: https://stackoverflow.com/questions/43917940/angular-dynamic-component-loading-expressionchangedafterithasbeencheckederror
                    // Suggestion is we shouldn't be doing this in ngAfterViewInit, but if we do it in ngOnInit we don't yet have the view child
                    // refs available
                    const source = timer(1);
                    /*const sub =*/ source.subscribe(
                        ()=>
                        {
                            this.createTopRowComponents(selectors.topWidgetSelectors);
                            this.runExpression();
                        }
                    );
                }
                else
                {
                    this.previewContainer.clear();
                    this.clearPreviewReplaceable();
                }
            },
            (err)=>
            {
            }
        ));
    }

    private clearPreviewReplaceable(): void
    {
        if(this._previewComponent != null)
        {
            this._previewComponent.destroy();
            this._previewComponent = null;
        }
    }

    private createTopRowComponents(selectors: string[])
    {
        // Set this one
        this.previewContainer.clear();
        this.clearPreviewReplaceable();
        let factory = this.makeComponentFactory(selectors[2]);
        if(factory)
        {
            let comp = this.previewContainer.createComponent(factory);
            comp.instance.widgetPosition = "preview";
            comp.instance.previewExpressionIDs = [`unsaved-${this._expressionID}`];

            this._previewComponent = comp;
        }
    }

    onToggleAutocomplete(): void
    {
        if(!this.isSharedByOtherUser)
        {
            this.useAutocomplete = !this.useAutocomplete;
        }
    }

    onClose(): void
    {
        if(!this.isExpressionSaved && !confirm("Are you sure you want to close this expression? Any unsaved changes will be lost."))
        {
            return;
        }
        this._router.navigate(["dataset", this._datasetID, "analysis"]);
    }

    runExpression(): void
    {
        if(this._expressionID && this.expression)
        {
            let expressionText = this.isLua ? this.addLuaHighlight(this.expression.expression) : this.expression.expression;
            let expression = new DataExpression(this._expressionID, this.expression.name, expressionText, this.expression.type, this.expression.comments, this.expression.shared, this.expression.creator, this.expression.createUnixTimeSec, this.expression.modUnixTimeSec, this.expression.tags);
            this._widgetDataService.runAsyncExpression(new DataSourceParams(this._expressionID, PredefinedROIID.AllPoints, this._datasetID), expression, false).toPromise().then((result)=>
            {
                this.evaluatedExpression = result;
                if(this.evaluatedExpression && this.evaluatedExpression?.values?.values.length > 0)
                {
                    this.isCodeChanged = false;
                    let previewID = `unsaved-${this._expressionID}`;
                    this.displayExpressionTitle = `Unsaved ${expression.name}`;
                    this._expressionService.cache(previewID, expression, this.displayExpressionTitle);
                }
            });
        }
        this.pmcGridExpressionTitle = "Numeric Values: All";
        this.isSubsetExpression = false;
        if(this.executedTextSelection)
        {
            this.executedTextSelection.clearMarkedText();
        }
        this.executedTextSelection = null;
    }

    addLuaHighlight(text: string): string
    {
        let changedText = text;
        if(!changedText.includes("return"))
        {
            let textLines = changedText.trim().split("\n");
            if(textLines.length > 0)
            {
                textLines[textLines.length - 1] = "return " + textLines[textLines.length - 1];
            }
            changedText = textLines.join("\n");
        }

        if(!changedText.startsWith("LUA\n"))
        {
            return "LUA\n" + changedText;
        }

        return changedText;
    }

    runHighlightedExpression(): void
    {
        let highlightedExpression = new DataExpression(this._expressionID, this.expression.name, "", this.expression.type, this.expression.comments, this.expression.shared, this.expression.creator, this.expression.createUnixTimeSec, this.expression.modUnixTimeSec, this.expression.tags);
        if(this.textHighlighted)
        {
            highlightedExpression.expression = this.textHighlighted;
        }
        else if(this.isEmptySelection)
        {
            highlightedExpression.expression = this.expression.expression.split("\n").slice(0, this.endLineHighlighted + 1).join("\n");
        }

        if(this.isLua)
        {
            highlightedExpression.expression = this.addLuaHighlight(highlightedExpression.expression);
        }

        this._widgetDataService.runAsyncExpression(
            new DataSourceParams(this._expressionID, PredefinedROIID.AllPoints, this._datasetID),
            highlightedExpression,
            false
        ).toPromise().then((result)=>
        {
            this.evaluatedExpression = result;
        });

        let lineRange = "";
        let isMultiLine = this.startLineHighlighted !== this.endLineHighlighted || this.isEmptySelection;
        if(this.isEmptySelection)
        {
            lineRange = `0 - ${this.endLineHighlighted + 1}`;
        }
        else
        {
            lineRange = !isMultiLine ? `${this.startLineHighlighted + 1}` : `${this.startLineHighlighted + 1} - ${this.endLineHighlighted + 1}`;
        }
        
        let previewID = `unsaved-${this._expressionID}`;
        this.displayExpressionTitle = `Unsaved ${this.expression.name} (Line${isMultiLine ? "s": ""} ${lineRange})`;
        this._expressionService.cache(previewID, highlightedExpression, this.displayExpressionTitle);

        this.pmcGridExpressionTitle = `Numeric Values: Line${isMultiLine ? "s": ""} ${lineRange}`;
        this.isSubsetExpression = true;

        this.executedTextSelection = this.activeTextSelection;
        this.executedTextSelection.markText();
    }

    onTextSelect(textSelection: TextSelection): void
    {
        this.activeTextSelection = textSelection;
    }

    get textHighlighted(): string
    {
        return this.activeTextSelection?.text;
    }

    get saveExpressionTooltip(): string
    {
        return this.isWindows ? "Save Expression (Ctrl+S)" : "Save Expression (Cmd+S)";
    }

    get runCodeTooltip(): string
    {
        return this.isWindows ? "Run Full Expression (Ctrl+Enter)" : "Run Full Expression (Cmd+Enter)";
    }

    get runHighlightedCodeTooltip(): string
    {
        let targetText = this.textHighlighted === "" ? "Expression Until Line" : "Highlighted Expression";
        return this.isWindows ? `Run ${targetText} (Ctrl+Alt+Enter)` : `Run ${targetText} (Cmd+Option+Enter)`;
    }

    get isWindows(): boolean
    {
        return navigator.userAgent.search("Windows") !== -1;
    }

    get isEmptySelection(): boolean
    {
        return this.activeTextSelection?.isEmptySelection;
    }

    get startLineHighlighted(): number
    {
        return this.activeTextSelection?.startLine;
    }

    get endLineHighlighted(): number
    {
        return this.activeTextSelection?.endLine;
    }

    get editable(): boolean
    {
        return this._editable && !this.isSharedByOtherUser;
    }

    get editExpression(): string
    {
        return this.expression?.expression || "";
    }

    set editExpression(val: string)
    {
        if(this.expression)
        {
            this.expression.expression = val;
            this.isCodeChanged = true;
            this.isExpressionSaved = false;
        }
    }

    get selectedTagIDs(): string[]
    {
        return this.expression?.tags || [];
    }

    set selectedTagIDs(tags: string[])
    {
        if(this.expression)
        {
            this.expression.tags = tags;
            this.isExpressionSaved = false;
        }
    }

    get expressionName(): string
    {
        return this.expression?.name || "";
    }

    set expressionName(name: string)
    {
        if(this.expression)
        {
            this.expression.name = name;
            this.isExpressionSaved = false;
        }
    }

    get expressionComments(): string
    {
        return this.expression?.comments || "";
    }

    set expressionComments(comments: string)
    {
        if(this.expression)
        {
            this.expression.comments = comments;
            this.isExpressionSaved = false;
        }
    }

    get isSharedByOtherUser(): boolean
    {
        return this.expression?.shared && this.expression.creator.user_id !== this._authService.getUserID();
    }

    addLua(text: string): string
    {
        if(!text.startsWith("LUA\n"))
        {
            return "LUA\n" + text;
        }

        return text;
    }

    onExpressionTextChanged(text: string): void
    {
        this.editExpression = this.isLua ? this.addLua(text) : text;
    }

    onTagSelectionChanged(tags): void
    {
        this.selectedTagIDs = tags;
    }

    onTogglePMCDataGridSolo(isSolo: boolean): void
    {
        this.isPMCDataGridSolo = isSolo;
    }

    onSave(): void
    {
        if(this.isExpressionSaved || this.isSharedByOtherUser)
        {
            // Nothing to save
            return;
        }

        this._expressionService.edit(
            this._expressionID,
            this.expression.name,
            this.expression.expression,
            this.expression.type,
            this.expression.comments,
            this.expression.tags
        ).subscribe(
            ()=>
            {
                this.isCodeChanged = false;
                this.isExpressionSaved = true;
            },
            (err)=>
            {
                console.error(`Failed to save expression ${this.expression.name}`, err);
                alert(`Failed to save expression ${this.expression.name}: ${err?.message}`);
            }
        );
    }

    @HostListener("window:keydown", ["$event"])
    onKeydown(event: KeyboardEvent): void
    {
        this._keyPresses[event.key] = true;
        if((this._keyPresses["Meta"] && this._keyPresses["Enter"]) || (this._keyPresses["Control"] && this._keyPresses["Enter"]))
        {
            this.runExpression();
            this._keyPresses["Meta"] = false;
            this._keyPresses["Control"] = false;
            this._keyPresses["Enter"] = false;
        }
        else if((this._keyPresses["Meta"] && this._keyPresses["s"]) || (this._keyPresses["Control"] && this._keyPresses["s"]))
        {
            this.onSave();
            this._keyPresses["Meta"] = false;
            this._keyPresses["Control"] = false;
            this._keyPresses["s"] = false;
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }

    @HostListener("window:keyup", ["$event"])
    onKeyup(event: KeyboardEvent): void
    {
        this._keyPresses[event.key] = false;
    }

    // NOTE: there are ways to go from selector string to ComponentFactory:
    //       eg. https://indepth.dev/posts/1400/components-by-selector-name-angular
    //       but we're only really doing this for 5 components, and don't actually want
    //       it to work for any number of components, so hard-coding here will suffice
    private getComponentClassForSelector(selector: string): any
    {
        // Limited Preview Mode Widgets
        if(selector == ViewStateService.widgetSelectorChordDiagram)
        {
            return ChordViewWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorBinaryPlot)
        {
            return BinaryPlotWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorTernaryPlot)
        {
            return TernaryPlotWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorHistogram)
        {
            return HistogramViewComponent;
        }
        else if(selector == ViewStateService.widgetSelectorSpectrum)
        {
            return SpectrumChartWidgetComponent;
        }
        else if(selector == ViewStateService.widgetSelectorContextImage)
        {
            return ContextImageViewWidgetComponent;
        }

        console.error("getComponentClassForSelector unknown selector: "+selector+". Substituting chord diagram");
        return ChordViewWidgetComponent;
    }

    private makeComponentFactory(selector: string): object
    {
        let klass = this.getComponentClassForSelector(selector);
        let factory = this.resolver.resolveComponentFactory(klass);
        return factory;
    }

    @HostListener("window:resize", ["$event"])
    onResize(event)
    {
        // Window resized, notify all canvases
        this._layoutService.notifyWindowResize();
    }
}
