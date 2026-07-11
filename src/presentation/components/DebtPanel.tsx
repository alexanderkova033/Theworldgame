import "./DebtPanel.css";
import { canRepayLoan, canTakeLoan, getRepayAmount, repayLoan, takeLoan } from "../../application/actions";
import { CURRENCY_SYMBOL, DEBT_DANGER_THRESHOLD, LOAN_BATCH_SIZE, LOAN_INTEREST_RATE_PER_DAY, LOAN_MAX_DEBT } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { formatCompact } from "../formatNumber";
import { playConfirm } from "../audio/sound";
import { StatIcon } from "./StatIcon";

interface DebtPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// Revolving debt: take it in fixed batches whenever, no term, no forced
// schedule — it just compounds daily (see loanRules.ts) until you pay it
// down yourself. There's no cap on how long you can carry it, only a cost:
// past DEBT_DANGER_THRESHOLD it starts dragging stability and popularity
// down every day, same lever a food shortage already pulls.
export function DebtPanel({ state, dispatch }: DebtPanelProps) {
  const dangerous = isDebtDangerous(state.debt);
  const dailyInterest = Math.round(state.debt * LOAN_INTEREST_RATE_PER_DAY);
  const repayAmount = getRepayAmount(state);

  return (
    <section className="panel debt-panel">
      <h2>Loans</h2>
      <p className="panel-hint">
        Borrow against the future when the treasury runs short. Debt compounds daily and has no fixed term — but
        carry more than {formatCompact(DEBT_DANGER_THRESHOLD)} {CURRENCY_SYMBOL} of it and the interest alone starts
        costing you stability and popularity every day, same as a food shortage would.
      </p>

      <div className={`debt-panel__status ${dangerous ? "is-dangerous" : state.debt > 0 ? "is-active" : ""}`}>
        <StatIcon type="treasury" size={22} />
        <div className="debt-panel__status-body">
          <span className="debt-panel__status-value">
            {formatCompact(state.debt)} {CURRENCY_SYMBOL} owed
          </span>
          {state.debt > 0 && (
            <span className="debt-panel__status-detail">
              +{dailyInterest} {CURRENCY_SYMBOL}/day interest{dangerous ? " — dangerous" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="debt-panel__buttons">
        <button
          disabled={!canTakeLoan(state)}
          onClick={() => {
            playConfirm();
            dispatch(takeLoan);
          }}
        >
          Take Loan ({LOAN_BATCH_SIZE.toLocaleString()} {CURRENCY_SYMBOL})
        </button>
        <button
          disabled={!canRepayLoan(state)}
          onClick={() => {
            playConfirm();
            dispatch(repayLoan);
          }}
        >
          Repay ({repayAmount.toLocaleString()} {CURRENCY_SYMBOL})
        </button>
      </div>
      {!canTakeLoan(state) && <p className="debt-panel__cap-note">Debt is capped at {formatCompact(LOAN_MAX_DEBT)} {CURRENCY_SYMBOL}.</p>}
    </section>
  );
}
