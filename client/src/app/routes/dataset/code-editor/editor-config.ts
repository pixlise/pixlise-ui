import { DataExpressionModule } from "src/app/UI/expression-editor/expression-text-editor/expression-text-editor.component";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/models/Expression";
import { DataModuleService, DataModuleVersionSourceWire } from "src/app/services/data-module.service";

export type LocalStorageExpression = {
    text: string;
    date: number; // Seconds since epoch
}

export class LuaRuntimeError
{
    constructor(    
        public stack: string = "",
        public line: number = -1,
        public errType: string = "",
        public sourceLine: string = "",
        public message: string = "",
    ){}
}

class EditorConfig
{
    private _modules: DataExpressionModule[] = [];
    public isSaveableOutput: boolean = true;

    public linkedModuleID: string = null;

    public runtimeError: LuaRuntimeError = null;

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

    get isBuiltIn(): boolean
    {
        return this.expression?.id.startsWith("builtin-");
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
            this.runtimeError = null;
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

    // Bypasses the setter to avoid setting isExpressionSaved to false
    set rawModules(modules: DataExpressionModule[])
    {
        this._modules = modules;
    }

    checkIfModulesAreLatest(moduleService: DataModuleService): void
    {
        if(this.expression && this.expression.sourceLanguage === EXPR_LANGUAGE_LUA)
        {
            // We have to check this separately since we're making a copy
            let isModuleListUpToDate = this.expression.moduleReferences?.some(ref => ref.checkIsLatest(moduleService));
            this.expression.isModuleListUpToDate = isModuleListUpToDate;
        }
    }

    onExpressionTextChanged(text: string): void
    {
        this.isSaveableOutput = true;
        this.editExpression = text;
        this.storeExpression();
    }

    storeExpression(): void
    {
        let storedExpression: LocalStorageExpression = { text: this.editExpression, date: Math.round(Date.now() / 1000) };
        localStorage.setItem(this.expression.id, JSON.stringify(storedExpression));
    }

    fetchStoredExpression(): void
    {
        let storedExpression = localStorage.getItem(this.expression.id);
        let parsedExpression = storedExpression ? JSON.parse(storedExpression) : null;
        if(!this.isSharedByOtherUser && parsedExpression && parsedExpression.date > this.expression.modUnixTimeSec)
        {
            // Only update the expression if it's not a module or if it's the latest version
            if(!this.isModule || this.isLoadedLatestEditableVersion)
            {
                this.editExpression = parsedExpression.text;
                this.isExpressionSaved = false;
                this.isCodeChanged = true;
            }
        }

        // Remove the stored expression if it's older than the expression returned from the API
        else if(storedExpression)
        {
            localStorage.removeItem(this.expression.id);
        }
    }

    removeStoredExpression(): void
    {
        localStorage.removeItem(this.expression.id);
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

    get versionList(): DataModuleVersionSourceWire[]
    {
        if(!this.isModule || !this.versions)
        {
            return [];
        }

        // Only show major/minor versions to users who don't own the module
        if(this.isSharedByOtherUser)
        {
            return Array.from(this.versions.values()).filter((version: DataModuleVersionSourceWire) => version.version.endsWith(".0"));
        }
        else
        {
            return Array.from(this.versions.values());
        }

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

    get isLoadedLatestEditableVersion(): boolean
    {
        if(!this.expression || !this.isModule || !this.version?.version)
        {
            return false;
        }

        let latestVersion = this.latestVersion?.version;
        return (this.isSharedByOtherUser && this.isLoadedVersionLatest) || (!this.isSharedByOtherUser && latestVersion === this.version?.version);
    }

    get isLoadedVersionLatest(): boolean
    {
        let latestVersion = this.latestVersion?.version;
        
        let [latestMajor, latestMinor] = (latestVersion?.split(".") || []).map(version => parseInt(version));
        let [currentMajor, currentMinor] = (this.version?.version?.split(".") || []).map(version => parseInt(version));
        
        return latestVersion && latestMajor === currentMajor && latestMinor === currentMinor;
    }

    get isLatestVersionReleased(): boolean
    {
        let latestVersion = this.latestVersion?.version;
        return latestVersion && latestVersion.endsWith(".0");
    }
}

export default EditorConfig;