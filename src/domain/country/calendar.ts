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

export function isFirstDayOfMonth(date: GameDate): boolean {
  return date.day === 1;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}, Year ${date.year}`;
}

export function formatMonthYear(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} Year ${date.year}`;
}
