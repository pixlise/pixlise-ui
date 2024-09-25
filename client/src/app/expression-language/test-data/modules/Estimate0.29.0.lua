Estimate = {
  --Estimate objects have expected values (val) and uncertainties,
  --and can be any combination of Maps and scalars. Access expected
  --values as estimate.val and uncertainties as estimate:uncertainty().
  --Create new Estimates as estimate = Estimate:new({val = mu, err = sigma}).

estimateIndex = 0,
nSigma = 2,
quantify = nil,
total = nil,

opMultiply = 1,
opDivide = 2,
opAdd = 3,
opSubtract = 4,
opNegative = 5,
opPow = 6,
opUnion = 7,

getNewEstimateIndex = function ()
  Estimate.estimateIndex = Estimate.estimateIndex + 1
  return Estimate.estimateIndex
end,

uncertainty = function (self)
  local next = next
  if next(self.partial) ~= nil then
    return Map.pow(Estimate.norm(self.partial), 0.5)
  end
end,

plot = function (self, flags)
  local result = nil
  if flags and flags.nilCutoff ~= nil and flags.nilCutoff == true then
    result = self:nilIfZero()
  else
    result = self:nilIfNaN()
  end
  return result
end,

opWithEstimates = function (l, r, op)
  local newVal = {}
  local leftPartial = {}
  local rightPartial = {}
  local newPartial = {}
  local newEstimate = {}
  
  if op == Estimate.opMultiply then
    if type(l.val) == "table" or type(r.val) == "table" then
      newVal = Map.mul(l.val, r.val)
    else
      newVal = l.val*r.val
    end
    for k, v in pairs(l.partial) do
      if type(v) == "table" or type(r.val) == "table" then
        leftPartial[k] = Map.mul(v, r.val)
      else
        leftPartial[k] = v*r.val
      end
    end
    for k, v in pairs(r.partial) do
      if type(v) == "table" or type(l.val) == "table" then
        rightPartial[k] = Map.mul(l.val, v)
      else
        rightPartial[k] = l.val*v
      end
    end
    
  elseif op == Estimate.opDivide then
    if type(l.val) == "table" or type(r.val) == "table" then
      newVal = Map.div(l.val, r.val)
    else
      newVal = l.val/r.val
    end
    for k, v in pairs(l.partial) do
      if type(v) == "table" or type(r.val) == "table" then
        leftPartial[k] = Map.div(v, r.val)
      else
        leftPartial[k] = v/r.val
      end
    end
    for k, v in pairs(r.partial) do
      if type(v) == "table" or type(l.val) == "table" and type(r.val) == "table" then
        rightPartial[k] = Map.sub(0, Map.div(Map.mul(l.val, v), Map.pow(r.val, 2)))
      elseif type(v) == "table" or type(l.val) == "table" then
        rightPartial[k] = Map.sub(0, Map.div(Map.mul(l.val, v), (r.val)^2))
      elseif type(r.val) == "table" then
        rightPartial[k] = Map.sub(0, Map.div(l.val*v, Map.pow(r.val, 2)))
      else
        rightPartial[k] = -l.val*v/(r.val)^2
      end
    end
    
  elseif op == Estimate.opAdd then
    if type(l.val) == "table" or type(r.val) == "table" then
      newVal = Map.add(l.val, r.val)
    else
      newVal = l.val + r.val
    end
    for k, v in pairs(l.partial) do
      leftPartial[k] = v
    end
    for k, v in pairs(r.partial) do
      rightPartial[k] = v
    end
    
  elseif op == Estimate.opSubtract then
    if type(l.val) == "table" or type(r.val) == "table" then
      newVal = Map.sub(l.val, r.val)
    else
      newVal = l.val - r.val
    end
    for k, v in pairs(l.partial) do
      leftPartial[k] = v
    end
    for k, v in pairs(r.partial) do
      if type(v) == "table" then
        rightPartial[k] = Map.sub(0, v)
      else
        rightPartial[k] = -v
      end
    end
    
  elseif op == Estimate.opNegative then
    if type(l.val) == "table" then
      newVal = Map.sub(0, l.val)
    else
      newVal = -l.val
    end
    for k, v in pairs(l.partial) do
      if type(v) == "table" then
        leftPartial[k] = Map.sub(0, v)
      else
        leftPartial[k] = -v
      end
    end
    
  elseif op == Estimate.opPow then
    if type(l.val) == "table" then
      newVal = Map.pow(l.val, r.val)
    else
      newVal = l.val^r.val
    end
    for k, v in pairs(l.partial) do
      if type(v) == "table" and type(l.val) == "table" then
        leftPartial[k] = Map.mul(Map.mul(r.val, v), Map.pow(l.val, r.val - 1))
      elseif type(l.val) == "table" then
        leftPartial[k] = Map.mul(v*r.val, Map.pow(l.val, r.val - 1))
      elseif type(v) == "table" then
        leftPartial[k] = Map.mul(v, r.val*l.val^(r.val - 1))
      else
        leftPartial[k] = v*r.val*l.val^(r.val - 1)
      end
    end
  
  elseif op == Estimate.opUnion then
    if  Estimate.isScalar(l) and Estimate.isScalar(r) then
      assert(false, "Union isn't defined on two scalars")
    else
      newVal = Map.UNION(l.val, r.val)
      local leftZero = makeMap(0)
      local rightZero = makeMap(0)
      if Estimate.isMap(l.val) then leftZero = Map.mul(0, l.val) end
      if Estimate.isMap(r.val) then rightZero = Map.mul(0, r.val) end
      for k, v in pairs(l.partial) do
        leftPartial[k] = Map.UNION(rightZero, v)
      end
      for k, v in pairs(r.partial) do
        rightPartial[k] = Map.UNION(leftZero, v)
      end
    end

  else
    assert(false, "opWithEstimates: Unrecognized operation")
  end
  
  if r then
    newPartial = Estimate.combine(leftPartial, rightPartial)
  else
    newPartial = leftPartial
  end
  newEstimate.val = newVal
  newEstimate.partial = newPartial
  return Estimate:new(newEstimate)
end,

opWithKnown = function (l, r, op)
  local newVal = {}
  local newPartial = {}
  local newEstimate = {}
  
  local leftKnown = Estimate.isKnown(l)
  
  if op == Estimate.opMultiply then
    if leftKnown then
      if type(r.val) == "table" or type(l) == "table" then
        newVal = Map.mul(l, r.val)
      else
        newVal = l*r.val
      end
      for k, v in pairs(r.partial) do
        if type(v) == "table" or type(l) == "table" then
          newPartial[k] = Map.mul(l, v)
        else
          newPartial[k] = l*v
        end
      end
    else
      if type(l.val) == "table" or type(r) == "table" then
        newVal = Map.mul(l.val, r)
      else
        newVal = l.val*r
      end
      for k, v in pairs(l.partial) do
        if type(v) == "table" or type(r) == "table" then
          newPartial[k] = Map.mul(v, r)
        else
          newPartial[k] = v*r
        end
      end
    end

  elseif op == Estimate.opDivide then
    if leftKnown then
      if type(r.val) == "table" or type(l) == "table" then
        newVal = Map.div(l, r.val)
      else
        newVal = l/r.val
      end
      for k, v in pairs(r.partial) do
        if type(v) == "table" or type(l) == "table" and type(r.val) == "table" then
          newPartial[k] = Map.sub(0, Map.div(Map.mul(l, v), Map.pow(r.val, 2)))
        elseif type(v) == "table" or type(l) == "table" then
          newPartial[k] = Map.div(Map.mul(-l, v), r.val^2)
        elseif type(r.val) == "table" then
          newPartial[k] = Map.div(-l*v, Map.pow(r.val, 2))
        else
          newPartial[k] = -l*v/r.val^2
        end
      end
    else
      if type(l.val) == "table" or type(r) == "table" then
        newVal = Map.div(l.val, r)
      else
        newVal = l.val/r
      end
      for k, v in pairs(l.partial) do
        if type(v) == "table" or type(r) == "table" then
          newPartial[k] = Map.div(v, r)
        else
          newPartial[k] = v/r
        end
      end
    end
    
  elseif op == Estimate.opAdd then
    if leftKnown then
      if type(r.val) == "table" or type(l) == "table" then
        newVal = Map.add(l, r.val)
      else
        newVal = l + r.val
      end
      for k, v in pairs(r.partial) do
        newPartial[k] = v
      end
    else
      if type(l.val) == "table" or type(r) == "table" then
        newVal = Map.add(l.val, r)
      else
        newVal = l.val + r
      end
      for k, v in pairs(l.partial) do
        newPartial[k] = v
      end
    end
    
  elseif op == Estimate.opSubtract then
    if leftKnown then
      if type(r.val) == "table" or type(l) == "table" then
        newVal = Map.sub(l, r.val)
      else
        newVal = l - r.val
      end
      for k, v in pairs(r.partial) do
        if type(v) == "table" then
          newPartial[k] = Map.sub(0, v)
        else
          newPartial[k] = -v
        end
      end
    else
      if type(l.val) == "table" or type(r) == "table" then
        newVal = Map.sub(l.val, r)
      else
        newVal = l.val - r
      end
      for k, v in pairs(l.partial) do
        if type(v) == "table" then
          newPartial[k] = Map.sub(0, v)
        else
          newPartial[k] = -v
        end
      end
    end
    
  elseif op == Estimate.opPow then
    if type(l.val) == "table" then
      newVal = Map.pow(l.val, r)
    else
      newVal = l.val^r
    end
    for k, v in pairs(l.partial) do
      if type(v) == "table" and type(l.val) == "table" then
        newPartial[k] = Map.mul(Map.mul(r, v), Map.pow(l.val, r - 1))
      elseif type(l.val) == "table" then
        newPartial[k] = Map.mul(v*r, Map.pow(l.val, r - 1))
      elseif type(v) == "table" then
        newPartial[k] = Map.mul(v, r*l.val^(r - 1))
      else
        newPartial[k] = v*r*l.val^(r - 1)
      end
    end
    
  elseif op == Estimate.opUnion then
    if Estimate.isScalar(l) and Estimate.isScalar(r) then
      assert(false, "Union isn't defined on two scalars")
    elseif leftKnown then
      newVal = Map.UNION(l, r.val)
      local leftZero = makeMap(0)
      for k, v in pairs(r.partial) do
        newPartial[k] = Map.UNION(leftZero, v)
      end
    else
      newVal = Map.UNION(l.val, r)
      local rightZero = makeMap(0)
      for k, v in pairs(l.partial) do
        newPartial[k] = Map.UNION(v, rightZero)
      end
    end

  else
    assert(false, "opWithKnown: Unrecognized operation")
  end
  
  newEstimate.val = newVal
  newEstimate.partial = newPartial
  return Estimate:new(newEstimate)
end,

__add = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opAdd)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opAdd)
  else
    assert(false, "Attempting to add something that is not an Estimate, Map, or number.")
  end
