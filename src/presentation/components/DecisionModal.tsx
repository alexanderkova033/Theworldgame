import "./DecisionModal.css";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import type { DecisionEffects } from "../../domain/decisions/types";
import { playSeal } from "../audio/sound";
import { BuildingGlyph } from "./CauseIcon";
import { Modal } from "./Modal";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";
import { describeEffects, describeOutcomeParts, type OutcomePart } from "../storyText";
import { StoryPlate } from "./StoryPlate";
import { getLetterChapter } from "../../domain/chapters/chapterData";

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

// What an answer does, each part in the ink of a gain or a cost.
export function OutcomeParts({ parts }: { parts: OutcomePart[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={p.text} className={p.good ? "outcome-part outcome-part--good" : "outcome-part outcome-part--bad"}>
          {i > 0 && <span className="outcome-part__sep"> · </span>}
          {p.text}
        </span>
      ))}
    </>
  );
}

// A decision's icon: a stat, or for the situational ones about coal and
// homes, that resource or building.
export function DecisionIcon({ icon, size }: { icon: string; size: number }) {
  if (icon === "coal") {
    return (
      <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
        <ResourceIcon type="coal" size={8} />
      </svg>
    );
  }
  if (icon === "housing") return <BuildingGlyph type="housing" size={size} />;
  return <StatIcon type={icon as StatIconType} size={size} />;
}

// A decision that popped up on its own (see simulateDay.ts step 14) rather
// than one the player opened — rendered unconditionally in App.tsx and
// self-guards on there being nothing pending, so it's a no-op most ticks.
export function DecisionModal({ state, onResolve, onDismiss }: DecisionModalProps) {
  if (!state.pendingDecisionId) return null;
  const decision = getDecision(state.pendingDecisionId);
  if (!decision) return null;
  const chapter = decision.story ? getLetterChapter(decision.id) : undefined;

  return (
    // A story letter must be answered: its choice is the story (domain/chapters).
    <Modal title={decision.title} onClose={decision.story ? undefined : onDismiss}>
      <div className="decision-modal">
        {chapter ? (
          <StoryPlate chapterId={chapter.id} />
        ) : (
          <div className="decision-modal__icon">
            <DecisionIcon icon={decision.icon} size={36} />
          </div>
        )}
        <p className="decision-modal__prompt">{decision.prompt}</p>
        <div className="decision-modal__options">
          {decision.options.map((option) => (
            <button
              key={option.id}
              className={`decision-modal__option ${decision.story ? "decision-modal__option--stacked" : ""}`}
              onClick={() => {
                playSeal();
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
                <OutcomeParts parts={[...describeEffects(option.effects), ...describeOutcomeParts(option.outcome, state)]} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
