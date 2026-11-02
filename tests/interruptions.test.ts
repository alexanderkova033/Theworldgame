// How letters arrive: the window they displace comes back, a story chapter's
// briefing and letter are one stop, and several chapters wait their turn.
// (What the letters say and do is tested with each campaign.)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveDecision } from "../src/application/actions/resolveDecision";
import { advanceChapters, joinedLetter, lettersBehind, readAndAnswer, readBriefing, sendStoryLetter, stopsBehind } from "../src/application/chapters";
import { startNewGame } from "../src/application/startNewGame";
import { STORY_CHAPTERS, type ChapterId } from "../src/domain/chapters/chapterData";
import type { GameState } from "../src/domain/country/types";
import { getDecision } from "../src/domain/decisions/decisionRules";
import { BurdenLetter } from "../src/presentation/components/BurdenLetter";
import { ChapterBriefing } from "../src/presentation/components/ChapterBriefing";
import { CrisisLetter } from "../src/presentation/components/CrisisLetter";
import { DecisionModal } from "../src/presentation/components/DecisionModal";
import { DemandLetter } from "../src/presentation/components/DemandLetter";
import { UltimatumLetter } from "../src/presentation/components/UltimatumLetter";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { isLetterWaiting } from "../src/presentation/hooks/useGameClock";
import { chooseWindow, giveWindowBack, holdWindowBack, NO_WINDOW } from "../src/presentation/windowHold";
import { NATIONS, playCarefully, type ScriptedStop } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const SEEDS = [20261015, 1, 2, 3, 4];
const SIX_MONTHS = 180;

beforeEach(() => seedRandom(20261015));

const NATION_OF = (id: string) => NATIONS.find(([nation]) => id.startsWith(`${nation}:`))!;

// A game with this chapter's briefing, and nothing else, waiting.
function waiting(id: ChapterId, extra: Partial<GameState> = {}, unread: ChapterId[] = [id]): GameState {
  const [nation, party] = NATION_OF(id);
  const s = startNewGame(nation, party, "normal");
  return { ...s, ...extra, chapters: { ...s.chapters, opened: [...s.chapters.opened, ...unread], unread } };
}

const LETTERED = STORY_CHAPTERS.filter((c) => c.letter);
const PROMISE = "astravia:promise";
const LEAN_YEAR = "astravia:lean-year";
const LETTER = "astravia-petition";

// A state as data, with the running id counter taken out of it.
const plain = (s: GameState) => JSON.parse(JSON.stringify(s).replace(/"(event|decision|building)-\d+"/g, '"id"')) as unknown;

function oldSave(raw: GameState): GameState {
  // A save from before story letters queued: no `letters` on its chapters.
  const { letters: _letters, ...chapters } = raw.chapters;
  return hydrateGameState(JSON.parse(JSON.stringify({ ...raw, chapters })) as Partial<GameState>);
}

const page = (state: GameState) => renderToStaticMarkup(createElement(ChapterBriefing, { state, onRead: () => {}, onAnswer: () => {} }));
const inHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("the window a letter displaces", () => {
  it("comes back once the letters are dealt with", () => {
    const held = holdWindowBack(chooseWindow("laws"));
    expect(held).toEqual({ open: "laws", heldBack: true });
    expect(giveWindowBack(held)).toEqual({ open: "laws", heldBack: false });
  });

  it("stays held through a run of letters, however many arrive", () => {
    const held = holdWindowBack(holdWindowBack(holdWindowBack(chooseWindow("money"))));
    expect(held.open).toBe("money");
    expect(giveWindowBack(held)).toEqual({ open: "money", heldBack: false });
  });

  it("gives way to a choice made while a letter is up", () => {
    const held = holdWindowBack(chooseWindow("laws"));
    expect(chooseWindow("build")).toEqual({ open: "build", heldBack: false });
    // Chosen, then the next letter arrives: the choice is what comes back.
    expect(giveWindowBack(holdWindowBack(chooseWindow("build")))).toEqual({ open: "build", heldBack: false });
    // Closing what was chosen means nothing comes back at all.
    expect(giveWindowBack(chooseWindow(null))).toEqual(NO_WINDOW);
    expect(held.open).toBe("laws");
  });

  it("is nothing when no window was open, as on loading a save with briefings waiting", () => {
    expect(giveWindowBack(holdWindowBack(NO_WINDOW))).toEqual(NO_WINDOW);
    expect(holdWindowBack(NO_WINDOW)).toBe(NO_WINDOW);
  });
});

