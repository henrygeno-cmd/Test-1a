--[[
	Main.server.lua
	Server bootstrap: creates remotes, wires every RemoteFunction/RemoteEvent
	to its manager, handles player join/leave, registers ProcessReceipt, and
	starts all background loops. This is the only Script (not ModuleScript)
	on the server side; everything else is required from here.
]]

local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = require(ReplicatedStorage.Modules.Net)
Net.Setup()

local Modules = script.Parent.Modules
local PlayerDataManager = require(Modules.PlayerDataManager)
local GamePassManager = require(Modules.GamePassManager)
local UnitManager = require(Modules.UnitManager)
local StealManager = require(Modules.StealManager)
local RebirthManager = require(Modules.RebirthManager)
local EggManager = require(Modules.EggManager)
local DevProductManager = require(Modules.DevProductManager)
local SeasonalManager = require(Modules.SeasonalManager)
local DailyRewardManager = require(Modules.DailyRewardManager)
local TradeManager = require(Modules.TradeManager)
local LeaderboardManager = require(Modules.LeaderboardManager)

-- ============================================================
-- State push helpers
-- ============================================================

local function buildSnapshot(player, profile)
	return {
		Cash = profile.Cash,
		PendingCash = profile.PendingCash,
		Gems = profile.Gems,
		Units = profile.Units,
		Inventory = profile.Inventory,
		PlotSlotsUnlocked = profile.PlotSlotsUnlocked,
		Rebirths = profile.Rebirths,
		RebirthMultiplier = profile.RebirthMultiplier,
		IncomeRate = UnitManager.CalculateIncomeRate(player, profile),
		PendingCapacity = UnitManager.GetPendingCapacity(player, profile),
		StealCooldownEndsAt = profile.StealCooldownEndsAt,
		DefenseLockEndsAt = profile.DefenseLockEndsAt,
		DefenseAvailableAt = profile.DefenseAvailableAt,
		ShieldEndsAt = profile.ShieldEndsAt,
		TotalIncomeEarned = profile.TotalIncomeEarned,
	}
end

local function pushFullState(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return
	end
	Net.GetEvent("PlotDataUpdated"):FireClient(player, buildSnapshot(player, profile))
end

-- ============================================================
-- Player lifecycle
-- ============================================================

Players.PlayerAdded:Connect(function(player)
	local profile = PlayerDataManager.Load(player)
	GamePassManager.RefreshAll(player)
	UnitManager.ApplyOfflineIncome(player, profile)
	pushFullState(player)

	local activeEvents = SeasonalManager.GetActiveEventIds()
	if #activeEvents > 0 then
		Net.GetEvent("SeasonalIndexUpdated"):FireClient(player, activeEvents)
	end
end)

-- ============================================================
-- RemoteFunction handlers
-- ============================================================

Net.GetFunction("BuyUnit").OnServerInvoke = function(player, unitId, slotIndex)
	local result = UnitManager.BuyUnit(player, unitId, slotIndex)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("PlaceUnit").OnServerInvoke = function(player, inventoryIndex, slotIndex)
	local result = UnitManager.PlaceUnit(player, inventoryIndex, slotIndex)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("BuyPlotSlot").OnServerInvoke = function(player)
	local result = UnitManager.BuyPlotSlot(player)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("CollectIncome").OnServerInvoke = function(player)
	local result = UnitManager.Collect(player)
	pushFullState(player)
	return result
end

Net.GetFunction("StealAttempt").OnServerInvoke = function(player, targetUserId)
	local result = StealManager.AttemptSteal(player, targetUserId)
	if result.Success then
		pushFullState(player)
		local target = Players:GetPlayerByUserId(targetUserId)
		if target then
			pushFullState(target)
			Net.GetEvent("NotifyClient"):FireClient(target, { Type = "Stolen", Amount = result.Amount, ByUserId = player.UserId })
		end
	end
	return result
end

Net.GetFunction("ActivateDefense").OnServerInvoke = function(player)
	local result = StealManager.ActivateDefense(player)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("RequestRebirth").OnServerInvoke = function(player)
	local result = RebirthManager.RequestRebirth(player)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("HatchEgg").OnServerInvoke = function(player, eggId, count)
	local result = EggManager.Hatch(player, eggId, count)
	if result.Success then
		pushFullState(player)
		Net.GetEvent("RarityRevealed"):FireClient(player, result.Results)
	end
	return result
end

Net.GetFunction("GetOwnedGamePasses").OnServerInvoke = function(player)
	return GamePassManager.GetOwnedTable(player)
end

Net.GetFunction("DailyRewardClaim").OnServerInvoke = function(player)
	local result = DailyRewardManager.Claim(player)
	if result.Success then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("DailyRewardStatus").OnServerInvoke = function(player)
	return DailyRewardManager.GetStatus(player)
end

Net.GetFunction("TradeRequestSend").OnServerInvoke = function(player, targetUserId)
	return TradeManager.SendRequest(player, targetUserId)
end

Net.GetFunction("TradeRequestRespond").OnServerInvoke = function(player, accept)
	return TradeManager.RespondRequest(player, accept)
end

Net.GetFunction("TradeUpdateOffer").OnServerInvoke = function(player, cash, slotIndices)
	return TradeManager.UpdateOffer(player, cash, slotIndices)
end

Net.GetFunction("TradeConfirm").OnServerInvoke = function(player)
	local result = TradeManager.Confirm(player)
	if result.Success and not result.Waiting then
		pushFullState(player)
	end
	return result
end

Net.GetFunction("TradeCancel").OnServerInvoke = function(player)
	return TradeManager.Cancel(player)
end

Net.GetFunction("LeaderboardRequest").OnServerInvoke = function(player, count)
	return LeaderboardManager.GetTop(count)
end

-- ============================================================
-- Monetization
-- ============================================================

MarketplaceService.ProcessReceipt = DevProductManager.ProcessReceipt

-- ============================================================
-- Background loops
-- ============================================================

PlayerDataManager.StartAutoSaveLoop()
UnitManager.StartIncomeLoop()
UnitManager.StartAutoCollectLoop()
SeasonalManager.StartLoop()
TradeManager.StartLoop()
LeaderboardManager.StartLoop()

task.spawn(function()
	local tickEvent = Net.GetEvent("IncomeTick")
	while true do
		task.wait(2)
		for _, player in ipairs(Players:GetPlayers()) do
			local profile = PlayerDataManager.Get(player)
			if profile then
				tickEvent:FireClient(player, {
					Cash = profile.Cash,
					PendingCash = profile.PendingCash,
					IncomeRate = UnitManager.CalculateIncomeRate(player, profile),
					PendingCapacity = UnitManager.GetPendingCapacity(player, profile),
				})
			end
		end
	end
end)
