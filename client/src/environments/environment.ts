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

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  route_dbg: false,
  configName: "local-development-pixlise-config.json",
  expressionResultCacheThresholdMs: 100, // Don't cache things unless they take over an hour to run
  luaDebug: false, // Enable debug flag on Lua runner which will print timing stats and provide Lua code the printMap() function
  luaJSDebugTiming: true, // Print out functions called from Lua to JS, also monitors time taken in JS functions
  initLuaTranspiler: false, // Should we init a PIXLISE->Lua transpiler
  initExpressionLanguageComparer: false, // Should we init a PIXLISE->Lua comparer, implies initTranspiler=true
  newLuaPerExpression: false, // Should we create a new Lua WASM instance per expression run?
  expressionLanguageCompareSkipLines: 1, // How many lines to skip when doing line-by-line comparison
  expressionLanguageCompareDiffAllowed: 0.0000001, // Absolute difference allowed between output values of Lua vs PIXLISE expressions
  expressionExecStatSaveIntervalSec: 600, // How long to wait before we save exec stats for an expression again
  luaTimeoutMs: 600000, // Max time we allow a Lua call to take to run
  wsTimeout: 180000, // Time it takes for a socket to time out on web socket
  maxOutstandingAPIRequests: 10, // How many requests we send through to API before starting to locally queue them in memory
  authTarget: "/datasets",
  authorizationParams: {
    audience: "pixlise-backend",
    redirect_uri: `${window.location.origin}/authenticate`,
  },
  largeMessageLogThresholdBytes: 102400,
  marsViewerUrlRoot: "https://marsviewer.sops.m20.jpl.nasa.gov",
  skipMemoizeKeys: [] as string[],
  disableExpressionMemoisation: false,
  // disableExpressionMemoisation: true,
  readBeamIJSwapped: true,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import "zone.js/dist/zone-error"; // Included with Angular CLI.
