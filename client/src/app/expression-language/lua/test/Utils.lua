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

Utils = {}

----------------------------------------- Table Utils

-- Takes a table of the form read from CSV, ie:
-- PMC, Value
-- 1, 1.234
-- 2, 2.345
-- 3, 3.456
-- Which is read in as:
-- {{1, 1.234}, {2, 2.345}, {3, 3.456}}
-- And returns a Lua table of the form:
-- {{1, 2, 3}, {1.123, 2.345, 3.456}}
-- NOTE: Also parses string values as numbers
function Utils.rotateCSVTable(t)
    local r = {{}, {}}
    for k, v in ipairs(t) do
        r[1][k] = tonumber(v[1])
        r[2][k] = tonumber(v[2])
    end
    return r
end


-- FOR NOW, we can specify a list of PMCs to ignore because they're known to differ
function Utils.findMapTableDifferenceLine(a, aName, b, bName, ignorePMCMap)
    if #a ~= 2 then
        return 0, "invalid table structure for: "..aName
    end

    if #b ~= 2 then
        return 0, "invalid table structure for: "..bName
    end

    for r, aPMC in ipairs(a[1]) do
        if ignorePMCMap[aPMC] == nil then
            if aPMC ~= b[1][r] then
                return r, "pmc "..aPMC.." doesn't equal "..b[1][r]
            end

            if a[2][r] ~= b[2][r] then
                return r, "value "..a[2][r].." doesn't equal "..b[2][r].." (pmc="..aPMC..")"
            end
        end
    end
    
    return -1, ""
end

----------------------------------------- Benchmarking/Profiling

Utils["Calls"] = {}
local T = Utils["Calls"]

local function callhook(event)
    local f = debug.getinfo(2, 'f').func
    local e =T[f]
    if e == nil then
        local x = debug.getinfo(2, 'nS')
--[[
        if x.name == nil then
            for k, v in pairs(debug.getinfo(2)) do
                print(k, v)
            end
            return
        end
]]--
        e = {name = x.name, line = x.linedefined, source = x.source, time = 0, count = 0}
        T[f] = e
    end
    if event == 'call' then
        e.time = e.time - os.clock()
        e.count = e.count + 1
    else
        e.time = e.time + os.clock()
    end
end

-- You must call `dumpCalls' when your program ends
function Utils.dumpCalls()
    debug.sethook(nil, "c") -- cannot change `T' during traversal!
    print("Call Dump:")
    print("what", "count", "time")

    -- Print out grouped by source
    local sources = {}
    for k, v in pairs(T) do
        sources[v.source] = 1
    end

    for src, x in pairs(sources) do
        for k,v in pairs(T) do
            if v.source == src then
                local name = v.name
                if name == nil then
                    name = "(private function)"
                end
                print(v.source.."("..v.line..")/"..name, v.count, v.time)
            end
        end
    end
end

function Utils.monitorCalls()
    debug.sethook(callhook, "cr")
end

return Utils