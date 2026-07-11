// Three named save slots in localStorage instead of one silent autosave —
// picking "New Game" used to overwrite the only save with zero warning;
// slots make overwriting an explicit, chosen action instead. GameState is
// plain, JSON-serializable data (no Dates, no functions), so each slot is
// still a straight stringify/parse round trip — no migration logic beyond
// the one-time carry-over of a pre-slots save, below.
import type { GameDate, GameState } from "../../domain/country/types";

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
    return raw ? (JSON.parse(raw) as GameState) : null;
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
