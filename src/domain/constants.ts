// Tunable balancing numbers for the whole simulation.
// Keeping every "magic number" here means gameplay balance can be tuned
// without hunting through rule files in each domain folder.

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

// --- Food ---
export const FOOD_PER_FARM = 4500; // food produced per farm per in-game day
export const FOOD_PER_POP_CONSUMPTION = 1; // food eaten per person per in-game day
export const FARM_COST = 800;
export const FARM_BUILD_DAYS = 60;
export const MAX_FARMS_PER_PROVINCE = 3;

// --- Food imports (for nations without enough farmland) ---
export const FOOD_IMPORT_BATCH_SIZE = 2000; // food received per import click
export const FOOD_IMPORT_COST_PER_UNIT = 0.5; // Crowns per unit of food, without a port
export const FOOD_IMPORT_PORT_DISCOUNT = 0.6; // multiplier on cost-per-unit with a coastal port (i.e. 40% cheaper)

// --- Resources (Catan-inspired: terrain produces, provinces trade) ---
export const RESOURCE_PER_PROVINCE = 1; // units of matching resource produced per owned province per day
export const STARTING_RESOURCE_STOCK = 5; // a small founding stockpile of each resource
export const FARM_WOOD_COST = 15; // lumber for the barn
export const FACTORY_ORE_COST = 22; // metal for machinery
export const ROAD_ORE_COST = 10; // gravel for the roadbed
export const BASE_TRADE_RATE = 4; // units given per unit received, without a port
export const PORT_TRADE_RATE = 2; // units given per unit received, with a coastal province
export const TRADE_BATCH_SIZE = 5; // units received per trade click (avoids one-at-a-time clicking)

// --- Dynamic market (see domain/resources/tradeRules.ts) ---
export const DEMAND_CAP = 5; // demand index per resource is clamped to +/- this
export const DEMAND_PRICE_SENSITIVITY = 0.08; // price swing per point of demand index (at the cap: +/-40%)
export const DEMAND_STEP = 0.4; // demand index moved per trade (give cheapens, receive dearens)
export const DEMAND_DECAY_PER_DAY = 0.03; // fraction of the demand index that reverts toward 0 each day

// --- Food trading (see application/actions/tradeResources.ts) ---
// Food is abundant compared to the 4 crafted resources (farms can produce
// thousands/day vs. ~1/province/day), so it trades at its own much larger
// scale rather than joining the small-integer wood/ore/grain/fish batches —
// 100 food is treated as worth about 1 crafted-resource unit, and it sits
// outside the dynamic-demand system entirely (it isn't scarce the way the
// terrain-based resources are).
export const FOOD_TRADE_UNIT = 100; // food-per-crafted-resource-unit value ratio
export const FOOD_TRADE_BATCH_SIZE = 500; // food received per trade click when food is the "receive" side

// --- Money market (see application/actions/marketActions.ts) ---
// A direct treasury <-> resource exchange, separate from the resource<->resource
// barter above: spend Crowns to buy raw resources outright, or sell them for
// Crowns. Price per unit floats with the same dynamic demand index as barter
// (buying nudges demand up, selling nudges it down), and buying is cheaper with
// a coastal port, mirroring food imports. The sell price is kept well below the
// buy price so buying then immediately selling always loses money.
export const RESOURCE_MARKET_BATCH_SIZE = 5; // units bought/sold per click
export const RESOURCE_MARKET_BUY_PRICE_PER_UNIT = 30; // Crowns to buy one unit, at neutral demand, without a port
export const RESOURCE_MARKET_SELL_PRICE_PER_UNIT = 15; // Crowns received selling one unit, at neutral demand
export const RESOURCE_MARKET_PORT_DISCOUNT = 0.6; // buying is 40% cheaper with a coastal port

