// import { DataExpressionModule } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
// import { DataExpression } from "src/app/models/Expression";
// import { DataModuleService, DataModuleVersionSourceWire } from "src/app/services/data-module.service";

// storeMetadata(): void {
//   localStorage.setItem("isSidebarOpen", this.isSidebarOpen ? "true" : "false");
//   if (this.topExpression) {
//     localStorage.setItem(EditorConfig.topExpressionId, this.topExpression.id);
//     localStorage.setItem("topExpressionSourceCode", this.topExpression.sourceCode);
//     localStorage.setItem("topExpressionSourceLanguage", this.topExpression.sourceLanguage);
//   }

//   if (this.bottomExpression) {
//     localStorage.setItem(EditorConfig.bottomExpressionId, this.bottomExpression.id);
//     localStorage.setItem("bottomExpressionSourceCode", this.bottomExpression.sourceCode);
//     localStorage.setItem("bottomExpressionSourceLanguage", this.bottomExpression.sourceLanguage);
//   }
// }
// fetchLocalStorageMetadata(): LocalStorageMetadata {
//   let isSidebarOpen = localStorage?.getItem("isSidebarOpen") ?? true;
//   this.isSidebarOpen = isSidebarOpen === "true";
//   if (!this.topExpression || this.topExpression.id === localStorage?.getItem(EditorConfig.topExpressionId)) {
//     if (!this.topExpression) {
//       this.topExpression = DataExpression.create({
//         id: localStorage?.getItem(EditorConfig.topExpressionId) || "",
//         sourceCode: "",
//         sourceLanguage: EXPR_LANGUAGE_LUA,
//       });
//       this.topExpressionChanged = true;
//     }
//     let cachedSourceCode = localStorage?.getItem("topExpressionSourceCode") || "";
//     if ((this.topExpression.sourceCode.length !== cachedSourceCode.length || this.topExpression.sourceCode) !== cachedSourceCode) {
//       this.topExpression.sourceCode = cachedSourceCode;
//       this.topExpressionChanged = true;
//     }

//     let cachedSourceLanguage = localStorage?.getItem("topExpressionSourceLanguage") || EXPR_LANGUAGE_LUA;
//     if (this.topExpression.sourceLanguage !== cachedSourceLanguage) {
//       this.topExpression.sourceLanguage = cachedSourceLanguage;
//       this.topExpressionChanged = true;
//     }
//   }

//   let cachedBottomId: string = localStorage?.getItem(EditorConfig.bottomExpressionId) || "";
//   if (cachedBottomId && this._route.snapshot.queryParams[EditorConfig.bottomExpressionId] !== cachedBottomId) {
//     this.clearBottomExpressionCache();
//   } else if (cachedBottomId && (!this.bottomExpression || this.bottomExpression.id === cachedBottomId)) {
//     if (!this.bottomExpression) {
//       this.bottomExpression = this._expressionsService.expressions$.value[cachedBottomId] || null;
//       if (!this.bottomExpression) {
//         this.bottomExpression = DataExpression.create({ id: cachedBottomId || "", sourceCode: "", sourceLanguage: EXPR_LANGUAGE_LUA });
//       }
//       this.bottomExpressionChanged = true;
//     }

//     let cachedSourceCode = localStorage?.getItem("bottomExpressionSourceCode") || "";
//     if ((this.bottomExpression.sourceCode.length !== cachedSourceCode.length || this.bottomExpression.sourceCode) !== cachedSourceCode) {
//       this.bottomExpression.sourceCode = cachedSourceCode;
//       this.bottomExpressionChanged = true;
//     }

//     let cachedSourceLanguage = localStorage?.getItem("bottomExpressionSourceLanguage") || EXPR_LANGUAGE_LUA;
//     if (this.bottomExpression.sourceLanguage !== cachedSourceLanguage) {
//       this.bottomExpression.sourceLanguage = cachedSourceLanguage;
//       this.bottomExpressionChanged = true;
//     }
//   }
// }

