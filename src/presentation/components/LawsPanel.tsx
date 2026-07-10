import "./LawsPanel.css";
import { useState } from "react";
import { canEnactLaw, enactLaw } from "../../application/actions";
import type { GameState } from "../../domain/country/types";
import { LAW_DEFINITIONS } from "../../domain/laws/lawData";
import type { LawCategory, LawDefinition, LawEffects } from "../../domain/laws/types";
import { StatIcon, type StatIconType } from "./StatIcon";

interface LawsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORY_LABELS: Record<LawCategory, string> = {
  labor: "Labor",
  sustenance: "Sustenance",
  order: "Order",
};

const CATEGORY_ICONS: Record<LawCategory, StatIconType> = {
  labor: "industry",
  sustenance: "food",
  order: "stability",
};

function lawsByCategory(): Array<[LawCategory, LawDefinition[]]> {
  const categories: LawCategory[] = ["labor", "sustenance", "order"];
  return categories.map((category) => [category, LAW_DEFINITIONS.filter((law) => law.category === category)]);
}

// Turns a law's numeric effects into (icon, is-it-a-benefit) pairs so the
// benefit/cost lines carry a matching stat glyph instead of being plain
// colored text.
function effectEntries(effects: LawEffects): Array<{ icon: StatIconType; positive: boolean }> {
  const entries: Array<{ icon: StatIconType; positive: boolean }> = [];
  if (effects.industryMultiplier !== undefined) entries.push({ icon: "industry", positive: effects.industryMultiplier >= 1 });
  if (effects.incomeMultiplier !== undefined) entries.push({ icon: "treasury", positive: effects.incomeMultiplier >= 1 });
  if (effects.treasuryDelta !== undefined) entries.push({ icon: "treasury", positive: effects.treasuryDelta >= 0 });
  if (effects.foodDelta !== undefined) entries.push({ icon: "food", positive: effects.foodDelta >= 0 });
  if (effects.stabilityDelta !== undefined) entries.push({ icon: "stability", positive: effects.stabilityDelta >= 0 });
  if (effects.populationDelta !== undefined) entries.push({ icon: "population", positive: effects.populationDelta >= 0 });
  return entries;
}

function EffectIcons({ icons }: { icons: StatIconType[] }) {
  if (icons.length === 0) return null;
  return (
    <span className="laws-panel__effect-icons">
      {icons.map((icon, i) => (
        <StatIcon type={icon} size={16} key={`${icon}-${i}`} />
      ))}
    </span>
  );
}

export function LawsPanel({ state, dispatch }: LawsPanelProps) {
  const [armedLawId, setArmedLawId] = useState<string | null>(null);

  return (
    <div className="laws-panel">
      <p className="panel-hint">Each choice below is permanent — enacting one locks out its counterpart for good.</p>

      {lawsByCategory().map(([category, laws]) => {
        const enacted = laws.find((law) => state.enactedLawIds.includes(law.id));
        return (
          <div className="laws-panel__category" key={category}>
            <h3 className="laws-panel__category-title">
              <StatIcon type={CATEGORY_ICONS[category]} size={20} />
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="laws-panel__options">
              {laws.map((law) => {
                const isEnacted = state.enactedLawIds.includes(law.id);
                const isLocked = !isEnacted && enacted !== undefined;
                const isArmed = armedLawId === law.id;
                const entries = effectEntries(law.effects);
                const benefitIcons = entries.filter((e) => e.positive).map((e) => e.icon);
                const costIcons = entries.filter((e) => !e.positive).map((e) => e.icon);

                return (
                  <div
                    className={["laws-panel__option", isEnacted ? "is-enacted" : "", isLocked ? "is-locked" : ""].join(" ")}
                    key={law.id}
                  >
                    <h4>{law.name}</h4>
                    <p className="laws-panel__description">{law.description}</p>
                    <p className="laws-panel__benefit">
                      <EffectIcons icons={benefitIcons} />
                      {law.benefit}
                    </p>
                    <p className="laws-panel__cost">
                      <EffectIcons icons={costIcons} />
                      {law.cost}
                    </p>
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