end,

__sub = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opSubtract)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opSubtract)
  else
    assert(false, "Attempting to subtract something that is not an Estimate, Map, or number.")
  end
end,

__mul = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opMultiply)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opMultiply)
  else
    assert(false, "Attempting to multiply something that is not an Estimate, Map, or number.")
  end
end,

__div = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opDivide)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opDivide)
  else
    assert(false, "Attempting to divide something that is not an Estimate, Map, or number.")
  end
end,

__unm = function (op)
  return Estimate.opWithEstimates(op, nil, Estimate.opNegative)
end,

__pow = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opPow)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opPow)
  else
    assert(false, "Attempting to raise something that is not an Estimate, Map, or number.")
  end
end,

union = function (op1, op2)
  if Estimate.isEstimate(op1) and Estimate.isEstimate(op2) then
    return Estimate.opWithEstimates(op1, op2, Estimate.opUnion)
  elseif Estimate.isKnown(op1) or Estimate.isKnown(op2) then
    return Estimate.opWithKnown(op1, op2, Estimate.opUnion)
  else
    assert(false, "Attempting to take a union with somehtin that is not an Estimate, Map, or number.")
  end
end,

suchThat = function (self, op1, relation, op2)
  return self*relation(op1, op2)
end  
}

Estimate.mapper = {}
Estimate.mapper["Na"] = {name = "Na", weight = {Na2O = 2}}
Estimate.mapper["Na2O"] = {name = "Na2O", weight = {Na2O = 1}}
Estimate.mapper["Mg"] = {name = "Mg", multiquant = true, weight = {MgO = 1, MgCO3 = 1}}
Estimate.mapper["MgT"] = {name = "Mg", multiquant = true, weight = {MgO = 1, MgCO3 = 1}}
Estimate.mapper["MgO"] = {name = "MgO", weight = {MgO = 1}}
Estimate.mapper["MgCO3"] = {name = "MgCO3", multiquant = true, weight = {MgCO3 = 1}}
Estimate.mapper["Al"] = {name = "Al", weight = {Al2O3 = 2}}
Estimate.mapper["Al2O3"] = {name = "Al2O3", weight = {Al2O3 = 1}}
Estimate.mapper["Si"] = {name = "Si", weight = {SiO2 = 1}}
Estimate.mapper["SiO2"] = {name = "SiO2", weight = {SiO2 = 1}}
Estimate.mapper["P"] = {name = "P", weight = {P2O5 = 2}}
Estimate.mapper["P2O5"] = {name = "P2O5", weight = {P2O5 = 1}}
Estimate.mapper["Cl"] = {name = "Cl", weight = {Cl = 1}}
Estimate.mapper["S"] = {name = "S", weight = {SO3 = 1}}
Estimate.mapper["SO3"] = {name = "SO3", weight = {SO3 = 1}}
Estimate.mapper["K"] = {name = "K", weight = {K2O = 2}}
Estimate.mapper["K2O"] = {name = "K2O", weight = {K2O = 1}}
Estimate.mapper["Ca"] = {name = "Ca", multiquant = true, weight = {CaO = 1, CaCO3 = 1}}
Estimate.mapper["CaT"] = {name = "Ca", multiquant = true, weight = {CaO = 1, CaCO3 = 1}}
Estimate.mapper["CaO"] = {name = "CaO", weight = {CaO = 1}}
Estimate.mapper["CaCO3"] = {name = "CaCO3", weight = {CaCO3 = 1}}
Estimate.mapper["Ti"] = {name = "Ti", weight = {TiO2 = 1}}
Estimate.mapper["TiO2"] = {name = "TiO2", weight = {TiO2 = 1}}
Estimate.mapper["Cr"] = {name = "Cr", weight = {Cr2O3 = 2}}
Estimate.mapper["Cr2O3"] = {name = "Cr2O3", weight = {Cr2O3 = 1}}
Estimate.mapper["Mn"] = {name = "Mn", multiquant = true, weight = {MnO = 1, MnCO3 = 1}}
Estimate.mapper["MnT"] = {name = "Mn", multiquant = true, weight = {MnO = 1, MnCO3 = 1}}
Estimate.mapper["MnO"] = {name = "MnO", weight = {MnO = 1}}
Estimate.mapper["MnCO3"] = {name = "MnCO3", weight = {MnCO3 = 1}}
Estimate.mapper["Fe"] = {name = "Fe", multiquant = true, weight = {FeO = 1, FeCO3 = 1}}
Estimate.mapper["FeT"] = {name = "Fe", multiquant = true, weight = {FeO = 1, FeCO3 = 1}}
Estimate.mapper["FeO"] = {name = "FeO", weight = {FeO = 1}}
Estimate.mapper["FeCO3"] = {name = "FeCO3", weight = {FeCO3 = 1}}
Estimate.mapper["Ni"] = {name = "Ni", weight = {Ni = 1}}
Estimate.mapper["NiO"] = {name = "NiO", weight = {NiO = 1}}
Estimate.mapper["Zn"] = {name = "Zn", weight = {Zn = 1}}
Estimate.mapper["ZnO"] = {name = "ZnO", weight = {ZnO = 1}}
Estimate.mapper["Ge"] = {name = "Ge", weight = {Ge = 1}}
Estimate.mapper["GeO2"] = {name = "GeO2", weight = {GeO2 = 1}}
Estimate.mapper["As"] = {name = "As", weight = {As = 1}}
Estimate.mapper["As2O3"] = {name = "As2O3", weight = {As2O3 = 1}}
Estimate.mapper["Rb"] = {name = "Rb", weight = {Rb = 1}}
Estimate.mapper["Rb2O"] = {name = "Rb2O", weight = {Rb2O = 1}}
Estimate.mapper["Sr"] = {name = "Sr", weight = {Sr = 1}}
Estimate.mapper["SrO"] = {name = "SrO", weight = {SrO = 1}}
Estimate.mapper["Zr"] = {name = "Zr", weight = {ZrO2 = 1}}
Estimate.mapper["ZrO2"] = {name = "ZrO2", weight = {ZrO2 = 1}}
Estimate.mapper["Y"] = {name = "Y", weight = {Y = 1}}
Estimate.mapper["Y2O3"] = {name = "Y2O3", weight = {Y2O3 = 1}}
Estimate.mapper["Br"] = {name = "Br", weight = {Br = 1}}
Estimate.mapper["Rh_shoulder"] = {name = "Rh_shoulder", weight = {Rh_shoulder = 1}}
Estimate.mapper["Cr_bckgd"] = {name = "Cr_bckgd", weight = {Cr_bckgd = 1}}
Estimate.mapper["HighE"] = {
name = "HighE",
weight = {
  HighE1 = 1/8,
  HighE2 = 1/8,
  HighE3 = 1/8,
  HighE4 = 1/8,
  HighE5 = 1/8,
  HighE6 = 1/8,
  HighE7 = 1/8,
  HighE8 = 1/8
}
}

