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
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ReplaySubject, Subject, Subscription, combineLatest, of, timer } from "rxjs";
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
import { DataExpression, DataExpressionId, ModuleReference } from "src/app/models/Expression";
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
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DataModuleService, DataModuleSpecificVersionWire, DataModuleVersionSourceWire } from "src/app/services/data-module.service";
import { ModuleReleaseDialogComponent, ModuleReleaseDialogData } from "src/app/UI/module-release-dialog/module-release-dialog.component";


export class EditorConfig
{
    private _modules: DataExpressionModule[] = [];
    public isSaveableOutput: boolean = true;

    constructor(
        public expression: DataExpression = null,
        public userID: string = "",
        public editMode: boolean = true,
        public isCodeChanged: boolean = false,
        public isExpressionSaved: boolean = true,
        public isModule: boolean = false,
        public isHeaderOpen: boolean = false,
        public useAutocomplete: boolean = false,
        public version: DataModuleVersionSourceWire = null,
        public versions: Map<string, DataModuleVersionSourceWire> = null,
    ){}

    get isLua(): boolean
    {
        return this.expression?.sourceLanguage === EXPR_LANGUAGE_LUA;
    }

    set isLua(value: boolean)
    {
        if(this.expression)
        {
            this.expression.sourceLanguage = value ? EXPR_LANGUAGE_LUA : EXPR_LANGUAGE_PIXLANG;
        }
    }

    get isSharedByOtherUser(): boolean
    {
        return this.expression?.shared && this.expression?.creator?.user_id !== this.userID;
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
        return this.emptyName || this.emptySourceCode || !this.isSaveableOutput;
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
        return this._modules;
    }

    set modules(modules: DataExpressionModule[])
    {
        this._modules = modules;
        this.isExpressionSaved = false;
    }

    onExpressionTextChanged(text: string): void
    {
        this.isSaveableOutput = true;
        this.editExpression = text;
    }

    onNameChange(name: string): void
    {
        this.name = name;
    }

    onDescriptionChange(description: string): void
    {
        this.comments = description;
    }

    onTagSelectionChanged(tags): void
    {
        this.selectedTagIDs = tags;
    }

    onToggleHeader(): void
    {
        this.isHeaderOpen = !this.isHeaderOpen;
    }

    get majorMinorVersion(): string
    {
        if(!this.version?.version)
        {
            return "0.0";
        }

        let versionParts = this.version.version.split(".");
        return versionParts.slice(0, 2).join(".");
    }

    // TODO: Only show major/minor versions to users who don't own the module
    get versionList(): DataModuleVersionSourceWire[]
    {
        if(!this.isModule || !this.versions)
        {
            return [];
        }

        return Array.from(this.versions.values());
    }

    get latestVersion(): DataModuleVersionSourceWire
    {
        if(!this.isModule || !this.version?.version || !this.versionList.length)
        {
            return null;
        }

        let latestVersion = this.versionList[0];
        this.versionList.forEach(version =>
        {
            if(!version?.version || !version.version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/))
            {
                return;
            }

            let [latestMajor, latestMinor, latestPatch] = latestVersion.version.split(".").map(version => parseInt(version));
            let [major, minor, patch] = version.version.split(".").map(version => parseInt(version));
            if(
                major > latestMajor || 
                (major === latestMajor && minor > latestMinor) || 
                (major === latestMajor && minor === latestMinor && patch > latestPatch)
            )
            {
                latestVersion = version;
            }
        });

