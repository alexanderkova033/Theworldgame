// A careful player, for the balance tests: borrows once, keeps people fed,
// housed and warm, repairs what breaks, pays the loan back, rallies when
// support slips toward the line to win and takes whichever option of a decision keeps support up.
// Optionally it also follows one path of the Laws or Research tree.
import { buildFarm } from "../../src/application/actions/buildFarm";
import { buildHousing } from "../../src/application/actions/buildHousing";
import { enactLaw } from "../../src/application/actions/enactLaw";
import { canRepayLoan, repayLoan, takeLoan } from "../../src/application/actions/loanActions";
import { buyGood, canBuyGood, canSellGood, sellGood } from "../../src/application/actions/marketActions";
import { canCourtGroup, canCrackDown, canHoldRally, courtGroup, crackDown, holdRally } from "../../src/application/actions/politicalActions";
import { getFactionWeights } from "../../src/domain/parties/factionRules";
import { repairBuilding } from "../../src/application/actions/repairBuilding";
import { canRaiseMilitia, canSendMilitia, raiseMilitia, sendMilitia } from "../../src/application/actions/militiaActions";
import { answerDemand, canAnswerDemand } from "../../src/application/actions/demandActions";
import { acceptOffer, canAcceptOffer, declineOffer } from "../../src/application/actions/tradeActions";
import { buyBackIsland, canBuyBackIsland, canSignAccord, signIslandAccord } from "../../src/application/actions/treatyActions";
import { getBuyBackPrice } from "../../src/domain/neighbours/treatyRules";
import { BUY_BACK_MIN_RELATIONS } from "../../src/domain/constants";
import { canPressureGovernment, pressureGovernment } from "../../src/application/actions/pressureGovernment";
import { dayNumber } from "../../src/domain/country/calendar";
import { getFreeMilitia } from "../../src/domain/uprising/uprisingRules";
import { buildHarbour } from "../../src/application/actions/buildHarbour";
import { canFoundSettlement, foundSettlement } from "../../src/application/actions/settlementActions";
import { canSendExpedition, sendExpedition } from "../../src/application/actions/sendExpedition";
import { isFeatureOpen } from "../../src/domain/chapters/chapterData";
import { HARBOUR_WOOD_COST, SETTLE_WOOD } from "../../src/domain/constants";
import { ISLANDS } from "../../src/domain/islands/islandData";
import { isHarbourSite, isIsland } from "../../src/domain/islands/islandRules";
import { getOwnedProvinceIds } from "../../src/domain/provinces/provinceRules";
import { focusResearch } from "../../src/application/actions/researchActions";
import { resolveDecision } from "../../src/application/actions/resolveDecision";
import { setTaxRate } from "../../src/application/actions/setTaxRate";
import { canHireScientist, hireScientist } from "../../src/application/actions/workforceActions";
import { getDailyProductionSummary } from "../../src/application/getDailyProductionSummary";
import { simulateDay } from "../../src/application/simulateDay";
import { startNewGame } from "../../src/application/startNewGame";
import type { GameState } from "../../src/domain/country/types";
import type { Difficulty } from "../../src/domain/difficulty/difficultyData";
import type { GameMode } from "../../src/domain/reign/reignData";
import { getDecision } from "../../src/domain/decisions/decisionRules";
import { LAW_NODES } from "../../src/domain/laws/lawData";
import { canEnactLaw, getLawNode } from "../../src/domain/laws/lawsRules";
import { getNation } from "../../src/domain/nations/nationRules";
import { getElectionThreshold } from "../../src/domain/parties/electionRules";
import { RESEARCH_NODES } from "../../src/domain/research/researchData";
import { getResearchNodeStatus } from "../../src/domain/research/researchRules";
import type { ResearchCategory } from "../../src/domain/research/types";
import { takeBurden } from "../../src/application/actions/burdenActions";

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
  difficulty?: Difficulty;
  // A sloppy player reacts late: it rallies only once support is below the
  // line, repairs only once three buildings are down, leaves taxes where they
  // start, builds homes only once people are already homeless and buys food
  // only when it's nearly gone. Difficulty levels are measured against both.
  skill?: "careful" | "sloppy";
  mode?: GameMode; // Three Terms by default; a Long Reign plays on past the third election
  settle?: boolean; // also scouts the empty islands, settles them and links them with harbours
  trade?: boolean; // also takes the neighbours' good trade offers
  treaties?: boolean; // also signs island accords, and buys back the islands neighbours hold, when it can spare the money
}

