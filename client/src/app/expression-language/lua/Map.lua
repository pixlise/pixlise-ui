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

Map = {
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
    opAverage = 11,
    opAnd = 12,
    opOr = 13,
}

local function getSourceLine(source, lineNumber)
    local srcLine = ""

    local l = 1
    local ch = ""
    local startPos = 1

    for i = 1, #source do
        ch = string.sub(source, i, i)
        if ch == "\n" then
            -- src = src..string.sub(source, i, i+8)..", ch="..i..", line="..l
            if l == lineNumber-1 then
                startPos = i+1
            end
            if l == lineNumber then
                srcLine = string.sub(source, startPos, i-1)
                break
            end
            l = l+1
        end
    end

    return srcLine
end

local function makeStackTrace(startLevel)
    local trace = "Stack trace:"

    local level = startLevel+1
    while true do
        local info = debug.getinfo(level)
        if not info then
            break
        end

        local name = "(PIXLISE expression)"
        if info.name ~= nil then
            name = info.name
        end

        trace = trace..string.format("\n - [%d] %s function %s", info.currentline, info.what, name)

        -- Find the source line            
        if info.source ~= nil then
            trace = trace..":\n        "..getSourceLine(info.source, info.currentline-1)
            trace = trace.."\n      > "..getSourceLine(info.source, info.currentline)
            trace = trace.."\n        "..getSourceLine(info.source, info.currentline+1)
        end

        level = level + 1
    end

    return trace
end

local function makeAssertReport(var, expType)
    local result = ""
    local caller = debug.getinfo(2, "n")
    if caller ~= nil and caller.name ~= nil then
        result = result..caller.name.." "
    end

    if expType == nil then
        result = result.."expected nil, got "..type(var)
    else
       result = result.."expected "..expType..", got "..type(var)
    end

    if type(var) == "table" then
        result = result..": "..#table
    elseif type(var) == "number" or type(var) == "string" or type(var) == "boolean" then
        result = result..": "..var
    end

    result = result.."\n"..makeStackTrace(2)
    return result
end

local function assertType(cond, varChecked, restrictionMsg)
    if cond then
        return
    end
    assert(false, makeAssertReport(varChecked, restrictionMsg))
end

local function unorderedOp(op, v1, v2)
    assertType(v1 ~= nil, v1, "not nil")
    assertType(v2 ~= nil, v2, "not nil")

    -- NOTE: we can only support operations where the order of params doesn't matter!
    -- NOTE2: We check for nils!
    -- if v1 == nil or v2 == nil then
    --     return 1/0
    -- end
    if op == Map.opMultiply then
        return v1*v2
    elseif op == Map.opAdd then
        return v1+v2
    elseif op == Map.opMin then
        return math.min(v1, v2)
    elseif op == Map.opMax then
        return math.max(v1, v2)
    elseif op == Map.opMin then
        return math.min(v1, v2)
    elseif op == Map.opAnd then
        if v1 ~= 0 and v2 ~= 0 then
            return 1
        end
        return 0
    elseif op == Map.opOr then
        if v1 ~= 0 or v2 ~= 0 then
            return 1
        end
        return 0
    end

    error("unorderedOp unexpected op: "..op)
end


