--[[
	UnitManager.lua
	Core loop: unit purchasing, placement, passive income generation, and
	the Pending -> Cash collection flow.

	Design note: units generate income into PendingCash, which sits exposed
	at the plot (and is what StealManager targets). Collecting moves it into
	Cash, which is safe. This is what gives the +Storage and Auto-Collect
	game passes real meaning: Storage raises how much Pending can pile up
	before it caps, Auto-Collect periodically banks it automatically so the
	owner is rarely exposed.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)
local GamePassManager = require(script.Parent.GamePassManager)
local SeasonalManager = require(script.Parent.SeasonalManager)

local UnitManager = {}

local function getUnitConfig(unitId)
	return Config.Units[unitId]
end
UnitManager.GetUnitConfig = getUnitConfig

local function countOwned(profile, unitId)
	local count = 0
	for _, placedUnitId in pairs(profile.Units) do
		if placedUnitId == unitId then
			count += 1
		end
	end
	for _, invUnitId in ipairs(profile.Inventory) do
		if invUnitId == unitId then
			count += 1
		end
	end
	return count
end

function UnitManager.GetUnitCost(profile, unitId)
	local unitConfig = getUnitConfig(unitId)
	if not unitConfig then
		return nil
	end
	local owned = countOwned(profile, unitId)
	return math.floor(unitConfig.BaseCost * (unitConfig.CostGrowth ^ owned))
end

-- Sum of every placed unit's income, with rarity, rebirth, and VIP pass
-- multipliers applied. This is the player's cash-per-second rate.
function UnitManager.CalculateIncomeRate(player, profile)
	local total = 0
	for _, unitId in pairs(profile.Units) do
		local unitConfig = getUnitConfig(unitId)
		if unitConfig then
			local rarityData = Config.Rarities[unitConfig.Rarity]
			local rarityMult = rarityData and rarityData.IncomeMult or 1
			total += unitConfig.BaseIncome * rarityMult
		end
	end

	total *= profile.RebirthMultiplier

	if GamePassManager.HasPass(player, "VIP") then
		total *= Config.GamePasses.VIP.IncomeMultiplier
	end

	return total
end

function UnitManager.GetPendingCapacity(player, profile)
	local rate = UnitManager.CalculateIncomeRate(player, profile)
	local capacity = rate * Config.Plot.BasePendingCapacitySeconds
	if GamePassManager.HasPass(player, "ExtraStorage") then
		capacity *= Config.Plot.ExtraStorageCapacityMultiplier
	end
	-- Floor so an empty plot doesn't have zero capacity (still useful once
	-- first unit is bought, and avoids div/edge issues elsewhere).
	return math.max(capacity, 100)
end

local function firstEmptySlot(profile)
	for slot = 1, profile.PlotSlotsUnlocked do
		if profile.Units[slot] == nil then
			return slot
		end
	end
	return nil
end

-- Buys a brand-new copy of unitId and places it in an empty slot (or the
-- explicit slotIndex if provided and valid/empty).
function UnitManager.BuyUnit(player, unitId, slotIndex)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	local unitConfig = getUnitConfig(unitId)
	if not unitConfig then
		return { Success = false, Reason = "InvalidUnit" }
	end
	if not SeasonalManager.IsUnitAvailable(unitId) then
		return { Success = false, Reason = "EventEnded" }
	end

	local targetSlot = slotIndex
	if targetSlot ~= nil then
		if type(targetSlot) ~= "number" or targetSlot < 1 or targetSlot > profile.PlotSlotsUnlocked then
			return { Success = false, Reason = "InvalidSlot" }
		end
		if profile.Units[targetSlot] ~= nil then
			return { Success = false, Reason = "SlotOccupied" }
		end
	else
		targetSlot = firstEmptySlot(profile)
		if not targetSlot then
			return { Success = false, Reason = "NoEmptySlot" }
		end
	end

	local cost = UnitManager.GetUnitCost(profile, unitId)
	if profile.Cash < cost then
		return { Success = false, Reason = "InsufficientFunds" }
	end

	profile.Cash -= cost
	profile.Units[targetSlot] = unitId

	return { Success = true, SlotIndex = targetSlot, Cost = cost }
