// Use case: "what needs you now" — the two or three most urgent problems,
// read from calculations the rest of the game already makes (heating,
// food, labour, housing, repairs, debt, elections, construction, research).
// When nothing is wrong, the next early-game objective instead, worked out
// from the state itself — there's no separate tutorial progress to save.
import {
  ADVISOR_COAL_CRITICAL_DAYS,
  ADVISOR_ELECTION_CRITICAL_MONTHS,
  ADVISOR_ELECTION_WARN_MONTHS,
  ADVISOR_FARM_STAFF_CRITICAL,
  ADVISOR_FOOD_CRITICAL_DAYS,
  ADVISOR_FOOD_WARN_DAYS,
  ADVISOR_HOMELESS_CRITICAL_SHARE,
  ADVISOR_HOMELESS_WARN_SHARE,
  ADVISOR_MAX_ALERTS,
  ADVISOR_WINTER_PREP_CRITICAL_DAYS,
  ADVISOR_WINTER_PREP_DAYS,
  ELECTION_WIN_THRESHOLD,
} from "../domain/constants";
import type { GameState } from "../domain/country/types";
import { getHomelessShare } from "../domain/housing/housingRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { isDebtDangerous } from "../domain/loans/loanRules";
import { monthsUntilNextElection } from "../domain/parties/electionRules";
import { getResearchNodeStatus } from "../domain/research/researchRules";
import { RESEARCH_NODES } from "../domain/research/researchData";
import { RESEARCH_CATEGORIES } from "../domain/workforce/workforceRules";
import type { DailyProductionSummary } from "./getDailyProductionSummary";
import type { HeatingOutlook } from "./getHeatingOutlook";

// Which tab fixes it — the same keys as the top bar's tabs.
export type AdvisorPanel = "politics" | "economy" | "trade" | "research";

export type AdvisorAlertKind =
  | "unrest"
  | "coal"
  | "food"
  | "farmWorkers"
  | "factoryWorkers"
  | "homeless"
  | "broken"
  | "debt"
  | "election"
  | "stalled"
  | "research";

export interface AdvisorAlert {
  kind: AdvisorAlertKind;
  text: string; // very short, with the key number: "Coal: 12 days"
  detail: string; // tooltip: what's wrong and what to do
  critical: boolean;
  panel: AdvisorPanel;
  stage?: GameState["unrestStage"]; // for the unrest alert
}

export type ObjectiveKind = "winter" | "farm" | "homes" | "election";

export interface AdvisorObjective {
  kind: ObjectiveKind;
  text: string;
  detail: string;
  done: boolean[]; // one tick per objective, in order
  panel: AdvisorPanel;
}

export interface AdvisorOutlook {
  alerts: AdvisorAlert[]; // most urgent first, at most ADVISOR_MAX_ALERTS
  objective: AdvisorObjective | null; // only when there are no alerts; null once every objective is met
}

// Most urgent first when equally critical — the order the problems are
// checked in below.
const ALERT_ORDER: AdvisorAlertKind[] = ["unrest", "coal", "food", "farmWorkers", "factoryWorkers", "homeless", "broken", "debt", "election", "stalled", "research"];

