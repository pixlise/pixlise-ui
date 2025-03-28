-- Module exported from PIXLISE (www.pixlise.org)
--     Module name: PixliseRuntime
-- This file re-implements functions defined in the PIXLISE runtime
-- meaning we can execute our Lua code outside PIXLISE!

-- Firstly, some helper functions
-- This is only defined for use by the functions below, it's not actually re-implementing
-- something from the PIXLISE runtime
local CSV = require("CSV");

-- Reads CSV and turns it into Map data usable to expression
local function rotateCSVTable(t)
    local r = {{}, {}}
    for k, v in ipairs(t) do
        r[1][k] = tonumber(v[1])
        r[2][k] = tonumber(v[2])
    end
    return r
end

-- Reads expression-delivered Map data and writes in CSV format
local function unrotateCSVTable(t)
    local r = {}
    for k, v in ipairs(t[2]) do
        r[k] = {tonumber(t[1][k]), tonumber(v)}
    end
    return r
end

local function readCSV(name)
	return rotateCSVTable(CSV.load("input-data/"..name..").csv", ",", false))
end

function writeCSV(name, pixliseMap)
    CSV.save(name, ",", unrotateCSVTable(pixliseMap), {"PMC", "Value"})
end

-- And all the global functions that re-implement PIXLISE behaviour
-- NOTE: All of these are for accessing data, and the relevant CSVs must
--       be accessible, as we treat CSVs as the replacement for the runtime!
function element(symbol, column, detector)
    return readCSV("element("..symbol..","..column..","..detector)
end

function elementSum(column, detector)
    return readCSV("elemSum("..column..","..detector)
end

function data(column, detector)
    return readCSV("data("..column..","..detector)
end

function spectrum(startChannel, endChannel, detector)
    return readCSV("spectrum("..math.floor(startChannel)..","..math.floor(endChannel)..","..detector)
end

function spectrumDiff(startChannel, endChannel, op)
    return readCSV("spectrumDiff("..math.floor(startChannel)..","..math.floor(endChannel)..","..op)
end

function pseudo(elem)
    return readCSV("pseudo("..elem)
end

function housekeeping(column)
    return readCSV("housekeeping("..column)
end

function diffractionPeaks(eVstart, eVend)
    return readCSV("diffractionPeaks("..eVstart..","..eVend)
end

function roughness()
    return readCSV("roughness")
end

function position(axis)
    return readCSV("position("..axis)
end

local lastMap = {}
function makeMap(value)
    -- If we have one saved, just set the value in the same kind of map
    if #lastMap > 0 then
        local values = {}
        for k, v in ipairs(lastMap[2]) do
            if v == nil then
                values[k] = nil
            else
                values[k] = value
            end
        end
        return { lastMap[1], values }
    end

    local m = readCSV("makeMap("..value)
    -- Cache it
    lastMap = m
    return m
end

local inputValues = CSV.loadLookup("input-data/expression-input-values.csv", ",", false)

function exists(dataType, column)
    local k = "exists-"..dataType.."-"..column
    return inputValues[k] == "true"
end

function atomicMass(symbol)
    local k = "atomicMass-"..symbol
    return tonumber(inputValues[k])
end

function writeCache(k, v)
    print("Pretending writeCache "..k.." for "..#v.." values was successful")
    return true
end

function readCache(k, w)
    print("Reporting readCache "..k.." failed")
    return nil
end
