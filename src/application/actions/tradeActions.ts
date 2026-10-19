// Answering a neighbour's trade offer (see domain/neighbours/tradeRules.ts).
// Accepted, the goods and the Crowns change hands, and the neighbour thinks
// a little better of you. Declined, nothing happens: an offer can simply be
// put aside.
import { RELATIONS_TRADE } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { feel } from "../../domain/neighbours/relationsRules";
import { recordAction } from "./recordAction";

export function canAcceptOffer(state: GameState): boolean {
  const offer = state.pendingOffer;
  if (!offer || !state.neighbours[offer.nationId]) return false;
  if (offer.kind === "sell") return state.stats.treasury >= offer.price;
  return offer.good !== "food" && state.resources[offer.good] >= offer.amount;
}

export function acceptOffer(state: GameState): GameState {
  if (!canAcceptOffer(state)) return state;
  const offer = state.pendingOffer!;
  const n = state.neighbours[offer.nationId];
  const name = getNation(offer.nationId).name;
  const selling = offer.kind === "sell"; // they sell to you
  const good = offer.good;
  const message = selling
    ? `You buy ${offer.amount} food from ${name} for ${offer.price} Cr.`
    : `You sell ${offer.amount} ${good} to ${name} for ${offer.price} Cr.`;
  return recordAction(
    state,
    {
      ...state,
      pendingOffer: null,
      stats: {
        ...state.stats,
        treasury: state.stats.treasury + (selling ? -offer.price : offer.price),
        food: state.stats.food + (selling && good === "food" ? offer.amount : 0),
      },
      resources: !selling && good !== "food" ? { ...state.resources, [good]: state.resources[good] - offer.amount } : state.resources,
      neighbours: {
        ...state.neighbours,
        [offer.nationId]: feel(
          {
            ...n,
            treasury: n.treasury + (selling ? offer.price : -offer.price),
            food: n.food - (selling && good === "food" ? offer.amount : 0),
          },
          RELATIONS_TRADE,
          selling ? "You bought their food" : `You sold them ${good}`,
        ),
      },
      events: [{ id: generateId("event"), date: state.date, message, severity: "info", topic: "politics" }, ...state.events],
    },
    { treasury: "trade", food: "trade" },
  );
}

export function declineOffer(state: GameState): GameState {
  return state.pendingOffer ? { ...state, pendingOffer: null } : state;
}
