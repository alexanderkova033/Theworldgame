// Caldenreich's story, the Chancellor's Kingdom (ROADMAP step 6, H): its
// words hang together, a played game tells every beat in order, and the
// heir backed decides which coronation comes.
import { beforeEach, describe, expect, it } from "vitest";
import { STORY_RULES, storyEnding } from "../src/application/chapters";
import { choiceDeed } from "../src/domain/chapters/chapterData";
import { CALDENREICH_CHAPTERS, CALDENREICH_LETTERS } from "../src/domain/chapters/stories/caldenreich";
import type { GameState } from "../src/domain/country/types";
import { getDecision } from "../src/domain/decisions/decisionRules";
import { STORY_DESTINATIONS } from "../src/presentation/navigation";
import { playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261025));

type Id = `${string}:${string}`;
const words = (c: (typeof CALDENREICH_CHAPTERS)[number]) => [c.title, c.briefing, ...c.objectives, ...Object.values(c.partyLines ?? {}), ...Object.values(c.ending ?? {})];

describe("Caldenreich's story, as written", () => {
  it("has rules, and somewhere to go, for every objective of every beat", () => {
    for (const c of CALDENREICH_CHAPTERS) {
      expect(c.nation, c.id).toBe("caldenreich");
      expect(c.opens, c.id).toEqual([]);
      expect(STORY_RULES[c.id as Id]?.checks, c.id).toHaveLength(c.objectives.length);
      expect(STORY_DESTINATIONS[c.id as Id], c.id).toHaveLength(c.objectives.length);
    }
  });

  it("sends only letters that exist, marked as story, and ends only on answers they offer", () => {
    for (const c of CALDENREICH_CHAPTERS) {
      if (c.letter) expect(getDecision(c.letter)?.story, c.letter).toBe(true);
      for (const deed of Object.keys(c.ending ?? {})) {
        const [letterId, optionId] = deed.split(":");
        expect(getDecision(letterId)?.options.some((o) => o.id === optionId), deed).toBe(true);
      }
    }
    for (const letter of CALDENREICH_LETTERS) expect(CALDENREICH_CHAPTERS.some((c) => c.letter === letter.id), letter.id).toBe(true);
  });

  it("is written in plain sentences, with no dashes", () => {
    for (const c of CALDENREICH_CHAPTERS) for (const w of words(c)) expect(w, c.id).not.toMatch(/—|–/);
    for (const l of CALDENREICH_LETTERS) for (const w of [l.title, l.prompt, ...l.options.map((o) => o.label)]) expect(w, l.id).not.toMatch(/—|–/);
  });
});

describe("Caldenreich's story, played", () => {
  it("tells every beat in order over five years, one coronation or the other, and ends on what was chosen", () => {
    const seen: string[] = [];
    let seam = false;
    const end = playCarefully("caldenreich", "caldenreich-crown-loyalists", {
      days: 5 * 360,
      mode: "long-reign",
      onDay: (s) => {
        for (const id of s.chapters.opened) if (id.startsWith("caldenreich:") && !seen.includes(id)) seen.push(id);
        if (s.provinces["province-6-west"]?.crisis?.kind === "seam" || (s.provinces["province-6-west"]?.seamYield ?? 1) < 1) seam = true;
      },
    });
    expect(seen).toEqual(CALDENREICH_CHAPTERS.map((c) => c.id).filter((id) => seen.includes(id)));
    expect(seen.filter((id) => id === "caldenreich:konrad" || id === "caldenreich:elisabet")).toHaveLength(1);
    expect(seam).toBe(true);
    expect(storyEnding(end).length).toBeGreaterThan(0);
  }, 60000);

  it("crowns whom the government backed", () => {
    const opens = (id: string, deed: string) => STORY_RULES[id as Id].opens({ chapters: { deeds: [deed] } } as unknown as GameState, 47, true);
    expect(opens("caldenreich:konrad", choiceDeed("caldenreich-heir", "konrad"))).toBe(true);
    expect(opens("caldenreich:elisabet", choiceDeed("caldenreich-heir", "konrad"))).toBe(false);
    expect(opens("caldenreich:elisabet", choiceDeed("caldenreich-heir", "elisabet"))).toBe(true);
  });
});
