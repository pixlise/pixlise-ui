local corrections = GeoAndDiffCorrection:new()
quantifyUsing(corrections)

local SiO2 = Estimate:new({quant = "SiO2"})
local CaT = Estimate:new({quant = "CaT"})
local Na2O = Estimate:new({quant = "Na2O"})
local K2O = Estimate:new({quant = "K2O"})
local MgT = Estimate:new({quant = "MgT"})
local FeT = Estimate:new({quant = "FeT"})
local MnT = Estimate:new({quant = "MnT"})

-- DebugHelp.printTable("GeoAndDiffCorrection", GeoAndDiffCorrection)
-- DebugHelp.printTable("SiO2", SiO2)

local si = 100*SiO2/(SiO2 + CaT + Na2O + K2O + MgT + FeT + MnT)
local canak = 100*(CaT + Na2O + K2O)/(SiO2 + CaT + Na2O + K2O + MgT + FeT + MnT)
local mgmnfe = 100 - si - canak

local screen = Map.under(si:uncertainty(), 5)
screen = Map.AND(screen, Map.under(canak:uncertainty(), 5))
screen = Map.AND(screen, Map.under(mgmnfe:uncertainty(), 5))

return (si*screen):plot()