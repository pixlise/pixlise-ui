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

import { Observable, from } from "rxjs";
import { mergeMap, shareReplay } from "rxjs/operators";

export class DataModuleHelpers {
  // List of built in modules - static so other things can access it without a pointer to our instance
  private static _builtInModuleNames = ["Map", "DebugHelp", "SyncRuntime"];
  // Built-in modules that are only required for export
  private static _exportedBuiltInModuleNames = ["PixliseRuntime", "CSV"];

  // List of downloaded modules as observables - we store the first one, in theory it shouldn't download
  // again but just be served from this static cache
  private static _builtInModules = DataModuleHelpers.fetchBuiltInModules();

  private static fetchBuiltInModules(): Map<string, Observable<string>> {
    const result = new Map<string, Observable<string>>();
    const allMods = [...DataModuleHelpers._builtInModuleNames, ...DataModuleHelpers._exportedBuiltInModuleNames];
    for (const mod of allMods) {
      result.set(
        `builtin-${mod}`,
        from(fetch("assets/lua/" + mod + ".lua")).pipe(
          mergeMap(resp => {
            if (resp.status != 200) {
              throw new Error("Failed to download built-in module: " + mod + ": " + resp.statusText);
            }
            return from(resp.text());
          }),
          shareReplay(1)
        )
      );
    }
    return result;
  }

  // NOTE: these are static so the code can be shared with LuaDataQuerier. We want these to look the same
  // modules up, and not download them too often.
  static getBuiltInModuleNames(): string[] {
    // NOTE: we also have FuncRunner for running replay data... bit of a hack for testing
    return DataModuleHelpers._builtInModuleNames;
  }

  static getBuiltInModuleSource(name: string): Observable<string> {
    const cachedModule = DataModuleHelpers._builtInModules.get(name);
    if (cachedModule) {
      return cachedModule;
    } else {
      return DataModuleHelpers.getBuiltInModuleSource(`builtin-${name}`);
    }
  }
}