describe("a story letter queued for tomorrow", () => {
  it("doesn't count as a letter waiting, so the held window comes back as the last one closes", () => {
    const s = waiting(PROMISE, {}, []);
    const queued = { ...s, chapters: { ...s.chapters, letters: [LETTER] } };
    expect(isLetterWaiting(queued)).toBe(false);
    expect(isLetterWaiting({ ...queued, pendingDecisionId: "press-interview" })).toBe(true);
    expect(isLetterWaiting({ ...s, burdenOffer: ["dear-markets"] })).toBe(true);
  });
});

describe("a story chapter's briefing and letter", () => {
  it("come as one stop, for every story letter there is", () => {
    expect(LETTERED.length).toBeGreaterThan(0);
    for (const chapter of LETTERED) {
      expect(chapter.crisis, chapter.id).toBeUndefined();
      expect(joinedLetter(waiting(chapter.id), chapter.id), chapter.id).toBe(chapter.letter);
    }
  });

  it("do exactly what reading and then answering did, for every answer", () => {
    for (const chapter of LETTERED) {
      for (const option of getDecision(chapter.letter!)!.options) {
        const start = waiting(chapter.id);
        seedRandom(99);
        const oneStep = readAndAnswer(start, chapter.id, option.id);
        seedRandom(99);
        const twoSteps = resolveDecision(readBriefing(start, chapter.id), chapter.letter!, option.id);
        expect(plain(oneStep), `${chapter.id} ${option.id}`).toEqual(plain(twoSteps));
        expect(oneStep.chapters.unread, chapter.id).toEqual([]);
        expect(oneStep.pendingDecisionId, chapter.id).toBeNull();
      }
    }
  });

  it("open the next chapter on the same day as before", () => {
    const start = waiting(PROMISE);
    const option = getDecision(LETTER)!.options[0].id;
    seedRandom(5);
    const oneStep = advanceChapters(readAndAnswer(start, PROMISE, option));
    seedRandom(5);
    const twoSteps = advanceChapters(resolveDecision(readBriefing(start, PROMISE), LETTER, option));
    expect(oneStep.chapters.opened).toEqual(twoSteps.chapters.opened);
  });

  it("stay two stops whenever something would have come between them", () => {
    expect(joinedLetter(waiting(PROMISE, { pendingDecisionId: "press-interview" }), PROMISE)).toBeNull();
    expect(joinedLetter(waiting(PROMISE, { burdenOffer: ["dear-markets"] }), PROMISE)).toBeNull();
    expect(joinedLetter(waiting(PROMISE, {}, [PROMISE, LEAN_YEAR]), PROMISE)).toBeNull();

    // Behind another letter, this one still queues for a later day.
    const busy = readAndAnswer(waiting(PROMISE, { pendingDecisionId: "press-interview" }), PROMISE, "any");
    expect(busy.chapters.letters).toEqual([LETTER]);
    expect(busy.pendingDecisionId).toBe("press-interview");
  });

  it("is shown whole on one page that cannot be closed unanswered", () => {
    const state = waiting(PROMISE);
    const html = page(state);
    const letter = getDecision(LETTER)!;
    const chapter = STORY_CHAPTERS.find((c) => c.id === PROMISE)!;
    expect(html.includes(inHtml(chapter.briefing))).toBe(true);
    expect(html.includes(inHtml(letter.title))).toBe(true);
    expect(html.includes(inHtml(letter.prompt))).toBe(true);
    for (const option of letter.options) expect(html.includes(inHtml(option.label))).toBe(true);
    for (const objective of chapter.objectives) expect(html.includes(inHtml(objective))).toBe(true);
    expect(html.includes('aria-label="Close"')).toBe(false);
    expect(html.includes("To work")).toBe(false);
  });

  it("keeps a chapter with no letter as it was, closable", () => {
    const html = page(waiting("astravia:flood"));
    expect(html.includes('aria-label="Close"')).toBe(true);
    expect(html.includes("To work")).toBe(true);
  });
});

