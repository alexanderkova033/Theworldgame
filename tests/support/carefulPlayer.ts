// A careful player, for the balance tests: borrows once, keeps people fed,
// housed and warm, repairs what breaks, pays the loan back, rallies when
// support slips toward the line to win and takes whichever option of a decision keeps support up.
// Optionally it also follows one path of the Laws or Research tree.
import { buildFarm } from "../../src/application/actions/buildFarm";
import { buildHousing } from "../../src/application/actions/buildHousing";
import { enactLaw } from "../../src/application/actions/enactLaw";
import { canRepayLoan, repayLoan, takeLoan } from "../../src/application/actions/loanActions";
import { buyGood, canBuyGood, canSellGood, sellGood } from "../../src/application/actions/marketActions";
import { canHoldRally, holdRally } from "../../src/application/actions/politicalActions";
import { repairBuilding } from "../../src/application/actions/repairBuilding";
import { focusResearch } from "../../src/application/actions/researchActions";
import { resolveDecision } from "../../src/application/actions/resolveDecision";
import { setTaxRate } from "../../src/application/actions/setTaxRate";
import { canHireScientist, hireScientist } from "../../src/application/actions/workforceActions";
import { getDailyProductionSummary } from "../../src/application/getDailyProductionSummary";
import { simulateDay } from "../../src/application/simulateDay";
import { startNewGame } from "../../src/application/startNewGame";
import type { GameState } from "../../src/domain/country/types";
import { getDecision } from "../../src/domain/decisions/decisionRules";
import { LAW_NODES } from "../../src/domain/laws/lawData";
import { canEnactLaw, getLawNode } from "../../src/domain/laws/lawsRules";
import { getNation } from "../../src/domain/nations/nationRules";
import { getElectionThreshold } from "../../src/domain/parties/electionRules";
import { RESEARCH_NODES } from "../../src/domain/research/researchData";
import { getResearchNodeStatus } from "../../src/domain/research/researchRules";
import type { ResearchCategory } from "../../src/domain/research/types";

export const NATIONS: Array<[nation: string, party: string]> = [
  ["astravia", "astravia-harvest-union"],
  ["caldenreich", "caldenreich-crown-loyalists"],
  ["veldoria", "veldoria-ironworkers-guild"],
];

type Good = "wood" | "ore" | "coal" | "grain" | "fish";

function ensure(s: GameState, good: Good, amount: number): GameState {
  while (s.resources[good] < amount && canBuyGood(s, good)) s = buyGood(s, good);
  return s;
}

function tryBuild(s: GameState, action: typeof buildFarm): GameState {
  for (const provinceId of getNation(s.nationId).provinceIds) {
    const stocked = ensure(s, "wood", 12);
    const built = action(stocked, provinceId);
    if (built !== stocked) return built;
  }
  return s;
}

// One way down a path: its root, the path itself (first branch of the
// fork) and its own capstone.
export function pathRoute(tree: "law" | "research", pathKey: string): string[] {
  const nodes: Array<{ id: string; category: string; tier: number; path?: string; requires?: string[]; ideology?: string }> =
    tree === "law" ? LAW_NODES : RESEARCH_NODES;
  const category = nodes.find((n) => n.path === pathKey)!.category;
  const at = (tier: number) => nodes.filter((n) => n.path === pathKey && n.tier === tier && !n.ideology);
  const fork = at(4)[0];
  return [
    nodes.find((n) => n.category === category && n.tier === 1)!.id,
    at(2)[0].id,
    at(3)[0].id,
    fork.id,
    at(5).find((n) => n.requires?.includes(fork.id))!.id,
    at(6)[0].id,
    at(7)[0].id,
  ];
}

export interface PlayOptions {
  days: number;
  follow?: { tree: "law" | "research"; pathKey: string };
  onDay?: (state: GameState) => void; // sees the country after every simulated day
}

export function playCarefully(nation: string, party: string, { days, follow, onDay }: PlayOptions): GameState {
  let s = setTaxRate(takeLoan(startNewGame(nation, party)), 0.12);
  const route = follow ? pathRoute(follow.tree, follow.pathKey) : [];
  const area = follow?.tree === "research" ? (RESEARCH_NODES.find((n) => n.id === route[1])!.category as ResearchCategory) : null;
  for (let day = 0; day < days && !s.isGameOver; day++) {
    const production = getDailyProductionSummary(s);
    const nextLaw = follow?.tree === "law" ? getLawNode(route.find((id) => !s.enactedLawIds.includes(id)) ?? "") : undefined;
    const keep = (good: Good) => (good === nextLaw?.enactCost.resourceType ? (nextLaw.enactCost.resourceAmount ?? 0) : 0);

    for (const project of s.projects) if (project.resourceType && s.resources[project.resourceType] < 2) s = ensure(s, project.resourceType, 3);
    for (const good of ["grain", "fish"] as const) if (s.resources[good] >= 10 + keep(good) && canSellGood(s, good)) s = sellGood(s, good);
    if (s.stats.treasury < 100 && s.debt < 4000) s = takeLoan(s);
    if (production.heatingFuel > 0 && s.resources.coal + s.resources.wood < production.heatingFuel * 3) s = ensure(s, "coal", 5);
    for (const building of s.placedBuildings.filter((b) => b.condition === "broken")) {
      s = repairBuilding(ensure(s, building.type === "factory" || building.type === "road" || building.type === "cannery" ? "ore" : "wood", 6), building.id);
    }
    const farmsPlanned = s.farmCount + s.projects.filter((p) => p.type === "farm").length;
    if (farmsPlanned < Math.ceil((s.stats.population * 1.1) / 2650)) s = tryBuild(s, buildFarm);
    if (s.stats.population > production.housingCapacity * 0.97 && !s.projects.some((p) => p.type === "housing")) s = tryBuild(s, buildHousing);
    if (s.stats.food < 20000 && canBuyGood(s, "food", 5)) s = buyGood(s, "food", 5);
    if (s.debt > 0 && s.stats.treasury > 2500 && canRepayLoan(s)) s = repayLoan(s);
    if (s.stats.popularity < getElectionThreshold(s.electionsWon) + 6 && canHoldRally(s)) s = holdRally(s);
    if (s.pendingDecisionId) {
      const decision = getDecision(s.pendingDecisionId)!;
      const best = [...decision.options].sort((a, b) => (b.effects.popularityDelta ?? 0) - (a.effects.popularityDelta ?? 0))[0];
      s = resolveDecision(s, decision.id, best.id);
    }

    if (nextLaw && !s.activeLaw && s.stats.treasury > 2000) {
      if (nextLaw.enactCost.resourceType) s = ensure(s, nextLaw.enactCost.resourceType, nextLaw.enactCost.resourceAmount ?? 0);
      if (canEnactLaw(s, nextLaw.id)) s = enactLaw(s, nextLaw.id);
    }
    if (area) {
      if (s.workforce.scientists[area] < 2 && s.stats.treasury > 3000 && canHireScientist(s)) s = hireScientist(s, area);
      const next = RESEARCH_NODES.find((n) => n.id === route.find((id) => !s.enactedResearchIds.includes(id)));
      if (!s.researchFocus[area] && next && getResearchNodeStatus(s, next) === "available") s = focusResearch(s, next.id);
    }

    s = simulateDay({ ...s, isPaused: false });
    onDay?.(s);
  }
  return s;
}

export function playIdle(nation: string, party: string, days: number): GameState {
  let s = startNewGame(nation, party);
  for (let day = 0; day < days && !s.isGameOver; day++) s = simulateDay({ ...s, isPaused: false });
  return s;
}
