// Step 8b of the day, on the first of each month: the neighbours live a
// month and their computer rulers choose (see domain/neighbours): one thing
// to build, and perhaps settlers for the island nobody holds with the most
// people. Building is quiet (the Neighbours page shows it); a voyage is
// news, and the country is told at once, since it is a race.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { DAYS_PER_MONTH, RACE_VOYAGE_DAYS, SETTLE_COST, THREAT_STRENGTH_RATIO, TRADE_OFFER_DAYS, ULTIMATUM_DAYS, WAR_ISLAND_GARRISON } from "../../domain/constants";
import { addDays, dayNumber, isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameDate, GameState } from "../../domain/country/types";
import { pickRaceTarget } from "../../domain/islands/islandRules";
import { chooseBuilding, chooseVoyage, liveMonth } from "../../domain/neighbours/neighbourRules";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { fadeFeelings } from "../../domain/neighbours/relationsRules";
import { draftOffer } from "../../domain/neighbours/tradeRules";
import { hasAccord } from "../../domain/neighbours/treatyRules";
import { chooseRecruit, garrisonIslands, getArmyPay, isReady, sendStrikingForce } from "../../domain/military/militaryRules";
import { chooseThreat, getStrikingStrength } from "../../domain/military/threatRules";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
import { isIsland } from "../../domain/islands/islandRules";
import { holdsPort } from "../../domain/market/marketRules";
import { isFriendly } from "../../domain/diplomacy/diplomacyRules";
import { monthNumber } from "../../domain/country/calendar";
import { log, type Day } from "./dayContext";

