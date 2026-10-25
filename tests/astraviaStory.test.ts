// Astravia's story, the Harvest Republic (ROADMAP step 6, G): its words
// hang together, a played game tells every beat in order, and the first
// choice decides which sixth beat comes.
import { beforeEach, describe, expect, it } from "vitest";
import { STORY_RULES, storyEnding } from "../src/application/chapters";
import { ASTRAVIA_CHAPTERS, ASTRAVIA_LETTERS } from "../src/domain/chapters/stories/astravia";
import { choiceDeed } from "../src/domain/chapters/chapterData";
import { getDecision } from "../src/domain/decisions/decisionRules";
import type { GameState } from "../src/domain/country/types";
import { STORY_DESTINATIONS } from "../src/presentation/navigation";
import { playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261025));

const words = (c: (typeof ASTRAVIA_CHAPTERS)[number]) => [c.title, c.briefing, ...c.objectives, ...Object.values(c.partyLines ?? {}), ...Object.values(c.ending ?? {})];

describe("Astravia's story, as written", () => {
  it("has rules, and somewhere to go, for every objective of every beat", () => {
    for (const c of ASTRAVIA_CHAPTERS) {
      expect(c.nation, c.id).toBe("astravia");
      expect(c.opens, c.id).toEqual([]);
      expect(STORY_RULES[c.id as `${string}:${string}`]?.checks, c.id).toHaveLength(c.objectives.length);
      expect(STORY_DESTINATIONS[c.id as `${string}:${string}`], c.id).toHaveLength(c.objectives.length);
    }
  });

  it("sends only letters that exist, marked as story, and ends only on answers they offer", () => {
    for (const c of ASTRAVIA_CHAPTERS) {
      if (c.letter) {
        const letter = getDecision(c.letter);
        expect(letter?.story, c.letter).toBe(true);
      }
      for (const deed of Object.keys(c.ending ?? {})) {
        const [letterId, optionId] = deed.split(":");
        expect(getDecision(letterId)?.options.some((o) => o.id === optionId), deed).toBe(true);
      }
    }
    for (const letter of ASTRAVIA_LETTERS) expect(ASTRAVIA_CHAPTERS.some((c) => c.letter === letter.id), letter.id).toBe(true);
  });

  it("is written in plain sentences, with no dashes", () => {
    for (const c of ASTRAVIA_CHAPTERS) for (const w of words(c)) expect(w, c.id).not.toMatch(/—|–/);
    for (const l of ASTRAVIA_LETTERS) for (const w of [l.title, l.prompt, ...l.options.map((o) => o.label)]) expect(w, l.id).not.toMatch(/—|–/);
  });
});

describe("Astravia's story, played", () => {
  let seen: string[] = [];
  const told = (s: GameState) => {
    for (const id of s.chapters.opened) if (id.startsWith("astravia:") && !seen.includes(id)) seen.push(id);
  };

  it("tells every beat in order over five years, one sixth beat or the other, and ends on what was chosen", () => {
    seen = [];
    const end = playCarefully("astravia", "astravia-harvest-union", { days: 5 * 360, mode: "long-reign", onDay: told });
    const order = ASTRAVIA_CHAPTERS.map((c) => c.id).filter((id) => seen.includes(id));
    expect(seen).toEqual(order);
    expect(seen.filter((id) => id === "astravia:new-farmers" || id === "astravia:thornwick-rises")).toHaveLength(1);
    expect(seen).toContain("astravia:founding-day");
    expect(storyEnding(end).length).toBeGreaterThan(0);
  }, 60000);

  it("brings the flood to West Marrow Coast when its briefing is read", () => {
    let flooded = false;
    playCarefully("astravia", "astravia-harvest-union", {
      days: 9 * 30,
      onDay: (s) => {
        if (s.provinces["province-2-west"]?.crisis?.kind === "flood") flooded = true;
      },
    });
    expect(flooded).toBe(true);
  }, 60000);

  it("raises Thornwick if the promise waited, and prospers it if kept", () => {
    const sixth = (deed: string) => {
      const rules = (id: string) => STORY_RULES[id as `${string}:${string}`];
      const s = { chapters: { deeds: [deed] } } as unknown as GameState;
      return { farmers: rules("astravia:new-farmers").opens(s, 40, true), rises: rules("astravia:thornwick-rises").opens(s, 40, true) };
    };
    expect(sixth(choiceDeed("astravia-petition", "keep"))).toEqual({ farmers: true, rises: false });
    expect(sixth(choiceDeed("astravia-petition", "wait"))).toEqual({ farmers: false, rises: true });
  });

  it("isn't told in another nation", () => {
    seen = [];
    playCarefully("veldoria", "veldoria-ironworkers-guild", { days: 2 * 360, onDay: told });
    expect(seen).toEqual([]);
  }, 60000);
});
