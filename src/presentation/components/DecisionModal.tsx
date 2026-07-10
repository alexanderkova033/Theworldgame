import "./DecisionModal.css";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import type { DecisionEffects } from "../../domain/decisions/types";
import { playConfirm } from "../audio/sound";
import { Modal } from "./Modal";
import { StatIcon, type StatIconType } from "./StatIcon";

interface DecisionModalProps {
  state: GameState;
  onResolve: (decisionId: string, optionId: string) => void;
  onDismiss: () => void;
}

function effectIcons(effects: DecisionEffects): StatIconType[] {
  const icons: StatIconType[] = [];
  if (effects.treasuryDelta) icons.push("treasury");
  if (effects.foodDelta) icons.push("food");
  if (effects.stabilityDelta) icons.push("stability");
  if (effects.populationDelta) icons.push("population");
  if (effects.popularityDelta) icons.push("popularity");
  return icons;
}

function formatDelta(value: number, suffix: string): string {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function formatEffects(effects: DecisionEffects): string {
  const parts: string[] = [];
  if (effects.treasuryDelta) parts.push(formatDelta(effects.treasuryDelta, " Cr"));
  if (effects.foodDelta) parts.push(formatDelta(effects.foodDelta, " food"));
  if (effects.stabilityDelta) parts.push(formatDelta(effects.stabilityDelta, " stability"));
  if (effects.populationDelta) parts.push(formatDelta(effects.populationDelta, " pop"));
  if (effects.popularityDelta) parts.push(formatDelta(effects.popularityDelta, " popularity"));
  return parts.join(" · ");
}

// A decision that popped up on its own (see simulateDay.ts step 14) rather
// than one the player opened — rendered unconditionally in App.tsx and
// self-guards on there being nothing pending, so it's a no-op most ticks.
export function DecisionModal({ state, onResolve, onDismiss }: DecisionModalProps) {
  if (!state.pendingDecisionId) return null;
  const decision = getDecision(state.pendingDecisionId);
  if (!decision) return null;

  return (
    <Modal title={decision.title} onClose={onDismiss}>
      <div className="decision-modal">
        <div className="decision-modal__icon">
          <StatIcon type={decision.icon as StatIconType} size={36} />
        </div>
        <p className="decision-modal__prompt">{decision.prompt}</p>
        <div className="decision-modal__options">
          {decision.options.map((option) => (
            <button
              key={option.id}
              className="decision-modal__option"
              onClick={() => {
                playConfirm();
                onResolve(decision.id, option.id);
              }}
            >
              <span className="decision-modal__option-label">{option.label}</span>
              <span className="decision-modal__option-effect">
                <span className="decision-modal__option-icons">
                  {effectIcons(option.effects).map((icon, i) => (
                    <StatIcon type={icon} size={16} key={`${icon}-${i}`} />
                  ))}
                </span>
                {formatEffects(option.effects)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
