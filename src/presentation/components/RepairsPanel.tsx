// Broken buildings, and the ones a repair crew is already working on. Only
// shown when there's something to fix — a quiet economy tab otherwise.
import "./RepairsPanel.css";
import { canRepairBuilding, repairBuilding } from "../../application/actions";
import { REPAIR_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getRepairCost } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { playRepair } from "../audio/sound";
import { BuildingIcon } from "./BuildingIcon";
import { CostChips, ResourceChip, TreasuryChip } from "./CostChips";

export function WrenchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <path
        d="M4.8,-8.4 A4.6,4.6 0 0 0 -0.6,-2.6 L-7.6,4.4 A1.9,1.9 0 0 0 -4.9,7.1 L2.1,0.1 A4.6,4.6 0 0 0 7.9,-5.3 L5.1,-2.5 L2.5,-3.1 L1.9,-5.7 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RepairsPanel({ state, dispatch }: { state: GameState; dispatch: (action: (state: GameState) => GameState) => void }) {
  // Broken or under repair; not held by rebels or ruined by a crisis, which come back by themselves.
  const damaged = state.placedBuildings.filter((b) => b.condition === "broken" || b.condition === "repairing");
  if (damaged.length === 0) return null;
  const repairCostMultiplier = getModifiers(state).repairCostMultiplier;

  return (
    <section className="panel repairs-panel">
      <h2>
        <WrenchIcon size={18} /> Repairs
      </h2>
      <ul className="repairs-panel__list">
        {damaged.map((building) => {
          const cost = getRepairCost(building.type, repairCostMultiplier);
          const isRepairing = building.condition === "repairing";
          const daysLeft = building.repairDaysRemaining ?? REPAIR_DAYS;
          return (
            <li key={building.id} className={`repairs-panel__item ${isRepairing ? "is-repairing" : "is-broken"}`}>
              <span className="repairs-panel__icon" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={building.type} x={0} y={0} size={7} />
                </svg>
                {!isRepairing && (
                  <span className="repairs-panel__badge">
                    <WrenchIcon size={11} />
                  </span>
                )}
              </span>
              <span className="repairs-panel__where">{getProvinceName(building.provinceId)}</span>
              {isRepairing ? (
                <span className="repairs-panel__progress" title={`${daysLeft} days until it's back in service`}>
                  <span className="progress-bar">
                    <span className="progress-bar__fill" style={{ width: `${Math.round((1 - daysLeft / REPAIR_DAYS) * 100)}%` }} />
                  </span>
                  {daysLeft}d
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-primary repairs-panel__button"
                  disabled={!canRepairBuilding(state, building.id)}
                  title={`Repair: back in service ${REPAIR_DAYS} days after paying`}
                  onClick={() => {
                    playRepair();
                    dispatch((s) => repairBuilding(s, building.id));
                  }}
                >
                  <WrenchIcon />
                  <CostChips>
                    <TreasuryChip amount={cost.treasury} />
                    <ResourceChip type={cost.resourceType} amount={cost.resourceAmount} />
                  </CostChips>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
