// The neighbours run their own countries, a month at a time. Each starts
// where the player's does (10,000 people, its farms and a factory, homes for
// all) and lives by the same numbers: farms feed people by the season, taxes
// and factories bring in money, homes cap how far people can grow. Then the
// computer chooses, by the nation's temper (neighbourData.ts): food first,
// homes next, and with money to spare beyond its reserve, more of what it
// likes to build.
//
// Its dice are its own: drawn from the nation and the month, never from the
// game's shared ones, so a neighbour's choices never shift the luck of
// anything else (the balance tests rely on that).
import {
  BASE_TAX_INCOME_PER_POP,
  DAYS_PER_MONTH,
  FACTORY_COST,
  FARM_COST,
  FARM_SEASON_MULTIPLIER,
  FOOD_PER_FARM,
  FOOD_PER_POP_CONSUMPTION,
  HOUSING_COST,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  JOBS_PER_BUILDING,
  LABOUR_SHARE,
  NEIGHBOUR_GROWTH_PER_MONTH,
  NEIGHBOUR_TAX_RATE,
  NEIGHBOUR_UPKEEP_SHARE,
  PEOPLE_PER_HOME,
} from "../constants";
import { getSeason } from "../country/calendar";
import type { GameDate } from "../country/types";
import { NATIONS } from "../nations/nationData";
import { getPersonality } from "./neighbourData";
import type { Neighbour } from "./types";

// A number in [0, 1) fixed by the nation, the month and what it is for.
export function neighbourDice(nationId: string, month: number, purpose: string): number {
  let h = 2166136261;
  for (const ch of `${nationId}:${month}:${purpose}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// As the player's country starts (see application/startNewGame.ts).
export function createNeighbour(nationId: string): Neighbour {
  const population = 10000;
  return {
    treasury: 0,
    population,
    food: 400000,
    stability: nationId === "caldenreich" ? 70 : 60,
    farms: nationId === "astravia" ? 4 : 3,
    factories: 1,
    homes: Math.ceil((population * 1.05) / PEOPLE_PER_HOME),
    lastVoyageMonth: null,
    lastDeed: null,
  };
}

export function createNeighbours(playerNationId: string): Record<string, Neighbour> {
  return Object.fromEntries(NATIONS.filter((n) => n.id !== playerNationId).map((n) => [n.id, createNeighbour(n.id)]));
}

// Workers against jobs: farms first, then factories, as at home.
function staffing(n: Neighbour): { farms: number; factories: number } {
  const workers = n.population * LABOUR_SHARE;
  const farmJobs = n.farms * JOBS_PER_BUILDING.farm;
  const farms = farmJobs > 0 ? Math.min(1, workers / farmJobs) : 0;
  const left = Math.max(0, workers - farmJobs);
  const factoryJobs = n.factories * JOBS_PER_BUILDING.factory;
  return { farms, factories: factoryJobs > 0 ? Math.min(1, left / factoryJobs) : 0 };
}

// A day's food grown in a given season, and eaten.
function dailyFood(n: Neighbour, season: keyof typeof FARM_SEASON_MULTIPLIER): { grown: number; eaten: number } {
  return { grown: n.farms * staffing(n).farms * FOOD_PER_FARM * FARM_SEASON_MULTIPLIER[season], eaten: n.population * FOOD_PER_POP_CONSUMPTION };
}

// What a day leaves in the treasury: taxes and staffed factories, less the
// share spent running the country.
export function getNeighbourIncome(n: Neighbour, nationId: string): number {
  const industry = n.factories * staffing(n).factories * INDUSTRY_PER_FACTORY * getPersonality(nationId).industryBonus;
  return (n.population * BASE_TAX_INCOME_PER_POP * NEIGHBOUR_TAX_RATE + industry * INCOME_PER_INDUSTRY) * (1 - NEIGHBOUR_UPKEEP_SHARE);
}

// A month lived: food grown and eaten, money in, people born into the room
// there is, or lost to hunger, and order following how they fare.
export function liveMonth(n: Neighbour, nationId: string, date: GameDate): Neighbour {
  const { grown, eaten } = dailyFood(n, getSeason(date));
  const food = n.food + (grown - eaten) * DAYS_PER_MONTH;
  const hungry = food < 0;
  const room = n.homes * PEOPLE_PER_HOME - n.population;
  const population = hungry ? n.population * 0.98 : n.population + Math.max(0, Math.min(room, n.population * NEIGHBOUR_GROWTH_PER_MONTH));
  const target = (hungry ? 30 : getPersonality(nationId).order) - (room < 0 ? 10 : 0);
  return {
    ...n,
    food: Math.max(0, food),
    treasury: n.treasury + getNeighbourIncome(n, nationId) * DAYS_PER_MONTH,
    population,
    stability: n.stability + (target - n.stability) * 0.2,
  };
}

// How many days the food lasts at today's rate over a year of seasons, or
// Infinity when a year's harvest covers what's eaten.
function daysOfFood(n: Neighbour): number {
  const seasons = Object.values(FARM_SEASON_MULTIPLIER);
  const yearly = seasons.reduce((sum, m) => sum + n.farms * staffing(n).farms * FOOD_PER_FARM * m, 0) / seasons.length;
  const shortfall = n.population * FOOD_PER_POP_CONSUMPTION - yearly;
  return shortfall <= 0 ? Infinity : n.food / shortfall;
}

// One thing built a month, by need and then by temper.
export function chooseBuilding(n: Neighbour, nationId: string): { neighbour: Neighbour; deed: string | null } {
  const temper = getPersonality(nationId);
  const build = (kind: "farm" | "factory" | "homes", cost: number, deed: string) => ({
    neighbour: {
      ...n,
      treasury: n.treasury - cost,
      farms: n.farms + (kind === "farm" ? 1 : 0),
      factories: n.factories + (kind === "factory" ? 1 : 0),
      homes: n.homes + (kind === "homes" ? 1 : 0),
    },
    deed,
  });
  // Food before anything: a year's harvest that won't last.
  if (daysOfFood(n) < 300 && n.treasury >= FARM_COST) return build("farm", FARM_COST, "Built a farm to feed its people");
  // Homes before people outgrow them.
  if (n.population > n.homes * PEOPLE_PER_HOME * 0.95 && n.treasury >= HOUSING_COST) return build("homes", HOUSING_COST, "Built homes");
  // Idle hands, and money to spare beyond its reserve.
  const workers = n.population * LABOUR_SHARE;
  const jobs = n.farms * JOBS_PER_BUILDING.farm + n.factories * JOBS_PER_BUILDING.factory;
  const idle = workers - jobs;
  // A farming nation still builds factories once half a year's food is in store.
  const fed = n.food >= n.population * FOOD_PER_POP_CONSUMPTION * 180;
  const grows = temper.grows === "farm" && !fed ? "farm" : "factory";
  const cost = grows === "farm" ? FARM_COST : FACTORY_COST;
  const room = grows === "farm" ? JOBS_PER_BUILDING.farm : JOBS_PER_BUILDING.factory;
  if (idle >= room * 0.5 && n.treasury - cost >= temper.reserve) {
    return grows === "farm" ? build("farm", FARM_COST, "Built a farm") : build("factory", FACTORY_COST, "Built a factory");
  }
  return { neighbour: n, deed: null };
}