end

-- Places a previously hatched (inventory) unit into an empty/explicit slot.
function UnitManager.PlaceUnit(player, inventoryIndex, slotIndex)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	local unitId = profile.Inventory[inventoryIndex]
	if not unitId then
		return { Success = false, Reason = "InvalidInventoryIndex" }
	end

	local targetSlot = slotIndex or firstEmptySlot(profile)
	if not targetSlot or targetSlot < 1 or targetSlot > profile.PlotSlotsUnlocked then
		return { Success = false, Reason = "InvalidSlot" }
	end
	if profile.Units[targetSlot] ~= nil then
		return { Success = false, Reason = "SlotOccupied" }
	end

	table.remove(profile.Inventory, inventoryIndex)
	profile.Units[targetSlot] = unitId

	return { Success = true, SlotIndex = targetSlot }
end

function UnitManager.BuyPlotSlot(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end
	if profile.PlotSlotsUnlocked >= Config.Plot.MaxSlots then
		return { Success = false, Reason = "MaxSlotsReached" }
	end

	local slotsAboveBase = profile.PlotSlotsUnlocked - Config.Plot.BaseSlots
	local cost = math.floor(Config.Plot.SlotUnlockBaseCost * (Config.Plot.SlotUnlockCostGrowth ^ slotsAboveBase))
	if profile.Cash < cost then
		return { Success = false, Reason = "InsufficientFunds" }
	end

	profile.Cash -= cost
	profile.PlotSlotsUnlocked += 1

	return { Success = true, NewSlotCount = profile.PlotSlotsUnlocked, Cost = cost }
end

-- Moves PendingCash into Cash. Returns the amount collected.
function UnitManager.Collect(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile", Collected = 0 }
	end
	local amount = profile.PendingCash
	profile.Cash += amount
	profile.PendingCash = 0
	return { Success = true, Collected = amount }
end

-- Grants pending income for `seconds` of elapsed time, capped by storage
-- capacity. Also bumps the lifetime TotalIncomeEarned counter used by the
-- leaderboard (monotonic regardless of theft/collection).
function UnitManager.AccrueIncome(player, profile, seconds)
	local rate = UnitManager.CalculateIncomeRate(player, profile)
	if rate <= 0 or seconds <= 0 then
		return
	end
	local gained = rate * seconds
	local capacity = UnitManager.GetPendingCapacity(player, profile)
	profile.PendingCash = math.min(profile.PendingCash + gained, capacity)
	profile.TotalIncomeEarned += gained
end

-- Applied once at PlayerAdded, after the profile has loaded, to grant
-- income for time spent offline (capped).
function UnitManager.ApplyOfflineIncome(player, profile)
	local elapsed = os.time() - (profile.LastOnlineTimestamp or os.time())
	elapsed = math.clamp(elapsed, 0, Config.Plot.OfflineIncomeCapSeconds)
	if elapsed > 0 then
		UnitManager.AccrueIncome(player, profile, elapsed)
	end
end

local TICK_INTERVAL = 1

function UnitManager.StartIncomeLoop()
	task.spawn(function()
		while true do
			task.wait(TICK_INTERVAL)
			for _, player in ipairs(Players:GetPlayers()) do
				local profile = PlayerDataManager.Get(player)
				if profile then
					UnitManager.AccrueIncome(player, profile, TICK_INTERVAL)
				end
			end
		end
	end)
end

-- Auto-Collect game pass: periodically banks Pending -> Cash for owners so
-- they're effectively immune to steal most of the time.
function UnitManager.StartAutoCollectLoop()
	task.spawn(function()
		while true do
			task.wait(Config.GamePasses.AutoCollect.IntervalSeconds)
			for _, player in ipairs(Players:GetPlayers()) do
				if GamePassManager.HasPass(player, "AutoCollect") then
					UnitManager.Collect(player)
				end
			end
		end
	end)
end

return UnitManager
