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

local Map = {
    opMultiply = 1,
    opDivide = 2,
    opAdd = 3,
    opSubtract = 4,
    opMin = 5,
    opMax = 6,
    opOver = 7,
    opUnder = 8,
    opOverUndef = 9,
    opUnderUndef = 10,
    opAverage = 11
}

--local infinity = 1/0

local function makeAssertReport(var, expType)
    local result = ""
    local caller = debug.getinfo(2, "n")
    if caller ~= nil and caller.name ~= nil then
        result = result..caller.name.." "
    end
    result = result.."expected "..expType..", got "..type(var)

    if type(var) == "table" then
        result = result..": "..#table
    elseif type(var) == "number" or type(var) == "string" or type(var) == "boolean" then
        result = result..": "..var
    end

    -- Caller 1 level further up
    caller = debug.getinfo(3)
    if caller ~= nil and caller.source ~= nil then
        result = result.." caller: "..caller.source
    end
    return result
end

local function fixBadValue(s)
    -- Check if it's NaN or infinite
    if s ~= s then -- or s == infinity or s == -infinity then
        s = 0
    end
    return s
end

local function opWithScalarRaw(m, s, scalarLeft, op)
    local values = {}

    if op == Map.opMultiply then
        for k, v in ipairs(m[2]) do
            values[k] = v * s
        end
    elseif op == Map.opAdd then
        for k, v in ipairs(m[2]) do
            values[k] = v + s
        end
    elseif op == Map.opDivide then
        if scalarLeft then
            for k, v in ipairs(m[2]) do
                values[k] = fixBadValue(s / v)
            end
        else
            for k, v in ipairs(m[2]) do
                values[k] = fixBadValue(v / s)
            end
        end
    elseif op == Map.opSubtract then
        if scalarLeft then
            for k, v in ipairs(m[2]) do
                values[k] = s - v
            end
        else
            for k, v in ipairs(m[2]) do
                values[k] = v - s
            end
        end
    elseif op == Map.opMin then
        for k, v in ipairs(m[2]) do
            values[k] = math.min(v, s)
        end
    elseif op == Map.opMax then
        for k, v in ipairs(m[2]) do
            values[k] = math.max(v, s)
        end
    elseif op == Map.opOver then
        for k, v in ipairs(m[2]) do
            if v > s then
                values[k] = 1
            else
                values[k] = 0
            end
        end
    elseif op == Map.opOverUndef then
        for k, v in ipairs(m[2]) do
            if v > s then
                values[k] = 1
            else
                values[k] = 0
            end
            if values[k] == 0 then
                values[k] = nil
            end
        end
    elseif op == Map.opUnder then
        for k, v in ipairs(m[2]) do
            if v < s then
                values[k] = 1
            else
                values[k] = 0
            end
        end
    elseif op == Map.opUnderUndef then
        for k, v in ipairs(m[2]) do
            if v < s then
                values[k] = 1
            else
                values[k] = 0
            end
            if values[k] == 0 then
                values[k] = nil
            end
        end
    else
        assert(false, "opWithScalarRaw unexpected op: "..op)
    end

    return {m[1], values}
end


local function opWithMaps(m1, m2, op)
    local values = {}

    if op == Map.opMultiply then
        for k, v in ipairs(m1[2]) do
            values[k] = v * m2[2][k]
        end
    elseif op == Map.opAdd then
        for k, v in ipairs(m1[2]) do
            values[k] = v + m2[2][k]
        end
    elseif op == Map.opDivide then
        for k, v in ipairs(m1[2]) do
            values[k] = fixBadValue(v / m2[2][k])
        end
    elseif op == Map.opSubtract then
        for k, v in ipairs(m1[2]) do
            values[k] = v - m2[2][k]
        end
    elseif op == Map.opAverage then
        for k, v in ipairs(m1[2]) do
            values[k] = (v + m2[2][k])*0.5
        end
    elseif op == Map.opMin then
        for k, v in ipairs(m1[2]) do
            values[k] = math.min(v, m2[2][k])
        end
    elseif op == Map.opMax then
        for k, v in ipairs(m1[2]) do
            values[k] = math.max(v, m2[2][k])
        end
    else
        assert(false, "opWithMaps unexpected op: "..op)
    end

    return {m1[1], values}