export class LocalStorageMetadata {
  public static isSidebarOpen = "isSidebarOpen";
  public static topExpressionId = "topExpressionId";
  public static topExpressionSourceCode = "topExpressionSourceCode";
  public static topExpressionSourceLanguage = "topExpressionSourceLanguage";
  public static bottomExpressionId = "bottomExpressionId";
  public static bottomExpressionSourceCode = "bottomExpressionSourceCode";
  public static bottomExpressionSourceLanguage = "bottomExpressionSourceLanguage";

  public static storedParameters: (keyof DataExpression)[] = ["id", "sourceCode", "sourceLanguage"];

  public updatedTopExpression: boolean = false;
  public updatedBottomExpression: boolean = false;

  constructor(
    public isSidebarOpen: boolean = true,
    public topExpression: DataExpression = DataExpression.create({}),
    public bottomExpression: DataExpression = DataExpression.create({})
  ) {}

  get updated(): boolean {
    return this.updatedTopExpression || this.updatedBottomExpression;
  }

  store(): void {
    localStorage.setItem(LocalStorageMetadata.isSidebarOpen, this.isSidebarOpen ? "true" : "false");
    if (this.topExpression) {
      localStorage.setItem(LocalStorageMetadata.topExpressionId, this.topExpression.id);
      localStorage.setItem(LocalStorageMetadata.topExpressionSourceCode, this.topExpression.sourceCode);
      localStorage.setItem(LocalStorageMetadata.topExpressionSourceLanguage, this.topExpression.sourceLanguage);
    }

    if (this.bottomExpression) {
      localStorage.setItem(LocalStorageMetadata.bottomExpressionId, this.bottomExpression.id);
      localStorage.setItem(LocalStorageMetadata.bottomExpressionSourceCode, this.bottomExpression.sourceCode);
      localStorage.setItem(LocalStorageMetadata.bottomExpressionSourceLanguage, this.bottomExpression.sourceLanguage);
    }
  }

  load() {
    this.isSidebarOpen = (localStorage?.getItem(LocalStorageMetadata.isSidebarOpen) || "true") === "true";
    let storedTopExpression = DataExpression.create({
      id: localStorage?.getItem(LocalStorageMetadata.topExpressionId) || "",
      sourceCode: localStorage?.getItem(LocalStorageMetadata.topExpressionSourceCode) || "",
      sourceLanguage: localStorage?.getItem(LocalStorageMetadata.topExpressionSourceLanguage) || "",
    });

    if ((!this.topExpression.id && storedTopExpression.id) || (this.topExpression.id && this.topExpression.id === storedTopExpression.id)) {
      LocalStorageMetadata.storedParameters.forEach(param => {
        if (storedTopExpression[param]) {
          (this.topExpression as any)[param] = storedTopExpression[param];
          this.updatedTopExpression = true;
        }
      });
    }

    let storedBottomExpression = DataExpression.create({
      id: localStorage?.getItem(LocalStorageMetadata.bottomExpressionId) || "",
      sourceCode: localStorage?.getItem(LocalStorageMetadata.bottomExpressionSourceCode) || "",
      sourceLanguage: localStorage?.getItem(LocalStorageMetadata.bottomExpressionSourceLanguage) || "",
    });

    if ((!this.bottomExpression.id && storedBottomExpression.id) || (this.bottomExpression.id && this.bottomExpression.id === storedBottomExpression.id)) {
      LocalStorageMetadata.storedParameters.forEach(param => {
        if (storedBottomExpression[param]) {
          (this.bottomExpression as any)[param] = storedBottomExpression[param];
          this.updatedBottomExpression = true;
        }
      });
    }
  }

  clearTopExpressionCache(): void {
    localStorage?.removeItem(LocalStorageMetadata.topExpressionId);
    localStorage?.removeItem(LocalStorageMetadata.topExpressionSourceCode);
    localStorage?.removeItem(LocalStorageMetadata.topExpressionSourceLanguage);
  }

  clearBottomExpressionCache(): void {
    localStorage?.removeItem(LocalStorageMetadata.bottomExpressionId);
    localStorage?.removeItem(LocalStorageMetadata.bottomExpressionSourceCode);
    localStorage?.removeItem(LocalStorageMetadata.bottomExpressionSourceLanguage);
  }
}

export type LocalStorageExpression = {
  text: string;
  date: number; // Seconds since epoch
};

