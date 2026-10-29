// The shape of a country and its game state. This is the aggregate root of the
// whole simulation: every other domain module reads from and writes pieces of it.
import type { Project } from "../construction/types";
import type { DecisionHistoryEntry } from "../decisions/types";
import type { ForeignGovernment } from "../diplomacy/types";
import type { MarketState } from "../market/types";
import type { Expedition } from "../expeditions/types";
import type { Difficulty } from "../difficulty/difficultyData";
import type { Ledger } from "../ledger/types";
import type { Ideology } from "../parties/types";
import type { ModifierEffects } from "../policy/modifiers";
import type { PlacedBuilding, ProvinceState } from "../provinces/types";
import type { ResearchCategory, ResearchOutcomeTier } from "../research/types";
import type { ResourceBundle } from "../resources/types";
import type { UnrestStage } from "../unrest/types";
import type { Demand } from "../uprising/types";
import type { ForeignVoyage, Settlement } from "../islands/types";
import type { Neighbour } from "../neighbours/types";
import type { TradeOffer } from "../neighbours/tradeRules";
import type { Workforce } from "../workforce/types";
import type { ChapterProgress } from "../chapters/chapterData";
import type { BurdenId, GameMode } from "../reign/reignData";
import type { Regiment } from "../military/types";
import type { FreeProvince } from "../military/battleRules";
import type { War } from "../military/warRules";
import type { Ultimatum } from "../military/threatRules";

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

// What an event is about, so the log can group repeats and point to the
// fix without reading its words.
export type EventTopic =
  | "paused" // the game stopped itself; `about` says for what
  | "hunger"
  | "cold"
  | "homes"
  | "money"
  | "unrest"
  | "provinceUnrest"
  | "uprising" // a province rising, being put down, or burning out (see domain/uprising)
  | "politics"
  | "elections"
  | "laws"
  | "research"
  | "decision"
  | "built"
  | "stall"
  | "breakdown"
  | "repaired"
  | "venture"
  | "army" // regiments fighting, a province taken back, a regiment lost (see domain/military)
  | "season" // the turn of a season: no longer logged, kept for older saves
  | "trade" // a neighbour's trade offer, standing in the Market
  | "world"
  | "chapter" // a chapter opening or completed (see domain/chapters)
  | "crisis"; // a flood, a worked-out seam... striking a province, or ending (see domain/crises)

// An effect a choice lays on the whole country, until a day.
export interface LastingEffect {
  why: string; // what it came from, in a few words
  effects: ModifierEffects;
  until: GameDate;
}

export interface GameEvent {
  id: string;
  date: GameDate;
  message: string;
  severity: EventSeverity;
  topic?: EventTopic; // absent on events from older saves
  about?: EventTopic; // for a pause: the danger that stopped the game
  tier?: ResearchOutcomeTier; // for a finished research: how it turned out
  minor?: boolean; // kept in the log, never popped up (a rival's campaign talk)
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
  difficulty: Difficulty; // chosen before the game starts; fixed after — see domain/difficulty
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
  researchPathsFinished: Record<string, GameDate>; // a research path's key: the day its capstone was finished (see researchRules.ts)
  pendingDemand: Demand | null; // a province's letter waiting for an answer (see domain/uprising/demandRules.ts)
  pendingCrisis: string | null; // the province whose crisis letter waits for an answer (see domain/crises)
  crisisQuietUntil: GameDate | null; // after a crisis ends, none strikes at random before this day
  lasting: LastingEffect[]; // effects a story's choices lay on the country for a while (see application/storyOutcome.ts)
  lostProvinceIds: string[]; // provinces that broke away after an uprising: no longer the country's (see domain/uprising)
  settlements: Settlement[]; // settler ships on their way to islands (see domain/islands)
  settledIslandIds: string[]; // islands settled: held and governed like provinces
  foreignVoyages: ForeignVoyage[]; // neighbours' settlers on their way to islands (see domain/islands)
  foreignIslands: Record<string, string>; // islands a neighbour has claimed: island id to nation id
  foreignIslandsSince: Record<string, GameDate>; // when each came to them, settled or taken (none in older saves: long held)
  neighbours: Record<string, Neighbour>; // every nation but the player's, run by the computer (see domain/neighbours)
  pendingOffer: TradeOffer | null; // a neighbour's trade offer standing in the Market until answered or lapsed (see domain/neighbours/tradeRules.ts)
  regiments: Regiment[]; // every country's regiments, on the map (see domain/military)
  wars: Record<string, War>; // neighbours you are at war with, by nation id (see domain/military/warRules.ts)
  ultimatum: Ultimatum | null; // a neighbour threatening war over an island of yours (see domain/military/threatRules.ts)
  sieges: Record<string, number>; // islands your regiments are besieging: days held so far (see battleRules.ts)
  freeProvinces: Record<string, FreeProvince>; // provinces that broke away, held by their rebels: province id to who lives there and how strong (see domain/military/battleRules.ts)
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
  chapters: ChapterProgress; // which systems are open yet, and the briefings (see domain/chapters)
  retriesUsed: number; // times this game went back to a checkpoint after a loss (see domain/difficulty)
  mode: GameMode; // Three Terms or the Long Reign, chosen at the start (see domain/reign)
  burdens: BurdenId[]; // what a Long Reign has piled up, one or two per election won
  burdenOffer: BurdenId[] | null; // after a Long Reign election win: the burdens to choose one from; the game waits
}
