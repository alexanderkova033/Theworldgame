// Step 7b of the day: a province that has rioted long enough rises; a risen
// one gains or loses rebel strength, and one worn down to nothing is over.
// See domain/uprising for the rules.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { UNREST_EASE_MARGIN, UNREST_RIOTS_BELOW, UPRISING_GRIEVANCE_DAYS } from "../../domain/constants";
import { addDays } from "../../domain/country/calendar";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import type { PlacedBuilding, ProvinceState } from "../../domain/provinces/types";
import { getRebelStrengthChange, recallUnpaidMilitia, returnBuildings, seizeBuildings, shouldRise, startUprising } from "../../domain/uprising/uprisingRules";
import type { UnrestStage } from "../../domain/unrest/types";
import type { Workforce } from "../../domain/workforce/types";
import { log, type Day } from "./dayContext";

export interface Uprisings {
  provinces: GameState["provinces"];
  placedBuildings: PlacedBuilding[];
}

export function tendUprisings(
  day: Day,
  working: GameState, // its provinces as the people step left them
  today: { stability: number; unrestStage: UnrestStage; capacityByProvince: Record<string, number>; workforce: Workforce },
): Uprisings {
  const date = day.start.date;
  let placedBuildings = working.placedBuildings;
  const provinces: Record<string, ProvinceState> = {};
  const militiaOpen = isFeatureOpen(working, "unrest");
  const riotDaysToRise = getDifficulty(working.difficulty).uprisingRiotDays;

  for (const [id, before] of Object.entries(recallUnpaidMilitia(today.workforce, working.provinces))) {
    // Only rioting on its own counts: when the whole country riots, that is
    // the nation's trouble (and collapse its end), not one province's.
    const riotingAlone = before.unrestStage === "riots" && today.unrestStage !== "riots";
    let p: ProvinceState = { ...before, riotDays: riotingAlone ? before.riotDays + 1 : 0 };
    const name = getProvinceName(id);

    if (shouldRise(p, date, riotDaysToRise)) {
      p = { ...p, uprising: startUprising(p, date) };
      placedBuildings = seizeBuildings(placedBuildings, id);
      log(day, {
        date,
        message: `${name} has risen against the government! Rebels hold its farms and works, and it pays no taxes. ${militiaOpen ? "Send in the militia, or calm the country and wait it out." : "Calm the country and it will burn out."}`,
        severity: "danger",
        topic: "uprising",
      });
    } else if (p.uprising) {
      const homelessShare = p.population > 0 ? Math.max(0, p.population - (today.capacityByProvince[id] ?? 0)) / p.population : 0;
      const change = getRebelStrengthChange(p.uprising, homelessShare, today.stability, today.workforce.police);
      const strength = Math.min(100, Math.max(0, p.uprising.strength + change.total));
      if (strength <= 0) {
        // Over. Put down by force, it remembers; burnt out, it doesn't.
        const byForce = p.uprising.militia > 0;
        placedBuildings = returnBuildings(placedBuildings, id);
        p = {
          ...p,
          uprising: null,
          riotDays: 0,
          stability: UNREST_RIOTS_BELOW + UNREST_EASE_MARGIN,
          unrestStage: "strikes",
          aggrievedUntil: byForce ? addDays(date, UPRISING_GRIEVANCE_DAYS) : p.aggrievedUntil,
        };
        log(day, {
          date,
          message: byForce
            ? `The uprising in ${name} is put down. Its farms and works are yours again, but it will not forget for a while.`
            : `The uprising in ${name} burns out. Its farms and works are yours again.`,
          severity: "info",
          topic: "uprising",
        });
      } else {
        p = { ...p, uprising: { ...p.uprising, strength } };
      }
    }

    // A risen province is lawless: it riots, whatever its own mood.
    if (p.uprising) p = { ...p, unrestStage: "riots", stability: Math.min(p.stability, UNREST_RIOTS_BELOW) };
    provinces[id] = p;
  }
  return { provinces, placedBuildings };
}
