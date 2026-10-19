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
// ...except coal: the game opens on 1 January, sixty days of winter ahead, and
// the starting homes burn about 50 coal getting through it. With none in
// the cellar the only way to keep them warm was a loan on day one; this
// carries the first winter with room for a few new homes, and the next
// winter is the player's to prepare for.
export const STARTING_COAL = 80;
export const FARM_WOOD_COST = 15; // lumber for the barn
export const FACTORY_ORE_COST = 22; // metal for machinery
export const ROAD_ORE_COST = 10; // gravel for the roadbed

// --- Market (see domain/market/marketRules.ts) ---
// Supply and demand: the market holds a stock of every good, prices follow
// how scarce that stock is, and it recovers toward a moving equilibrium.
export const MARKET_BUY_MARKUP = 1.4; // buying pays this over the mid price...
export const MARKET_PORT_BUY_MARKUP = 1.2; // ...less with a coastal port
export const MARKET_SELL_FACTOR = 0.55; // selling gets this share of the mid price
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
export const INCOME_PER_INDUSTRY = 2;
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
// Each province is its own job market; of the people left without work in
// theirs, this share will travel to fill open jobs in another.
export const COMMUTE_SHARE = 0.7;

// --- Migration between provinces (see domain/provinces/provinceMigration.ts) ---
export const MIGRATION_SHARE_PER_DAY = 0.02; // of a province's homeless (and of its jobless households) who move each day
// How readily people move into a province in each stage of unrest.
export const MIGRATION_UNREST_PULL = { calm: 1, discontent: 0.75, strikes: 0.4, riots: 0.1 } as const;

// --- Province unrest (see domain/provinces/provinceOrder.ts) ---
// A province's own order heads for national stability minus its own troubles.
export const PROVINCE_STABILITY_DRIFT = 0.05; // share of the gap to that target closed each day
export const PROVINCE_HOMELESS_UNREST = 80; // points off, times the province's homeless share
export const PROVINCE_JOBLESS_UNREST = 35; // points off, times the province's jobless share (gentler: some provinces start with no jobs at all)
// National stability lost per day to provinces rioting on their own, times
// their share of the population — a province with 1/6 of the people costs
// 0.2 a day, an emptied one next to nothing.
export const PROVINCE_RIOT_STABILITY_DRAG = 1.2;

// When the map flags a province (see application/getProvinceOverview.ts).
export const PROVINCE_FLAG_HOMELESS_SHARE = 0.01; // homes: over — this share or more without a home (red "!")
export const PROVINCE_FLAG_FULL_SHARE = 0.95; // homes: full — this share of places taken
export const PROVINCE_FLAG_JOBLESS_SHARE = 0.1; // jobs: jobless — this share of workers without work (red "!")
export const PROVINCE_FLAG_SHORT_SHARE = 0.05; // jobs: short — this share of jobs nobody fills

// --- Political actions (see application/actions/politicalActions.ts) ---
// Ways to spend political power directly on support and order.
export const RALLY_POLITICAL_POWER_COST = 25;
export const RALLY_TREASURY_COST = 150;
export const RALLY_SUPPORT = 3; // every group
export const COURT_POLITICAL_POWER_COST = 15;
export const COURT_TREASURY_COST = 300;
export const COURT_SUPPORT = 8; // one group
export const CRACKDOWN_POLITICAL_POWER_COST = 20;
export const CRACKDOWN_STABILITY = 6; // plus CRACKDOWN_STABILITY_PER_POLICE per officer — see domain/unrest
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
// in RESEARCH_COST_BY_TIER points of work. Paced so an area with nothing in
// it takes about two months for its root, one scientist gets a path's first
// technology in about seven weeks, and a well-funded area (a few
// scientists, some schools) reaches a capstone in its first one to three
// years: 467 points from root to capstone.
export const RESEARCH_COST_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = { 1: 12, 2: 25, 3: 40, 4: 60, 5: 80, 6: 110, 7: 140 };
// Taking a path closes the area's other two, but only until it's done: a
// year after a path's capstone, the area may take up one it passed over.
export const RESEARCH_PATH_REOPEN_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
export const RESEARCH_BASE_RATE_PER_AREA = 0.15; // per day, per area, with nothing invested
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
export const POLITICAL_POWER_BASE_RATE = 0.3; // per day, even at zero popularity
export const POLITICAL_POWER_PER_POPULARITY = 0.006; // extra per day per popularity point (+0.3/day at 50%)
// A passed law is drafted into force over this many days (one law at a time).
export const LAW_DAYS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = { 1: 15, 2: 20, 3: 30, 4: 45, 5: 55, 6: 60, 7: 70 };
// What putting a law to the vote costs, by its row on the tree: political
// power, and money paid only if it passes (see LawEnactCost).
export const LAW_POLITICAL_POWER_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = { 1: 20, 2: 30, 3: 50, 4: 70, 5: 90, 6: 110, 7: 130 };
export const LAW_PRICE_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = { 1: 250, 2: 350, 3: 900, 4: 2000, 5: 2800, 6: 3400, 7: 4000 };

