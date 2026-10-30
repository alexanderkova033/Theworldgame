// Step 3 of the day: taxes and industry come in, wages go out. Staff who
// can't be paid walk out.
import type { GameState } from "../../domain/country/types";
import { getDiplomacyIncomeMultiplier } from "../../domain/diplomacy/diplomacyRules";
import { getDailyIncomeParts } from "../../domain/economy/economyRules";
import { getTaxedPopulation } from "../../domain/uprising/uprisingRules";
import { getPayRiseBill } from "../../domain/uprising/demandRules";
import { getColonyAccounts } from "../../domain/islands/islandRules";
import { getDailySalaries, layOffUntilAffordable } from "../../domain/workforce/workforceRules";
import { getArmyPay } from "../../domain/military/militaryRules";
import { book, log, type Day } from "./dayContext";

export interface Takings {
  workforce: GameState["workforce"]; // after anyone unpaid walked out
  taxRate: number; // back to nothing if handouts ran the treasury dry
  income: number; // net, after wages
  treasury: number;
}

export function payTheBills(day: Day, working: GameState): Takings {
  // Project instalments were already paid in step 1, so this is the only
  // other thing moving the treasury on a tick. Each neighbour ruled by the
  // party you backed adds a little.
  // A risen province pays nothing.
  const parts = getDailyIncomeParts(
    { ...working.stats, population: getTaxedPopulation(working.provinces, working.stats.population, working.date) },
    working.taxRate,
    day.efficiency * day.mods.incomeMultiplier * getDiplomacyIncomeMultiplier(working.foreignPolitics),
  );
  const { industryIncome } = parts;
  const colonies = getColonyAccounts(working);
  // Handouts are paid from what there is. When it runs out they stop, and so
  // does the goodwill they bought.
  const broke = parts.taxIncome < 0 && working.stats.treasury + parts.taxIncome + industryIncome + colonies.supply + colonies.salt < 0;
  const taxIncome = broke ? 0 : parts.taxIncome;
  const taxRate = broke ? 0 : working.taxRate;
  if (broke) log(day, { date: day.start.date, message: "The treasury is empty and the handouts have stopped.", severity: "warning", topic: "money" });
  const grossIncome = taxIncome + industryIncome + colonies.supply + colonies.salt;
  const { workforce, laidOff } = layOffUntilAffordable(working.workforce, working.stats.treasury + grossIncome, day.mods.wageMultiplier);
  if (laidOff > 0) {
    log(day, { date: day.start.date, message: `The treasury can't cover wages, and ${laidOff} unpaid staff walk off the job.`, severity: "warning", topic: "money" });
  }
  const salaries = getDailySalaries(workforce, day.mods.wageMultiplier) + getPayRiseBill(working.provinces, working.date);
  const armyPay = getArmyPay(working.regiments, working.nationId);
  const income = grossIncome - salaries - armyPay;
  book(day, "ledger", "treasury", { taxes: taxIncome, industry: industryIncome, salaries: -salaries, colonies: colonies.supply + colonies.salt, army: -armyPay });
  return { workforce, taxRate, income, treasury: working.stats.treasury + income };
}
