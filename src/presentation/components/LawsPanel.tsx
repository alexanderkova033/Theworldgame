import "./LawsPanel.css";
import { useState } from "react";
import { canEnactLaw, enactLaw } from "../../application/actions";
import type { GameState } from "../../domain/country/types";
import { LAW_DEFINITIONS } from "../../domain/laws/lawData";
import type { LawCategory, LawDefinition } from "../../domain/laws/types";

interface LawsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORY_LABELS: Record<LawCategory, string> = {
  labor: "Labor",
  sustenance: "Sustenance",
  order: "Order",
};

function lawsByCategory(): Array<[LawCategory, LawDefinition[]]> {
  const categories: LawCategory[] = ["labor", "sustenance", "order"];
  return categories.map((category) => [category, LAW_DEFINITIONS.filter((law) => law.category === category)]);
}

export function LawsPanel({ state, dispatch }: LawsPanelProps) {
  const [armedLawId, setArmedLawId] = useState<string | null>(null);

  return (
    <div className="laws-panel">
      <p className="resources-panel__hint">Each choice below is permanent — enacting one locks out its counterpart for good.</p>

      {lawsByCategory().map(([category, laws]) => {
        const enacted = laws.find((law) => state.enactedLawIds.includes(law.id));
        return (
          <div className="laws-panel__category" key={category}>
            <h3 className="laws-panel__category-title">{CATEGORY_LABELS[category]}</h3>
            <div className="laws-panel__options">
              {laws.map((law) => {
                const isEnacted = state.enactedLawIds.includes(law.id);
                const isLocked = !isEnacted && enacted !== undefined;
                const isArmed = armedLawId === law.id;

                return (
                  <div
                    className={["laws-panel__option", isEnacted ? "is-enacted" : "", isLocked ? "is-locked" : ""].join(" ")}
                    key={law.id}
                  >
                    <h4>{law.name}</h4>
                    <p className="laws-panel__description">{law.description}</p>
                    <p className="laws-panel__benefit">{law.benefit}</p>
                    <p className="laws-panel__cost">{law.cost}</p>
                    {isEnacted ? (
                      <span className="laws-panel__status">Enacted</span>
                    ) : (
                      <button
                        disabled={isLocked || !canEnactLaw(state, law.id)}
                        onClick={() => {
                          if (isArmed) {
                            dispatch((s) => enactLaw(s, law.id));
                            setArmedLawId(null);
                          } else {
                            setArmedLawId(law.id);
                          }
                        }}
                      >
                        {isArmed ? "Confirm — this cannot be undone" : "Enact"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
