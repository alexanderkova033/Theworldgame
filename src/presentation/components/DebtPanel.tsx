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
  // True when embedded inside another panel (e.g. the Trade tab's Loans
  // sub-tab) — skips the outer .panel wrapper/heading, since the host
  // already provides that context.
  bare?: boolean;
}

// Revolving debt: take it in fixed batches whenever, no term, no forced
// schedule — it just compounds daily (see loanRules.ts) until you pay it
// down yourself. There's no cap on how long you can carry it, only a cost:
// past DEBT_DANGER_THRESHOLD it starts dragging stability and popularity
// down every day, same lever a food shortage already pulls.
export function DebtPanel({ state, dispatch, bare = false }: DebtPanelProps) {
  const dangerous = isDebtDangerous(state.debt);
  const dailyInterest = Math.round(state.debt * LOAN_INTEREST_RATE_PER_DAY);
  const repayAmount = getRepayAmount(state);

  const content = (
    <>
      <p className="panel-hint">
        Debt compounds daily, no fixed term — but past {formatCompact(DEBT_DANGER_THRESHOLD)} {CURRENCY_SYMBOL} the
        interest alone starts costing stability and popularity every day.
      </p>

      <div className={`debt-panel__status ${dangerous ? "is-dangerous" : state.debt > 0 ? "is-active" : ""}`}>
        <span className="debt-panel__status-icon">
          <StatIcon type="treasury" size={22} />
        </span>
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
    </>
  );

  if (bare) return <div className="debt-panel">{content}</div>;

  return (
    <section className="panel debt-panel">
      <h2>Loans</h2>
      {content}
    </section>
  );
}
