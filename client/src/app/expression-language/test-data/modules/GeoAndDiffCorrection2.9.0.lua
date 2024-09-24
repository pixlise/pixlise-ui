GeoAndDiffCorrection = {
    e0 = {},
    lowerFluorEps = {},
    upperFluorEps = {},
    e0IsGood = {},
    guidePeakEps = {},
    correctionsSetUp = false,
    correctedElmt = {},
  
    phi0 = 0.3491,
    xmin = 1,
    xmax = 100,
    xDiff = Estimate:new({val = 12, err = 4}),
    guidePeaks = {"Mg", "Si", "S", "Ca", "Mn", "Fe"}, -- Must be listed in increasing order of largest diffraction peak location
    channelSlopeOffset = Estimate:new({val = 0, err = 2}),
    eSmall = 0.05,
    useMLDiffractionForBaseline = true,
    patchDetectorBLivetime = true,
    BLivetimeParams = {
      detectorSensitivity = 646000,
      sigmaThreshold = 100
    },
  
    reverseMapper = {
      Na = "Na",
      Na2O = "Na",
      Mg = "Mg",
      MgO = "Mg",
      MgCO3 = "Mg",
      Al = "Al",
      Al2O3 = "Al",
      Si = "Si",
      SiO2 = "Si",
      P = "P",
      P2O5 = "P",
      Cl = "Cl",
      S = "S",
      SO3 = "S",
      K = "K",
      K2O = "K",
      Ca = "Ca",
      CaO = "Ca",
      CaCO3 = "Ca",
      Ti = "Ti",
      TiO2 = "Ti",
      Cr = "Cr",
      Cr2O3 = "Cr",
      Mn = "Mn",
      MnO = "Mn",
      MnCO3 = "Mn",
      Fe = "Fe",
      FeO = "Fe",
      FeCO3 = "Fe",
      Ni = "Ni",
      NiO = "Ni",
      Zn = "Zn",
      ZnO = "Zn",
      Ge = "Ge",
      GeO2 = "Ge",
      As = "As",
      As2O3 = "As",
      Br = "Br",
      Rb = "Rb",
      Rb2O = "Rb",
      Sr = "Sr",
      SrO = "Sr",
      SrCO3 = "Sr",
      Y2O3 = "Y",
      Y = "Y",
      Zr = "Zr",
      ZrO2 = "Zr",
      Rh_shoulder = "Rh_shoulder",
      Cr_bckgd = "Cr_bckgd",
      HighE1 = "HighE1",
      HighE2 = "HighE2",
      HighE3 = "HighE3",
      HighE4 = "HighE4",
      HighE5 = "HighE5",
      HighE6 = "HighE6",
      HighE7 = "HighE7",
      HighE8 = "HighE8"
    },
    correctable = {"Na2O", "MgT", "Al2O3", "SiO2", "P2O5", "Cl", "SO3", "K2O", "CaT", "TiO2", "Cr2O3", "MnT", "FeT"},
  
    dip = function (self)
      return Estimate.atan(self.e0/math.tan(self.phi0))*180/3.1416
    end
  }
  
  local function fixMap(m, val)
    pmcs = makeMap(0)[1]
    vals = {}
    for k, pmc in ipairs(pmcs) do
      local newVal = Map.getPMCValue(m, pmc)
      if newVal ~= nil then
        table.insert(vals, newVal)
      else
        table.insert(vals, val)
      end
    end
    return {pmcs, vals}
  end
  
  function GeoAndDiffCorrection:DetBLivetimeDiscrepancy()
    local deltaT = Map.sub(data("livetime", "B"), data("livetime", "A"))
    local predictedDeltaCount = Map.mul(deltaT, -self.BLivetimeParams.detectorSensitivity)
    local ACount = GeoAndDiffCorrection.counts(1, 4246, "A")
    local BCount = GeoAndDiffCorrection.counts(1, 4246, "B")
    local deltaCount = BCount - ACount
    deltaCount.nSigma = self.BLivetimeParams.sigmaThreshold
    local looksFine = deltaCount:isAboutEqualTo(predictedDeltaCount)
  
    return Map.NOT(looksFine)
  end
  
  function GeoAndDiffCorrection:adjustForLivetimeDiscrepancy()
    local ATime = data("livetime", "A")
    local BTime = data("livetime", "B")
    local ACount = GeoAndDiffCorrection.counts(1, 4246, "A")
    local BCount = GeoAndDiffCorrection.counts(1, 4246, "B")
  
    local predictedDeltaCount = Map.mul(Map.sub(BTime, ATime), 
                                        -self.BLivetimeParams.detectorSensitivity)
    local deltaCount = BCount - ACount
    deltaCount.nSigma = self.BLivetimeParams.sigmaThreshold
    local BLooksFine = deltaCount:isAboutEqualTo(predictedDeltaCount)
    local screen = Map.NOT(BLooksFine)
  
    local adjustmentFactor = BTime/((-deltaCount/self.BLivetimeParams.detectorSensitivity) + ATime)
    adjustmentFactor = adjustmentFactor*screen
    adjustmentFactor = adjustmentFactor + BLooksFine
  
    return adjustmentFactor
  end
  
  function GeoAndDiffCorrection:correctedElement(elmt, unit)
    if not self.correctedElmt[elmt] then
      self:correctQuants({elmt})
    end
    
    local result = 0
    local count = 0
    for k, v in pairs(self.correctedElmt[elmt]) do
      count = count + 1
      local weight = 1
      if unit and Estimate.units[unit] == "wt" then
        weight = atomicMass(Estimate.columnName(k))/10
      end
      if count == 1 then
        result = weight*v.correctedAbundance
      else
        result = Estimate.union(result, weight*v.correctedAbundance)
      end
    end
    assert(count > 0, "Didn't return correctedElmt:"..elmt)
    return result
  end
  
  function GeoAndDiffCorrection:atomicMass(elmt)
    if not self.correctedElmt[elmt] then
      self:correctQuants({elmt})
    end
    
    local result = 0
    local count = 0
    for k, v in pairs(self.correctedElmt[elmt]) do
      count = count + 1
      local weight = atomicMass(Estimate.columnName(k))
      -- Make a Map that is equal to 1 everywhere that v is defined
      local elmtOne = Map.add(1, Map.mul(0, (v.correctedAbundance).val))
      if count == 1 then
        result = Map.mul(weight, elmtOne)
      else
        result = Map.UNION(result, weight)
      end
    end
    return result
  end
  
  local function mapQuantToElement(quantName)
    local elmt = GeoAndDiffCorrection.reverseMapper[quantName]
    if not elmt then
      assert(false, "Don't know how to quantify "..quantName)
    else
      return elmt
    end
  end
  
  function GeoAndDiffCorrection.expectedEps(self, elmt)
    local midpoint = 0
    if Locations.backgrounds[elmt] then
      midpoint = 0.5*(Locations.backgrounds[elmt].start + Locations.backgrounds[elmt].stop)
    else
      midpoint = 0.5*(Locations.mainPeaks[elmt].start + Locations.mainPeaks[elmt].stop)
    end
    local peakLocations = {}
    local expected = {}
    for i, peak in ipairs(self.guidePeaks) do
      table.insert(peakLocations, 0.5*(Locations.mainPeaks[peak].start + Locations.mainPeaks[peak].stop))
      table.insert(expected, self.guidePeakEps[peak])
    end
  
    local result = nil
    if midpoint <= peakLocations[1] then result = expected[1] end
    for i, left in ipairs(peakLocations) do
      if i < #peakLocations then
        local right = peakLocations[i + 1]
        if midpoint > left and midpoint <= right then
          result = expected[i] + (expected[i + 1] - expected[i])*(midpoint - left)/(right - left)
          return result
        end
      elseif midpoint > i then
        result = expected[i]
      end
    end
    return result
  end
  
  function GeoAndDiffCorrection:new(options)
    local correction = {}
    setmetatable(correction, self)
    self.__index = self
    if options then
      if options.setInstrument then -- Set configuration parameters for different instruments
        if options.setInstrument == 'SBU_breadboard' then
          self.phi0 = 0.8378
        end
      end
    end
    self:setGeometry()
    return correction
  end
  
  function GeoAndDiffCorrection.counts(cs, cf, det)
    assert(cf - cs > 0, "Attempting to call spectrum from "..cs.."to "..cf)
    local newVal = spectrum(cs, cf, det)
    local newErr = Map.pow(newVal, 0.5)
    return Estimate:new({val = newVal, err = newErr})
  end
  
  function GeoAndDiffCorrection.e0From(eps, x)
    local cos_phi0 = math.cos(GeoAndDiffCorrection.phi0)
    local e_small = GeoAndDiffCorrection.eSmall
    local sign = Map.sub(Map.over(eps.val, 0), Map.under(eps.val, 0))
    local eps_small = Map.AND(Map.under(eps.val, e_small), Map.over(eps.val, -1*e_small))
    local est = -x/(2*cos_phi0*(eps + eps_small)) + sign*((x/(2*cos_phi0*(eps + eps_small)))^2 + x/cos_phi0 + 1)^0.5
    est = Map.NOT(eps_small)*est + eps_small*eps*(cos_phi0 + x)/x
    return est
  end
  
  function Map.AND(m1, m2)
    return Map.mul(m1, m2)
  end
  
  function Map.OR(m1, m2)
    return Map.sub(Map.add(m1, m2), Map.AND(m1, m2))
  end
  
  function Map.NOT(m)
    return Map.sub(1, m)
  end
  
  function GeoAndDiffCorrection.estimateGeometryFromHighE(self)
    local eps = {}
    local diff = {}
    local total = {}
    local containsDiffractionPeaks = {}
    local highE = Locations.getHighE()
    for k, interval in pairs(highE) do
      local start = interval.start
      local stop = interval.stop
      local A = GeoAndDiffCorrection.counts(start, stop, "A")
      local B = GeoAndDiffCorrection.counts(start, stop, "B")
      table.insert(eps, (A - B)/Estimate.safeDenominator(A + B))
      table.insert(diff, A - B)
      table.insert(total, A + B)
      table.insert(containsDiffractionPeaks, Map.over(diffractionPeaks(start, stop), 0))
    end
    local sortedDiff = Estimate.sortBy(diff, eps)
    local sortedTotal = Estimate.sortBy(total, eps)
    local ei = Estimate.sum(sortedDiff, {central = 0.5})/Estimate.safeDenominator(Estimate.sum(sortedTotal, {central = 0.5}))
    local goodIntervals = makeMap(0)
    for i, delta in ipairs(diff) do
      local sum = total[i]
      delta.nSigma = 1
      diff[i] = delta:suchThat(delta, Estimate.isAboutEqualTo, ei*sum)
      total[i] = sum:suchThat(delta, Estimate.isAboutEqualTo, ei*sum)
      if useMLDiffractionForBaseline then
        diff[i] = diff[i]*containsDiffractionPeaks[i]
      end
      goodIntervals = Map.add(goodIntervals, Map.over(total[i].val, 0))
    end
    local detectorDifference = Estimate.sum(diff)
    local detectorTotal = Estimate.sum(total)
    ei = detectorDifference/(detectorTotal + Map.NOT(Map.over(goodIntervals, 0))) -- Preventing div by 0
    self.e0 = GeoAndDiffCorrection.e0From(ei, 1)
    self.e0IsGood = Map.AND(Map.over(goodIntervals, 6), Map.AND(Map.AND(Map.over(detectorTotal.val, 2000), Map.over((detectorTotal + detectorDifference).val, 200)), Map.over((detectorTotal - detectorDifference).val, 200)))
  end
  
  function GeoAndDiffCorrection.estimateGeometryFromFeCaSi(self)
    local e0 = self.e0
    local lowerFluorEps = Estimate.minVal(e0*self.xmin/(self.xmin + 1 - e0^2), e0*self.xmax/(self.xmax + 1 - e0^2))
    local upperFluorEps = Estimate.maxVal(e0*self.xmin/(self.xmin + 1 - e0^2), e0*self.xmax/(self.xmax + 1 - e0^2))
    local peaks = {"Ca_Ka", "Ca_Kb", "Fe_Ka", "Fe_Kb", "Si_K"}
    local countStats = {}
    local keepE0 = self.e0IsGood
  
    for i, peak in ipairs(peaks) do
      countStats[peak] = {}
      local start = Locations.diffractionBaselines[peak].start
      local stop = Locations.diffractionBaselines[peak].stop
      local A = GeoAndDiffCorrection.counts(start, stop, "A")
      local B = GeoAndDiffCorrection.counts(start, stop, "B")
      countStats[peak].delta = A - B
      countStats[peak].delta.nSigma = 1
      countStats[peak].total = A + B
    end
  
    local compFeDelta = (countStats["Fe_Ka"].delta/(Estimate.safeDenominator(countStats["Fe_Ka"].total)))*countStats["Fe_Kb"].total
    local compCaDelta = (countStats["Ca_Ka"].delta/(Estimate.safeDenominator(countStats["Ca_Ka"].total)))*countStats["Ca_Kb"].total
    local useFe = Estimate.isAboutEqualTo(countStats["Fe_Kb"].delta, compFeDelta)
    local useCa = Estimate.isAboutEqualTo(countStats["Ca_Kb"].delta, compCaDelta)
    local useSi = makeMap(1)
    local FeNoDiffractionML = diffractionPeaks(Locations.diffractionBaselines["Fe_Ka"].start, Locations.diffractionBaselines["Fe_Kb"].stop)
    FeNoDiffractionML = Map.over(FeNoDiffractionML, 0)
    FeNoDiffractionML = Map.NOT(FeNoDiffractionML)
    local CaNoDiffractionML = Map.NOT(Map.over(diffractionPeaks(Locations.diffractionBaselines["Ca_Ka"].start, Locations.diffractionBaselines["Ca_Kb"].stop), 0))
    local SiNoDiffractionML = Map.NOT(Map.over(diffractionPeaks(Locations.diffractionBaselines["Si_K"].start, Locations.diffractionBaselines["Si_K"].stop), 0))
    if GeoAndDiffCorrection.useMLDiffractionForBaseline then
      useFe = Map.AND(useFe, fixMap(FeNoDiffractionML, 1))
      useCa = Map.AND(useCa, fixMap(CaNoDiffractionML, 1))
      useSi = Map.AND(useSi, fixMap(SiNoDiffractionML, 1))
    end
  
    local combinedDelta = countStats["Fe_Ka"].delta + countStats["Fe_Kb"].delta
    local combinedTotal = countStats["Fe_Ka"].total + countStats["Fe_Kb"].total
    local range = {lowerFluorEps*combinedTotal, upperFluorEps*combinedTotal}
    local epsFe = combinedDelta/Estimate.safeDenominator(combinedTotal)
    combinedDelta.nSigma = 1
    local FeE0Compatible = Estimate.isBetween(combinedDelta, range)
    local newKeepE0 = Map.AND(keepE0, FeE0Compatible)
    self.guidePeakEps["Fe"] = useFe*epsFe
  
    combinedDelta = countStats["Ca_Ka"].delta + countStats["Ca_Kb"].delta
    combinedTotal = countStats["Ca_Ka"].total + countStats["Ca_Kb"].total
    range = {lowerFluorEps*combinedTotal, upperFluorEps*combinedTotal}
    local epsCa = combinedDelta/Estimate.safeDenominator(combinedTotal)
    combinedDelta.nSigma = 1
    local CaE0Compatible = Estimate.isBetween(combinedDelta, range)
    newKeepE0 = Map.OR(newKeepE0, Map.AND(keepE0, CaE0Compatible))
    self.guidePeakEps["Ca"] = useCa*epsCa
  
    combinedDelta = 1*countStats["Si_K"].delta
    combinedTotal = countStats["Si_K"].total
    range = {lowerFluorEps*combinedTotal, upperFluorEps*combinedTotal}
    local epsSi = combinedDelta/Estimate.safeDenominator(combinedTotal)
    combinedDelta.nSigma = 1
    local SiE0Compatible = Estimate.isBetween(combinedDelta, range)
    newKeepE0 = Map.OR(newKeepE0, Map.AND(keepE0, SiE0Compatible))
    self.guidePeakEps["Si"] = useSi*epsSi
  
    local noDivZero = Map.NOT(Map.OR(Map.OR(useFe, useCa), useSi))
    local eps = useFe*epsFe
    eps = eps + useCa*epsCa
    eps = eps + useSi*epsSi
    eps = eps/(Map.add(Map.add(useFe, useCa), Map.add(useSi, noDivZero)))
    local e0 = GeoAndDiffCorrection.e0From(eps, GeoAndDiffCorrection.xDiff)
    self.e0 = newKeepE0*self.e0 + Map.NOT(newKeepE0)*e0
    self.lowerFluorEps = self.e0*self.xmin/(self.xmin + 1 - self.e0^2)
    self.upperFluorEps = self.e0*self.xmax/(self.xmax + 1 - self.e0^2)
    local min = Estimate.minVal(self.lowerFluorEps, self.upperFluorEps)
    local max = Estimate.maxVal(self.lowerFluorEps, self.upperFluorEps)
    self.lowerFluorEps = min
    self.upperFluorEps = max
    self.e0IsGood = Map.OR(newKeepE0, Map.OR(useFe, Map.OR(useCa, useSi)))
  end
  
  function GeoAndDiffCorrection.setGeometry(self)
    self:estimateGeometryFromHighE()
    self:estimateGeometryFromFeCaSi()
  end
  
  function GeoAndDiffCorrection.getChannelOffsetUncertainty(self, start, stop)
    local diff_slope = GeoAndDiffCorrection.counts(stop, stop + 1, "A")
    diff_slope = diff_slope - GeoAndDiffCorrection.counts(start, start + 1, "A")
    diff_slope = diff_slope + GeoAndDiffCorrection.counts(start, start + 1, "B")
    diff_slope = diff_slope - GeoAndDiffCorrection.counts(stop, stop + 1, "B")
    local slop = diff_slope*self.channelSlopeOffset
  
    return slop
  end
  
  function GeoAndDiffCorrection.correctOneElement(self, elmt)
    local peakInfo = Estimate.mapElementToQuant(elmt)
    local name = peakInfo.name
    local sum = true
    if peakInfo.multiquant ~= nil and peakInfo.multiquant then sum = false end
    local result = {}
  
    -- If detector B reports livetime < A + deltaTForPatching, then lower quantifications from B
    -- to match the livetime from A
    local BFactor = nil
    if self.patchDetectorBLivetime then
      BFactor = self:adjustForLivetimeDiscrepancy()
    end
  
    for k, v in pairs(peakInfo.weight) do
      local start, stop = 0, 0
      local range = 0
      if sum then name = k end
      local background = false
      if not name then
        assert(false, "Could not find name for "..elmt)
      elseif Locations.backgrounds[name] then
        background = true
      end
      if background then
        start = Locations.backgrounds[mapQuantToElement(name)].start
        stop = Locations.backgrounds[mapQuantToElement(name)].stop
        range = Locations.backgrounds[mapQuantToElement(name)].range
      else
        start = Locations.mainPeaks[mapQuantToElement(name)].start
        stop = Locations.mainPeaks[mapQuantToElement(name)].stop
      end
      local I_A = GeoAndDiffCorrection.counts(start, stop, "A")
      local I_B = GeoAndDiffCorrection.counts(start, stop, "B")
      local X_Aq, X_Bq = {}, {}
      local el = Estimate.columnName(k)
      if background then
        X_Aq[k] = v*I_A/range
        X_Bq[k] = v*I_B/range
      else
        X_Aq[k] = v*Estimate:new({val = element(el, "%-as-mmol", "A"), err = Map.mul(element(el, "err", "A"), 10/atomicMass(el))})
        X_Bq[k] = v*Estimate:new({val = element(el, "%-as-mmol", "B"), err = Map.mul(element(el, "err", "B"), 10/atomicMass(el))})
        if BFactor then X_Bq[k] = X_Bq[k]*BFactor end
      end
      local slop = self:getChannelOffsetUncertainty(start, stop)
  
      local defaultEps = self:expectedEps(mapQuantToElement(name))
      local delta = I_A - I_B
      local sum = I_A + I_B
      local isOk = Estimate.isBetween(delta, {sum*(self.lowerFluorEps) + slop, sum*(self.upperFluorEps) + slop})
      local eps = delta/sum
      local diffInA = Map.AND(Estimate.isGreaterThan(delta, sum*(self.upperFluorEps) + slop), Map.NOT(isOk))
      local diffInB = Map.AND(Estimate.isLessThan(delta, sum*(self.lowerFluorEps) + slop), Map.NOT(isOk))
      eps = isOk*eps + Map.NOT(isOk)*defaultEps
      local beta = (1 - eps^2)/(1 - eps*self.e0)
      local R = (1 - eps)/(1 + eps)
      result[k] = {}
      result[k].correctedAbundance = diffInA*(R + 1)*beta*X_Bq[k]/(2*R) + diffInB*(R + 1)*beta*X_Aq[k]/2 + isOk*beta*(X_Aq[k] + X_Bq[k])/2
    end
    if sum then
      local total = 0
      for k, component in pairs(result) do
        total = total + component.correctedAbundance
      end
      result = {}
      result[peakInfo.name] = {}
      result[peakInfo.name].correctedAbundance = total
    end
    self.correctedElmt[elmt] = result
  end
  
  function GeoAndDiffCorrection.correctQuants(self, elmt)
    if not self.correctionsSetUp then
      self:setGuides()
    end
  
    local elmtList = elmt or self.correctable
    
    for i, el in ipairs(elmtList) do
      if not self.correctedElmt[el] then
        self:correctOneElement(el)
      end
    end
  end
  
  function GeoAndDiffCorrection.setGuides(self)
    local e0 = self.e0
    local lowerFluorEps = self.lowerFluorEps
    local upperFluorEps = self.upperFluorEps
  
    local peaks = self.guidePeaks
    local countStats = {}
    local sumDelta = 0
    local sumTotal = 0
    for i, peak in ipairs(peaks) do
      countStats[peak] = {}
      local start = Locations.mainPeaks[peak].start
      local stop = Locations.mainPeaks[peak].stop
      local A = GeoAndDiffCorrection.counts(start, stop, "A")
      local B = GeoAndDiffCorrection.counts(start, stop, "B")
      countStats[peak].delta = A - B
      countStats[peak].delta.nSigma = 1
      countStats[peak].total = A + B
      countStats[peak].eps = countStats[peak].delta/Estimate.safeDenominator(countStats[peak].total)
      local range = {lowerFluorEps*countStats[peak].total, upperFluorEps*countStats[peak].total}
      countStats[peak].use = Estimate.isBetween(countStats[peak].delta, range)
      sumDelta = sumDelta + countStats[peak].use*countStats[peak].delta
      sumTotal = sumTotal + countStats[peak].use*countStats[peak].total
    end
    local avgEps = sumDelta/Estimate.safeDenominator(sumTotal)
  
    for i, peak in ipairs(peaks) do
      countStats[peak].eps = countStats[peak].use*countStats[peak].eps + Map.NOT(countStats[peak].use)*avgEps
      if not Estimate.isEstimate(self.guidePeakEps[peak]) then
        self.guidePeakEps[peak] = countStats[peak].eps
      end
    end
  
    self.correctionsSetUp = true
  end
  
  function GeoAndDiffCorrection:forEstimateQuantification()
    Estimate.quantify = function(elmt, unit) return self:correctedElement(elmt, unit) end
    Estimate.quantList = self.correctable
    Estimate.totalWithUnions = false
    Estimate.atomicMass = function(elmt) return self:atomicMass(elmt) end
  end
  
  function quantifyUsing(geo)
    geo:forEstimateQuantification()
  end
  
  -- Diffraction mapping functions
  
  function GeoAndDiffCorrection:diffractionBetween(ch1, ch2, options)
    local nSigma = nil
    local linear = false
    if options then
      if options.nSigma ~= nil then
        nSigma = options.nSigma
      end
      if options.linear ~= nil then
        linear = options.linear
      end
    end
    local A = GeoAndDiffCorrection.counts(ch1, ch2, "A")
    local B = GeoAndDiffCorrection.counts(ch1, ch2, "B")
    local slop = self:getChannelOffsetUncertainty(ch1, ch2)
    local sum = A + B
    local delta = A - B
    if nSigma then delta.nSigma = nSigma end
    if not self.upperFluorEps then assert(false, "upperFluorEps doesn't exist") end
    if not Estimate.isEstimate(self.upperFluorEps) then assert(false, "upperFluorEps is " .. #(self.upperFluorEps)) end
    local diffInA, diffInB = 0, 0
    if linear then
      diffInA = (delta/sum) - self.upperFluorEps
      diffInB = -(delta/sum) + self.lowerFluorEps
    else
      diffInA = Estimate.ln(A*(1 - self.upperFluorEps)/(B*(1 + self.upperFluorEps)))
      diffInB = Estimate.ln(B*(1 + self.lowerFluorEps)/(A*(1 - self.lowerFluorEps)))
    end
    diffInA = diffInA:suchThat(delta, Estimate.isGreaterThan, sum*(self.upperFluorEps) + slop)
    diffInB = diffInB:suchThat(delta, Estimate.isLessThan, sum*(self.lowerFluorEps) + slop)
  
    return diffInA, diffInB
  end
  
  function GeoAndDiffCorrection:diffractionInRhShoulder()
    local kernel = {}
    kernel[377] = 0.761
    kernel[378] = 0.899
    kernel[379] = 1.035
    kernel[380] = 1.159
    kernel[381] = 1.263
    kernel[382] = 1.341
    kernel[383] = 1.385
    kernel[384] = 1.394
    kernel[385] = 1.365
    kernel[386] = 1.301
    kernel[387] = 1.208
    kernel[388] = 1.091
    kernel[389] = 0.960
    kernel[390] = 0.822
    kernel[391] = 0.685
    kernel[392] = 0.556
    kernel[393] = 0.439
    kernel[394] = 0.338
  
    local ch1 = Locations.backgrounds.Rh_shoulder.start
    local ch2 = Locations.backgrounds.Rh_shoulder.stop
    local A = 0
    local B = 0
    for channel = ch1, ch2 do
      A = A + GeoAndDiffCorrection.counts(channel, channel + 1, "A")*kernel[channel]
      B = B + GeoAndDiffCorrection.counts(channel, channel + 1, "B")*kernel[channel]
    end
    
    local slop = self:getChannelOffsetUncertainty(ch1, ch2)
    local sum = A + B
    local delta = A - B
    if nSigma then delta.nSigma = nSigma end
    if not self.upperFluorEps then assert(false, "upperFluorEps doesn't exist") end
    if not Estimate.isEstimate(self.upperFluorEps) then assert(false, "upperFluorEps is " .. #(self.upperFluorEps)) end
    local diffInA = Estimate.ln(A*(1 - self.upperFluorEps)/(B*(1 + self.upperFluorEps))):suchThat(delta, Estimate.isGreaterThan, sum*(self.upperFluorEps) + slop)
    local diffInB = Estimate.ln(B*(1 + self.lowerFluorEps)/(A*(1 - self.lowerFluorEps))):suchThat(delta, Estimate.isLessThan, sum*(self.lowerFluorEps) + slop)
  
    return diffInA, diffInB
  end
  
  local function phaseToColor(phase, color)
    local phi1 = 1/6
    local phi2 = 1/3
    local phi3 = 1/2
    local phi4 = 2/3
    local phi5 = 5/6
    local RG = Map.under(phase, phi1)
    local GR = Map.AND(Map.NOT(RG), Map.under(phase, phi2))
    local GB = Map.AND(Map.under(phase, phi3), Map.NOT(Map.under(phase, phi2)))
    local BG = Map.AND(Map.under(phase, phi4), Map.NOT(Map.under(phase, phi3)))
    local BR = Map.AND(Map.under(phase, phi5), Map.NOT(Map.under(phase, phi4)))
    local RB = Map.NOT(Map.under(phase, phi5))
    local result = nil
    if color == "red" then
      result = Map.add(RG, RB)
      result = Map.add(result, Map.mul(GR, Map.sub(phi2/(phi2 - phi1), Map.mul(1/(phi2 - phi1), phase))))
      result = Map.add(result, Map.mul(BR, Map.sub(Map.mul(1/(phi5 - phi4), phase), phi4/(phi5 - phi4))))
    elseif color == "green" then
      result = Map.add(GR, GB)
      result = Map.add(result, Map.mul(RG, Map.mul(1/phi1, phase)))
      result = Map.add(result, Map.mul(BG, Map.sub(phi4/(phi4 - phi3), Map.mul(1/(phi4 - phi3), phase))))
    elseif color == "blue" then
      result = Map.add(BG, BR)
      result = Map.add(result, Map.mul(GB, Map.sub(Map.mul(1/(phi3 - phi2), phase), phi2/(phi3 - phi2))))
      result = Map.add(result, Map.mul(RB, Map.sub(1/(1 - phi5), Map.mul(1/(1 - phi5), phase))))
    else
      assert(false, "Unknown color: "..color)
    end
    return result
  end
  
  function GeoAndDiffCorrection.diffractionMap(self, options)
    local binary = false
    local depth = 3
    local compare = false
    local PMC = nil
    local PMCindex = nil
    local dot = false
    local linear = true
    local phaseOnly = false
    local magnitudeOnly = false
    local vectorField = false
    if options then
      if options.binary ~= nil then binary = options.binary end
      if options.depth then depth = options.depth end
      if options.type then
        if options.type == "inspect" then depth = 4
        elseif options.type ~= "map" then assert(false, "Unknown map type: "..options.type) end
      end
      if options.PMC then
        compare = true
        PMC = options.PMC
      end
      if options.dotProduct ~= nil then dot = options.dotProduct end
      if options.linear ~= nil then linear = options.linear end
      if options.phase ~= nil then phaseOnly = options.phase end
      if options.magnitude ~= nil then magnitudeOnly = options.magnitude end
      if options.variogram ~= nil then vectorField = options.variogram end
    end
  
    local channelStart = 117
    local channelRange = 1536
    local step = channelRange/48
    local loopsPerBin = 48/(2^depth)
    local A, B = {}, {}
    local dotProduct, PMClengthSq, lengthSq = 0, 0, 0
    local ch1, ch2 = channelStart - step, channelStart - 1
    local index = 0
    for i = 1, 48 do
      if not compare and (i - 1) % loopsPerBin == 0 then
        index = index + 1
        if binary then
          A[index] = makeMap(0)
          B[index] = makeMap(0)
        else
          A[index] = 0
          B[index] = 0
          if index > 1 then
            A[index - 1] = A[index - 1]^0.5
            B[index - 1] = B[index - 1]^0.5
          end
        end
      end
      ch1 = ch1 + step
      ch2 = ch2 + step
      local diffInA, diffInB = self:diffractionBetween(ch1, ch2, {nSigma = 3.7, linear = linear})
      if i == 1 and compare then
        for idx, mapPMC in ipairs(diffInA.val[1]) do
          if mapPMC == PMC then
            PMCindex = idx
            break
          end
        end
        assert(PMCindex, "Could not get index for PMC = "..PMC)
      end
      if binary then
        local tempA = Estimate.isGreaterThan(diffInA, 0)
        local tempB = Estimate.isGreaterThan(diffInB, 0)
        if compare then
          local PMCA = Map.getNthValue(tempA, PMCindex)
          local PMCB = Map.getNthValue(tempB, PMCindex)
          dotProduct = Map.add(dotProduct, Map.mul(PMCA, tempA))
          dotProduct = Map.add(dotProduct, Map.mul(PMCB, tempB))
          PMClengthSq = PMClengthSq + PMCA + PMCB
          lengthSq = Map.add(lengthSq, tempA)
          lengthSq = Map.add(lengthSq, tempB)
        else
          A[index] = Map.OR(A[index], tempA)
          B[index] = Map.OR(B[index], tempB)
        end
      else
        local tempA = diffInA
        local tempB = diffInB
        if compare then
          local PMCA = Estimate:new({val = Map.getNthValue(tempA.val, PMCindex), err = Map.getNthValue(tempA:uncertainty(), PMCindex)})
          local PMCB = Estimate:new({val = Map.getNthValue(tempB.val, PMCindex), err = Map.getNthValue(tempB:uncertainty(), PMCindex)})
          dotProduct = dotProduct + tempA*PMCA + tempB*PMCB
          PMClengthSq = PMClengthSq + PMCA^2 + PMCB^2
          lengthSq = lengthSq + tempA^2 + tempB^2
        else
          A[index] = A[index] + tempA^2
          B[index] = B[index] + tempB^2
        end
      end
    end
  
    if compare then
      local result = dotProduct
      if not dot then
        if binary then
          result = Map.div(dotProduct, Map.pow(Map.mul(PMClengthSq, lengthSq), 0.5))
        else
          result = dotProduct/Estimate.safeDenominator((PMClengthSq*lengthSq)^0.5)
        end
      end
      return result
    elseif vectorField then
      local tableOfMaps = {}
      for i, aChan in ipairs(A) do -- convert A and B channels into a Map of vectors
        table.insert(tableOfMaps, aChan.val)
        table.insert(tableOfMaps, B[i].val)
      end
      local result = table.remove(tableOfMaps, 1)
      for i, v in ipairs(result[2]) do
        result[2][i] = {v}
        for j, v2 in ipairs(tableOfMaps) do
          table.insert(result[2][i], v2[2][i])
        end
      end
      return result
    else
      local red, green, blue = makeMap(0), makeMap(0), makeMap(0)
      if binary then
        for i, diff in pairs(A) do
          red = Map.add(red, Map.mul(2^(2^depth - i), diff))
          green = Map.add(green, Map.mul(2^(2^depth - i), Map.OR(diff, B[i])))
          blue = Map.add(blue, Map.mul(2^(2^depth - i), B[i]))
        end
      else
        local phase = makeMap(0)
        local magnitude = 0
        for i, diff in pairs(A) do
          phase = Map.add(phase, Map.mul(2^(2^(depth + 1) - 2*i), Map.over(diff.val, 0)))
          magnitude = (magnitude^2 + diff^2)^0.5
        end
        for i, diff in pairs(B) do
          phase = Map.add(phase, Map.mul(2^(2^(depth + 1) - 2*i + 1), Map.over(diff.val, 0)))
          magnitude = (magnitude^2 + diff^2)^0.5
        end
        if magnitudeOnly then return magnitude end
        phase = Map.div(Map.ln(Map.add(1, phase)), 0.6931*2^(depth + 1))
        if phaseOnly then return phase end
        red = (phaseToColor(phase, "red")*magnitude):plot({nilCutoff = false})
        assert(red, "Red is empty")
        green = (phaseToColor(phase, "green")*magnitude):plot({nilCutoff = false})
        blue = (phaseToColor(phase, "blue")*magnitude):plot({nilCutoff = false})
      end
  
      return red, green, blue
    end
  
  end
  
  GeoAndDiffCorrection.__index = GeoAndDiffCorrection
  
  function loadGeoAndDiffCorrection()
    if not CORRECTIONS then
      CORRECTIONS = GeoAndDiffCorrection:new()
    elseif not CORRECTIONS.lowerFluorEps and not Estimate.isEstimate(CORRECTIONS.lowerFluorEps) then
      print("Have to set geometry")
      CORRECTIONS:setGeometry()
    end
    quantifyUsing(CORRECTIONS)
  end
  
return GeoAndDiffCorrection