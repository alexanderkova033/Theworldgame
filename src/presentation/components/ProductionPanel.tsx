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

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  emphasize?: boolean;
}

// One metric, icon-first and compact — a small grid of these replaces the
// old header-per-category row list, so the same breakdown reads at a glance
// in a fraction of the vertical space.
function Tile({ icon, label, value, suffix = "", emphasize }: TileProps) {
  const rounded = Math.round(value) || 0;
  const tone = rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : "";
  return (
    <div className={`production-panel__tile ${emphasize ? "is-emphasized" : ""}`}>
      <span className="production-panel__tile-icon">{icon}</span>
      <span className="production-panel__tile-label">{label}</span>
      <span className={`production-panel__tile-value ${tone}`}>{formatSigned(value, suffix)}</span>
    </div>
  );
}

// Everything the nation is producing/consuming right now, itemized rather
// than just the net totals already glanceable on the ResourceTicker — see
// getDailyProductionSummary.ts, which this renders directly. Laid out as a
// dense tile grid instead of a long labeled list so the full breakdown fits
// in a fraction of the space.
export function ProductionPanel({ production }: ProductionPanelProps) {
  return (
    <section className="panel production-panel">
      <h2>Production</h2>
      <p className="panel-hint">Today's numbers, itemized — the ticker up top only shows the net.</p>

      <div className="production-panel__grid">
        <Tile icon={<StatIcon type="treasury" size={18} />} label="Tax" value={production.taxIncome} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile icon={<StatIcon type="treasury" size={18} />} label="Industry" value={production.industryIncome} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile icon={<StatIcon type="army" size={18} />} label="Upkeep" value={-production.expenses} suffix={` ${CURRENCY_SYMBOL}`} />
        <Tile
          icon={<StatIcon type="treasury" size={18} />}
          label="Net Treasury"
          value={production.netTreasury}
          suffix={` ${CURRENCY_SYMBOL}`}
          emphasize
        />

        <Tile icon={<StatIcon type="food" size={18} />} label="Farmed" value={production.foodProduced} />
        <Tile icon={<StatIcon type="population" size={18} />} label="Eaten" value={-production.foodConsumed} />
        <Tile icon={<StatIcon type="food" size={18} />} label="Net Food" value={production.netFood} emphasize />

        {RESOURCE_TYPES.map((type) => (
          <Tile
            key={type}
            icon={
              <svg width={18} height={18} viewBox="-10 -10 20 20">
                <ResourceIcon type={type} size={8} />
              </svg>
            }
            label={RESOURCE_LABELS[type]}
            value={production.resourceProduction[type]}
          />
        ))}

        <Tile icon={<StatIcon type="research" size={18} />} label="Research" value={production.researchPointsPerDay} />
      </div>
    </section>
  );
}
