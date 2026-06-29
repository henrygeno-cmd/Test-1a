--[[
	Main.client.lua
	Client bootstrap: wires every server-pushed RemoteEvent into ClientState
	so UI modules (not included here) can bind to a single source of truth
	instead of each listening to remotes individually.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Net = require(ReplicatedStorage.Modules.Net)

local ClientState = require(script.Parent.Modules.ClientState)

Net.GetEvent("PlotDataUpdated").OnClientEvent:Connect(ClientState.SetSnapshot)
Net.GetEvent("IncomeTick").OnClientEvent:Connect(ClientState.SetTick)
Net.GetEvent("SeasonalIndexUpdated").OnClientEvent:Connect(ClientState.SetActiveSeasonalEvents)
Net.GetEvent("TradeStateChanged").OnClientEvent:Connect(ClientState.SetTradeState)

Net.GetEvent("RarityRevealed").OnClientEvent:Connect(function(results)
	ClientState.Notify("RarityRevealed", results)
end)

Net.GetEvent("ReceiptProcessed").OnClientEvent:Connect(function(productKey)
	ClientState.Notify("ReceiptProcessed", productKey)
end)

Net.GetEvent("NotifyClient").OnClientEvent:Connect(function(payload)
	ClientState.Notify("Toast", payload)
end)
