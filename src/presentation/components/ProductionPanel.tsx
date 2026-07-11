import "./ProductionPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { RESOURCE_TYPES } from "../../domain/resources/types";
import { formatCompact } from "../formatNumber";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

interface ProductionPanelProps {
  production: DailyProductionSummary;
}

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

function formatSigned(value: number, suffix = ""): string {
  // `|| 0` normalizes a -0 result (e.g. -Math.round(0)) — otherwise it both
  // reads as "positive" for the sign prefix and prints its own literal
  // minus sign, producing a stray "+-0".
  const rounded = Math.round(value) || 0;
  return `${rounded >= 0 ? "+" : ""}${formatCompact(rounded)}${suffix}`;
}

function Row({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="production-panel__row">
      <span className="production-panel__row-label">
        {icon} {label}
      </span>
      <span className={tone ? `production-panel__row-value is-${tone}` : "production-panel__row-value"}>{value}</span>
    </div>
  );
}

// Everything the nation is producing/consuming right now, itemized rather
// than just the net totals already glanceable on the ResourceTicker — see
// getDailyProductionSummary.ts, which this renders directly.
export function ProductionPanel({ production }: ProductionPanelProps) {
  return (
    <section className="panel production-panel">
      <h2>Production</h2>
      <p className="panel-hint">What today's numbers actually are, itemized — the ticker up top only shows the net.</p>

      <h3>Treasury</h3>
      <Row icon={<StatIcon type="treasury" size={18} />} label="Tax income" value={formatSigned(production.taxIncome, ` ${CURRENCY_SYMBOL}`)} />
      <Row icon={<StatIcon type="treasury" size={18} />} label="Industry income" value={formatSigned(production.industryIncome, ` ${CURRENCY_SYMBOL}`)} />
      <Row icon={<StatIcon type="army" size={18} />} label="Army upkeep" value={formatSigned(-production.expenses, ` ${CURRENCY_SYMBOL}`)} />
      <Row
        icon={<StatIcon type="treasury" size={18} />}
        label="Net treasury"
        value={formatSigned(production.netTreasury, ` ${CURRENCY_SYMBOL}/day`)}
        tone={production.netTreasury >= 0 ? "gain" : "loss"}
      />

      <h3>Food</h3>
      <Row icon={<StatIcon type="food" size={18} />} label="Produced (farms)" value={formatSigned(production.foodProduced)} />
      <Row icon={<StatIcon type="population" size={18} />} label="Consumed (population)" value={formatSigned(-production.foodConsumed)} />
      <Row
        icon={<StatIcon type="food" size={18} />}
        label="Net food"
        value={formatSigned(production.netFood, "/day")}
        tone={production.netFood >= 0 ? "gain" : "loss"}
      />

      <h3>Raw Resources</h3>
      {RESOURCE_TYPES.map((type) => (
        <Row
          key={type}
          icon={
            <svg width={18} height={18} viewBox="-10 -10 20 20">
              <ResourceIcon type={type} size={8} />
            </svg>
          }
          label={RESOURCE_LABELS[type]}
          value={formatSigned(production.resourceProduction[type], "/day")}
          tone={production.resourceProduction[type] > 0 ? "gain" : undefined}
        />
      ))}

      <h3>Research</h3>
      <Row
        icon={<StatIcon type="research" size={18} />}
        label="Research points"
        value={formatSigned(production.researchPointsPerDay, "/day")}
        tone={production.researchPointsPerDay > 0 ? "gain" : undefined}
      />
    </section>
  );
}