// --- Rival party stances (see domain/parties/rivalRules.ts) ---
export const RIVAL_OPPOSE_PASS_CHANCE_PENALTY = 0.08; // a law/research vote the rival opposes is harder to pass
export const RIVAL_SUPPORT_PASS_CHANCE_BONUS = 0.04; // ...and easier if the rival happens to agree
// Your own benches: solid behind a law your party believes in, a few rebels
// against one it doesn't (see getEffectivePassChance in lawsRules.ts).
export const OWN_PARTY_BACKING_BONUS = 0.1;
export const OWN_PARTY_REBEL_PENALTY = 0.12;
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
export const BASE_TAX_INCOME_PER_POP = 0.016; // tax per person at a 100% rate, per day — kept low so the treasury is always tight
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

// --- Unrest (see domain/unrest) ---
// Falling stability escalates in stages before the government collapses at
// zero, each one worse than the last and each announced, so a struggling
// country gets warnings — and costs — while there's still time to act.
export const UNREST_DISCONTENT_BELOW = 40; // stability under this: discontent...
export const UNREST_STRIKES_BELOW = 25; // ...strikes...
export const UNREST_RIOTS_BELOW = 12; // ...riots (collapse at 0)
export const UNREST_EASE_MARGIN = 3; // a stage only eases once stability is this far back above its line
export const DISCONTENT_INDUSTRY_PENALTY = 0.1; // discontent and worse: -10% industry
export const STRIKE_FACTORY_STOPPAGE = 0.5; // strikes and worse: share of factory work that stops...
export const STRIKE_STOPPAGE_PER_POLICE = 0.06; // ...less this for every officer on the payroll...
export const STRIKE_STOPPAGE_MIN = 0.15; // ...but never less than this
export const RIOT_DAMAGE_CHANCE_PER_DAY = 0.12; // riots: chance a mob wrecks a working building each day (police deter some, as with breakdowns)
// A crackdown is how you pull the country back a stage: it always lifts
// stability at least clear of the current stage's line, and hits harder
// with police behind it.
export const CRACKDOWN_STABILITY_PER_POLICE = 0.5;
export const CRACKDOWN_POLICE_BONUS_CAP = 4;

// --- Uprisings and the militia (see domain/uprising) ---
// A province that riots long enough rises: it seizes its workplaces, pays
// no taxes, and weighs on the whole country until it is ended. Rebel
// strength (0 to 100) says how hard that is: grievances feed it, a calm
// country starves it, and militia companies sent in wear it down.
// How many days of rioting on its own it takes to rise is set by the
// difficulty (DifficultySettings.uprisingRiotDays; 30 on Normal)...
export const UPRISING_AGGRIEVED_RIOT_SHARE = 1 / 3; // ...and a third of that while it remembers being put down
export const UPRISING_GRIEVANCE_DAYS = 180; // how long a province put down by force remembers it
export const UPRISING_START_STRENGTH = 40;
export const UPRISING_AGGRIEVED_START_BONUS = 20; // rising again soon after being put down: stronger from the start
export const UPRISING_GROWTH_PER_DAY = 0.15; // strength a day, while nothing else is happening
export const UPRISING_HOMELESS_GROWTH = 2; // extra strength a day, times the province's homeless share
export const UPRISING_CALM_STABILITY = 45; // national stability at or above this...
export const UPRISING_CALM_FADE = 0.4; // ...starves an uprising of this much strength a day
export const UPRISING_POLICE_DAMPING = 0.02; // strength a day held down by each police officer...
export const UPRISING_POLICE_DAMPING_CAP = 0.2; // ...capped
export const UPRISING_STABILITY_DRAG_MULTIPLIER = 2; // a risen province drags national stability this many times a rioting one
export const MILITIA_HIRE_COST = 200;
export const MILITIA_SALARY = 2; // Crowns per company per day
export const MILITIA_CAP = 4; // companies the country can keep
export const MILITIA_SUPPRESSION_PER_DAY = 1.2; // rebel strength each company sent in wears down, per day
export const MILITIA_SEND_POLITICAL_POWER = 15; // sending a company in is an order, with a price...
export const MILITIA_SEND_SUPPORT = -2; // ...and every group likes it less
// Left alone, an uprising spreads and can be lost for good.
export const UPRISING_SPREAD_STRENGTH = 70; // rebel strength from which it stirs up the provinces next door...
export const UPRISING_SPREAD_UNREST = 15; // ...setting their mood this far below the nation's
export const UPRISING_BREAKAWAY_DAYS = 30; // days at full strength (100) before it breaks away from the country

