// Broken buildings, the ones a repair crew is already working on, and the worn
// ones still to be serviced. Only shown when there's something to fix — a quiet
// economy tab otherwise.
import "./RepairsPanel.css";
import { canRepairBuilding, canServiceBuilding, getServiceOrder, repairBuilding, serviceBuilding } from "../../application/actions";
import { REPAIR_DAYS, SERVICE_CREW, SERVICE_DAYS_TRAINED } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getRepairCost, getServiceDaysLeft, getServiceProgress, getWornDaysLeft, isBeingServiced, isWorn, needsService } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { playRepair } from "../audio/sound";
import { BuildingIcon } from "./BuildingIcon";
import { CostChips, ResourceChip, TreasuryChip } from "./CostChips";
import { Gauge } from "./Gauge";
import { counted } from "../../domain/plural";

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
  // Soonest to break first.
  const worn = state.placedBuildings.filter(needsService).sort((a, b) => a.wornUntilDay! - b.wornUntilDay!);
  const servicing = state.placedBuildings.filter(isBeingServiced);
  if (damaged.length === 0 && !state.placedBuildings.some(isWorn)) return null;
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
                <div className="repairs-panel__progress" title={`${counted(daysLeft, "day")} until it's back in service`}>
                  <Gauge max={1} size="sm" segments={[{ value: 1 - daysLeft / REPAIR_DAYS, tone: "good" }]} label={`Repair: ${counted(daysLeft, "day")} left`} />
                  {daysLeft}d
                </div>
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
        {servicing.map((building) => {
          const daysLeft = getServiceDaysLeft(building, state.date);
          return (
            <li key={building.id} className="repairs-panel__item is-worn is-servicing">
              <span className="repairs-panel__icon" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={building.type} x={0} y={0} size={7} />
                </svg>
              </span>
              <span className="repairs-panel__where">{getProvinceName(building.provinceId)}</span>
              <span className="repairs-panel__crew">Crew at work</span>
              <div className="repairs-panel__progress" data-tip={`${SERVICE_CREW} people are servicing it. It keeps working, and the wear is gone in ${counted(daysLeft, "day")}.`}>
                <Gauge max={1} size="sm" segments={[{ value: getServiceProgress(building, state.date), tone: "good" }]} label={`Service: ${counted(daysLeft, "day")} left`} />
                {daysLeft}d
              </div>
            </li>
          );
        })}
        {worn.map((building) => {
          const { cost, days, trainedCrew } = getServiceOrder(state, building.type);
          const daysLeft = getWornDaysLeft(building, state.date);
          return (
            <li key={building.id} className="repairs-panel__item is-worn">
              <span className="repairs-panel__icon" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={building.type} x={0} y={0} size={7} />
                </svg>
                <span className="repairs-panel__badge">!</span>
              </span>
              <span className="repairs-panel__where">{getProvinceName(building.provinceId)}</span>
              <span className="repairs-panel__days" title={`Worn: breaks down in ${counted(daysLeft, "day")} unless serviced`}>
                {daysLeft}d
              </span>
              <span className={`repairs-panel__crew ${trainedCrew ? "" : "is-untrained"}`}>{trainedCrew ? "Trained crew" : "Untrained crew"}, {days}d</span>
              <button
                type="button"
                className="btn-primary repairs-panel__button"
                disabled={!canServiceBuilding(state, building.id)}
                data-tip={`${SERVICE_CREW} people from ${getProvinceName(building.provinceId)} take ${counted(days, "day")}. It keeps working, and its wear stops counting down. ${trainedCrew ? `Trained crews take ${SERVICE_DAYS_TRAINED} days.` : `Fewer than 9 in 10 of those in this trade are trained, so the crew is slower and costs half as much again.`}`}
                onClick={() => {
                  playRepair();
                  dispatch((s) => serviceBuilding(s, building.id));
                }}
              >
                Service
                <CostChips>
                  <TreasuryChip amount={cost.treasury} />
                  <ResourceChip type={cost.resourceType} amount={cost.resourceAmount} />
                </CostChips>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
