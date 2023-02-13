-- This stubs out all calls expression code can make to PIXLISE, thereby allowing us to run it
-- outside the browser. Data has to be returned, so we record the values coming out of the browser
-- and read them from "allTables" call by call
-- NOTE: resetReplay() needs to be called before the expression is run otherwise we are off the end
--       of the replay and can't return values

local allTables = require('Data-All')

local tableIdx = 1

local function nextTable()
    local result = allTables[tableIdx]
    tableIdx = tableIdx+1
    return result
end

function element(symbol, column, detector)
    return nextTable()
end

function elementSum(column, detector)
    return nextTable()
end

function data(column, detector)
    return nextTable()
end

function spectrum(startChannel, endChannel, detector)
    return nextTable()
end

function spectrumDiff(startChannel, endChannel, op)
    return nextTable()
end

function pseudo(elem)
    return nextTable()
end

function housekeeping(column)
    return nextTable()
end

function diffractionPeaks(evStart, eVend)
    return nextTable()
end

function roughness()
    return nextTable()
end

function position(axis)
    return nextTable()
end

function makeMap(value)
    return nextTable()
end

PIXLISEstub = {}

function PIXLISEstub.resetReplay()
    tableIdx = 1
end
return PIXLISEstub