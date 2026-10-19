// A neighbour's ultimatum (see domain/military/threatRules.ts): it wants an
// island of yours, and says when its regiments will sail for it. It must be
// answered, like a province's letter: pay it off, or stand firm and look to
// the garrison.
import "./DecisionModal.css";
import { canPayTribute } from "../../application/actions/ultimatumActions";
import { RELATIONS_TRIBUTE, TRIBUTE } from "../../domain/constants";
import { formatDate } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { regimentsOf } from "../../domain/military/militaryRules";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { playDrum, playSeal } from "../audio/sound";
import { formatAmount } from "../formatNumber";
import { Modal } from "./Modal";
import { StatIcon } from "./StatIcon";

export function UltimatumLetter({ state, onPay, onStandFirm }: { state: GameState; onPay: () => void; onStandFirm: () => void }) {
  const u = state.ultimatum;
  if (!u || u.answered) return null;
  const nation = getNation(u.nationId);
  const island = getProvinceName(u.islandId);
  const theirs = regimentsOf(state.regiments, u.nationId).length;
  const yours = state.regiments.filter((r) => r.nationId === state.nationId && r.provinceId === u.islandId && !r.march).length;

  return (
    <Modal title={`An Ultimatum from ${nation.name}`}>
      <div className="decision-modal">
        <div className="decision-modal__icon">
          <StatIcon type="regiment" size={36} />
        </div>
        <p className="decision-modal__prompt">
          {nation.name} demands {island}. Unless you pay it off, its regiments sail on {formatDate(u.warOn)}, and it will be at war with you until it has the island.
          It keeps {theirs} {theirs === 1 ? "regiment" : "regiments"}; {yours === 0 ? `none of yours stands on ${island}` : `${yours} of yours ${yours === 1 ? "stands" : "stand"} on ${island}`}.
        </p>
        <div className="decision-modal__options">
          <button
            type="button"
            className="decision-modal__option"
            disabled={!canPayTribute(state)}
            title={canPayTribute(state) ? undefined : `Needs ${formatAmount(TRIBUTE)} Cr`}
            onClick={() => {
              playSeal();
              onPay();
            }}
          >
            <span className="decision-modal__option-label">Pay them off</span>
            <span className="decision-modal__option-effect">
              <span className="decision-modal__option-icons">
                <StatIcon type="treasury" size={16} />
              </span>
              −{formatAmount(TRIBUTE)} Cr · they warm by {RELATIONS_TRIBUTE} · no war
            </span>
          </button>
          <button
            type="button"
            className="decision-modal__option"
            onClick={() => {
              playDrum();
              onStandFirm();
            }}
          >
            <span className="decision-modal__option-label">Stand firm</span>
            <span className="decision-modal__option-effect">
              <span className="decision-modal__option-icons">
                <StatIcon type="regiment" size={16} />
              </span>
              War on {formatDate(u.warOn)}, over {island}: garrison it
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
