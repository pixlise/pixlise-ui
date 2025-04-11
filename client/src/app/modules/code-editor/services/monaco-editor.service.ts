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

// This was inspired by a post here: https://stackoverflow.com/questions/71072724/implement-monaco-editor-in-angular-13

import { Injectable } from "@angular/core";
import { Subject, ReplaySubject } from "rxjs";

import { EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";

import { language, conf } from "monaco-editor/esm/vs/basic-languages/lua/lua.js";
import { PIXLANGHelp } from "../components/expression-text-editor/code-help/pixlang-help";
import { LUAHelp } from "../components/expression-text-editor/code-help/lua-help";
import { LuaTranspiler } from "src/app/expression-language/lua-transpiler";
import { HelpSignature, NameAndParamResult, SourceContextParser, SourceHelp } from "../components/expression-text-editor/code-help/help";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "src/app/generated-protos/scan-msgs";
import { ScanMetaDataType } from "src/app/generated-protos/scan";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";

export const MONACO_LUA_LANGUAGE_NAME = "lua";

@Injectable({
  providedIn: "root",
})
export class MonacoEditorService {
  public loadingFinished$: Subject<void> = new ReplaySubject<void>();

  private _helpPIXLANG = new PIXLANGHelp();
  private _helpLUA = new LUAHelp();

  private static _activeParamLists: Map<string, string[]> = new Map<string, string[]>();

  constructor(private _cachedDataService: APICachedDataService) {}

  load() {
    // load the assets
    const baseUrl = "./assets/monaco-editor/min/vs";

    if (typeof (<any>window).monaco === "object") {
      this.finishLoading();
      return;
    }

    const onGotAmdLoader: any = () => {
      // load Monaco
      (<any>window).require.config({ paths: { vs: baseUrl } });
      (<any>window).require(["vs/editor/editor.main"], () => {
        this.finishLoading();
      });
    };

    // load AMD loader, if necessary
    if (!(<any>window).require) {
      const loaderScript: HTMLScriptElement = document.createElement("script");
      loaderScript.type = "text/javascript";
      loaderScript.src = `${baseUrl}/loader.js`;
      loaderScript.addEventListener("load", onGotAmdLoader);
      document.body.appendChild(loaderScript);
    } else {
      onGotAmdLoader();
    }
  }

  buildHelpForSource(originID: string, sourceCode: string): void {
    // We don't do this for PIXLANG, but for LUA source files we rebuild the help database
    // so the next code suggestion that comes up is relevant to what sources we are running
    this._helpLUA.buildHelpForSource(originID, sourceCode);
  }

  setScanAndQuant(scanId: string, quantId: string) {
    if (scanId) {
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId })).subscribe((resp: ScanMetaLabelsAndTypesResp) => {
        const hk: string[] = [];
        for (let c = 0; c < resp.metaLabels.length; c++) {
          const label = resp.metaLabels[c];
          if (resp.metaTypes[c] == ScanMetaDataType.MT_FLOAT || resp.metaTypes[c] == ScanMetaDataType.MT_INT) {
            hk.push(label);
          }
        }

        MonacoEditorService._activeParamLists.set("housekeeping", hk);
      });
    }

    if (quantId) {
      this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId, summaryOnly: false })).subscribe((resp: QuantGetResp) => {
        MonacoEditorService._activeParamLists.set("quantColumns", resp.data?.labels || []);
        MonacoEditorService._activeParamLists.set("quantElements", resp.summary?.elements || []);
        //resp.summary?.params?.userParams?.quantMode == 
        MonacoEditorService._activeParamLists.set("detectors", ["A", "B", "Combined"]);
      });
    }
  }

  private get monaco(): any {
    const monaco = (<any>window).monaco;
    return monaco;
  }

  private finishLoading() {
    const monaco = this.monaco;

    // Setup syntax highlighting for PIXLANG
    this.createMonacoPIXLANGLanguage(monaco);
    this.styleMonacoLUALanguage(monaco);

    // The best monaco resources:
    // https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1
    // https://microsoft.github.io/monaco-editor/typedoc/index.html
    this.installIntellisenseHelpers(monaco);

    // this._moduleService.getBuiltInModules(false).subscribe((modules: DataModule[]) => {
    //   for (let mod of modules) {
    //     let ver = mod.versions.get("0.0.0");
    //     if (ver && ver.sourceCode.length > 0) {
    //       this._helpLUA.buildHelpForSource(mod.id, ver.sourceCode);
    //     }
    //   }

    //   // Tell the world we're ready
    //   this.loadingFinished.next();
    // });
    this.loadingFinished$.next();
  }

  private styleMonacoLUALanguage(monaco: any) {
    monaco.languages.register({
      id: MONACO_LUA_LANGUAGE_NAME,
      extensions: [".lua"],
      aliases: ["Lua", "lua", "LUA"],
    });

    const luaLang = language;
    luaLang["builtins"] = LuaTranspiler.builtinFunctions;
    // TODO: luaLang["builtins"] = luaLang["builtins"].concat(DataModuleService.getBuiltInModuleNames());
    luaLang["escapes"] = /\\(?:[abfnrtv\\"'?]|[0-7]{1,3}|x[a-fA-F0-9]{2}|u[a-fA-F0-9]{4}|U[a-fA-F0-9]{8})/;
    luaLang.tokenizer.root = [
      // lambda function support, ex. "myFunc = function(a, b, c)"
      [/([a-z_A-Z]+)(\s*=\s*)(function)(\s*[(]\s*)/, ["function", "delimiter", "keyword", "delimiter"]],

      // wrapped if statement and builtin function support, ex: "if not (x == 1) then"
      [/([a-z_A-Z]+)(\s*[(]\s*)/, [{ cases: { "@builtins": "builtin", "@keywords": "keyword", "@default": "function" } }, "delimiter"]],

      // Escaped special characters support
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],

      // Pound sign length support
      [/([#]\s*)/, ["keyword"]],

      // module and built-in module function support, ex. "myModule.myFunc()"
      [/([a-z_A-Z]+)([.])([a-z_A-Z]+)(\s*[(])/, [{ cases: { "@builtins": "builtin", "@default": "identifier" } }, "delimiter", "function", "delimiter"]],

      // module member variable support, ex. "myModule.myVar"
      [/([a-z_A-Z]+)([.])([a-z_A-Z]+)/, [{ cases: { "@builtins": "builtin", "@default": "identifier" } }, "delimiter", "member"]],

      // default language support
      ...luaLang.tokenizer.root,
    ];

    monaco.languages.setMonarchTokensProvider(MONACO_LUA_LANGUAGE_NAME, luaLang);
    monaco.languages.setLanguageConfiguration(MONACO_LUA_LANGUAGE_NAME, conf);

    monaco.editor.defineTheme("vs-dark-lua", {
      base: "vs-dark",
      inherit: false,
      rules: [
        { token: "keyword", foreground: "#c792ea", fontStyle: "bold" },
        { token: "identifier", foreground: "#ffff8d" },
        { token: "function", foreground: "#91bfdb" },
        { token: "builtin", foreground: "#c792ea" },
        { token: "member", foreground: "#4EC9B0" },
        { token: "string", foreground: "#fc8d59" },
        { token: "comment", foreground: "#549e7a" },
        { token: "number", foreground: "#FF5370" },
        { token: "constant", foreground: "#91bfdb" },
        { token: "delimiter", foreground: "#89ddff" },
        { token: "string.escape", foreground: "#D16969" },
      ],
      colors: {
        "entity.name.function": "#ffff8d",
        "editor.foreground": "#eeffff",
        "editor.background": "#232829",
        "editorGutter.background": "#283237",
        "diffEditor.insertedTextBackground": "#3F83F766",
        "diffEditor.insertedLineBackground": "#3F83F733",
        "diffEditorGutter.insertedLineBackground": "#3F83F766",
        "diffEditor.removedTextBackground": "#D35FB766",
        "diffEditor.removedLineBackground": "#D35FB733",
        "diffEditorGutter.removedLineBackground": "#D35FB766",
      },
    });
  }

  private createMonacoPIXLANGLanguage(monaco: any) {
    // Register a new language
    monaco.languages.register({ id: EXPR_LANGUAGE_PIXLANG });

    // Register a tokens provider for the language
    const keywords = this._helpPIXLANG.getAllFunctions();
    monaco.languages.setMonarchTokensProvider(EXPR_LANGUAGE_PIXLANG, {
      keywords,
      tokenizer: {
        root: [
          [/@?[a-zA-Z][\w$]*/, { cases: { "@keywords": "keyword", "@default": "variable" } }],
          [/[0-9]+/, "number"],
          [/\/\/.*/, "comment"],
          [/".*?"/, "string"],
        ],
      },
    });

    // Define a new theme that contains only rules that match this language
    monaco.editor.defineTheme("vs-dark-pixlang", {
      base: "vs-dark",
      inherit: false,
      rules: [
        { token: "keyword", foreground: "#c792ea", fontStyle: "bold" },
        { token: "variable", foreground: "#ffff8d" },
        { token: "string", foreground: "#fc8d59" },
        { token: "comment", foreground: "#549e7a" },
        { token: "number", foreground: "#FF5370" },
      ],
      colors: {
        "editor.foreground": "#eeffff",
        "editor.background": "#232829",
        "editorGutter.background": "#283237",
      },
    });
  }

  private installIntellisenseHelpers(monaco: any) {
    // Setup help lookup
    const lang = [EXPR_LANGUAGE_PIXLANG, MONACO_LUA_LANGUAGE_NAME];
    const helpSource = [this._helpPIXLANG, this._helpLUA];

    for (let c = 0; c < lang.length; c++) {
      const language = lang[c];
      const src = helpSource[c];

      //registerCompletionItemProvider(languageSelector: LanguageSelector, provider: CompletionItemProvider): IDisposable
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['"', ",", "(", "."], // Make completion show up for functions and their parameters, and strings
        //provideCompletionItems: (model: ITextModel, position: Position, context: CompletionContext, token: CancellationToken): ProviderResult<CompletionList>
        provideCompletionItems: (model: any, position: any, context: any, token: any) => this.provideCompletionItems(src, model, position, context, token),
        //resolveCompletionItem: (item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
        //resolveCompletionItem: (item, token)=>this.resolveCompletionItem(src, item, token)
      });

      //registerSignatureHelpProvider(languageSelector: LanguageSelector, provider: SignatureHelpProvider): IDisposable
      monaco.languages.registerSignatureHelpProvider(language, {
        signatureHelpTriggerCharacters: ["(", ","],
        //provideSignatureHelp: (model: ITextModel, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelpResult>
        provideSignatureHelp: (model: any, position: any, token: any, context: any) => this.provideSignatureHelp(src, model, position, context),
      });
    }

    // Other providers we may want to implement
    // registerImplementationProvider(languageSelector: LanguageSelector, provider: ImplementationProvider): IDisposable
    //     ^-- Go to implementation
    // registerDeclarationProvider(languageSelector: LanguageSelector, provider: DeclarationProvider): IDisposable
    //     ^-- Go to definition
    // registerTypeDefinitionProvider(languageSelector: LanguageSelector, provider: TypeDefinitionProvider): IDisposable
    //     ^-- Go to type definition

    // Install lua help provider stuff:
    // NOTE: there are several things we can do...
    //   https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1#example-extending-language-services-inlay-hints-provider-example
    // codelens - installs a line above a function for eg that can be run
    // hoverprovider - maybe for debugging, see a variable value?
    // inlay hints - not even sure what this is...
  }

  private provideCompletionItems(
    helpSource: SourceHelp,
    model: any /*: ITextModel*/,
    position: any /*: Position*/,
    context: any /*: CompletionContext*/,
    token: any /*: CancellationToken*/ //: ProviderResult<CompletionList>
  ) {
    // Find a range we'll insert in
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    // See: https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.CompletionItem.html

    // First, check if we're within a function and need to provide parameter completion:
    const searchTextLines = model.getValueInRange(
      /*new IRange*/ {
        startLineNumber: Math.max(position.lineNumber - 5, 0),
        endLineNumber: position.lineNumber,
        startColumn: 0,
        endColumn: position.column,
      }
    );

    // Find the function name going backwards
    const p = new SourceContextParser(helpSource.commentStartToken);
    const itemsNearCursor = p.rfindFunctionNameAndParams(searchTextLines);

    if (!itemsNearCursor.empty) {
      // Try split it into module name and function if possible
      let modName = "";
      let funcName = itemsNearCursor.funcName;

      const parts = itemsNearCursor.funcName.split(".");
      if (parts.length == 2) {
        modName = parts[0];
        funcName = parts[1];
      }

      const sig = helpSource.getSignatureHelp(modName, funcName, itemsNearCursor.params, MonacoEditorService._activeParamLists);
      if (sig) {
        return this.showFunctionParamCompletion(itemsNearCursor, sig, range);
      }
    }

    // If we just typed a module name, we have to list the functions within it
    const moduleName = p.rfindModuleName(searchTextLines);
    if (moduleName.length > 0) {
      return this.showModuleItemCompletion(moduleName, helpSource, range);
    }

    return this.showGlobalCompletion(helpSource, range);
  }

  private showFunctionParamCompletion(itemsNearCursor: NameAndParamResult, sig: HelpSignature, range: any) {
    const monaco = this.monaco;
    const result /*: CompletionItem[]*/ = [];

    for (const possibleValue of sig.paramPossibleValues) {
      const quotedValue = '"' + possibleValue + '"';
      let possibleValueToInsert = possibleValue + '"';
      if (itemsNearCursor.partialParam != '"') {
        possibleValueToInsert = '"' + possibleValueToInsert;
      }

      result.push({
        label: quotedValue,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: possibleValueToInsert,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        //commitCharacters: ["("],
      });
    }

    return { suggestions: result };
  }

  private showModuleItemCompletion(moduleName: string, helpSource: SourceHelp, range: any) {
    const monaco = this.monaco;
    const result /*: CompletionItem[]*/ = [];

    const mods = helpSource.getCompletionModules(moduleName);
    if (mods.length == 1) {
      // List items for this module!
      const funcs = helpSource.getCompletionFunctions(mods[0].name);
      for (const modItem of funcs) {
        result.push({
          label: modItem.name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: modItem.name,
          detail: modItem.doc,
          //documentation: item.doc,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
          //commitCharacters: ["("],
        });
      }

      const consts = helpSource.getCompletionConstants(mods[0].name);
      for (const [constName, constDesc] of consts.entries()) {
        result.push({
          label: constName,
          kind: monaco.languages.CompletionItemKind.Constant,
          insertText: constName,
          detail: constDesc,
          //documentation: item.doc,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
          //commitCharacters: ["("],
        });
      }
    }

    return { suggestions: result };
  }

  private showGlobalCompletion(helpSource: SourceHelp, range: any) {
    const monaco = this.monaco;
    const result /*: CompletionItem[]*/ = [];

    // Show global functions
    const funcs = helpSource.getCompletionFunctions("");
    for (const item of funcs) {
      result.push({
        label: item.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: item.name,
        detail: item.doc,
        //documentation: item.doc,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        //commitCharacters: ["("],
      });
    }

    const consts = helpSource.getCompletionConstants("");
    for (const item of consts) {
      result.push({
        label: item[0],
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: item[0],
        detail: item[1],
        //documentation: item.doc,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        //commitCharacters: ["("],
      });
    }

    // Show all modules
    const mods = helpSource.getCompletionModules("");
    for (const item of mods) {
      result.push({
        label: item.name,
        // Another option would've been .Class
        // See: https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionItemKind.html
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: item.name,
        detail: item.doc,
        //documentation: item.doc,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        //commitCharacters: ["("],
      });
    }

    // Show language keywords
    const kw = helpSource.getKeywords();
    for (const word of kw) {
      result.push({
        label: word,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: word,
        //detail: item.doc,
        //documentation: item.doc,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        //commitCharacters: ["("],
      });
    }

    return { suggestions: result };
  }

  /*
    private resolveCompletionItem(helpSource: SourceHelp, item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
    }
*/
  private provideSignatureHelp(
    helpSource: SourceHelp,
    model: any /*: ITextModel*/,
    position: any /*: Position*/,
    context: any /*: SignatureHelpContext*/ //: ProviderResult<SignatureHelpResult>
  ) {
    // Find the function we're being asked to provide help for. Search backwards from the current position
    const searchTextLines = model.getValueInRange(
      /*new IRange*/ {
        startLineNumber: Math.max(position.lineNumber - 5, 0),
        endLineNumber: position.lineNumber,
        startColumn: 0,
        endColumn: position.column,
      }
    );

    // Find the function name going backwards
    const p = new SourceContextParser(helpSource.commentStartToken);
    const items = p.rfindFunctionNameAndParams(searchTextLines);

    if (!items.empty) {
      // Provide signature help if we can find the function
      let modName = "";
      let funcName = items.funcName;

      const parts = items.funcName.split(".");
      if (parts.length == 2) {
        modName = parts[0];
        funcName = parts[1];
      }

      const sig = helpSource.getSignatureHelp(modName, funcName, items.params, MonacoEditorService._activeParamLists);
      if (!sig) {
        return null;
      }

      const sigParams = [];
      let funcDocPrefix = "";
      for (const p of sig.params) {
        const sigParam: Record<string, string> = { label: p.name };
        if (p.doc) {
          sigParam["documentation"] = p.name + ": " + p.doc;
          if (sigParams.length == sig.activeParamIdx) {
            // We have docs for the active one, so put a prefix in for func doc to provide some separation
            funcDocPrefix = "\n";
          }
        }
        sigParams.push(sigParam);
      }

      const signatureHelp = {
        signatures: [
          {
            label: sig.signature,
            documentation: funcDocPrefix + (modName.length > 0 ? modName + "." : "") + sig.funcName + "():\n" + sig.funcDoc, //sig.paramDoc,//sig.funcDoc,
            parameters: sigParams,
          },
        ],
        activeParameter: sig.activeParamIdx,
        activeSignature: 0, // We're only showing one signature, because we look it up, and we don't support overloading...
      };

      // NOTE: we have to provide the dispose function. MS code also includes this, see https://github.com/microsoft/pxt/blob/master/webapp/src/monaco.tsx#L209
      return { value: signatureHelp, dispose: () => {} };
    }

    return null;
  }
}