describe("several chapters at once", () => {
  it("show one at a time and say how many more wait", () => {
    const two = waiting("astravia:flood", {}, ["astravia:flood", "exchange"]);
    const first = page(two);
    expect(first.includes("1 more waiting")).toBe(true);
    expect(first.includes(inHtml(STORY_CHAPTERS.find((c) => c.id === LEAN_YEAR)!.briefing))).toBe(false);
    expect(page({ ...two, chapters: { ...two.chapters, unread: ["exchange"] } }).includes("more waiting")).toBe(false);
  });

  it("count the letters to come as well, and come down one by one", () => {
    const two = waiting(PROMISE, {}, [PROMISE, LEAN_YEAR]);
    expect(stopsBehind(two, PROMISE)).toBe(3); // the other briefing, and both letters
    const read = readBriefing(two, PROMISE);
    expect(stopsBehind(read, LEAN_YEAR)).toBe(2); // this one's letter, and the first's
    const both = readBriefing(read, LEAN_YEAR);
    expect(both.pendingDecisionId).toBe(LETTER);
    expect(both.chapters.letters).toHaveLength(1);
    expect(stopsBehind(waiting(PROMISE), PROMISE)).toBe(0);
    // A letter that will come on its briefing's page is no extra stop.
    expect(stopsBehind(waiting(PROMISE, {}, ["exchange", PROMISE]), "exchange")).toBe(1);
  });

  it("the last of them joins its letter, as it did not have to wait", () => {
    const two = waiting(PROMISE, {}, ["exchange", PROMISE]);
    const read = readBriefing(two, "exchange");
    expect(joinedLetter(read, PROMISE)).toBe(LETTER);
  });
});

describe("the sign on a letter", () => {
  const sign = (element: Parameters<typeof renderToStaticMarkup>[0]) => /(\d+) more waiting/.exec(renderToStaticMarkup(element))?.[1] ?? null;
  const start = () => waiting(PROMISE, {}, []);
  const decision = (state: GameState) => createElement(DecisionModal, { state, onResolve: () => {}, onDismiss: () => {} });
  const burden = (state: GameState) => createElement(BurdenLetter, { state, onTake: () => {} });
  const ultimatum = (state: GameState) => createElement(UltimatumLetter, { state, onPay: () => {}, onStandFirm: () => {} });
  const demand = (state: GameState) => createElement(DemandLetter, { state, onAnswer: () => {} });
  const crisis = (state: GameState) => createElement(CrisisLetter, { state, onAnswer: () => {} });

  it("isn't shown when nothing is behind the letter on screen", () => {
    const s = start();
    expect(lettersBehind({ ...s, pendingDecisionId: "press-interview" })).toBe(0);
    expect(sign(decision({ ...s, pendingDecisionId: "press-interview" }))).toBeNull();
    expect(sign(burden({ ...s, burdenOffer: ["dear-markets"] }))).toBeNull();
  });

  it("counts the story letters queued behind a decision", () => {
    const s = start();
    const queued = { ...s, pendingDecisionId: "press-interview", chapters: { ...s.chapters, letters: [LETTER] } };
    expect(lettersBehind(queued)).toBe(1);
    expect(sign(decision(queued))).toBe("1");
  });

  it("shows on a burden with a decision behind it", () => {
    const s = start();
    expect(sign(burden({ ...s, burdenOffer: ["dear-markets"], pendingDecisionId: "press-interview" }))).toBe("1");
  });

  it("shows on an ultimatum, a demand and a crisis", () => {
    const s = start();
    const id = Object.keys(s.provinces)[0];
    const threat = { nationId: "veldoria", islandId: "island-2", warOn: { year: 2, month: 1, day: 1 }, answered: false };
    const asks = { kind: "payRise" as const, provinceId: id };
    const flooded = { ...s.provinces, [id]: { ...s.provinces[id], crisis: { kind: "flood" as const, since: s.date, until: s.date, homesLost: 0 } } };
    const queue = { ...s.chapters, letters: [LETTER] };
    expect(sign(ultimatum({ ...s, ultimatum: threat, chapters: queue }))).toBe("1");
    expect(sign(demand({ ...s, pendingDemand: asks, chapters: queue }))).toBe("1");
    expect(sign(crisis({ ...s, provinces: flooded, pendingCrisis: id, chapters: queue } as GameState))).toBe("1");
    expect(sign(demand({ ...s, pendingDemand: asks, ultimatum: threat }))).toBe("1");
  });
});

