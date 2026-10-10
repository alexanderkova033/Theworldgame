// Tunable balancing numbers for the whole simulation.
// Keeping every "magic number" here means gameplay balance can be tuned
// without hunting through rule files in each domain folder.

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

// --- Food ---
export const FOOD_PER_FARM = 2700; // food produced per farm per in-game day (before the season — see FARM_SEASON_MULTIPLIER)
export const FOOD_PER_POP_CONSUMPTION = 1; // food eaten per person per in-game day
export const FARM_COST = 800;
export const FARM_BUILD_DAYS = 60;
export const MAX_FARMS_PER_PROVINCE = 3;

// --- Resources (Catan-inspired: terrain produces, provinces trade) ---
export const RESOURCE_PER_PROVINCE = 0.6; // units of matching resource produced per owned province per day
export const COAL_PER_HILLS_PROVINCE = 0.4; // hills mine coal as well as ore — the fuel homes burn in winter
export const STARTING_RESOURCE_STOCK = 0; // nothing in the stores — every log and ingot has to be produced or bought
export const FARM_WOOD_COST = 15; // lumber for the barn
export const FACTORY_ORE_COST = 22; // metal for machinery
export const ROAD_ORE_COST = 10; // gravel for the roadbed

// --- Market (see domain/market/marketRules.ts) ---
// Supply and demand: the market holds a stock of every good, prices follow
// how scarce that stock is, and it recovers toward a moving equilibrium.
export const MARKET_BUY_MARKUP = 1.4; // buying pays this over the mid price...
export const MARKET_PORT_BUY_MARKUP = 1.2; // ...less with a coastal port
export const MARKET_SELL_FACTOR = 0.7; // selling gets this share of the mid price
export const MARKET_RECOVERY_PER_DAY = 0.04; // share of the gap to normal stock closed each day
export const MARKET_PRICE_FLOOR = 0.25; // mid price never below this × base...
export const MARKET_PRICE_CEILING = 4; // ...or above this × base
export const MARKET_OUTLOOK_SWING = 0.1; // monthly random step in each good's world outlook
export const MARKET_OUTLOOK_MIN = 0.7;
export const MARKET_OUTLOOK_MAX = 1.3;

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
export const INDUSTRY_PER_FACTORY = 4;
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

// --- Labour (see domain/labour) ---
// Buildings need workers from the population; short-staffed buildings run
// below capacity, and people without work weigh on public opinion.
export const LABOUR_SHARE = 0.25; // share of the population that works
export const JOBS_PER_BUILDING = { farm: 450, factory: 1000, granary: 300, cannery: 300, education: 250 } as const;
export const UNEMPLOYMENT_POPULARITY_PENALTY = 30; // times the share of workers without a job

// --- Political actions (see application/actions/politicalActions.ts) ---
// Ways to spend political power directly on support and order.
export const RALLY_POLITICAL_POWER_COST = 25;
export const RALLY_TREASURY_COST = 150;
export const RALLY_SUPPORT = 3; // every group
export const COURT_POLITICAL_POWER_COST = 15;
export const COURT_TREASURY_COST = 300;
export const COURT_SUPPORT = 8; // one group
export const CRACKDOWN_POLITICAL_POWER_COST = 20;
export const CRACKDOWN_STABILITY = 8;
export const CRACKDOWN_SUPPORT = -4; // every group

// --- Housing (see domain/housing) ---
// People need a roof. Population keeps growing past what the homes can hold,
// and everyone without one weighs on stability and popularity — so a growing
// country is also a problem to keep up with.
export const HOUSING_COST = 350;
export const HOUSING_WOOD_COST = 12;
export const HOUSING_BUILD_DAYS = 40;
export const MAX_HOUSING_PER_PROVINCE = 6;
export const PEOPLE_PER_HOME = 1500;
export const HOMELESS_STABILITY_PENALTY = 1.5; // per day, times the share of people without a home...
export const HOMELESS_PENALTY_CAP = 0.4; // ...capped
export const HOMELESS_GROWTH_FACTOR = 0.5; // past capacity, population still grows, at half the usual rate

