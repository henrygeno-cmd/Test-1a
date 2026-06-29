# Idle Collector Tycoon

Mobile-first idle tycoon: buy voxel units that passively generate cash,
steal exposed cash from other players' plots, hatch eggs for rare units,
and rebirth for permanent multipliers.

Sync `src/` into Studio with [Rojo](https://rojo.space/) using
`default.project.json`, or copy each folder manually per the table below.

## Design note: Pending vs. Cash

Units generate income into **PendingCash**, which sits exposed at the
plot and is what the steal mechanic targets. Tapping Collect (or owning
the Auto-Collect game pass) moves it into **Cash**, which is safe from
theft. This is what gives +Storage (raises Pending capacity) and
Auto-Collect (banks Pending automatically) real teeth.

## Project structure

```
src/
  ReplicatedStorage/
    Modules/
      Config.lua        -- every tunable number, single source of truth
      RemoteNames.lua    -- declares all RemoteEvent/RemoteFunction names
      Net.lua            -- creates/fetches remotes by name
  ServerScriptService/
    Server/
      Main.server.lua    -- bootstrap: wires remotes, starts loops, ProcessReceipt
      Modules/
        PlayerDataManager.lua   -- DataStore load/save/autosave
        GamePassManager.lua     -- game pass ownership cache
        UnitManager.lua         -- buying, placement, passive/pending income
        StealManager.lua        -- steal mechanic, defense, shield
        RebirthManager.lua      -- prestige reset + permanent multiplier
        EggManager.lua          -- gacha hatch, pity counter, luck
        DevProductManager.lua   -- ProcessReceipt, idempotent grants
        SeasonalManager.lua     -- limited-time event unit gating
        DailyRewardManager.lua  -- login streak rewards
        TradeManager.lua        -- both-confirm trading
        LeaderboardManager.lua  -- OrderedDataStore global leaderboard
  StarterPlayer/
    StarterPlayerScripts/
      Main.client.lua    -- wires server events into ClientState
      Modules/
        ClientState.lua  -- latest snapshot + pub/sub for UI
        GameAPI.lua       -- wraps every remote call + Marketplace prompts
```

## Modules

| Module | Studio location | Remotes it uses |
|---|---|---|
| Config.lua | `ReplicatedStorage.Modules` | none |
| RemoteNames.lua | `ReplicatedStorage.Modules` | declares all |
| Net.lua | `ReplicatedStorage.Modules` | creates/fetches all |
| PlayerDataManager.lua | `ServerScriptService.Server.Modules` | none |
| GamePassManager.lua | `ServerScriptService.Server.Modules` | none (calls MarketplaceService directly) |
| UnitManager.lua | `ServerScriptService.Server.Modules` | `BuyUnit`, `PlaceUnit`, `BuyPlotSlot`, `CollectIncome` |
| StealManager.lua | `ServerScriptService.Server.Modules` | `StealAttempt`, `ActivateDefense` |
| RebirthManager.lua | `ServerScriptService.Server.Modules` | `RequestRebirth` |
| EggManager.lua | `ServerScriptService.Server.Modules` | `HatchEgg`, fires `RarityRevealed` |
| DevProductManager.lua | `ServerScriptService.Server.Modules` | fires `ReceiptProcessed`; hooked to `MarketplaceService.ProcessReceipt` |
| SeasonalManager.lua | `ServerScriptService.Server.Modules` | fires `SeasonalIndexUpdated` |
| DailyRewardManager.lua | `ServerScriptService.Server.Modules` | `DailyRewardClaim`, `DailyRewardStatus` |
| TradeManager.lua | `ServerScriptService.Server.Modules` | `TradeRequestSend`, `TradeRequestRespond`, `TradeUpdateOffer`, `TradeConfirm`, `TradeCancel`, fires `TradeStateChanged` |
| LeaderboardManager.lua | `ServerScriptService.Server.Modules` | `LeaderboardRequest` |
| Main.server.lua | `ServerScriptService.Server` | wires every remote above |
| ClientState.lua | `StarterPlayer.StarterPlayerScripts.Modules` | listens to all server -> client events |
| GameAPI.lua | `StarterPlayer.StarterPlayerScripts.Modules` | wraps every client -> server call |
| Main.client.lua | `StarterPlayer.StarterPlayerScripts` | connects events into ClientState |

## Before shipping

- Replace every `Id = 0` in `Config.GamePasses` / `Config.DevProducts` with
  your real Asset Ids from the Creator Dashboard.
- No UI is included — `GameAPI`/`ClientState` are the integration points
  for whatever UI you build on top.
