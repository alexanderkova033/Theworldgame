// The shape of the Laws and Research trees, which the game's rules and the
// tree layout both rely on: one shared root per branch, then three paths
// that never cross, each forking in two at rows 4 and 5.
import { describe, expect, it } from "vitest";
import { LAW_NODES, LAW_PATHS } from "../src/domain/laws/lawData";
import { combineEffects, type TreePath } from "../src/domain/policy/modifiers";
import { closedBy, getLockouts } from "../src/domain/policy/treeRules";
import { RESEARCH_NODES, RESEARCH_PATHS } from "../src/domain/research/researchData";

const ALL = [...LAW_NODES, ...RESEARCH_NODES];
const BY_ID = new Map(ALL.map((n) => [n.id, n]));

const TREES: Array<[string, typeof ALL, TreePath[]]> = [
  ["laws", LAW_NODES, LAW_PATHS],
  ["research", RESEARCH_NODES, RESEARCH_PATHS],
];

describe.each(TREES)("the %s tree", (_name, nodes, paths) => {
  const categories = [...new Set(nodes.map((n) => n.category))];

  it.each(categories)("%s has one shared root and three paths", (category) => {
    const roots = nodes.filter((n) => n.category === category && n.tier === 1);
    expect(roots).toHaveLength(1);
    expect(roots[0].path).toBeUndefined();
    expect(paths.filter((p) => p.category === category)).toHaveLength(3);
  });

  it.each(paths.map((p) => [p.key]))("%s has one node per row, two on the forked rows", (key) => {
    const perRow = [2, 3, 4, 5, 6, 7].map((tier) => nodes.filter((n) => n.path === key && n.tier === tier && !n.ideology).length);
    expect(perRow).toEqual([1, 1, 2, 2, 1, 1]);
  });

  it("links every node to a parent one row up, in its own lane", () => {
    for (const node of nodes) {
      if (node.tier === 1) continue;
      expect(node.requires?.length, node.id).toBeGreaterThan(0);
      for (const id of node.requires ?? []) {
        const parent = BY_ID.get(id);
        expect(parent, `${node.id} needs ${id}`).toBeDefined();
        expect(parent!.tier, node.id).toBe(node.tier - 1);
        expect(parent!.category, node.id).toBe(node.category);
        if (parent!.path) expect(parent!.path, node.id).toBe(node.path);
      }
    }
  });
});

describe("both trees", () => {
  it("never reuse an id", () => {
    expect(BY_ID.size).toBe(ALL.length);
  });

  it("only lock out nodes in other branches (a branch's own paths already close each other)", () => {
    for (const node of ALL) {
      for (const id of node.excludes ?? []) {
        const other = BY_ID.get(id);
        expect(other, `${node.id} excludes ${id}`).toBeDefined();
        expect(other!.category, node.id).not.toBe(node.category);
      }
    }
  });

  it("never put an em dash in front of the player", () => {
    for (const node of ALL) expect(`${node.name} ${node.description}`, node.id).not.toContain("—");
    for (const path of [...LAW_PATHS, ...RESEARCH_PATHS]) expect(`${path.name} ${path.motto}`, path.key).not.toContain("—");
  });
});

describe("choosing a path", () => {
  it("closes the branch's other two paths for good", () => {
    const chosen = new Set(["labor-labour-exchange", "labor-factory-act"]);
    const others = LAW_NODES.filter((n) => n.category === "labor" && n.path && n.path !== "labor-welfare");
    expect(others.length).toBeGreaterThan(0);
    for (const node of others) expect(closedBy(node.id, chosen), node.id).not.toBeNull();
    expect(getLockouts("labor-factory-act", new Set(["labor-labour-exchange"])).length).toBeGreaterThanOrEqual(16);
  });
});

describe("combineEffects", () => {
  it("multiplies scale effects and adds flat ones", () => {
    const combined = combineEffects([
      { industryMultiplier: 1.1, supportTarget: 2, treasuryDelta: -500 },
      { industryMultiplier: 1.2, supportTarget: -3, treasuryDelta: 200 },
    ]);
    expect(combined.industryMultiplier).toBeCloseTo(1.32);
    expect(combined.supportTarget).toBe(-1);
    expect(combined.treasuryDelta).toBe(-300);
  });
});
