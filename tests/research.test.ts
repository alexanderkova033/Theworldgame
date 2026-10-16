// Research carries on by itself only when there's no choice to make.
import { describe, expect, it } from "vitest";
import { completeResearch } from "../src/application/actions/researchActions";
import { startNewGame } from "../src/application/startNewGame";
import { RESEARCH_PATHS } from "../src/domain/research/researchData";
import { getResearchNode } from "../src/domain/research/researchRules";
import { pathRoute } from "./support/carefulPlayer";

const path = RESEARCH_PATHS[0];
const [root, second, third, fork] = pathRoute("research", path.key);
const area = getResearchNode(root)!.category;
const start = startNewGame("astravia", "astravia-harvest-union");

describe("research moving on", () => {
  it("waits for the player after a branch's root, where three paths open", () => {
    const after = completeResearch(start, root);
    expect(after.researchFocus[area]).toBeNull();
    expect(after.events[0].message).toMatch(/Pick the next direction/);
  });

  it("carries on along the path when only one step follows", () => {
    const after = completeResearch(completeResearch(start, root), second);
    expect(after.researchFocus[area]).toBe(third);
    expect(after.events[0].message).toContain(`Work moves on to ${getResearchNode(third)!.name}.`);
  });

  it("waits for the player at a fork", () => {
    const before = [root, second].reduce(completeResearch, start);
    const after = completeResearch(before, third);
    expect(getResearchNode(fork)!.tier).toBe(4);
    expect(after.researchFocus[area]).toBeNull();
  });
});
