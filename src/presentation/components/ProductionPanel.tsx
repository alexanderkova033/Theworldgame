// Where today's food net actually comes from. Shown as a proportion bar
// rather than a grid of numbers: the *shape* of the bar is the answer ("I'm
// eating more than I grow"), with the figures riding along as a key under
// it — point at a stretch of the bar or a figure in the key and both light
// up. When more is eaten than grown, it says how long the store lasts.
import "./ProductionPanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { getForecasts } from "../../application/getForecasts";
import { FORECAST_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { formatAmount, formatRate, formatSigned } from "../formatNumber";
import { BuildingGlyph } from "./CauseIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ProductionPanelProps {
  state: GameState;
  production: DailyProductionSummary;
}

interface Part {
  icon: StatIconType | "granary";
  label: string;
  value: number; // positive = adds to the net, negative = subtracts
}

export function ProductionPanel({ state, production }: ProductionPanelProps) {
  const [focus, setFocus] = useState<string | null>(null);
  const parts: Part[] = [
    { icon: "food", label: production.season === "winter" ? "Farmed (winter)" : "Farmed", value: production.farmFood },
    { icon: "granary", label: "Granaries & canneries", value: production.processedFood },
    { icon: "population", label: "Eaten", value: -production.foodConsumed },
  ];
  const net = Math.round(production.netFood) || 0;
  // Each part's share of the total gross flow sets its segment width, so a
  // farm finishing visibly widens the green half of the bar.
  const gross = parts.reduce((sum, p) => sum + Math.abs(p.value), 0) || 1;
  const runOut = net < 0 ? getForecasts(state, production).food : null;
  const hover = (label: string) => ({ onMouseEnter: () => setFocus(label), onMouseLeave: () => setFocus(null) });
  const lit = (label: string) => (focus === label ? "is-focus" : focus ? "is-dim" : "");

  return (
    <section className="panel production-panel">
      <div className="production-panel__head">
        <h2>Food</h2>
        <span className={`production-panel__net ${net > 0 ? "is-gain" : net < 0 ? "is-loss" : ""}`} title="Food a day, all told">
          {formatRate(net)}
        </span>
      </div>

      <div className="production-panel__bar">
        {parts.map((part) => (
          <span
            key={part.label}
            className={`production-panel__bar-seg ${part.value >= 0 ? "is-gain" : "is-loss"} ${lit(part.label)}`}
            style={{ width: `${(Math.abs(part.value) / gross) * 100}%` }}
            title={`${part.label}: ${formatRate(part.value)}`}
            {...hover(part.label)}
          />
        ))}
      </div>

      <div className="production-panel__keys">
        {parts.map((part) => (
          <span className={`production-panel__key ${lit(part.label)}`} key={part.label} title={part.label} {...hover(part.label)}>
            <span className={`production-panel__key-dot ${part.value >= 0 ? "is-gain" : "is-loss"}`} />
            {part.icon === "granary" ? <BuildingGlyph type="granary" size={15} /> : <StatIcon type={part.icon} size={15} />}
            <span className="production-panel__key-value">{formatSigned(part.value)}</span>
          </span>
        ))}
      </div>

      <p className="production-panel__store">
        <StatIcon type="food" size={18} />
        <strong>{formatAmount(Math.floor(state.stats.food))}</strong>
        {net < 0 &&
          (runOut ? (
            <span className="is-loss">lasts {runOut.days} days</span>
          ) : (
            <span>lasts over {FORECAST_DAYS} days</span>
          ))}
      </p>
    </section>
  );
}
