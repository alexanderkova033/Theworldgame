// Drives the day-by-day simulation loop. This is the only place that owns a
// setInterval — it calls the simulateDay use case once per tick, and exposes
// pause/resume/speed controls plus a generic way to dispatch player actions.
//
// `state` starts out `null`: there's no game to simulate until the player has
// chosen a nation on the start screen and called `startGame`.
import { useCallback, useEffect, useState } from "react";
import { simulateDay } from "../../application/simulateDay";
import { startNewGame } from "../../application/startNewGame";
import type { GameSpeed, GameState } from "../../domain/country/types";

// Real milliseconds per in-game day at 1x speed. Higher speeds divide this,
// so 5x means a day passes 5 times faster.
const BASE_TICK_MS = 1000;

export function useGameClock() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!state || state.isPaused) return;

    const intervalMs = BASE_TICK_MS / state.speed;
    const id = setInterval(() => {
      setState((prev) => (prev ? simulateDay(prev) : prev));
    }, intervalMs);

    return () => clearInterval(id);
  }, [state?.isPaused, state?.speed]);

  const startGame = useCallback((nationId: string) => {
    setState(startNewGame(nationId));
  }, []);

  const pause = useCallback(() => setState((s) => (s ? { ...s, isPaused: true } : s)), []);
  const resume = useCallback(() => setState((s) => (s ? { ...s, isPaused: false } : s)), []);
  const setSpeed = useCallback((speed: GameSpeed) => setState((s) => (s ? { ...s, speed } : s)), []);

  // Lets components trigger a player action (e.g. buildFarm) without knowing
  // about React state directly.
  const dispatch = useCallback((action: (state: GameState) => GameState) => {
    setState((prev) => (prev ? action(prev) : prev));
  }, []);

  return { state, startGame, pause, resume, setSpeed, dispatch };
}