// --- Demands (see domain/uprising/demandRules.ts) ---
// Unrest isn't only want. Now and then the workers of a province with
// factories ask for a pay rise, however well it is doing; refused, they
// down tools, and in a shaky country that can go as far as an uprising.
// Rebels send their terms too: meeting them ends an uprising in peace.
export const DEMAND_CHANCE_PER_MONTH = 0.15; // on the first of each month, once the streets chapter is open
export const DEMAND_MIN_STABILITY = 30; // only a province this orderly asks (a worse one is already in trouble)
export const DEMAND_PAY_RISE_PER_DAY = 3; // Crowns a day the country pays a province's workers on top...
export const DEMAND_PAY_RISE_DAYS = 360; // ...for a year
export const DEMAND_GRANT_STABILITY = 10; // local order gained by granting it
export const DEMAND_REFUSE_STABILITY = -20; // local order lost the day it is refused...
export const DEMAND_DISPUTE_UNREST = 35; // ...and how far below the nation's its mood sits while in dispute...
export const DEMAND_DISPUTE_DAYS = 120; // ...for four months
export const REBEL_TERMS_AFTER_DAYS = 14; // rebels send terms this long after rising...
export const REBEL_TERMS_AGAIN_DAYS = 60; // ...and again this long after the last were refused
export const REBEL_TERMS_REFUSED_STRENGTH = 10; // refusing them steels the uprising
export const AMNESTY_POLITICAL_POWER = 30;
export const AMNESTY_SUPPORT = -3; // every group: pardoning rebels costs goodwill
export const TAX_RELIEF_DAYS = 360; // a year without taxes from the province

// --- Random world events ---
export const RANDOM_EVENT_INTERVAL_MONTHS = 6; // a random event fires every N in-game months

// --- Political decisions (see domain/decisions) ---
export const DECISION_CHANCE_PER_MONTH = 0.18; // rolled on the first day of every month; ~1 every 5-6 months on average
export const MAX_DECISION_HISTORY = 20;
// Situational decisions (see decisionData.ts): the country's own troubles
// come knocking more often than chance does, and win the pick when they can.
export const SITUATIONAL_DECISION_CHANCE_PER_MONTH = 0.4; // the monthly roll, while any situational decision applies
export const SITUATIONAL_DECISION_SHARE = 0.75; // share of picks that go to an applicable situational decision
export const DECISION_REPEAT_COOLDOWN = 3; // a decision doesn't come back while it's among the last few answered
export const DECISION_COAL_SHORTAGE_DAYS = 15; // winter: coal and wood last fewer days than this
export const DECISION_HOUSING_PROTEST_SHARE = 0.05; // homeless share
export const DECISION_STRIKE_FACTORY_STAFFING = 0.75; // factories this short of hands...
export const DECISION_STRIKE_UNEMPLOYMENT = 0.1; // ...or this many workers without a job
export const DECISION_GLUT_FOOD_DAYS = 45; // autumn: food in store for more days of eating than this
export const DECISION_UNREST_STABILITY = 30;

// --- Politics: parties & elections ---
export const ELECTION_INTERVAL_MONTHS = 18; // a general election is held every N in-game months
// The support each election needs is set per difficulty (domain/difficulty):
// voters ask more of a government the longer it has been in power.
export const ELECTIONS_TO_WIN_GAME = 3; // election wins needed for outright victory (a single loss ends the game, so these are inherently consecutive)
export const ELECTION_WIN_STABILITY_BONUS = 5; // a mandate bump to stability on winning

