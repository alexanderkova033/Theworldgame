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
export const STARTING_RESOURCE_STOCK = 0; // nothing in the stores — every log and ingot has to be produced or bought
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

// Selling food for cash, the reverse of importing it above. Priced well below
// the import cost per unit — food is so abundant once a couple of farms are
// running (thousands/day vs. the population's own consumption) that even a
// modest per-unit price turned exporting into a primary income source rather
// than a surplus dump, so this is kept low on purpose.
export const FOOD_EXPORT_BATCH_SIZE = 2000; // food given up per export click
export const FOOD_EXPORT_PRICE_PER_UNIT = 0.1; // Crowns received per unit of food exported

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

// --- Research (see domain/research) ---
// There's no research-point pool to spend. Each area — industry,
// agriculture, administration — makes daily progress toward whichever node
// it's been pointed at, at its own rate: a trickle by default, more for
// every building in that field, and much more for every scientist hired
// into it. Schools sharpen all three. A node is done once its area has put
// in RESEARCH_COST_BY_TIER points of work.
export const RESEARCH_COST_BY_TIER: Record<1 | 2 | 3 | 4, number> = { 1: 20, 2: 35, 3: 55, 4: 80 };
export const RESEARCH_BASE_RATE_PER_AREA = 0.1; // per day, per area, with nothing invested
export const RESEARCH_PER_FACTORY = 0.06; // industry — workshops tinkering on the line
export const RESEARCH_PER_ROAD = 0.03; // industry
export const RESEARCH_PER_FARM = 0.05; // agriculture — field trials
export const RESEARCH_PER_FOOD_PROCESSOR = 0.06; // agriculture, per granary/cannery
export const RESEARCH_PER_SCHOOL = 0.1; // administration
export const RESEARCH_PER_SCIENTIST = 0.3; // in the scientist's own area
export const EDUCATION_RESEARCH_BONUS = 0.05; // +5% to every area per working school

// --- Workforce (see domain/workforce) ---
// Hired staff, paid a salary every day. Scientists drive research in one
// specific area; police keep order. Hiring is a small one-off fee.
export const SCIENTIST_SALARY = 2; // Crowns per scientist per day
export const SCIENTIST_HIRE_COST = 60;
export const BASE_SCIENTIST_CAP = 3; // scientists you can employ with no schools at all...
export const SCIENTISTS_PER_SCHOOL = 2; // ...and how many more each school trains
export const POLICE_SALARY = 1; // Crowns per officer per day
export const POLICE_HIRE_COST = 30;
export const POPULATION_PER_POLICE = 2000; // cap: one officer per this many people
export const POLICE_STABILITY_PER_OFFICER = 0.02; // stability per day, per officer...
export const POLICE_STABILITY_CAP = 0.1; // ...capped
export const POLICE_BREAKDOWN_REDUCTION = 0.06; // fewer vandalism-driven breakdowns, per officer...
export const POLICE_BREAKDOWN_REDUCTION_CAP = 0.4; // ...capped at -40%

// --- Seasons (see domain/country/calendar.ts) ---
// Winter is Dec-Feb. Farms barely yield, grain fields lie fallow; fishing,
// canneries, and granaries working through stored grain carry on. The
// autumn harvest is the time to stockpile.
export const FARM_SEASON_MULTIPLIER = { spring: 1, summer: 1.15, autumn: 1.35, winter: 0.55 } as const;

// --- Breakdowns & repairs (see domain/maintenance) ---
export const BREAKDOWN_CHANCE_PER_DAY = 0.0008; // per working building — roughly once every 3-4 years each
export const REPAIR_COST_SHARE = 0.25; // a repair costs this share of the building's original price
export const REPAIR_DAYS = 10;

// --- Laws & political power (see domain/laws, domain/politics) ---
// Political power trickles in daily — faster the more popular the government
// — and every law spends a tier-scaled chunk of it (LawEnactCost.politicalPower).
export const POLITICAL_POWER_BASE_RATE = 0.4; // per day, even at zero popularity
export const POLITICAL_POWER_PER_POPULARITY = 0.008; // extra per day per popularity point (+0.4/day at 50%)
// A passed law is drafted into force over this many days (one law at a time).
export const LAW_DAYS_BY_TIER: Record<1 | 2 | 3 | 4, number> = { 1: 20, 2: 30, 3: 45, 4: 60 };

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

// --- Economy / taxes ---
export const BASE_TAX_INCOME_PER_POP = 0.014; // was 0.02 — tax alone covered ~80% of starting income, dwarfing industry; cut ~30% so factories matter more
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

// --- Foreign affairs (see domain/diplomacy) ---
// Pressuring a neighbor spends political power and shifts its electorate
// toward the party you back. How hard it lands depends on how strong your
// own government looks at home: PRESSURE_BASE * (popularity + stability)/100
// - PRESSURE_OFFSET, so a popular, stable government pushes ~+5-10 support
// per push, and a weak one can backfire (negative).
export const PRESSURE_POLITICAL_POWER_COST = 30;
export const PRESSURE_BASE = 10;
export const PRESSURE_OFFSET = 6;
export const PRESSURE_MIN = -5;
export const PRESSURE_MAX = 12;
export const FOREIGN_SUPPORT_DRIFT = 0.06; // monthly: fraction of the gap to 50/50 that support relaxes back
export const FOREIGN_SUPPORT_NOISE = 3; // monthly: random swing, +/- this much
export const FOREIGN_TAKEOVER_THRESHOLD = 55; // a challenger at or above this support takes power at the next monthly check
export const FRIENDLY_GOVERNMENT_INCOME_BONUS = 0.05; // +5% income per neighbor ruled by the party you backed

// --- Misc ---
export const MAX_EVENT_LOG_LENGTH = 100;
export const CURRENCY_SYMBOL = "Cr"; // "Crowns" — the shared continental currency
