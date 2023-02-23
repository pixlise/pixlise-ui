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

local lu = require('luaunit')
local Utils = require("Utils")


TestUtils = {}
    function TestUtils:setUp()
    end

    function TestUtils:tearDown()
    end
    function TestUtils:testRotate()
        local t = {{"1", "1.234"}, {"2", "2.345"}, {"3", "3.456"}}

        local result = Utils.rotateCSVTable(t)
        lu.assertEquals(type(result), 'table')
        lu.assertEquals(#result, 2)
        lu.assertEquals(#result[1], 3)
        lu.assertEquals(#result[2], 3)
        lu.assertEquals(result[1][1], 1)
        lu.assertEquals(result[1][2], 2)
        lu.assertEquals(result[1][3], 3)
        lu.assertEquals(result[2][1], 1.234)
        lu.assertEquals(result[2][2], 2.345)
        lu.assertEquals(result[2][3], 3.456)
    end
    function TestUtils:testFindDifferenceOK()
        local a = {{5, 6, 7}, {1.123, 2.345, 3.456}}
        local b = {{5, 6, 7}, {1.123, 2.345, 3.456}}

        local line, comment = Utils.findMapTableDifferenceLine(a, "a", b, "b", {})
        lu.assertEquals(line, -1)
        lu.assertEquals(comment, "")
    end
    function TestUtils:testFindDifferenceTableB()
        local a = {{5, 6, 7}, {1.123, 2.345, 3.456}}
        local b = {{5, 6, 7}}

        local line, comment = Utils.findMapTableDifferenceLine(a, "a", b, "b", {})
        lu.assertEquals(line, 0)
        lu.assertEquals(comment, "invalid table structure for: b")
    end
    function TestUtils:testFindDifferenceTableA()
        local a = {{5, 6, 7}}
        local b = {{5, 6, 7}, {1.123, 2.345, 3.456}}

        local line, comment = Utils.findMapTableDifferenceLine(a, "a", b, "b", {})
        lu.assertEquals(line, 0)
        lu.assertEquals(comment, "invalid table structure for: a")
    end
    function TestUtils:testFindDifferenceDiff()
        local a = {{5, 6, 7}, {1.123, 2.345, 3.456}}
        local b = {{5, 6, 7}, {1.123, 666, 3.456}}

        local line, comment = Utils.findMapTableDifferenceLine(a, "a", b, "b", {})
        lu.assertEquals(line, 2)
        lu.assertEquals(comment, "value 2.345 doesn't equal 666 (pmc=6)")
    end
    function TestUtils:testFindDifferenceIgnore()
        local a = {{5, 6, 7}, {1.123, 2.345, 3.456}}
        local b = {{5, 6, 7}, {1.123, 666, 3.456}}

        local line, comment = Utils.findMapTableDifferenceLine(a, "a", b, "b", {[6]=true})
        lu.assertEquals(line, -1)
        lu.assertEquals(comment, "")
    end

os.exit(lu.LuaUnit.run())