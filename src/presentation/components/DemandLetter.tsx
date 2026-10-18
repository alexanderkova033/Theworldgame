// A province's letter (see domain/uprising/demandRules.ts): workers asking
// for a pay rise, or rebels sending their terms. It looks like a decision
// letter but must be answered: there is no closing it, since putting it
// aside would be a refusal nobody chose.
import "./DecisionModal.css";
import { canAnswerDemand, getDemandAnswers } from "../../application/actions";
import {
  AMNESTY_POLITICAL_POWER,
  AMNESTY_SUPPORT,
  DEMAND_PAY_RISE_PER_DAY,
  REBEL_TERMS_REFUSED_STRENGTH,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import type { DemandAnswer } from "../../domain/uprising/types";
import { playSeal } from "../audio/sound";
import { formatSigned } from "../formatNumber";
import { Modal } from "./Modal";
import { StatIcon, type StatIconType } from "./StatIcon";

interface Plate {
  label: string;
  icons: StatIconType[];
  effect: string;
  hint?: string; // why it can't be chosen
}

function plateFor(state: GameState, answer: DemandAnswer, name: string): Plate {
  switch (answer) {
    case "grant":
      return { label: "Grant it", icons: ["treasury", "stability"], effect: `−${DEMAND_PAY_RISE_PER_DAY} Cr a day for a year · ${name} calms` };
    case "amnesty":
      return {
        label: "Pardon them",
        icons: ["politicalPower", "popularity"],
        effect: `${AMNESTY_POLITICAL_POWER} political power · ${formatSigned(AMNESTY_SUPPORT, true)} support · the uprising ends`,
        hint: canAnswerDemand(state, "amnesty") ? undefined : `Needs ${AMNESTY_POLITICAL_POWER} political power`,
      };
    case "taxRelief":
      return { label: "A year without taxes", icons: ["treasury"], effect: `${name} pays no taxes for a year · the uprising ends` };
    case "refuse":
      return state.pendingDemand?.kind === "payRise"
        ? { label: "Refuse", icons: ["stability"], effect: `${name} in dispute for four months` }
        : { label: "Refuse", icons: ["uprising"], effect: `Rebel strength +${REBEL_TERMS_REFUSED_STRENGTH}` };
  }
}

export function DemandLetter({ state, onAnswer }: { state: GameState; onAnswer: (answer: DemandAnswer) => void }) {
  const demand = state.pendingDemand;
  if (!demand) return null;
  const name = getProvinceName(demand.provinceId);
  const isPay = demand.kind === "payRise";
  const strength = Math.round(state.provinces[demand.provinceId]?.uprising?.strength ?? 0);

  return (
    <Modal title={isPay ? "A Pay Rise" : "The Rebels' Terms"}>
      <div className="decision-modal">
        <div className="decision-modal__icon">
          <StatIcon type={isPay ? "treasury" : "uprising"} size={36} />
        </div>
        <p className="decision-modal__prompt">
          {isPay
            ? `The factory workers of ${name} want a pay rise. Refused, they will down tools, and in a shaky country a dispute can turn to riots.`
            : `The rebels of ${name} will lay down their arms for a pardon, or for a year without taxes. Rebel strength ${strength}.`}
        </p>
        <div className="decision-modal__options">
          {getDemandAnswers(state).map((answer) => {
            const plate = plateFor(state, answer, name);
            return (
              <button
                key={answer}
                type="button"
                className="decision-modal__option"
                disabled={!canAnswerDemand(state, answer)}
                title={plate.hint}
                onClick={() => {
                  playSeal();
                  onAnswer(answer);
                }}
              >
                <span className="decision-modal__option-label">{plate.label}</span>
                <span className="decision-modal__option-effect">
                  <span className="decision-modal__option-icons">
                    {plate.icons.map((icon) => (
                      <StatIcon type={icon} size={16} key={icon} />
                    ))}
                  </span>
                  {plate.effect}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
