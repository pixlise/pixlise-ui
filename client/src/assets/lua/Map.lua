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
    opAverage = 11,
}

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
        assert(type(r) == "table", "expected table, got "..type(r))
        s = l
        m = r
        return opWithScalarRaw(m, s, true, op)
    elseif type(r) == "number" then
        assert(type(l) == "table", "expected table, got "..type(l))
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


function Map.mult(l, r)
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
-- class Map

return Map