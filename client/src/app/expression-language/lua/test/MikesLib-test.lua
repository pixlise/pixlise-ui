package.path = package.path..";..\\?.lua"
local Map = require('Map')
local PIXLISEstub = require('PIXLISEstub') -- To stub out functions like element()
local MikesLib = require('MikesLib')
local CSV = require("CSV")
local Utils = require("Utils")
local lu = require('.\\luaunit')


TestMikesLib = {}
    function TestMikesLib:setUp()
    end

    function TestMikesLib:tearDown()
    end

    function TestMikesLib:testTotalFuncResult()
        -- Checks the result of total func against the output of original PIXLISE expression
        local expected = Utils.rotateCSVTable(CSV.load("MikesLib-test-expected.csv", ",", true))

        PIXLISEstub.resetReplay() -- Reset replay of data returns from PIXLISE functions
        local result = MikesLib.TotalFunc(Map)

        -- FOR NOW, we ignore 3 PMCs where we get NaN vs the original code calculating a value (incorrectly)
        local pmcsToIgnore = {[256]=true, [1475]=true, [1669]=true}
        local ignoreCount = 0
        for _, _ in pairs(pmcsToIgnore) do
            ignoreCount = ignoreCount+1
        end

        local line, comment = Utils.findMapTableDifferenceLine(result, "result", expected, "expected", pmcsToIgnore)

        if line >= 0 then
            print("Unexpected result: "..comment.." at line: "..line)
        else
            print("Result output was correct, NOTE: IGNORED "..ignoreCount.." values")
        end

        lu.assertEquals(line, -1)
        lu.assertEquals(comment, "")
    end
    function TestMikesLib:testTotalFuncSpeed()
        -- Run it many times to get an average time
        local t0 = os.clock()
        local count = 10
        for i = 1, count, 1 do
        PIXLISEstub.resetReplay() -- Reset replay of data returns from PIXLISE functions
            local result = MikesLib.TotalFunc(Map)
        end
        local t1 = os.clock()
        local runtime = t1-t0

        -- Should take < 5 seconds
        print("Executing MikesLib.TotalFunc took "..(runtime/count).." on average over "..count.." iterations")
        lu.assertEquals(runtime < 5, true)
    end

--[[
    
Diagnosing speed issues - we can see how long function calls took with this:

Utils.monitorCalls()
local result = MikesLib.TotalFunc(Map)
Utils.dumpCalls()

]]--

lu.LuaUnit.run()
