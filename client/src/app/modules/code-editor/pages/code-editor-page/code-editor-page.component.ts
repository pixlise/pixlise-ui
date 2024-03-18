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

import { Component, ElementRef, HostListener, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { DataQueryResult } from "src/app/expression-language/data-values";
import { DataExpression, ModuleReference } from "src/app/generated-protos/expressions";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";
import { SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { DataExpressionModule, TextSelection } from "../../components/expression-text-editor/expression-text-editor.component";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
import { SemanticVersion, VersionField } from "src/app/generated-protos/version";
import { ModuleReleaseDialogComponent, ModuleReleaseDialogData } from "../../components/module-release-dialog/module-release-dialog.component";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import EditorConfig, { LocalStorageMetadata } from "src/app/modules/code-editor/models/editor-config";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { WidgetType } from "src/app/modules/widget/models/widgets.model";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";

@Component({
  selector: "code-editor",
  templateUrl: "./code-editor-page.component.html",
  styleUrls: ["./code-editor-page.component.scss"],
})
export class CodeEditorPageComponent implements OnInit {
  @ViewChild("preview", { read: ViewContainerRef }) previewContainer: any;
  @ViewChild("newModuleDialogBtn") newModuleDialog!: ElementRef;

  private _subs = new Subscription();
  private _keyPresses: Set<string> = new Set<string>();

  private _id = "code-editor"; // Needed for widget-type subscriptions
  initPreviewWidgetType = "binary-plot";
  previewWidgetTypes: WidgetType[] = ["binary-plot", "ternary-plot", "context-image", "histogram", "chord-diagram"];

  previewLayoutConfig: WidgetLayoutConfiguration = WidgetLayoutConfiguration.create({ id: EditorConfig.previewWidgetId });

  isSidebarOpen: boolean = true;
  isSplitScreen: boolean = false;

  highlightedTop: boolean = true;
  highlightedSelection: TextSelection | null = null;

  scanId: string = "";
  quantId: string = "";

  topExpression: DataExpression | null = null;

  newModuleName: string = "";

  loadedModule: DataModule | null = null;
  loadedModuleVersion: DataModuleVersion | null = null;
  loadedModuleVersions: string[] = [];

  topModules: DataExpressionModule[] = [];
  topHeaderOpen: boolean = false;
  topExpressionChanged: boolean = false;

  isTopModule: boolean = false;

  linkedModuleID: string = "";

  bottomExpression: DataExpression | null = null;
  bottomExpressionChanged: boolean = false;

  public modules: DataModule[] = [];

  public isTopEditorActive = true;

  public isCurrentlyOpenSectionOpen = true;
  public isModulesSectionOpen = true;

  public queryParams: Record<string, string> = {};

  liveExpressionConfig: LiveExpression = {
    expressionId: "",
    scanId: "",
    quantId: "",
  };
  lastRunResult: DataQueryResult | null = null;

  public stdout: string = "";
  public stderr: string = "";

  public isPreviewWidgetSolo: boolean = false;
  public isExpressionConsoleSolo: boolean = false;

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _snackbarService: SnackbarService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _widgetDataService: WidgetDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    let scanId = this._route.snapshot.queryParams[EditorConfig.scanIdParam];
    if (scanId) {
      this.scanId = scanId;
    } else {
      this.scanId = this._analysisLayoutService.defaultScanId;
    }

    let quantId = this._route.snapshot.queryParams[EditorConfig.quantIdParam];
    if (quantId) {
      this.quantId = quantId;
    } else {
      this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
    }

    this._expressionsService.fetchExpressions();
    this._expressionsService.fetchModules();

    this._subs.add(
      this._analysisLayoutService.soloViewWidgetId$.subscribe(soloViewWidgetId => {
        this.isPreviewWidgetSolo = soloViewWidgetId === EditorConfig.previewWidgetId;
        if (this.isPreviewWidgetSolo) {
          this.isExpressionConsoleSolo = false;
        }

        this._analysisLayoutService.delayNotifyCanvasResize(1);
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        if (screenConfig) {
          this.scanId = this.scanId || this._analysisLayoutService.defaultScanId;
          if (!this.scanId && Object.keys(screenConfig.scanConfigurations).length > 0) {
            this.scanId = Object.keys(screenConfig.scanConfigurations)[0];
          }
          this.quantId = this.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId);
        }
      })
    );

    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.queryParams = { ...params };

        this.scanId = params[EditorConfig.scanIdParam] || this.scanId || "";
        if (!this.scanId) {
          this.scanId = this._analysisLayoutService.defaultScanId;
        }

        this.quantId = params[EditorConfig.quantIdParam] || this.quantId || "";
        if (!this.scanId) {
          this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
        }

        let topExpressionId = params[EditorConfig.topExpressionId];
        let topModuleId = params[EditorConfig.topModuleId];

        let isExpressionToModuleSwitch = (!this.isTopModule && topModuleId) || (this.isTopModule && topExpressionId);
        let isDifferentExpression = !this.isTopModule && topExpressionId !== this.topExpression?.id;
        let isDifferentModule = this.isTopModule && topModuleId !== this.loadedModule?.id;

        if (!this.topExpression || isExpressionToModuleSwitch || isDifferentExpression || isDifferentModule) {
          if (topExpressionId) {
            this.isTopModule = false;
            this._expressionsService.fetchExpression(topExpressionId);

            this.loadExpressionById(topExpressionId, false);

            if (!params[EditorConfig.bottomExpressionId]) {
              this.isSplitScreen = false;
            }
          } else if (topModuleId) {
            this.isSplitScreen = false;
            let version = params[EditorConfig.topModuleVersion] ? this.getSemanticVersionFromString(params[EditorConfig.topModuleVersion]) : null;
            this._expressionsService.fetchModuleVersion(topModuleId, version);
          } else {
            this.topExpression = null;
          }
        }

        if (params[EditorConfig.bottomExpressionId]) {
          let version = params[EditorConfig.bottomModuleVersion] ? this.getSemanticVersionFromString(params[EditorConfig.bottomModuleVersion]) : null;
          this._expressionsService.fetchModuleVersion(params[EditorConfig.bottomExpressionId], version);

          if (this.bottomExpression?.id !== params[EditorConfig.bottomExpressionId]) {
            this.isSplitScreen = true;
          }
        } else {
          this.bottomExpression = null;
        }

        this.updateLinkedModule();
      })
    );

    this._subs.add(
      this._expressionsService.expressions$.subscribe(expressions => {
        let topExpressionId = this.queryParams[EditorConfig.topExpressionId];
        if (this.isTopModule || (topExpressionId && topExpressionId !== ExpressionsService.NewExpressionId && this.topExpression)) {
          // If the top expression is a module or is already loaded, don't overwrite it
          return;
        } else if (topExpressionId === ExpressionsService.NewExpressionId && this._expressionsService.lastSavedExpressionId) {
          topExpressionId = this._expressionsService.lastSavedExpressionId;
          let queryParams = { ...this.queryParams, [EditorConfig.topExpressionId]: topExpressionId };
          this._router.navigate([], { queryParams });
        }

        if (topExpressionId) {
          this.topExpression = expressions[topExpressionId] || null;
          if (this.topExpression) {
            this.topExpression = DataExpression.create(this.topExpression);
          }

          // At this point, we're at first load, so restore from local storage
          let updated = this.loadStorageMetadata();

          // We don't have anything in the cache, so now we need to fetch the expression

          this.loadExpressionById(topExpressionId, updated);
        }
      })
    );

    this._subs.add(
      this._expressionsService.modules$.subscribe(modules => {
        this.modules = Object.values(modules);

        let topModuleId = this.queryParams[EditorConfig.topModuleId];
        let topModuleVersion = this.queryParams[EditorConfig.topModuleVersion];

        if (
          this.isTopModule &&
          topModuleId === this.topExpression?.id &&
          this.getVersionString(this.loadedModuleVersion?.version).length > 0 &&
          this.loadedModuleVersion?.sourceCode
        ) {
          // We already have everything loaded, so don't do anything
          return;
        } else if (topModuleId) {
          this.isTopModule = true;
          this.topModules = [];

          if (topModuleId === ExpressionsService.NewExpressionId && this._expressionsService.lastSavedExpressionId) {
            topModuleId = this._expressionsService.lastSavedExpressionId;
            if (!topModuleVersion) {
              topModuleVersion = this.getVersionString(modules[topModuleId].versions[0].version);
            }

            let queryParams = { ...this.queryParams, [EditorConfig.topModuleId]: topModuleId, [EditorConfig.topModuleVersion]: topModuleVersion };
            this._router.navigate([], { queryParams });
          }

          if (topModuleId) {
            let module = modules[topModuleId];
            if (!module) {
              return;
            }

            let moduleVersion: DataModuleVersion | undefined = undefined;
            if (topModuleVersion) {
              moduleVersion = module.versions.find(version => this.getVersionString(version.version) === topModuleVersion);
            } else {
              moduleVersion = module.versions[module.versions.length - 1];
            }
            if (moduleVersion) {
              this.loadedModule = module;
              this.loadedModuleVersion = moduleVersion;
              this.loadedModuleVersions = [];

              module.versions.forEach(version => {
                // Only show major/minor versions to users who don't own the module
                if (version.version?.patch !== 0 && !module.creator?.canEdit) {
                  return;
                }

                let versionString = this.getVersionString(version.version);
                this.loadedModuleVersions.push(versionString);
              });

              this.loadedModuleVersions.sort((a, b) => {
                let aVersion = this.getSemanticVersionFromString(a);
                let bVersion = this.getSemanticVersionFromString(b);

                if (bVersion.major !== aVersion.major) {
                  return bVersion.major - aVersion.major;
                } else if (bVersion.minor !== aVersion.minor) {
                  return bVersion.minor - aVersion.minor;
                } else {
                  return bVersion.patch - aVersion.patch;
                }
              });

              this.topExpression = DataExpression.create({
                id: module.id,
                name: module.name,
                sourceCode: moduleVersion.sourceCode,
                comments: moduleVersion.comments,
                sourceLanguage: EXPR_LANGUAGE_LUA,
                tags: moduleVersion.tags,
              });
              this.topExpressionChanged = false;
            }
          }
        } else {
          let bottomModuleId = this.queryParams[EditorConfig.bottomExpressionId];
          let bottomModuleVersion = this.queryParams[EditorConfig.bottomModuleVersion];

          if (
            bottomModuleId === this.bottomExpression?.id &&
            this.getVersionString(this.loadedModuleVersion?.version).length > 0 &&
            this.loadedModuleVersion?.sourceCode
          ) {
            // We already have everything loaded, so don't do anything
            return;
          }

          this.isTopModule = false;
          this.topModules = [];

          let module = modules[bottomModuleId];
          if (!module) {
            return;
          }

          let moduleVersion: DataModuleVersion | undefined = undefined;
          if (bottomModuleVersion) {
            moduleVersion = module.versions.find(version => this.getVersionString(version.version) === bottomModuleVersion);
          } else {
            moduleVersion = module.versions[module.versions.length - 1];
          }

          if (moduleVersion) {
            this.loadedModule = module;
            this.loadedModuleVersion = moduleVersion;
            this.loadedModuleVersions = [];

            module.versions.forEach(version => {
              // Only show major/minor versions to users who don't own the module
              if (version.version?.patch !== 0 && !module.creator?.canEdit) {
                return;
              }

              let versionString = this.getVersionString(version.version);
              this.loadedModuleVersions.push(versionString);
            });

            this.loadedModuleVersions.sort((a, b) => {
              let aVersion = this.getSemanticVersionFromString(a);
              let bVersion = this.getSemanticVersionFromString(b);

              if (bVersion.major !== aVersion.major) {
                return bVersion.major - aVersion.major;
              } else if (bVersion.minor !== aVersion.minor) {
                return bVersion.minor - aVersion.minor;
              } else {
                return bVersion.patch - aVersion.patch;
              }
            });

            this.bottomExpression = DataExpression.create({
              id: module.id,
              name: module.name,
              sourceCode: moduleVersion.sourceCode,
              comments: moduleVersion.comments,
              sourceLanguage: EXPR_LANGUAGE_LUA,
              tags: moduleVersion.tags,
            });
            this.bottomExpressionChanged = false;
          }
        }

        if (!this.isTopModule && this.topExpression) {
          this.topModules = [];

          this.topExpression.moduleReferences.forEach(moduleRef => {
            if (modules[moduleRef.moduleId]) {
              this.topModules.push(new DataExpressionModule(modules[moduleRef.moduleId], moduleRef));
            }
          });
        }

        this.updateLinkedModule();
      })
    );

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (!result || this._analysisLayoutService.highlightedWidgetId$.value !== this._id) {
          return;
        }

        if (result) {
          if (result.selectedExpressions?.length > 0) {
            this.clearExpressionQueryParams();
            let topExpressionId = result.selectedExpressions[0].id;
            let queryParams: Record<string, string> = { ...this.queryParams, [EditorConfig.topExpressionId]: topExpressionId };

            if (result.selectedExpressions.length > 1) {
              queryParams[EditorConfig.bottomExpressionId] = result.selectedExpressions[1].id;
            } else {
              delete queryParams[EditorConfig.bottomExpressionId];
            }

            this.topExpressionChanged = false;
            this.bottomExpressionChanged = false;

            this._router.navigate([], { queryParams });
          } else {
            this.clearExpressionQueryParams();
            this._router.navigate([], { queryParams: { ...this.queryParams } });
          }

          this._analysisLayoutService.highlightedWidgetId$.next("");
        }
      })
    );
  }

  onToggleExpressionConsoleSolo() {
    this.isExpressionConsoleSolo = !this.isExpressionConsoleSolo;
    if (this.isExpressionConsoleSolo) {
      this.isPreviewWidgetSolo = false;
    }
  }

  loadExpressionById(expressionId: string, updated: boolean) {
    this._expressionsService.fetchCachedExpression(expressionId).subscribe(expression => {
      if (expression.expression) {
        if (!updated) {
          // If we didn't load from local storage, then just set the expression
          this.topExpression = DataExpression.create(expression.expression);
        } else {
          this.topExpression = DataExpression.create(expression.expression);

          // If we did load from local storage, then we need to update the new expression
          this.loadStorageMetadata();
        }

        if (this.topExpression) {
          this.topModules = [];

          this.topExpression.moduleReferences.forEach(moduleRef => {
            let module = this.modules.find(module => module.id === moduleRef.moduleId);
            if (module) {
              this.topModules.push(new DataExpressionModule(module, moduleRef));
            }
          });
        }

        this.updateLinkedModule();

        // AUTO-RUN
        // this.runExpression();
      }
    });
  }

  loadStorageMetadata(): boolean {
    let localStore = new LocalStorageMetadata(this.isSidebarOpen, this.topExpression || undefined, this.bottomExpression || undefined);
    localStore.load();

    this.isSidebarOpen = localStore.isSidebarOpen;
    if (localStore.updatedTopExpression) {
      this.topExpression = localStore.topExpression;
      this.topExpressionChanged = true;
    }
    if (localStore.updatedBottomExpression) {
      this.bottomExpression = localStore.bottomExpression;
      this.bottomExpressionChanged = true;
    }

    return localStore.updated;
  }

  clearExpressionQueryParams() {
    delete this.queryParams[EditorConfig.topExpressionId];
    delete this.queryParams[EditorConfig.bottomExpressionId];
    delete this.queryParams[EditorConfig.topModuleId];
    delete this.queryParams[EditorConfig.bottomModuleId];
    delete this.queryParams[EditorConfig.topModuleVersion];
    delete this.queryParams[EditorConfig.bottomModuleVersion];
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getVersionString(version: SemanticVersion | undefined): string {
    if (!version) {
      return "";
    }
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  getSemanticVersionFromString(version: string): SemanticVersion {
    let versionParts = version.split(".");
    return SemanticVersion.create({
      major: Number(versionParts[0]),
      minor: Number(versionParts[1]),
      patch: Number(versionParts[2]),
    });
  }

  storeMetadata(): void {
    let topCopy = this.topExpression ? DataExpression.create(this.topExpression) : undefined;
    if (topCopy) {
      topCopy.id = topCopy.id.replace(DataExpressionId.UnsavedExpressionPrefix, "");
    }
    let bottomCopy = this.bottomExpression ? DataExpression.create(this.bottomExpression) : undefined;
    if (bottomCopy) {
      bottomCopy.id = bottomCopy.id.replace(DataExpressionId.UnsavedExpressionPrefix, "");
    }

    let localStore = new LocalStorageMetadata(this.isSidebarOpen, topCopy, bottomCopy);
    localStore.store();
  }

  clearTopExpressionCache(): void {
    let localStore = new LocalStorageMetadata();
    localStore.clearTopExpressionCache();
  }

  clearBottomExpressionCache(): void {
    let localStore = new LocalStorageMetadata();
    localStore.clearBottomExpressionCache();
  }

  addLuaHighlight(text: string): string {
    let changedText = text;
    if (!changedText.includes("return ")) {
      let textLines = changedText.trim().split("\n");
      if (textLines.length > 0) {
        let lastLine = textLines[textLines.length - 1];
        let assignmentSplit = lastLine.split(/\s*=\s*/);
        if (assignmentSplit.length === 2) {
          let lhsVarName = assignmentSplit[0].replace("local ", "").trim();
          textLines.push(`return ${lhsVarName}`);
        } else if (lastLine.trim().match(/^print\s*\(.+/)) {
          textLines.push("return {}");
        } else {
          textLines[textLines.length - 1] = "return " + textLines[textLines.length - 1];
        }
      }
      changedText = textLines.join("\n");
    }
    return changedText;
  }

  private _runExpression(expression: DataExpression, isSaved: boolean = false) {
    let expressionCopy = DataExpression.create(expression);

    expressionCopy.id = DataExpressionId.UnsavedExpressionPrefix + expressionCopy.id;
    expressionCopy.name = expressionCopy.name + " (unsaved)";

    // Clear unsaved expression responses if we're intentionally re-running
    // this._widgetDataService.clearUnsavedExpressionResponses().subscribe(() => {
    this.lastRunResult = null;
    this._widgetDataService.runExpression(expressionCopy, this.scanId, this.quantId, PredefinedROIID.getAllPointsForScan(this.scanId), true, true).subscribe({
      next: response => {
        this.lastRunResult = response;
        this.stdout = response.stdout;
        this.stderr = response.stderr;
        this.liveExpressionConfig = {
          expressionId: expressionCopy?.id || "",
          scanId: this.scanId,
          quantId: this.quantId,
        };
      },
      error: err => {
        let errorPreview = `${err}`.substring(0, 100);
        this._snackbarService.openError(errorPreview, err);
        this.lastRunResult = null;
        this.stdout = "";
        this.stderr = `${err}`;
      },
    });
    // });
  }

  runExpression() {
    if (this.isTopEditorActive && this.topExpression) {
      this._runExpression(this.topExpression, !this.topExpressionChanged);
    } else if (!this.isTopEditorActive && this.bottomExpression) {
      this._runExpression(this.bottomExpression, !this.bottomExpressionChanged);
    }
  }

  onLinkModule(moduleID: string) {
    this.linkedModuleID = moduleID;
    if (!this.isSplitScreen) {
      this.onToggleSplitScreen();
    } else if (!this.linkedModuleID && !this.bottomExpressionChanged) {
      this.onToggleSplitScreen();
    }

    this.updateLinkedModule();
  }

  get topModuleIds(): string[] {
    return this.topModules.map(module => module.module.id);
  }

  get selectedModuleVersion(): string {
    if (this.loadedModuleVersion) {
      return this.getVersionString(this.loadedModuleVersion.version);
    } else {
      return "";
    }
  }

  set selectedModuleVersion(version: string) {
    let semanticVersion = this.getSemanticVersionFromString(version);
    if (this.loadedModule?.id && semanticVersion) {
      this._expressionsService.fetchModuleVersion(this.loadedModule.id, semanticVersion);
      let queryParams = { ...this.queryParams };
      if (this.isTopModule) {
        queryParams[EditorConfig.topModuleVersion] = version;
      } else {
        queryParams[EditorConfig.bottomModuleVersion] = version;
      }
      this._router.navigate([], { queryParams });
    }
  }

  onSelectModule(module: DataModule) {
    if (this.topModuleIds.includes(module.id)) {
      this.topModules = this.topModules.filter(m => m.module.id !== module.id);
    } else {
      let moduleReference = ModuleReference.create({ moduleId: module.id, version: module.versions[module.versions.length - 1].version });
      this.topModules.push(new DataExpressionModule(module, moduleReference));
    }

    if (this.topExpression) {
      this.topExpression.moduleReferences = this.topModules.map(module => module.reference);
      this.topExpressionChanged = true;
    }
  }

  onTopModulesChange(modules: DataExpressionModule[]) {
    this.topModules = modules;
    if (this.topExpression) {
      this.topExpression.moduleReferences = this.topModules.map(module => module.reference);
      this.topExpressionChanged = true;
    }
  }

  get textHighlighted(): string {
    return this.highlightedSelection?.text || "";
  }

  onTopTextChange(text: string) {
    if (this.topExpression) {
      this.topExpression.sourceCode = text;
      this.topExpressionChanged = this._expressionsService.checkExpressionChanged(this.topExpression);
      if (this.topExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onTopTextSelect(selection: TextSelection) {
    this.highlightedTop = true;
    this.highlightedSelection = selection;
  }

  onBottomTextChange(text: string) {
    if (this.bottomExpression) {
      this.bottomExpression.sourceCode = text;
      this.bottomExpressionChanged = this._expressionsService.checkExpressionChanged(this.bottomExpression);
      if (this.bottomExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onToggleTopHeader() {
    this.topHeaderOpen = !this.topHeaderOpen;
  }

  onBottomTextSelect(selection: TextSelection) {
    this.highlightedTop = false;
    this.highlightedSelection = selection;
  }

  runHighlightedExpression() {
    if (this.highlightedSelection) {
      let expression = this.highlightedTop ? DataExpression.create({ ...this.topExpression }) : DataExpression.create({ ...this.bottomExpression });
      expression.sourceCode = this.highlightedSelection.text;
      if (expression.sourceLanguage === EXPR_LANGUAGE_LUA) {
        expression.sourceCode = this.addLuaHighlight(expression.sourceCode);
      }
      this.lastRunResult = null;
      this._widgetDataService.runExpression(expression, this.scanId, this.quantId, PredefinedROIID.getAllPointsForScan(this.scanId), true, true).subscribe({
        next: response => {
          this.lastRunResult = response;
          this.liveExpressionConfig = {
            expressionId: expression?.id || "",
            scanId: this.scanId,
            quantId: this.quantId,
          };

          this.stdout = response.stdout;
          this.stderr = response.stderr;

          if (this.highlightedSelection?.markText) {
            this.highlightedSelection.markText();
          }
        },
        error: err => {
          this.lastRunResult = null;
          this.stdout = "";
          this.stderr = `${err}`;
        },
      });
    }
  }

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this._analysisLayoutService.delayNotifyCanvasResize(500);
    this.storeMetadata();
  }

  openBottomModule(moduleId: string = "", version: string = "") {
    // Defaults to first module in list of top expression installed modules if not specified
    let moduleToOpen = !moduleId ? this.topModules[0]?.module : this.modules.find(module => module.id === moduleId);
    if (moduleToOpen) {
      if (!version) {
        version = this.getVersionString(moduleToOpen.versions[moduleToOpen.versions.length - 1].version);
      }

      let queryParams = {
        ...this.queryParams,
        [EditorConfig.bottomExpressionId]: moduleToOpen.id,
        [EditorConfig.bottomModuleVersion]: version,
      };
      this._router.navigate([], { queryParams });
    }
  }

  onToggleSplitScreen() {
    if (this.isSplitScreenDisabled) {
      return;
    }

    this.isSplitScreen = !this.isSplitScreen;
    if (this.linkedModuleID) {
      this.openBottomModule(this.linkedModuleID);
    } else if (!this.bottomExpression && this.topModules.length > 0) {
      // Open first module referenced by top expression
      this.openBottomModule();
    }
    this.setTopEditorActive();
    this.storeMetadata();
  }

  get isLoadedModuleReleased(): boolean {
    return !!this.loadedModule && !!this.loadedModuleVersion && this.loadedModuleVersion?.version?.patch === 0;
  }

  get isLoadedModuleVersionLatest(): boolean {
    let latestVersion = this.loadedModule?.versions[this.loadedModule.versions.length - 1];
    if (latestVersion) {
      return (
        this.loadedModuleVersion?.version?.major === latestVersion.version?.major &&
        this.loadedModuleVersion?.version?.minor === latestVersion.version?.minor &&
        this.loadedModuleVersion?.version?.patch === latestVersion.version?.patch
      );
    }

    return false;
  }

  get isTopModuleReleased(): boolean {
    return this.isTopModule && this.isLoadedModuleReleased;
  }

  get isBottomModuleReleased(): boolean {
    return !this.isTopModule && this.isLoadedModuleReleased;
  }

  get isTopExpressionIdNew(): boolean {
    let topExpressionId = this.queryParams[EditorConfig.topExpressionId];
    return topExpressionId === ExpressionsService.NewExpressionId;
  }

  get isTopModuleIdNew(): boolean {
    let topModuleId = this.queryParams[EditorConfig.topModuleId];
    return topModuleId === ExpressionsService.NewExpressionId;
  }

  get isBottomExpressionIdNew(): boolean {
    let bottomExpressionId = this.queryParams[EditorConfig.bottomExpressionId];
    return bottomExpressionId === ExpressionsService.NewExpressionId;
  }

  addExpressions() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.data = {
      maxSelection: 1,
      disableExpressionGroups: true,
      expressionsOnly: true,
      scanId: this.scanId,
      quantId: this.quantId,
      widgetId: this._id,
    };
    dialogConfig.data.selectedIds = [];
    let topExpressionId = this.queryParams[EditorConfig.topExpressionId];
    if (topExpressionId && !this.isTopExpressionIdNew) {
      dialogConfig.data.selectedIds.push(topExpressionId);
    }

    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }

  onCreateNewExpression() {
    if (this.isSplitScreen) {
      this.onToggleSplitScreen();
    }

    this.isTopModule = false;

    this.topExpression = DataExpression.create({
      sourceCode: "",
      sourceLanguage: EXPR_LANGUAGE_LUA,
    });
    this.topModules = [];
    this.topExpressionChanged = true;
    this.clearTopExpressionCache();

    this.clearExpressionQueryParams();
    let queryParams: Record<string, string> = { ...this.queryParams, [EditorConfig.topExpressionId]: ExpressionsService.NewExpressionId };
    this._router.navigate([], { queryParams });
  }

  generateNewModuleTemplateText(moduleName: string): string {
    return `
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
        `
      .replace(/\n {8,8}/g, "\n")
      .trim();
  }

  onCreateNewModule() {
    if (this.isSplitScreen) {
      this.onToggleSplitScreen();
    }

    this.isTopModule = true;

    this.topExpression = DataExpression.create({
      name: this.newModuleName,
      sourceCode: this.generateNewModuleTemplateText(this.newModuleName),
      sourceLanguage: EXPR_LANGUAGE_LUA,
    });
    this.topModules = [];
    this.topExpressionChanged = true;
    this.clearTopExpressionCache();

    this.clearExpressionQueryParams();
    let queryParams: Record<string, string> = {
      ...this.queryParams,
      [EditorConfig.topModuleId]: ExpressionsService.NewExpressionId,
      [EditorConfig.topModuleVersion]: "",
    };

    this.newModuleName = "";
    this.closeNewModuleDialog();
    this._router.navigate([], { queryParams });
  }

  private closeNewModuleDialog(): void {
    if (this.newModuleDialog && this.newModuleDialog instanceof PushButtonComponent) {
      (this.newModuleDialog as PushButtonComponent).closeDialog();
    }
  }

  get isNewModuleNameUnique(): boolean {
    return !!this.newModuleName && !this.modules.find(module => module.name === this.newModuleName);
  }

  get isNewModuleNameAlphanumeric(): boolean {
    return !!this.newModuleName && /^[a-zA-Z0-9_]+$/.test(this.newModuleName);
  }

  get isNewModuleNameCorrectLength(): boolean {
    return !!this.newModuleName && this.newModuleName.length > 0 && this.newModuleName.length <= 20;
  }

  get doesNewModuleNameNotContainSpaces(): boolean {
    return !!this.newModuleName && !/\s/.test(this.newModuleName);
  }

  get doesNewModuleNameNotContainSpecialCharacters(): boolean {
    return !!this.newModuleName && /^[a-zA-Z0-9_]+$/.test(this.newModuleName);
  }

  get doesNewModuleNameNotStartWithNumber(): boolean {
    return !!this.newModuleName && !/^[0-9]/.test(this.newModuleName);
  }

  get isNewModuleNameValid(): boolean {
    return (
      this.isNewModuleNameUnique &&
      this.isNewModuleNameAlphanumeric &&
      this.doesNewModuleNameNotContainSpaces &&
      this.doesNewModuleNameNotContainSpecialCharacters &&
      this.isNewModuleNameCorrectLength &&
      this.doesNewModuleNameNotStartWithNumber
    );
  }

  get isSplitScreenDisabled(): boolean {
    return this.isTopModule || (this.topExpression?.moduleReferences?.length === 0 && !this.bottomExpression);
  }

  get isTopEditable(): boolean {
    return (this.topExpression?.owner?.canEdit ?? true) && (!this.isTopModule || this.isLoadedModuleVersionLatest);
  }

  get isBottomEditable(): boolean {
    return (this.bottomExpression?.owner?.canEdit ?? true) && this.isLoadedModuleVersionLatest;
  }

  get hasVisibleModule(): boolean {
    return (this.isTopEditorActive && this.isTopModule) || (!this.isTopEditorActive && !!this.bottomExpression);
  }

  get isVisibleModuleEditable(): boolean {
    return this.isTopEditorActive ? this.isTopEditable : this.isBottomEditable;
  }

  get isVisibleModuleVersionLatest(): boolean {
    if (this.loadedModule && this.loadedModuleVersion?.version) {
      return this._expressionsService.checkIsLatestModuleVersion(this.loadedModule.id, this.loadedModuleVersion.version);
    } else {
      return false;
    }
  }

  setTopEditorActive(): void {
    this.isTopEditorActive = true;
  }

  setBottomEditorActive(): void {
    this.isTopEditorActive = false;
  }

  onTopNameChangeEvent(event: Event) {
    this.onTopNameChange((event.target as HTMLInputElement).value);
  }

  onTopNameChange(name: string) {
    if (this.topExpression) {
      this.topExpression.name = name;
      this.topExpressionChanged = this._expressionsService.checkExpressionChanged(this.topExpression);
      if (this.topExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onTopDescriptionChange(description: string) {
    if (this.topExpression) {
      this.topExpression.comments = description;
      this.topExpressionChanged = this._expressionsService.checkExpressionChanged(this.topExpression);
      if (this.topExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onTopTagSelectionChanged(tags: string[]) {
    if (this.topExpression) {
      this.topExpression.tags = tags;
      this.topExpressionChanged = this._expressionsService.checkExpressionChanged(this.topExpression);
      if (this.topExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onBottomNameChangeEvent(event: Event) {
    this.onBottomNameChange((event.target as HTMLInputElement).value);
  }

  onBottomNameChange(name: string) {
    if (this.bottomExpression) {
      this.bottomExpression.name = name;
      this.bottomExpressionChanged = this._expressionsService.checkExpressionChanged(this.bottomExpression);
      if (this.bottomExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onBottomDescriptionChange(description: string) {
    if (this.bottomExpression) {
      this.bottomExpression.comments = description;
      this.bottomExpressionChanged = this._expressionsService.checkExpressionChanged(this.bottomExpression);
      if (this.bottomExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onBottomTagSelectionChanged(tags: string[]) {
    if (this.bottomExpression) {
      this.bottomExpression.tags = tags;
      this.bottomExpressionChanged = this._expressionsService.checkExpressionChanged(this.bottomExpression);
      if (this.bottomExpressionChanged) {
        this.storeMetadata();
      }
    }
  }

  onUpdateTopMetadata() {
    // if (!this.isTopModule && this.topExpressionChanged) {
    //   this.onSave(true);
    // }
  }

  onUpdateBottomMetadata() {
    // if (this.bottomExpressionChanged) {
    //   this.onSave(false);
    // }
  }

  get activeExpressionChanged(): boolean {
    return this.isTopEditorActive ? this.topExpressionChanged : this.bottomExpressionChanged;
  }

  updateModuleWithActiveExpression() {
    if (this.loadedModule && this.loadedModuleVersion) {
      if (this.isTopEditorActive && this.isTopModule) {
        this.loadedModule.comments = this.topExpression?.comments || "";
        this.loadedModuleVersion.comments = this.topExpression?.comments || "";
        this.loadedModuleVersion.sourceCode = this.topExpression?.sourceCode || "";
        this.loadedModuleVersion.tags = this.topExpression?.tags || [];
      } else if (!this.isTopEditorActive && !!this.bottomExpression) {
        this.loadedModule.comments = this.bottomExpression?.comments || "";
        this.loadedModuleVersion.comments = this.bottomExpression?.comments || "";
        this.loadedModuleVersion.sourceCode = this.bottomExpression?.sourceCode || "";
        this.loadedModuleVersion.tags = this.bottomExpression?.tags || [];
      }
    }
  }

  updateLinkedModule() {
    if (this.linkedModuleID) {
      let linkedModule = this.modules.find(module => module.id === this.linkedModuleID);
      let latestVersion = linkedModule?.versions[linkedModule.versions.length - 1];
      if (linkedModule && latestVersion) {
        let topLinkedModule = this.topModules.find(module => module.module.id === linkedModule?.id);
        if (topLinkedModule && this.getVersionString(topLinkedModule.reference.version) !== this.getVersionString(latestVersion.version)) {
          topLinkedModule.module = linkedModule;
          topLinkedModule.reference = ModuleReference.create({ moduleId: linkedModule.id, version: latestVersion.version });
          this.onSave(true);
        }
      }
    }
  }

  onSave(saveTop: boolean = this.isTopEditorActive) {
    if (saveTop && this.topExpression) {
      if (this.isTopModule) {
        this._expressionsService.writeModuleFromExpression(this.topExpression, VersionField.MV_PATCH);
        this.updateModuleWithActiveExpression();

        // If the top module is new, then we need to fetch the modules
        // New modules are always on top, so don't need to do this for the bottom module
        if (!this.modules.find(module => module.id === this.topExpression?.id)) {
          this._expressionsService.fetchModules();
        }

        // Clear module version from the query so the latest is used
        let queryParams = { ...this.queryParams };
        delete queryParams[EditorConfig.topModuleVersion];
        this._router.navigate([], { queryParams });
      } else {
        this.topExpression.moduleReferences = this.topModules.map(module => module.reference);
        this._expressionsService.writeExpression(this.topExpression);
        let queryParams = { ...this.queryParams };
        if (!queryParams[EditorConfig.topExpressionId]) {
          queryParams[EditorConfig.topExpressionId] = this.topExpression.id || ExpressionsService.NewExpressionId;
          this._router.navigate([], { queryParams });
        }
      }
      this.clearTopExpressionCache();
      this.topExpressionChanged = false;
    } else if (!saveTop && this.bottomExpression) {
      this._expressionsService.writeModuleFromExpression(this.bottomExpression, VersionField.MV_PATCH);
      this.updateModuleWithActiveExpression();
      this.clearBottomExpressionCache();
      this.bottomExpressionChanged = false;

      let queryParams = { ...this.queryParams };
      delete queryParams[EditorConfig.bottomModuleVersion];
      this._router.navigate([], { queryParams });
    }
  }

  onRelease() {
    this.updateModuleWithActiveExpression();
    if (!this.loadedModule || !this.loadedModuleVersion) {
      return;
    }

    const dialogConfig = new MatDialogConfig();

    let { id, name } = this.loadedModule;
    let version = this.loadedModuleVersion.version;

    let activeExpression = this.isTopEditorActive ? this.topExpression : this.bottomExpression;

    if (!id || !name || !version || !activeExpression) {
      console.error("Failed to release module", name, version, id);
      this._snackbarService.openError(`Failed to release module: ${name}: ${JSON.stringify(version)}`);
      return;
    }

    dialogConfig.data = new ModuleReleaseDialogData(
      this.loadedModule.id,
      this.loadedModule.name,
      version,
      this.loadedModuleVersion.sourceCode,
      this.loadedModuleVersion.tags,
      this.loadedModuleVersion,
      activeExpression
    );

    let dialogRef = this.dialog.open(ModuleReleaseDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((newVersion: SemanticVersion) => {
      if (!newVersion) {
        return;
      }

      this._expressionsService.fetchModuleVersion(id, newVersion);
    });
  }

  get currentlyOpenCount(): number {
    return this.topExpression && this.bottomExpression ? 2 : this.topExpression || this.bottomExpression ? 1 : 0;
  }

  onToggleCurrentlyOpenSection() {
    this.isCurrentlyOpenSectionOpen = !this.isCurrentlyOpenSectionOpen;
  }

  onToggleModulesSection() {
    this.isModulesSectionOpen = !this.isModulesSectionOpen;
  }

  onClose() {}

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    let cmdOrCtrl = this._analysisLayoutService.isWindows ? "Control" : "Meta";
    let bOrAltB = this._analysisLayoutService.isFirefox ? "∫" : "b";

    if (this._keyPresses.has(cmdOrCtrl) || event.key === cmdOrCtrl) {
      this._keyPresses.add(event.key);
    }
    if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("Enter")) {
      this.runExpression();
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("Enter");
      }
      this._keyPresses.delete(event.key);
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("s")) {
      this.onSave();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("s");
      }
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has(bOrAltB)) {
      this.onToggleSidebar();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete(bOrAltB);
      }
    } else if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has("\\")) {
      this.onToggleSplitScreen();
      this._keyPresses.delete(event.key);
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete("\\");
      }
    }
  }

  @HostListener("window:keyup", ["$event"])
  onKeyup(event: KeyboardEvent): void {
    this._keyPresses.delete(event.key);
  }
}
