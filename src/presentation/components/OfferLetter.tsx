// A neighbour's trade offer (see domain/neighbours/tradeRules.ts): to sell
// you food, or to buy what it wants from you, at a price set against the
// market's. Unlike a province's demand, it can be put aside: closing the
// letter declines it, and declining costs nothing.
import "./DecisionModal.css";
import { canAcceptOffer } from "../../application/actions";
import type { GameState } from "../../domain/country/types";
import { getBuyCost, getSellRevenue, holdsPort } from "../../domain/market/marketRules";
import { getNation } from "../../domain/nations/nationRules";
import { relationsWord } from "../../domain/neighbours/relationsRules";
import { playSeal } from "../audio/sound";
import { formatAmount } from "../formatNumber";
import { Modal } from "./Modal";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

export function OfferLetter({ state, onAccept, onDecline }: { state: GameState; onAccept: () => void; onDecline: () => void }) {
  const offer = state.pendingOffer;
  if (!offer) return null;
  const nation = getNation(offer.nationId);
  const selling = offer.kind === "sell";
  // What the market would ask, or pay, for the same lot: the deal beside it.
  const market = selling
    ? getBuyCost(state.market, offer.good, offer.amount, holdsPort(state))
    : getSellRevenue(state.market, offer.good, offer.amount);
  const what = offer.good === "food" ? "food" : offer.good;
  const feeling = relationsWord(state.neighbours[offer.nationId]?.relations ?? 0).toLowerCase();

  return (
    <Modal title={`A Trade Offer from ${nation.name}`} onClose={onDecline}>
      <div className="decision-modal">
        <div className="decision-modal__icon">
          {offer.good === "food" ? (
            <StatIcon type="food" size={36} />
          ) : (
            <svg viewBox="-10 -10 20 20" width={36} height={36} aria-hidden="true">
              <ResourceIcon type={offer.good} size={8} />
            </svg>
          )}
        </div>
        <p className="decision-modal__prompt">
          {selling
            ? `${nation.name} has food to spare, and offers you ${formatAmount(offer.amount)} for ${formatAmount(offer.price)} Cr. The market would ask ${formatAmount(market)} Cr.`
            : `${nation.name} wants ${what}, and offers ${formatAmount(offer.price)} Cr for ${formatAmount(offer.amount)}. The market would pay you ${formatAmount(market)} Cr.`}{" "}
          They are {feeling} towards you; a deal would warm them.
        </p>
        <div className="decision-modal__options">
          <button
            type="button"
            className="decision-modal__option"
            disabled={!canAcceptOffer(state)}
            title={canAcceptOffer(state) ? undefined : selling ? "Not enough Crowns" : `Not enough ${what} in store`}
            onClick={() => {
              playSeal();
              onAccept();
            }}
          >
            <span className="decision-modal__option-label">{selling ? "Buy it" : "Sell it"}</span>
            <span className="decision-modal__option-effect">
              <span className="decision-modal__option-icons">
                <StatIcon type="treasury" size={16} />
              </span>
              {selling ? `−${formatAmount(offer.price)} Cr · +${formatAmount(offer.amount)} food` : `+${formatAmount(offer.price)} Cr · −${formatAmount(offer.amount)} ${what}`}
            </span>
          </button>
          <button type="button" className="decision-modal__option" onClick={onDecline}>
            <span className="decision-modal__option-label">Decline</span>
            <span className="decision-modal__option-effect">Nothing changes</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
