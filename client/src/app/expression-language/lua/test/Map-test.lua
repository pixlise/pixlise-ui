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

    function TestMap:testAdd2Maps()
        local m1 = {{3,4,7},{3.5,5.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.add(m1, m2)
        local expected = {{3,4,7},{3.5+11.1,5.5+12.1,1.3+13.1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAdd3Maps()
        local m1 = {{3,4,7},{3.5,5.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local m3 = {{3,4,7},{5,6,7}}
        local result = Map.add(m1, m2, m3)
        local expected = {{3,4,7},{3.5+11.1+5,5.5+12.1+6,1.3+13.1+7}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddScalarMap()
        local m = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(m, 12)
        local expected = {{3,4,7},{3.5+12,5.5+12,1.3+12}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddMapScalar()
        local m = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(13, m)
        local expected = {{3,4,7},{3.5+13,5.5+13,1.3+13}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddMixed4()
        local m = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(13, m, 5, 2)
        local expected = {{3,4,7},{3.5+20,5.5+20,1.3+20}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddMixed4Swap()
        local m = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(m, 13, 5, 3)
        local expected = {{3,4,7},{3.5+21,5.5+21,1.3+21}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testAddMixed5()
        local m1 = {{3,4,7},{3.5,5.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.add(10, m1, 100, m2, 1000)
        local expected = {{3,4,7},{3.5+11.1+1110,5.5+12.1+1110,1.3+13.1+1110}}

        lu.assertItemsEquals(result, expected)
    end
    -- function TestMap:testAddMixed4WithNil()
    --     local m1 = {{3,4,7},{3.5,nil,1.3}}
    --     local m2 = {{3,4,7},{11.1,12.1,13.1}}
    --     local result = Map.add(10, m1, 100, m2, 1000)
    --     local expected = {{3,4,7},{3.5+11.1+1110,5.5+12.1+1110,1.3+13.1+1110}}

    --     lu.assertItemsEquals(result, expected)
    -- end
    function TestMap:testAddMixed4WithInf()
        local m1 = {{3,4,7},{3.5,1/0,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.add(10, m1, 100, m2, 1000)
        local expected = {{3,4,7},{3.5+11.1+1110,1/0,1.3+13.1+1110}}

        lu.assertItemsEquals(result, expected)
    end

    function TestMap:testMul2Maps()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local r = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.mul(l, r)
        local expected = {{3,4,7},{3.5*11.1,5.5*12.1,1.3*13.1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMul3Maps()
        local m1 = {{3,4,7},{3.5,5.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local m3 = {{3,4,7},{5,6,7}}
        local result = Map.mul(m1, m2, m3)
        local expected = {{3,4,7},{3.5*11.1*5,5.5*12.1*6,1.3*13.1*7}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMulScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.mul(l, 12)
        local expected = {{3,4,7},{3.5*12,5.5*12,1.3*12}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMulMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.mul(13, r)
        local expected = {{3,4,7},{3.5*13,5.5*13,1.3*13}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMulMixed4()
        local m = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.mul(10, m, 5, 2)

        local em = 10*5*2
        local expected = {{3,4,7},{3.5*em,5.5*em,1.3*em}}

        lu.assertItemsEquals(result, expected)
    end

    -- function TestMap:testSubMaps()
    --     local l = {{3,4,7},{3.5,5.5,1.3}}
    --     local r = {{3,4,7},{11.1,12.1,13.1}}
    --     local result = Map.sub(l, r)
    --     local expected = {{3,4,7},{3.5-11.1,5.5-12.1,1.3-13.1}}

    --     lu.assertItemsEquals(result, expected)
    -- end
    -- function TestMap:testSubScalarMap()
    --     local l = {{3,4,7},{3.5,5.5,1.3}}
    --     local result = Map.sub(l, 12)
    --     local expected = {{3,4,7},{3.5-12,5.5-12,1.3-12}}

    --     lu.assertItemsEquals(result, expected)
    -- end
    -- function TestMap:testSubMapScalar()
    --     local r = {{3,4,7},{3.5,5.5,1.3}}
    --     local result = Map.sub(13, r)
    --     local expected = {{3,4,7},{13-3.5,13-5.5,13-1.3}}

    --     lu.assertItemsEquals(result, expected)
    -- end

    -- function TestMap:testDivMaps()
    --     local l = {{3,4,7},{3.5,5.5,1.3}}
    --     local r = {{3,4,7},{11.1,12.1,13.1}}
    --     local result = Map.div(l, r)
    --     local expected = {{3,4,7},{3.5/11.1,5.5/12.1,1.3/13.1}}

    --     lu.assertItemsEquals(result, expected)
    -- end
    -- function TestMap:testDivScalarMap()
    --     local l = {{3,4,7},{3.5,5.5,1.3}}
    --     local result = Map.div(l, 12)
    --     local expected = {{3,4,7},{3.5/12,5.5/12,1.3/12}}

    --     lu.assertItemsEquals(result, expected)
    -- end
    -- function TestMap:testDivMapScalar()
    --     local r = {{3,4,7},{3.5,5.5,1.3}}
    --     local result = Map.div(13, r)
    --     local expected = {{3,4,7},{13/3.5,13/5.5,13/1.3}}

    --     lu.assertItemsEquals(result, expected)
    -- end

    function TestMap:testMin2Maps()
        local m1 = {{3,4,7},{3.5,15.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.min(m1, m2)
        local expected = {{3,4,7},{3.5,12.1,1.3}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMin3Maps()
        local m1 = {{3,4,7},{3.5,15.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.min(m1, m2, m3)
        local expected = {{3,4,7},{3.5,12.1,1.3}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMin3Maps1Scalar()
        local m1 = {{3,4,7},{3.5,15.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local m3 = {{3,4,7},{1,14,12.1}}
        local result = Map.min(m1, m2, m3)
        local expected = {{3,4,7},{1,12.1,1.3}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMinScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.min(l, 4)
        local expected = {{3,4,7},{3.5,4,1.3}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMinMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.min(4, r)
        local expected = {{3,4,7},{3.5,4,1.3}}

        lu.assertItemsEquals(result, expected)
    end

    function TestMap:testMax2Maps()
        local m1 = {{3,4,7},{3.5,15.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local result = Map.max(m1, m2)
        local expected = {{3,4,7},{11.1,15.5,13.1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMax3Maps()
        local m1 = {{3,4,7},{3.5,15.5,1.3}}
        local m2 = {{3,4,7},{11.1,12.1,13.1}}
        local m3 = {{3,4,7},{8.1,9.1,44.1}}
        local result = Map.max(m1, m2, m3)
        local expected = {{3,4,7},{11.1,15.5,44.1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMaxScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.max(l, 4, 2)
        local expected = {{3,4,7},{4,5.5,4}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testMaxMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.max(4, r)
        local expected = {{3,4,7},{4,5.5,4}}

        lu.assertItemsEquals(result, expected)
    end

    function TestMap:testOverMapMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local r = {{3,4,7},{11.1,12.1,13.1}}

        lu.assertErrorMsgContains("expected number, got table", Map.over, l, r)
    end
    function TestMap:testOverScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.over(l, 4)
        local expected = {{3,4,7},{0,1,0}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testOverMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertErrorMsgContains("expected table, got number", Map.over, 4, r)
    end

    function TestMap:testUnderMapMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local r = {{3,4,7},{11.1,12.1,13.1}}

        lu.assertErrorMsgContains("expected number, got table", Map.under, l, r)
    end
    function TestMap:testUnderScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.under(l, 4)
        local expected = {{3,4,7},{1,0,1}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testUnderMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertErrorMsgContains("expected table, got number", Map.under, 4, r)
    end

    function TestMap:testMathMap()
        local values = {0.3, 0.7, 0.9}
        local m = {{3,4,7},{values[1], values[2], values[3]}}
        local mf = {Map.sin, Map.cos, Map.tan, Map.asin, Map.acos, Map.atan, Map.exp, Map.ln}
        local f = {math.sin, math.cos, math.tan, math.asin, math.acos, math.atan, math.exp, math.log}
        local name = {"sin", "cos", "tan", "asin", "acos", "atan", "exp", "ln"}

        for i, fn in ipairs(f) do
            -- Check the trig function with a map
            local result = mf[i](m)
            local expected = {{3,4,7},{fn(values[1]), fn(values[2]), fn(values[3])}}

            lu.assertItemsEquals(result, expected, name[i])

            -- Check the trig function with a scalar param
            lu.assertErrorMsgContains("expected table, got number", mf[i], 12)
        end
    end

    function TestMap:testPowMapMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local r = {{3,4,7},{11.1,12.1,13.1}}

        lu.assertErrorMsgContains("expected number, got table", Map.pow, l, r)
    end
    function TestMap:testPowScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.pow(l, 3)
        local expected = {{3,4,7},{l[2][1]^3,l[2][2]^3,l[2][3]^3}}

        lu.assertItemsEquals(result, expected)
    end
    function TestMap:testPowMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertErrorMsgContains("expected table, got number", Map.pow, 4, r)
    end

    function TestMap:testNormaliseMap()
        -- Should fail with non-map param
        lu.assertErrorMsgContains("expected table, got number", Map.normalise, 4)

        -- Otherwise, should just work
        -- TODO: test for effect of having nils
        -- local l = {{3,4,7,9},{3.5,5.5,1.3,nil}}
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.normalise(l)
        local expected = {{3,4,7},{(3.5-1.3)/(5.5-1.3), 1, 0}}

        lu.assertItemsEquals(result, expected)
    end

    function TestMap:testThresholdMap()
        -- TODO: test for effect of having nils
        --local l = {{3,4,7,9},{3.5,5.5,1.3,nil}}
        local l = {{3,4,7},{3.5,5.5,1.3}}

        -- Should fail with bad param types
        lu.assertErrorMsgContains("expected number, got string", Map.threshold, l, "str", 4)
        lu.assertErrorMsgContains("expected number, got table", Map.threshold, l, 4, l)
        lu.assertErrorMsgContains("expected table, got number", Map.threshold, 4, 4, 4)

        -- Otherwise should work
        local result = Map.threshold(l, 4, 1)
        local expected = {{3,4,7},{1, 0, 0}}

        lu.assertItemsEquals(result, expected)
    end

    -- -- NOTE: no test written for printDebugMap, cos can't verify stdout from what I can see in luaunit docs

    function TestMap:testGetPMCValue()
        local l = {{3,4,7},{3.5,5.5,1.3}}

        -- Type checking
        lu.assertErrorMsgContains("expected table, got number", Map.getPMCValue, 4, 4)
        lu.assertErrorMsgContains("expected number, got string", Map.getPMCValue, l, "4")

        lu.assertItemsEquals(Map.getPMCValue(l, 3), 3.5)
        lu.assertItemsEquals(Map.getPMCValue(l, 4), 5.5)
        lu.assertItemsEquals(Map.getPMCValue(l, 7), 1.3)
        lu.assertItemsEquals(Map.getPMCValue(l, 9), nil)
    end

    function TestMap:testSetPMCValue()
        local l = {{3,4,7},{3.5,5.5,1.3}}

        -- Type checking
        lu.assertErrorMsgContains("expected table, got number", Map.setPMCValue, 4, 4, 4)
        lu.assertErrorMsgContains("expected number, got string", Map.setPMCValue, l, "4", 4)
        lu.assertErrorMsgContains("expected number, got string", Map.setPMCValue, l, 4, "4")

        lu.assertItemsEquals(Map.setPMCValue(l, 3, 99), false)
        lu.assertItemsEquals(l, {{3,4,7},{99,5.5,1.3}})
        
        l = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertItemsEquals(Map.setPMCValue(l, 4, 99), false)
        lu.assertItemsEquals(l, {{3,4,7},{3.5,99,1.3}})

        l = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertItemsEquals(Map.setPMCValue(l, 7, 99), false)
        lu.assertItemsEquals(l, {{3,4,7},{3.5,5.5,99}})

        -- Adds new item at the end
        l = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertItemsEquals(Map.setPMCValue(l, 9, 99), true)
        lu.assertItemsEquals(l, {{3,4,7,9},{3.5,5.5,1.3,99}})

        -- Adds new item in middle, no sorting is done on output PMC list though... TODO: verify this is OK!
        l = {{3,4,7},{3.5,5.5,1.3}}
        lu.assertItemsEquals(Map.setPMCValue(l, 5, 99), true)
        lu.assertItemsEquals(l, {{3,4,7,5},{3.5,5.5,1.3,99}})
    end

    function TestMap:testReplaceBadValues()
        -- NOTE: we can't put nil into a lua table...
        -- https://www.lua.org/manual/5.3/manual.html#2.1
        -- "Tables can be heterogeneous; that is, they can contain values of all types (except nil). Any
        --  key with value nil is not considered part of the table"
        local l = {{3,4,7,8,9,10},{3.5,0/0,1/0,5.5,-1/0,9}}

        -- Type checking
        lu.assertErrorMsgContains("expected table, got number", Map.replaceBadValues, 4, 4)
        lu.assertErrorMsgContains("expected number, got string", Map.replaceBadValues, l, "4")

        Map.replaceBadValues(l, 777)
        lu.assertItemsEquals(l, {{3,4,7,8,9,10},{3.5,777,777,5.5,777,9}})
    end

    function TestMap:testLongExpression()
        local A = {{3,4,7},{1, 2, 3}}
        local B = {{3,4,7},{4, 5, 6}}

        local s1 = Map.add(A, B)
        lu.assertItemsEquals(s1, {{3,4,7},{1+4, 2+5, 3+6}})
        local s2 = Map.pow(s1, 3)
        lu.assertItemsEquals(s2, {{3,4,7},{125, 7^3, 9^3}})

        lu.assertItemsEquals(A, {{3,4,7},{1, 2, 3}})
        lu.assertItemsEquals(B, {{3,4,7},{4, 5, 6}})
        local s3 = Map.mul(A, B)
        lu.assertItemsEquals(s3, {{3,4,7},{1*4, 2*5, 3*6}})
        local s4 = Map.div(s3, s2)
        lu.assertItemsEquals(s4, {{3,4,7},{4/125, 10/(7^3), 18/(9^3)}})
        local s5 = Map.pow(s4, 0.5)
        lu.assertItemsEquals(s5, {{3,4,7},{(4/125)^0.5, (10/(7^3))^0.5, (18/(9^3))^0.5}})
        local s6 = Map.mul(2, s5)
        local exp = {{3,4,7},{2*(4/125)^0.5, 2*(10/(7^3))^0.5, 2*(18/(9^3))^0.5}}
        lu.assertItemsEquals(s6, exp)

        local s = Map.mul(2, Map.pow(Map.div(Map.mul(A, B), Map.pow(Map.add(A, B), 3)), 0.5))
        lu.assertItemsEquals(s, exp)
    end

    function TestMap:testGetNthPMC()
        local m = {{43, 44, 47},{14, 15, 16}}
        lu.assertItemsEquals(Map.getNthPMC(m, 2), 44)
        lu.assertItemsEquals(Map.getNthPMC(m, 8), nil)
    end

    function TestMap:testGetNthValue()
        local m = {{43, 44, 47},{14, 15, 16}}
        lu.assertItemsEquals(Map.getNthValue(m, 2), 15)
        lu.assertItemsEquals(Map.getNthValue(m, 8), nil)
    end

    function TestMap:testGetPMCs()
        local m = {{43, 44, 47},{14, 15, 16}}
        lu.assertItemsEquals(Map.getPMCs(m), {43, 44, 47})
        lu.assertErrorMsgContains("expected table, got string: bob", Map.getPMCs, "bob")
    end

    function TestMap:testGetValues()
        local m = {{43, 44, 47},{14, 15, 16}}
        lu.assertItemsEquals(Map.getValues(m), {14, 15, 16})
        lu.assertErrorMsgContains("expected table, got string: bob", Map.getValues, "bob")
    end

-- class TestMap


--[[
NOTE: This is the more verbose way to start a unit test... turns out it's not needed

local runner = lu.LuaUnit.new()
runner:setOutputType("text")
os.exit( runner:runSuite() )
]]--

os.exit(lu.LuaUnit.run())