// Heating: every working home burns coal each winter day — or firewood
// once the coal runs out. Run out of both and people freeze.
export const HEATING_FUEL_PER_HOME = 0.12; // coal (or wood) per home per winter day
export const COLD_STABILITY_PENALTY = 0.5; // per winter day, times the unheated share of homes
export const COLD_POPULATION_DECLINE_RATE = 0.0004; // per winter day, times the unheated share

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
export const RESEARCH_COST_BY_TIER: Record<1 | 2 | 3 | 4, number> = { 1: 45, 2: 75, 3: 115, 4: 170 };
export const RESEARCH_BASE_RATE_PER_AREA = 0.1; // per day, per area, with nothing invested
export const RESEARCH_PER_FACTORY = 0.06; // industry — workshops tinkering on the line
export const RESEARCH_PER_ROAD = 0.03; // industry
export const RESEARCH_PER_FARM = 0.05; // agriculture — field trials
export const RESEARCH_PER_FOOD_PROCESSOR = 0.06; // agriculture, per granary/cannery
export const RESEARCH_PER_SCHOOL = 0.1; // administration
export const RESEARCH_PER_HOME = 0.03; // housing — builders learning on the job
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
export const RIVAL_CAMPAIGN_POPULARITY_SWING = 2.5; // base popularity swing from a rival campaign move

// --- Coalition / factions (see domain/parties/factionRules.ts) ---
// Extra approval swing, per faction, per point of that faction's ideological
// alignment score (typically -3..+3 for a real law/research node) — layered
// on top of whatever flat popularityDelta the policy already carries, so an
// industry-boosting law doesn't just cost "5 popularity," it costs the
// Agrarian/Labor wings specifically while the Commercial/Nationalist wings
// may gain.
export const FACTION_SENSITIVITY = 3;

// --- Economy / taxes ---
export const BASE_TAX_INCOME_PER_POP = 0.012; // tax per person at a 100% rate, per day — kept low so the treasury is always tight
export const COMFORTABLE_TAX_RATE = 0.15; // the rate people accept without complaint
export const MIN_TAX_RATE = 0.05;
export const MAX_TAX_RATE = 0.4;
export const TAX_RATE_STEP = 0.05;

// --- Public opinion (see domain/politics/politicsRules.ts) ---
// Popularity drifts toward a target built from how the country is run.
// Slow on purpose: what you did two months ago still counts.
export const POPULARITY_DRIFT_RATE = 0.005; // fraction of the gap to target closed per day (~4.5 months to close half of it)
export const POPULARITY_BASE_TARGET = 50; // where opinion settles if nothing is good or bad
export const TAX_POPULARITY_PER_POINT = 1.2; // per percentage point of tax below (+) or above (−) the comfortable rate
export const FOOD_SHORTAGE_POPULARITY_PENALTY = 15;
export const HOMELESS_POPULARITY_PENALTY = 40; // times the homeless share
export const COLD_POPULARITY_PENALTY = 20; // times the unheated share
export const STABILITY_POPULARITY_WEIGHT = 0.2; // per point of stability above (+) or below (−) 50

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
// Neighbours meddle back: each month, each one may lean on your elections —
// for you if it's ruled by the party you backed, against you otherwise.
export const FOREIGN_MEDDLING_CHANCE_PER_MONTH = 0.2;
export const FOREIGN_MEDDLING_SUPPORT = 3; // support swing from one push
export const FRIENDLY_GOVERNMENT_INCOME_BONUS = 0.05; // +5% income per neighbor ruled by the party you backed

// --- Advisor strip (see application/getAdvisorOutlook.ts) ---
// When a problem is worth flagging under the top bar, and when it turns red.
export const ADVISOR_MAX_ALERTS = 3;
export const ADVISOR_COAL_CRITICAL_DAYS = 10; // winter: fuel left for fewer days than this
export const ADVISOR_WINTER_PREP_DAYS = 60; // start warning about winter fuel this long before winter...
export const ADVISOR_WINTER_PREP_CRITICAL_DAYS = 15; // ...and urgently this close to it
export const ADVISOR_FOOD_WARN_DAYS = 60; // food runs out within this many days at today's net
export const ADVISOR_FOOD_CRITICAL_DAYS = 20;
export const ADVISOR_FARM_STAFF_CRITICAL = 0.85; // farms below this share staffed
export const ADVISOR_HOMELESS_WARN_SHARE = 0.01;
export const ADVISOR_HOMELESS_CRITICAL_SHARE = 0.05;
export const ADVISOR_ELECTION_WARN_MONTHS = 6; // losing with an election this close
export const ADVISOR_ELECTION_CRITICAL_MONTHS = 2;

// --- Monthly reports (see domain/ledger) ---
// What counts as a big monthly change for each number, so the report's
// headline can weigh crowns against food against support points.
export const REPORT_NOTABLE_CHANGE = { treasury: 300, food: 100000, support: 2, stability: 2 } as const;
export const REPORT_LOSS_WEIGHT = 2; // a fall makes the headline well before a rise of the same size...
export const REPORT_GAIN_WEIGHT = 0.75; // ...a full granary is rarely the month's news

// --- Misc ---
export const MAX_EVENT_LOG_LENGTH = 100;
export const CURRENCY_SYMBOL = "Cr"; // "Crowns" — the shared continental currency
