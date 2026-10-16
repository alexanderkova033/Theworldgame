// The tax rate: the plainest money-versus-votes choice in the game. Every
// step up fills the treasury and costs support; every step down does the
// opposite. Both consequences are shown right next to the control, and
// pointing at − or + shows them after the step, before it's taken.
import "./TaxPanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { setTaxRate } from "../../application/actions";
import { CURRENCY_SYMBOL, MAX_TAX_RATE, MIN_TAX_RATE, TAX_POPULARITY_PER_POINT, TAX_RATE_STEP } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getModifiers } from "../../domain/policy/policyRules";
import { getAcceptedTaxRate } from "../../domain/politics/politicsRules";
import { Gauge, withPreview } from "./Gauge";
import { StatIcon } from "./StatIcon";
import { formatRate, formatSigned } from "../formatNumber";

// Where the "grumbling" stretch of the tax gauge ends — a picture of the
// scale, not a rule: support falls by the same amount per point throughout.
const TAX_GRUMBLE_PERCENT = 25;

interface TaxPanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function TaxPanel({ state, production, dispatch }: TaxPanelProps) {
  const [step, setStep] = useState<-1 | 1 | null>(null);
  const rate = state.taxRate;
  const percent = Math.round(rate * 100);
  // What people accept, after laws and the party's creed (see domain/policy).
  const accepted = getAcceptedTaxRate(getModifiers(state).taxTolerance);
  const mood = Math.round((accepted - rate) * 100 * TAX_POPULARITY_PER_POINT);
  // What one step would change, so the trade-off is visible before clicking.
  const incomePerStep = rate > 0 ? Math.round((production.taxIncome / rate) * TAX_RATE_STEP) : 0;
  const moodPerStep = Math.round(TAX_RATE_STEP * 100 * TAX_POPULARITY_PER_POINT);
  const income = Math.round(production.taxIncome);
  const after = step === null ? null : { income: income + step * incomePerStep, mood: mood - step * moodPerStep };
  const hover = (direction: -1 | 1) => ({
    onMouseEnter: () => setStep(direction),
    onMouseLeave: () => setStep(null),
    onFocus: () => setStep(direction),
    onBlur: () => setStep(null),
  });

  return (
    <section className="panel tax-panel">
      <div className="tax-panel__head">
        <h2>Taxes</h2>
        <span className="tax-panel__control">
          <button
            type="button"
            disabled={rate <= MIN_TAX_RATE}
            onClick={() => dispatch((s) => setTaxRate(s, s.taxRate - TAX_RATE_STEP))}
            {...hover(-1)}
            aria-label="Lower taxes"
            title={`Lower taxes: −${incomePerStep} ${CURRENCY_SYMBOL}/day, +${moodPerStep} support`}
          >
            −
          </button>
          <strong className="tax-panel__rate">{percent}%</strong>
          <button
            type="button"
            disabled={rate >= MAX_TAX_RATE}
            onClick={() => dispatch((s) => setTaxRate(s, s.taxRate + TAX_RATE_STEP))}
            {...hover(1)}
            aria-label="Raise taxes"
            title={`Raise taxes: +${incomePerStep} ${CURRENCY_SYMBOL}/day, −${moodPerStep} support`}
          >
            +
          </button>
        </span>
      </div>
      {/* The rate on a scale from the lowest to the highest allowed, with
          what people make of each stretch of it. */}
      <div className="tax-panel__gauge">
        <Gauge
          min={MIN_TAX_RATE * 100}
          max={MAX_TAX_RATE * 100}
          size="lg"
          segments={withPreview(
            percent - MIN_TAX_RATE * 100,
            percent <= accepted * 100 ? "good" : percent <= TAX_GRUMBLE_PERCENT ? "warn" : "bad",
            step === null ? null : step * TAX_RATE_STEP * 100,
          )}
          zones={[
            { from: MIN_TAX_RATE * 100, to: accepted * 100, tone: "good", label: "Accepted", hint: "People accept taxes up to this rate" },
            { from: accepted * 100, to: Math.max(accepted * 100, TAX_GRUMBLE_PERCENT), tone: "warn", label: "Grumbling", hint: "Each point above costs support" },
            { from: TAX_GRUMBLE_PERCENT, to: MAX_TAX_RATE * 100, tone: "bad", label: "Angry", hint: "Heavy taxes: support falls fast" },
          ]}
          label={`Tax rate ${percent}%, people accept ${Math.round(accepted * 100)}%`}
        />
      </div>
      <div className="tax-panel__effects">
        <span className="tax-panel__effect is-gain" title={`Tax income, ${CURRENCY_SYMBOL} a day at this rate`}>
          <StatIcon type="treasury" size={18} />
          <strong>+{income}/d</strong>
          {after && <span className="tax-panel__after">→ {formatRate(after.income)}</span>}
        </span>
        <span
          className={`tax-panel__effect ${mood < 0 ? "is-loss" : mood > 0 ? "is-gain" : ""}`}
          title={`Support from taxes: people accept ${Math.round(accepted * 100)}%; every point above costs support, every point below earns it`}
        >
          <StatIcon type="popularity" size={18} />
          <strong>{formatSigned(mood, true)}</strong>
          {after && <span className="tax-panel__after">→ {formatSigned(after.mood, true)}</span>}
        </span>
      </div>
    </section>
  );
}