Estimate.allElements = {"Na2O", "MgT", "Al2O3", "SiO2", "P2O5", "Cl", "SO3", "K2O", "CaT", "TiO2", "Cr2O3", "MnT", "FeT", "NiO", "ZnO", "Rb2O", "SrO", "ZrO2", "Y2O3", "Br", "Rh_shoulder", "HighE"}

Estimate.units = {}
Estimate.units["mmol/g"] = "mmol"
Estimate.units["mmol"] = "mmol"
Estimate.units["%-as-mmol"] = "mmol"
Estimate.units["wt"] = "wt"
Estimate.units["wt%"] = "wt"
Estimate.units["%"] = "wt"

-- Removes PMCs with 0 value
-- Useful for map overlays of sparse things
function Estimate:nilIfZero()
local PMCs = {}
local values = {}
for i, v in ipairs(self.val[2]) do
  if v ~= v or math.abs(v) == math.huge then
    -- v is NaN, so skip it
  elseif v ~= 0 then
    table.insert(PMCs, self.val[1][i])
    table.insert(values, v)
  end
end
return {PMCs, values}
end

-- Removes PMCs with NaN value for plotting and other calculations
function Estimate:nilIfNaN()
local PMCs = {}
local values = {}
for i, v in ipairs(self.val[2]) do
  if v ~= v or math.abs(v) == math.huge then
    -- v is NaN, so skip it
  else
    table.insert(PMCs, self.val[1][i])
    table.insert(values, v)
  end
