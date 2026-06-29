--[[
	PlayerDataManager.lua
	Owns the DataStore-backed player profile: loading, saving, autosave,
	and the in-memory cache every other server module reads/writes through.
	No other module talks to DataStoreService directly.
]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local Config = require(game:GetService("ReplicatedStorage").Modules.Config)

local PlayerDataManager = {}

local store = DataStoreService:GetDataStore(Config.SaveSettings.DataStoreName)
local profiles = {} -- [Player] = profileTable
local saving = {} -- [Player] = true while a save is in flight (avoid overlapping saves)

local function defaultProfile()
	return {
		Cash = 0,
		PendingCash = 0,
		Gems = 0,
		Units = {}, -- { [slotIndex] = unitId }
		Inventory = {}, -- hatched-but-unplaced unit ids, array
		PlotSlotsUnlocked = Config.Plot.BaseSlots,
		Rebirths = 0,
		RebirthMultiplier = 1,
		TotalIncomeEarned = 0,
		LastOnlineTimestamp = os.time(),
		StealCooldownEndsAt = 0,
		DefenseLockEndsAt = 0,
		DefenseAvailableAt = 0,
		ShieldEndsAt = 0,
		LastStolenAmount = 0,
		LastStolenAt = 0,
		OwnedGamePasses = {},
		PityCounters = {}, -- [eggId] = count
		DailyStreak = 0,
		LastDailyClaim = 0,
		SeasonalUnitsOwned = {},
		GrantedReceipts = {}, -- [purchaseId] = true, for idempotent ProcessReceipt
		Settings = { AutoCollect = false },
	}
end

-- Fills any field missing from a loaded (possibly old-schema) save with the
-- current default, without clobbering existing values.
local function reconcile(data, template)
	for key, defaultValue in pairs(template) do
		if data[key] == nil then
			data[key] = defaultValue
		elseif type(defaultValue) == "table" and type(data[key]) == "table" then
			reconcile(data[key], defaultValue)
		end
	end
	return data
end

local function attemptWithRetry(fn)
	local attempts = Config.SaveSettings.SaveRetryAttempts
	local backoff = Config.SaveSettings.SaveRetryBackoffSeconds
	for attempt = 1, attempts do
		local ok, result = pcall(fn)
		if ok then
			return true, result
		end
		if attempt < attempts then
			task.wait(backoff * attempt)
		end
	end
	return false, nil
end

function PlayerDataManager.Load(player)
	local key = "Player_" .. player.UserId
	local ok, data = attemptWithRetry(function()
		return store:GetAsync(key)
	end)

	if not ok then
		warn(("PlayerDataManager: failed to load data for %s after retries"):format(player.Name))
	end

	data = data or {}
	data = reconcile(data, defaultProfile())
	profiles[player] = data
	return data
end

function PlayerDataManager.Get(player)
	return profiles[player]
end

function PlayerDataManager.Save(player)
	local data = profiles[player]
	if not data or saving[player] then
		return false
	end
	saving[player] = true
	data.LastOnlineTimestamp = os.time()

	local key = "Player_" .. player.UserId
	local ok = attemptWithRetry(function()
		store:SetAsync(key, data)
	end)
	saving[player] = false

	if not ok then
		warn(("PlayerDataManager: failed to save data for %s after retries"):format(player.Name))
	end
	return ok
end

function PlayerDataManager.Remove(player)
	profiles[player] = nil
end

function PlayerDataManager.SaveAll()
	for player in pairs(profiles) do
		PlayerDataManager.Save(player)
	end
end

function PlayerDataManager.StartAutoSaveLoop()
	task.spawn(function()
		while true do
			task.wait(Config.SaveSettings.AutoSaveIntervalSeconds)
			for player in pairs(profiles) do
				task.spawn(PlayerDataManager.Save, player)
			end
		end
	end)
end

Players.PlayerRemoving:Connect(function(player)
	PlayerDataManager.Save(player)
	PlayerDataManager.Remove(player)
end)

game:BindToClose(function()
	for player in pairs(profiles) do
		PlayerDataManager.Save(player)
	end
end)

return PlayerDataManager
