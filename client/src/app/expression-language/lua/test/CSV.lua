--[[
	CSV Library v1 (Author: Michael Lutz, 2022-12-14)
	Built on: http://lua-users.org/wiki/LuaCsv
	
	csv.load = function(filename, delimiter, header)
	filename := CSV file to load
	delimiter := Delimiter (";", ",", "\t", etc..), default = ','
	header := (optional) if first line is a header (true/false), default = false
	
	automatically removes quotes from text
	returns a table
	
	csv.save = function(filename, delimiter, data, header)
	filename := CSV file to write to
	delimiter := Delimiter (";", ",", "\t", etc..), default = ','
	data := a Lua table that holds the rows and columns
	header := a Lua table that holds the names of the columns e.g. { "Name", "Address", "Email", ... }
	
--]]

local function parse_row(input, sep, pos)
	local row = {}
	local pos = pos or 1
	--io.read()
	while true do
		local c = string.sub(input,pos,pos)
		if (c == "") then break end
		if (c == '"') then
			local text = ''
			local s,e,txt,c1
			repeat
				s,e,txt,c1 = string.find(input, '^(.-")(.)', pos+1)
				text = text..txt
				pos = e
				--print(txt, e, c1)
			until ((c1 == sep) or (c1 == "\r") or (c1 == "\n"))
			--print(string.sub(text,1,-2), c1)
			table.insert(row, string.sub(text,1,-2))
			c = c1
			pos = pos + 1
		else
            local pattern = "^([^%"..sep.."\r\n]-)([%"..sep.."\r\n])"
			local s,e,text,c1 = string.find(input, pattern, pos)
            if e == nil then
                -- Might be end of file without new line at the end...
                text = string.sub(input, pos)
                e = #input
                c1 = "\n"
            end
			pos = e+1
			--print(text, c1)
			table.insert(row, text)
			c = c1
		end
		if c == "\n" then
			return row, pos
		end
		if c == "\r" then
			return row, pos+1
		end
	end
end

local CSV = {}
CSV.load = function(filename, delimiter, header)
	local f,err = io.open(filename)
	if not f then
		print(err)
		return
	end
	local csv = f:read("*a")
	f:close()

	local sep = string.sub(delimiter,1,1) or ','
	local pos = 1
	local t_csv = {}
	local f_header = nil
	local t_header = {}
	if header then
		t_header,pos = parse_row(csv, sep, pos)
		local head = {}
		for i,v in ipairs(t_header) do
			head[v] = i
		end
		f_header = function (t,k)
			local i = head[k]
			if i then
				return t[i]
			end
			return nil
		end
	end

	local row = {}
	row, pos = parse_row(csv, sep, pos)
	while row do
		if header then
			setmetatable(row, { __index = f_header })
		end
		table.insert(t_csv, row)
		row, pos = parse_row(csv, sep, pos)
	end
	return t_csv, t_header
end

local function format_csv(strIn, sep)
	local str, matches = string.gsub(strIn or "", '"', '""')
	if (string.find(str, "[%"..sep.."\r\n]") or (matches > 0)) then
		return '"'..str..'"'
	end
	return str
end
CSV.save = function(filename, delimiter, data, header)
	local f,err = io.open(filename, "w")
	if not f then
		print(err)
		return
	end
	local sep = string.sub(delimiter,1,1) or ','
	if header then
		local line = ""
		for i,v in ipairs(header) do
			line = line..format_csv(v, sep)..sep
		end
		line = string.sub(line, 1, -2)
		f:write(line.."\n")
	end
	for i,v in ipairs(data) do
		local line = ""
		for i2,v2 in ipairs(v) do
			line = line..format_csv(v2, sep)..sep
		end
		line = string.sub(line, 1, -2)
		f:write(line.."\n")
	end
	f:close()
end

return CSV