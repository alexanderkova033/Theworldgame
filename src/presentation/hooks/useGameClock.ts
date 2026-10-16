// Drives the day-by-day simulation loop. This is the only place that owns a
// setInterval — it calls the playDay use case (simulateDay, then a pause if
// a danger appeared for the first time this season) once per tick, and exposes
// pause/resume/speed controls plus a generic way to dispatch player actions.
//
// `state` starts out `null`: there's no game to simulate until the player has
// chosen a save slot, nation, and party on the start screen and called
// `startGame`.
import { useCallback, useEffect, useRef, useState } from "react";
import { playDay } from "../../application/playDay";
import { startNewGame } from "../../application/startNewGame";
import type { GameSpeed, GameState } from "../../domain/country/types";
import type { Difficulty } from "../../domain/difficulty/difficultyData";
import { clearCheckpoint, clearSlot, getSlotPreviews, loadCheckpoint, loadSlot, persistCheckpoint, persistSlot, renameSlot as renameSlotStorage, type SaveSlotPreview } from "./gameSave";

export type { SavedGamePreview, SaveSlotPreview } from "./gameSave";

// Real milliseconds per in-game day at 1x speed. Higher speeds divide this,
// so 5x means a day passes 5 times faster: a year takes 18 minutes at 1x,
// 3.6 at 5x.
const BASE_TICK_MS = 3000;

// How long to wait after the last state change before writing to
// localStorage — coalesces the burst of ticks at high game speed into one
// write instead of up to 5/sec.
const AUTOSAVE_DEBOUNCE_MS = 400;

export function useGameClock() {
  const [state, setState] = useState<GameState | null>(null);

  // Which of the 3 slots the current game reads from/writes to — null while
  // no game is running. Autosave only fires once this is set, so simply
  // having a save slot occupied never gets touched until the player
  // explicitly continues or overwrites it (see StartScreen).
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);

  const [saveSlots, setSaveSlots] = useState<SaveSlotPreview[]>(() => getSlotPreviews());
  const refreshSlots = useCallback(() => setSaveSlots(getSlotPreviews()), []);

  useEffect(() => {
    if (!state || state.isPaused || state.isGameOver) return;

    const intervalMs = BASE_TICK_MS / state.speed;
    const id = setInterval(() => {
      setState((prev) => (prev ? playDay(prev) : prev));
    }, intervalMs);

    return () => clearInterval(id);
  }, [state?.isPaused, state?.isGameOver, state?.speed]);

  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state || activeSlotId === null) return;
    if (state.isGameOver) {
      clearSlot(activeSlotId);
      refreshSlots();
      return;
    }
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    autosaveTimeout.current = setTimeout(() => {
      persistSlot(activeSlotId, state);
      refreshSlots();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [state, activeSlotId, refreshSlots]);

  // A checkpoint each time a chapter opens: the game as that chapter began.
  const checkpointChapters = useRef(0);
  useEffect(() => {
    if (!state || activeSlotId === null || state.isGameOver) return;
    if (state.chapters.opened.length <= checkpointChapters.current) return;
    checkpointChapters.current = state.chapters.opened.length;
    persistCheckpoint(activeSlotId, state);
  }, [state, activeSlotId]);

  const startGame = useCallback((nationId: string, partyId: string, slotId: number, difficulty: Difficulty = "normal") => {
    checkpointChapters.current = 0;
    setActiveSlotId(slotId);
    setState(startNewGame(nationId, partyId, difficulty));
  }, []);

  const continueGame = useCallback((slotId: number) => {
    const saved = loadSlot(slotId);
    if (saved) {
      checkpointChapters.current = saved.chapters.opened.length;
      setState(saved);
      setActiveSlotId(slotId);
    }
  }, []);

  // Back to the Start Screen with a clean slate — used from the Game Over
  // screen, and available any time a fresh start beats continuing. Doesn't
  // touch the slot's saved data; only starting a new game into that same
  // slot (an explicit, labeled choice — see StartScreen) overwrites it.
  const resetGame = useCallback(() => {
    setState(null);
    setActiveSlotId(null);
  }, []);

  const deleteSlot = useCallback(
    (slotId: number) => {
      clearSlot(slotId);
      clearCheckpoint(slotId);
      refreshSlots();
    },
    [refreshSlots],
  );

  const renameSlot = useCallback(
    (slotId: number, name: string) => {
      renameSlotStorage(slotId, name);
      refreshSlots();
    },
    [refreshSlots],
  );

  // After a loss: the last checkpoint, if there is one, and back to it. The
  // count of retries goes up and carries over; whether any are left is the
  // difficulty's call (see domain/difficulty).
  const peekCheckpoint = useCallback(() => (activeSlotId === null ? null : loadCheckpoint(activeSlotId)), [activeSlotId]);
  const retryFromCheckpoint = useCallback(() => {
    if (activeSlotId === null || !state) return;
    const checkpoint = loadCheckpoint(activeSlotId);
    if (!checkpoint) return;
    checkpointChapters.current = checkpoint.chapters.opened.length;
    setState({ ...checkpoint, retriesUsed: state.retriesUsed + 1, isPaused: true });
  }, [activeSlotId, state]);

  const pause = useCallback(() => setState((s) => (s ? { ...s, isPaused: true } : s)), []);
  const resume = useCallback(() => setState((s) => (s ? { ...s, isPaused: false } : s)), []);
  const setSpeed = useCallback((speed: GameSpeed) => setState((s) => (s ? { ...s, speed } : s)), []);

  // Lets components trigger a player action (e.g. buildFarm) without knowing
  // about React state directly.
  const dispatch = useCallback((action: (state: GameState) => GameState) => {
    setState((prev) => (prev ? action(prev) : prev));
  }, []);

  return {
    state,
    saveSlots,
    startGame,
    continueGame,
    resetGame,
    deleteSlot,
    renameSlot,
    pause,
    resume,
    setSpeed,
    dispatch,
    peekCheckpoint,
    retryFromCheckpoint,
  };
}