export function runNeighbours(
  day: Day,
  working: GameState,
  date: GameDate,
): Pick<GameState, "neighbours" | "foreignVoyages" | "pendingOffer" | "regiments" | "ultimatum"> {
  // A trade offer stands in the Market until it lapses.
  const standing = working.pendingOffer?.until && dayNumber(date) > dayNumber(working.pendingOffer.until) ? null : working.pendingOffer;
  if (!isFirstDayOfMonth(date)) {
    return { neighbours: working.neighbours, foreignVoyages: working.foreignVoyages, pendingOffer: standing, regiments: working.regiments, ultimatum: working.ultimatum };
  }
  let regiments = working.regiments;
  let ultimatum = working.ultimatum;
  // Your islands, and the strength of your regiments standing on each: what
  // a neighbour weighs before it threatens or attacks (threatRules.ts).
  const yourIslands = () =>
    getOwnedProvinceIds(working)
      .filter(isIsland)
      .map((islandId) => ({
        islandId,
        garrison: regiments.filter((r) => r.nationId === working.nationId && isReady(r) && r.provinceId === islandId).reduce((sum, r) => sum + r.strength, 0),
      }));
  const month = monthNumber(date);
  let foreignVoyages = working.foreignVoyages;
  let pendingOffer = standing;
  const neighbours: GameState["neighbours"] = {};
  // A trade offer is no letter: it stands in the Market (one at a time) once
  // the market is open, and a notice says so.
  const canOffer = isFeatureOpen(working, "market");
  const hasPort = holdsPort(working);

  for (const [nationId, before] of Object.entries(working.neighbours)) {
    // Feelings fade, toward warm while the party you backed rules them; not
    // while you're at war with them.
    const gov = working.foreignPolitics[nationId];
    const atWar = !!working.wars[nationId];
    const faded = atWar ? before : fadeFeelings(before, gov ? isFriendly(gov) : false);
    const { neighbour, deed } = chooseBuilding(liveMonth(faded, nationId, date), nationId);
    // The islands are only raced for once the player can answer (ventures open).
    const target = isFeatureOpen(working, "ventures") ? pickRaceTarget({ ...working, foreignVoyages }) : null;
    // An island accord with you holds their settlers back (treatyRules.ts).
    if (!hasAccord(neighbour, date) && chooseVoyage(neighbour, nationId, month, target)) {
      foreignVoyages = [...foreignVoyages, { nationId, islandId: target!, daysRemaining: RACE_VOYAGE_DAYS, totalDays: RACE_VOYAGE_DAYS }];
      neighbours[nationId] = { ...neighbour, treasury: neighbour.treasury - SETTLE_COST, lastVoyageMonth: month, lastDeed: `Sent settlers to ${getProvinceName(target!)}` };
      log(day, {
        date,
        message: `${getNation(nationId).name}'s settlers sail for ${getProvinceName(target!)}. They land in about ${RACE_VOYAGE_DAYS} days: settle it first to keep it.`,
        severity: "warning",
        topic: "venture",
      });
    } else {
      neighbours[nationId] = { ...neighbour, lastDeed: deed };
    }
    const drafted = canOffer && !atWar && !pendingOffer ? draftOffer(neighbours[nationId], nationId, month, working.market, hasPort, working.resources) : null;
    if (drafted) {
      pendingOffer = { ...drafted, until: addDays(date, TRADE_OFFER_DAYS) };
      const lot = `${drafted.amount} ${drafted.good}`;
      log(day, {
        date,
        message:
          drafted.kind === "sell"
            ? `${getNation(nationId).name} offers you ${lot} for ${drafted.price} Cr. The offer stands in the Market for ${TRADE_OFFER_DAYS} days.`
            : `${getNation(nationId).name} would buy ${lot} from you for ${drafted.price} Cr. The offer stands in the Market for ${TRADE_OFFER_DAYS} days.`,
        severity: "info",
        topic: "trade",
      });
    }
    // Its army: a month's pay, and perhaps a new regiment (militaryRules.ts).
    // Unpaid, its newest goes home.
    const paid = { ...neighbours[nationId], treasury: neighbours[nationId].treasury - getArmyPay(regiments, nationId) * DAYS_PER_MONTH };
    const own = regiments.filter((r) => r.nationId === nationId);
    if (paid.treasury < 0 && own.length > 0) {
      regiments = regiments.filter((r) => r !== own[own.length - 1]);
      neighbours[nationId] = paid;
    } else {
      const { neighbour: after, recruit } = chooseRecruit(paid, nationId, regiments, atWar);
      neighbours[nationId] = after;
      if (recruit) regiments = [...regiments, recruit];
    }
    // A garrison on each island it holds, more of one while at war with you.
    // At war, it also attacks: first of all in a war it started, for the
    // island it wants; in one you started, with what it can spare, when it
    // is strong enough against your weakest island.
    const islands = Object.keys(working.foreignIslands).filter((id) => working.foreignIslands[id] === nationId);
    const war = working.wars[nationId];
    const attack = () => {
      const mine = yourIslands();
      if (mine.length === 0) return;
      const wanted = war?.byThem && mine.some((i) => i.islandId === war.byThem) ? mine.find((i) => i.islandId === war.byThem)! : mine.reduce((a, b) => (b.garrison < a.garrison ? b : a));
      const striking = getStrikingStrength(regiments.filter((r) => r.nationId === nationId));
      if (striking >= 100 && striking >= wanted.garrison * THREAT_STRENGTH_RATIO) {
        regiments = sendStrikingForce(nationId, regiments, wanted.islandId, islands);
      }
    };
    if (war?.byThem) attack();
    regiments = garrisonIslands(nationId, regiments, islands, atWar ? WAR_ISLAND_GARRISON : 1);
    if (war && !war.byThem) attack();
    // Not at war, but hostile and strong enough: an ultimatum, one at a time.
    if (!war && !ultimatum && isFeatureOpen(working, "army")) {
      const target = chooseThreat(neighbours[nationId], nationId, month, date, regiments.filter((r) => r.nationId === nationId), yourIslands());
      if (target) {
        ultimatum = { nationId, islandId: target, warOn: addDays(date, ULTIMATUM_DAYS), answered: false };
        log(day, {
          date,
          message: `${getNation(nationId).name} sends you an ultimatum over ${getProvinceName(target)}.`,
          severity: "danger",
          topic: "army",
        });
      }
    }
  }
  return { neighbours, foreignVoyages, pendingOffer, regiments, ultimatum };
}
