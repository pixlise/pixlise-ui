-- Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
-- Government sponsorship acknowledged.
-- All rights reserved.
-- Redistribution and use in source and binary forms, with or without
-- modification, are permitted provided that the following conditions are
-- met:
--
-- * Redistributions of source code must retain the above copyright notice, this
--   list of conditions and the following disclaimer.
-- * Redistributions in binary form must reproduce the above copyright notice,
--   this list of conditions and the following disclaimer in the documentation
--   and/or other materials provided with the distribution.
-- * Neither the name of Caltech nor its operating division, the Jet Propulsion
--   Laboratory, nor the names of its contributors may be used to endorse or
--   promote products derived from this software without specific prior written
--   permission.
--
-- THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
-- AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
-- IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
-- ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
-- LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
-- CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
-- SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
-- INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
-- CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
-- ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
-- POSSIBILITY OF SUCH DAMAGE.

-- This stubs out all calls expression code can make to PIXLISE, thereby allowing us to run it
-- outside the browser. Data has to be returned, so we record the values coming out of the browser
-- and read them from "allTables" call by call
-- NOTE: resetReplay() needs to be called before the expression is run otherwise we are off the end
--       of the replay and can't return values

local allTables = require('DataAll')

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