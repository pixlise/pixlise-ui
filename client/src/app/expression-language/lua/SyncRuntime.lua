function element(symbol, column, detector)
    return element_async(symbol, column, detector):await()
end

function elementSum(column, detector)
    return elementSum_async(column, detector):await()
end

function data(column, detector)
    return data_async(column, detector):await()
end

function spectrum(startChannel, endChannel, detector)
    return spectrum_async(startChannel, endChannel, detector):await()
end

function spectrumDiff(startChannel, endChannel, op)
    return spectrumDiff_async(startChannel, endChannel, op):await()
end

function pseudo(elem)
    return pseudo_async(elem):await()
end

function housekeeping(column)
    return housekeeping_async(column):await()
end

function diffractionPeaks(eVstart, eVend)
    return diffractionPeaks_async(eVstart, eVend):await()
end

function roughness()
    return roughness_async():await()
end

function position(axis)
    return position_async(axis):await()
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

    local m = makeMap_async(value):await()
    -- Cache it
    lastMap = m
    return m
end

function exists(dataType, column)
    return exists_async(dataType, column):await()
end

function writeCache(k, v)
    return writeCache_async(k, v):await()
end

function readCache(k, w)
    return readCache_async(k, w):await()
end

function readMap(k)
    return readMap_async(k):await()
end