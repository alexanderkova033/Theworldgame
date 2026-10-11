// The shape of a country and its game state. This is the aggregate root of the
// whole simulation: every other domain module reads from and writes pieces of it.
import type { Project } from "../construction/types";
import type { DecisionHistoryEntry } from "../decisions/types";
import type { ForeignGovernment } from "../diplomacy/types";
import type { MarketState } from "../market/types";
import type { Expedition } from "../expeditions/types";
import type { Ledger } from "../ledger/types";
import type { Ideology } from "../parties/types";
import type { PlacedBuilding, ProvinceState } from "../provinces/types";
import type { ResearchCategory, ResearchOutcomeTier } from "../research/types";
import type { ResourceBundle } from "../resources/types";
import type { UnrestStage } from "../unrest/types";
import type { Workforce } from "../workforce/types";

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
  politicalPower: number; // accrues daily, spent to put Laws to a vote — see politicsRules.ts
  popularity: number; // 0-100
}

export type EventSeverity = "info" | "warning" | "danger";

// How the game ended, for GameState.outcome — null while still playing.
// "collapsed": stability hit zero (a coup/breakdown, not an election).
// "voted-out": lost a general election to the rival party.
// "victory": won enough elections in a row to cement outright rule.
export type GameOutcome = "collapsed" | "voted-out" | "victory";

// A Law that has already passed its vote but hasn't taken effect yet —
// still being drafted into force. Only one at a time (GameState.activeLaw);
// see application/advancePolicies.ts for the daily tick.
export interface PolicyInProgress {
  nodeId: string;
  totalDays: number;
  daysRemaining: number;
}

export interface GameEvent {
  id: string;
  date: GameDate;
  message: string;
  severity: EventSeverity;
}

export interface DailyDelta {
  date: GameDate;
  income: number;
  populationChange: number;
  stabilityChange: number;
  ledger?: Ledger; // what moved each number that day, and why — absent on days from older saves
}

export interface MonthlyReport {
  id: string;
  date: GameDate; // the first day of the new month, when the report was generated
  totalIncome: number;
  populationChange: number;
  stabilityChange: number;
  ledger?: Ledger; // the month's causes, summed from each day's ledger — absent on reports from older saves
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
  unrestStage: UnrestStage; // how far falling stability has escalated — see domain/unrest
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
  provinces: Record<string, ProvinceState>; // the player's provinces as places people live; their populations sum to stats.population — see domain/provinces
  enactedLawIds: string[]; // permanent policy choices, one per category — see domain/laws
  enactedResearchIds: string[]; // permanent tech choices, one per category — see domain/research
  researchOutcomes: Record<string, ResearchOutcomeTier>; // rolled once per enacted node — see researchRules.ts
  activeLaw: PolicyInProgress | null; // a passed law still being drafted into force — see domain/laws
  researchFocus: Record<ResearchCategory, string | null>; // the node each research area is working toward — see domain/research
  researchProgress: Record<string, number>; // work put into each node so far; kept if you switch direction and come back
  workforce: Workforce; // salaried scientists and police — see domain/workforce
  foreignPolitics: Record<string, ForeignGovernment>; // every nation but the player's — see domain/diplomacy
  market: MarketState; // the continental market's stock of every good — see domain/market
  factionApproval: Record<Ideology, number>; // per-ideology approval (0-100); stats.popularity is their electorate-weighted average — see domain/parties/factionRules.ts
  expeditions: Expedition[]; // in-progress scouting trips to unclaimed islands
  scoutedIslandIds: string[]; // islands a completed expedition has already visited
  events: GameEvent[];
  monthlyReports: MonthlyReport[];
  history: DailyDelta[]; // daily deltas since the last monthly report
  pendingLedger: Ledger; // what player actions changed since the last tick — folded into the next day's DailyDelta
  lastDayLedger: Ledger; // everything that moved the numbers in the last day (tick, actions, monthly rolls) — for the top bar's "why" popovers

  pendingDecisionId: string | null; // a decision popup waiting on the player — see domain/decisions
  dangerPauses: string[]; // "season:danger" keys already paused for this season — see application/playDay.ts
  decisionHistory: DecisionHistoryEntry[];
}