local function op(op, ...)
    -- Check there are enough parameters
    assert(#{...}, "function expects at least 2 arguments")
    -- Check that one of the first 2 parameters is a map and init
    -- values based the one that is map
    -- This is largely for backwards compatibility - we originally supported
    -- only 2 arguments, and we flexibly allow maps and numbers as arguments
    -- but we do at some point want to find the starting value we multiply things
    -- with. Don't want to loop through the args twice, so we just check the first
    -- 2 here
    local m1, m2 = table.unpack({...})
    local pmcs
    local startIdx = -1
    local startValues
    if type(m1) == "table" then
        startIdx = 1
        pmcs = m1[1]
        startValues = m1[2]
    elseif type(m2) == "table" then
        startIdx = 2
        pmcs = m2[1]
        startValues = m2[2]
    else
        error("one of first 2 arguments expected to be a map")
    end

    -- Init values to be a copy of whatever we've decided to start with
    local values = {table.unpack(startValues)}
    -- NOTE: The following is SLOWER than the above!
    --for k, v in ipairs(startValues) do
    --    values[k] = v
    --end

    for argi, arg in ipairs({...}) do
        -- Don't involve the one we started with, it's already included in the op
        if argi ~= startIdx then
            if type(arg) == "table" then
                -- This is a table, multiply every value by its corresponding table value
                for k, v in ipairs(arg[2]) do
                    values[k] = unorderedOp(op, values[k], v)
                end
            else
                -- This is a number, apply op to every value by it
                for k, v in ipairs(values) do
                    values[k] = unorderedOp(op, v, arg)
                end
            end
        end
    end
    
    return {pmcs, values}
end

-- The following are implemented in terms of op()

-- Returns a new map which contains the result of all arguments
-- multiplied together. Note that at least one of the first 2
-- arguments is required to be a map, while numbers are treated
-- like a map where all PMCs have that same value. Returns a map
-- with the same dimensions as the input map
function Map.mul(...)
    return op(Map.opMultiply, table.unpack({...}))
end

-- Returns a new map which is the sum of all the maps specified.
-- Note that at least one parameter must be a map, while numbers
-- will be treated like a map where all PMCs have that same value.
-- Returns a new map of the same dimension an input map
function Map.add(...)
    return op(Map.opAdd, table.unpack({...}))
end

-- Returns a new map where each value is the minimum of corresponding
-- value in arguments. Note that at least one of the arguments
-- is required to be a map, while numbers are treated like a map
-- where all PMCs have that same value. Returns a new map of the
-- same dimension an input map
function Map.min(...)
    return op(Map.opMin, table.unpack({...}))
end

-- Returns a new map where each value is the maximum of corresponding
-- value in arguments. Note that at least one of the arguments
-- is required to be a map, while numbers are treated like a map
-- where all PMCs have that same value. Returns a new map of the
-- same dimension an input map
function Map.max(...)
    return op(Map.opMax, table.unpack({...}))
end

-- Returns a new map where each value is the abs of corresponding
-- value in the map provided. Returns a new map of the
-- same dimension an input map
function Map.abs(m)
    assertType(type(m) == "table", m, "table")
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = math.abs(v)
    end
    return {m[1], values}
end

-- Returns a new map where each value is the logical and of corresponding
-- value in arguments. Note that at least one of the arguments
-- is required to be a map, while numbers are treated like a map
-- where all PMCs have that same value. Returns a new map of the
-- same dimension an input map
function Map.And(...)
    return op(Map.opAnd, table.unpack({...}))
end

-- Returns a new map where each value is the logical or of corresponding
-- value in arguments. Note that at least one of the arguments
-- is required to be a map, while numbers are treated like a map
-- where all PMCs have that same value. Returns a new map of the
-- same dimension an input map
function Map.Or(...)
    return op(Map.opOr, table.unpack({...}))
end

-- Separate implementations because order matters

local function opWithScalarRaw(m, s, scalarLeft, op)
    local values = {}

    if op == Map.opDivide then
        if scalarLeft then
            for k, v in ipairs(m[2]) do
                values[k] = s / v
            end
        else
            for k, v in ipairs(m[2]) do
                values[k] = v / s
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
    else
        assert(false, "opWithScalarRaw unexpected op: "..op)
    end

    return {m[1], values}
end

local function opWithMaps(m1, m2, op)
    local values = {}

    if op == Map.opDivide then
        for k, v in ipairs(m1[2]) do
            values[k] = v / m2[2][k]
        end
    elseif op == Map.opSubtract then
        for k, v in ipairs(m1[2]) do
            values[k] = v - m2[2][k]
        end
    else
        assert(false, "opWithMaps unexpected op: "..op)
    end

    return {m1[1], values}
end

local function opWithScalar(l, r, op)
    local s, m
    if type(l) == "number" then
        assertType(type(r) == "table", r, "table")
        s = l
        m = r
        return opWithScalarRaw(m, s, true, op)
    elseif type(r) == "number" then
        assertType(type(l) == "table", l, "table")
        m = l
        s = r
        return opWithScalarRaw(m, s, false, op)
    else
        assert(false, "opWithScalar expected one parameter to be table, got: "..type(l)..","..type(r))
    end
end

local function orderedOp(l, r, op)
    local ltype = type(l)
    local rtype = type(r)
    if (ltype == "table") and (rtype == "table") then
        return opWithMaps(l, r, op)
    else
        return opWithScalar(l, r, op)
    end
end


-- l/r, where one of l, r is expected to be a map, the other
-- a map or scalar. Returns a new map of the same dimension as
-- the parameter maps. Division by 0 results in a map value of NaN
function Map.div(l, r)
    return orderedOp(l, r, Map.opDivide)
end

-- l-r, where one of l, r is expected to be a map, the other
-- a map or scalar. Returns a new map of the same dimension as
-- the parameter map
function Map.sub(l, r, ...)
    return orderedOp(l, r, Map.opSubtract)
end

-- Returns a new map where if value for a PMC in m is > cmp, the result map will contain 1 otherwise 0.
-- m: The map to check
-- cmp: The value to compare to
function Map.over(m, cmp)
    assertType(type(m) == "table", m, "table")
    assertType(type(cmp) == "number", cmp, "number")
    local values = {}
    for k, v in ipairs(m[2]) do
        if v > cmp then
            values[k] = 1
        else
            values[k] = 0
        end
    end
    return {m[1], values}
end

-- Returns a new map where if value for a PMC in m is > cmp, the result map will contain 1 otherwise
-- null, which means this will for example leave holes in a context image for PMCs with a null value
-- m: The map to check
-- cmp: The value to compare to
function Map.over_undef(m, cmp)
    assertType(type(m) == "table", m, "table")
    assertType(type(cmp) == "number", cmp, "number")
    local values = {}
    for k, v in ipairs(m[2]) do
        if v > cmp then
            values[k] = 1
        else
            values[k] = 0
        end
        if values[k] == 0 then
            values[k] = nil
        end
    end
    return {m[1], values}
end


-- Returns a new map where if value for a PMC in m is < cmp, the result map will contain 1 otherwise 0.
-- m: The map to check
-- cmp: The value to compare to
function Map.under(m, cmp)
    assertType(type(m) == "table", m, "table")
    assertType(type(cmp) == "number", cmp, "number")
    local values = {}
    for k, v in ipairs(m[2]) do
        if v < cmp then
            values[k] = 1
        else
            values[k] = 0
        end
    end
    return {m[1], values}
end

-- Returns a new map where if value for a PMC in m is < cmp, the result map will contain 1 otherwise
-- null, which means this will for example leave holes in a context image for PMCs with a null value
-- m: The map to check
-- cmp: The value to compare to
function Map.under_undef(m, cmp)
    assertType(type(m) == "table", m, "table")
    assertType(type(cmp) == "number", cmp, "number")
    local values = {}
    for k, v in ipairs(m[2]) do
        if v < cmp then
            values[k] = 1
        else
            values[k] = 0
        end
        if values[k] == 0 then
            values[k] = nil
        end
    end
    return {m[1], values}
end

local function mapFunc(m, f)
    assertType(type(m) == "table", m, "table")
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = f(v)
    end
    return {m[1], values}
end

-- Returns a new map where each value is sin of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.sin(m)
    return mapFunc(m, math.sin)
end

-- Returns a new map where each value is cos of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.cos(m)
    return mapFunc(m, math.cos)
end

-- Returns a new map where each value is tan of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.tan(m)
    return mapFunc(m, math.tan)
end

-- Returns a new map where each value is asin of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.asin(m)
    return mapFunc(m, math.asin)
end

-- Returns a new map where each value is acos of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.acos(m)
    return mapFunc(m, math.acos)
end

-- Returns a new map where each value is atan of corresponding value in m
-- where the values in m are interpreted as being in radians
-- m: Map whose values to read
function Map.atan(m)
    return mapFunc(m, math.atan)
end

-- Returns a new map where each value is e raised to power of of corresponding value in m
-- m: Map whose values to read
function Map.exp(m)
    return mapFunc(m, math.exp)
end

-- Returns a new map where each value is natural log of corresponding value in m
-- m: Map whose values to read
function Map.ln(m)
    return mapFunc(m, math.log)
end

-- Returns a new map where each value is natural log of corresponding value in m
-- m: Map to raise to power
-- exp: Scalar exponent
function Map.pow(m, exp)
    assertType(type(m) == "table", m, "table")
    assertType(type(exp) == "number", exp, "number")
    local values = {}
    for k, v in ipairs(m[2]) do
        values[k] = v ^ exp
    end
    return {m[1], values}
end

-- Returns a new map where each value is logical not of corresponding value in m
-- m: Map to not
function Map.Not(m)
    assertType(type(m) == "table", m, "table")
    local values = {}
    for k, v in ipairs(m[2]) do
        if v ~= 0 then
            values[k] = 0
        else
            values[k] = 1
        end
    end
    return {m[1], values}
end

local function findMinMax(m)
    local mapMin = 0
    local mapMax = 0

    local first = true

    for k, v in ipairs(m[2]) do
        if v ~= nil then -- Ignore "undefined" values
            if first == true then
                mapMin = v
                mapMax = v

                first = false
            else
                if v < mapMin then
                    mapMin = v
                end
                if v > mapMax then
                    mapMax = v
                end
            end
        end
    end
    return mapMin, mapMax
end

-- Returns a new map whose values are between 0 and 1, calculated by taking the min/max of map m
-- then producing a map where the max is set to 1, min is 0, and values in between are percentages
-- between 0 and 1
-- m: Map to normalise
function Map.normalise(m)
    assertType(type(m) == "table", m, "table")
    local r = {}

    -- Find the min & max
    local mapMin, mapMax = findMinMax(m)
    local mapRange = mapMax-mapMin

    if mapRange == 0 then
        return m
    end

    -- Normalise each value to be a % within min-max range, ie 0-1
    for k, v in ipairs(m[2]) do
        if v ~= nil then  -- Skip "undefined" values
            r[k] = (v-mapMin)/mapRange
        else
            r[k] = nil
        end
    end
    return {m[1], r}
end

-- Added to help our Americans, but then we're doing everything else with "Queens English"
-- so took this out to reduce confusion/differences in future
-- This function isn't widely used anyway
-- function Map.normalize(m)
--     return Map.normalise(m)
-- end

-- Returns a new map whose values are 1 if they are within the range compare +/- threshold or 0 otherwise
-- m: Map to read
-- compare: Scalar base number
-- range: Scalar value to define the range, being from compare-threshold to compare+threshold
function Map.threshold(m, compare, range)
    assertType(type(m) == "table", m, "table")
    assertType(type(compare) == "number", compare, "number")
    assertType(type(range) == "number", range, "number")
    local r = {}
    for k, v in ipairs(m[2]) do
        local save = 0
        if v ~= nil and math.abs(v-compare) < range then -- Note, handling "undefined" values
            save = 1
        end
        r[k] = save
    end
    return {m[1], r}
end

-- Prints map contents to stdout with comment to help make more sense of it
-- m: Map to print
-- comment: String to include at the start, eg var name
function Map.printDebugMap(m, comment)
    print(comment.." map size: "..#m[1])
    for k, v in ipairs(m[1]) do
        print(v.."="..m[2][k])
    end
end

-- This is slow! PMC doesn't match index but surely we could skip and start looping from near it!

-- Retrieves the value for a given PMC from the map m. If the value does not exist, nil is returned
-- m: Map to read
-- pmc: Scalar PMC number to find corresponding value of
function Map.getPMCValue(m, pmc)
    assertType(type(m) == "table", m, "table")
    assertType(type(pmc) == "number", pmc, "number")

    for idx, mapPMC in ipairs(m[1]) do
        if mapPMC == pmc then
            return m[2][idx]
        end
    end

    -- Explicitly return nil if not found
    return nil
end

-- Sets the value of PMC in modification to the specified value v. Returns true if new value added
-- m: Map to change
-- pmc: Scalar PMC number to set value of
-- v: Scalar value to set in map for given PMC
function Map.setPMCValue(m, pmc, v)
    assertType(type(m) == "table", m, "table")
    assertType(type(pmc) == "number", pmc, "number")
    assertType(type(v) == "number", v, "number")

    for idx, mapPMC in ipairs(m[1]) do
        if mapPMC == pmc then
            m[2][idx] = v
            return false -- Existing value cahnged
        end
    end

    -- New value added
    local newIdx = #m[1]+1
    m[1][newIdx] = pmc
    m[2][newIdx] = v
    return true
end

-- Retrieves the value for the nth PMC from the map m. If the value does not exist, nil is returned
-- m: Map to read
-- index: Scalar index of PMC to return
function Map.getNthPMC(m, index)
    assertType(type(m) == "table", m, "table")
    assertType(type(index) == "number", index, "number")

    return m[1][index]
end

-- Retrieves the value for the nth PMC from the map m. If the value does not exist, nil is returned
-- m: Map to read
-- index: Scalar PMC number to find corresponding value of
function Map.getNthValue(m, index)
    assertType(type(m) == "table", m, "table")
    assertType(type(index) == "number", index, "number")

    return m[2][index]
end

-- Retrieves all the PMCs in the map (the first sub-table of the map)
-- m: Map to read
function Map.getPMCs(m)
    assertType(type(m) == "table", m, "table")
    assertType(type(m[1]) == "table", m[1], "table")

    return m[1]
end

-- Retrieves all the values in the map (the second sub-table of the map)
-- m: Map to read
function Map.getValues(m)
    assertType(type(m) == "table", m, "table")
    assertType(type(m[2]) == "table", m[2], "table")

    return m[2]
end

-- Replaces bad values such as infinity, negative infinity and NaN with the value
-- requested. Edits passed in map, returns nothing.
-- NOTE that tables in Lua cannot contain nil so this function wont check for nil.
-- See https://www.lua.org/manual/5.3/manual.html#2.1
-- m: Map to replace values in
-- with: The number to replace bad values with
function Map.replaceBadValues(m, with)
    assertType(type(m) == "table", m, "table")
    assertType(type(with) == "number", with, "number")

    for c, v in ipairs(m[2]) do
        -- NOTE: Lua has no NaN constant, but its equivalent value is math.huge, which
        -- also happens to work for infinity. We take abs() to consider negative infinity
        -- too, and of course nil is also a "bad" value
        if v ~= v or math.abs(v) == math.huge then
            m[2][c] = with
        end
    end
end

return Map