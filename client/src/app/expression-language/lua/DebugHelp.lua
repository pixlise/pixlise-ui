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

DebugHelp = {}

function DebugHelp.listAllTables(offset, story, recursive)
    local n,v
    for n,v in pairs(story) do
        if n ~= "loaded" and n ~= "_G" then
            io.write (offset .. n .. " " )
            print (v)
            if type(v) == "table" and recursive then
                DebugHelp.listAllTables(offset .. "--> ",v)
            end
        end
    end
end

function DebugHelp.printTable(name, t)
    local d = DebugHelp.dump(t, "", 30)
    print(name..": " .. d .. "\n")
end

function DebugHelp.dump(o, prevPrefix, keyLimit)
    local prefix = prevPrefix.."  "

    if type(o) == 'table' then
        local s = prevPrefix..'{\n'
        local c = 0
        for k,v in pairs(o) do
            if type(k) ~= 'number' then
                k = '"'..k..'"'
            end
            s = s .. prefix .. '['..k..'] = ' .. DebugHelp.dump(v, prefix, 10) .. '\n'

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

return DebugHelp