end
return {PMCs, values}
end

function Estimate.columnName(elmt)
local result = nil
if elmt == "FeO" or elmt == "FeCO3" then
  result = elmt.."-T"
else
  result = elmt
end
return result
end

-- Returns a table of quantified element names and coefficients
--   to obtain valid estimates from the current quantification
--   table.
function Estimate.mapElementToQuant(elmt)
if elmt == "FeO-T" then elmt = "FeO"
elseif elmt == "FeCO3-T" then elmt = "FeCO3"
end
if not Estimate.mapper[elmt] then
  assert(false, "Invalid element name: "..elmt)
else
  local result = Estimate.mapper[elmt]
  for k, v in pairs(result.weight) do
    if not exists("element", Estimate.columnName(k)) and not Locations.backgrounds[k] then
      result.weight[k] = nil
    end
  end
  return result
end
end

function Estimate:new(obj)
local estimate = obj or {}
if obj.quant then
  if not obj.units then
    obj.units = "%-as-mmol"
  end
  estimate = Estimate.quantify(obj.quant, obj.units)
  if Estimate.isEstimate(estimate) then
   return estimate
  end
end
estimate.index = Estimate:getNewEstimateIndex()
if not estimate.val then
  estimate.val = 0
end
if estimate.err then
  estimate.partial = {}
  estimate.partial[estimate.index] = estimate.err
  estimate.err = nil