export class LuaRuntimeError {
  constructor(
    public stack: string = "",
    public line: number = -1,
    public errType: string = "",
    public sourceLine: string = "",
    public message: string = ""
  ) {}
}

class EditorConfig {
  public static scanIdParam = "scan_id";
  public static quantIdParam = "quant_id";

  public static topExpressionId = LocalStorageMetadata.topExpressionId;
  public static bottomExpressionId = LocalStorageMetadata.bottomExpressionId;

  public static topModuleId = "topModuleId";
  public static topModuleVersion = "topModuleVersion";

  public static bottomModuleId = "bottomModuleId";
  public static bottomModuleVersion = "bottomModuleVersion";

  private _modules: DataModule[] = [];
  public isSaveableOutput: boolean = true;

  public linkedModuleID: string = "";

  public runtimeError: LuaRuntimeError | null = null;

  constructor(
    public expression: DataExpression = DataExpression.create({}),
    public userID: string = "",
    public editMode: boolean = true,
    public isCodeChanged: boolean = false,
    public isExpressionSaved: boolean = true,
    public isModule: boolean = false,
    public isHeaderOpen: boolean = false,
    public useAutocomplete: boolean = false,
    public version: DataModuleVersion = DataModuleVersion.create({}),
    public versions: Map<string, DataModuleVersion> = new Map()
  ) {}

  get isLua(): boolean {
    return this.expression?.sourceLanguage === EXPR_LANGUAGE_LUA;
  }

  set isLua(isExprLua: boolean) {
    if (this.expression) {
      let expression = DataExpression.create(this.expression);

      this.expression = DataExpression.create({});
      // Ensure that the code editor refreshes
      setTimeout(() => {
        expression.sourceLanguage = isExprLua ? EXPR_LANGUAGE_LUA : EXPR_LANGUAGE_PIXLANG;
        this.expression = expression;
      });
    }
  }

  get isSharedByOtherUser(): boolean {
    return this.expression?.owner?.creatorUser?.id !== this.userID;
  }

  get emptyName(): boolean {
    return !this.expression?.name || this.expression.name === "";
  }

  get emptySourceCode(): boolean {
    return !this.expression?.sourceCode || this.expression.sourceCode === "";
  }

  get invalidExpression(): boolean {
    return this.emptyName || this.emptySourceCode || !this.isSaveableOutput;
  }

  get errorTooltip(): string {
    if (this.emptyName) {
      return "Name cannot be empty";
    } else if (this.emptySourceCode) {
      return "Source code cannot be empty";
    } else if (this.name.match(/[^a-zA-Z0-9_]/)) {
      return "Name must be alphanumeric and cannot contain special characters";
    } else if (this.name.match(/^[0-9]/)) {
      return "Name cannot start with a number";
    } else if (this.name.match(/\s/)) {
      return "Name cannot contain spaces";
    } else {
      return "";
    }
  }

  get isBuiltIn(): boolean {
    return this.expression?.id.startsWith("builtin-");
  }

  get editable(): boolean {
    return this.editMode && !this.isSharedByOtherUser;
  }

  get editExpression(): string {
    return this.expression?.sourceCode || "";
  }

  set editExpression(val: string) {
    if (this.expression) {
      this.expression.sourceCode = val;
      this.isCodeChanged = true;
      this.isExpressionSaved = false;
      this.runtimeError = null;
    }
  }

  get selectedTagIDs(): string[] {
    return this.expression?.tags || [];
  }

  set selectedTagIDs(tags: string[]) {
    if (this.expression) {
      this.expression.tags = tags;
      this.isExpressionSaved = false;
    }
  }

  get name(): string {
    return this.expression?.name || "";
  }

  set name(name: string) {
    if (this.expression) {
      this.expression.name = name;
      this.isExpressionSaved = false;
    }
  }

  get comments(): string {
    return this.expression?.comments || "";
  }

  set comments(comments: string) {
    if (this.expression) {
      this.expression.comments = comments;
      this.isExpressionSaved = false;
    }
  }

  get modules(): DataModule[] {
    return this._modules;
  }

