--[[
	GameAPI.lua
	Single client-side entry point UI scripts call into: wraps every
	RemoteFunction invocation plus the direct MarketplaceService prompts for
	game passes / developer products. Keeping this in one module means UI
	code never touches Net or MarketplaceService directly.
]]

local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Modules.Config)
local Net = require(ReplicatedStorage.Modules.Net)

local localPlayer = Players.LocalPlayer

local GameAPI = {}

-- Core loop
function GameAPI.BuyUnit(unitId, slotIndex)
	return Net.GetFunction("BuyUnit"):InvokeServer(unitId, slotIndex)
end

function GameAPI.PlaceUnit(inventoryIndex, slotIndex)
	return Net.GetFunction("PlaceUnit"):InvokeServer(inventoryIndex, slotIndex)
end

function GameAPI.BuyPlotSlot()
	return Net.GetFunction("BuyPlotSlot"):InvokeServer()
end

function GameAPI.CollectIncome()
	return Net.GetFunction("CollectIncome"):InvokeServer()
end

function GameAPI.StealAttempt(targetUserId)
	return Net.GetFunction("StealAttempt"):InvokeServer(targetUserId)
end

function GameAPI.ActivateDefense()
	return Net.GetFunction("ActivateDefense"):InvokeServer()
end

-- Progression
function GameAPI.RequestRebirth()
	return Net.GetFunction("RequestRebirth"):InvokeServer()
end

function GameAPI.HatchEgg(eggId, count)
	return Net.GetFunction("HatchEgg"):InvokeServer(eggId, count)
end

-- Monetization: game passes and developer products are purchased directly
-- through MarketplaceService; the server just reacts to the resulting
-- PromptGamePassPurchaseFinished / ProcessReceipt callbacks.
function GameAPI.PromptGamePassPurchase(passKey)
	local passData = Config.GamePasses[passKey]
	if passData and passData.Id ~= 0 then
		MarketplaceService:PromptGamePassPurchase(localPlayer, passData.Id)
	end
end

function GameAPI.PromptProductPurchase(productKey)
	local productData = Config.DevProducts[productKey]
	if productData and productData.Id ~= 0 then
		MarketplaceService:PromptProductPurchase(localPlayer, productData.Id)
	end
end

function GameAPI.GetOwnedGamePasses()
	return Net.GetFunction("GetOwnedGamePasses"):InvokeServer()
end

-- Retention
function GameAPI.DailyRewardStatus()
	return Net.GetFunction("DailyRewardStatus"):InvokeServer()
end

function GameAPI.DailyRewardClaim()
	return Net.GetFunction("DailyRewardClaim"):InvokeServer()
end

function GameAPI.LeaderboardRequest(count)
	return Net.GetFunction("LeaderboardRequest"):InvokeServer(count)
end

-- Trading
function GameAPI.TradeRequestSend(targetUserId)
	return Net.GetFunction("TradeRequestSend"):InvokeServer(targetUserId)
end

function GameAPI.TradeRequestRespond(accept)
	return Net.GetFunction("TradeRequestRespond"):InvokeServer(accept)
end

function GameAPI.TradeUpdateOffer(cash, slotIndices)
	return Net.GetFunction("TradeUpdateOffer"):InvokeServer(cash, slotIndices)
end

function GameAPI.TradeConfirm()
	return Net.GetFunction("TradeConfirm"):InvokeServer()
end

function GameAPI.TradeCancel()
	return Net.GetFunction("TradeCancel"):InvokeServer()
end

return GameAPI
