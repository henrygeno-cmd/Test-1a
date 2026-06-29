--[[
	RebirthManager.lua
	Prestige system: spend all current Cash to wipe units back to a fresh
	plot in exchange for a permanent, scaling income multiplier.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)

local RebirthManager = {}

function RebirthManager.GetRequirement(rebirths)
	return math.floor(Config.Rebirth.BaseCashRequirement * (Config.Rebirth.RequirementGrowth ^ rebirths))
end

local function doRebirth(profile)
	profile.Cash = 0
	profile.PendingCash = 0
	profile.Units = {}
	profile.Inventory = {}
	profile.PlotSlotsUnlocked = Config.Plot.BaseSlots
	profile.Rebirths += 1
	profile.RebirthMultiplier = 1 + (profile.Rebirths * Config.Rebirth.MultiplierPerRebirth)
end

function RebirthManager.RequestRebirth(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	if Config.Rebirth.MaxRebirths > 0 and profile.Rebirths >= Config.Rebirth.MaxRebirths then
		return { Success = false, Reason = "MaxRebirthsReached" }
	end

	local requirement = RebirthManager.GetRequirement(profile.Rebirths)
	if profile.Cash < requirement then
		return { Success = false, Reason = "InsufficientFunds", Requirement = requirement }
	end

	doRebirth(profile)

	return { Success = true, Rebirths = profile.Rebirths, RebirthMultiplier = profile.RebirthMultiplier }
end

-- Bypasses the cash requirement entirely. Used by the Instant Rebirth
-- developer product.
function RebirthManager.ForceRebirth(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end
	if Config.Rebirth.MaxRebirths > 0 and profile.Rebirths >= Config.Rebirth.MaxRebirths then
		return { Success = false, Reason = "MaxRebirthsReached" }
	end
	doRebirth(profile)
	return { Success = true, Rebirths = profile.Rebirths, RebirthMultiplier = profile.RebirthMultiplier }
end

return RebirthManager