export function playCarefully(nation: string, party: string, { days, follow, onDay, difficulty, skill = "careful", mode, settle = false, trade = false, treaties = false }: PlayOptions): GameState {
  const sloppy = skill === "sloppy";
  let s = takeLoan(startNewGame(nation, party, difficulty, mode));
  if (!sloppy) s = setTaxRate(s, 0.12);
  const route = follow ? pathRoute(follow.tree, follow.pathKey) : [];
  const area = follow?.tree === "research" ? (RESEARCH_NODES.find((n) => n.id === route[1])!.category as ResearchCategory) : null;
  for (let day = 0; day < days && !s.isGameOver; day++) {
    if (s.burdenOffer) s = takeBurden(s, s.burdenOffer[0]);
    const production = getDailyProductionSummary(s);
    const nextLaw = follow?.tree === "law" ? getLawNode(route.find((id) => !s.enactedLawIds.includes(id)) ?? "") : undefined;
    const keep = (good: Good) => (good === nextLaw?.enactCost.resourceType ? (nextLaw.enactCost.resourceAmount ?? 0) : 0);

    for (const project of s.projects) if (project.resourceType && s.resources[project.resourceType] < 2) s = ensure(s, project.resourceType, 3);
    for (const good of ["grain", "fish"] as const) if (s.resources[good] >= 10 + keep(good) && canSellGood(s, good)) s = sellGood(s, good);
    if (s.stats.treasury < 100 && s.debt < 4000) s = takeLoan(s);
    if (production.heatingFuel > 0 && s.resources.coal + s.resources.wood < production.heatingFuel * 3) s = ensure(s, "coal", 5);
    const broken = s.placedBuildings.filter((b) => b.condition === "broken");
    for (const building of sloppy && broken.length < 3 ? [] : broken) {
      s = repairBuilding(ensure(s, building.type === "factory" || building.type === "road" || building.type === "cannery" ? "ore" : "wood", 6), building.id);
    }
    const farmsPlanned = s.farmCount + s.projects.filter((p) => p.type === "farm").length;
    if (farmsPlanned < Math.ceil((s.stats.population * (sloppy ? 0.95 : 1.1)) / 2650)) s = tryBuild(s, buildFarm);
    if (s.stats.population > production.housingCapacity * (sloppy ? 1.02 : 0.97) && !s.projects.some((p) => p.type === "housing")) s = tryBuild(s, buildHousing);
    if (s.stats.food < (sloppy ? 3000 : 20000) && canBuyGood(s, "food", 5)) s = buyGood(s, "food", 5);
    if (s.debt > 0 && s.stats.treasury > 2500 && canRepayLoan(s)) s = repayLoan(s);
    if (s.stats.popularity < getElectionThreshold(s) + (sloppy ? 0 : 6) && canHoldRally(s)) s = holdRally(s);
    // Once open, a careful player also courts the biggest group when support
    // slips, and cracks down on strikes or riots.
    if (!sloppy && s.stats.popularity < getElectionThreshold(s) + 6 && canCourtGroup(s)) {
      const weights = getFactionWeights(s.nationId);
      const biggest = (Object.keys(weights) as Array<keyof typeof weights>).sort((a, b) => weights[b] - weights[a])[0];
      if (s.factionApproval[biggest] < 70) s = courtGroup(s, biggest);
    }
    if (!sloppy && (s.unrestStage === "strikes" || s.unrestStage === "riots") && canCrackDown(s)) s = crackDown(s);
    // A neighbour's trade offer: put aside (it costs nothing), or with the
    // trade habit, taken when it is a good deal for a country in its place.
    if (s.pendingOffer) {
      const offer = s.pendingOffer;
      const wanted = offer.kind === "sell" ? s.stats.food < 200000 : offer.good !== "food" && s.resources[offer.good] >= offer.amount * 2;
      s = trade && wanted && canAcceptOffer(s) ? acceptOffer(s) : declineOffer(s);
    }
    // A letter from a province. A careful player grants a pay rise it can
    // afford and ends an uprising on terms; a sloppy one refuses the pay
    // rise, and takes the cheapest way out of an uprising.
    if (s.pendingDemand) {
      const answer =
        s.pendingDemand.kind === "payRise"
          ? !sloppy && s.stats.treasury > 1500 ? "grant" : "refuse"
          : !sloppy && canAnswerDemand(s, "amnesty") ? "amnesty" : "taxRelief";
      s = answerDemand(s, answer);
    }
    // A province that has risen: raise companies and send them in. A sloppy
    // player only gets round to it after two months of losing it.
    for (const [id, province] of Object.entries(s.provinces)) {
      if (!province.uprising || (sloppy && dayNumber(s.date) - dayNumber(province.uprising.since) < 60)) continue;
      while (province.uprising.militia + getFreeMilitia(s.workforce, s.provinces) < 2 && canRaiseMilitia(s)) s = raiseMilitia(s);
      while ((s.provinces[id].uprising?.militia ?? 2) < 2 && canSendMilitia(s, id)) s = sendMilitia(s, id);
    }
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

    if (settle) s = settleIslands(s);
    if (treaties) s = signTreaties(s);
    s = simulateDay({ ...s, isPaused: false });
    onDay?.(s);
  }
  return s;
}