elseif not estimate.partial then
  estimate.partial = {}
  estimate.partial[estimate.index] = 1
end
setmetatable(estimate, self)
self.__index = self
return estimate
end

Estimate.__index = Estimate

function Estimate.combine(l, r)
local res = {}
for k, v in pairs(l) do
  res[k] = v
end
for k, v in pairs(r) do
  if res[k] then
    if type(res[k]) == "table" or type(v) == "table" then
      res[k] = Map.add(res[k], v)
    else
      res[k] = res[k] + v
    end
  else
    res[k] = v
  end
end
return res
end

function Estimate.norm(partials)
local next = next
local sumSq = {}
for k, v in pairs(partials) do
  if next(sumSq) ~= nil then
    sumSq = Map.add(sumSq, Map.pow(v, 2))
  else
    sumSq = Map.pow(v, 2)
  end
end
return sumSq
end

local function quantifyFrom(detectors, elem, unit)
local conv = true
local obj = 0
if Estimate.units[unit] and Estimate.units[unit] == "wt" then
  unit = "%"
  conv = false
elseif Estimate.units[unit] and Estimate.units[unit] == "mmol" then
  unit = "%-as-mmol"
end
local count = 0
for el, weight in pairs(Estimate.mapElementToQuant(elem).weight) do
  count = count + 1
  local quantPart = 0
  for i, det in ipairs(detectors) do
    local e = Estimate.columnName(el)
    local conversion = 1
    if conv then conversion = 10/atomicMass(e) end
    quantPart = quantPart + Estimate:new({val = element(e, unit, det), err = Map.mul(element(e, "err", det), conversion)})/#detectors
  end
  if count == 1 then
    obj = quantPart
  else
    obj = Estimate.union(obj, quantPart)
  end
end
return obj
end

local function getDetectors()
if exists("detector", "Combined") then
  return {"Combined"}
else
  return {"A", "B"}
end
end

-- Returns a new map whose values are shifted to the values of the next existing PMC
-- m: Map to shift
function Map.shiftOnePMC(m) 
local newVals = {}

-- Move through PMCs and values, assigning each index and value to the previous position
local first = true
local lastIndex = nil
for k, v in ipairs(m[2]) do
  if first == false then
    newVals[lastIndex] = v
  else
    first = false
  end
  lastIndex = k
end
newVals[lastIndex] = 0

return {m[1], newVals}
end

-- Returns a new estimate whose values are shifted to the values of the next existing PMC
function Estimate:shiftOnePMC()
r = 1*self
if Estimate.isMap(r.val) then
  r.val = Map.shiftOnePMC(r.val)
end
for k, v in pairs(r.partial) do
  if Estimate.isMap(v) then
    r.partial[k] = Map.shiftOnePMC(v)
  end
end

return r
end

function Map.UNION(m1, m2)
local PMCs = {}
local values = {}
local leftScalar = type(m1) == "number"
local rightScalar = type(m2) == "number"
if leftScalar and rightScalar then
  assert(false, "Union isn't defined for two scalars")
elseif leftScalar then
  local map1 = makeMap(m1)
  for i, val in ipairs(map1[1]) do
    PMCs[i] = val
    if m2[2][i] == m2[2][i] then
      values[i] = m2[2][i]
    else
      values[i] = m1
    end
  end
elseif rightScalar then
  local map2 = makeMap(m2)
  for i, val in ipairs(map2[1]) do
    PMCs[i] = val
    if m1[2][i] == m1[2][i] then
      values[i] = m1[2][i]
    else
      values[i] = m2
    end
  end
else
  for i, val in ipairs(m1[1]) do
    PMCs[i] = val
    if m1[2][i] == m1[2][i] then
      values[i] = m1[2][i]
    else
      values[i] = m2[2][i]
    end
  end
end
return {PMCs, values}
end

function quantifyUsingDetector(det)
if det == "Average" and exists("detector", "A") then
  Estimate.quantify = function(elem, units) return quantifyFrom({"A", "B"}, elem, units) end
elseif exists("detector", det) then
  Estimate.quantify = function(elem, units) return quantifyFrom({det}, elem, units) end
else
  assert(false, "Detector "..det.." is not available. Please check your quantification.")
end
end

local function sumQuantify(elmtList)
local result = 0
for i, el in ipairs(elmtList) do
  if Estimate.totalWithUnions then
    result = result + Estimate.union(Estimate:new({quant = el, units = "wt"}), 0)
  else
    result = result + Estimate:new({quant = el, units = "wt"})
  end
