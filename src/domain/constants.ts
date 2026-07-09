// Tunable balancing numbers for the whole simulation.
// Keeping every "magic number" here means gameplay balance can be tuned
// without hunting through rule files in each domain folder.

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

// --- Food ---
export const FOOD_PER_FARM = 10000; // food produced per farm per in-game day
export const FOOD_PER_POP_CONSUMPTION = 1; // food eaten per person per in-game day
export const FARM_COST = 500;
export const FARM_BUILD_DAYS = 60;

// --- Resources (Catan-inspired: terrain produces, provinces trade) ---
export const RESOURCE_PER_PROVINCE = 1; // units of matching resource produced per owned province per day
export const STARTING_RESOURCE_STOCK = 5; // a small founding stockpile of each resource
export const FARM_WOOD_COST = 10; // lumber for the barn
export const FACTORY_ORE_COST = 15; // metal for machinery
export const ROAD_ORE_COST = 6; // gravel for the roadbed
export const BASE_TRADE_RATE = 4; // units given per unit received, without a port
export const PORT_TRADE_RATE = 2; // units given per unit received, with a coastal province
export const TRADE_BATCH_SIZE = 5; // units received per trade click (avoids one-at-a-time clicking)

// --- Industry ---
export const INDUSTRY_PER_FACTORY = 5;
export const INCOME_PER_INDUSTRY = 1.5;
export const FACTORY_COST = 1000;
export const FACTORY_BUILD_DAYS = 120;

// --- Roads (economic efficiency) ---
export const ROAD_EFFICIENCY_BONUS = 0.02; // +2% income & construction speed per road
export const ROAD_COST = 300;
export const ROAD_BUILD_DAYS = 45;

// --- Education & research ---
export const EDUCATION_COST = 400;
export const EDUCATION_BUILD_DAYS = 90;
export const RESEARCH_BASE_RATE = 0.5; // research points/day, even with no education
export const RESEARCH_PER_EDUCATION_LEVEL = 0.05; // extra research points/day per education level
export const RESEARCH_PROJECT_COST = 800;
export const RESEARCH_PROJECT_DAYS = 150;
export const RESEARCH_POINTS_REQUIRED = 50; // accumulated research points needed to start a research project
export const RESEARCH_INDUSTRY_BONUS = 0.1; // +10% industry output per completed research project

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

// --- Misc ---
export const MAX_EVENT_LOG_LENGTH = 100;
export const CURRENCY_SYMBOL = "Cr"; // "Crowns" — the shared continental currency
