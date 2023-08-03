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
//   Laboratory, nor the names of its contributors may be used to endorse orDataExpressionId.
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

//import { TestBed } from "@angular/core/testing";
import { LUAHelp } from "./lua-help";
import { FunctionHelp, FunctionParamHelp } from "./help";


const luaExample = `-- A bunch of copyright comments
-- can be found here
Map = {
    opMultiply = 1,
}

local function op(l, r, op)
    local ltype = type(l)
    local rtype = type(r)
    if (ltype == "table") and (rtype == "table") then
        return opWithMaps(l, r, op)
    else
        return opWithScalar(l, r, op)
    end
end


function Map.mul(l, r)
    return op(l, r, Map.opMultiply)
end

local var = 10

local function something(a)
    return a+10
end

-- Here is some help text
-- that is multi-line
 function Map.div(l, r)
    return op(l, r, Map.opDivide)
end

-- Here is some help text
-- that is also multi-line
-- l: The left parameter
\tfunction Map.add(l, r)
    return op(l, r, Map.opAdd)
end

-- r: Right param
function Map.sub(l, r)
    return op(l, r, Map.opSubtract)
end

return Map
`;

describe("LUAHelp.makeHelpForSource", () => 
{
    it("extracts help from source code", () => 
    {
        let help = new LUAHelp();
        let helps = help["makeHelpForSource"]("builtin-Map", luaExample);
        expect(helps).toEqual([
            new FunctionHelp(
                "mul",
                "Map",
                "",
                "builtin-Map",
                [
                    new FunctionParamHelp("l", "", []),
                    new FunctionParamHelp("r", "", [])
                ]
            ),
            new FunctionHelp(
                "div",
                "Map",
                "Here is some help text\nthat is multi-line",
                "builtin-Map",
                [
                    new FunctionParamHelp("l", "", []),
                    new FunctionParamHelp("r", "", [])
                ]
            ),
            new FunctionHelp(
                "add",
                "Map",
                "Here is some help text\nthat is also multi-line",
                "builtin-Map",
                [
                    new FunctionParamHelp("l", "The left parameter", []),
                    new FunctionParamHelp("r", "", [])
                ]
            ),
            new FunctionHelp(
                "sub",
                "Map",
                "",
                "builtin-Map",
                [
                    new FunctionParamHelp("l", "", []),
                    new FunctionParamHelp("r", "Right param", [])
                ]
            )
        ]);
    });
});

describe("LUAHelp.getFuncDoc", () => 
{
    it("extracts help above func", () => 
    {
        const src = [
            "something()",
            "",
            "-- Here is some help text",
            "--that is also multi-line",
            "-- l: The left parameter",
            "--with more",
            "-- r: The right ",
            "--parameter",
            "\tfunction Map.add(l, r)"
        ];

        let help = new LUAHelp();
        let lines = help["getFuncDoc"](src, 8);
        expect(lines).toEqual([
            "Here is some help text",
            "that is also multi-line",
            "l: The left parameter",
            "with more",
            "r: The right",
            "parameter",
        ]);
    });
});

describe("LUAHelp.getParamHelp", () => 
{
    it("extracts help above func", () => 
    {
        const src = [
            "Here is some help text",
            "that is also multi-line",
            "l: The left parameter",
            "with more",
            "r: The right",
            "parameter",
        ];

        let help = new LUAHelp();
        let lines = help["getParamHelp"](src, "l", ["l", "r"]);
        expect(lines).toEqual([
            "The left parameter",
            "with more",
        ]);

        // Side-effect is we should have deleted these lines from the main source line list too
        expect(src).toEqual([
            "Here is some help text",
            "that is also multi-line",
            "r: The right",
            "parameter",
        ]);
    });
});
