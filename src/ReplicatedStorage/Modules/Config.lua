--[[
	Config.lua
	Single source of truth for every tunable number in the game.
	Edit this file to rebalance the economy. No other module should
	hardcode prices, rates, weights or durations.
]]

local Config = {}

-- ============================================================
-- SAVE / DATASTORE
-- ============================================================
Config.SaveSettings = {
	DataStoreName = "TycoonPlayerData_v1",
	AutoSaveIntervalSeconds = 120,
	SaveRetryAttempts = 3,
	SaveRetryBackoffSeconds = 2,
}

-- ============================================================
-- PLOT / STORAGE
-- ============================================================
Config.Plot = {
	BaseSlots = 6,
	MaxSlots = 40,
	SlotUnlockBaseCost = 250,
	SlotUnlockCostGrowth = 1.18,

	-- "Pending" cash sits exposed at the plot until collected (and is what
	-- the steal mechanic targets). Capacity is expressed in seconds of
	-- income it can hold before it caps out.
	BasePendingCapacitySeconds = 1800, -- 30 minutes of income
	ExtraStorageCapacityMultiplier = 1.5, -- from the +Storage game pass

	-- Offline income accrues into Pending, capped separately so AFK time
	-- can't be abused indefinitely.
	OfflineIncomeCapSeconds = 8 * 3600,
}

-- ============================================================
-- UNITS (voxel collectors)
-- ============================================================
-- BaseCost/BaseIncome scale per-unit with CostGrowth as more copies of the
-- SAME unit id are purchased. IncomeMult from rarity is applied on top.
Config.Units = {
	[1]  = { Id = 1,  Name = "Pebble Bot",     Rarity = "Common",    BaseCost = 50,      CostGrowth = 1.07, BaseIncome = 1 },
	[2]  = { Id = 2,  Name = "Scrap Cube",     Rarity = "Common",    BaseCost = 120,     CostGrowth = 1.07, BaseIncome = 2.2 },
	[3]  = { Id = 3,  Name = "Copper Drone",   Rarity = "Uncommon",  BaseCost = 600,     CostGrowth = 1.09, BaseIncome = 9 },
	[4]  = { Id = 4,  Name = "Pixel Sprite",   Rarity = "Uncommon",  BaseCost = 1500,    CostGrowth = 1.09, BaseIncome = 21 },
	[5]  = { Id = 5,  Name = "Crystal Golem",  Rarity = "Rare",      BaseCost = 8000,    CostGrowth = 1.11, BaseIncome = 95 },
	[6]  = { Id = 6,  Name = "Plasma Turret",  Rarity = "Rare",      BaseCost = 22000,   CostGrowth = 1.11, BaseIncome = 240 },
	[7]  = { Id = 7,  Name = "Void Walker",    Rarity = "Epic",      BaseCost = 120000,  CostGrowth = 1.13, BaseIncome = 1100 },
	[8]  = { Id = 8,  Name = "Storm Engine",   Rarity = "Epic",      BaseCost = 350000,  CostGrowth = 1.13, BaseIncome = 2900 },
	[9]  = { Id = 9,  Name = "Solar Phoenix",  Rarity = "Legendary", BaseCost = 2000000, CostGrowth = 1.15, BaseIncome = 14000 },
	[10] = { Id = 10, Name = "Titan Core",     Rarity = "Legendary", BaseCost = 6500000, CostGrowth = 1.15, BaseIncome = 38000 },
	[11] = { Id = 11, Name = "Astral Wyrm",    Rarity = "Mythic",    BaseCost = 50000000,  CostGrowth = 1.18, BaseIncome = 250000 },
	[12] = { Id = 12, Name = "Genesis Shard",  Rarity = "Mythic",    BaseCost = 180000000, CostGrowth = 1.18, BaseIncome = 900000 },
}

-- ============================================================
-- RARITY TIERS
-- ============================================================
Config.RarityOrder = { "Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic" }

Config.Rarities = {
	Common    = { Weight = 600, IncomeMult = 1,    Color = Color3.fromRGB(190, 190, 190) },
	Uncommon  = { Weight = 250, IncomeMult = 1.5,  Color = Color3.fromRGB(95, 200, 110) },
	Rare      = { Weight = 110, IncomeMult = 2.5,  Color = Color3.fromRGB(70, 140, 230) },
	Epic      = { Weight = 32,  IncomeMult = 5,    Color = Color3.fromRGB(165, 80, 230) },
	Legendary = { Weight = 7,   IncomeMult = 12,   Color = Color3.fromRGB(235, 175, 60) },
	Mythic    = { Weight = 1,   IncomeMult = 30,   Color = Color3.fromRGB(230, 60, 70) },
}

-- ============================================================
-- STEAL MECHANIC
-- ============================================================
Config.Steal = {
	Cooldown = 180, -- seconds between steal attempts (thief side)
	FastStealCooldownMultiplier = 0.5, -- from Faster Steal Cooldown game pass
	StealPercent = 0.15, -- % of target's PENDING cash stolen
	MinTargetPendingCash = 100, -- target must have at least this much exposed to be steal-able

	-- Defense: a player-activated temporary shield against being stolen from.
	DefenseLockDuration = 300,
	DefenseLockCooldown = 300, -- must wait this long after it expires before reactivating

	-- Steal Shield developer product duration (stacks with/extends DefenseLock).
	ShieldProductDurationSeconds = 600,
}

