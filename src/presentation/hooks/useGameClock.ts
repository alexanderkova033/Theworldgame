// Drives the day-by-day simulation loop. This is the only place that owns a
// setInterval — it calls the simulateDay use case once per tick, and exposes
// pause/resume/speed controls plus a generic way to dispatch player actions.
import { useCallback, useEffect, useState } from "react";
import { simulateDay } from "../../application/simulateDay";
import { startNewGame } from "../../application/startNewGame";
import type { GameSpeed, GameState } from "../../domain/country/types";

// Real milliseconds per in-game day at 1x speed. Higher speeds divide this,
// so 5x means a day passes 5 times faster.
const BASE_TICK_MS = 1000;

export function useGameClock() {
  const [state, setState] = useState<GameState>(() => startNewGame());

  useEffect(() => {
    if (state.isPaused) return;

    const intervalMs = BASE_TICK_MS / state.speed;
    const id = setInterval(() => {
      setState((prev) => simulateDay(prev));
    }, intervalMs);

    return () => clearInterval(id);
  }, [state.isPaused, state.speed]);

  const pause = useCallback(() => setState((s) => ({ ...s, isPaused: true })), []);
  const resume = useCallback(() => setState((s) => ({ ...s, isPaused: false })), []);
  const setSpeed = useCallback((speed: GameSpeed) => setState((s) => ({ ...s, speed })), []);

  // Lets components trigger a player action (e.g. buildFarm) without knowing
  // about React state directly.
  const dispatch = useCallback((action: (state: GameState) => GameState) => {
    setState((prev) => action(prev));
  }, []);

  return { state, pause, resume, setSpeed, dispatch };
}