  set modules(modules: DataModule[]) {
    this._modules = modules;
    this.isExpressionSaved = false;
  }

  get rawModules(): DataModule[] {
    return this._modules;
  }

  // Bypasses the setter to avoid setting isExpressionSaved to false
  set rawModules(modules: DataModule[]) {
    this._modules = modules;
  }

  checkIfModulesAreLatest(moduleService: any): void {
    // if (this.expression && this.expression.sourceLanguage === EXPR_LANGUAGE_LUA) {
    //   // We have to check this separately since we're making a copy
    //   let isModuleListUpToDate = this.expression.moduleReferences?.some(ref => ref.checkIsLatest(moduleService));
    //   this.expression.isModuleListUpToDate = isModuleListUpToDate;
    // }
  }

  onExpressionTextChanged(text: string): void {
    this.isSaveableOutput = true;
    this.editExpression = text;
    this.storeExpression();
  }

  storeExpression(): void {
    let storedExpression: LocalStorageExpression = { text: this.editExpression, date: Math.round(Date.now() / 1000) };
    localStorage.setItem(this.expression.id, JSON.stringify(storedExpression));
  }

  fetchStoredExpression(): void {
    let storedExpression = localStorage.getItem(this.expression.id);
    let parsedExpression = storedExpression ? JSON.parse(storedExpression) : null;
    if (!this.isSharedByOtherUser && parsedExpression && parsedExpression.date > this.expression.modifiedUnixSec) {
      // Only update the expression if it's not a module or if it's the latest version
      if (!this.isModule || this.isLoadedLatestEditableVersion) {
        this.editExpression = parsedExpression.text;
        this.isExpressionSaved = false;
        this.isCodeChanged = true;
      }
    }

    // Remove the stored expression if it's older than the expression returned from the API
    else if (storedExpression) {
      localStorage.removeItem(this.expression.id);
    }
  }

  removeStoredExpression(): void {
    localStorage.removeItem(this.expression.id);
  }

  onNameChange(name: string): void {
    this.name = name;
  }

  onDescriptionChange(description: string): void {
    this.comments = description;
  }

  onTagSelectionChanged(tags: string[]): void {
    this.selectedTagIDs = tags;
  }

  onToggleHeader(): void {
    this.isHeaderOpen = !this.isHeaderOpen;
  }

  get majorMinorVersion(): string {
    if (!this.version?.version) {
      return "0.0";
    }

    return `${this.version.version.major}.${this.version.version.minor}`;
  }

  get versionList(): DataModuleVersion[] {
    if (!this.isModule || !this.versions) {
      return [];
    }

    let filteredVersions = [];

    // Only show major/minor versions to users who don't own the module
    if (this.isSharedByOtherUser) {
      filteredVersions = Array.from(this.versions.values()).filter((version: DataModuleVersion) => version.version?.patch === 0);
    } else {
      filteredVersions = Array.from(this.versions.values());
    }

    return filteredVersions.sort((a: DataModuleVersion, b: DataModuleVersion) => {
      if (!a?.version || !b?.version) {
        return 0;
      }

      return b.version.major - a.version.major || b.version.minor - a.version.minor || b.version.patch - a.version.patch;
    });
  }

  get latestVersion(): DataModuleVersion | null {
    if (!this.isModule || !this.version?.version || !this.versionList.length) {
      return null;
    }

    let latestVersion = this.versionList[0];

    return latestVersion;
  }

  get isLoadedLatestEditableVersion(): boolean {
    if (!this.expression || !this.isModule || !this.version?.version) {
      return false;
    }

    let latestVersion = this.latestVersion?.version;
    return (this.isSharedByOtherUser && this.isLoadedVersionLatest) || (!this.isSharedByOtherUser && latestVersion === this.version?.version);
  }

  get isLoadedVersionLatest(): boolean {
    let latestVersion = this.latestVersion?.version;

    return !!latestVersion && latestVersion.major === this.version.version?.major && latestVersion.minor === this.version.version.minor;
  }

  get isLatestVersionReleased(): boolean {
    let latestVersion = this.latestVersion?.version;
    return !!latestVersion && latestVersion.patch === 0;
  }
}

export default EditorConfig;
