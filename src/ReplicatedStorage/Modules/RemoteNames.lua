--[[
	RemoteNames.lua
	Declares every RemoteEvent/RemoteFunction the game uses. Net.lua reads
	this list to create the Instances on the server; client modules read it
	to know what to WaitForChild for. Keeping the list here means adding a
	new remote is a one-line change in one place.
]]

return {
	Events = {
		"PlotDataUpdated",        -- server -> client: full or partial plot/profile state push
		"IncomeTick",              -- server -> client: periodic {Cash, PendingCash, IncomeRate}
		"RarityRevealed",          -- server -> client: egg hatch result for reveal animation
		"ReceiptProcessed",        -- server -> client: a developer product was granted
		"SeasonalIndexUpdated",    -- server -> client: active seasonal events changed
		"TradeStateChanged",       -- server -> client: trade session updated
		"NotifyClient",            -- server -> client: generic toast/notification {Type, Message}
	},
	Functions = {
		"BuyUnit",                 -- client -> server: {unitId} -> {Success, Reason, NewState}
		"PlaceUnit",                -- client -> server: {inventoryIndex, slotIndex} -> {Success, Reason}
		"BuyPlotSlot",              -- client -> server: () -> {Success, Reason}
		"CollectIncome",            -- client -> server: () -> {Success, Collected}
		"StealAttempt",             -- client -> server: {targetUserId} -> {Success, Reason, Amount}
		"ActivateDefense",          -- client -> server: () -> {Success, Reason, EndsAt}
		"RequestRebirth",           -- client -> server: () -> {Success, Reason}
		"HatchEgg",                 -- client -> server: {eggId, count} -> {Success, Reason, Results}
		"GetOwnedGamePasses",       -- client -> server: () -> {[passKey]=bool}
		"DailyRewardClaim",         -- client -> server: () -> {Success, Reason, Reward, Streak}
		"DailyRewardStatus",        -- client -> server: () -> {Available, Streak, NextClaimAt}
		"TradeRequestSend",         -- client -> server: {targetUserId} -> {Success, Reason}
		"TradeRequestRespond",      -- client -> server: {accept} -> {Success, Reason}
		"TradeUpdateOffer",         -- client -> server: {cash, unitInventoryIndices} -> {Success, Reason}
		"TradeConfirm",             -- client -> server: () -> {Success, Reason}
		"TradeCancel",              -- client -> server: () -> {Success}
		"LeaderboardRequest",       -- client -> server: {count} -> {Entries}
	},
}