// Selling food for cash, the reverse of importing it above. Priced below the
// import cost per unit for the same anti-arbitrage reason as the resource market.
export const FOOD_EXPORT_BATCH_SIZE = 2000; // food given up per export click
export const FOOD_EXPORT_PRICE_PER_UNIT = 0.3; // Crowns received per unit of food exported

// --- Food processing (Granary/Cannery — research-gated, see domain/research)
// Grain/fish trickle in at ~1/province/day (see RESOURCE_PER_PROVINCE above),
// so these buildings convert whatever small surplus you actually have into a
// meaningful chunk of food — a supplement to farms, not a replacement, since
// a nation's grain/fish income is capped by how many plains/coast provinces
// it owns, not by how many granaries/canneries it builds.
export const GRANARY_COST = 900;
export const GRANARY_WOOD_COST = 14;
export const GRANARY_BUILD_DAYS = 55;
export const MAX_GRANARIES_PER_PROVINCE = 2;
export const GRAIN_PROCESSED_PER_GRANARY = 3; // max grain one granary can process per day
export const FOOD_PER_GRAIN = 500; // food produced per unit of grain processed

export const CANNERY_COST = 1100;
export const CANNERY_ORE_COST = 16;
export const CANNERY_BUILD_DAYS = 65;
export const MAX_CANNERIES_PER_PROVINCE = 2;
export const FISH_PROCESSED_PER_CANNERY = 3; // max fish one cannery can process per day
export const FOOD_PER_FISH = 500; // food produced per unit of fish processed

// --- Industry ---
export const INDUSTRY_PER_FACTORY = 5;
export const INCOME_PER_INDUSTRY = 1.5;
export const FACTORY_COST = 1600;
export const FACTORY_BUILD_DAYS = 120;
export const MAX_FACTORIES_PER_PROVINCE = 2;

// --- Construction stalls (see simulateDay.ts step 1) ---
export const STALLED_PROJECT_REGRESS_FACTOR = 0.5; // a stalled project slips backward at this fraction of its normal daily pace

// --- Roads (economic efficiency) ---
export const ROAD_EFFICIENCY_BONUS = 0.02; // +2% income & construction speed per road
export const ROAD_COST = 450;
export const ROAD_BUILD_DAYS = 45;
export const MAX_ROADS_PER_PROVINCE = 5;

// --- Education & research ---
export const EDUCATION_COST = 400;
export const EDUCATION_WOOD_COST = 10; // books, desks, building materials
export const EDUCATION_BUILD_DAYS = 90;
export const MAX_EDUCATION_PER_PROVINCE = 2;
export const RESEARCH_BASE_RATE = 0.5; // research points/day, even with no education
export const RESEARCH_PER_EDUCATION_LEVEL = 0.05; // extra research points/day per education level
export const RESEARCH_PROJECT_COST = 800;
export const RESEARCH_PROJECT_DAYS = 150;
export const RESEARCH_POINTS_REQUIRED = 50; // accumulated research points needed to start a research project
export const RESEARCH_INDUSTRY_BONUS = 0.1; // +10% industry output per completed research project

// --- Research tree (see domain/research) ---
export const FAILED_RESEARCH_VOTE_POPULARITY_PENALTY = 2; // smaller than a failed law vote — a research setback is less politically charged
export const EDUCATION_PASS_CHANCE_PER_LEVEL = 0.03; // +3% research pass chance per education level...
export const EDUCATION_PASS_CHANCE_CAP = 0.2; // ...capped at +20%

// --- Rival party stances (see domain/parties/rivalRules.ts) ---
export const RIVAL_OPPOSE_PASS_CHANCE_PENALTY = 0.08; // a law/research vote the rival opposes is harder to pass
export const RIVAL_SUPPORT_PASS_CHANCE_BONUS = 0.04; // ...and easier if the rival happens to agree
export const RIVAL_CAMPAIGN_CHANCE_PER_MONTH = 0.3; // rolled on the first day of every month, alongside decisions
export const RIVAL_CAMPAIGN_POPULARITY_SWING = 4; // base popularity swing from a rival campaign move

