// At a month's end, those at work have learned a little more of their trade,
// and the people the player moved go where they were sent. Until then they
// finish the month in their old jobs.
import { isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameDate, GameState } from "../../domain/country/types";
import { getHiredInTrades, getLabourSituation, SECTORS, type LabourSituation, type Sector } from "../../domain/labour/labourRules";
import { advanceTraining } from "../../domain/labour/trainingRules";
import { log, type Day } from "./dayContext";

const SECTOR_NAMES: Record<Sector, string> = { food: "farms and food", school: "schools", industry: "factories" };

export function turnOfTheWorkMonth(day: Day, working: GameState, date: GameDate, labour: LabourSituation): Partial<Pick<GameState, "trained" | "workPlan" | "workPlanNext">> {
  if (!isFirstDayOfMonth(date)) return {};
  const trained = advanceTraining(working.trained, getHiredInTrades(labour), labour.workers);
  if (!working.workPlanNext) return { trained };

  const workPlan = working.workPlanNext === "automatic" ? null : working.workPlanNext;
  const after = getLabourSituation({ ...working, workPlan });
  const [sector, moved] = SECTORS.map((s) => [s, after.sectors[s].hired - labour.sectors[s].hired] as const).sort((a, b) => b[1] - a[1])[0];
  const message = moved >= 1 ? `${Math.round(moved).toLocaleString()} people moved to ${SECTOR_NAMES[sector]}.` : workPlan ? "Your limits on where people work take effect." : "Jobs are filled automatically again.";
  log(day, { date: day.start.date, message, severity: "info", topic: "workers" });
  return { trained, workPlan, workPlanNext: null };
}
