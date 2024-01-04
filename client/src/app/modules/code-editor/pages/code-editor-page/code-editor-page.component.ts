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
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { DataExpressionModule, TextSelection } from "../../components/expression-text-editor/expression-text-editor.component";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
import { SemanticVersion, VersionField } from "src/app/generated-protos/version";
import { ModuleReleaseDialogComponent, ModuleReleaseDialogData } from "../../components/module-release-dialog/module-release-dialog.component";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";

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

  liveExpressionConfig: { expressionId: string; scanId: string; quantId: string } = {
    expressionId: "",
    scanId: "",
    quantId: "",
  };
  lastRunResult: DataQueryResult | null = null;

  public stdout: string = "";
  public stderr: string = "";

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _snackbarService: SnackbarService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _widgetDataService: WidgetDataService,
    private _apiCachedDataService: APICachedDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.scanId = params["scanId"] || "";
        this.quantId = params["quantId"] || "";

        if (params["topExpressionId"]) {
          this.isTopModule = false;
          this._expressionsService.fetchExpression(params["topExpressionId"]);
          if (!params["bottomExpressionId"]) {
            this.isSplitScreen = false;
          }
        } else if (params["topModuleId"]) {
          this.isSplitScreen = false;
          let version = params["topModuleVersion"] ? this.getSemanticVersionFromString(params["topModuleVersion"]) : null;
          this._expressionsService.fetchModuleVersion(params["topModuleId"], version);
        } else {
          this.topExpression = null;
        }

        if (params["bottomExpressionId"]) {
          let version = params["bottomModuleVersion"] ? this.getSemanticVersionFromString(params["bottomModuleVersion"]) : null;
          this._expressionsService.fetchModuleVersion(params["bottomExpressionId"], version);
        } else {
          this.bottomExpression = null;
        }

        this.updateLinkedModule();
      })
    );

    this._subs.add(
      this._expressionsService.expressions$.subscribe(expressions => {
        let topExpressionId = this._route.snapshot.queryParams["topExpressionId"];
        if (topExpressionId === ExpressionsService.NewExpressionId && this._expressionsService.lastSavedExpressionId) {
          topExpressionId = this._expressionsService.lastSavedExpressionId;
          let queryParams = { ...this._route.snapshot.queryParams, topExpressionId };
          this._router.navigate([], { queryParams });
        }
        if (topExpressionId) {
          this.topExpression = expressions[topExpressionId] || null;
          if (this.topExpression) {
            this.topExpression = DataExpression.create(this.topExpression);
          }
        }

        this.fetchLocalStorageMetadata();

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
      })
    );

    this._subs.add(
      this._expressionsService.modules$.subscribe(modules => {
        this.modules = Object.values(modules);

        let topModuleId = this._route.snapshot.queryParams["topModuleId"];
        let topModuleVersion = this._route.snapshot.queryParams["topModuleVersion"];
        if (topModuleId) {
          this.isTopModule = true;
          this.topModules = [];

          if (topModuleId === ExpressionsService.NewExpressionId && this._expressionsService.lastSavedExpressionId) {
            topModuleId = this._expressionsService.lastSavedExpressionId;
            if (!topModuleVersion) {
              topModuleVersion = this.getVersionString(modules[topModuleId].versions[0].version);
            }

            let queryParams = { ...this._route.snapshot.queryParams, topModuleId, topModuleVersion };
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
          let bottomModuleId = this._route.snapshot.queryParams["bottomExpressionId"];
          let bottomModuleVersion = this._route.snapshot.queryParams["bottomModuleVersion"];

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

        if (this.topExpression) {
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
        let scanId = this._route.snapshot.queryParams["scanId"];
        let quantId = this._route.snapshot.queryParams["quantId"];
        if (result && result.selectedExpressions?.length > 0) {
          if (result.scanId) {
            scanId = result.scanId;
          }

          if (quantId) {
            quantId = result.quantId;
          }

          if (scanId && !quantId) {
            quantId = this._analysisLayoutService.getQuantIdForScan(scanId);
          }

          let queryParams: Record<string, string> = {
            topExpressionId: result.selectedExpressions[0].id,
            quantId,
            scanId,
          };

          if (result.selectedExpressions.length > 1) {
            queryParams["bottomExpressionId"] = result.selectedExpressions[1].id;
          } else {
            delete queryParams["bottomExpressionId"];
          }

          this.topExpressionChanged = false;
          this.bottomExpressionChanged = false;

          this._router.navigate([], { queryParams });
        } else if (result) {
          this._router.navigate([], { queryParams: { quantId, scanId } });
        }
      })
    );
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
    localStorage.setItem("isSidebarOpen", this.isSidebarOpen.toString());
    if (this.topExpression) {
      localStorage.setItem("topExpressionId", this.topExpression.id);
      localStorage.setItem("topExpressionSourceCode", this.topExpression.sourceCode);
      localStorage.setItem("topExpressionSourceLanguage", this.topExpression.sourceLanguage);
    }

    if (this.bottomExpression) {
      localStorage.setItem("bottomExpressionId", this.bottomExpression.id);
      localStorage.setItem("bottomExpressionSourceCode", this.bottomExpression.sourceCode);
      localStorage.setItem("bottomExpressionSourceLanguage", this.bottomExpression.sourceLanguage);
    }
  }

  fetchLocalStorageMetadata(): void {
    let isSidebarOpen = localStorage?.getItem("isSidebarOpen") || false;
    this.isSidebarOpen = isSidebarOpen === "true";
    if (!this.topExpression || this.topExpression.id === localStorage?.getItem("topExpressionId")) {
      if (!this.topExpression) {
        this.topExpression = DataExpression.create({ id: localStorage?.getItem("topExpressionId") || "", sourceCode: "", sourceLanguage: EXPR_LANGUAGE_LUA });
        this.topExpressionChanged = true;
      }
      let cachedSourceCode = localStorage?.getItem("topExpressionSourceCode") || "";
      if ((this.topExpression.sourceCode.length !== cachedSourceCode.length || this.topExpression.sourceCode) !== cachedSourceCode) {
        this.topExpression.sourceCode = cachedSourceCode;
        this.topExpressionChanged = true;
      }

      let cachedSourceLanguage = localStorage?.getItem("topExpressionSourceLanguage") || EXPR_LANGUAGE_LUA;
      if (this.topExpression.sourceLanguage !== cachedSourceLanguage) {
        this.topExpression.sourceLanguage = cachedSourceLanguage;
        this.topExpressionChanged = true;
      }
    }

    let cachedBottomId: string = localStorage?.getItem("bottomExpressionId") || "";
    if (cachedBottomId && this._route.snapshot.queryParams["bottomExpressionId"] !== cachedBottomId) {
      this.clearBottomExpressionCache();
    } else if (cachedBottomId && (!this.bottomExpression || this.bottomExpression.id === cachedBottomId)) {
      if (!this.bottomExpression) {
        this.bottomExpression = this._expressionsService.expressions$.value[cachedBottomId] || null;
        if (!this.bottomExpression) {
          this.bottomExpression = DataExpression.create({ id: cachedBottomId || "", sourceCode: "", sourceLanguage: EXPR_LANGUAGE_LUA });
        }
        this.bottomExpressionChanged = true;
      }

      let cachedSourceCode = localStorage?.getItem("bottomExpressionSourceCode") || "";
      if ((this.bottomExpression.sourceCode.length !== cachedSourceCode.length || this.bottomExpression.sourceCode) !== cachedSourceCode) {
        this.bottomExpression.sourceCode = cachedSourceCode;
        this.bottomExpressionChanged = true;
      }

      let cachedSourceLanguage = localStorage?.getItem("bottomExpressionSourceLanguage") || EXPR_LANGUAGE_LUA;
      if (this.bottomExpression.sourceLanguage !== cachedSourceLanguage) {
        this.bottomExpression.sourceLanguage = cachedSourceLanguage;
        this.bottomExpressionChanged = true;
      }
    }
  }

  clearTopExpressionCache(): void {
    localStorage.removeItem("topExpressionId");
    localStorage.removeItem("topExpressionSourceCode");
    localStorage.removeItem("topExpressionSourceLanguage");
  }

  clearBottomExpressionCache(): void {
    localStorage.removeItem("bottomExpressionId");
    localStorage.removeItem("bottomExpressionSourceCode");
    localStorage.removeItem("bottomExpressionSourceLanguage");
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
        } else {
          textLines[textLines.length - 1] = "return " + textLines[textLines.length - 1];
        }
      }
      changedText = textLines.join("\n");
    }
    return changedText;
  }

  runExpression() {
    if (this.isTopEditorActive && this.topExpression) {
      this.lastRunResult = null;
      this._widgetDataService
        .runExpression(this.topExpression, this.scanId, this.quantId, PredefinedROIID.getAllPointsForScan(this.scanId), true, true)
        .subscribe(response => {
          this.lastRunResult = response;
          this.stdout = response.stdout;
          this.stderr = response.stderr;
          this.liveExpressionConfig = {
            expressionId: this.topExpression?.id || "",
            scanId: this.scanId,
            quantId: this.quantId,
          };
        });
    } else if (!this.isTopEditorActive && this.bottomExpression) {
      this.lastRunResult = null;
      this._widgetDataService
        .runExpression(this.bottomExpression, this.scanId, this.quantId, PredefinedROIID.getAllPointsForScan(this.scanId), true, true)
        .subscribe(response => {
          this.lastRunResult = response;
          this.stdout = response.stdout;
          this.stderr = response.stderr;
          this.liveExpressionConfig = {
            expressionId: this.bottomExpression?.id || "",
            scanId: this.scanId,
            quantId: this.quantId,
          };
        });
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
      let queryParams = { ...this._route.snapshot.queryParams };
      if (this.isTopModule) {
        queryParams["topModuleVersion"] = version;
      } else {
        queryParams["bottomModuleVersion"] = version;
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
  }

  openBottomModule(moduleId: string = "", version: string = "") {
    // Defaults to first module in list of top expression installed modules if not specified
    let moduleToOpen = !moduleId ? this.topModules[0]?.module : this.modules.find(module => module.id === moduleId);
    if (moduleToOpen) {
      if (!version) {
        version = this.getVersionString(moduleToOpen.versions[moduleToOpen.versions.length - 1].version);
      }

      let queryParams = {
        ...this._route.snapshot.queryParams,
        bottomExpressionId: moduleToOpen.id,
        bottomModuleVersion: version,
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
    let topExpressionId = this._route.snapshot.queryParams["topExpressionId"];
    return topExpressionId && topExpressionId === ExpressionsService.NewExpressionId;
  }

  get isTopModuleIdNew(): boolean {
    let topModuleId = this._route.snapshot.queryParams["topModuleId"];
    return !topModuleId || topModuleId === ExpressionsService.NewExpressionId;
  }

  get isBottomExpressionIdNew(): boolean {
    let bottomExpressionId = this._route.snapshot.queryParams["bottomExpressionId"];
    return bottomExpressionId && bottomExpressionId === ExpressionsService.NewExpressionId;
  }

  addExpressions() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.data = {
      noActiveScreenConfig: true,
      maxSelection: 1,
      disableExpressionGroups: true,
    };
    dialogConfig.data.selectedIds = [];
    let topExpressionId = this._route.snapshot.queryParams["topExpressionId"];
    if (topExpressionId && !this.isTopExpressionIdNew) {
      dialogConfig.data.selectedIds.push(topExpressionId);
    }

    if (this._route.snapshot.queryParams["bottomExpressionId"]) {
      dialogConfig.data.selectedIds.push(this._route.snapshot.queryParams["bottomExpressionId"]);
    }

    dialogConfig.data.scanId = this._route.snapshot.queryParams["scanId"] || "";
    dialogConfig.data.quantId = this._route.snapshot.queryParams["quantId"] || "";

    const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    // dialogRef.afterClosed().subscribe((result: ExpressionPickerResponse) => {
    //   if (result && result.selectedExpressions?.length > 0) {
    //     let queryParams: Record<string, string> = {
    //       topExpressionId: result.selectedExpressions[0].id,
    //       quantId: result.quantId,
    //       scanId: result.scanId,
    //     };

    //     if (result.selectedExpressions.length > 1) {
    //       queryParams["bottomExpressionId"] = result.selectedExpressions[1].id;
    //     } else {
    //       delete queryParams["bottomExpressionId"];
    //     }

    //     this.topExpressionChanged = false;
    //     this.bottomExpressionChanged = false;

    //     this._router.navigate([], { queryParams });
    //   } else if (result) {
    //     this._router.navigate([], { queryParams: { quantId: result.quantId || "", scanId: result.scanId || "" } });
    //   }
    // });
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

    let queryParams: Record<string, string> = { topExpressionId: ExpressionsService.NewExpressionId };
    if (this.scanId) {
      queryParams["scanId"] = this.scanId;
    }

    if (this.quantId) {
      queryParams["quantId"] = this.quantId;
    }

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

    let queryParams: Record<string, string> = { topModuleId: ExpressionsService.NewExpressionId, topModuleVersion: "" };
    if (this.scanId) {
      queryParams["scanId"] = this.scanId;
    }

    if (this.quantId) {
      queryParams["quantId"] = this.quantId;
    }

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
        // Clear module version from the query so the latest is used
        let queryParams = { ...this._route.snapshot.queryParams };
        delete queryParams["topModuleVersion"];
        this._router.navigate([], { queryParams });
      } else {
        this.topExpression.moduleReferences = this.topModules.map(module => module.reference);
        this._expressionsService.writeExpression(this.topExpression);
        let queryParams = { ...this._route.snapshot.queryParams };
        if (!queryParams["topExpressionId"]) {
          queryParams["topExpressionId"] = this.topExpression.id || ExpressionsService.NewExpressionId;
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

      let queryParams = { ...this._route.snapshot.queryParams };
      delete queryParams["bottomModuleVersion"];
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
