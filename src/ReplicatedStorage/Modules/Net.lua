--[[
	Net.lua
	Thin networking helper shared by server and client. The server calls
	Net.Setup() once at startup to materialize RemoteEvent/RemoteFunction
	instances under ReplicatedStorage.Remotes; everyone else just calls
	Net.GetEvent/Net.GetFunction to fetch them by name.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RemoteNames = require(script.Parent.RemoteNames)

local Net = {}

local remotesFolder

local function getFolder()
	if remotesFolder and remotesFolder.Parent then
		return remotesFolder
	end
	remotesFolder = ReplicatedStorage:FindFirstChild("Remotes")
	if not remotesFolder then
		remotesFolder = Instance.new("Folder")
		remotesFolder.Name = "Remotes"
		remotesFolder.Parent = ReplicatedStorage
	end
	return remotesFolder
end

-- Server-only: idempotent, safe to call multiple times.
function Net.Setup()
	local folder = getFolder()
	for _, name in ipairs(RemoteNames.Events) do
		if not folder:FindFirstChild(name) then
			local remote = Instance.new("RemoteEvent")
			remote.Name = name
			remote.Parent = folder
		end
	end
	for _, name in ipairs(RemoteNames.Functions) do
		if not folder:FindFirstChild(name) then
			local remote = Instance.new("RemoteFunction")
			remote.Name = name
			remote.Parent = folder
		end
	end
end

function Net.GetEvent(name)
	return getFolder():WaitForChild(name)
end

function Net.GetFunction(name)
	return getFolder():WaitForChild(name)
end

return Net
