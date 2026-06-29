--[[
	StealManager.lua
	Steal mechanic: a thief takes a % of an online target's exposed
	PendingCash, subject to cooldown, defense lock, and shield checks.
	Only online targets can be stolen from (their plot must be live).
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)
local GamePassManager = require(script.Parent.GamePassManager)

local StealManager = {}

function StealManager.AttemptSteal(thief, targetUserId)
	local thiefProfile = PlayerDataManager.Get(thief)
	if not thiefProfile then
		return { Success = false, Reason = "NoProfile" }
	end

	if targetUserId == thief.UserId then
		return { Success = false, Reason = "CannotStealSelf" }
	end

	local target = Players:GetPlayerByUserId(targetUserId)
	if not target then
		return { Success = false, Reason = "TargetOffline" }
	end

	local targetProfile = PlayerDataManager.Get(target)
	if not targetProfile then
		return { Success = false, Reason = "TargetNoProfile" }
	end

	local now = os.time()
	if thiefProfile.StealCooldownEndsAt > now then
		return { Success = false, Reason = "OnCooldown", CooldownEndsAt = thiefProfile.StealCooldownEndsAt }
	end

	if targetProfile.DefenseLockEndsAt > now then
		return { Success = false, Reason = "TargetDefended" }
	end
	if targetProfile.ShieldEndsAt > now then
		return { Success = false, Reason = "TargetShielded" }
	end

	if targetProfile.PendingCash < Config.Steal.MinTargetPendingCash then
		return { Success = false, Reason = "TargetTooPoor" }
	end

	local stolen = targetProfile.PendingCash * Config.Steal.StealPercent
	targetProfile.PendingCash -= stolen
	thiefProfile.Cash += stolen
	targetProfile.LastStolenAmount = stolen
	targetProfile.LastStolenAt = now

	local cooldown = Config.Steal.Cooldown
	if GamePassManager.HasPass(thief, "FasterSteal") then
		cooldown *= Config.Steal.FastStealCooldownMultiplier
	end
	thiefProfile.StealCooldownEndsAt = now + cooldown

	return {
		Success = true,
		Amount = stolen,
		TargetUserId = targetUserId,
		CooldownEndsAt = thiefProfile.StealCooldownEndsAt,
	}
end

-- Player-activated temporary shield against incoming steals. Has its own
-- cooldown so it can't be left on permanently.
function StealManager.ActivateDefense(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	local now = os.time()
	if profile.DefenseAvailableAt > now then
		return { Success = false, Reason = "OnCooldown", AvailableAt = profile.DefenseAvailableAt }
	end

	profile.DefenseLockEndsAt = now + Config.Steal.DefenseLockDuration
	profile.DefenseAvailableAt = profile.DefenseLockEndsAt + Config.Steal.DefenseLockCooldown

	return { Success = true, EndsAt = profile.DefenseLockEndsAt }
end

-- Granted by the Steal Shield developer product.
function StealManager.GrantShield(player, durationSeconds)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return
	end
	local now = os.time()
	local base = math.max(profile.ShieldEndsAt, now)
	profile.ShieldEndsAt = base + (durationSeconds or Config.Steal.ShieldProductDurationSeconds)
end

return StealManager
