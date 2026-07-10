// Autosave to localStorage. GameState is plain, JSON-serializable data (no
// Dates, no functions), so this is a straight stringify/parse round trip —
// no migration logic, since the game has no shipped saves to stay
// compatible with yet.
import type { GameState } from "../../domain/country/types";

const SAVE_KEY = "theworldgame-save-v1";

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export function persistSave(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — saving is
    // best-effort, never a reason to interrupt play.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to do if storage isn't available.
  }
}
