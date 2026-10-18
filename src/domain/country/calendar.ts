// A simplified calendar: every month has exactly 30 days, every year has 12
// months. Real leap years/variable month lengths would add complexity with no
// gameplay benefit for this simulation, so we avoid them on purpose.
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from "../constants";
import type { GameDate } from "./types";

export function advanceDay(date: GameDate): GameDate {
  let { year, month, day } = date;
  day += 1;
  if (day > DAYS_PER_MONTH) {
    day = 1;
    month += 1;
    if (month > MONTHS_PER_YEAR) {
      month = 1;
      year += 1;
    }
  }
  return { year, month, day };
}

// Days since the game began: for counting days between two dates.
export function dayNumber(date: GameDate): number {
  return ((date.year - 1) * MONTHS_PER_YEAR + (date.month - 1)) * DAYS_PER_MONTH + date.day;
}

// Days may be negative: counting back before the game began gives year 0
// and earlier, still the right number of days apart.
export function addDays(date: GameDate, days: number): GameDate {
  const n = dayNumber(date) - 1 + days;
  const mod = (a: number, b: number) => ((a % b) + b) % b;
  return {
    year: Math.floor(n / (MONTHS_PER_YEAR * DAYS_PER_MONTH)) + 1,
    month: Math.floor(mod(n, MONTHS_PER_YEAR * DAYS_PER_MONTH) / DAYS_PER_MONTH) + 1,
    day: mod(n, DAYS_PER_MONTH) + 1,
  };
}

export function isFirstDayOfMonth(date: GameDate): boolean {
  return date.day === 1;
}

// True on the first day of every Nth month since the game began (month 1),
// e.g. isEveryNMonths(date, 6) is true at the start of month 7, 13, 19...
export function isEveryNMonths(date: GameDate, n: number): boolean {
  if (!isFirstDayOfMonth(date)) return false;
  const totalMonths = (date.year - 1) * MONTHS_PER_YEAR + date.month;
  return totalMonths % n === 1;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

// Meteorological seasons: Mar-May spring, Jun-Aug summer, Sep-Nov autumn,
// Dec-Feb winter. Winter is what matters to the simulation — see
// FARM_SEASON_MULTIPLIER in constants.ts and domain/food.
export function getSeason(date: GameDate): Season {
  if (date.month >= 3 && date.month <= 5) return "spring";
  if (date.month >= 6 && date.month <= 8) return "summer";
  if (date.month >= 9 && date.month <= 11) return "autumn";
  return "winter";
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}, Year ${date.year}`;
}

// A monthly report is written on the 1st of the next month — this is the
// month it actually covers.
export function getReportedMonth(reportDate: GameDate): GameDate {
  return reportDate.month === 1
    ? { year: reportDate.year - 1, month: MONTHS_PER_YEAR, day: 1 }
    : { year: reportDate.year, month: reportDate.month - 1, day: 1 };
}

export function formatMonthYear(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} Year ${date.year}`;
}
