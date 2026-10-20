// Three named save slots in localStorage instead of one silent autosave —
// picking "New Game" used to overwrite the only save with zero warning;
// slots make overwriting an explicit, chosen action instead. GameState is
// plain, JSON-serializable data (no Dates, no functions), so each slot is
// still a straight stringify/parse round trip, plus hydrateGameState below
// filling in any fields an older save predates.
import type { CountryStats, GameDate, GameState } from "../../domain/country/types";
import { FACTIONS } from "../../domain/parties/factionData";
import type { Ideology } from "../../domain/parties/types";
import { getSeason } from "../../domain/country/calendar";
import { createForeignPolitics } from "../../domain/diplomacy/diplomacyRules";
import { createMarket } from "../../domain/market/marketRules";
import { buildStartingHomes, getHousingCapacityByProvince } from "../../domain/housing/housingRules";
import { getNation } from "../../domain/nations/nationRules";
import { createProvinceStates } from "../../domain/provinces/provincePopulation";
import { finishedResearchPaths, getResearchNode, getResearchNodeStatus } from "../../domain/research/researchRules";
import type { ResearchCategory } from "../../domain/research/types";
import { emptyLedger } from "../../domain/ledger/ledgerRules";
import { emptyResourceBundle } from "../../domain/resources/resourceRules";
import { getStageForStability } from "../../domain/unrest/unrestRules";
import { emptyWorkforce } from "../../domain/workforce/workforceRules";
import { allChaptersOpen } from "../../domain/chapters/chapterData";
import { createNeighbours } from "../../domain/neighbours/neighbourRules";
import { newFreeProvince } from "../../domain/military/battleRules";

// GameState has grown fields release over release (debt, researchOutcomes,
// resourceDemand, ...), and a save is just a blind JSON round-trip with no
// runtime validation — a save written before one of those fields existed
// loads back in simply missing that key, and the instant something touches
// it (e.g. `for (const id of enactedResearchIds)`), the whole app throws and
// the game appears to "crash" on continue. Every default below is exactly
// what startNewGame.ts would have set for a save that predates it, so an
// old save picks up right where a brand-new game would have started on
// whatever it's missing.
function hydrateStats(stats: Partial<CountryStats> | undefined): CountryStats {
  return {
    treasury: stats?.treasury ?? 3000,
    population: stats?.population ?? 10000,
    food: stats?.food ?? 8000,
    industry: stats?.industry ?? 0,
    stability: stats?.stability ?? 60,
    politicalPower: stats?.politicalPower ?? 25,
    popularity: stats?.popularity ?? 55,
  };
}

// Saves from when research was a timed vote carried one funded node in
// `activeResearch` — keep it going as that area's chosen direction.
function legacyResearchFocus(raw: Partial<GameState>): Record<ResearchCategory, string | null> {
  const focus: Record<ResearchCategory, string | null> = { industry: null, agriculture: null, administration: null, housing: null };
  const legacy = (raw as { activeResearch?: { nodeId: string } | null }).activeResearch;
  const node = legacy ? getResearchNode(legacy.nodeId) : undefined;
  if (node) focus[node.category] = node.id;
  return focus;
}

// Older saves predate some goods (coal) or the market itself — fill in any
// missing good at its normal, season-adjusted stock.
function hydrateMarket(raw: Partial<GameState>): GameState["market"] {
  const fresh = createMarket(getSeason(raw.date ?? { year: 1, month: 1, day: 1 }));
  if (!raw.market) return fresh;
  return {
    supply: { ...fresh.supply, ...raw.market.supply },
    outlook: { ...fresh.outlook, ...raw.market.outlook },
  };
}

