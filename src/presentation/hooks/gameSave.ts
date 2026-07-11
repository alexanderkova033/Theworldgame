// Three named save slots in localStorage instead of one silent autosave —
// picking "New Game" used to overwrite the only save with zero warning;
// slots make overwriting an explicit, chosen action instead. GameState is
// plain, JSON-serializable data (no Dates, no functions), so each slot is
// still a straight stringify/parse round trip, plus hydrateGameState below
// filling in any fields an older save predates.
import type { CountryStats, GameDate, GameState } from "../../domain/country/types";
import { FACTIONS } from "../../domain/parties/factionData";
import type { Ideology } from "../../domain/parties/types";
import { emptyResourceBundle } from "../../domain/resources/resourceRules";

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
    armyStrength: stats?.armyStrength ?? 0,
    researchPoints: stats?.researchPoints ?? 0,
    popularity: stats?.popularity ?? 55,
  };
}

function hydrateGameState(raw: Partial<GameState>): GameState {
  const stats = hydrateStats(raw.stats);
  return {
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
    resources: raw.resources ?? emptyResourceBundle(),
    taxRate: raw.taxRate ?? 0.15,
    debt: raw.debt ?? 0,
    farmCount: raw.farmCount ?? 0,
    factoryCount: raw.factoryCount ?? 0,
    roadCount: raw.roadCount ?? 0,
    granaryCount: raw.granaryCount ?? 0,
    canneryCount: raw.canneryCount ?? 0,
    educationLevel: raw.educationLevel ?? 0,
    researchLevel: raw.researchLevel ?? 0,
    projects: raw.projects ?? [],
    placedBuildings: raw.placedBuildings ?? [],
    enactedLawIds: raw.enactedLawIds ?? [],
    enactedResearchIds: raw.enactedResearchIds ?? [],
    researchOutcomes: raw.researchOutcomes ?? {},
    resourceDemand: raw.resourceDemand ?? emptyResourceBundle(),
    // Pre-coalition saves have no per-faction breakdown — start every faction
    // exactly where the old flat popularity number already was, so resuming
    // doesn't jar the player with a sudden shift.
    factionApproval: raw.factionApproval ?? (Object.fromEntries(FACTIONS.map((f) => [f, stats.popularity])) as Record<Ideology, number>),
    expeditions: raw.expeditions ?? [],
    scoutedIslandIds: raw.scoutedIslandIds ?? [],
    events: raw.events ?? [],
    monthlyReports: raw.monthlyReports ?? [],
    history: raw.history ?? [],
    pendingDecisionId: raw.pendingDecisionId ?? null,
    decisionHistory: raw.decisionHistory ?? [],
    tutorialStep: raw.tutorialStep ?? null,
  };
}

export const SAVE_SLOT_COUNT = 3;

const SLOT_KEY_PREFIX = "theworldgame-save-v2-slot-";
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
