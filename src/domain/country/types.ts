// The shape of a country and its game state. This is the aggregate root of the
// whole simulation: every other domain module reads from and writes pieces of it.
import type { Project } from "../construction/types";
import type { DecisionHistoryEntry } from "../decisions/types";
import type { Expedition } from "../expeditions/types";
import type { Ideology } from "../parties/types";
import type { PlacedBuilding } from "../provinces/types";
import type { ResearchOutcomeTier } from "../research/types";
import type { ResourceBundle } from "../resources/types";
import type { StandingOrder } from "../trade/standingOrderTypes";

export interface GameDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-30 (simplified calendar, see domain/country/calendar.ts)
}

export type GameSpeed = 1 | 2 | 3 | 5;

export interface CountryStats {
  treasury: number;
  population: number;
  food: number;
  industry: number;
  stability: number; // 0-100
  armyStrength: number;
  researchPoints: number;
  popularity: number; // 0-100
}

export type EventSeverity = "info" | "warning" | "danger";

// How the game ended, for GameState.outcome — null while still playing.
// "collapsed": stability hit zero (a coup/breakdown, not an election).
// "voted-out": lost a general election to the rival party.
// "victory": won enough elections in a row to cement outright rule.
export type GameOutcome = "collapsed" | "voted-out" | "victory";

export interface GameEvent {
  id: string;
  date: GameDate;
  message: string;
  severity: EventSeverity;
}

export interface DailyDelta {
  date: GameDate;
  income: number;
  expenses: number;
  populationChange: number;
  stabilityChange: number;
}

export interface MonthlyReport {
  id: string;
  date: GameDate; // the first day of the new month, when the report was generated
  totalIncome: number;
  totalExpenses: number;
  netTreasuryChange: number;
  populationChange: number;
  stabilityChange: number;
}

export interface GameState {
  nationId: string; // chosen at the start screen; fixed for the rest of the game
  partyId: string; // chosen right after the nation, on the same screen flow — see PartySelectScreen
  electionsWon: number; // consecutive wins by construction: a single loss ends the game (see simulateDay.ts)
  date: GameDate;
  isPaused: boolean;
  speed: GameSpeed;
  isGameOver: boolean;
  outcome: GameOutcome | null;
  gameOverReason: string | null;
  stats: CountryStats;
  resources: ResourceBundle; // wood/ore/grain/fish, produced by terrain, spent on building or traded
  taxRate: number; // 0..1
  debt: number; // outstanding loan balance, compounds daily — see domain/loans/loanRules.ts

  // Infrastructure counts. Each is owned conceptually by its matching domain
  // module (farmCount -> domain/food, factoryCount -> domain/industry, etc.)
  // but lives here on the aggregate since it's part of "what the country has".
  farmCount: number;
  factoryCount: number;
  roadCount: number;
  granaryCount: number; // research-gated — see domain/research; turns Grain into Food
  canneryCount: number; // research-gated — see domain/research; turns Fish into Food
  educationLevel: number;

  projects: Project[];
  placedBuildings: PlacedBuilding[]; // completed buildings, for the map
  enactedLawIds: string[]; // permanent policy choices, one per category — see domain/laws
  enactedResearchIds: string[]; // permanent tech choices, one per category — see domain/research
  researchOutcomes: Record<string, ResearchOutcomeTier>; // rolled once per enacted node — see researchRules.ts
  resourceDemand: ResourceBundle; // dynamic-market demand index per resource, drifts toward 0 — see domain/resources/tradeRules.ts
  factionApproval: Record<Ideology, number>; // per-ideology approval (0-100); stats.popularity is their electorate-weighted average — see domain/parties/factionRules.ts
  standingOrders: StandingOrder[]; // automated daily trades, capped at MAX_STANDING_ORDERS — see application/actions/standingOrders.ts
  expeditions: Expedition[]; // in-progress scouting trips to unclaimed islands
  scoutedIslandIds: string[]; // islands a completed expedition has already visited
  events: GameEvent[];
  monthlyReports: MonthlyReport[];
  history: DailyDelta[]; // daily deltas since the last monthly report

  pendingDecisionId: string | null; // a decision popup waiting on the player — see domain/decisions
  decisionHistory: DecisionHistoryEntry[];

  // The first-run spotlight tour's current step; null once finished/skipped
  // (or for any save from before this field existed — see TutorialOverlay).
  tutorialStep: number | null;
}