export function hydrateGameState(raw: Partial<GameState>): GameState {
  const stats = hydrateStats(raw.stats);
  const state: GameState = {
    difficulty: raw.difficulty ?? "normal",
    nationId: raw.nationId!,
    partyId: raw.partyId!,
    electionsWon: raw.electionsWon ?? 0,
    date: raw.date ?? { year: 1, month: 1, day: 1 },
    isPaused: raw.isPaused ?? true,
    speed: raw.speed ?? 1,
    isGameOver: raw.isGameOver ?? false,
    outcome: raw.outcome ?? null,
    gameOverReason: raw.gameOverReason ?? null,
    stats,
    unrestStage: raw.unrestStage ?? getStageForStability(stats.stability),
    resources: { ...emptyResourceBundle(), ...raw.resources }, // saves from before coal get an empty coal store
    taxRate: raw.taxRate ?? 0.15,
    debt: raw.debt ?? 0,
    farmCount: raw.farmCount ?? 0,
    factoryCount: raw.factoryCount ?? 0,
    roadCount: raw.roadCount ?? 0,
    granaryCount: raw.granaryCount ?? 0,
    canneryCount: raw.canneryCount ?? 0,
    educationLevel: raw.educationLevel ?? 0,
    projects: raw.projects ?? [],
    placedBuildings: (raw.placedBuildings ?? []).some((b) => b.type === "housing")
      ? (raw.placedBuildings ?? [])
      : [...(raw.placedBuildings ?? []), ...buildStartingHomes(raw.nationId!, stats.population)],
    enactedLawIds: raw.enactedLawIds ?? [],
    enactedResearchIds: raw.enactedResearchIds ?? [],
    researchOutcomes: raw.researchOutcomes ?? {},
    activeLaw: raw.activeLaw ?? null,
    researchFocus: { ...legacyResearchFocus(raw), ...raw.researchFocus },
    researchProgress: raw.researchProgress ?? {},
    // Saves from before paths reopened: a path already finished counts from
    // today, so its area may take up another a year after loading.
    researchPathsFinished:
      raw.researchPathsFinished ??
      Object.fromEntries(finishedResearchPaths(raw.enactedResearchIds ?? []).map((key) => [key, raw.date ?? { year: 1, month: 1, day: 1 }])),
    workforce: raw.workforce ? { ...emptyWorkforce(), ...raw.workforce, scientists: { ...emptyWorkforce().scientists, ...raw.workforce.scientists } } : emptyWorkforce(),
    foreignPolitics: raw.foreignPolitics ?? createForeignPolitics(raw.nationId!),
    market: hydrateMarket(raw),
    // Pre-coalition saves have no per-faction breakdown — start every faction
    // exactly where the old flat popularity number already was, so resuming
    // doesn't jar the player with a sudden shift.
    factionApproval: raw.factionApproval ?? (Object.fromEntries(FACTIONS.map((f) => [f, stats.popularity])) as Record<Ideology, number>),
    expeditions: raw.expeditions ?? [],
    scoutedIslandIds: raw.scoutedIslandIds ?? [],
    events: raw.events ?? [],
    monthlyReports: raw.monthlyReports ?? [],
    history: raw.history ?? [],
    pendingLedger: raw.pendingLedger ?? emptyLedger(),
    lastDayLedger: raw.lastDayLedger ?? emptyLedger(),
    pendingDecisionId: raw.pendingDecisionId ?? null,
    pendingDemand: raw.pendingDemand ?? null,
    pendingOffer: raw.pendingOffer ?? null,
    regiments: raw.regiments ?? [],
    wars: raw.wars ?? {},
    sieges: raw.sieges ?? {},
    ultimatum: raw.ultimatum ?? null,
    // Older saves didn't remember who lived in a lost province: nobody, then.
    freeProvinces: raw.freeProvinces ?? Object.fromEntries((raw.lostProvinceIds ?? []).map((id: string) => [id, newFreeProvince(0)])),
    lostProvinceIds: raw.lostProvinceIds ?? [],
    settlements: raw.settlements ?? [],
    settledIslandIds: raw.settledIslandIds ?? [],
    foreignVoyages: raw.foreignVoyages ?? [],
    foreignIslands: raw.foreignIslands ?? {},
    foreignIslandsSince: raw.foreignIslandsSince ?? {},
    // Saves from before the neighbours ran their own countries: they start afresh.
    neighbours: raw.neighbours
      ? Object.fromEntries(Object.entries(raw.neighbours).map(([id, n]) => [id, { ...n, relations: n.relations ?? 0, accordUntil: n.accordUntil ?? null, truceUntil: n.truceUntil ?? null, feelings: n.feelings ?? [], stores: n.stores ?? { wood: 0, ore: 0, coal: 0 } }]))
      : createNeighbours(raw.nationId!),
    dangerPauses: raw.dangerPauses ?? [],
    decisionHistory: raw.decisionHistory ?? [],
    // Saves from before uprisings: no province has rioted for long, or risen.
    provinces: Object.fromEntries(
      Object.entries(raw.provinces ?? {}).map(([id, p]) => [
        id,
        {
          ...p,
          riotDays: p.riotDays ?? 0,
          uprising: p.uprising ? { ...p.uprising, lastTerms: p.uprising.lastTerms ?? null, fullSince: p.uprising.fullSince ?? null } : null,
          aggrievedUntil: p.aggrievedUntil ?? null,
          disputeUntil: p.disputeUntil ?? null,
          payRiseUntil: p.payRiseUntil ?? null,
          taxReliefUntil: p.taxReliefUntil ?? null,
        },
      ]),
    ),
    // Games saved before chapters existed keep every system open.
    chapters: raw.chapters ?? allChaptersOpen(),
    retriesUsed: raw.retriesUsed ?? 0,
    mode: raw.mode ?? "terms",
    burdens: raw.burdens ?? [],
    burdenOffer: raw.burdenOffer ?? null,
  };
  // Saves from before provinces had people: everyone lives where the homes are.
  if (!raw.provinces) {
    state.provinces = createProvinceStates(getNation(state.nationId).provinceIds, stats.population, getHousingCapacityByProvince(state), stats.stability);
  }
  // Saves from before the trees split into paths may be heading for a
  // technology that now sits further down another path: let that area
  // choose again rather than skip the path rule.
  const unfocused: GameState = { ...state, researchFocus: { industry: null, agriculture: null, administration: null, housing: null } };
  for (const [category, id] of Object.entries(state.researchFocus)) {
    const node = id ? getResearchNode(id) : undefined;
    if (id && (!node || getResearchNodeStatus(unfocused, node) !== "available")) state.researchFocus[category as ResearchCategory] = null;
  }
  return state;
}

