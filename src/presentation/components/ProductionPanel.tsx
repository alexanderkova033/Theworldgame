import "./ProductionPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { formatCompact } from "../formatNumber";
import { StatIcon } from "./StatIcon";

interface ProductionPanelProps {
  production: DailyProductionSummary;
}

function formatSigned(value: number, suffix = ""): string {
  // `|| 0` normalizes a -0 result (e.g. -Math.round(0)) — otherwise it both
  // reads as "positive" for the sign prefix and prints its own literal
  // minus sign, producing a stray "+-0".
  const rounded = Math.round(value) || 0;
  return `${rounded >= 0 ? "+" : ""}${formatCompact(rounded)}${suffix}`;
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}

// One metric, icon-first and compact.
function Tile({ icon, label, value, suffix = "" }: TileProps) {
  const rounded = Math.round(value) || 0;
  const tone = rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : "";
  return (
    <div className="production-panel__tile">
      <span className="production-panel__tile-icon">{icon}</span>
      <span className="production-panel__tile-label">{label}</span>
      <span className={`production-panel__tile-value ${tone}`}>{formatSigned(value, suffix)}</span>
    </div>
  );
}

// The components behind today's net treasury/food — the two net figures
// themselves, plus every raw resource's own daily delta, are already
// glanceable on the always-visible ResourceTicker, so this only shows what
// the ticker doesn't: the itemized breakdown of how those nets are made up.
export function ProductionPanel({ production }: ProductionPanelProps) {
  return (
    <section className="panel production-panel">
      <h2>Production</h2>
      <p className="panel-hint">What today's treasury and food net are actually made of.</p>

      <div className="production-panel__grid">
        <Tile icon={<StatIcon type="treasury" size={18} />} label="Tax" value={production.taxIncome} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile icon={<StatIcon type="treasury" size={18} />} label="Industry" value={production.industryIncome} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile icon={<StatIcon type="army" size={18} />} label="Upkeep" value={-production.expenses} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile icon={<StatIcon type="food" size={18} />} label="Farmed" value={production.foodProduced} />
        <Tile icon={<StatIcon type="population" size={18} />} label="Eaten" value={-production.foodConsumed} />
        <Tile icon={<StatIcon type="research" size={18} />} label="Research" value={production.researchPointsPerDay} />
      </div>
    </section>
  );
}
