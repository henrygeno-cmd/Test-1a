--[[
	DailyRewardManager.lua
	Daily login streak rewards. A claim is available once at least
	MinHoursBetweenClaims has passed since the last one; waiting longer than
	ResetIfMissedHours resets the streak back to day 1. This doubles as the
	"come back in X" session incentive hook the design calls for.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)

local DailyRewardManager = {}

local HOUR = 3600

local function streakLength()
	local count = 0
	for _ in pairs(Config.DailyReward.Streak) do
		count += 1
	end
	return count
end

function DailyRewardManager.GetStatus(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Available = false }
	end

	local now = os.time()
	local hoursSinceLast = (now - profile.LastDailyClaim) / HOUR
	local available = profile.LastDailyClaim == 0 or hoursSinceLast >= Config.DailyReward.MinHoursBetweenClaims
	local nextClaimAt = profile.LastDailyClaim + (Config.DailyReward.MinHoursBetweenClaims * HOUR)

	return {
		Available = available,
		Streak = profile.DailyStreak,
		NextClaimAt = available and now or nextClaimAt,
	}
end

function DailyRewardManager.Claim(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	local now = os.time()
	local hoursSinceLast = (now - profile.LastDailyClaim) / HOUR

	if profile.LastDailyClaim ~= 0 and hoursSinceLast < Config.DailyReward.MinHoursBetweenClaims then
		return { Success = false, Reason = "TooSoon" }
	end

	if profile.LastDailyClaim == 0 or hoursSinceLast > Config.DailyReward.ResetIfMissedHours then
		profile.DailyStreak = 1
	else
		profile.DailyStreak = math.min(profile.DailyStreak + 1, streakLength())
	end

	local reward = Config.DailyReward.Streak[profile.DailyStreak] or Config.DailyReward.Streak[1]
	profile.Cash += reward.Cash or 0
	profile.Gems += reward.Gems or 0
	profile.LastDailyClaim = now

	return { Success = true, Reward = reward, Streak = profile.DailyStreak }
end

return DailyRewardManager
