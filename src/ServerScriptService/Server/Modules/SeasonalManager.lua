--[[
	SeasonalManager.lua
	Limited-time event units. Flip Config.Seasonal.Events[n].Enabled (and
	set Start/EndTime) to run an event; units in UnitIds are only purchasable
	while their event is active, creating real scarcity/FOMO. Broadcasts the
	active index to clients so UI can show countdowns/banners.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local Config = require(ReplicatedStorage.Modules.Config)
local Net = require(ReplicatedStorage.Modules.Net)

local SeasonalManager = {}

local activeEventIds = {}

local function computeActiveEvents()
	local active = {}
	if not Config.Seasonal.EventsEnabled then
		return active
	end
	local now = os.time()
	for _, event in ipairs(Config.Seasonal.Events) do
		if event.Enabled and now >= event.StartTime and (event.EndTime == 0 or now <= event.EndTime) then
			table.insert(active, event.Id)
		end
	end
	return active
end

local function setsEqual(a, b)
	if #a ~= #b then
		return false
	end
	local lookup = {}
	for _, v in ipairs(a) do
		lookup[v] = true
	end
	for _, v in ipairs(b) do
		if not lookup[v] then
			return false
		end
	end
	return true
end

-- A unit is purchasable if it's not part of any seasonal event, or its
-- event is currently active.
function SeasonalManager.IsUnitAvailable(unitId)
	local belongsToEvent = false
	for _, event in ipairs(Config.Seasonal.Events) do
		for _, id in ipairs(event.UnitIds) do
			if id == unitId then
				belongsToEvent = true
				if table.find(activeEventIds, event.Id) then
					return true
				end
			end
		end
	end
	return not belongsToEvent
end

function SeasonalManager.GetActiveEventIds()
	return activeEventIds
end

function SeasonalManager.StartLoop()
	activeEventIds = computeActiveEvents()
	task.spawn(function()
		while true do
			local newActive = computeActiveEvents()
			if not setsEqual(newActive, activeEventIds) then
				activeEventIds = newActive
				local event = Net.GetEvent("SeasonalIndexUpdated")
				for _, player in ipairs(Players:GetPlayers()) do
					event:FireClient(player, activeEventIds)
				end
			end
			task.wait(Config.Seasonal.PollIntervalSeconds)
		end
	end)
end

return SeasonalManager
