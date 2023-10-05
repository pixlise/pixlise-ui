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

function makeMap(value)
    return makeMap_async(value):await()
end

function exists(dataType, column)
    return exists_async(dataType, column):await()
end
