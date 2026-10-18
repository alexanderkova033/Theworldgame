// Step 3 of the day: taxes and industry come in, wages go out. Staff who
// can't be paid walk out.
import type { GameState } from "../../domain/country/types";
import { getDiplomacyIncomeMultiplier } from "../../domain/diplomacy/diplomacyRules";
import { getDailyIncomeParts } from "../../domain/economy/economyRules";
import { getTaxedPopulation } from "../../domain/uprising/uprisingRules";
import { getPayRiseBill } from "../../domain/uprising/demandRules";
import { getDailySalaries, layOffUntilAffordable } from "../../domain/workforce/workforceRules";
import { book, log, type Day } from "./dayContext";

export interface Takings {
  workforce: GameState["workforce"]; // after anyone unpaid walked out
  income: number; // net, after wages
  treasury: number;
}

export function payTheBills(day: Day, working: GameState): Takings {
  // Project instalments were already paid in step 1, so this is the only
  // other thing moving the treasury on a tick. Each neighbour ruled by the
  // party you backed adds a little.
  // A risen province pays nothing.
  const { taxIncome, industryIncome } = getDailyIncomeParts(
    { ...working.stats, population: getTaxedPopulation(working.provinces, working.stats.population, working.date) },
    working.taxRate,
    day.efficiency * day.mods.incomeMultiplier * getDiplomacyIncomeMultiplier(working.foreignPolitics),
  );
  const grossIncome = taxIncome + industryIncome;
  const { workforce, laidOff } = layOffUntilAffordable(working.workforce, working.stats.treasury + grossIncome, day.mods.wageMultiplier);
  if (laidOff > 0) {
    log(day, { date: day.start.date, message: `The treasury can't cover wages, and ${laidOff} unpaid staff walk off the job.`, severity: "warning", topic: "money" });
  }
  const salaries = getDailySalaries(workforce, day.mods.wageMultiplier) + getPayRiseBill(working.provinces, working.date);
  const income = grossIncome - salaries;
  book(day, "ledger", "treasury", { taxes: taxIncome, industry: industryIncome, salaries: -salaries });
  return { workforce, income, treasury: working.stats.treasury + income };
}
