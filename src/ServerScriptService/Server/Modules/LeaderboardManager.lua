--[[
	LeaderboardManager.lua
	Global "lifetime income" leaderboard backed by an OrderedDataStore.
	Score is profile.TotalIncomeEarned, which only ever increases (income
	generation, not net worth), so being stolen from never knocks you down
	the board.
]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Modules.Config)
local PlayerDataManager = require(script.Parent.PlayerDataManager)

local LeaderboardManager = {}

local orderedStore = DataStoreService:GetOrderedDataStore(Config.Leaderboard.DataStoreName)

local function updatePlayerScore(player)
	local profile = PlayerDataManager.Get(player)
	if not profile then
		return
	end
	local score = math.floor(profile.TotalIncomeEarned)
	pcall(function()
		orderedStore:SetAsync(tostring(player.UserId), score)
	end)
end

function LeaderboardManager.StartLoop()
	task.spawn(function()
		while true do
			task.wait(Config.Leaderboard.UpdateIntervalSeconds)
			for _, player in ipairs(Players:GetPlayers()) do
				task.spawn(updatePlayerScore, player)
			end
		end
	end)
end

-- Returns an array of { UserId = number, Score = number } sorted descending.
function LeaderboardManager.GetTop(count)
	count = math.clamp(count or Config.Leaderboard.TopCount, 1, Config.Leaderboard.TopCount)

	local entries = {}
	local ok, pages = pcall(function()
		return orderedStore:GetSortedAsync(false, count)
	end)
	if not ok then
		return entries
	end

	local page = pages:GetCurrentPage()
	for _, item in ipairs(page) do
		table.insert(entries, { UserId = tonumber(item.key), Score = item.value })
	end
	return entries
end

return LeaderboardManager
