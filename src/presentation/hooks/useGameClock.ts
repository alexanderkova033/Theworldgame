// Drives the day-by-day simulation loop. This is the only place that owns a
// setInterval — it calls the simulateDay use case once per tick, and exposes
// pause/resume/speed controls plus a generic way to dispatch player actions.
//
// `state` starts out `null`: there's no game to simulate until the player has
// chosen a nation on the start screen and called `startGame`.
import { useCallback, useEffect, useRef, useState } from "react";
import { simulateDay } from "../../application/simulateDay";
import { startNewGame } from "../../application/startNewGame";
import type { GameDate, GameSpeed, GameState } from "../../domain/country/types";
import { clearSave, loadSave, persistSave } from "./gameSave";

// Real milliseconds per in-game day at 1x speed. Higher speeds divide this,
// so 5x means a day passes 5 times faster.
const BASE_TICK_MS = 1000;

// How long to wait after the last state change before writing to
// localStorage — coalesces the burst of ticks at high game speed into one
// write instead of up to 5/sec.
const AUTOSAVE_DEBOUNCE_MS = 400;

export interface SavedGamePreview {
  nationId: string;
  partyId: string;
  date: GameDate;
}

export function useGameClock() {
  const [state, setState] = useState<GameState | null>(null);

  // Peeked once at mount, purely so the Start Screen can offer "Continue" —
  // this never re-reads after that, so it doesn't flicker once autosaving
  // (from this same session) starts overwriting the save underneath it.
  const [savedGame] = useState<SavedGamePreview | null>(() => {
    const saved = loadSave();
    return saved ? { nationId: saved.nationId, partyId: saved.partyId, date: saved.date } : null;
  });

  useEffect(() => {
    if (!state || state.isPaused || state.isGameOver) return;

    const intervalMs = BASE_TICK_MS / state.speed;
    const id = setInterval(() => {
      setState((prev) => (prev ? simulateDay(prev) : prev));
    }, intervalMs);

    return () => clearInterval(id);
  }, [state?.isPaused, state?.isGameOver, state?.speed]);

  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state) return;
    if (state.isGameOver) {
      clearSave();
      return;
    }
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    autosaveTimeout.current = setTimeout(() => persistSave(state), AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [state]);

  const startGame = useCallback((nationId: string, partyId: string) => {
    setState(startNewGame(nationId, partyId));
  }, []);

  const continueGame = useCallback(() => {
    const saved = loadSave();
    if (saved) setState(saved);
  }, []);

  // Back to the Start Screen with a clean slate — used from the Game Over
  // screen, and available any time a fresh start beats continuing.
  const resetGame = useCallback(() => {
    clearSave();
    setState(null);
  }, []);

  const pause = useCallback(() => setState((s) => (s ? { ...s, isPaused: true } : s)), []);
  const resume = useCallback(() => setState((s) => (s ? { ...s, isPaused: false } : s)), []);
  const setSpeed = useCallback((speed: GameSpeed) => setState((s) => (s ? { ...s, speed } : s)), []);

  // Lets components trigger a player action (e.g. buildFarm) without knowing
  // about React state directly.
  const dispatch = useCallback((action: (state: GameState) => GameState) => {
    setState((prev) => (prev ? action(prev) : prev));
  }, []);

  return { state, savedGame, startGame, continueGame, resetGame, pause, resume, setSpeed, dispatch };
}
