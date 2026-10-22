// A province's crisis letter (see domain/crises): what has struck it, and
// the ways out. Like a demand, it must be answered: there is no closing it,
// since putting it aside would be an answer nobody chose.
import "./DecisionModal.css";
import { canAnswerCrisis, getCrisisAnswers } from "../../application/actions";
import type { GameState } from "../../domain/country/types";
import { getAnswerCost } from "../../domain/crises/crisisRules";
import type { CrisisAnswer } from "../../domain/crises/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { playSeal } from "../audio/sound";
import { formatAmount } from "../formatNumber";
import { answerPlate, CRISIS_TITLES, crisisPrompt } from "../crisisText";
import { CrisisIcon } from "./CrisisIcon";
import { Modal } from "./Modal";

export function CrisisLetter({ state, onAnswer }: { state: GameState; onAnswer: (answer: CrisisAnswer) => void }) {
  const id = state.pendingCrisis;
  const crisis = id ? state.provinces[id]?.crisis : null;
  if (!id || !crisis || crisis.answer) return null;
  const name = getProvinceName(id);
  const hasWorks = state.placedBuildings.some((b) => b.provinceId === id && b.type === "factory");

  return (
    <Modal title={CRISIS_TITLES[crisis.kind]}>
      <div className="decision-modal">
        <div className="decision-modal__icon">
          <CrisisIcon kind={crisis.kind} size={36} />
        </div>
        <p className="decision-modal__prompt">{crisisPrompt(crisis.kind, name, { homesLost: crisis.homesLost, hasWorks })}</p>
        <div className="decision-modal__options">
          {getCrisisAnswers(state).map((answer) => {
            const plate = answerPlate(answer, hasWorks);
            const cost = getAnswerCost(answer);
            const missing = [
              state.stats.treasury < cost.treasury && `${formatAmount(cost.treasury)} Cr`,
              state.resources.wood < cost.wood && `${cost.wood} wood`,
            ].filter(Boolean);
            const short = canAnswerCrisis(state, answer) ? undefined : `Needs ${missing.join(" and ")}`;
            return (
              <button
                key={answer}
                type="button"
                className="decision-modal__option decision-modal__option--stacked"
                disabled={!!short}
                title={short}
                onClick={() => {
                  playSeal();
                  onAnswer(answer);
                }}
              >
                <span className="decision-modal__option-label">{plate.label}</span>
                <span className="decision-modal__option-effect">
                  {plate.effect}
                  {short && <span className="decision-modal__option-short"> · {short}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
