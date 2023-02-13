local lu = require('.\\luaunit')
package.path = package.path..";..\\?.lua"
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

        lu.assertEquals(type(result), 'table')
        lu.assertEquals(#result, 2)
        lu.assertEquals(#result[1], 3)
        lu.assertEquals(#result[2], 3)
        lu.assertEquals(result[1][1], 3)
        lu.assertEquals(result[1][2], 4)
        lu.assertEquals(result[1][3], 7)
        lu.assertEquals(result[2][1], 3.5+11.1)
        lu.assertEquals(result[2][2], 5.5+12.1)
        lu.assertEquals(result[2][3], 1.3+13.1)
    end
    function TestMap:testAddScalarMap()
        local l = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(l, 12)

        lu.assertEquals(type(result), 'table')
        lu.assertEquals(#result, 2)
        lu.assertEquals(#result[1], 3)
        lu.assertEquals(#result[2], 3)
        lu.assertEquals(result[1][1], 3)
        lu.assertEquals(result[1][2], 4)
        lu.assertEquals(result[1][3], 7)
        lu.assertEquals(result[1][1], 3)
        lu.assertEquals(result[2][1], 3.5+12)
        lu.assertEquals(result[2][2], 5.5+12)
        lu.assertEquals(result[2][3], 1.3+12)
    end
    function TestMap:testAddMapScalar()
        local r = {{3,4,7},{3.5,5.5,1.3}}
        local result = Map.add(13, r)

        lu.assertEquals(type(result), 'table')
        lu.assertEquals(#result, 2)
        lu.assertEquals(#result[1], 3)
        lu.assertEquals(#result[2], 3)
        lu.assertEquals(result[1][1], 3)
        lu.assertEquals(result[1][2], 4)
        lu.assertEquals(result[1][3], 7)
        lu.assertEquals(result[2][1], 3.5+13)
        lu.assertEquals(result[2][2], 5.5+13)
        lu.assertEquals(result[2][3], 1.3+13)
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

lu.LuaUnit.run()