// --- Coalition / factions (see domain/parties/factionRules.ts) ---
// Extra approval swing, per faction, per point of that faction's ideological
// alignment score (typically -3..+3 for a real law/research node) — layered
// on top of whatever flat popularityDelta the policy already carries, so an
// industry-boosting law doesn't just cost "5 popularity," it costs the
// Agrarian/Labor wings specifically while the Commercial/Nationalist wings
// may gain.
export const FACTION_SENSITIVITY = 3;

// --- Army ---
export const SOLDIER_RECRUIT_COST = 200;
export const SOLDIER_RECRUIT_STRENGTH = 10;
export const ARMY_UPKEEP_PER_STRENGTH = 0.05; // treasury cost per strength point per day

// --- Economy / taxes ---
export const BASE_TAX_INCOME_PER_POP = 0.02;
export const MIN_TAX_RATE = 0;
export const MAX_TAX_RATE = 0.6;
export const TAX_RATE_STEP = 0.05;
export const COMFORTABLE_TAX_RATE = 0.15; // above this, popularity starts to suffer
export const POPULARITY_DRIFT_RATE = 0.05; // fraction of the gap to target popularity closed per day

// --- Population ---
export const POPULATION_GROWTH_RATE = 0.0003; // per day, scaled by stability
export const POPULATION_FAMINE_DECLINE_RATE = 0.0006; // per day, when food runs out

// --- Stability ---
export const STABILITY_RECOVERY_RATE = 0.05;
export const STABILITY_FOOD_SHORTAGE_PENALTY = 0.8;
export const STABILITY_LOW_POPULARITY_PENALTY = 0.3;
export const STABILITY_LOW_POPULARITY_THRESHOLD = 30;
export const STABILITY_GOOD_POPULARITY_THRESHOLD = 50;
export const STABILITY_COLLAPSE_THRESHOLD = 15;

// --- Random world events ---
export const RANDOM_EVENT_INTERVAL_MONTHS = 6; // a random event fires every N in-game months

// --- Political decisions (see domain/decisions) ---
export const DECISION_CHANCE_PER_MONTH = 0.18; // rolled on the first day of every month; ~1 every 5-6 months on average
export const MAX_DECISION_HISTORY = 20;

// --- Politics: parties & elections ---
export const ELECTION_INTERVAL_MONTHS = 24; // a general election is held every N in-game months
export const ELECTION_WIN_THRESHOLD = 50; // popularity % needed to win an election
export const ELECTIONS_TO_WIN_GAME = 3; // election wins needed for outright victory (a single loss ends the game, so these are inherently consecutive)
export const ELECTION_WIN_STABILITY_BONUS = 5; // a mandate bump to stability on winning

// --- Scouting expeditions (unclaimed islands) ---
export const EXPEDITION_COST = 800;
export const EXPEDITION_DAYS = 40;

// --- Loans (see domain/loans/loanRules.ts) ---
export const LOAN_BATCH_SIZE = 2000; // treasury received (and added to debt) per "Take Loan" click
export const LOAN_REPAY_BATCH_SIZE = 1000; // debt paid down per "Repay" click, capped by treasury and remaining debt
export const LOAN_MAX_DEBT = 12000; // hard cap on outstanding debt
export const LOAN_INTEREST_RATE_PER_DAY = 0.002; // compounds daily — roughly 6%/month if left untouched
export const DEBT_DANGER_THRESHOLD = 8000; // beyond this, debt itself starts costing stability/popularity every day
export const DEBT_STABILITY_PENALTY_PER_DAY = 0.15;
export const DEBT_POPULARITY_PENALTY_PER_DAY = 0.1;

// --- Misc ---
export const MAX_EVENT_LOG_LENGTH = 100;
export const CURRENCY_SYMBOL = "Cr"; // "Crowns" — the shared continental currency
