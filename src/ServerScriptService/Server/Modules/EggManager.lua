--[[
	EggManager.lua
	Gacha egg system: weighted rarity rolls, a pity counter that guarantees
	a strong pull after enough unlucky attempts, and luck scaling from the
	2x Luck game pass / premium currency.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)
local GamePassManager = require(script.Parent.GamePassManager)

local EggManager = {}

local function getLuckMultiplier(player)
	if GamePassManager.HasPass(player, "DoubleLuck") then
		return Config.GamePasses.DoubleLuck.LuckMultiplier
	end
	return 1
end

local function rarityIndex(rarity)
	for i, name in ipairs(Config.RarityOrder) do
		if name == rarity then
			return i
		end
	end
	return 1
end

-- Luck scales up the weight of every rarity above Common, proportional to
-- how rare it is, then renormalizes. Common's weight is left untouched so
-- it always shrinks in relative share as luck increases.
local function rollRarity(weights, luckMultiplier)
	local total = 0
	local adjusted = {}
	for rarity, weight in pairs(weights) do
		local mult = (rarity == "Common") and 1 or luckMultiplier
		adjusted[rarity] = weight * mult
		total += adjusted[rarity]
	end

	local roll = math.random() * total
	local cumulative = 0
	for _, rarity in ipairs(Config.RarityOrder) do
		if adjusted[rarity] then
			cumulative += adjusted[rarity]
			if roll <= cumulative then
				return rarity
			end
		end
	end
	return Config.RarityOrder[1]
end

local function hatchOnce(player, profile, eggConfig)
	local weights = eggConfig.WeightOverride or {}
	if next(weights) == nil then
		for rarity, data in pairs(Config.Rarities) do
			weights[rarity] = data.Weight
		end
	end

	local luckMultiplier = getLuckMultiplier(player)
	local pityCounter = profile.PityCounters[eggConfig.Id] or 0
	local pityIndex = rarityIndex(eggConfig.PityRarity)

	local rarity
	if pityCounter >= eggConfig.PityThreshold - 1 then
		rarity = eggConfig.PityRarity
	else
		rarity = rollRarity(weights, luckMultiplier)
	end

	if rarityIndex(rarity) >= pityIndex then
		profile.PityCounters[eggConfig.Id] = 0
	else
		profile.PityCounters[eggConfig.Id] = pityCounter + 1
	end

	local pool = eggConfig.Pool[rarity]
	local unitId = pool[math.random(1, #pool)]

	table.insert(profile.Inventory, unitId)

	return { UnitId = unitId, Rarity = rarity }
end

-- count defaults to 1. Cost is charged per-pull, validated up front so a
-- multi-pull either fully succeeds or fully fails (no partial charge).
function EggManager.Hatch(player, eggId, count)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	local eggConfig = Config.Eggs[eggId]
	if not eggConfig then
		return { Success = false, Reason = "InvalidEgg" }
	end

	count = math.clamp(count or 1, 1, 10)
	local totalCost = eggConfig.Cost * count

	local balanceField = eggConfig.Currency -- "Cash" or "Gems"
	if profile[balanceField] < totalCost then
		return { Success = false, Reason = "InsufficientFunds", Cost = totalCost }
	end

	profile[balanceField] -= totalCost

	local results = {}
	for i = 1, count do
		results[i] = hatchOnce(player, profile, eggConfig)
	end

	return { Success = true, Results = results, Cost = totalCost }
end

-- Used by the Premium Egg Pull (10x) developer product: hatches are free
-- (already paid for via Robux) but still go through the same pity/luck path.
function EggManager.HatchFree(player, eggId, count)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end
	local eggConfig = Config.Eggs[eggId]
	if not eggConfig then
		return { Success = false, Reason = "InvalidEgg" }
	end

	count = math.clamp(count or 1, 1, 10)
	local results = {}
	for i = 1, count do
		results[i] = hatchOnce(player, profile, eggConfig)
	end
	return { Success = true, Results = results }
end

return EggManager
