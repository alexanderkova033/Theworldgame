// The tax rate: the plainest money-versus-votes choice in the game, all the
// way from handouts (the state pays people) to rates so high that people
// stop paying and riot. Both consequences are shown right next to the
// control, and pointing at − or + shows them after the step, before it's
// taken.
import "./TaxPanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { setTaxRate } from "../../application/actions";
import { CURRENCY_SYMBOL, MAX_TAX_RATE, MIN_TAX_RATE, TAX_RATE_STEP, TAX_RIOT_RATE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getCollectedTaxRate } from "../../domain/economy/economyRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { getAcceptedTaxRate, getTaxMood } from "../../domain/politics/politicsRules";
import { Gauge, withPreview } from "./Gauge";
import { StatIcon } from "./StatIcon";
import { formatRate, formatSigned } from "../formatNumber";

interface TaxPanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function TaxPanel({ state, production, dispatch }: TaxPanelProps) {
  const [step, setStep] = useState<-1 | 1 | null>(null);
  const rate = state.taxRate;
  const percent = Math.round(rate * 100);
  const riotPercent = TAX_RIOT_RATE * 100;
  // What people accept, after laws and the party's creed (see domain/policy).
  const tolerance = getModifiers(state).taxTolerance;
  const accepted = getAcceptedTaxRate(tolerance);
  // What a step would change, so the trade-off is visible before clicking.
  const at = (r: number) => ({ income: Math.round(production.taxBase * getCollectedTaxRate(r)), mood: Math.round(getTaxMood(r, tolerance)) });
  const now = at(rate);
  const lower = at(rate - TAX_RATE_STEP);
  const higher = at(rate + TAX_RATE_STEP);
  const after = step === null ? null : step < 0 ? lower : higher;
  const hover = (direction: -1 | 1) => ({
    onMouseEnter: () => setStep(direction),
    onMouseLeave: () => setStep(null),
    onFocus: () => setStep(direction),
    onBlur: () => setStep(null),
  });
  const stepTip = (name: string, to: { income: number; mood: number }) => `${name}: ${formatSigned(to.income - now.income)} ${CURRENCY_SYMBOL}/day, ${formatSigned(to.mood - now.mood)} support`;

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
            title={stepTip("Lower taxes", lower)}
          >
            −
          </button>
          <strong className="tax-panel__rate">{percent < 0 ? `−${-percent}` : percent}%</strong>
          <button
            type="button"
            disabled={rate >= MAX_TAX_RATE}
            onClick={() => dispatch((s) => setTaxRate(s, s.taxRate + TAX_RATE_STEP))}
            {...hover(1)}
            aria-label="Raise taxes"
            title={stepTip("Raise taxes", higher)}
          >
            +
          </button>
        </span>
      </div>
      {/* The rate on a scale from handouts to riots, with what people make of
          each stretch of it. */}
      <div className="tax-panel__gauge">
        <Gauge
          min={MIN_TAX_RATE * 100}
          max={MAX_TAX_RATE * 100}
          size="lg"
          segments={withPreview(
            percent - MIN_TAX_RATE * 100,
            percent <= accepted * 100 ? "good" : percent <= riotPercent ? "warn" : "bad",
            step === null ? null : step * TAX_RATE_STEP * 100,
          )}
          zones={[
            { from: MIN_TAX_RATE * 100, to: 0, tone: "good", label: "Handouts", hint: "Below zero the state pays people. It costs money every day and stops when the treasury runs dry." },
            { from: 0, to: accepted * 100, tone: "good", label: "Accepted", hint: "People accept taxes up to this rate" },
            { from: accepted * 100, to: riotPercent, tone: "warn", label: "Angry", hint: "Each point above costs support. Past 40%, people start hiding what they earn, so less comes in and anger climbs faster." },
            { from: riotPercent, to: MAX_TAX_RATE * 100, tone: "bad", label: "Riots", hint: "Past 50%, order itself breaks down: stability falls every day, and the higher the rate the faster. Very little of the extra is ever collected." },
          ]}
          label={`Tax rate ${percent}%, people accept ${Math.round(accepted * 100)}%`}
        />
      </div>
      <div className="tax-panel__effects">
        <span className={`tax-panel__effect ${now.income < 0 ? "is-loss" : "is-gain"}`} title={now.income < 0 ? `Handouts: what the state pays people, ${CURRENCY_SYMBOL} a day` : `Tax income, ${CURRENCY_SYMBOL} a day at this rate. Above 40%, people hide what they earn and less is collected.`}>
          <StatIcon type="treasury" size={18} />
          <strong>{formatRate(now.income)}</strong>
          {after && <span className="tax-panel__after">→ {formatRate(after.income)}</span>}
        </span>
        <span
          className={`tax-panel__effect ${now.mood < 0 ? "is-loss" : now.mood > 0 ? "is-gain" : ""}`}
          title={`Support from taxes: people accept ${Math.round(accepted * 100)}%; every point above costs support, every point below earns it`}
        >
          <StatIcon type="popularity" size={18} />
          <strong>{formatSigned(now.mood, true)}</strong>
          {after && <span className="tax-panel__after">→ {formatSigned(after.mood, true)}</span>}
        </span>
      </div>
    </section>
  );
}