describe("an old save with briefings waiting", () => {
  const saved = (unread: ChapterId[]) => oldSave(waiting(unread[0], {}, unread));

  it("loads, and its story briefing and letter are one stop", () => {
    const loaded = saved([PROMISE]);
    expect(loaded.chapters.letters).toEqual([]);
    expect(joinedLetter(loaded, PROMISE)).toBe(LETTER);
    const answered = readAndAnswer(loaded, PROMISE, getDecision(LETTER)!.options[0].id);
    expect(answered.chapters.unread).toEqual([]);
    expect(answered.pendingDecisionId).toBeNull();
    expect(page(loaded).includes(inHtml(getDecision(LETTER)!.prompt))).toBe(true);
  });

  it("with several waiting, shows them one at a time and loses no letter", () => {
    const loaded = saved([PROMISE, LEAN_YEAR]);
    expect(page(loaded).includes("3 more waiting")).toBe(true);
    let s = readBriefing(readBriefing(loaded, PROMISE), LEAN_YEAR);
    expect(s.pendingDecisionId).toBe(LETTER);
    s = resolveDecision(s, LETTER, getDecision(LETTER)!.options[0].id);
    expect(sendStoryLetter(s).pendingDecisionId).toBe(STORY_CHAPTERS.find((c) => c.id === LEAN_YEAR)!.letter);
  });

  it("saved between a briefing and its letter, still has that letter to answer", () => {
    const loaded = oldSave(readBriefing(waiting(PROMISE), PROMISE));
    expect(loaded.chapters.unread).toEqual([]);
    expect(loaded.pendingDecisionId).toBe(LETTER);
  });

  it("opens no window when the briefings are done, there being none to give back", () => {
    let windows = NO_WINDOW;
    windows = holdWindowBack(windows); // the effect that runs as the save loads
    windows = giveWindowBack(windows); // and as the last briefing is read
    expect(windows).toEqual(NO_WINDOW);
  });
});

// Item 4 of plans/tasks/03-fewer-interruptions.md. The script plays the same
// game either way: this only counts differently how its stops arrive. Before,
// a joined briefing and its letter were two stops.
describe("stops in a careful game's first six months on Normal", () => {
  it("are fewer, by one for each story letter joined to its briefing", () => {
    const rows: string[] = [];
    let saved = 0;
    for (const [nation, party] of NATIONS) {
      const counts = SEEDS.map((seed) => {
        seedRandom(seed);
        const stops: ScriptedStop[] = [];
        playCarefully(nation, party, { days: SIX_MONTHS, difficulty: "normal", onStop: (stop) => stops.push(stop) });
        const joined = stops.filter((s) => s === "joined").length;
        expect(stops.filter((s) => s === "decision").length).toBeGreaterThanOrEqual(joined);
        return { before: stops.length, after: stops.length - joined, stops };
      });
      saved += counts.reduce((sum, c) => sum + c.before - c.after, 0);
      const list = (key: "before" | "after") => counts.map((c) => c[key]).join(" ");
      const tally = counts[0].stops.reduce<Record<string, number>>((all, s) => ({ ...all, [s]: (all[s] ?? 0) + 1 }), {});
      rows.push(`${nation}: before ${list("before")}, after ${list("after")} (first seed: ${JSON.stringify(tally)})`);
    }
    console.log(`Stops by seed (${SEEDS.join(" ")}):\n${rows.join("\n")}`);
    expect(saved).toBeGreaterThan(0);
  });
});
