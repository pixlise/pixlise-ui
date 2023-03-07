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
import { DataExpressionService, DataExpressionWire } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSourceParams, RegionDataResultItem, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";
import { DataExpressionModule, TextSelection } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
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
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";

export class EditorConfig
{
    constructor(
        public expression: DataExpression = null,
        public userID: string = "",
        public editMode: boolean = true,
        public isCodeChanged: boolean = false,
        public isExpressionSaved: boolean = true,
        public isModule: boolean = false,
        public isHeaderOpen: boolean = false,
        public useAutocomplete: boolean = false,
        public isLua: boolean = true,
    ){}

    get isSharedByOtherUser(): boolean
    {
        return this.expression?.shared && this.expression.creator.user_id !== this.userID;
    }

    get emptyName(): boolean
    {
        return !this.expression?.name || this.expression.name === "";
    }

    get emptySourceCode(): boolean
    {
        return !this.expression?.sourceCode || this.expression.sourceCode === "";
    }

    get invalidExpression(): boolean
    {
        return this.emptyName || this.emptySourceCode;
    }

    get errorTooltip(): string
    {
        if(this.emptyName)
        {
            return "Name cannot be empty";
        }
        else if(this.emptySourceCode)
        {
            return "Source code cannot be empty";
        }
        else if(this.name.match(/[^a-zA-Z0-9_]/))
        {
            return "Name must be alphanumeric and cannot contain special characters";
        }
        else if(this.name.match(/^[0-9]/))
        {
            return "Name cannot start with a number";
        }
        else if(this.name.match(/\s/))
        {
            return "Name cannot contain spaces";
        }
        else
        {
            return "";
        }
    }

    get editable(): boolean
    {
        return this.editMode && !this.isSharedByOtherUser;
    }

    get editExpression(): string
    {
        return this.expression?.sourceCode || "";
    }