end
return result
end

local function getElmtList()
local result = {}
local tryList = {
  "Na2O", "MgO", "MgCO3", "Al2O3", "SiO2", "P2O5", "Cl", "SO3", "K2O", "CaO",
  "CaCO3", "TiO2", "BaO", "Cr2O3", "MnO", "MnCO3", "FeO-T", "FeCO3-T", "NiO",
  "CuO", "Br", "Rb2O", "SrO", "ZrO2"
}
for i, el in ipairs(tryList) do
  if exists("element", el) then
    table.insert(result, el)
  end
end
return result
end

Estimate.quantify = function(elem, units) return quantifyFrom(getDetectors(), elem, units) end
Estimate.quantList = getElmtList()
Estimate.totalWithUnions = true
Estimate.total = function() return sumQuantify(Estimate.quantList) end
Estimate.atomicMass = function (elmt) return atomicMass(elmt) end

function Estimate.isEstimate(obj)
return obj and type(obj) == "table" and getmetatable(obj) == Estimate
end

function Estimate.isKnown(obj)
return obj and type(obj) == "number" or Estimate.isMap(obj)
end

function Estimate.isMap(obj)
if obj and type(obj) == "table" then
  if obj[1] and obj[2] and type(obj[1]) == "table" and type(obj[2]) == "table" then
    if #obj[1] == #obj[2] then
      return true
    end
  end
end
return false
end

function Estimate.isScalar(obj)
local scalar = false
if type(obj) == "number" then
  scalar = true
elseif Estimate.isEstimate(obj) and type(obj.val) == "number" then
  scalar = true
  for k, v in pairs(obj.partial) do
    if type(v) ~= "number" then
      scalar = false
      break
    end
  end
end
return scalar
end

function Estimate.isValidCompare(obj)
if type(obj) == "number" then
  return true
elseif Estimate.isMap(obj) then
  return true
elseif Estimate.isEstimate(obj) then
  return true
else
  return false
end
end

function Estimate.isLessThan(l, r)
if not (Estimate.isValidCompare(l) and Estimate.isValidCompare(r)) then
  assert(false, "Comparison to an invalid type")
end
local comp = l - r
local result = 0
local sigma = comp:uncertainty()
local n = l.nSigma or r.nSigma
if Estimate.isScalar(comp) then
  if comp.val < -n*sigma then
    result = 1
  else
    result = 0
  end
else
  if Estimate.isMap(sigma) then
    sigma = Map.mul(sigma, n)
  else
    sigma = makeMap(n*sigma)
  end
  result = Map.add(comp.val, sigma)
  result = Map.under(result, 0)
end
return result
end

function Estimate.isGreaterThan(l, r)
if not (Estimate.isValidCompare(l) and Estimate.isValidCompare(r)) then
  assert(false, "Comparison to an invalid type")
end
local comp = l - r
local result = 0
local sigma = comp:uncertainty()
local n = l.nSigma or r.nSigma
if Estimate.isScalar(comp) then
  if comp.val > n*sigma then
    result = 1
  else
    result = 0
  end
else
  if Estimate.isMap(sigma) then
    sigma = Map.mul(sigma, n)
  else
    sigma = makeMap(n*sigma)
  end
  result = Map.sub(comp.val, sigma)
  result = Map.over(result, 0)
end
return result
end

function Estimate.isAboutEqualTo(l, r)
if not (Estimate.isValidCompare(l) and Estimate.isValidCompare(r)) then
  assert(false, "Comparison to an invalid type")
end
local comp = l - r
local result = 0
local sigma = comp:uncertainty()
local n = l.nSigma or r.nSigma
if Estimate.isScalar(comp) then
  if comp.val <= n*sigma and comp.val >= -n*sigma then
    result = 1
  else
    result = 0
  end
else
  if Estimate.isMap(sigma) then
    sigma = Map.mul(sigma, n)
  else
    sigma = makeMap(n*sigma)
  end
  result = Map.under(Map.sub(comp.val, sigma), 0)
  result = Map.mul(result, Map.over(Map.add(comp.val, sigma), 0))
end
return result
end

function Estimate.isNotLessThan(l, r)
if not (Estimate.isValidCompare(l) and Estimate.isValidCompare(r)) then
  assert(false, "Comparison to an invalid type")
end
local comp = l - r
local result = 0
local sigma = comp:uncertainty()
local n = l.nSigma or r.nSigma
if Estimate.isScalar(comp) then
  if comp.val >= -n*sigma then
    result = 1
  else
    result = 0
  end
else
  if Estimate.isMap(sigma) then
    sigma = Map.mul(sigma, n)
  else
    sigma = makeMap(n*sigma)
  end
  result = Map.add(comp.val, sigma)
  result = Map.over(result, 0)
end
return result
end

function Estimate.isNotGreaterThan(l, r)
if not (Estimate.isValidCompare(l) and Estimate.isValidCompare(r)) then
  assert(false, "Comparison to an invalid type")
