// Where the player goes to deal with something. The application layer only
// names problems (an advisor alert's kind); this file alone decides which
// window and section answers each one, so the tab layout can change
// without touching the rules.
//
// Every thing lives in exactly one window:
//   Build     buildings · people (homes, jobs, heating, food)
//   Money     budget (taxes, loans) · market
//   Politics  support (the chamber, what moves it, rallies) · voters (groups, courting, parties) · unrest (police, crackdowns) · neighbours
//   Army      regiments: raising them, where they stand and march (moved on the map)
//   Laws, Research, Reports, and Ventures (opened from an island on the map)
import type { AdvisorAlert, AdvisorAlertKind } from "../application/getAdvisorOutlook";
import { chapterFor, isFeatureOpen, isStoryChapter, type ChapterId, type Feature, type StoryChapterId, type SystemChapterId } from "../domain/chapters/chapterData";
import type { GameState } from "../domain/country/types";
import { BUILD_GROUPS, type BuildRail } from "./buildGroups";

export type PanelKey = "build" | "money" | "politics" | "laws" | "research" | "reports" | "ventures" | "army";

export type BuildSection = "buildings" | "people";
export type MoneySection = "budget" | "market";
export type PoliticsSection = "support" | "voters" | "unrest" | "neighbours";
export type Section = BuildSection | MoneySection | PoliticsSection;

export interface Sections {
  build: BuildSection;
  money: MoneySection;
  politics: PoliticsSection;
}

export interface Destination {
  panel: PanelKey;
  section?: Section;
  rail?: BuildRail; // Build's Buildings only: the kind of building it opens on
}

// Opens a window, optionally straight at one of its sections (and, for
// Build, at one kind of building).
export type OpenPanel = (panel: PanelKey, section?: Section, rail?: BuildRail) => void;

export const FIRST_SECTIONS: Sections = { build: "buildings", money: "budget", politics: "support" };

// Politics opens on unrest while there are strikes or riots, else on support.
export function politicsSectionFor(state: GameState): PoliticsSection {
  const troubled = state.unrestStage === "strikes" || state.unrestStage === "riots";
  return troubled && isFeatureOpen(state, "unrest") ? "unrest" : "support";
}

// The windows and sections that stay shut until a chapter opens them (see
// domain/chapters).
const PANEL_FEATURES: Partial<Record<PanelKey, Feature>> = { laws: "laws", research: "research", ventures: "ventures", army: "army" };
const SECTION_FEATURES: Partial<Record<Section, Feature>> = { market: "market", voters: "voters", unrest: "unrest", neighbours: "neighbours" };

// Why a window or section is shut, or null when it's open.
export function lockedReason(state: GameState, panel: PanelKey, section?: Section): string | null {
  const feature = (section && SECTION_FEATURES[section]) || PANEL_FEATURES[panel];
  return feature && !isFeatureOpen(state, feature) ? chapterFor(feature).until : null;
}

// Somewhere open to go instead of a shut window: its first section, or Build.
export function reachable(state: GameState, to: Destination): Destination {
  if (!lockedReason(state, to.panel, to.section)) return to;
  if (to.panel === "money") return BUDGET;
  if (to.panel === "politics") return SUPPORT;
  return BUILDINGS;
}

export const MARKET: Destination = { panel: "money", section: "market" };
export const BUDGET: Destination = { panel: "money", section: "budget" };
export const BUILDINGS: Destination = { panel: "build", section: "buildings" };
export const HOMES: Destination = { ...BUILDINGS, rail: "people" };
export const FARMS: Destination = { ...BUILDINGS, rail: "food" };
export const HARBOURS: Destination = { ...BUILDINGS, rail: "sea" };
export const REPAIRS: Destination = { ...BUILDINGS, rail: "repairs" };
export const PEOPLE: Destination = { panel: "build", section: "people" };
export const SUPPORT: Destination = { panel: "politics", section: "support" };
export const UNREST: Destination = { panel: "politics", section: "unrest" };