end

local function opWithScalar(l, r, op)
    local s, m
    if type(l) == "number" then
        assert(type(r) == "table", makeAssertReport(r, "table"))
        s = l
        m = r
        return opWithScalarRaw(m, s, true, op)
    elseif type(r) == "number" then
        assert(type(l) == "table", makeAssertReport(l, "table"))
        m = l
        s = r
        return opWithScalarRaw(m, s, false, op)
    else
        assert(false, "opWithScalar expected one parameter to be table, got: "..type(l)..","..type(r))
    end
end

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

function Map.div(l, r)
    return op(l, r, Map.opDivide)
end

function Map.add(l, r)
    return op(l, r, Map.opAdd)
end

function Map.sub(l, r)
    return op(l, r, Map.opSubtract)
end

function Map.min(l, r)
    return op(l, r, Map.opMin)
end

function Map.max(l, r)
    return op(l, r, Map.opMax)
end

function Map.over(l, r)
    return opWithScalar(l, r, Map.opOver)
end

function Map.under(l, r)
    return opWithScalar(l, r, Map.opUnder)
end

function Map.over_undef(l, r)
    return opWithScalar(l, r, Map.opOverUndef)
end

function Map.under_undef(l, r)
    return opWithScalar(l, r, Map.opUnderUndef)
end

function Map.sin(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.sin(v[2])
    end
    return {m[1], values}
end

function Map.cos(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.cos(v[2])
    end
    return {m[1], values}
end

function Map.tan(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.tan(v[2])
    end
    return {m[1], values}
end

function Map.asin(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.asin(v[2])
    end
    return {m[1], values}
end

function Map.acos(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.acos(v[2])
    end
    return {m[1], values}
end

function Map.atan(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.atan(v[2])
    end
    return {m[1], values}
end

function Map.exp(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = fixBadValue(math.exp(v[2]))
    end
    return {m[1], values}
end

function Map.ln(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = fixBadValue(math.log(v[2]))
    end
    return {m[1], values}
end

function Map.pow(m, exp)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    assert(type(exp) == "number", makeAssertReport(exp, "number"))
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = fixBadValue(v ^ exp)
    end
    return {m[1], values}
end

local function findMinMax(m)
    local mapMin = 0
    local mapMax = 0

    local first = true

    for k, v in ipairs(m) do
        if v[2] ~= nil then -- Ignore "undefined" values
            if first == true then
                mapMin = v[2]
                mapMax = v[2]

                first = false
            else
                if v[2] < mapMin then
                    mapMin = v[2]
                end
                if v[2] > mapMax then
                    mapMax = v[2]
                end
            end
        end
    end
    return mapMin, mapMax
end

function Map.normalise(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}

    -- Find the min & max
    local mapMin, mapMax = findMinMax(m)
    local mapRange = mapMax-mapMin

    if mapRange == 0 then
        return m
    end

    -- Normalise each value to be a % within min-max range, ie 0-1
    for k, v in ipairs(m) do
        if v[2] ~= nil then  -- Skip "undefined" values
            r[k] = {v[1], (v[2]-mapMin)/mapRange}
        else
            r[k] = {v[1], nil}
        end
    end
    return r
end

-- Added to help our Americans, but then we're doing everything else with "Queens English"
-- so took this out to reduce confusion/differences in future
-- This function isn't widely used anyway
-- function Map.normalize(m)
--     return Map.normalise(m)
-- end

function Map.threshold(m, compare, threshold)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    assert(type(compare) == "number", makeAssertReport(compare, "number"))
    assert(type(threshold) == "number", makeAssertReport(threshold, "number"))
    local r = {}
    for k, v in ipairs(m) do
        local save = 0
        if v[2] ~= nil and math.abs(v[2]-compare) < threshold then -- Note, handling "undefined" values
            save = 1
        end
        r[k] = {v[1], save}
    end
    return r
end

function printDebugMap(m, comment)
    print(comment.." map size: "..#m[1])
    for k, v in ipairs(m[1]) do
        print(v.."="..m[2][k])
    end
end

return Map