-- ============================================================
-- REBIRTH / PRESTIGE
-- ============================================================
Config.Rebirth = {
	BaseCashRequirement = 1000000,
	RequirementGrowth = 2.2, -- requirement(n) = Base * Growth^n
	MultiplierPerRebirth = 0.5, -- +50% permanent income per rebirth (linear)
	MaxRebirths = 0, -- 0 = unlimited
}

-- ============================================================
-- EGGS / GACHA
-- ============================================================
Config.Eggs = {
	BasicEgg = {
		Id = "BasicEgg",
		Name = "Basic Egg",
		Currency = "Cash",
		Cost = 5000,
		PityThreshold = 50, -- guaranteed pity rarity after this many hatches without one
		PityRarity = "Legendary",
		Pool = {
			Common = { 1, 2 },
			Uncommon = { 3, 4 },
			Rare = { 5, 6 },
			Epic = { 7, 8 },
			Legendary = { 9, 10 },
			Mythic = { 11, 12 },
		},
	},
	PremiumEgg = {
		Id = "PremiumEgg",
		Name = "Premium Egg",
		Currency = "Gems",
		Cost = 50,
		PityThreshold = 20,
		PityRarity = "Legendary",
		-- Premium egg skews better: lighter weight on Common/Uncommon.
		WeightOverride = {
			Common = 250, Uncommon = 250, Rare = 200, Epic = 80, Legendary = 18, Mythic = 2,
		},
		Pool = {
			Common = { 1, 2 },
			Uncommon = { 3, 4 },
			Rare = { 5, 6 },
			Epic = { 7, 8 },
			Legendary = { 9, 10 },
			Mythic = { 11, 12 },
		},
	},
}

-- ============================================================
-- GAME PASSES (permanent, edit Ids to your real Asset Ids)
-- ============================================================
Config.GamePasses = {
	VIP            = { Id = 0, IncomeMultiplier = 1.5 },
	DoubleLuck     = { Id = 0, LuckMultiplier = 2 },
	AutoCollect    = { Id = 0, IntervalSeconds = 10 },
	ExtraStorage   = { Id = 0 }, -- multiplier applied via Config.Plot.ExtraStorageCapacityMultiplier
	FasterSteal    = { Id = 0 }, -- multiplier applied via Config.Steal.FastStealCooldownMultiplier
}

-- ============================================================
-- DEVELOPER PRODUCTS (consumable, edit Ids to your real Asset Ids)
-- ============================================================
Config.DevProducts = {
	CashPackSmall   = { Id = 0, GrantCash = 5000 },
	CashPackMedium  = { Id = 0, GrantCash = 35000 },
	CashPackLarge   = { Id = 0, GrantCash = 250000 },
	InstantRebirth  = { Id = 0 },
	PremiumEggPull10x = { Id = 0, EggId = "PremiumEgg", PullCount = 10 },
	StealShield     = { Id = 0 },
	-- Revive compensates the most recent theft if claimed within the window,
	-- otherwise grants a flat fallback cushion (most useful right after
	-- getting stolen from, but never a dead purchase).
	Revive          = { Id = 0, RestoreWindowSeconds = 600, FallbackCash = 2500 },
}

-- ============================================================
-- SEASONAL / LIMITED-TIME EVENTS
-- ============================================================
Config.Seasonal = {
	EventsEnabled = true,
	PollIntervalSeconds = 60,
	Events = {
		{
			Id = "WinterFest",
			Enabled = false,
			-- Unix timestamps; set both to gate a real window.
			StartTime = 0,
			EndTime = 0,
			UnitIds = { 13 }, -- add seasonal unit defs to Config.Units when enabling
		},
	},
}

-- ============================================================
-- DAILY REWARD STREAK
-- ============================================================
Config.DailyReward = {
	ResetIfMissedHours = 48, -- streak resets if you wait longer than this between claims
	MinHoursBetweenClaims = 20, -- soft anti-abuse: can't re-claim same "day" early
	Streak = {
		[1] = { Cash = 500 },
		[2] = { Cash = 1000 },
		[3] = { Cash = 2000 },
		[4] = { Gems = 10 },
		[5] = { Cash = 5000 },
		[6] = { Gems = 25 },
		[7] = { Cash = 20000, Gems = 50 },
	},
}

-- ============================================================
-- TRADING
-- ============================================================
Config.Trade = {
	MaxUnitsPerSide = 8,
	ConfirmTimeoutSeconds = 45,
	InviteTimeoutSeconds = 30,
	CooldownBetweenTradesSeconds = 5,
}

-- ============================================================
-- LEADERBOARD
-- ============================================================
Config.Leaderboard = {
	DataStoreName = "GlobalIncomeLB_v1",
	TopCount = 100,
	UpdateIntervalSeconds = 60,
}

return Config
