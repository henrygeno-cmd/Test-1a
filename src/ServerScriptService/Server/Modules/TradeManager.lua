--[[
	TradeManager.lua
	Server-authoritative, both-confirm trading. Anti-scam measures:
	  - any offer change resets BOTH confirmations
	  - offers are re-validated against live profile state at the moment of
	    execution (not just when the offer was set), so you can't confirm,
	    then spend/sell what you offered, then have it still go through
	  - only banked Cash (never exposed PendingCash) can be traded
	  - sessions/invites time out automatically
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Modules.Config)
local Net = require(ReplicatedStorage.Modules.Net)
local PlayerDataManager = require(script.Parent.PlayerDataManager)

local TradeManager = {}

local pendingInvites = {} -- [targetPlayer] = { From = player, ExpiresAt = number }
local sessions = {} -- [player] = sessionTable (same table shared by both sides)
local lastTradeAt = {} -- [player] = os.time() of last completed trade

local function notifyBoth(session, payload)
	Net.GetEvent("TradeStateChanged"):FireClient(session.PlayerA, payload)
	Net.GetEvent("TradeStateChanged"):FireClient(session.PlayerB, payload)
end

local function clearSession(session)
	sessions[session.PlayerA] = nil
	sessions[session.PlayerB] = nil
end

local function getSide(session, player)
	if session.PlayerA == player then
		return "A"
	elseif session.PlayerB == player then
		return "B"
	end
	return nil
end

function TradeManager.SendRequest(player, targetUserId)
	if sessions[player] then
		return { Success = false, Reason = "AlreadyTrading" }
	end
	if lastTradeAt[player] and os.time() - lastTradeAt[player] < Config.Trade.CooldownBetweenTradesSeconds then
		return { Success = false, Reason = "OnCooldown" }
	end

	local target = Players:GetPlayerByUserId(targetUserId)
	if not target or target == player then
		return { Success = false, Reason = "InvalidTarget" }
	end
	if sessions[target] or pendingInvites[target] then
		return { Success = false, Reason = "TargetBusy" }
	end

	pendingInvites[target] = { From = player, ExpiresAt = os.time() + Config.Trade.InviteTimeoutSeconds }
	Net.GetEvent("NotifyClient"):FireClient(target, { Type = "TradeInvite", FromUserId = player.UserId })

	return { Success = true }
end

function TradeManager.RespondRequest(player, accept)
	local invite = pendingInvites[player]
	if not invite or invite.ExpiresAt < os.time() then
		pendingInvites[player] = nil
		return { Success = false, Reason = "NoInvite" }
	end
	pendingInvites[player] = nil

	if not accept then
		Net.GetEvent("NotifyClient"):FireClient(invite.From, { Type = "TradeDeclined" })
		return { Success = true }
	end

	if not invite.From.Parent or sessions[invite.From] then
		return { Success = false, Reason = "InviterUnavailable" }
	end

	local session = {
		PlayerA = invite.From,
		PlayerB = player,
		OfferA = { Cash = 0, Slots = {} },
		OfferB = { Cash = 0, Slots = {} },
		ConfirmA = false,
		ConfirmB = false,
		CreatedAt = os.time(),
		LastUpdate = os.time(),
	}
	sessions[invite.From] = session
	sessions[player] = session

	notifyBoth(session, { Type = "Started", PlayerAUserId = session.PlayerA.UserId, PlayerBUserId = session.PlayerB.UserId })
	return { Success = true }
end

-- slotIndices: array of plot slot indices the player is offering (units stay
-- in place until the trade actually executes).
function TradeManager.UpdateOffer(player, cash, slotIndices)
	local session = sessions[player]
	if not session then
		return { Success = false, Reason = "NoSession" }
	end
	local side = getSide(session, player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return { Success = false, Reason = "NoProfile" }
	end

	cash = math.max(0, math.floor(cash or 0))
	if cash > profile.Cash then
		return { Success = false, Reason = "InsufficientCash" }
	end

	slotIndices = slotIndices or {}
	if #slotIndices > Config.Trade.MaxUnitsPerSide then
		return { Success = false, Reason = "TooManyUnits" }
	end
	local seen = {}
	for _, slot in ipairs(slotIndices) do
		if seen[slot] or not profile.Units[slot] then
			return { Success = false, Reason = "InvalidUnitSlot" }
		end
		seen[slot] = true
	end

	local offer = (side == "A") and session.OfferA or session.OfferB
	offer.Cash = cash
	offer.Slots = slotIndices

	session.ConfirmA = false
	session.ConfirmB = false
	session.LastUpdate = os.time()

	notifyBoth(session, {
		Type = "OfferUpdated",
		OfferA = session.OfferA,
		OfferB = session.OfferB,
		ConfirmA = false,
		ConfirmB = false,
	})
	return { Success = true }
end

local function offerStillValid(profile, offer)
	if offer.Cash > profile.Cash then
		return false
	end
	for _, slot in ipairs(offer.Slots) do
		if not profile.Units[slot] then
			return false
		end
	end
	return true
end

local function executeTrade(session)
	local profileA = PlayerDataManager.Get(session.PlayerA)
	local profileB = PlayerDataManager.Get(session.PlayerB)
	if not profileA or not profileB then
		return false, "ProfileMissing"
	end

	if not offerStillValid(profileA, session.OfferA) or not offerStillValid(profileB, session.OfferB) then
		return false, "OfferNoLongerValid"
	end

	-- Pull unit ids out before mutating either side's Units table.
	local unitsFromA, unitsFromB = {}, {}
	for _, slot in ipairs(session.OfferA.Slots) do
		table.insert(unitsFromA, profileA.Units[slot])
		profileA.Units[slot] = nil
	end
	for _, slot in ipairs(session.OfferB.Slots) do
		table.insert(unitsFromB, profileB.Units[slot])
		profileB.Units[slot] = nil
	end

	for _, unitId in ipairs(unitsFromA) do
		table.insert(profileB.Inventory, unitId)
	end
	for _, unitId in ipairs(unitsFromB) do
		table.insert(profileA.Inventory, unitId)
	end

	profileA.Cash -= session.OfferA.Cash
	profileB.Cash += session.OfferA.Cash
	profileB.Cash -= session.OfferB.Cash
	profileA.Cash += session.OfferB.Cash

	return true
end

function TradeManager.Confirm(player)
	local session = sessions[player]
	if not session then
		return { Success = false, Reason = "NoSession" }
	end
	local side = getSide(session, player)
	if side == "A" then
		session.ConfirmA = true
	else
		session.ConfirmB = true
	end

	if session.ConfirmA and session.ConfirmB then
		local ok, reason = executeTrade(session)
		clearSession(session)
		lastTradeAt[session.PlayerA] = os.time()
		lastTradeAt[session.PlayerB] = os.time()
		notifyBoth(session, { Type = ok and "Completed" or "Failed", Reason = reason })
		return { Success = ok, Reason = reason }
	end

	notifyBoth(session, { Type = "OfferUpdated", OfferA = session.OfferA, OfferB = session.OfferB, ConfirmA = session.ConfirmA, ConfirmB = session.ConfirmB })
	return { Success = true, Waiting = true }
end

function TradeManager.Cancel(player)
	local session = sessions[player]
	if session then
		clearSession(session)
		notifyBoth(session, { Type = "Cancelled" })
	end
	pendingInvites[player] = nil
	return { Success = true }
end

function TradeManager.StartLoop()
	task.spawn(function()
		while true do
			task.wait(5)
			local now = os.time()

			for target, invite in pairs(pendingInvites) do
				if invite.ExpiresAt < now then
					pendingInvites[target] = nil
				end
			end

			local seen = {}
			for player, session in pairs(sessions) do
				if not seen[session] then
					seen[session] = true
					if now - session.LastUpdate > Config.Trade.ConfirmTimeoutSeconds then
						clearSession(session)
						notifyBoth(session, { Type = "TimedOut" })
					end
				end
			end
		end
	end)
end

Players.PlayerRemoving:Connect(function(player)
	TradeManager.Cancel(player)
end)

return TradeManager
