// import { DataExpressionModule } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule, DataModuleVersion } from "src/app/generated-protos/modules";
// import { DataExpression } from "src/app/models/Expression";
// import { DataModuleService, DataModuleVersionSourceWire } from "src/app/services/data-module.service";

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
