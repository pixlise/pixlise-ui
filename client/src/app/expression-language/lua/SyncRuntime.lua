function element(symbol, column, detector)
    return element_async(symbol, column, detector):await()
end

function elementSum(column, detector)
    return elementSum_async(column, detector)
end

function data(column, detector)
    return data_async(column, detector)
end

function spectrum(startChannel, endChannel, detector)
    return spectrum_async(startChannel, endChannel, detector)
end

function spectrumDiff(startChannel, endChannel, op)
    return spectrumDiff_async(startChannel, endChannel, op)
end

function pseudo(elem)
    return pseudo_async(elem)
end

function housekeeping(column)
    return housekeeping_async(column)
end

function diffractionPeaks(eVstart, eVend)
    return diffractionPeaks_async(eVstart, eVend)
end

function roughness()
    return roughness_async()
end

function position(axis)
    return position_async(axis)
end

function makeMap(value)
    return makeMap_async(value)
end
