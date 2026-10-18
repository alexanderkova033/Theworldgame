// Step 7 of the day: people are born and die, province by province against
// each one's homes, then move toward free homes and open jobs. Each
// province's own order follows the nation's, minus its own homeless and
// jobless.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import type { CountryStats, GameState } from "../../domain/country/types";
import { getHomelessTotal } from "../../domain/housing/housingRules";
import type { LabourSituation } from "../../domain/labour/labourRules";
import { updatePopulation } from "../../domain/population/populationRules";
import { applyMigration, planMigration } from "../../domain/provinces/provinceMigration";
import { isLocalTrouble, updateProvinceOrder } from "../../domain/provinces/provinceOrder";
import { getProvincePopulationTotal } from "../../domain/provinces/provincePopulation";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { isWorseStage } from "../../domain/unrest/unrestRules";
import { isInForce } from "../../domain/uprising/demandRules";
import { getSpreadUnrest } from "../../domain/uprising/uprisingRules";
import type { UnrestStage } from "../../domain/unrest/types";
import { log, type Day } from "./dayContext";

export interface People {
  provinces: GameState["provinces"];
  population: number; // the provinces' sum
}

export function movePeople(
  day: Day,
  working: GameState,
  today: {
    statsWithFood: CountryStats;
    stability: number;
    isShortage: boolean;
    capacityByProvince: Record<string, number>;
    unheatedShare: number;
    labour: LabourSituation;
    unrestStage: UnrestStage;
    homelessShare: number;
  },
): People {
  const date = day.start.date;
  const grown = Object.fromEntries(
    Object.entries(working.provinces).map(([id, province]) => [
      id,
      {
        ...province,
        population: updatePopulation(
          { ...today.statsWithFood, stability: today.stability, population: province.population },
          today.isShortage,
          today.capacityByProvince[id] ?? 0,
          today.unheatedShare,
        ),
      },
    ]),
  );
  const migrated = applyMigration(grown, planMigration(grown, today.capacityByProvince, today.labour.provinces));
  const population = getProvincePopulationTotal(migrated);

  // A province striking or rioting worse than the rest is announced.
  const order = updateProvinceOrder(migrated, today.stability, today.capacityByProvince, today.labour.provinces, date);
  for (const change of order.changes) {
    const name = getProvinceName(change.provinceId);
    if (isLocalTrouble(change.to, today.unrestStage) && isWorseStage(change.to, change.from)) {
      const disputed = isInForce(working.provinces[change.provinceId]?.disputeUntil ?? null, date);
      const stirred = getSpreadUnrest(working.provinces, change.provinceId) > 0;
      const why = disputed ? "Its workers are in dispute over pay." : stirred ? "The uprising next door has stirred it up." : "Too many there have no home or no work.";
      log(day, {
        date,
        message:
          change.to === "riots"
            ? `Riots in ${name}! ${why} ${disputed ? "Calm the country" : "Build there"}${isFeatureOpen(working, "unrest") ? ", or crack down" : ""}: it drags the whole country down.`
            : `Strikes in ${name}. ${why}`,
        severity: change.to === "riots" ? "danger" : "warning",
        topic: "provinceUnrest",
      });
    } else if (change.from === "riots" && isLocalTrouble(change.from, today.unrestStage)) {
      log(day, { date, message: `The riots in ${name} die down.`, severity: "info", topic: "provinceUnrest" });
    }
  }

  // Logged when homelessness first becomes noticeable (2%), not every day.
  if (getHomelessTotal({ ...working, provinces: order.provinces }) / Math.max(1, population) >= 0.02 && today.homelessShare < 0.02) {
    log(day, { date, message: "The homes are full and families are sleeping rough. Build more homes.", severity: "warning", topic: "homes" });
  }
  return { provinces: order.provinces, population };
}
