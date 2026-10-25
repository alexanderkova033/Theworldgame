// Veldoria's story, Smoke and Iron (ROADMAP step 6, I): its
// words hang together, a played game tells every beat in order, and the
// hours decide which sixth beat comes.
import { beforeEach, describe, expect, it } from "vitest";
import { STORY_RULES, storyEnding } from "../src/application/chapters";
import { choiceDeed } from "../src/domain/chapters/chapterData";
import { VELDORIA_CHAPTERS, VELDORIA_LETTERS } from "../src/domain/chapters/stories/veldoria";
import type { GameState } from "../src/domain/country/types";
import { getDecision } from "../src/domain/decisions/decisionRules";
import { STORY_DESTINATIONS } from "../src/presentation/navigation";
import { playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261025));

type Id = `${string}:${string}`;
const words = (c: (typeof VELDORIA_CHAPTERS)[number]) => [c.title, c.briefing, ...c.objectives, ...Object.values(c.partyLines ?? {}), ...Object.values(c.ending ?? {})];

describe("Veldoria's story, as written", () => {
  it("has rules, and somewhere to go, for every objective of every beat", () => {
    for (const c of VELDORIA_CHAPTERS) {
      expect(c.nation, c.id).toBe("veldoria");
      expect(c.opens, c.id).toEqual([]);
      expect(STORY_RULES[c.id as Id]?.checks, c.id).toHaveLength(c.objectives.length);
      expect(STORY_DESTINATIONS[c.id as Id], c.id).toHaveLength(c.objectives.length);
    }
  });

  it("sends only letters that exist, marked as story, and ends only on answers they offer", () => {
    for (const c of VELDORIA_CHAPTERS) {
      if (c.letter) expect(getDecision(c.letter)?.story, c.letter).toBe(true);
      for (const deed of Object.keys(c.ending ?? {})) {
        const [letterId, optionId] = deed.split(":");
        expect(getDecision(letterId)?.options.some((o) => o.id === optionId), deed).toBe(true);
      }
    }
    for (const letter of VELDORIA_LETTERS) expect(VELDORIA_CHAPTERS.some((c) => c.letter === letter.id), letter.id).toBe(true);
  });

  it("is written in plain sentences, with no dashes", () => {
    for (const c of VELDORIA_CHAPTERS) for (const w of words(c)) expect(w, c.id).not.toMatch(/—|–/);
    for (const l of VELDORIA_LETTERS) for (const w of [l.title, l.prompt, ...l.options.map((o) => o.label)]) expect(w, l.id).not.toMatch(/—|–/);
  });
});

describe("Veldoria's story, played", () => {
  it("tells every beat in order over five years, one sixth beat or the other, and ends on what was chosen", () => {
    const seen: string[] = [];
    let fever = false;
    const end = playCarefully("veldoria", "veldoria-ironworkers-guild", {
      days: 5 * 360,
      mode: "long-reign",
      onDay: (s) => {
        for (const id of s.chapters.opened) if (id.startsWith("veldoria:") && !seen.includes(id)) seen.push(id);
        if (s.provinces["province-1-north"]?.crisis?.kind === "fever") fever = true;
      },
    });
    expect(seen).toEqual(VELDORIA_CHAPTERS.map((c) => c.id).filter((id) => seen.includes(id)));
    expect(seen.filter((id) => id === "veldoria:congress" || id === "veldoria:strike")).toHaveLength(1);
    expect(fever).toBe(true);
    expect(storyEnding(end).length).toBeGreaterThan(0);
  }, 60000);

  it("brings the congress if the hours were won, and the strike if not", () => {
    const opens = (id: string, deed: string) => STORY_RULES[id as Id].opens({ chapters: { deeds: [deed] } } as unknown as GameState, 47, true);
    expect(opens("veldoria:congress", choiceDeed("veldoria-whistle", "ten"))).toBe(true);
    expect(opens("veldoria:strike", choiceDeed("veldoria-whistle", "ten"))).toBe(false);
    expect(opens("veldoria:strike", choiceDeed("veldoria-whistle", "foundries"))).toBe(true);
  });
});
