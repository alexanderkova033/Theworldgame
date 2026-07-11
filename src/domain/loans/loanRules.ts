// Revolving debt: take a loan whenever, at any size (in fixed batches — see
// LOAN_BATCH_SIZE), and it sits there compounding daily until repaid. There's
// no fixed term and no forced repayment — the cost of ignoring it is a
// growing balance and, past a danger threshold, a direct drag on stability
// and popularity every day it stays that high. Left unmanaged for long
// enough, that stability drain can push the same collapse condition a food
// shortage or a bad election would.
import { DEBT_DANGER_THRESHOLD, DEBT_POPULARITY_PENALTY_PER_DAY, DEBT_STABILITY_PENALTY_PER_DAY, LOAN_INTEREST_RATE_PER_DAY } from "../constants";

export function accrueInterest(debt: number): number {
  return debt * (1 + LOAN_INTEREST_RATE_PER_DAY);
}

export function isDebtDangerous(debt: number): boolean {
  return debt > DEBT_DANGER_THRESHOLD;
}

export function getDebtStabilityPenalty(debt: number): number {
  return isDebtDangerous(debt) ? DEBT_STABILITY_PENALTY_PER_DAY : 0;
}

export function getDebtPopularityPenalty(debt: number): number {
  return isDebtDangerous(debt) ? DEBT_POPULARITY_PENALTY_PER_DAY : 0;
}
