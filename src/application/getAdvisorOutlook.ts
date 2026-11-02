// Use case: "what needs you now" — the two or three most urgent problems,
// read from calculations the rest of the game already makes (heating,
// food, labour, housing, repairs, debt, elections, construction, research).
// The early-game objectives live in the chapters now (application/chapters.ts).
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
  ADVISOR_MONEY_CRITICAL_DAYS,
  ADVISOR_MONEY_WARN_DAYS,
  ADVISOR_WINTER_PREP_CRITICAL_DAYS,
} from "../domain/constants";
import { isFeatureOpen } from "../domain/chapters/chapterData";
import type { GameState } from "../domain/country/types";
import { getLabourSituation } from "../domain/labour/labourRules";
import { isDebtDangerous } from "../domain/loans/loanRules";
import { getElectionThreshold, monthsUntilNextElection } from "../domain/parties/electionRules";
import { isLocalTrouble } from "../domain/provinces/provinceOrder";
import { getDifficulty } from "../domain/difficulty/difficultyData";
import { getBreakawayDaysLeft, getRiotDaysToRise } from "../domain/uprising/uprisingRules";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { getNation } from "../domain/nations/nationRules";
import { getResearchNodeStatus } from "../domain/research/researchRules";
import { RESEARCH_NODES } from "../domain/research/researchData";
import { RESEARCH_CATEGORIES } from "../domain/workforce/workforceRules";
import { formatDate } from "../domain/country/calendar";
import type { DailyProductionSummary } from "./getDailyProductionSummary";
import type { Forecasts } from "./getForecasts";
import { getProjectShortages, type StallCause } from "./getProjectAffordability";
import { isWinterFuelShort, type HeatingOutlook } from "./getHeatingOutlook";
import { counted } from "../domain/plural";

export type AdvisorAlertKind =
  | "uprising"
  | "unrest"
  | "provinceUnrest"
  | "coal"
  | "food"
  | "money"
  | "farmWorkers"
  | "factoryWorkers"
  | "homeless"
  | "broken"
  | "debt"
  | "election"
  | "stalled"
  | "research"
  | "race";

export interface AdvisorAlert {
  kind: AdvisorAlertKind;
  text: string; // very short, with the key number: "Coal: 12 days"
  detail: string; // tooltip: what's wrong and what to do
  critical: boolean;
  stage?: GameState["unrestStage"]; // for the unrest alert
  stalledFor?: StallCause; // for the stalled alert: what the first of them is short of
}

export interface AdvisorOutlook {
  alerts: AdvisorAlert[]; // most urgent first, at most ADVISOR_MAX_ALERTS
}

// Most urgent first when equally critical — the order the problems are
// checked in below.
const ALERT_ORDER: AdvisorAlertKind[] = ["uprising", "unrest", "provinceUnrest", "coal", "food", "money", "farmWorkers", "factoryWorkers", "homeless", "broken", "race", "debt", "election", "stalled", "research"];

const UNREST_NAMES: Record<GameState["unrestStage"], string> = { calm: "Calm", discontent: "Discontent", strikes: "Strikes", riots: "Riots" };

