local corrections = GeoAndDiffCorrection:new()

local R,B,G = corrections:diffractionMap({binary = false, depth = 4, linear = true})

return B 