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

local lu = require('./luaunit')
package.path = package.path..";../?.lua"
local Map = require("Map")


TestMap = {}
    function TestMap:setUp()
    end

    function TestMap:tearDown()
    end
    function TestMap:testAddMaps()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local r = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.add(l, r)
        local expected = {{3,4,7},{3.5+11.1,5.5+12.1,1.3+13.1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(l, 12)
        local expected = {{3,4,7},{3.5+12,5.5+12,1.3+12}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(13, r)
        local expected = {{3,4,7},{3.5+13,5.5+13,1.3+13}}

        lu.assertItemsEquals(result, expected)
    end
    --[[
    function TestMap:testAddMaps()
        local l = {[3]=3.5,[4]=5.5,[7]=1.3}
        local r = {[3]=11.1,[4]=12.1,[7]=13.1}
        local result = Map.add(l, r)

        lu.assertEquals(type(result), 'table')
        --lu.assertEquals(#result, 3)
        lu.assertEquals(result[3], 3.5+11.1)
        lu.assertEquals(result[4], 5.5+12.1)
        lu.assertEquals(result[7], 1.3+13.1)
    end
    function TestMap:testAddScalarMap()
        local l = {[3]=3.5,[4]=5.5,[7]=1.3}
        local result = Map.add(l, 12)

        lu.assertEquals(type(result), 'table')
        --lu.assertEquals(#result, 3)
        lu.assertEquals(result[3], 3.5+12)
        lu.assertEquals(result[4], 5.5+12)
        lu.assertEquals(result[7], 1.3+12)
    end
    function TestMap:testAddMapScalar()
        local r = {[3]=3.5,[4]=5.5,[7]=1.3}
        local result = Map.add(14, r)

        lu.assertEquals(type(result), 'table')
        --lu.assertEquals(#result, 3)
        lu.assertEquals(result[3], 3.5+14)
        lu.assertEquals(result[4], 5.5+14)
        lu.assertEquals(result[7], 1.3+14)
    end
]]--
-- class TestMap


--[[
NOTE: This is the more verbose way to start a unit test... turns out it's not needed

local runner = lu.LuaUnit.new()
runner:setOutputType("text")
os.exit( runner:runSuite() )
]]--

os.exit(lu.LuaUnit.run())