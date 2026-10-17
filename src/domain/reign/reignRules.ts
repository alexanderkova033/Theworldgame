import { LONG_REIGN_BURDENS_OFFERED, LONG_REIGN_FORCED_FROM_WIN } from "../constants";
import { MONTHS_PER_YEAR } from "../constants";
import type { GameDate } from "../country/types";
import { getDifficulty, type Difficulty } from "../difficulty/difficultyData";
import { combineEffects, describeEffects, type ModifierEffects } from "../policy/modifiers";
import { BURDENS, type Burden, type BurdenId, type GameMode } from "./reignData";


export function isLongReign(state: { mode?: GameMode }): boolean {
  return state.mode === "long-reign";
}

export function getBurden(id: BurdenId): Burden {
  return BURDENS.find((b) => b.id === id)!;
}

// Burdens to draw from: those not yet carried while any are left, then
// any again (they stack).
function drawBurdens(held: BurdenId[], count: number, exclude: BurdenId[] = []): BurdenId[] {
  const drawn: BurdenId[] = [];
  for (let i = 0; i < count; i++) {
    const taken = [...exclude, ...drawn];
    const fresh = BURDENS.filter((b) => !held.includes(b.id) && !taken.includes(b.id));
    const pool = fresh.length > 0 ? fresh : BURDENS.filter((b) => !taken.includes(b.id));
    drawn.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  return drawn;
}

// What winning the nth election brings: a choice of burdens to take one
// from, and from the third win on one more, drawn by chance.
export function burdensForWin(held: BurdenId[], electionsWon: number): { offer: BurdenId[]; forced: BurdenId[] } {
  const forced = electionsWon >= LONG_REIGN_FORCED_FROM_WIN ? drawBurdens(held, 1) : [];
  const offer = drawBurdens([...held, ...forced], LONG_REIGN_BURDENS_OFFERED, forced);
  return { offer, forced };
}

// Everything the burdens carried do to the country's rules, as one set of
// effects (see getModifiers).
export function getBurdenEffects(burdens: BurdenId[] | undefined): ModifierEffects {
  return combineEffects((burdens ?? []).map((id) => getBurden(id).effects));
}

export function getBurdenExpectations(burdens: BurdenId[] | undefined): number {
  return (burdens ?? []).reduce((total, id) => total + (getBurden(id).expectations ?? 0), 0);
}

export function getBurdenRallyFactor(burdens: BurdenId[] | undefined): number {
  return (burdens ?? []).reduce((total, id) => total * (getBurden(id).rallies ?? 1), 1);
}

export function getBurdenRivalSwing(burdens: BurdenId[] | undefined): number {
  return (burdens ?? []).reduce((total, id) => total * (getBurden(id).rivalSwing ?? 1), 1);
}

// What a burden does, in the same plain lines as a law's costs.
export function describeBurden(burden: Burden): string[] {
  const lines = describeEffects(burden.effects).costs.map((line) => line.text);
  if (burden.expectations) lines.push(`Support drifts ${Math.abs(burden.expectations)} points lower`);
  if (burden.rivalSwing) lines.push(`The rival's campaigns hit ${Math.round((burden.rivalSwing - 1) * 100)}% harder`);
  if (burden.rallies) lines.push(`Rallies and courting lift support ${Math.round((1 - burden.rallies) * 100)}% less`);
  return lines;
}

// What voters ask of you, as a push on support: the difficulty level's,
// and in a Long Reign, its weary voters too.
export function getVoterExpectations(state: { difficulty?: Difficulty; burdens?: BurdenId[] }): number {
  return getDifficulty(state.difficulty).expectations + getBurdenExpectations(state.burdens);
}

// Whole months in power: a game starts on the first day of Year 1.
export function getReignMonths(date: GameDate): number {
  return (date.year - 1) * MONTHS_PER_YEAR + (date.month - 1);
}
