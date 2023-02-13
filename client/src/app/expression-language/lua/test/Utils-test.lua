local lu = require('.\\luaunit')
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

lu.LuaUnit.run()