// Scout the islands one by one, settle each once there's money to spare
// (buying land where people live, if it can, else living alongside them),
// and link every colony with a harbour there and one on the coast.
function settleIslands(state: GameState): GameState {
  let s = state;
  if (!isFeatureOpen(s, "ventures")) return s;
  const all = ISLANDS.map((i) => i.id);
  const unscouted = all.find((id) => !s.scoutedIslandIds.includes(id));
  if (unscouted && s.expeditions.length === 0 && s.stats.treasury > 2500 && canSendExpedition(s, unscouted)) s = sendExpedition(s, unscouted);
  if (s.settlements.length === 0 && s.stats.treasury > 5000) {
    const stocked = ensure(s, "wood", SETTLE_WOOD + 5);
    for (const island of ISLANDS) {
      const terms = island.locals ? (s.stats.treasury > 7000 ? "buy" : "share") : undefined;
      if (canFoundSettlement(stocked, island.id, terms)) {
        s = foundSettlement(stocked, island.id, terms);
        break;
      }
    }
  }
  const held = getOwnedProvinceIds(s);
  const colonies = held.filter(isIsland);
  if (colonies.length > 0 && s.stats.treasury > 4000) {
    const hasHarbour = (id: string) => s.placedBuildings.some((b) => b.provinceId === id && b.type === "harbour") || s.projects.some((p) => p.provinceId === id && p.type === "harbour");
    const coastHarbour = held.some((id) => !isIsland(id) && hasHarbour(id));
    const sites = [...(coastHarbour ? [] : held.filter((id) => !isIsland(id) && isHarbourSite(id)).slice(0, 1)), ...colonies.filter((id) => !hasHarbour(id))];
    for (const site of sites) {
      const stocked = ensure(s, "wood", HARBOUR_WOOD_COST + 5);
      if (buildHarbour.canBuild(stocked, site)) s = buildHarbour(stocked, site);
    }
  }
  return s;
}

export function playIdle(nation: string, party: string, days: number): GameState {
  let s = startNewGame(nation, party);
  for (let day = 0; day < days && !s.isGameOver; day++) s = simulateDay({ ...s, isPaused: false });
  return s;
}

// Keep the neighbours from the islands with an accord whenever one will
// sign, and buy back any island they hold once there's money to spare,
// backing its rulers until it is warm enough to sell.
function signTreaties(state: GameState): GameState {
  let s = state;
  for (const nationId of new Set(Object.values(s.foreignIslands))) {
    const gov = s.foreignPolitics[nationId];
    if (gov && s.neighbours[nationId].relations < BUY_BACK_MIN_RELATIONS && canPressureGovernment(s, nationId)) s = pressureGovernment(s, nationId, gov.rulingPartyId);
  }
  for (const nationId of Object.keys(s.neighbours)) if (s.stats.treasury > 4000 && canSignAccord(s, nationId)) s = signIslandAccord(s, nationId);
  for (const islandId of Object.keys(s.foreignIslands)) {
    if (s.stats.treasury > getBuyBackPrice(islandId) + 3000 && canBuyBackIsland(s, islandId)) s = buyBackIsland(s, islandId);
  }
  return s;
}
