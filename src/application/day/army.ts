// Step 7c of the day: every country's regiments drill or march a day (see
// domain/military). Yours are paid with the other wages (day/money.ts);
// when the treasury is empty after paying them, the newest of yours goes
// home unpaid.
import type { GameState } from "../../domain/country/types";
import { getLinkedIslands } from "../../domain/islands/islandRules";
import { advanceRegiment } from "../../domain/military/militaryRules";
import { log, type Day } from "./dayContext";

const NOTHING: ReadonlySet<string> = new Set();

export function drillTheArmy(day: Day, working: GameState, treasury: number): GameState["regiments"] {
  if (working.regiments.length === 0) return working.regiments;
  // Harbour links only matter to yours, and only on the march.
  const linked = working.regiments.some((r) => r.march && r.nationId === working.nationId) ? getLinkedIslands(working) : NOTHING;
  let regiments = working.regiments.map((r) => (r.trainingDays > 0 || r.march ? advanceRegiment(r, r.nationId === working.nationId ? linked : NOTHING) : r));
  if (treasury < 0) {
    const yours = regiments.filter((r) => r.nationId === working.nationId);
    const newest = yours[yours.length - 1];
    if (newest) {
      regiments = regiments.filter((r) => r !== newest);
      log(day, { date: day.start.date, message: "The treasury is empty, and a regiment goes home unpaid.", severity: "warning", topic: "money" });
    }
  }
  // Nothing moved: keep the same list, so the map needn't redraw.
  return regiments.every((r, i) => r === working.regiments[i]) && regiments.length === working.regiments.length ? working.regiments : regiments;
}
