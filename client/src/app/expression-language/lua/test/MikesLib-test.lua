-- Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
-- Government sponsorship acknowledged.
-- All rights reserved.
-- Redistribution and use in source and binary forms, with or without
-- modification, are permitted provided that the following conditions are
-- met:
--
-- * Redistributions of source code must retain the above copyright notice, this
--   list of conditions and the following disclaimer.
-- * Redistributions in binary form must reproduce the above copyright notice,
--   this list of conditions and the following disclaimer in the documentation
--   and/or other materials provided with the distribution.
-- * Neither the name of Caltech nor its operating division, the Jet Propulsion
--   Laboratory, nor the names of its contributors may be used to endorse or
--   promote products derived from this software without specific prior written
--   permission.
--
-- THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
-- AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
-- IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
-- ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
-- LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
-- CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
-- SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
-- INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
-- CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
-- ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
-- POSSIBILITY OF SUCH DAMAGE.

package.path = package.path..";../?.lua"
local Map = require('Map')
local PIXLISEstub = require('PIXLISEstub') -- To stub out functions like element()
local MikesLib = require('MikesLib')
local CSV = require("CSV")
local Utils = require("Utils")
local lu = require('luaunit')


TestMikesLib = {}
    function TestMikesLib:setUp()
    end

    function TestMikesLib:tearDown()
    end

    function TestMikesLib:testTotalFuncResult()
        -- Checks the result of total func against the output of original PIXLISE expression
        local expected = Utils.rotateCSVTable(CSV.load("MikesLib-test-expected.csv", ",", true))

        PIXLISEstub.resetReplay() -- Reset replay of data returns from PIXLISE functions
        local result = MikesLib.TotalFunc(Map)

        local pmcsToIgnore = {
            -- FOR NOW, we ignore 3 PMCs where we get NaN vs the original code calculating a value (incorrectly)
            [256]=true, [1475]=true, [1669]=true,
            -- We also ignore new PMCs we get NaN for from the new code, which was incorrectly NOT returning a NaN in PIXLANG before!
            [129]=true, [303]=true, [308]=true, [334]=true, [385]=true, [420]=true, [485]=true, [578]=true, [596]=true, [666]=true, [683]=true, [692]=true,
            [720]=true, [812]=true, [965]=true, [1272]=true, [1358]=true, [1390]=true, [1439]=true, [1472]=true, [1540]=true, [1706]=true, [1752]=true,
            [1763]=true, [1790]=true, [1795]=true, [1809]=true, [1838]=true, [1846]=true, [1869]=true, [2019]=true, [2057]=true, [2193]=true, [2194]=true,
            [2258]=true, [2260]=true, [2308]=true
        }

        local ignoreCount = 0
        for _, _ in pairs(pmcsToIgnore) do
            ignoreCount = ignoreCount+1
        end

        local line, comment = Utils.findMapTableDifferenceLine(result, "result", expected, "expected", pmcsToIgnore)

        if line >= 0 then
            print("Unexpected result: "..comment.." at line: "..line)
        else
            print("Result output was correct, NOTE: IGNORED "..ignoreCount.." values")
        end

        lu.assertEquals(line, -1)
        lu.assertEquals(comment, "")
    end
--[[
    function TestMikesLib:testTotalFuncSpeed()
        -- Run it many times to get an average time
        local t0 = os.clock()
        local count = 10
        for i = 1, count, 1 do
        PIXLISEstub.resetReplay() -- Reset replay of data returns from PIXLISE functions
            local result = MikesLib.TotalFunc(Map)
        end
        local t1 = os.clock()
        local runtime = t1-t0

        print("Executing MikesLib.TotalFunc took "..(runtime/count).." on average over "..count.." iterations")

        -- About 400ms on Peters machine, but looks like github build machine is 600ms, so ensure we don't fail
        -- often here...
        lu.assertEquals(runtime < 10, true)
    end
]]--
--[[
    
Diagnosing speed issues - we can see how long function calls took with this:

Utils.monitorCalls()
local result = MikesLib.TotalFunc(Map)
Utils.dumpCalls()

]]--

os.exit(lu.LuaUnit.run())
