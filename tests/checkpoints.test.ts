// Checkpoints: kept apart from the save slot, so a lost game can go back
// to its last chapter; the count of retries travels with the game.
import { beforeEach, describe, expect, it } from "vitest";
import { startNewGame } from "../src/application/startNewGame";
import { DIFFICULTY_SETTINGS } from "../src/domain/difficulty/difficultyData";
import { clearCheckpoint, clearSlot, hydrateGameState, loadCheckpoint, persistCheckpoint, persistSlot } from "../src/presentation/hooks/gameSave";

// The tests run without a browser: a stand-in for its storage.
beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

describe("checkpoints", () => {
  const game = startNewGame("astravia", "astravia-harvest-union", "hard");

  it("come back as they were saved", () => {
    persistCheckpoint(0, game);
    expect(loadCheckpoint(0)).toEqual(JSON.parse(JSON.stringify(game)));
  });

  it("outlive the slot being cleared when a game ends, but not a deleted slot", () => {
    persistSlot(0, game);
    persistCheckpoint(0, game);
    clearSlot(0);
    expect(loadCheckpoint(0)).not.toBeNull();
    clearCheckpoint(0);
    expect(loadCheckpoint(0)).toBeNull();
  });

  it("start every game with no retries used, old saves included", () => {
    expect(game.retriesUsed).toBe(0);
    const { retriesUsed: _used, ...old } = game;
    expect(hydrateGameState(JSON.parse(JSON.stringify(old))).retriesUsed).toBe(0);
  });

  it("are rationed harder the harder the level, with none on Ruthless", () => {
    const allowed = ["easy", "normal", "hard", "ruthless"].map((d) => DIFFICULTY_SETTINGS[d as keyof typeof DIFFICULTY_SETTINGS].retries);
    expect(allowed).toEqual([...allowed].sort((a, b) => b - a));
    expect(DIFFICULTY_SETTINGS.ruthless.retries).toBe(0);
  });
});