// The Long Reign (see domain/reign): no finish line, so the pressure has to keep growing.
export const LONG_REIGN_THRESHOLD_STEP = 2; // support points added to the line for each election past the difficulty's last
export const LONG_REIGN_BURDENS_OFFERED = 2; // burdens of office offered after each election won; the player takes one
export const LONG_REIGN_FORCED_FROM_WIN = 3; // from this election won on, a second burden is drawn by chance as well

// --- Scouting expeditions (unclaimed islands) ---
export const EXPEDITION_COST = 800;
export const EXPEDITION_DAYS = 40;

// --- Settling the islands (see domain/islands) ---
export const SETTLE_COST = 1500; // Crowns to found a settlement on a scouted island...
export const SETTLE_WOOD = 20; // ...and wood for the settlers' first homes and farm
export const SETTLE_DAYS = 60; // the voyage out and the first season ashore
export const SETTLE_PEOPLE = 300; // settlers, taken from the mainland when they land
// An island with people of its own is settled on terms (domain/islands):
export const LOCALS_LAND_PRICE = 1500; // buying land from them, on top of the settling price
export const LOCALS_SHARE_DAYS = 360; // living alongside them: a year of their keeping to their own ways
export const LOCALS_DRIVE_SUPPORT = -5; // driving them out: every group thinks less of you
export const SETTLE_HOMES = 1; // homes standing when they arrive...
export const SETTLE_FARMS = 1; // ...and a farm, so they have work from the first day
export const MORE_SETTLERS_COST = 400; // another shipload to a settled island...
export const MORE_SETTLERS_DAYS = 30; // ...a month at sea
// The sea between: a colony is linked to the mainland once it has a
// harbour and so does a coastal province of yours. Linked, people cross as
// they would by land, and supplies go by the regular boats. Unlinked, the
// country charters ships to keep it supplied.
export const HARBOUR_COST = 800;
export const HARBOUR_WOOD_COST = 30;
export const HARBOUR_BUILD_DAYS = 60;
export const MAX_HARBOURS_PER_PROVINCE = 1;
export const SUPPLY_FEE_PER_DAY = 4; // Crowns a day for each colony not linked by harbours
// --- Neighbours run by the computer (see domain/neighbours) ---
// They live by the same numbers as the player's country, a month at a time.
export const NEIGHBOUR_TAX_RATE = 0.15; // the rate they tax at, as a new game's
export const NEIGHBOUR_UPKEEP_SHARE = 0.4; // of their income, spent running the country (officials, police, upkeep)
export const NEIGHBOUR_GROWTH_PER_MONTH = POPULATION_GROWTH_RATE * DAYS_PER_MONTH; // people born, while fed and housed

// The race: from the third year, each neighbour's computer ruler may send
// settlers to an island nobody holds, when it can spare the price and its
// temper wants it (see domain/neighbours); whoever lands first keeps it.
export const RACE_FROM_MONTH = 27; // months since the start before any neighbour sails
export const NEIGHBOUR_VOYAGE_GAP_MONTHS = 8; // a neighbour sails at most this often

// Relations (see domain/neighbours/relationsRules.ts): -100 to 100.
export const RELATIONS_BACK_OPPOSITION = -6; // pushing their election toward the party out of power
export const RELATIONS_BACK_RULERS = 3; // ...or toward the party in power
export const RELATIONS_BEATEN_TO_ISLAND = -15; // your settlers landed before theirs
export const RELATIONS_LOCALS_DRIVEN = -4; // you drove an island's people out (both neighbours)
export const RELATIONS_FADE_PER_MONTH = 1; // feelings drift back toward where they rest...
export const RELATIONS_FRIENDLY_REST = 20; // ...which is here while the party you backed rules them, else 0
export const RELATIONS_WARM = 30; // from here they campaign for you, whoever rules them
export const RELATIONS_HOSTILE = -30; // from here down they fund your opposition harder, and race you for islands
export const RELATIONS_HOSTILE_MEDDLING = 1.5; // how much harder
export const RELATIONS_HOSTILE_APPETITE = 1.5; // how much keener on islands
export const RELATIONS_TRADE = 5; // a trade with them, accepted

