// The shape rules both trees (Laws and Research) share: which nodes a choice
// closes off, and why. A node is closed off for good when
//   - another node in its branch's same tier has been chosen (one per tier),
//   - a node that excludes it (or that it excludes) has been chosen, in
//     either tree, or
//   - every node that leads to it is itself closed off: its path is gone.
// Ids are unique across both trees (each starts with its branch), so one
// set of chosen ids covers everything.
import { LAW_NODES } from "../laws/lawData";
import type { Ideology } from "../parties/types";
import { RESEARCH_NODES } from "../research/researchData";
import type { PolicyLinks } from "./modifiers";

interface LinkedNode extends PolicyLinks {
  id: string;
  name: string;
  category: string;
  tier: number;
}

const ALL_NODES: LinkedNode[] = [...LAW_NODES, ...RESEARCH_NODES];
const BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]));

// Lockouts work both ways, whichever side wrote them down.
const EXCLUSIONS = new Map<string, Set<string>>();
for (const node of ALL_NODES) {
  for (const other of node.excludes ?? []) {
    if (!EXCLUSIONS.has(node.id)) EXCLUSIONS.set(node.id, new Set());
    if (!EXCLUSIONS.has(other)) EXCLUSIONS.set(other, new Set());
    EXCLUSIONS.get(node.id)!.add(other);
    EXCLUSIONS.get(other)!.add(node.id);
  }
}

export function getPolicyNode(id: string): LinkedNode | undefined {
  return BY_ID.get(id);
}

// The parents a node needs one of. Older data without explicit parents
// falls back to "anything one tier up in the same branch".
export function getParents(node: LinkedNode): string[] {
  if (node.requires) return node.requires;
  if (node.tier <= 1) return [];
  return ALL_NODES.filter((n) => n.category === node.category && n.tier === node.tier - 1).map((n) => n.id);
}

// What closed this node off, if anything: the chosen node that took its
// place, or (for a lost path) the first parent that was closed.
export function closedBy(id: string, chosen: ReadonlySet<string>): { by: string; reason: "sibling" | "excluded" | "path" } | null {
  if (chosen.has(id)) return null;
  const node = BY_ID.get(id);
  if (!node) return null;
  const sibling = ALL_NODES.find((n) => n.category === node.category && n.tier === node.tier && n.id !== id && chosen.has(n.id));
  if (sibling) return { by: sibling.id, reason: "sibling" };
  const excluder = [...(EXCLUSIONS.get(id) ?? [])].find((other) => chosen.has(other));
  if (excluder) return { by: excluder, reason: "excluded" };
  const parents = getParents(node);
  if (parents.length > 0 && parents.every((p) => isClosedOff(p, chosen))) return { by: parents[0], reason: "path" };
  return null;
}

export function isClosedOff(id: string, chosen: ReadonlySet<string>): boolean {
  return closedBy(id, chosen) !== null;
}

export function hasParentDone(node: LinkedNode, chosen: ReadonlySet<string>): boolean {
  const parents = getParents(node);
  return parents.length === 0 || parents.some((p) => chosen.has(p));
}

// Everything that choosing this node would close off for good, in both
// trees: what's open (or merely locked) now and wouldn't be afterwards.
export function getLockouts(id: string, chosen: ReadonlySet<string>): LinkedNode[] {
  const after = new Set(chosen).add(id);
  return ALL_NODES.filter((n) => n.id !== id && !chosen.has(n.id) && !isClosedOff(n.id, chosen) && isClosedOff(n.id, after));
}

// A node tied to one ideology is only open to a party of that ideology.
export function isOpenToParty(node: PolicyLinks, ideology: Ideology): boolean {
  return !node.ideology || node.ideology === ideology;
}

export function chosenIds(state: { enactedLawIds: string[]; enactedResearchIds: string[] }): Set<string> {
  return new Set([...state.enactedLawIds, ...state.enactedResearchIds]);
}
