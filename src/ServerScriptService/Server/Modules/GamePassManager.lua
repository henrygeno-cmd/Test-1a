--[[
	GamePassManager.lua
	Caches game pass ownership per player so hot paths (income calc, steal
	cooldown, hatch luck) never block on MarketplaceService. Cache is
	refreshed on join and immediately after a purchase completes.
]]

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local Config = require(game:GetService("ReplicatedStorage").Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)

local GamePassManager = {}

local function checkOwnership(player, passId)
	if passId == 0 then
		return false
	end
	local ok, owns = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
	end)
	return ok and owns or false
end

-- Populates profile.OwnedGamePasses for every configured pass. Called once
-- on join; cheap enough to also call again on demand if ever needed.
function GamePassManager.RefreshAll(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return
	end
	for key, passData in pairs(Config.GamePasses) do
		profile.OwnedGamePasses[key] = checkOwnership(player, passData.Id)
	end
end

function GamePassManager.HasPass(player, passKey)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return false
	end
	return profile.OwnedGamePasses[passKey] == true
end

function GamePassManager.GetOwnedTable(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return {}
	end
	local snapshot = {}
	for key, owned in pairs(profile.OwnedGamePasses) do
		snapshot[key] = owned
	end
	return snapshot
end

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, gamePassId, wasPurchased)
	if not wasPurchased then
		return
	end
	for key, passData in pairs(Config.GamePasses) do
		if passData.Id == gamePassId then
			local profile = PlayerDataManager.Get(player)
			if profile then
				profile.OwnedGamePasses[key] = true
			end
			break
		end
	end
end)

return GamePassManager
