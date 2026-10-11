// The causes behind one number, as signed bars, biggest first — used by the
// monthly report and the top bar's "why" popovers.
import "./CauseBreakdown.css";
import { getLedgerTotal, getRankedCauses, type RankedCause } from "../../domain/ledger/ledgerRules";
import type { Ledger, LedgerMetric } from "../../domain/ledger/types";
import { formatChange, getCauseInfo, METRIC_ICONS, METRIC_LABELS } from "../causes";
import { StatIcon } from "./StatIcon";

// How many causes are listed before the rest fold into "Other".
const MAX_CAUSES = 5;

// The causes behind one number, biggest first, each as a bar growing left
// (a loss) or right (a gain) from the middle line — the side carries the
// sign as well as the colour and the +/− in the figure.
export function CauseBreakdown({ ledger, metric, title, perDay = false }: { ledger: Ledger; metric: LedgerMetric; title?: string; perDay?: boolean }) {
  const total = getLedgerTotal(ledger, metric);
  const ranked = getRankedCauses(ledger, metric).filter((c) => formatChange(metric, c.value, perDay) !== "0");
  const shown: RankedCause[] = ranked.slice(0, MAX_CAUSES);
  const rest = ranked.slice(MAX_CAUSES).reduce((sum, c) => sum + c.value, 0);
  if (rest !== 0 && formatChange(metric, rest, perDay) !== "0") shown.push({ cause: "other", value: rest });
  const maxAbs = Math.max(...shown.map((c) => Math.abs(c.value)), 1e-9);

  return (
    <section className="reports-cause" aria-label={`${METRIC_LABELS[metric]}: why it changed`}>
      <header className="reports-cause__head">
        <StatIcon type={METRIC_ICONS[metric]} size={18} />
        <span className="reports-cause__title">{title ?? METRIC_LABELS[metric]}</span>
        <strong className={`reports-cause__total ${total > 0 ? "is-gain" : total < 0 ? "is-loss" : ""}`}>
          {formatChange(metric, total, perDay)}
        </strong>
      </header>
      {shown.length === 0 ? (
        <p className="reports-cause__empty">No change</p>
      ) : (
        <ul className="reports-cause__list">
          {shown.map(({ cause, value }) => {
            const info = getCauseInfo(metric, cause);
            const width = `${(Math.abs(value) / maxAbs) * 50}%`;
            return (
              <li key={cause} className="reports-cause__row" title={info.hint || undefined}>
                <span className="reports-cause__icon">{info.icon(16)}</span>
                <span className="reports-cause__label">{info.label}</span>
                <span className="reports-cause__bar" aria-hidden="true">
                  <span className={`reports-cause__fill ${value >= 0 ? "is-gain" : "is-loss"}`} style={{ width }} />
                </span>
                <span className={`reports-cause__value ${value >= 0 ? "is-gain" : "is-loss"}`}>{formatChange(metric, value, perDay)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
