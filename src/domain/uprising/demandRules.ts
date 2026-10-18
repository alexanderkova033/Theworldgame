// Demands: what a province asks for by letter, and what each answer does.
// Unrest isn't only want: now and then the workers of a province with
// factories ask for a pay rise, however well it is doing. Granted, the
// country pays them more for a year and the province calms; refused, they
// down tools and the province sits in dispute for four months, its mood
// well below the nation's. In a steady country that is strikes; in a shaky
// one it is riots, and riots left long enough become an uprising.
//
// Rebels send their terms two weeks after rising, and again two months
// after each refusal: an amnesty, or a year without taxes. Either ends the
// uprising in peace, leaving no grievance. Refused, the uprising hardens.
import {
  DEMAND_DISPUTE_UNREST,
  DEMAND_MIN_STABILITY,
  DEMAND_PAY_RISE_PER_DAY,
  REBEL_TERMS_AFTER_DAYS,
  REBEL_TERMS_AGAIN_DAYS,
} from "../constants";
import { dayNumber } from "../country/calendar";
import type { GameDate } from "../country/types";
import { isWorking } from "../maintenance/maintenanceRules";
import type { PlacedBuilding, ProvinceState } from "../provinces/types";
import type { Uprising } from "./types";

// Still in force today: set, and not yet run out.
export function isInForce(until: GameDate | null, today: GameDate): boolean {
  return until !== null && dayNumber(today) < dayNumber(until);
}

function workingFactories(placed: PlacedBuilding[], provinceId: string): number {
  return placed.filter((b) => b.provinceId === provinceId && b.type === "factory" && isWorking(b)).length;
}

// Workers who might ask: a province with working factories, orderly enough
// that this is about wanting more rather than despair, not risen, not
// already in dispute, and not already paid more.
export function mayAskForPayRise(province: ProvinceState, provinceId: string, placed: PlacedBuilding[], today: GameDate): boolean {
  return (
    province.uprising === null &&
    province.stability >= DEMAND_MIN_STABILITY &&
    !isInForce(province.disputeUntil, today) &&
    !isInForce(province.payRiseUntil, today) &&
    workingFactories(placed, provinceId) > 0
  );
}

// Which province asks, the more factories the likelier; null if none may.
export function pickPayRiseProvince(provinces: Record<string, ProvinceState>, placed: PlacedBuilding[], today: GameDate): string | null {
  const askers = Object.entries(provinces).filter(([id, p]) => mayAskForPayRise(p, id, placed, today));
  const total = askers.reduce((sum, [id]) => sum + workingFactories(placed, id), 0);
  if (total === 0) return null;
  let pick = Math.random() * total;
  return askers.find(([id]) => (pick -= workingFactories(placed, id)) < 0)?.[0] ?? askers[askers.length - 1][0];
}

// What the pay rises granted cost the country each day.
export function getPayRiseBill(provinces: Record<string, ProvinceState>, today: GameDate): number {
  return Object.values(provinces).filter((p) => isInForce(p.payRiseUntil, today)).length * DEMAND_PAY_RISE_PER_DAY;
}

// How far below the nation's a province's mood sits while it is in dispute.
export function getDisputeUnrest(province: ProvinceState, today: GameDate): number {
  return isInForce(province.disputeUntil, today) ? DEMAND_DISPUTE_UNREST : 0;
}

// Rebels write two weeks after rising, then two months after each refusal.
export function rebelsSendTerms(uprising: Uprising, today: GameDate): boolean {
  const day = dayNumber(today);
  if (day - dayNumber(uprising.since) < REBEL_TERMS_AFTER_DAYS) return false;
  return uprising.lastTerms === null || day - dayNumber(uprising.lastTerms) >= REBEL_TERMS_AGAIN_DAYS;
}
