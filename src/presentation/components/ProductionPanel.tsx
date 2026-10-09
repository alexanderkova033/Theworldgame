// Where today's treasury and food nets actually come from. Shown as two
// proportion bars rather than a grid of numbers: the *shape* of the bar is
// the answer ("almost all my income is tax", "I'm eating more than I grow"),
// with the figures riding along as labels rather than being the whole panel.
import "./ProductionPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { formatCompact } from "../formatNumber";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ProductionPanelProps {
  production: DailyProductionSummary;
}

function signed(value: number): string {
  // `|| 0` normalizes a -0 result (e.g. -Math.round(0)) — otherwise it both
  // reads as "positive" for the sign prefix and prints its own literal
  // minus sign, producing a stray "+-0".
  const rounded = Math.round(value) || 0;
  return `${rounded >= 0 ? "+" : ""}${formatCompact(rounded)}`;
}

interface Part {
  icon: StatIconType;
  label: string;
  value: number; // positive = adds to the net, negative = subtracts
}

interface LedgerProps {
  title: string;
  suffix?: string;
  net: number;
  parts: Part[];
}

// One net figure with its inputs drawn to scale: each part's share of the
// total gross flow sets its segment width, so a farm finishing visibly
// widens the green half of the food bar.
function Ledger({ title, suffix = "", net, parts }: LedgerProps) {
  const gross = parts.reduce((sum, p) => sum + Math.abs(p.value), 0) || 1;
  const rounded = Math.round(net) || 0;

  return (
    <div className="production-panel__ledger">
      <div className="production-panel__ledger-head">
        <span className="production-panel__ledger-title">{title}</span>
        <span className={`production-panel__ledger-net ${rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : ""}`}>
          {signed(net)}
          {suffix}/d
        </span>
      </div>

      <div className="production-panel__bar">
        {parts.map((part) => (
          <span
            key={part.label}
            className={`production-panel__bar-seg ${part.value >= 0 ? "is-gain" : "is-loss"}`}
            style={{ width: `${(Math.abs(part.value) / gross) * 100}%` }}
            title={`${part.label}: ${signed(part.value)}${suffix}/d`}
          />
        ))}
      </div>

      <div className="production-panel__keys">
        {parts.map((part) => (
          <span className="production-panel__key" key={part.label} title={part.label}>
            <span className={`production-panel__key-dot ${part.value >= 0 ? "is-gain" : "is-loss"}`} />
            <StatIcon type={part.icon} size={15} />
            <span className="production-panel__key-value">
              {signed(part.value)}
              {suffix}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProductionPanel({ production }: ProductionPanelProps) {
  return (
    <section className="panel production-panel">
      <h2>Production</h2>

      <Ledger
        title="Treasury"
        suffix={` ${CURRENCY_SYMBOL}`}
        net={production.totalIncome}
        parts={[
          { icon: "treasury", label: "Tax", value: production.taxIncome },
          { icon: "industry", label: "Industry", value: production.industryIncome },
          { icon: "population", label: "Salaries", value: -production.salaries },
        ]}
      />

      <Ledger
        title="Food"
        net={production.netFood}
        parts={[
          { icon: "food", label: production.season === "winter" ? "Farmed (winter)" : "Farmed", value: production.farmFood },
          { icon: "industry", label: "Granaries & canneries", value: production.processedFood },
          { icon: "population", label: "Eaten", value: -production.foodConsumed },
        ]}
      />

      <div className="production-panel__aside" title="Research progress per day, all three areas together">
        <StatIcon type="research" size={17} />
        <span>+{production.researchPerDay.toFixed(1)}/d</span>
      </div>
    </section>
  );
}
