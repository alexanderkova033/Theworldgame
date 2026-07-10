// The shape of a country and its game state. This is the aggregate root of the
// whole simulation: every other domain module reads from and writes pieces of it.
import type { Project } from "../construction/types";
import type { Expedition } from "../expeditions/types";
import type { PlacedBuilding } from "../provinces/types";
import type { ResourceBundle } from "../resources/types";

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

  // Infrastructure counts. Each is owned conceptually by its matching domain
  // module (farmCount -> domain/food, factoryCount -> domain/industry, etc.)
  // but lives here on the aggregate since it's part of "what the country has".
  farmCount: number;
  factoryCount: number;
  roadCount: number;
  educationLevel: number;
  researchLevel: number;

  projects: Project[];
  placedBuildings: PlacedBuilding[]; // completed buildings, for the map
  enactedLawIds: string[]; // permanent policy choices, one per category — see domain/laws
  expeditions: Expedition[]; // in-progress scouting trips to unclaimed islands
  scoutedIslandIds: string[]; // islands a completed expedition has already visited
  events: GameEvent[];
  monthlyReports: MonthlyReport[];
  history: DailyDelta[]; // daily deltas since the last monthly report
}