const ALERTS: Record<AdvisorAlertKind, Destination> = {
  uprising: UNREST,
  unrest: UNREST,
  provinceUnrest: PEOPLE,
  coal: MARKET,
  food: FARMS,
  money: BUDGET,
  farmWorkers: PEOPLE,
  factoryWorkers: PEOPLE,
  homeless: PEOPLE,
  broken: REPAIRS,
  debt: BUDGET,
  election: SUPPORT,
  stalled: BUILDINGS,
  research: { panel: "research" },
  race: { panel: "ventures" },
};

const WINDOW_NAMES: Record<PanelKey, string> = {
  build: "Build",
  money: "Money",
  politics: "Politics",
  laws: "Laws",
  research: "Research",
  reports: "Reports",
  ventures: "Ventures",
  army: "Army",
};

const SECTION_NAMES: Record<Section, string> = {
  buildings: "Buildings",
  people: "People",
  budget: "Budget",
  market: "Market",
  support: "Support",
  voters: "Voters",
  unrest: "Unrest",
  neighbours: "Neighbours",
};

// A destination as the player sees it: the window, the tab inside it, and
// the kind of building.
export function destinationName({ panel, section, rail }: Destination): string {
  const railName = rail === "repairs" ? "Repairs" : BUILD_GROUPS.find((g) => g.key === rail)?.title;
  return [WINDOW_NAMES[panel], section && SECTION_NAMES[section], railName].filter(Boolean).join(" › ");
}

// Where each chapter's objectives are done, in the order the chapter
// lists them. null: there is nowhere to go, it comes with time.
export const OBJECTIVE_DESTINATIONS: Record<SystemChapterId, Array<Destination | null>> = {
  "first-winter": [FARMS, HOMES, null],
  exchange: [MARKET],
  assembly: [{ panel: "laws" }],
  society: [{ panel: "research" }, HOMES],
  streets: [UNREST],
  voters: [{ panel: "politics", section: "voters" }],
  envoys: [{ panel: "politics", section: "neighbours" }],
  captain: [{ panel: "ventures" }],
  army: [{ panel: "army" }],
};

// The same for a nation's story chapters, filled campaign by campaign.
export const STORY_DESTINATIONS: Record<StoryChapterId, Array<Destination | null>> = {
  "astravia:promise": [null, FARMS],
  "astravia:flood": [null],
  "astravia:lean-year": [null, MARKET],
  "astravia:coast": [null, HARBOURS],
  "astravia:island": [{ panel: "ventures" }, { panel: "ventures" }],
  "astravia:new-farmers": [null],
  "astravia:thornwick-rises": [null],
  "astravia:felling": [null],
  "astravia:founding-day": [null, SUPPORT],
  "caldenreich:speech": [null],
  "caldenreich:academy": [null, { panel: "research" }],
  "caldenreich:seam": [null],
  "caldenreich:guild": [null],
  "caldenreich:winter": [null],
  "caldenreich:heir": [null],
  "caldenreich:ashford": [null],
  "caldenreich:konrad": [null, SUPPORT],
  "caldenreich:elisabet": [null, SUPPORT],
  "veldoria:whistle": [null],
  "veldoria:smoke": [null],
  "veldoria:ore": [null],
  "veldoria:commons": [null],
  "veldoria:islands": [null, { panel: "ventures" }],
  "veldoria:congress": [null],
  "veldoria:strike": [null],
  "veldoria:flood": [null],
  "veldoria:exhibition": [null, SUPPORT],
};

// Where a chapter's objective (the i-th) is done, if anywhere.
export function objectiveDestination(id: ChapterId, i: number): Destination | null {
  return (isStoryChapter(id) ? STORY_DESTINATIONS[id]?.[i] : OBJECTIVE_DESTINATIONS[id][i]) ?? null;
}

export function alertDestination(alert: AdvisorAlert, state: GameState): Destination {
  // Food about to run out can't wait for a farm: buy some.
  if (alert.kind === "food" && alert.critical) return reachable(state, MARKET);
  return reachable(state, ALERTS[alert.kind]);
}
