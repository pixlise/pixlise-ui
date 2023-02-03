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

local function opWithScalarRaw(m, s, scalarLeft, op)
    local r = {}

    if op == Map.opMultiply then
        for k, v in ipairs(m) do
            r[k] = {v[1], v[2]*s}
        end
    elseif op == Map.opAdd then
        for k, v in ipairs(m) do
            r[k] = {v[1], v[2]+s}
        end
    elseif op == Map.opDivide then
        if scalarLeft then
            for k, v in ipairs(m) do
                r[k] = {v[1], s/v[2]}
            end
        else
            for k, v in ipairs(m) do
                r[k] = {v[1], v[2]/s}
            end
        end
    elseif op == Map.opSubtract then
        if scalarLeft then
            for k, v in ipairs(m) do
                r[k] = {v[1], s-v[2]}
            end
        else
            for k, v in ipairs(m) do
                r[k] = {v[1], v[2]-s}
            end
        end
    elseif op == Map.opMin then
        for k, v in ipairs(m) do
            r[k] = {v[1], math.min(v[2], s)}
        end
    elseif op == Map.opMax then
        for k, v in ipairs(m) do
            r[k] = {v[1], math.max(v[2], s)}
        end
    elseif op == Map.opOver then
        for k, v in ipairs(m) do
            if v[2] > s then
                r[k] = {v[1], 1}
            else
                r[k] = {v[1], 0}
            end
        end
    elseif op == Map.opOverUndef then
        for k, v in ipairs(m) do
            if v[2] > s then
                r[k] = {v[1], 1}
            else
                r[k] = {v[1], 0}
            end
            if r[k][2] == 0 then
                r[k][2] = nil
            end
        end
    elseif op == Map.opUnder then
        for k, v in ipairs(m) do
            if v[2] < s then
                r[k] = {v[1], 1}
            else
                r[k] = {v[1], 0}
            end
        end
    elseif op == Map.opUnderUndef then
        for k, v in ipairs(m) do
            if v[2] < s then
                r[k] = {v[1], 1}
            else
                r[k] = {v[1], 0}
            end
            if r[k][2] == 0 then
                r[k][2] = nil
            end
        end
    else
        assert(false, "opWithScalarRaw unexpected op: "..op)
    end

    return r
end

local function opWithMaps(m1, m2, op)
    local r = {}

    if op == Map.opMultiply then
        for k, v in ipairs(m1) do
            r[k] = {v[1], v[2] * m2[k][2]}
        end
    elseif op == Map.opAdd then
        for k, v in ipairs(m1) do
            r[k] = {v[1], v[2] + m2[k][2]}
        end
    elseif op == Map.opDivide then
        for k, v in ipairs(m1) do
            r[k] = {v[1], v[2] / m2[k][2]}
        end
    elseif op == Map.opSubtract then
        for k, v in ipairs(m1) do
            r[k] = {v[1], v[2] - m2[k][2]}
        end
    elseif op == Map.opAverage then
        for k, v in ipairs(m1) do
            r[k] = {v[1], (v[2] + m2[k][2])*0.5}
        end
    elseif op == Map.opMin then
        for k, v in ipairs(m1) do
            r[k] = {v[1], math.min(v[2], m2[k][2])}
        end
    elseif op == Map.opMax then
        for k, v in ipairs(m1) do
            r[k] = {v[1], math.max(v[2], m2[k][2])}
        end
    else
        assert(false, "opWithMaps unexpected op: "..op)
    end

    return r
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
        assert(false, "opWithScalar expected first parameter to be table")
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
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.sin(v[2])}
    end
    return r
end

function Map.cos(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.cos(v[2])}
    end
    return r
end

function Map.tan(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.tan(v[2])}
    end
    return r
end

function Map.asin(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.asin(v[2])}
    end
    return r
end

function Map.acos(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.acos(v[2])}
    end
    return r
end

function Map.atan(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.atan(v[2])}
    end
    return r
end

function Map.exp(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.exp(v[2])}
    end
    return r
end

function Map.ln(m)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], math.log(v[2])}
    end
    return r
end

function Map.pow(m, exp)
    assert(type(m) == "table", makeAssertReport(m, "table"))
    assert(type(exp) == "number", makeAssertReport(exp, "number"))
    local r = {}
    for k, v in ipairs(m) do
        r[k] = {v[1], v[2] ^ exp}
    end
    return r
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

-- class Map

return Map