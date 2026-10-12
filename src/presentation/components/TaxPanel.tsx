// The tax rate: the plainest money-versus-votes choice in the game. Every
// step up fills the treasury and costs support; every step down does the
// opposite. Both consequences are shown right next to the control.
import "./TaxPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { setTaxRate } from "../../application/actions";
import { COMFORTABLE_TAX_RATE, CURRENCY_SYMBOL, MAX_TAX_RATE, MIN_TAX_RATE, TAX_POPULARITY_PER_POINT, TAX_RATE_STEP } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { Gauge } from "./Gauge";
import { StatIcon } from "./StatIcon";

// Where the "grumbling" stretch of the tax gauge ends — a picture of the
// scale, not a rule: support falls by the same amount per point throughout.
const TAX_GRUMBLE_PERCENT = 25;

interface TaxPanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function TaxPanel({ state, production, dispatch }: TaxPanelProps) {
  const rate = state.taxRate;
  const percent = Math.round(rate * 100);
  const mood = Math.round((COMFORTABLE_TAX_RATE - rate) * 100 * TAX_POPULARITY_PER_POINT);
  // What one step would change, so the trade-off is visible before clicking.
  const incomePerStep = rate > 0 ? Math.round((production.taxIncome / rate) * TAX_RATE_STEP) : 0;
  const moodPerStep = Math.round(TAX_RATE_STEP * 100 * TAX_POPULARITY_PER_POINT);

  return (
    <section className="panel tax-panel">
      <div className="tax-panel__head">
        <h2>Taxes</h2>
        <span className="tax-panel__control">
          <button
            type="button"
            disabled={rate <= MIN_TAX_RATE}
            onClick={() => dispatch((s) => setTaxRate(s, s.taxRate - TAX_RATE_STEP))}
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
          segments={[{ value: percent - MIN_TAX_RATE * 100, tone: percent <= COMFORTABLE_TAX_RATE * 100 ? "good" : percent <= TAX_GRUMBLE_PERCENT ? "warn" : "bad" }]}
          zones={[
            { from: MIN_TAX_RATE * 100, to: COMFORTABLE_TAX_RATE * 100, tone: "good", label: "Accepted", hint: "People accept taxes up to this rate" },
            { from: COMFORTABLE_TAX_RATE * 100, to: TAX_GRUMBLE_PERCENT, tone: "warn", label: "Grumbling", hint: "Each point above costs support" },
            { from: TAX_GRUMBLE_PERCENT, to: MAX_TAX_RATE * 100, tone: "bad", label: "Angry", hint: "Heavy taxes: support falls fast" },
          ]}
          label={`Tax rate ${percent}%, people accept ${Math.round(COMFORTABLE_TAX_RATE * 100)}%`}
        />
      </div>
      <div className="tax-panel__effects">
        <span className="tax-panel__effect is-gain" title="Tax income per day at this rate">
          <StatIcon type="treasury" size={18} />
          <strong>+{Math.round(production.taxIncome)}</strong>
          {CURRENCY_SYMBOL}/d
        </span>
        <span
          className={`tax-panel__effect ${mood < 0 ? "is-loss" : mood > 0 ? "is-gain" : ""}`}
          title={`Support from taxes: people accept ${Math.round(COMFORTABLE_TAX_RATE * 100)}%; every point above costs support, every point below earns it`}
        >
          <StatIcon type="popularity" size={18} />
          <strong>{mood > 0 ? `+${mood}` : mood}</strong>
          support
        </span>
      </div>
    </section>
  );
}
