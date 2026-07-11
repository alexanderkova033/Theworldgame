import { LOAN_BATCH_SIZE, LOAN_MAX_DEBT, LOAN_REPAY_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";

export function canTakeLoan(state: GameState): boolean {
  return state.debt + LOAN_BATCH_SIZE <= LOAN_MAX_DEBT;
}

export function takeLoan(state: GameState): GameState {
  if (!canTakeLoan(state)) return state;
  return {
    ...state,
    debt: state.debt + LOAN_BATCH_SIZE,
    stats: { ...state.stats, treasury: state.stats.treasury + LOAN_BATCH_SIZE },
  };
}

export function canRepayLoan(state: GameState): boolean {
  return state.debt > 0 && state.stats.treasury > 0;
}

export function getRepayAmount(state: GameState): number {
  return Math.min(LOAN_REPAY_BATCH_SIZE, state.debt, state.stats.treasury);
}

export function repayLoan(state: GameState): GameState {
  if (!canRepayLoan(state)) return state;
  const amount = getRepayAmount(state);
  return {
    ...state,
    debt: state.debt - amount,
    stats: { ...state.stats, treasury: state.stats.treasury - amount },
  };
}