end
local comp = l - r
local result = 0
local sigma = comp:uncertainty()
local n = l.nSigma or r.nSigma
if Estimate.isScalar(comp) then
  if comp.val <= n*sigma then
    result = 1
  else
    result = 0
  end
else
  if Estimate.isMap(sigma) then
    sigma = Map.mul(sigma, n)
  else
    sigma = makeMap(n*sigma)
  end
  result = Map.sub(comp.val, sigma)
  result = Map.under(result, 0)
end
return result
end

function Estimate.isBetween(l, range)
if not (Estimate.isValidCompare(l) and type(range) == "table" and Estimate.isValidCompare(range[1]) and Estimate.isValidCompare(range[2])) then
  assert(false, "Comparison to an invalid type")
end
local comp1 = Map.mul(Estimate.isNotGreaterThan(l, range[1]), Estimate.isNotLessThan(l, range[2]))
local comp2 = Map.mul(Estimate.isNotLessThan(l, range[1]), Estimate.isNotGreaterThan(l, range[2]))
local result = Map.add(comp1, comp2)
result = Map.sub(result, Map.mul(comp1, comp2))
return result
end

function Estimate.minVal(l, r)
local mask = Map.under(Map.sub(l.val, r.val), 0)
local result = l*mask + r*Map.NOT(mask)
return result
end

function Estimate.maxVal(l, r)
local mask = Map.over(Map.sub(l.val, r.val), 0)
local result = l*mask + r*Map.NOT(mask)
return result
end

function Estimate.sort(objs, sorted)
local result = {}
if #objs == 0 then
  return sorted
elseif not sorted then
  local newObjs = {}
  for i, v in ipairs(objs) do
    table.insert(newObjs, 1*v)
  end
  local ins = table.remove(newObjs)
  table.insert(result, ins)
  return Estimate.sort(newObjs, result)
else
  local ins = table.remove(objs)
  for i, comp in ipairs(sorted) do
    local temp = 1*ins
    local screen = Map.over(Map.sub(ins.val, comp.val), 0)
    local screenComp = Map.sub(1, screen)
    ins = temp*screen + comp*screenComp
    table.insert(result, temp*screenComp + comp*screen)
    if i == #sorted then table.insert(result, ins) end
  end
  return Estimate.sort(objs, result)
end
end

function Estimate.sortBy(objs, sortOn, sorted, sortedOn)
local newSorted = {}
local newSortedOn = {}
if #sortOn == 0 then
  return sorted
else
  local targetIns = {}
  local guideIns = {}
  if not sorted then
    local newObjs = {}
    local newSortOn = {}
    for i, v in ipairs(objs) do
      table.insert(newObjs, 1*v)
    end
    for i, v in ipairs(sortOn) do
      table.insert(newSortOn, 1*v)
    end
    targetIns = table.remove(newObjs)
    guideIns = table.remove(newSortOn)
    table.insert(newSorted, targetIns)
    table.insert(newSortedOn, guideIns)
    return Estimate.sortBy(newObjs, newSortOn, newSorted, newSortedOn)
  else
    targetIns = table.remove(objs)
    guideIns = table.remove(sortOn)
    for i, comp in ipairs(sortedOn) do
      local targetTemp = 1*targetIns
      local guideTemp = 1*guideIns
      local screen = Map.over(Map.sub(guideIns.val, comp.val), 0)
      local screenComp = Map.sub(1, screen)
      targetIns = targetTemp*screen + sorted[i]*screenComp
      table.insert(newSorted, targetTemp*screenComp + sorted[i]*screen)
      guideIns = guideTemp*screen + comp*screenComp
      table.insert(newSortedOn, guideTemp*screenComp + comp*screen)
      if i == #sortedOn then
        table.insert(newSorted, targetIns)
        table.insert(newSortedOn, guideIns)
      end
    end
    return Estimate.sortBy(objs, sortOn, newSorted, newSortedOn)
  end
end
end