        return latestVersion;
    }

    get isLoadedVersionLatest(): boolean
    {
        let latestVersion = this.latestVersion?.version;
        return latestVersion && latestVersion === this.version?.version;
    }

    get isLatestVersionReleased(): boolean
    {
        let latestVersion = this.latestVersion?.version;
        return latestVersion && latestVersion.endsWith(".0");
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

    public openModules: Record<string, DataModuleSpecificVersionWire> = {};

    public isSplitScreen = false;
    
    public topEditor: EditorConfig = new EditorConfig();
    public bottomEditor: EditorConfig = new EditorConfig();

    public isTopEditorActive = false;
    public lastRunEditor: "top" | "bottom" = null;

    public activeTextSelection: TextSelection = null;
    public executedTextSelection: TextSelection = null;
    public isSubsetExpression: boolean = false;

    public evaluatedExpression: RegionDataResultItem;
    public stdout: string = "";
    public stderr: string = "";
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
        private _moduleService: DataModuleService,
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

        combineLatest([this._expressionService.expressionsUpdated$, this._moduleService.modulesUpdated$]).subscribe(() =>
        {
            if(this._fetchedExpression)
            {
                return;
            }

            this.sidebarTopSections["modules"].items = this._moduleService.getModules().map((module) =>
            {
                let latestVersion = Array.from(module.versions.values()).pop();
                return new DataExpression(
                    module.id,
                    module.name,
                    latestVersion.sourceCode,
                    EXPR_LANGUAGE_LUA,
                    module.comments,
                    module.origin.shared,
                    module.origin.creator,
                    module.origin.create_unix_time_sec,
                    latestVersion.mod_unix_time_sec,
                    latestVersion.tags,
                    [],
                    null
                );
            });

            this.resetEditors();
        });
    }

    makeInstalledModulesGroup(items: DataExpression[] = []): CustomExpressionGroup
    {
        return {
            type: "installed-modules-header",
            childType: "module",
            label: "Installed Modules",
            items,
            emptyMessage: "No modules are installed.",
        };
    }

    loadInstalledModules(position: string = "top"): void
    {
        let editor = position === "top" ? this.topEditor : this.bottomEditor;

        let installedModules = editor.expression.moduleReferences.map((moduleRef) =>
        {
            let existingModule = this.openModules[`${moduleRef.moduleID}-${moduleRef.version}`];
            if(existingModule)
            {
                return of(existingModule);
            }
            else
            {
                return this._moduleService.getModule(moduleRef.moduleID, moduleRef.version);
            }
        });

        if(installedModules.length > 0)
        {
            combineLatest(installedModules).subscribe((modules) =>
            {
                let installedModuleExpressions = [];
                editor.modules = [];
                modules.forEach((module) => 
                {
                    let sourceModule = this._moduleService.getSourceDataModule(module.id);
                    editor.modules.push(new DataExpressionModule(module.id, module.name, module.comments, module.version.version, module.origin.creator, Array.from(sourceModule.versions.keys())));
                    installedModuleExpressions.push(this.convertModuleToExpression(module));
                    this.openModules[`${module.id}-${module.version}`] = module;
                });

                this.sidebarTopSections["installed-modules"] = this.makeInstalledModulesGroup(installedModuleExpressions);
                this.regenerateItemList();
            });
        }
        else
        {
            editor.modules = [];
            this.sidebarTopSections["installed-modules"] = this.makeInstalledModulesGroup();
            this.regenerateItemList();
        }
    }

    setTopEditorActive(): void
    {
        this.isTopEditorActive = true;
    }

    setBottomEditorActive(): void
    {
        this.isTopEditorActive = false;
    }

    resetEditors(): void
    {
        this._expressionID = this._route.snapshot.params["expression_id"];
        let version = this._route.snapshot.queryParams["version"];

        this.topEditor = new EditorConfig();
        this.topEditor.userID = this._authService.getUserID();
        this.topEditor.isModule = !!version;
        if(this.topEditor.isModule)
        {
            this.topEditor.versions = this._moduleService.getSourceDataModule(this._expressionID).versions;
        }

        this.bottomEditor = new EditorConfig();
        this.bottomEditor.userID = this._authService.getUserID();

        this._newExpression = DataExpressionId.isPredefinedNewID(this._expressionID);
        if(this._newExpression)
        {
            this.topEditor.isModule = this._expressionID === DataExpressionId.NewModule;
        }

        // If we're creating a new expression or module, create a blank expression first
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

            this.sidebarTopSections["currently-open"].childType = this.topEditor.isModule ? "module" : "expression";
            this.sidebarTopSections["currently-open"].items = [];
            if(this.topEditor.isModule)
            {
                if(this.sidebarTopSections["installed-modules"])
                {
                    delete this.sidebarTopSections["installed-modules"];
                }
            }
            else
            {
                this.sidebarTopSections["installed-modules"] = this.makeInstalledModulesGroup();
            }
            this._fetchedExpression = true;
            this.regenerateItemList();
        }
        else
        {
            // Check to make sure this is an expression and not a module
            if(!this.topEditor.isModule)
            {
                this._expressionService.getExpressionAsync(this._expressionID).subscribe((expression) =>
                {
                    if(!expression)
                    {
                        console.error(`Empty expression: ${this._expressionID}`);
                        this.regenerateItemList();
                        return;
                    }

                    this.topEditor.expression = expression.copy();
                    this.topEditor.isLua = expression.sourceLanguage === EXPR_LANGUAGE_LUA;

                    this._fetchedExpression = true;

                    // Add the current expression to the currently-open list
                    this.sidebarTopSections["currently-open"].childType = "expression";
                    this.sidebarTopSections["currently-open"].items = [
                        this.topEditor.expression
                    ];

                    this.loadInstalledModules();
                    this.regenerateItemList();
                    setTimeout(() =>
                    {
                        this.runExpression(true, true);
                    }, 5000);
                },
                (error) =>
                {
                    console.error(`Failed to fetch expression: ${this._expressionID}`, error);
                    this.regenerateItemList();
                });
            }
            else
            {
                this._moduleService.getModule(this._expressionID, version).subscribe((module) =>
                {
                    if(!module)
                    {
                        console.error(`Empty module: ${this._expressionID}`);
                        this.regenerateItemList();
                        return;
                    }

                    this.topEditor.version = module.version;
                    this.topEditor.expression = this.convertModuleToExpression(module);

                    this._fetchedExpression = true;

                    this.sidebarTopSections["currently-open"].childType = "module";
                    this.sidebarTopSections["currently-open"].items = [
                        this.topEditor.expression
                    ];

                    if(this.sidebarTopSections["installed-modules"])
                    {
                        delete this.sidebarTopSections["installed-modules"];
                    }

                    this.regenerateItemList();
                },
                (error) =>
                {
                    console.error(`Failed to fetch module: ${this._expressionID}`, error);
                    this.regenerateItemList();
                });
            }
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

    convertModuleToExpression(module: DataModuleSpecificVersionWire): DataExpression
    {
        return new DataExpression(
            module.id,
            module.name,
            module.version.sourceCode,
            EXPR_LANGUAGE_LUA,
            module.comments,
            module.origin.shared,
            module.origin.creator,
            module.origin.create_unix_time_sec,
            module.version.mod_unix_time_sec,
            module.version.tags,
            [],
            null
        );
    }

    onModuleChange(modules: DataExpressionModule[], position: string = "top"): void
    {
        let editor = position === "top" ? this.topEditor : this.bottomEditor;
        editor.expression.moduleReferences = modules.map((module) => new ModuleReference(module.id, module.version));
        this.loadInstalledModules();
    }

    onOpenSplitScreen({id, version}: {id: string; version: string;}): void
    {
        if(this.bottomEditor?.expression && this.bottomEditor.expression.id === id && this.bottomEditor.version.version === version)
        {
            // Don't reopen the same module
            return;
        }

        if(this.topEditor?.expression && this.topEditor.expression.id === id && this.topEditor.version.version === version)
        {
            // Don't open the same module twice
            return;
        }

        this.onModuleVersionChange(version, "bottom", id, true);
    }

    onModuleVersionChange(version: string, position: string = "top", id: string = "", showSplit: boolean = false): void
    {
        let editor = position === "top" ? this.topEditor : this.bottomEditor;
        id = id && id.length > 0 ? id : editor.expression.id;

        this._moduleService.getModule(id, version).subscribe((module) =>
        {
            editor.expression = this.convertModuleToExpression(module);
            editor.version = module.version;

            if(editor.expression)
            {
                // This is a hack to remove code mirrors internal cached copy of the code and replace with the new code
                // by re-rendering the text editor component
                editor.expression = null;
                setTimeout(() =>
                {
                    editor = new EditorConfig();
                    editor.userID = this._authService.getUserID();
                    editor.isModule = true;
                    editor.expression = this.convertModuleToExpression(module);
                    editor.version = module.version;
                    editor.versions = this._moduleService.getSourceDataModule(id).versions;
                    if(showSplit)
                    {
                        this.isSplitScreen = true;
                    }

                    if(position === "top")
                    {
                        this.topEditor = editor;
                        this._router.navigate(["dataset", this._datasetID, "code-editor", module.id], {queryParams: {version: module.version.version}});
                    }
                    else
                    {
                        this.bottomEditor = editor;
                    }

                    this.updateCurrentlyOpenList(true);
                }, 1);
            }
            else
            {
                editor = new EditorConfig();
                editor.userID = this._authService.getUserID();
                editor.isModule = true;
                editor.expression = this.convertModuleToExpression(module);
                editor.version = module.version;
                editor.versions = this._moduleService.getSourceDataModule(id).versions;
                if(showSplit)
                {
                    this.isSplitScreen = true;
                }

                if(position === "top")
                {
                    this.topEditor = editor;
                    this._router.navigate(["dataset", this._datasetID, "code-editor", module.id], {queryParams: {version: module.version.version}});
                }
                else
                {
                    this.bottomEditor = editor;
                }

                this.updateCurrentlyOpenList(true);
            }
        },
        (error) =>
        {
            alert(`Failed to fetch module: ${id} v${version}`);
            console.error(`Failed to fetch module: ${id} v${version}`, error);
        }
        );
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
        this._layoutService.resizeCanvas$.next();
    }

    onToggleSplitScreen(): void
    {
        if(!this.bottomEditor.expression && !this.isSplitScreen && this.topEditor.modules.length > 0)
        {
            let firstInstalledModule = this.topEditor.modules[0];
            this.onOpenSplitScreen({id: firstInstalledModule.id, version: firstInstalledModule.version});
        }
        else
        {
            if(this.isSplitScreen && this.bottomEditor.expression && this.bottomEditor.isExpressionSaved && this.topEditor.modules.length === 0)
            {
                this.bottomEditor = new EditorConfig();
            }
            this.isSplitScreen = !this.isSplitScreen;

            if(this.isSplitScreen)
            {
                this.updateCurrentlyOpenList(true);
            }
        }

        // If we're not in split screen, make sure the top editor is active and the currently open list is updated
        if(!this.isSplitScreen)
        {
            this.setTopEditorActive();
            this.updateCurrentlyOpenList(false);
        }
    }

    updateCurrentlyOpenList(includeBottomExpression: boolean = false): void
    {
        this.sidebarTopSections["currently-open"].items = includeBottomExpression ? [
            this.topEditor.expression,
            this.bottomEditor.expression
        ] : [
            this.topEditor.expression
        ];

        this.regenerateItemList();
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
                            // this.runExpression();
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

    private get _activeIDs(): Set<string>
    {
        let references = this.topEditor?.expression?.moduleReferences || [];
        return new Set(references.map((ref) => ref.moduleID));
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
                let layer = new LocationDataLayerPropertiesWithVisibility(source?.id, source?.name, source?.id, source);
                layer.visible = (this._activeIDs.has(source?.id));
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
        if(this.topEditor.isModule)
        {
            // We don't allow modules to have installed modules
            return;
        }

        if(event.visible)
        {
            let latestVersion = this._moduleService.getLatestCachedModuleVersion(event.layerID);
            this.topEditor.expression.moduleReferences.push(new ModuleReference(event.layerID, latestVersion.version));
        }
        else
        {
            this.topEditor.expression.moduleReferences = this.topEditor.expression.moduleReferences.filter((ref) => ref.moduleID !== event.layerID);
        }

        this.topEditor.isExpressionSaved = false;
        this.loadInstalledModules();
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
            comp.instance.previewExpressionIDs = [this.previewID];

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

        this._expressionService.removeFromCache(this.previewID);
        this._router.navigate(["dataset", this._datasetID, "analysis"]);
    }

    get previewID(): string
    {
        return DataExpressionId.UnsavedExpressionPrefix+this._expressionID;
    }

    runExpression(runTop: boolean = true, forceRun: boolean = false): void
    {
        if(!this.isRunable && !forceRun)
        {
            return;
        }

        this.lastRunEditor = runTop ? "top" : "bottom";
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
                editor.expression.moduleReferences,
                null,
            );
            this._widgetDataService.runAsyncExpression(
                new DataSourceParams(this._expressionID, PredefinedROIID.AllPoints, this._datasetID),
                expression,
                true
            ).subscribe(
                (result: RegionDataResultItem)=>
                {
                    this.evaluatedExpression = result;
                    this.stdout = result.exprResult.stdout;
                    this.stderr = result.exprResult.stderr;

                    editor.isSaveableOutput = editor.isModule || result.isPMCTable;
                    if(this.evaluatedExpression && (!result.isPMCTable || this.evaluatedExpression?.values?.values?.length > 0))
                    {
                        editor.isCodeChanged = false;
                        this.displayExpressionTitle = `Unsaved ${expression.name}`;
                        this._expressionService.cache(this.previewID, expression, this.displayExpressionTitle);
                    }
                },
                (err)=>
                {
                    this.evaluatedExpression = null;
                    this.stderr = `${err}`;
                    editor.isSaveableOutput = false;
                }
            );
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
        this.lastRunEditor = null;
        if(this.executedTextSelection)
        {
            this.executedTextSelection.clearMarkedText();
        }

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
            true
        ).subscribe(
            (result: RegionDataResultItem)=>
            {
                this.evaluatedExpression = result;
                this.stdout = result.exprResult.stdout;
                this.stderr = result.exprResult.stderr;

                // TODO: Use these somewhere in the UI
                //result.exprResult.runtimeMs;
                //result.exprResult.dataRequired;
            },
            (err)=>
            {
                this.evaluatedExpression = null;
                this.stderr = `${err}`;
            }
        );

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
        
        this.displayExpressionTitle = `Unsaved ${this.topEditor.expression.name} (Line${isMultiLine ? "s": ""} ${lineRange})`;
        this._expressionService.cache(this.previewID, highlightedExpression, this.displayExpressionTitle);

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

    get isNewID(): boolean
    {
        return this._newExpression;
    }

    get isRunable(): boolean
    {
        let otherEditorActive = this.isTopEditorActive && this.lastRunEditor !== "top" || !this.isTopEditorActive && this.lastRunEditor !== "bottom";
        let isCodeChanged = this.isTopEditorActive ? this.topEditor.isCodeChanged : this.bottomEditor.isCodeChanged;
        return otherEditorActive || isCodeChanged || !this.isEvaluatedDataValid;
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
        if(this.topEditor.isModule)
        {
            return "Cannot splitscreen from module editor";
        }

        let tooltip = "Toggle between single and splitscreen view";
        tooltip += this.isWindows ? " (Ctrl+\\)" : " (Cmd+\\)";
        return this.topEditor.modules.length > 0 ? tooltip : `${tooltip}\nCannot splitscreen with no installed modules`;
    }

    get moduleSidebarTooltip(): string
    {
        let tooltip = this.isSidebarOpen ? "Close Modules Sidebar" : "Open Modules Sidebar";
        return tooltip + (this.isWindows ? " (Ctrl+B)" : " (Cmd+B)");
    }

    get saveModuleTooltip(): string
    {
        let saveTooltip = this.isWindows ? "Save Module (Ctrl+S)" : "Save Module (Cmd+S)";

        if(this.topEditor.invalidExpression && this.topEditor.isModule)
        {
            saveTooltip += `\n${this.isSplitScreen ? "Top Editor " : ""}Error: ${this.topEditor.errorTooltip}`;
        }
        if(this.isSplitScreen && this.bottomEditor.invalidExpression && this.bottomEditor.isModule)
        {
            saveTooltip += `\nBottom Editor Error: ${this.bottomEditor.errorTooltip}`;
        }

        return saveTooltip;
    }

    get saveExpressionTooltip(): string
    {
        let saveTooltip = this.isWindows ? "Save Expression (Ctrl+S)" : "Save Expression (Cmd+S)";

        if(this.topEditor.invalidExpression && !this.topEditor.isModule)
        {
            saveTooltip += `\n${this.isSplitScreen ? "Top Editor " : ""}Error: ${this.topEditor.errorTooltip}`;
        }
        if(this.isSplitScreen && this.bottomEditor.invalidExpression && !this.bottomEditor.isModule)
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
        let targetText = this.textHighlighted === "" ? "Code Until Line" : "Selected Code";
        return this.isWindows ? `Run ${targetText} (Ctrl+Alt+Enter)` : `Run ${targetText} (Cmd+Option+Enter)`;
    }

    get releaseModuleTooltip(): string
    {
        return "Open Release Module Dialog";
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

    get hasVisibleModule(): boolean
    {
        return this.topEditor.isModule || this.bottomEditor.isModule;
    }

    get visibleModuleCodeEditor(): EditorConfig
    {
        return this.hasVisibleModule ? this.topEditor.isModule ? this.topEditor : this.bottomEditor : null;
    }

    get isVisibleModuleEditable(): boolean
    {
        return this.visibleModuleCodeEditor?.editable && !this.visibleModuleCodeEditor.invalidExpression;
    }

    get isEvaluatedDataValid(): boolean
    {
        let values = this.evaluatedExpression?.values;
        return typeof values !== "undefined" && values !== null && (!Array.isArray(values?.values) || values.values.length > 0);
    }

    get runtimeSeconds(): string
    {
        let msTime = this.evaluatedExpression?.exprResult?.runtimeMs;
        return msTime && this.isEvaluatedDataValid ? Number(msTime / 1000).toPrecision(2) : "";
    }

    onTogglePMCDataGridSolo(isSolo: boolean): void
    {
        this.isPMCDataGridSolo = isSolo;
    }

    onConfirmNewModuleName(): void
    {
        let moduleName = this.topEditor.expression.name;
        this.topEditor.expression.sourceCode = `
        -- Modules must all start like this:
        ${moduleName} = {}

        ---- START EXAMPLE CODE (feel free to delete) ----

        -- A module can contain constants like so:
        ${moduleName}.ExampleConstant = 3.1415926

        -- A module can also contain functions. This can be called from an expression like: 
        --  ${moduleName}.ExampleFunction(1, 2)
        -- it would return 3
        function ${moduleName}.ExampleFunction(a, b)
            return a+b
        end

        ---- END EXAMPLE CODE ----------------------------

        -- Modules must return themselves as their last line
        return ${moduleName}
        `.replace(/ {8,}/g, "").trim();
        this.onSave(true);
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
            if(editor.isModule)
            {
                this._moduleService.addModule(
                    editor.expression.name,
                    editor.expression.sourceCode,
                    editor.expression.comments,
                    editor.expression.tags
                ).subscribe((newModule: DataModuleSpecificVersionWire) =>
                {
                    if(!newModule)
                    {
                        // An error occurred and the module wasn't saved
                        console.error("Error saving module", editor);
                        alert(`Error saving module ${editor.expression.name}}`);
                        return;
                    }
                    this._newExpression = false;
                    this._expressionID = newModule.id;

                    // Treat module as expression so we can visualize it in the same way
                    editor.expression = new DataExpression(
                        this._expressionID,
                        newModule.name,
                        editor.expression.sourceCode,
                        EXPR_LANGUAGE_LUA,
                        newModule.comments,
                        newModule.origin.shared,
                        newModule.origin.creator,
                        newModule.origin.create_unix_time_sec,
                        newModule.origin.mod_unix_time_sec,
                        editor.expression.tags,
                        [],
                        null
                    );

                    editor.version = newModule.version;
                    editor.versions = new Map([[newModule.version.version, newModule.version]]);

                    editor.isCodeChanged = false;
                    editor.isExpressionSaved = true;
                    this._router.navigate(["dataset", this._datasetID, "code-editor", this._expressionID], { queryParams: { version: editor.version.version } });
                });
            }
            else
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
        }
        else
        {
            if(editor.isModule)
            {
                this._moduleService.savePatchVersion(
                    editor.expression.id,
                    editor.expression.sourceCode,
                    editor.expression.comments,
                    editor.expression.tags
                ).subscribe((newModule: DataModuleSpecificVersionWire) =>
                {
                    if(!newModule)
                    {
                        // An error occurred and the module wasn't saved
                        console.error("Error saving module", editor);
                        alert(`Error saving module ${editor.expression.name}}`);
                        return;
                    }
                    editor.version = newModule.version;
                    editor.versions.set(newModule.version.version, newModule.version);
                    editor.isCodeChanged = false;
                    editor.isExpressionSaved = true;
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
                    editor.expression.tags,
                    editor.expression.moduleReferences
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
    }

    onRelease(): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.panelClass = "panel";

        let id = this.visibleModuleCodeEditor?.expression?.id;
        let title = this.visibleModuleCodeEditor.expression?.name;
        let version = this.visibleModuleCodeEditor?.version?.version;
        if(!id || !title || !version)
        {
            console.error("Failed to release module", title, version, id);
            alert("Failed to release module");
            return;
        }

        dialogConfig.data = new ModuleReleaseDialogData(
            id,
            title,
            version,
            this.visibleModuleCodeEditor.editExpression,
            this.visibleModuleCodeEditor.expression.tags
        );

        let dialogRef = this.dialog.open(ModuleReleaseDialogComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((result: DataModuleSpecificVersionWire) =>
        {
            let convertedModule = this.convertModuleToExpression(result);
            this.visibleModuleCodeEditor.expression = convertedModule;
            this.visibleModuleCodeEditor.version = result.version;
            let moduleID = this.visibleModuleCodeEditor.expression.id;
            if(this.topEditor.isModule)
            {
                this._router.navigate(["dataset", this._datasetID, "code-editor", moduleID], {queryParams: {version: result.version.version}});
            }
            console.log("Module release dialog closed", result, convertedModule, this.topEditor.expression);
        });
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
        else if((this._keyPresses["Meta"] && this._keyPresses["\\"]) || (this._keyPresses["Control"] && this._keyPresses["\\"]))
        {
            this.onToggleSplitScreen();
            this._keyPresses[event.key] = false;
            if(event.key === "Meta" || event.key === "Control")
            {
                this._keyPresses["Meta"] = false;
                this._keyPresses["Control"] = false;
                this._keyPresses["\\"] = false;
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

    onExportLuaCode()
    {
        let expr = this?.topEditor?.expression;
        if(!expr)
        {
            return; // should we show an alert or something?
        }

        this._widgetDataService.exportExpressionCode(expr).subscribe(
            (exportData: Blob)=>
            {
                saveAs(exportData, expr.name+".zip");
            }
        );
    }
}