const UNREST_NAMES: Record<GameState["unrestStage"], string> = { calm: "Calm", discontent: "Discontent", strikes: "Strikes", riots: "Riots" };

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function compact(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${Math.round(value)}`;
}

function getAlerts(state: GameState, production: DailyProductionSummary, heating: HeatingOutlook): AdvisorAlert[] {
  const alerts: AdvisorAlert[] = [];

  // Unrest: strikes and riots are a step from collapse.
  if (state.unrestStage !== "calm") {
    alerts.push({
      kind: "unrest",
      stage: state.unrestStage,
      text: `Unrest: ${UNREST_NAMES[state.unrestStage]}`,
      detail: `Stability ${Math.round(state.stats.stability)}. A crackdown on the Politics tab pulls the country back a stage; police soften strikes and riots.`,
      critical: state.unrestStage !== "discontent",
      panel: "politics",
    });
  }

  // Heating: days of fuel left this winter, or how ready the stock is for the next one.
  if (heating.isWinter && heating.fuelPerDay > 0 && heating.daysOfFuel < heating.winterDaysLeft) {
    const days = Math.floor(heating.daysOfFuel);
    alerts.push({
      kind: "coal",
      text: `Coal: ${days} days`,
      detail: `Coal and firewood last ${days} more days, with ${heating.winterDaysLeft} days of winter left. Buy coal on the Trade tab.`,
      critical: days < ADVISOR_COAL_CRITICAL_DAYS,
      panel: "trade",
    });
  } else if (!heating.isWinter && heating.daysUntilWinter <= ADVISOR_WINTER_PREP_DAYS && heating.fuel < heating.fuelNeeded) {
    alerts.push({
      kind: "coal",
      text: `Winter coal: ${percent(heating.fuelNeeded > 0 ? heating.fuel / heating.fuelNeeded : 1)}`,
      detail: `Winter starts in ${heating.daysUntilWinter} days. You have ${Math.floor(heating.fuel)} of the ${Math.ceil(heating.fuelNeeded)} coal and wood the homes will burn.`,
      critical: heating.daysUntilWinter <= ADVISOR_WINTER_PREP_CRITICAL_DAYS,
      panel: "trade",
    });
  }

  // Food: how long the stock lasts at today's net.
  if (production.netFood < 0) {
    const days = Math.floor(state.stats.food / -production.netFood);
    if (days < ADVISOR_FOOD_WARN_DAYS) {
      const critical = days < ADVISOR_FOOD_CRITICAL_DAYS;
      alerts.push({
        kind: "food",
        text: `Food: ${days} days`,
        detail: `At today's harvest and appetite the food runs out in ${days} days. Build farms, or buy food on the Trade tab.`,
        critical,
        panel: critical ? "trade" : "economy",
      });
    }
  }

  // Hands: farms are staffed first, so short farms are the serious case.
  const labour = getLabourSituation(state);
  if (labour.foodStaffing < 1) {
    alerts.push({
      kind: "farmWorkers",
      text: `Farms: ${percent(labour.foodStaffing)} staffed`,
      detail: "Not enough workers for the farms, granaries and canneries. More homes mean more people; fewer factories free up hands.",
      critical: labour.foodStaffing < ADVISOR_FARM_STAFF_CRITICAL,
      panel: "economy",
    });
  } else if (labour.industryStaffing < 1) {
    alerts.push({
      kind: "factoryWorkers",
      text: `Factories: ${percent(labour.industryStaffing)} staffed`,
      detail: "Not enough workers left over for the factories. Build homes so more people can settle.",
      critical: false,
      panel: "economy",
    });
  }

  const homelessShare = getHomelessShare(state.stats.population, production.housingCapacity);
  if (homelessShare >= ADVISOR_HOMELESS_WARN_SHARE) {
    const homeless = state.stats.population - production.housingCapacity;
    alerts.push({
      kind: "homeless",
      text: `Homeless: ${compact(homeless)}`,
      detail: `${percent(homelessShare)} of people have no home. It costs stability and support every day. Build homes.`,
      critical: homelessShare >= ADVISOR_HOMELESS_CRITICAL_SHARE,
      panel: "economy",
    });
  }

  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  if (broken > 0) {
    alerts.push({
      kind: "broken",
      text: `Broken: ${broken}`,
      detail: `${broken} building${broken === 1 ? " has" : "s have"} broken down and produce nothing until repaired.`,
      critical: false,
      panel: "economy",
    });
  }

  if (isDebtDangerous(state.debt)) {
    alerts.push({
      kind: "debt",
      text: `Debt: ${compact(state.debt)}`,
      detail: "Debt is past the danger line — the interest costs stability and support every day. Repay on the Trade tab.",
      critical: true,
      panel: "trade",
    });
  }

  const months = monthsUntilNextElection(state.date);
  const support = Math.round(state.stats.popularity);
  if (months <= ADVISOR_ELECTION_WARN_MONTHS && support < ELECTION_WIN_THRESHOLD) {
    alerts.push({
      kind: "election",
      text: `Election ${months} mo: ${support}%`,
      detail: `The election is in ${months} month${months === 1 ? "" : "s"} and you'd lose today — you need ${ELECTION_WIN_THRESHOLD}%.`,
      critical: months <= ADVISOR_ELECTION_CRITICAL_MONTHS,
      panel: "politics",
    });
  }

  const stalled = state.projects.filter((p) => p.isStalled).length;
  if (stalled > 0) {
    alerts.push({
      kind: "stalled",
      text: `Stalled: ${stalled}`,
      detail: `${stalled} building project${stalled === 1 ? " is" : "s are"} stalled for lack of money or materials, and slipping backward.`,
      critical: false,
      panel: "economy",
    });
  }

  const idle = RESEARCH_CATEGORIES.filter(
    (category) => !state.researchFocus[category] && RESEARCH_NODES.some((n) => n.category === category && getResearchNodeStatus(state, n) === "available"),
  );
  if (idle.length > 0) {
    alerts.push({
      kind: "research",
      text: `Research idle: ${idle.length}`,
      detail: `No direction chosen for ${idle.join(", ")} research — that area makes no progress.`,
      critical: false,
      panel: "research",
    });
  }

  return alerts
    .sort((a, b) => Number(b.critical) - Number(a.critical) || ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind))
    .slice(0, ADVISOR_MAX_ALERTS);
}

// The opening steps, each worked out from the state: through the first
// winter, a first farm, first homes, the first election.
function getObjective(state: GameState): AdvisorObjective | null {
  const builtByYou = (type: string) => state.placedBuildings.some((b) => b.type === type && !b.id.startsWith("starting-"));
  const building = (type: string) => state.projects.some((p) => p.type === type);
  const done = [state.date.year > 1 || state.date.month >= 3, builtByYou("farm"), builtByYou("housing"), state.electionsWon > 0];
  const next = done.indexOf(false);
  if (next === -1) return null;

  switch (next) {
    case 0:
      return {
        kind: "winter",
        text: "Survive the first winter",
        detail: "Keep the homes heated and people fed until spring (March).",
        done,
        panel: "trade",
      };
    case 1:
      return {
        kind: "farm",
        text: building("farm") ? "Farm being built" : "Build a farm",
        detail: "More farms feed a growing country — and next winter's farms yield little.",
        done,
        panel: "economy",
      };
    case 2:
      return {
        kind: "homes",
        text: building("housing") ? "Homes being built" : "Build homes",
        detail: "The country grows; every family needs a roof. More people also means more workers.",
        done,
        panel: "economy",
      };
    default:
      return {
        kind: "election",
        text: `Win the election (${monthsUntilNextElection(state.date)} mo)`,
        detail: `Hold ${ELECTION_WIN_THRESHOLD}% support or more on election day.`,
        done,
        panel: "politics",
      };
  }
}

export function getAdvisorOutlook(state: GameState, production: DailyProductionSummary, heating: HeatingOutlook): AdvisorOutlook {
  const alerts = getAlerts(state, production, heating);
  return { alerts, objective: alerts.length === 0 ? getObjective(state) : null };
}
