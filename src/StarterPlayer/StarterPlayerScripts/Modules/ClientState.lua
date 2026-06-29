--[[
	ClientState.lua
	Holds the latest server-pushed snapshot and exposes a tiny pub/sub so UI
	modules can react to updates without each one wiring its own RemoteEvent
	listener.
]]

local ClientState = {
	Snapshot = {},
	ActiveSeasonalEvents = {},
	ActiveTrade = nil,
}

local listeners = {}

function ClientState.OnChanged(callback)
	table.insert(listeners, callback)
	return function()
		local index = table.find(listeners, callback)
		if index then
			table.remove(listeners, index)
		end
	end
end

local function notify(eventName, payload)
	for _, callback in ipairs(listeners) do
		task.spawn(callback, eventName, payload)
	end
end

function ClientState.SetSnapshot(data)
	ClientState.Snapshot = data
	notify("Snapshot", data)
end

function ClientState.SetTick(data)
	for key, value in pairs(data) do
		ClientState.Snapshot[key] = value
	end
	notify("Tick", data)
end

function ClientState.SetActiveSeasonalEvents(ids)
	ClientState.ActiveSeasonalEvents = ids
	notify("SeasonalEvents", ids)
end

function ClientState.SetTradeState(state)
	ClientState.ActiveTrade = state
	notify("Trade", state)
end

function ClientState.Notify(eventName, payload)
	notify(eventName, payload)
end

return ClientState