// Trade by letter (see domain/neighbours/tradeRules.ts).
export const TRADE_OFFER_CHANCE = 0.15; // a month, for each neighbour, once the market is open
export const TRADE_SELL_DISCOUNT = 0.15; // their food, under the market's price...
export const TRADE_BUY_PREMIUM = 0.2; // ...and what they want, over what the market pays you
export const TRADE_PRICE_PER_RELATION = 0.001; // and each point of relations moves the price this share in your favour

// Treaties (see domain/neighbours/treatyRules.ts).
export const ACCORD_COST = 1500; // an island accord: they send no settlers...
export const ACCORD_DAYS = 720; // ...for two years
export const ACCORD_MIN_RELATIONS = 10; // Cordial, to sign
export const RELATIONS_ACCORD = 5; // and they think better of you for asking
export const BUY_BACK_MIN_RELATIONS = 30; // Warm, to sell you an island they hold...
export const BUY_BACK_BASE_PRICE = 3000; // ...for this...
export const BUY_BACK_PRICE_PER_PERSON = 2; // ...and this for each person living there
export const RELATIONS_ISLAND_SOLD = -15; // they part with it unwillingly

// Regiments (see domain/military).
export const POPULATION_PER_REGIMENT = 2500; // a country keeps one regiment for this many people
export const REGIMENT_RAISE_COST = 500; // Crowns to raise one...
export const REGIMENT_SALARY = 5; // ...and its pay, a day
export const REGIMENT_TRAINING_DAYS = 30; // drill before it can march
export const REGIMENT_MARCH_DAYS = 5; // days to march into the province next door
export const REGIMENT_SAIL_DAYS = 20; // days to sail between a coast and an island...
export const REGIMENT_SAIL_DAYS_LINKED = 10; // ...or between harbours, to an island linked by them
export const RACE_VOYAGE_DAYS = 90; // their voyage out
export const RACE_TURNED_BACK_REFUND = 0.5; // share of your settling price refunded when they beat you to it
export const COLONY_DISTANCE_UNREST = 8; // a colony's mood sits this far below the nation's...
export const COLONY_DISTANCE_UNREST_LINKED = 4; // ...or this far, once harbours link it to the mainland
// Island traits (see domain/islands/islandData.ts).
export const ANCHORAGE_HARBOUR_COST_SHARE = 0.5; // a harbour on a sheltered anchorage costs this share
export const GRAZING_FOOD_PER_DAY = 300; // food a day from an island's flocks
export const SALT_TRADE_PER_DAY = 6; // Crowns a day from an island's salt pans

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
export const ADVISOR_MONEY_WARN_DAYS = 30; // the treasury runs dry within this many days...
export const ADVISOR_MONEY_CRITICAL_DAYS = 10;
// How far ahead food and money are projected (see application/getForecasts.ts).
export const FORECAST_DAYS = 90;
export const ADVISOR_FARM_STAFF_CRITICAL = 0.85; // farms below this share staffed
export const ADVISOR_HOMELESS_WARN_SHARE = 0.01;
export const ADVISOR_HOMELESS_CRITICAL_SHARE = 0.05;
export const ADVISOR_ELECTION_WARN_MONTHS = 6; // losing with an election this close
export const ADVISOR_ELECTION_CRITICAL_MONTHS = 2;
// One-click fixes on the advisor's chips (see application/getQuickFix.ts).
export const QUICK_FIX_COAL_DAYS = 30; // buy enough coal to heat the homes this long
export const QUICK_FIX_FOOD_BATCHES = 5; // food bought in one click (×2,000)
export const QUICK_FIX_CONFIRM_SHARE = 0.2; // a fix costing more than this share of the treasury asks twice

// Top bar: a building material comes out of the Stores list when the
// projects drawing on it would use it up within this many days.
export const MATERIAL_SHORTAGE_DAYS = 5;

// --- Monthly reports (see domain/ledger) ---
// What counts as a big monthly change for each number, so the report's
// headline can weigh crowns against food against support points.
export const REPORT_NOTABLE_CHANGE = { treasury: 300, food: 100000, support: 2, stability: 2 } as const;
export const REPORT_LOSS_WEIGHT = 2; // a fall makes the headline well before a rise of the same size...
export const REPORT_GAIN_WEIGHT = 0.75; // ...a full granary is rarely the month's news

// --- Misc ---
export const MAX_EVENT_LOG_LENGTH = 100;
export const CURRENCY_SYMBOL = "Cr"; // "Crowns" — the shared continental currency
