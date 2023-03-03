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
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSourceParams, RegionDataResultItem, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";
import { TextSelection } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
import { AuthenticationService } from "src/app/services/authentication.service";
import { LuaTranspiler } from "src/app/expression-language/lua-transpiler";
import { CustomExpressionGroup, ExpressionListBuilder, ExpressionListItems, LocationDataLayerPropertiesWithVisibility, makeDataForExpressionList } from "src/app/models/ExpressionList";
import { ExpressionListHeaderToggleEvent } from "src/app/UI/atoms/expression-list/expression-list.component";
import { LayerVisibilityChange } from "src/app/UI/atoms/expression-list/layer-settings/layer-settings.component";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { LocationDataLayerProperties } from "src/app/models/LocationData2D";
import { RGBMix } from "src/app/services/rgbmix-config.service"
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { DataSet } from "src/app/models/DataSet";
import { LUA_MARKER } from "src/app/expression-language/expression-language";

export class DataExpressionModule
{
    constructor(
        public name: string,
        public description: string="",
        public version: string="",
        public author: string="",
        public allVersions: string[]=[],
    ){}
}

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

    public isSidebarOpen = false;
    // What we display in the virtual-scroll capable list
    headerSectionsOpen: Set<string> = new Set<string>(["currently-open-header"]);
    items: ExpressionListItems = null;
    initialScrollToIdx: number = -1;
    public sidebarTopSections: Record<string, CustomExpressionGroup> = {
        "currently-open": {
            type: "currently-open-header",
            childType: "expression",
            label: "Currently Open",
            items: [],
            emptyMessage: "No expressions are currently open.",
        },
        "installed-modules": {
            type: "installed-modules-header",
            childType: "module",
            label: "Installed Modules",
            items: [],
            emptyMessage: "No modules are installed.",
        },
        "modules": {
            type: "modules-header",
            childType: "module",
            label: "Modules",
            items: [],
            emptyMessage: "No modules are available.",
        }
    };
    public sidebarBottomSections: Record<string, CustomExpressionGroup> = {
        "examples": {
            type: "examples-header",
            childType: "expression",
            label: "Examples",
            items: [],
            emptyMessage: "No examples are available.",
        }
    };

    public isSplitScreen = false;

    private _editable = true;
    public isTopHeaderOpen = true;
    public useAutocomplete = false;
    public isCodeChanged = true;
    public isExpressionSaved = true;
    public isLua = false;
    public expression: DataExpression;
    public topModules: DataExpressionModule[];

    private _bottomEditable = true;
    public isBottomHeaderOpen = true;
    public useBottomAutocomplete = false;
    public isBottomCodeChanged = true;
    public isBottomExpressionSaved = true;
    public isBottomLua = false;
    public bottomExpression: DataExpression;
    public bottomModules: DataExpressionModule[];

    public activeTextSelection: TextSelection = null;
    public executedTextSelection: TextSelection = null;
    public isSubsetExpression: boolean = false;

    public evaluatedExpression: RegionDataResultItem;
    public pmcGridExpressionTitle: string = "";
    public displayExpressionTitle: string = "";

    public isPMCDataGridSolo: boolean = false;

    private _keyPresses: { [key: string]: boolean } = {};
    
    private _fetchedExpression: boolean = false;

    updateText: (text: string) => void;

    private _filterText: string = "";

    private _authors: ObjectCreator[] = [];
    private _filteredAuthors: string[] = [];
    private _filteredTagIDs: string[] = [];

    private _activeIDs: Set<string> = new Set<string>();

    // Icons to display
    activeIcon="assets/button-icons/check-on.svg";
    inactiveIcon="assets/button-icons/check-off.svg";

    _listBuilder: ExpressionListBuilder;

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
        private _datasetService: DataSetService,
    )
    {
    }


    ngOnInit()
    {
        this._listBuilder = new ExpressionListBuilder(true, ["%"], false, false, false, false, this._expressionService);
        this._datasetID = this._route.snapshot.parent?.params["dataset_id"];
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

            // Add the current expression to the currently-open list
            this.sidebarTopSections["currently-open"].items = [
                this.expression
            ];
            this.topModules = [
                new DataExpressionModule("test", "description", "3.7", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                new DataExpressionModule("testing", "description", "3.1", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            ];
        });

        let all$ = makeDataForExpressionList(
            this._datasetService,
            this._widgetDataService,
            this._expressionService,
            null
        );
        this._subs.add(all$.subscribe(
            (data: unknown[])=>
            {
                this._listBuilder.notifyDataArrived(
                    (data[0] as DataSet).getPseudoIntensityElementsList(),
                    data[1] as QuantificationLayer,
                    this._expressionService.getExpressions(DataExpressionId.DataExpressionTypeAll),
                    null
                );

                // All have arrived, the taps above would've saved their contents in a way that we like, so
                // now we can regenerate our item list
                this.regenerateItemList();
            }
        ));
    }

    onAddExpression(): void
    {
        // TODO: Add expression
    }

    onAddModule(): void
    {
        // TODO: Add module
    }

    onToggleSidebar(): void
    {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    onToggleSplitScreen(): void
    {
        this.isSplitScreen = !this.isSplitScreen;
    }

    onToggleTopHeader(): void
    {
        this.isTopHeaderOpen = !this.isTopHeaderOpen;
    }

    onToggleBottomHeader(): void
    {
        this.isBottomHeaderOpen = !this.isBottomHeaderOpen;
    }

    get topExpressionGutterWidth(): string
    {
        let width = document.querySelector("expression-text-editor.top-expression .CodeMirror-gutter")?.clientWidth;
        return `${width || 29}px`;
    }

    get bottomExpressionGutterWidth(): string
    {
        let width = document.querySelector("expression-text-editor.bottom-expression .CodeMirror-gutter")?.clientWidth;
        return `${width || 29}px`;
    }

    checkLua(text: string): boolean
    {
        return text.startsWith(LUA_MARKER);
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

    private regenerateItemList(): void
    {
        let customStartSections = Object.values(this.sidebarTopSections);
        let customEndSections = Object.values(this.sidebarBottomSections);

        this.items = this._listBuilder.makeExpressionList(
            this.headerSectionsOpen,
            this._activeIDs,
            new Set<string>(),
            this._filterText,
            this._filteredAuthors,
            this._filteredTagIDs,
            false, // We never show the exploratory RGB mix item
            (source: DataExpression|RGBMix): LocationDataLayerProperties=>
            {
                let layer = new LocationDataLayerPropertiesWithVisibility(source.id, source.name, source.id, source);
                layer.visible = (this._activeIDs.has(source.id));
                return layer;
            },
            false,
            false,
            customStartSections,
            customEndSections
        );

        this.authors = this._listBuilder.getAuthors();
    }

    get authors(): ObjectCreator[]
    {
        return this._authors;
    }

    set authors(authors: ObjectCreator[])
    {
        this._authors = authors;
    }

    get authorsTooltip(): string
    {
        let authorNames = this._authors.filter((author) => this._filteredAuthors.includes(author.user_id)).map((author) => author.name);
        return this._filteredAuthors.length > 0 ? `Authors:\n${authorNames.join("\n")}` : "No Authors Selected";
    }

    get filteredAuthors(): string[]
    {
        return this._filteredAuthors;
    }

    set filteredAuthors(authors: string[])
    {
        this._filteredAuthors = authors;
        this.regenerateItemList();
    }

    get filteredTagIDs(): string[]
    {
        return this._filteredTagIDs;
    }

    onFilterExpressions(filter: string)
    {
        this._filterText = filter;
        this.regenerateItemList();
    }

    onFilterTagSelectionChanged(tags: string[]): void
    {
        this._filteredTagIDs = tags;
        this.regenerateItemList();
    }

    private toggleLayerSectionOpenNoRegen(itemType: string, open: boolean): void
    {
        if(open)
        {
            // It was opened, ensure it's in the set of open sections
            this.headerSectionsOpen.add(itemType);
        }
        else
        {
            // It's closed, ensure it's not in the open list
            this.headerSectionsOpen.delete(itemType);
        }
    }

    onToggleLayerSectionOpen(event: ExpressionListHeaderToggleEvent): void
    {
        this.toggleLayerSectionOpenNoRegen(event.itemType, event.open);

        // Now that one of our sections has toggled, regenerate the whole list of what to show
        this.regenerateItemList();
    }

    onLayerImmediateSelection(event: LayerVisibilityChange): void
    {
        this.onLayerVisibilityChange(event);
    }

    onLayerVisibilityChange(event: LayerVisibilityChange): void
    {
        // We handle this by saving the ID in our list of "active" ids, if it's marked visible...
        // if(event.visible)
        // {
        //     if(this.data.singleSelection)
        //     {
        //         this._activeIDs.clear();
        //     }
        //     this._activeIDs.add(event.layerID);
        // }
        // else
        // {
        //     this._activeIDs.delete(event.layerID);
        // }

        this.regenerateItemList();
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

        if(!changedText.startsWith(LUA_MARKER))
        {
            return LUA_MARKER + changedText;
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

    convertToLua(): void
    {
        let transpiler = new LuaTranspiler();
        let luaExpression = transpiler.transpile(this.editExpression);

        this.editExpression = luaExpression;
        if(this.updateText)
        {
            this.isLua = true;
            this.updateText(luaExpression);
        }
    }

    changeExpression(updateText: ((text: string) => void)): void
    {
        this.updateText = updateText;
    }

    onTextSelect(textSelection: TextSelection): void
    {
        this.activeTextSelection = textSelection;
    }

    get textHighlighted(): string
    {
        return this.activeTextSelection?.text;
    }

    get moduleSidebarTooltip(): string
    {
        let tooltip = this.isSidebarOpen ? "Close Modules Sidebar" : "Open Modules Sidebar";
        return tooltip + (this.isWindows ? " (Ctrl+B)" : " (Cmd+B)");
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
        if(!text.startsWith(LUA_MARKER))
        {
            return LUA_MARKER + text;
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
            if(event.key === "Meta" || event.key === "Control")
            {
                this._keyPresses["Meta"] = false;
                this._keyPresses["Control"] = false;
                this._keyPresses["Enter"] = false;
            }
            this._keyPresses[event.key] = false;
        }
        else if((this._keyPresses["Meta"] && this._keyPresses["s"]) || (this._keyPresses["Control"] && this._keyPresses["s"]))
        {
            this.onSave();
            this._keyPresses[event.key] = false;
            if(event.key === "Meta" || event.key === "Control")
            {
                this._keyPresses["Meta"] = false;
                this._keyPresses["Control"] = false;
                this._keyPresses["s"] = false;
            }
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();
        }
        else if((this._keyPresses["Meta"] && this._keyPresses["b"]) || (this._keyPresses["Control"] && this._keyPresses["b"]))
        {
            this.onToggleSidebar();
            this._keyPresses[event.key] = false;
            if(event.key === "Meta" || event.key === "Control")
            {
                this._keyPresses["Meta"] = false;
                this._keyPresses["Control"] = false;
                this._keyPresses["b"] = false;
            }
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