    set editExpression(val: string)
    {
        if(this.expression)
        {
            this.expression.sourceCode = val;
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

    get name(): string
    {
        return this.expression?.name || "";
    }

    set name(name: string)
    {
        if(this.expression)
        {
            this.expression.name = name;
            this.isExpressionSaved = false;
        }
    }

    get comments(): string
    {
        return this.expression?.comments || "";
    }

    set comments(comments: string)
    {
        if(this.expression)
        {
            this.expression.comments = comments;
            this.isExpressionSaved = false;
        }
    }

    get modules(): DataExpressionModule[]
    {
        if(!this.expression || !this.expression.moduleReferences)
        {
            return [];
        }

        return this.expression.moduleReferences.map(ref =>
        {
            return new DataExpressionModule(ref.moduleID, "", ref.version);
        });
    }

    onExpressionTextChanged(text: string): void
    {
        this.editExpression = text;
    }

    onTagSelectionChanged(tags): void
    {
        this.selectedTagIDs = tags;
    }

    onToggleHeader(): void
    {
        this.isHeaderOpen = !this.isHeaderOpen;
    }
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
    
    public topEditor: EditorConfig = new EditorConfig();
    public bottomEditor: EditorConfig = new EditorConfig();

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

    private _newExpression: boolean = false;

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
        this.topEditor.userID = this._authService.getUserID();
        this.bottomEditor.userID = this._authService.getUserID();

        this._listBuilder = new ExpressionListBuilder(true, ["%"], false, false, false, false, this._expressionService);
        this._datasetID = this._route.snapshot.parent?.params["dataset_id"];
        this._expressionID = this._route.snapshot.params["expression_id"];
        this._expressionService.expressionsUpdated$.subscribe(() =>
        {
            if(this._fetchedExpression)
            {
                return;
            }

            this.resetEditors();
            // this._newExpression = this._expressionID === "create";

            // // If we're creating a new expression, create a blank one
            // if(this._newExpression)
            // {
            //     this.topEditor.expression = new DataExpression(
            //         "",
            //         "",
            //         "",
            //         EXPR_LANGUAGE_LUA,
            //         "",
            //         false,
            //         new ObjectCreator("", "", ""),
            //         0,
            //         0,
            //         [],
            //         [],
            //         null
            //     );

            //     this._fetchedExpression = true;
            //     return;
            // }

            // this._expressionService.getExpressionAsync(this._expressionID).subscribe(expression =>
            // {
            //     this.topEditor.isLua = expression?.sourceLanguage === EXPR_LANGUAGE_LUA;

            //     this.topEditor.expression = new DataExpression(
            //         expression.id,
            //         expression.name,
            //         expression.sourceCode,
            //         expression.sourceLanguage,
            //         expression.comments,
            //         expression.shared,
            //         expression.creator,
            //         expression.createUnixTimeSec,
            //         expression.modUnixTimeSec,
            //         expression.tags,
            //         expression.moduleReferences,
            //         expression.recentExecStats,
            //     );

            //     // this.bottomEditor.expression = this.topEditor.expression;

            //     this._fetchedExpression = true;
            //     this.runExpression();

            //     // Add the current expression to the currently-open list
            //     this.sidebarTopSections["currently-open"].items = [
            //         this.topEditor.expression
            //     ];

            //     // this.topModules = [
            //     //     new DataExpressionModule("test", "description", "3.7", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            //     //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            //     //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            //     //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            //     //     new DataExpressionModule("testing", "description", "3.1", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
            //     // ];

            //     let all$ = makeDataForExpressionList(
            //         this._datasetService,
            //         this._widgetDataService,
            //         this._expressionService,
            //         null
            //     );
            //     this._subs.add(all$.subscribe(
            //         (data: unknown[])=>
            //         {
            //             this._listBuilder.notifyDataArrived(
            //                 (data[0] as DataSet).getPseudoIntensityElementsList(),
            //                 data[1] as QuantificationLayer,
            //                 this._expressionService.getExpressions(),
            //                 null
            //             );

            //             // All have arrived, the taps above would've saved their contents in a way that we like, so
            //             // now we can regenerate our item list
            //             this.regenerateItemList();
            //         }
            //     ));
            // });
        });
    }

    resetEditors(): void
    {
        this._expressionID = this._route.snapshot.params["expression_id"];

        this.topEditor = new EditorConfig();
        this.topEditor.userID = this._authService.getUserID();

        this.bottomEditor = new EditorConfig();
        this.bottomEditor.userID = this._authService.getUserID();

        this._newExpression = this._expressionID === "new-expression" || this._expressionID === "new-module";
        if(this._newExpression)
        {
            this.topEditor.isModule = this._expressionID === "new-module";
        }

        // If we're creating a new expression, create a blank one
        if(this._newExpression)
        {
            this.topEditor.expression = new DataExpression(
                "",
                "",
                "",
                EXPR_LANGUAGE_LUA,
                "",
                false,
                new ObjectCreator("", "", ""),
                0,
                0,
                [],
                [],
                null
            );

            this.sidebarTopSections["currently-open"].items = [];
            this._fetchedExpression = true;
        }
        else
        {
            this._expressionService.getExpressionAsync(this._expressionID).subscribe(expression =>
            {
                this.topEditor.isLua = expression?.sourceLanguage === EXPR_LANGUAGE_LUA;

                this.topEditor.expression = new DataExpression(
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
                    expression.recentExecStats,
                );

                this._fetchedExpression = true;
                this.runExpression();

                // Add the current expression to the currently-open list
                this.sidebarTopSections["currently-open"].items = [
                    this.topEditor.expression
                ];

                // this.topModules = [
                //     new DataExpressionModule("test", "description", "3.7", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                //     new DataExpressionModule("some_other_module", "description", "2.1", "author", ["2.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                //     new DataExpressionModule("testing", "description", "3.1", "author", ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]),
                // ];
            });
        }

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
                    this._expressionService.getExpressions(),
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
        let unsavedChanges = !this.topEditor.isExpressionSaved || (this.isSplitScreen && !this.bottomEditor.isExpressionSaved);
        if(unsavedChanges && !confirm("Are you sure you want to create a new expression? Any unsaved changes will be lost."))
        {
            return;
        }

        this._router.navigateByUrl("/", {skipLocationChange: true}).then(()=>
            this._router.navigate(["dataset", this._datasetID, "code-editor", "new-expression"])
        );
    }

    onAddModule(): void
    {
        let unsavedChanges = !this.topEditor.isExpressionSaved || (this.isSplitScreen && !this.bottomEditor.isExpressionSaved);
        if(unsavedChanges && !confirm("Are you sure you want to create a new expression? Any unsaved changes will be lost."))
        {
            return;
        }

        this._router.navigateByUrl("/", {skipLocationChange: true}).then(()=>
            this._router.navigate(["dataset", this._datasetID, "code-editor", "new-module"])
        );
    }

    onToggleSidebar(): void
    {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    onToggleSplitScreen(): void
    {
        this.isSplitScreen = !this.isSplitScreen;
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
        if(this.topEditor.editable)
        {
            this.topEditor.useAutocomplete = !this.topEditor.useAutocomplete;
        }
    }

    onClose(): void
    {
        let unsavedChanges = !this.topEditor.isExpressionSaved || (this.isSplitScreen && !this.bottomEditor.isExpressionSaved);
        if(unsavedChanges && !confirm("Are you sure you want to close this expression? Any unsaved changes will be lost."))
        {
            return;
        }
        this._router.navigate(["dataset", this._datasetID, "analysis"]);
    }

    runExpression(runTop: boolean = true): void
    {
        let editor = runTop ? this.topEditor : this.bottomEditor;
        if(this._expressionID && editor.expression)
        {
            let expressionText = editor.isLua ? this.addLuaHighlight(editor.expression.sourceCode) : editor.expression.sourceCode;
            let expression = new DataExpression(
                this._expressionID,
                editor.expression.name,
                expressionText,
                editor.expression.sourceLanguage,
                editor.expression.comments,
                editor.expression.shared,
                editor.expression.creator,
                editor.expression.createUnixTimeSec,
                editor.expression.modUnixTimeSec,
                editor.expression.tags,
                [],
                null,
            );
            this._widgetDataService.runAsyncExpression(
                new DataSourceParams(this._expressionID, PredefinedROIID.AllPoints, this._datasetID), expression, false
            ).toPromise().then((result)=>
            {
                this.evaluatedExpression = result;
                if(this.evaluatedExpression && this.evaluatedExpression?.values?.values.length > 0)
                {
                    editor.isCodeChanged = false;
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
        return changedText;
    }

    runHighlightedExpression(): void
    {
        // Highlighted expressions always use the top editor info so only 1 unsaved expression ID is injected into the cache
        let highlightedExpression = new DataExpression(
            this._expressionID,
            this.topEditor.expression.name,
            "",
            this.topEditor.expression.sourceLanguage,
            this.topEditor.expression.comments,
            this.topEditor.expression.shared,
            this.topEditor.expression.creator,
            this.topEditor.expression.createUnixTimeSec,
            this.topEditor.expression.modUnixTimeSec,
            this.topEditor.expression.tags,
            [],
            null
        );
        if(this.textHighlighted)
        {
            highlightedExpression.sourceCode = this.textHighlighted;
        }
        else if(this.isEmptySelection)
        {
            highlightedExpression.sourceCode = this.topEditor.expression.sourceCode.split("\n").slice(0, this.endLineHighlighted + 1).join("\n");
        }

        if(this.topEditor.isLua)
        {
            highlightedExpression.sourceCode = this.addLuaHighlight(highlightedExpression.sourceCode);
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
        this.displayExpressionTitle = `Unsaved ${this.topEditor.expression.name} (Line${isMultiLine ? "s": ""} ${lineRange})`;
        this._expressionService.cache(previewID, highlightedExpression, this.displayExpressionTitle);

        this.pmcGridExpressionTitle = `Numeric Values: Line${isMultiLine ? "s": ""} ${lineRange}`;
        this.isSubsetExpression = true;

        this.executedTextSelection = this.activeTextSelection;
        this.executedTextSelection.markText();
    }

    convertToLua(): void
    {
        // Bottom editor is always the lua editor
        let transpiler = new LuaTranspiler();
        let luaExpression = transpiler.transpile(this.topEditor.editExpression);
        this.topEditor.editExpression = luaExpression;

        if(this.updateText)
        {
            this.topEditor.isLua = true;
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

    get moduleNameTooltip(): string
    {
        return "Module Name Requirements:\n- Must be unique\n- Must be alphanumeric\n- Cannot contain spaces\n- Cannot contain special characters\n- Cannot start with a number";
    }

    get splitScreenTooltip(): string
    {
        let tooltip = "Toggle between a single editor and a splitscreen view";
        return this.topEditor.modules.length > 0 ? tooltip : `${tooltip}\nCannot splitscreen with no installed modules`;
    }

    get moduleSidebarTooltip(): string
    {
        let tooltip = this.isSidebarOpen ? "Close Modules Sidebar" : "Open Modules Sidebar";
        return tooltip + (this.isWindows ? " (Ctrl+B)" : " (Cmd+B)");
    }

    get saveExpressionTooltip(): string
    {
        let saveTooltip = this.isWindows ? "Save Expression (Ctrl+S)" : "Save Expression (Cmd+S)";

        if(this.topEditor.invalidExpression)
        {
            saveTooltip += `\n${this.isSplitScreen ? "Top Editor " : ""}Error: ${this.topEditor.errorTooltip}`;
        }
        if(this.isSplitScreen && this.bottomEditor.invalidExpression)
        {
            saveTooltip += `\nBottom Editor Error: ${this.bottomEditor.errorTooltip}`;
        }

        return saveTooltip;
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

    onTogglePMCDataGridSolo(isSolo: boolean): void
    {
        this.isPMCDataGridSolo = isSolo;
    }

    onSave(saveTop: boolean = true): void
    {
        let editor = saveTop ? this.topEditor : this.bottomEditor;
        if(editor.isExpressionSaved || !editor.editable || editor.invalidExpression)
        {
            // Nothing valid to save
            return;
        }

        // New expressions are always going to be on top
        if(this._newExpression && saveTop)
        {
            this._expressionService.add(
                editor.expression.name,
                editor.expression.sourceCode,
                editor.expression.sourceLanguage,
                editor.expression.comments,
                editor.expression.tags
            ).subscribe((newExpression: DataExpressionWire) =>
            {
                this._newExpression = false;
                this._expressionID = newExpression.id;
                editor.expression = new DataExpression(
                    this._expressionID,
                    newExpression.name,
                    newExpression.sourceCode,
                    newExpression.sourceLanguage,
                    newExpression.comments,
                    newExpression.shared,
                    newExpression.creator,
                    newExpression.create_unix_time_sec,
                    newExpression.mod_unix_time_sec,
                    newExpression.tags,
                    newExpression.moduleReferences || editor.expression.moduleReferences,
                    newExpression.recentExecStats || editor.expression.recentExecStats
                );
                editor.isCodeChanged = false;
                editor.isExpressionSaved = true;
                this._router.navigate(["dataset", this._datasetID, "code-editor", editor.expression.id]);
            });
        }
        else
        {
            this._expressionService.edit(
                editor.expression.id,
                editor.expression.name,
                editor.expression.sourceCode,
                editor.expression.sourceLanguage,
                editor.expression.comments,
                editor.expression.tags
            ).subscribe(
                ()=>
                {
                    editor.isCodeChanged = false;
                    editor.isExpressionSaved = true;
                },
                (err)=>
                {
                    console.error(`Failed to save expression ${editor.expression.name}`, err);
                    alert(`Failed to save expression ${editor.expression.name}: ${err?.message}`);
                }
            );
        }
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