export const SAVE_SLOT_COUNT = 3;

const SLOT_KEY_PREFIX = "theworldgame-save-v2-slot-";
// The game as it stood when its latest chapter opened, kept apart from the
// slot so a lost game can go back to it (see GameEndScreen).
const CHECKPOINT_KEY_PREFIX = "theworldgame-save-v2-checkpoint-";
const SLOT_NAMES_KEY = "theworldgame-slot-names-v1";
const LEGACY_SAVE_KEY = "theworldgame-save-v1"; // the old single-save key, pre-slots

export interface SavedGamePreview {
  nationId: string;
  partyId: string;
  date: GameDate;
}

export interface SaveSlotPreview {
  slotId: number;
  name: string;
  preview: SavedGamePreview | null;
}

function defaultSlotName(slotId: number): string {
  return `Save ${slotId + 1}`;
}

function loadSlotNames(): Record<number, string> {
  try {
    const raw = localStorage.getItem(SLOT_NAMES_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function persistSlotNames(names: Record<number, string>): void {
  try {
    localStorage.setItem(SLOT_NAMES_KEY, JSON.stringify(names));
  } catch {
    // Storage full/unavailable — best-effort, never a reason to interrupt play.
  }
}

// A save made before named slots existed gets carried into Slot 1 the first
// time slots are read, rather than silently orphaned — the whole point of
// this feature is to stop games from disappearing without warning.
function migrateLegacySave(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!legacy) return;
    if (!localStorage.getItem(SLOT_KEY_PREFIX + "0")) {
      localStorage.setItem(SLOT_KEY_PREFIX + "0", legacy);
    }
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    // Best-effort — if this fails, the legacy save is just left in place.
  }
}

export function loadSlot(slotId: number): GameState | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY_PREFIX + slotId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // nationId/partyId are the two fields that have existed since GameState's
    // very first shape — if either is missing, this isn't "an older save,"
    // it's not a save at all (corrupted data, a stray unrelated JSON blob
    // under this key, etc.), and hydrating the rest wouldn't produce a game
    // that makes sense to play.
    if (!parsed.nationId || !parsed.partyId) return null;
    return hydrateGameState(parsed);
  } catch {
    return null;
  }
}

export function persistSlot(slotId: number, state: GameState): void {
  try {
    localStorage.setItem(SLOT_KEY_PREFIX + slotId, JSON.stringify(state));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — best-effort.
  }
}

export function clearSlot(slotId: number): void {
  try {
    localStorage.removeItem(SLOT_KEY_PREFIX + slotId);
  } catch {
    // Nothing to do if storage isn't available.
  }
}

export function renameSlot(slotId: number, name: string): void {
  const names = loadSlotNames();
  names[slotId] = name.trim().slice(0, 24) || defaultSlotName(slotId);
  persistSlotNames(names);
}

export function getSlotPreviews(): SaveSlotPreview[] {
  migrateLegacySave();
  const names = loadSlotNames();
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, slotId) => {
    const saved = loadSlot(slotId);
    return {
      slotId,
      name: names[slotId] ?? defaultSlotName(slotId),
      preview: saved ? { nationId: saved.nationId, partyId: saved.partyId, date: saved.date } : null,
    };
  });
}

export function persistCheckpoint(slotId: number, state: GameState): void {
  try {
    localStorage.setItem(CHECKPOINT_KEY_PREFIX + slotId, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: no checkpoint, never a reason to interrupt play.
  }
}

export function loadCheckpoint(slotId: number): GameState | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY_PREFIX + slotId);
    return raw ? hydrateGameState(JSON.parse(raw) as Partial<GameState>) : null;
  } catch {
    return null;
  }
}

export function clearCheckpoint(slotId: number): void {
  try {
    localStorage.removeItem(CHECKPOINT_KEY_PREFIX + slotId);
  } catch {
    // Nothing to clear.
  }
}
