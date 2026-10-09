// The tax rate: the plainest money-versus-votes choice in the game. Every
// step up fills the treasury and costs support; every step down does the
// opposite. Both consequences are shown right next to the control.
import "./TaxPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { setTaxRate } from "../../application/actions";
import { COMFORTABLE_TAX_RATE, CURRENCY_SYMBOL, MAX_TAX_RATE, MIN_TAX_RATE, TAX_POPULARITY_PER_POINT, TAX_RATE_STEP } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { StatIcon } from "./StatIcon";

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
      <div className="tax-panel__effects">
        <span className="tax-panel__effect">
          <StatIcon type="treasury" size={16} />
          <span>
            Brings in <strong>+{Math.round(production.taxIncome)}</strong> {CURRENCY_SYMBOL}/day
          </span>
        </span>
        <span className={`tax-panel__effect ${mood < 0 ? "is-loss" : mood > 0 ? "is-gain" : ""}`}>
          <StatIcon type="popularity" size={16} />
          <span>
            Support <strong>{mood > 0 ? `+${mood}` : mood}</strong>
            {mood === 0 ? " — people accept this rate" : mood < 0 ? " — people resent it" : " — people like it"}
          </span>
        </span>
      </div>
    </section>
  );
}
