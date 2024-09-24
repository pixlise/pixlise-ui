local corrections = GeoAndDiffCorrection:new()
quantifyUsing(corrections)

local SiO2 = Estimate:new({quant = "SiO2"})
local CaT = Estimate:new({quant = "CaT"})
local Na2O = Estimate:new({quant = "Na2O"})
local K2O = Estimate:new({quant = "K2O"})
local MgT = Estimate:new({quant = "MgT"})
local FeT = Estimate:new({quant = "FeT"})
local MnT = Estimate:new({quant = "MnT"})

local function dump(o, prevPrefix, keyLimit)
    local prefix = prevPrefix.."  "

    if type(o) == 'table' then
        local s = prevPrefix..'{\n'
        local c = 0
        for k,v in pairs(o) do
            if type(k) ~= 'number' then
                k = '"'..k..'"'
            end
            s = s .. prefix .. '['..k..'] = ' .. dump(v, prefix, 10) .. '\n'

            if c > keyLimit then
                s = s .. prefix .. "... (".. (#o-c) .. " more, " .. #o .. " total items)...\n"
                break
            end

            c = c + 1
        end

        return s .. prevPrefix .. '}\n'
    else
        return tostring(o)
    end
end

local function printDump(name, o)
    local d = dump(o, "", 30)
    print(name..": " .. d .. "\n")
end

-- printKeys(GeoAndDiffCorrection)
-- printDump("GeoAndDiffCorrection", GeoAndDiffCorrection)

-- printDump("SiO2", SiO2)
-- printDump("CaT", CaT)
-- printDump("Na2O", Na2O)
-- printDump("K2O", K2O)
-- printDump("MgT", MgT)
-- printDump("FeT", FeT)
-- printDump("MnT", MnT)

--print("si,canak,mgmnfe")
local si = 100*SiO2/(SiO2 + CaT + Na2O + K2O + MgT + FeT + MnT)
local canak = 100*(CaT + Na2O + K2O)/(SiO2 + CaT + Na2O + K2O + MgT + FeT + MnT)
local mgmnfe = 100 - si - canak

local screen = Map.under(si:uncertainty(), 5)
screen = Map.AND(screen, Map.under(canak:uncertainty(), 5))
screen = Map.AND(screen, Map.under(mgmnfe:uncertainty(), 5))

--printDump("screen", screen)

return (si*screen):plot()