function Estimate.mean(objs, flags)
local result = nil
if flags and flags.central then
  local start = math.floor(#objs*0.5*(1 - flags.central))
  local stop = math.ceil(#objs*0.5*(1 + flags.central))
  -- objs = Estimate.sort(objs)
  objs = {table.unpack(objs, start, stop)}
end
for i, v in ipairs(objs) do
  if not result then
    result = v
  else
    result = result + v
  end
end
if Estimate.isEstimate(result) then result = result/#objs end
return result
end

function Estimate.sum(objs, flags)
if not (objs and #objs > 0) then assert(false, "Trying to sum an empty list") end
local result = nil
local N = #objs
if flags and flags.central then
  local start = math.floor(N*0.5*(1 - flags.central))
  local stop = math.ceil(N*0.5*(1 + flags.central))
  -- objs = Estimate.sort(objs)
  objs = {table.unpack(objs, start, stop)}
end
for i, v in ipairs(objs) do
  if not result then
    result = v
  else
    result = result + v
  end
end
return result
end

function Estimate.sin(obj)
newVal = {}
newPartial = {}
if type(obj.val) == "number" then
  newVal = math.sin(obj.val)
else
  newVal = Map.sin(obj.val)
end
for k, v in pairs(obj.partial) do
  if type(v) == "number" and type(obj.val) == "number" then
    newPartial[k] = v*math.cos(obj.val)
  else
    newPartial[k] = Map.mul(v, Map.cos(obj.val))
  end
end
return Estimate:new({val = newVal, partial = newPartial})
end

function Estimate.cos(obj)
newVal = {}
newPartial = {}
if type(obj.val) == "number" then
  newVal = math.cos(obj.val)
else
  newVal = Map.cos(obj.val)
end
for k, v in pairs(obj.partial) do
  if type(v) == "number" and type(obj.val) == "number" then
    newPartial[k] = -v*math.sin(obj.val)
  else
    newPartial[k] = Map.sub(0, Map.mul(v, Map.sin(obj.val)))
  end
end
return Estimate:new({val = newVal, partial = newPartial})
end

function Estimate.tan(obj)
newVal = {}
newPartial = {}
if type(obj.val) == "number" then
  newVal = math.tan(obj.val)
else
  newVal = Map.tan(obj.val)
end
for k, v in pairs(obj.partial) do
  if type(v) == "number" and type(obj.val) == "number" then
    newPartial[k] = v*(1/math.cos(obj.val))^2
  else
    newPartial[k] = Map.div(v, Map.pow(Map.cos(obj.val), 2))
  end
end
return Estimate:new({val = newVal, partial = newPartial})
end

function Estimate.atan(obj)
newVal = {}
newPartial = {}
if type(obj.val) == "number" then
  newVal = math.atan(obj.val)
else
  newVal = Map.atan(obj.val)
end
for k, v in pairs(obj.partial) do
  if type(v) == "number" and type(obj.val) == "number" then
    newPartial[k] = v/(1 + obj.val^2)
  elseif type(v) == "number" then
    newPartial[k] = Map.div(v, Map.add(1, Map.pow(obj.val, 2)))
  elseif type(obj.val) == "number" then
    newPartial[k] = Map.div(v, 1 + obj.val^2)
  else
    newPartial[k] = Map.div(v, Map.add(1, Map.pow(obj.val, 2)))
  end
end
return Estimate:new({val = newVal, partial = newPartial})
end

function Estimate.ln(obj)
newVal = {}
newPartial = {}
if type(obj.val) == "number" then
  newVal = math.ln(obj.val)
else
  newVal = Map.ln(obj.val)
end
for k, v in pairs(obj.partial) do
  if type(v) == "number" and type(obj.val) == "number" then
    newPartial[k] = v/obj.val
  else
    newPartial[k] = Map.div(v, obj.val)
  end
end
return Estimate:new({val = newVal, partial = newPartial})
end

-- Returns the weighted average that minimizes the resulting uncertainty
-- X = table of Estimates to average
-- W = optional table of Maps with weights for Xs
function Estimate.minVarianceAverage(X, W)
local weightsProvided = (W ~= nil)
local uncertaintiesSq = {}
  for i, x in ipairs(X) do
      table.insert(uncertaintiesSq, Map.pow(x:uncertainty(), 2))
  end

  local sumWeights = {}
  local denominator = makeMap(0)
  for i, x in ipairs(X) do
      local product = makeMap(1)
      if weightsProvided then
        product = W[i]
      end
      for j, sigmaSq in ipairs(uncertaintiesSq) do
        if j ~= i then
          local w = makeMap(1)
          if weightsProvided then
            w = Map.OR(Map.over(W[j], 0), Map.under(W[j], 0))
          end
          local multiplicand = Map.add(Map.mul(sigmaSq, w), Map.NOT(w))
          product = Map.mul(product, multiplicand)
        end
      end
      denominator = Map.add(denominator, product)
      table.insert(sumWeights, product)
  end

  local result = 0
  denominator = Estimate.safeDenominator(denominator)
  for i, x in ipairs(X) do
      result = result + sumWeights[i]*x/denominator
      assert(Estimate.isEstimate(x), "The "..i.."th term failed to produce an Estimate")
  end

  return result
end

-- Returns a table of ratios proportional to Estimates listed in X, protecting against division by 0
-- If all Xs are 0, all entried in returned table will be 0
function Estimate.safeProportions(X)
local denominator = Estimate.sum(X)
denominator = Estimate.safeDenominator(denominator)
local result = {}
for i, x in ipairs(X) do
  table.insert(result, x/denominator)
end

return table.unpack(result)
end

-- Returns x or 1 if x = 0
function Estimate.safeDenominator(x)
if Estimate.isMap(x) then
  return Map.add(x, Map.NOT(Map.OR(Map.over(x, 0), Map.under(x, 0))))
elseif Estimate.isEstimate(x) then
  return x + Map.NOT(Map.OR(Map.over(x.val, 0), Map.under(x.val, 0)))
elseif type(x) == "number" then
  if x == 0 then return 1
  else return x end
else
  assert(false, "Not a numerical data type")
end
end

return Estimate