const dayCount = (days: number): string => counted(days, "day");

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function compact(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${Math.round(value)}`;
}

function getAlerts(state: GameState, production: DailyProductionSummary, heating: HeatingOutlook, forecasts: Forecasts): AdvisorAlert[] {
  const alerts: AdvisorAlert[] = [];
  // Advice names only what the player can do yet (see domain/chapters).
  const market = isFeatureOpen(state, "market");
  const streets = isFeatureOpen(state, "unrest");

  // A province risen against the government: the most urgent thing there is.
  const risen = Object.entries(state.provinces)
    .filter(([, p]) => p.uprising)
    .sort(([, a], [, b]) => b.uprising!.strength - a.uprising!.strength);
  if (risen.length > 0) {
    const [id, strongest] = risen[0];
    const others = risen.length > 1 ? ` +${risen.length - 1}` : "";
    const breaking = getBreakawayDaysLeft(strongest.uprising!, state.date);
    alerts.push({
      kind: "uprising",
      text: `Risen: ${getProvinceName(id)}${others}`,
      detail: `${getProvinceName(id)} has risen against the government (rebel strength ${Math.round(strongest.uprising!.strength)}): rebels hold its farms and works, and it pays no taxes.${breaking !== null ? ` At full strength, it breaks away for good in ${dayCount(breaking)}.` : ""} ${streets ? "Send in the militia, or calm the country and it burns out." : "Calm the country and it burns out."}`,
      critical: true,
    });
  }

  // Unrest: strikes and riots are a step from collapse.
  if (state.unrestStage !== "calm") {
    alerts.push({
      kind: "unrest",
      stage: state.unrestStage,
      text: `Unrest: ${UNREST_NAMES[state.unrestStage]}`,
      detail: `Stability ${Math.round(state.stats.stability)}. ${streets ? "A crackdown pulls the country back a stage; police soften strikes and riots." : "Feed, house, employ and warm the people to bring it back."}`,
      critical: state.unrestStage !== "discontent",
    });
  }

  // A province striking or rioting worse than the rest of the country.
  const troubled = Object.entries(state.provinces)
    .filter(([, p]) => !p.uprising && isLocalTrouble(p.unrestStage, state.unrestStage))
    .sort(([, a], [, b]) => a.stability - b.stability);
  if (troubled.length > 0) {
    const [id, worst] = troubled[0];
    const others = troubled.length > 1 ? ` +${troubled.length - 1}` : "";
    // A province rioting on its own is counting down to rising.
    const toRise = getRiotDaysToRise(worst, state.date, getDifficulty(state.difficulty).uprisingRiotDays) - worst.riotDays;
    const rising = worst.unrestStage === "riots" && worst.riotDays > 0 ? ` It rises against the government in ${toRise} ${toRise === 1 ? "day" : "days"}.` : "";
    alerts.push({
      kind: "provinceUnrest",
      stage: worst.unrestStage,
      text: `${UNREST_NAMES[worst.unrestStage]}: ${getProvinceName(id)}${others}`,
      detail: `${getProvinceName(id)} is ${worst.unrestStage === "riots" ? "rioting, wrecking its buildings and dragging national stability down" : "on strike"}. Too many there have no home or no work: build homes or jobs there${streets ? ", or crack down" : ""}.${rising}`,
      critical: worst.unrestStage === "riots",
    });
  }

  // A neighbour's settlers bound for an island: settle it first to keep it.
  const voyage = state.foreignVoyages[0];
  if (voyage) {
    const days = Math.ceil(voyage.daysRemaining);
    alerts.push({
      kind: "race",
      text: `${getNation(voyage.nationId).name} → ${getProvinceName(voyage.islandId)}: ${days}d`,
      detail: `${getNation(voyage.nationId).name}'s settlers land on ${getProvinceName(voyage.islandId)} in ${dayCount(days)}, and it will be theirs. Settle it first to keep it.`,
      critical: false,
    });
  }

  // Heating: days of fuel left this winter, or how ready the stock is for the next one.
  if (heating.isWinter && heating.fuelPerDay > 0 && heating.daysOfFuel < heating.winterDaysLeft) {
    const days = Math.floor(heating.daysOfFuel);
    alerts.push({
      kind: "coal",
      text: `Coal: ${dayCount(days)}`,
      detail: `Coal and firewood last ${counted(days, "more day", "more days")}, with ${dayCount(heating.winterDaysLeft)} of winter left. ${market ? "Buy coal." : "Keep the wood for burning, not building."}`,
      critical: days < ADVISOR_COAL_CRITICAL_DAYS,
    });
  } else if (isWinterFuelShort(heating, production.resourceProduction.coal)) {
    alerts.push({
      kind: "coal",
      text: `Winter coal: ${percent(heating.fuelNeeded > 0 ? heating.fuel / heating.fuelNeeded : 1)}`,
      detail: `Winter starts in ${dayCount(heating.daysUntilWinter)}. Your coal and wood last ${Math.floor(heating.daysOfFuel)} of its ${dayCount(heating.winterDaysLeft)}.${market ? " Coal costs more once it starts." : ""}`,
      critical: heating.daysUntilWinter <= ADVISOR_WINTER_PREP_CRITICAL_DAYS,
    });
  }

  // Food: when the stock runs out, season by season (see getForecasts).
  if (forecasts.food && forecasts.food.days < ADVISOR_FOOD_WARN_DAYS) {
    const { days, date } = forecasts.food;
    const critical = days < ADVISOR_FOOD_CRITICAL_DAYS;
    alerts.push({
      kind: "food",
      text: days === 0 ? "Food exhausted" : `Food: ${dayCount(days)}`,
      detail: `${days === 0 ? "The food is gone and the people are going hungry" : `If nothing changes, the food runs out around ${formatDate(date)}`}. Build farms${market ? ", or buy food" : ""}.`,
      critical,
    });
  }

  // Money: when the treasury goes into the red, counting what the
  // projects underway still have to draw.
  if (forecasts.treasury && forecasts.treasury.days < ADVISOR_MONEY_WARN_DAYS) {
    const { days, date } = forecasts.treasury;
    alerts.push({
      kind: "money",
      text: `Money: ${dayCount(days)}`,
      detail: `If nothing changes, the treasury runs dry around ${formatDate(date)}: raise taxes, cut staff, pause building, or take a loan.`,
      critical: days < ADVISOR_MONEY_CRITICAL_DAYS,
    });
  }

  // Hands: farms are staffed first, so short farms are the serious case.
  const labour = getLabourSituation(state);
  if (labour.foodStaffing < 1) {
    alerts.push({
      kind: "farmWorkers",
      text: `Farms: ${percent(labour.foodStaffing)} staffed`,
      detail: "Not enough workers for the farms, granaries and canneries. More homes mean more people; fewer factories free up hands.",
      critical: labour.foodStaffing < ADVISOR_FARM_STAFF_CRITICAL,
    });
  } else if (labour.industryStaffing < 1) {
    alerts.push({
      kind: "factoryWorkers",
      text: `Factories: ${percent(labour.industryStaffing)} staffed`,
      detail: "Not enough workers left over for the factories. Build homes so more people can settle.",
      critical: false,
    });
  }

  const homelessShare = state.stats.population > 0 ? production.homeless / state.stats.population : 0;
  if (homelessShare >= ADVISOR_HOMELESS_WARN_SHARE) {
    const homeless = production.homeless;
    alerts.push({
      kind: "homeless",
      text: `Homeless: ${compact(homeless)}`,
      detail: `${percent(homelessShare)} of people have no home. It costs stability and support every day. Build homes.`,
      critical: homelessShare >= ADVISOR_HOMELESS_CRITICAL_SHARE,
    });
  }

  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  if (broken > 0) {
    alerts.push({
      kind: "broken",
      text: `Broken: ${broken}`,
      detail: `${broken} building${broken === 1 ? " has" : "s have"} broken down and produce nothing until repaired.`,
      critical: false,
    });
  }

  if (isDebtDangerous(state.debt)) {
    alerts.push({
      kind: "debt",
      text: `Debt: ${compact(state.debt)}`,
      detail: "Debt is past the danger line. The interest costs stability and support every day. Repay some.",
      critical: true,
    });
  }

  const months = monthsUntilNextElection(state.date);
  const support = Math.round(state.stats.popularity);
  const needed = getElectionThreshold(state);
  if (months <= ADVISOR_ELECTION_WARN_MONTHS && support < needed) {
    alerts.push({
      kind: "election",
      text: `Election ${months} mo: ${support}%`,
      detail: `The election is in ${months} month${months === 1 ? "" : "s"} and you'd lose today. You need ${needed}%.`,
      critical: months <= ADVISOR_ELECTION_CRITICAL_MONTHS,
    });
  }

  const stalledProjects = state.projects.filter((p) => p.isStalled);
  const stalled = stalledProjects.length;
  if (stalled > 0) {
    const shortages = getProjectShortages(state);
    const short = stalledProjects.map((p) => shortages.get(p.id)).filter((s) => s !== undefined);
    const wants = [...new Set(short.flatMap((s) => [s.money ? "money" : null, s.good]).filter((word) => word !== null))].join(" and ");
    alerts.push({
      kind: "stalled",
      text: `Stalled: ${stalled}`,
      detail: `${stalled} building project${stalled === 1 ? " is" : "s are"} stalled for lack of ${wants || "money or materials"}, and slipping backward.`,
      critical: false,
      stalledFor: short.some((s) => s.money) ? "money" : short[0] && isFeatureOpen(state, "market") ? (short[0].good ?? undefined) : undefined,
    });
  }

  const idle = RESEARCH_CATEGORIES.filter(
    (category) => !state.researchFocus[category] && RESEARCH_NODES.some((n) => n.category === category && getResearchNodeStatus(state, n) === "available"),
  );
  if (idle.length > 0 && isFeatureOpen(state, "research")) {
    alerts.push({
      kind: "research",
      text: `Research idle: ${idle.length}`,
      detail: `No direction chosen for ${idle.join(", ")} research, so that area makes no progress.`,
      critical: false,
    });
  }

  return alerts
    .sort((a, b) => Number(b.critical) - Number(a.critical) || ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind))
    .slice(0, ADVISOR_MAX_ALERTS);
}

export function getAdvisorOutlook(state: GameState, production: DailyProductionSummary, heating: HeatingOutlook, forecasts: Forecasts): AdvisorOutlook {
  return { alerts: getAlerts(state, production, heating, forecasts) };
}
