--[[
	DevProductManager.lua
	Handles every consumable developer product through a single
	ProcessReceipt entry point. Idempotency is enforced by recording each
	granted PurchaseId in the player's saved profile (GrantedReceipts), so a
	receipt can never be double-granted even across server restarts/retries.

	IMPORTANT: assign MarketplaceService.ProcessReceipt = DevProductManager.ProcessReceipt
	exactly once, from Main.server.lua.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Modules.Config)
local Net = require(ReplicatedStorage.Modules.Net)
local PlayerDataManager = require(script.Parent.PlayerDataManager)
local RebirthManager = require(script.Parent.RebirthManager)
local EggManager = require(script.Parent.EggManager)
local StealManager = require(script.Parent.StealManager)

local DevProductManager = {}

-- productId -> productKey, built once from Config.
local productIdToKey = {}
for key, data in pairs(Config.DevProducts) do
	if data.Id ~= 0 then
		productIdToKey[data.Id] = key
	end
end

-- Returns true on success. Should not yield in a way that risks losing the
-- result; the caller (ProcessReceipt) saves the profile right after.
local function grant(player, profile, key)
	local productData = Config.DevProducts[key]

	if key == "CashPackSmall" or key == "CashPackMedium" or key == "CashPackLarge" then
		profile.Cash += productData.GrantCash
	elseif key == "InstantRebirth" then
		RebirthManager.ForceRebirth(player)
	elseif key == "PremiumEggPull10x" then
		local result = EggManager.HatchFree(player, productData.EggId, productData.PullCount)
		if result.Success then
			Net.GetEvent("RarityRevealed"):FireClient(player, result.Results)
		end
	elseif key == "StealShield" then
		StealManager.GrantShield(player)
	elseif key == "Revive" then
		local now = os.time()
		if profile.LastStolenAmount > 0 and (now - profile.LastStolenAt) <= productData.RestoreWindowSeconds then
			profile.PendingCash += profile.LastStolenAmount
			profile.LastStolenAmount = 0
		else
			profile.Cash += productData.FallbackCash
		end
	else
		return false
	end

	return true
end

function DevProductManager.ProcessReceipt(receiptInfo)
	local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
	if not player then
		-- Player left before we could process; Roblox will retry later.
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local profile = PlayerDataManager.Get(player)
	if not profile then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- Already granted: acknowledge without granting again.
	if profile.GrantedReceipts[receiptInfo.PurchaseId] then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	local key = productIdToKey[receiptInfo.ProductId]
	if not key then
		warn("DevProductManager: unknown ProductId " .. tostring(receiptInfo.ProductId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local ok, grantedSuccessfully = pcall(grant, player, profile, key)
	if not ok or not grantedSuccessfully then
		warn("DevProductManager: failed to grant " .. key .. " - " .. tostring(grantedSuccessfully))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	profile.GrantedReceipts[receiptInfo.PurchaseId] = true

	-- Persist immediately so the grant + receipt record survive a crash
	-- before the next autosave tick.
	PlayerDataManager.Save(player)

	Net.GetEvent("ReceiptProcessed"):FireClient(player, key)

	return Enum.ProductPurchaseDecision.PurchaseGranted
end

return DevProductManager
